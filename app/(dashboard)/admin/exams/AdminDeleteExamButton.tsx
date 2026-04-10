"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { adminDeleteExamAction } from "@/lib/admin/actions";

export function AdminDeleteExamButton({ examId }: { examId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleDelete() {
    if (!confirm("Xóa đề kiểm tra này? Tất cả bài làm của học sinh cũng sẽ bị xóa theo.")) return;
    startTransition(async () => {
      await adminDeleteExamAction(examId);
      router.refresh();
    });
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className="text-xs text-red-600 hover:text-red-800 transition-colors disabled:opacity-50"
    >
      {isPending ? "Đang xóa..." : "Xóa"}
    </button>
  );
}
