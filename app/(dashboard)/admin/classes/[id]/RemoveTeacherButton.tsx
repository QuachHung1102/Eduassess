"use client";

import { useTransition } from "react";
import { removeTeacherAction } from "@/lib/admin/actions";

export function RemoveTeacherButton({
  teacherId,
  classId,
  label,
}: {
  teacherId: string;
  classId: string;
  label: string;
}) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm(`Xóa phân công "${label}"?`)) return;
    startTransition(async () => {
      await removeTeacherAction(teacherId, classId);
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="px-2 py-1 text-xs text-red-600 border border-red-200 rounded hover:bg-red-50 disabled:opacity-50 transition-colors"
    >
      {isPending ? "..." : "Xóa"}
    </button>
  );
}
