"use client";

import { useTransition } from "react";
import { deleteFlashcardSetAction } from "@/lib/teacher/actions/flashcard";
import { adminDeleteFlashcardSetAction } from "@/lib/admin/flashcard-actions";

type Props = {
  setId: string;
  role: "teacher" | "admin";
};

export function FlashcardDeleteButton({ setId, role }: Props) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!window.confirm("Xóa bộ flashcard này? Tất cả thẻ sẽ bị xóa theo.")) {
      return;
    }

    startTransition(async () => {
      if (role === "teacher") {
        await deleteFlashcardSetAction(setId);
        return;
      }
      await adminDeleteFlashcardSetAction(setId);
    });
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isPending}
      className="text-sm text-red-500 transition-colors hover:text-red-700 disabled:opacity-50"
    >
      {isPending ? "Đang xóa..." : "Xóa"}
    </button>
  );
}
