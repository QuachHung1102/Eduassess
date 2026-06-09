/**
 * Flashcard store — module thuần đọc/ghi FlashcardSet & FlashcardCard.
 *
 * Đây là source-of-truth cho nghiệp vụ flashcard. Module KHÔNG biết về phiên
 * đăng nhập, revalidate hay redirect — những việc đó nằm ở seam (server action).
 *
 * Phạm vi quyền sở hữu được truyền vào qua tham số `ownerId`:
 *   - ownerId = <userId>  → chỉ thao tác trên bộ do người đó tạo (giáo viên)
 *   - ownerId = undefined → thao tác trên mọi bộ (admin / owner)
 *
 * Cloudinary cleanup và việc đánh lại thứ tự card là chi tiết ẩn bên trong.
 */

import { prisma } from "@/lib/db/prisma";
import cloudinary from "@/lib/cloudinary";
import { Difficulty, type FlashcardCard } from "@prisma/client";

export type FlashcardSetInput = {
  title: string;
  description: string | null;
  subjectId: string;
  gradeId: string;
  topicName: string;
  difficulty: Difficulty;
};

export type CardUpdateInput = {
  caption?: string | null;
  imageUrl?: string;
};

/** Phạm vi sở hữu: id người tạo (giới hạn) hoặc undefined (mọi bộ). */
type OwnerScope = string | undefined;

function extractCloudinaryPublicId(url: string): string | null {
  // e.g. https://res.cloudinary.com/<cloud>/image/upload/v123456/flashcards/abc.jpg
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[^./]+)?$/);
  return match ? match[1] : null;
}

/** Where-clause cho FlashcardSet, có/không giới hạn theo người tạo. */
function setScope(setId: string, ownerId: OwnerScope) {
  return ownerId ? { id: setId, createdById: ownerId } : { id: setId };
}

/** Xóa ảnh trên Cloudinary (không chặn nếu lỗi — DB đã là nguồn chính). */
async function destroyCloudinaryImage(imageUrl: string | null | undefined) {
  if (!imageUrl) return;
  const publicId = extractCloudinaryPublicId(imageUrl);
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch {
    // Non-fatal: bản ghi DB đã được xử lý.
  }
}

/** Đánh lại thứ tự card 1..n theo order hiện tại. */
async function resequenceCards(setId: string) {
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
}

function validateSetInput(input: FlashcardSetInput): string | null {
  const { title, subjectId, gradeId, topicName, difficulty } = input;
  if (!title || !subjectId || !gradeId || !topicName || !difficulty) {
    return "Vui lòng điền đầy đủ thông tin";
  }
  if (!["EASY", "MEDIUM", "HARD"].includes(difficulty)) {
    return "Độ khó không hợp lệ";
  }
  return null;
}

// ── Tạo bộ flashcard mới ──────────────────────────────────────
export async function createFlashcardSet(
  input: FlashcardSetInput,
  createdById: string
): Promise<{ error: string } | { id: string }> {
  const invalid = validateSetInput(input);
  if (invalid) return { error: invalid };

  const set = await prisma.flashcardSet.create({
    data: { ...input, createdById },
  });
  return { id: set.id };
}

// ── Xóa bộ flashcard ──────────────────────────────────────────
export async function deleteFlashcardSet(
  setId: string,
  ownerId: OwnerScope
): Promise<{ error: string } | { success: true }> {
  const set = await prisma.flashcardSet.findFirst({ where: setScope(setId, ownerId) });
  if (!set) return { error: "Không tìm thấy bộ flashcard" };

  await prisma.flashcardSet.delete({ where: { id: setId } });
  return { success: true };
}

// ── Thêm card ảnh ─────────────────────────────────────────────
export async function addCardToFlashcardSet(
  setId: string,
  imageUrl: string,
  caption: string | null,
  ownerId: OwnerScope
): Promise<{ error: string } | { success: true; card: FlashcardCard }> {
  const set = await prisma.flashcardSet.findFirst({
    where: setScope(setId, ownerId),
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

  return { success: true, card };
}

// ── Xóa card ──────────────────────────────────────────────────
export async function removeCardFromFlashcardSet(
  cardId: string,
  setId: string,
  ownerId: OwnerScope
): Promise<{ error: string } | { success: true }> {
  const set = await prisma.flashcardSet.findFirst({ where: setScope(setId, ownerId) });
  if (!set) return { error: "Không có quyền" };

  const card = await prisma.flashcardCard.findUnique({ where: { id: cardId } });

  await prisma.flashcardCard.delete({ where: { id: cardId } });
  await destroyCloudinaryImage(card?.imageUrl);
  await resequenceCards(setId);

  return { success: true };
}

// ── Cập nhật card ─────────────────────────────────────────────
export async function updateCardInFlashcardSet(
  cardId: string,
  setId: string,
  data: CardUpdateInput,
  ownerId: OwnerScope
): Promise<{ error: string } | { success: true }> {
  const set = await prisma.flashcardSet.findFirst({ where: setScope(setId, ownerId) });
  if (!set) return { error: "Không có quyền" };

  const updateData: CardUpdateInput = {};
  if ("caption" in data) updateData.caption = data.caption || null;
  if (data.imageUrl) {
    if (!data.imageUrl.startsWith("https://")) {
      return { error: "URL ảnh không hợp lệ" };
    }
    // Xóa ảnh cũ nếu thay ảnh mới.
    const oldCard = await prisma.flashcardCard.findUnique({ where: { id: cardId } });
    if (oldCard?.imageUrl && oldCard.imageUrl !== data.imageUrl) {
      await destroyCloudinaryImage(oldCard.imageUrl);
    }
    updateData.imageUrl = data.imageUrl;
  }

  await prisma.flashcardCard.update({ where: { id: cardId }, data: updateData });
  return { success: true };
}
