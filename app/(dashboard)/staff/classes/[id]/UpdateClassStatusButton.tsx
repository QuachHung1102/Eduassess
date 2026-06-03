"use client";

import { useTransition } from "react";
import { updateClassAction } from "@/lib/classes/actions";
import type { ClassStatus } from "@/lib/types";

const NEXT_STATUS: Partial<Record<ClassStatus, { next: ClassStatus; label: string; color: string }>> = {
  DRAFT:      { next: "RECRUITING", label: "Mở tuyển sinh",   color: "bg-blue-600 hover:bg-blue-700" },
  RECRUITING: { next: "ONGOING",    label: "Bắt đầu học",     color: "bg-green-600 hover:bg-green-700" },
  ONGOING:    { next: "FINISHED",   label: "Kết thúc lớp",    color: "bg-purple-600 hover:bg-purple-700" },
};

export function UpdateClassStatusButton({
  classId,
  currentStatus,
}: {
  classId: string;
  currentStatus: ClassStatus;
}) {
  const [isPending, startTransition] = useTransition();
  const transition = NEXT_STATUS[currentStatus];
  if (!transition) return null;

  return (
    <button
      onClick={() =>
        startTransition(async () => {
          await updateClassAction(classId, { status: transition.next });
        })
      }
      disabled={isPending}
      className={`px-3 py-1.5 text-xs font-medium text-white rounded-lg disabled:opacity-50 transition-colors ${transition.color}`}
    >
      {isPending ? "Đang lưu..." : transition.label}
    </button>
  );
}
