"use client";

import { useTransition } from "react";
import { deleteFlashcardSetAction } from "@/lib/teacher/actions/flashcard";

export function DeleteFlashcardSetButton({ setId }: { setId: string }) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm("Xóa bộ flashcard này? Tất cả thẻ sẽ bị xóa theo.")) return;
    startTransition(async () => {
      await deleteFlashcardSetAction(setId);
    });
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className="text-sm text-red-500 hover:text-red-700 transition-colors disabled:opacity-50"
    >
      {isPending ? "Đang xóa..." : "Xóa"}
    </button>
  );
}
