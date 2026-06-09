"use server";

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Difficulty } from "@prisma/client";
import {
  createFlashcardSet,
  deleteFlashcardSet,
  addCardToFlashcardSet,
  removeCardFromFlashcardSet,
  updateCardInFlashcardSet,
  type CardUpdateInput,
} from "@/lib/flashcards/store";

// ── Tạo bộ flashcard mới ──────────────────────────────────────
export async function createFlashcardSetAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Chưa đăng nhập" };
  if (session.user.role !== "TEACHER") return { error: "Không có quyền" };

  const result = await createFlashcardSet(
    {
      title: (formData.get("title") as string)?.trim(),
      description: (formData.get("description") as string)?.trim() || null,
      subjectId: formData.get("subjectId") as string,
      gradeId: formData.get("gradeId") as string,
      topicName: (formData.get("topicName") as string)?.trim(),
      difficulty: formData.get("difficulty") as Difficulty,
    },
    session.user.id
  );
  if ("error" in result) return { error: result.error };

  redirect(`/teacher/flashcards/${result.id}`);
}

// ── Xóa bộ flashcard ──────────────────────────────────────────
export async function deleteFlashcardSetAction(setId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Chưa đăng nhập" };

  const result = await deleteFlashcardSet(setId, session.user.id);
  if ("error" in result) return result;

  revalidatePath("/teacher/flashcards");
  return { success: true };
}

// ── Thêm card ảnh vào bộ flashcard ───────────────────────────
export async function addCardToFlashcardSetAction(
  setId: string,
  imageUrl: string,
  caption: string | null
) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Chưa đăng nhập" };

  const result = await addCardToFlashcardSet(setId, imageUrl, caption, session.user.id);
  if ("error" in result) return result;

  revalidatePath(`/teacher/flashcards/${setId}`);
  return result;
}

// ── Xóa card khỏi bộ flashcard ───────────────────────────────
export async function removeCardFromFlashcardSetAction(cardId: string, setId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Chưa đăng nhập" };

  const result = await removeCardFromFlashcardSet(cardId, setId, session.user.id);
  if ("error" in result) return result;

  revalidatePath(`/teacher/flashcards/${setId}`);
  return { success: true };
}

export async function updateCardInFlashcardSetAction(
  cardId: string,
  setId: string,
  data: CardUpdateInput
) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Chưa đăng nhập" };

  const result = await updateCardInFlashcardSet(cardId, setId, data, session.user.id);
  if ("error" in result) return result;

  revalidatePath(`/teacher/flashcards/${setId}`);
  return { success: true };
}

