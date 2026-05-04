"use server";

import { prisma } from "@/lib/db/prisma";
import cloudinary from "@/lib/cloudinary";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Difficulty } from "@prisma/client";
import { requireAdmin } from "@/lib/auth/require";

function extractCloudinaryPublicId(url: string): string | null {
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[^./]+)?$/);
  return match ? match[1] : null;
}

// ── Tạo bộ flashcard ─────────────────────────────────────────
export async function adminCreateFlashcardSetAction(formData: FormData) {
  const { user, error } = await requireAdmin();
  if (error || !user) return { error: error ?? "Unauthorized" };

  const title = (formData.get("title") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || null;
  const subjectId = formData.get("subjectId") as string;
  const gradeId = formData.get("gradeId") as string;
  const topicName = (formData.get("topicName") as string)?.trim();
  const difficulty = formData.get("difficulty") as Difficulty;

  if (!title || !subjectId || !gradeId || !topicName || !difficulty) {
    return { error: "Vui lòng điền đầy đủ thông tin" };
  }

  if (!["EASY", "MEDIUM", "HARD"].includes(difficulty)) {
    return { error: "Độ khó không hợp lệ" };
  }

  const set = await prisma.flashcardSet.create({
    data: {
      title,
      description,
      subjectId,
      gradeId,
      topicName,
      difficulty,
      createdById: user.id,
    },
  });

  redirect(`/admin/flashcards/${set.id}`);
}

// ── Xóa bộ flashcard ─────────────────────────────────────────
export async function adminDeleteFlashcardSetAction(setId: string) {
  const { error } = await requireAdmin();
  if (error) return { error };

  const set = await prisma.flashcardSet.findUnique({ where: { id: setId } });
  if (!set) return { error: "Không tìm thấy bộ flashcard" };

  await prisma.flashcardSet.delete({ where: { id: setId } });
  revalidatePath("/admin/flashcards");
  return { success: true };
}

// ── Thêm card ảnh ─────────────────────────────────────────────
export async function adminAddCardToFlashcardSetAction(
  setId: string,
  imageUrl: string,
  caption: string | null
) {
  const { error } = await requireAdmin();
  if (error) return { error };

  const set = await prisma.flashcardSet.findUnique({
    where: { id: setId },
    include: { _count: { select: { cards: true } } },
  });
  if (!set) return { error: "Không tìm thấy bộ flashcard" };

  if (!imageUrl?.startsWith("https://")) {
    return { error: "URL ảnh không hợp lệ" };
  }

  const order = set._count.cards + 1;
  const card = await prisma.flashcardCard.create({
    data: { setId, imageUrl, caption: caption || null, order },
  });

  revalidatePath(`/admin/flashcards/${setId}`);
  return { success: true, card };
}

// ── Xóa card ─────────────────────────────────────────────────
export async function adminRemoveCardFromFlashcardSetAction(cardId: string, setId: string) {
  const { error } = await requireAdmin();
  if (error) return { error };

  const card = await prisma.flashcardCard.findUnique({ where: { id: cardId } });

  await prisma.flashcardCard.delete({ where: { id: cardId } });

  // Delete image from Cloudinary
  if (card?.imageUrl) {
    const publicId = extractCloudinaryPublicId(card.imageUrl);
    if (publicId) {
      try {
        await cloudinary.uploader.destroy(publicId);
      } catch {
        // Non-fatal: DB record already deleted
      }
    }
  }

  const remaining = await prisma.flashcardCard.findMany({
    where: { setId },
    orderBy: { order: "asc" },
  });
  await Promise.all(
    remaining.map((card, idx) =>
      prisma.flashcardCard.update({
        where: { id: card.id },
        data: { order: idx + 1 },
      })
    )
  );

  revalidatePath(`/admin/flashcards/${setId}`);
  return { success: true };
}

export async function adminUpdateCardInFlashcardSetAction(
  cardId: string,
  setId: string,
  data: { caption?: string | null; imageUrl?: string }
) {
  const { error: authError } = await requireAdmin();
  if (authError) return { error: authError };

  const updateData: { caption?: string | null; imageUrl?: string } = {};
  if ("caption" in data) updateData.caption = data.caption || null;
  if (data.imageUrl) {
    if (!data.imageUrl.startsWith("https://")) {
      return { error: "URL ảnh không hợp lệ" };
    }
    // Delete old image from Cloudinary if replacing
    const oldCard = await prisma.flashcardCard.findUnique({ where: { id: cardId } });
    if (oldCard?.imageUrl && oldCard.imageUrl !== data.imageUrl) {
      const publicId = extractCloudinaryPublicId(oldCard.imageUrl);
      if (publicId) {
        try { await cloudinary.uploader.destroy(publicId); } catch { /* non-fatal */ }
      }
    }
    updateData.imageUrl = data.imageUrl;
  }

  await prisma.flashcardCard.update({
    where: { id: cardId },
    data: updateData,
  });

  revalidatePath(`/admin/flashcards/${setId}`);
  return { success: true };
}
