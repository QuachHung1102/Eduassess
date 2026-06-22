"use client";

import { useTransition } from "react";
import { removeClassTeacherAction } from "@/lib/classes/actions/enrollment";

export function RemoveClassTeacherButton({
  classId,
  teacherId,
  teacherName,
}: {
  classId: string;
  teacherId: string;
  teacherName: string | null;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      onClick={() =>
        startTransition(async () => {
          if (!confirm(`Gỡ ${teacherName ?? "giáo viên"} khỏi lớp?`)) return;
          await removeClassTeacherAction(classId, teacherId);
        })
      }
      disabled={isPending}
      className="text-xs text-red-400 hover:text-red-600 disabled:opacity-50 transition-colors px-1"
      title="Gỡ khỏi lớp"
    >
      {isPending ? "..." : "×"}
    </button>
  );
}
