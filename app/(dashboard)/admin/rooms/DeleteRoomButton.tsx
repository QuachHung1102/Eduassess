"use client";

import { useTransition } from "react";
import { deleteRoomAction } from "@/lib/booking/room-actions";

export function DeleteRoomButton({ roomId, roomName }: { roomId: string; roomName: string }) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm(`Xóa phòng "${roomName}"? Hành động này không thể hoàn tác.`)) return;
    startTransition(async () => {
      const result = await deleteRoomAction(roomId);
      if (result.error) alert(result.error);
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="px-3 py-1.5 text-xs font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
    >
      {isPending ? "Đang xóa..." : "Xóa"}
    </button>
  );
}
