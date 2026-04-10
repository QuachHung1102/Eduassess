"use client";

import { useTransition } from "react";
import { adminUpdateQuestionStatusAction } from "@/lib/admin/actions";

const STATUS_CONFIG = {
  PENDING: {
    label: "Chờ duyệt",
    badge: "bg-orange-100 text-orange-700 hover:bg-orange-200",
  },
  APPROVED: {
    label: "Đã duyệt",
    badge: "bg-blue-100 text-blue-700 hover:bg-blue-200",
  },
} as const;

type Status = keyof typeof STATUS_CONFIG;

export function AdminQuestionStatusButton({
  questionId,
  currentStatus,
}: {
  questionId: string;
  currentStatus: string;
}) {
  const [isPending, startTransition] = useTransition();

  const status = (currentStatus as Status) in STATUS_CONFIG ? (currentStatus as Status) : "PENDING";
  const next: Status = status === "PENDING" ? "APPROVED" : "PENDING";
  const cfg = STATUS_CONFIG[status];
  const nextCfg = STATUS_CONFIG[next];

  function handleClick() {
    startTransition(async () => {
      await adminUpdateQuestionStatusAction(questionId, next);
    });
  }

  if (isPending) {
    return (
      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-400 animate-pulse">
        Đang lưu...
      </span>
    );
  }

  return (
    <button
      onClick={handleClick}
      title={`Nhấn để chuyển sang "${nextCfg.label}"`}
      className={`text-xs px-2 py-0.5 rounded-full font-medium transition-colors cursor-pointer ${cfg.badge}`}
    >
      {cfg.label}
    </button>
  );
}