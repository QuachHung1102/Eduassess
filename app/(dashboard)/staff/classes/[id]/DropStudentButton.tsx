"use client";

import { useTransition } from "react";
import { dropStudentAction } from "@/lib/classes/actions/enrollment";

export function DropStudentButton({
  classId,
  studentId,
  studentName,
}: {
  classId: string;
  studentId: string;
  studentName: string | null;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      onClick={() =>
        startTransition(async () => {
          if (!confirm(`Xóa ${studentName ?? "học sinh"} khỏi lớp?`)) return;
          await dropStudentAction(classId, studentId);
        })
      }
      disabled={isPending}
      className="text-xs text-red-400 hover:text-red-600 disabled:opacity-50 transition-colors px-1"
      title="Xóa khỏi lớp"
    >
      {isPending ? "..." : "×"}
    </button>
  );
}
