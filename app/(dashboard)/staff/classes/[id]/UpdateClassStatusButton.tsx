"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateClassAction } from "@/lib/classes/actions";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import type { ClassStatus } from "@/lib/types";

const NEXT_STATUS: Partial<Record<ClassStatus, { next: ClassStatus; label: string; color: string }>> = {
  DRAFT:      { next: "RECRUITING", label: "Mở tuyển sinh",   color: "bg-blue-600 hover:bg-blue-700" },
  RECRUITING: { next: "ONGOING",    label: "Bắt đầu học",     color: "bg-green-600 hover:bg-green-700" },
  ONGOING:    { next: "FINISHED",   label: "Kết thúc lớp",    color: "bg-purple-600 hover:bg-purple-700" },
};

// Lớp chưa kết thúc/đã hủy thì còn hủy được.
const CANCELLABLE: ClassStatus[] = ["DRAFT", "RECRUITING", "ONGOING"];

export function UpdateClassStatusButton({
  classId,
  currentStatus,
}: {
  classId: string;
  currentStatus: ClassStatus;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const confirm = useConfirm();
  const transition = NEXT_STATUS[currentStatus];
  const canCancel = CANCELLABLE.includes(currentStatus);

  if (!transition && !canCancel) return null;

  return (
    <div className="flex items-center gap-2">
      {transition && (
        <button
          onClick={() =>
            startTransition(async () => {
              await updateClassAction(classId, { status: transition.next });
              router.refresh();
            })
          }
          disabled={isPending}
          className={`px-3 py-1.5 text-xs font-medium text-white rounded-lg disabled:opacity-50 transition-colors ${transition.color}`}
        >
          {isPending ? "Đang lưu..." : transition.label}
        </button>
      )}

      {canCancel && (
        <button
          onClick={async () => {
            const ok = await confirm({
              title: "Hủy lớp học?",
              message:
                "Mọi buổi học chưa diễn ra sẽ bị hủy và nhả phòng; học sinh đang học sẽ được thông báo. Hành động này không thể hoàn tác.",
              confirmLabel: "Hủy lớp",
              variant: "danger",
            });
            if (!ok) return;
            startTransition(async () => {
              await updateClassAction(classId, { status: "CANCELLED" });
              router.refresh();
            });
          }}
          disabled={isPending}
          className="px-3 py-1.5 text-xs font-medium rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
        >
          Hủy lớp
        </button>
      )}
    </div>
  );
}
