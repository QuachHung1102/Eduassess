"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Difficulty } from "@prisma/client";
import { requireAdmin } from "@/lib/auth/require";
import {
  createFlashcardSet,
  deleteFlashcardSet,
  addCardToFlashcardSet,
  removeCardFromFlashcardSet,
  updateCardInFlashcardSet,
  type CardUpdateInput,
} from "@/lib/flashcards/store";

// ── Tạo bộ flashcard ─────────────────────────────────────────
export async function adminCreateFlashcardSetAction(formData: FormData) {
  const { user, error } = await requireAdmin();
  if (error || !user) return { error: error ?? "Unauthorized" };

  const result = await createFlashcardSet(
    {
      title: (formData.get("title") as string)?.trim(),
      description: (formData.get("description") as string)?.trim() || null,
      subjectId: formData.get("subjectId") as string,
      gradeId: formData.get("gradeId") as string,
      topicName: (formData.get("topicName") as string)?.trim(),
      difficulty: formData.get("difficulty") as Difficulty,
    },
    user.id
  );
  if ("error" in result) return { error: result.error };

  redirect(`/admin/flashcards/${result.id}`);
}

// ── Xóa bộ flashcard ─────────────────────────────────────────
export async function adminDeleteFlashcardSetAction(setId: string) {
  const { error } = await requireAdmin();
  if (error) return { error };

  const result = await deleteFlashcardSet(setId, undefined);
  if ("error" in result) return result;

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

  const result = await addCardToFlashcardSet(setId, imageUrl, caption, undefined);
  if ("error" in result) return result;

  revalidatePath(`/admin/flashcards/${setId}`);
  return result;
}

// ── Xóa card ─────────────────────────────────────────────────
export async function adminRemoveCardFromFlashcardSetAction(cardId: string, setId: string) {
  const { error } = await requireAdmin();
  if (error) return { error };

  const result = await removeCardFromFlashcardSet(cardId, setId, undefined);
  if ("error" in result) return result;

  revalidatePath(`/admin/flashcards/${setId}`);
  return { success: true };
}

export async function adminUpdateCardInFlashcardSetAction(
  cardId: string,
  setId: string,
  data: CardUpdateInput
) {
  const { error: authError } = await requireAdmin();
  if (authError) return { error: authError };

  const result = await updateCardInFlashcardSet(cardId, setId, data, undefined);
  if ("error" in result) return result;

  revalidatePath(`/admin/flashcards/${setId}`);
  return { success: true };
}
