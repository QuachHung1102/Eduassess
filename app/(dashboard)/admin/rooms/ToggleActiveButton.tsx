"use client";

import { useTransition } from "react";
import { toggleRoomActiveAction } from "@/lib/booking/room-actions";

export function ToggleActiveButton({
  roomId,
  roomName,
  isActive,
}: {
  roomId: string;
  roomName: string;
  isActive: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    const action = isActive ? "tắt" : "bật";
    if (!confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} phòng "${roomName}"?`)) return;
    startTransition(async () => {
      const result = await toggleRoomActiveAction(roomId, !isActive);
      if (result.error) alert(result.error);
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className={`px-2 py-1 text-xs font-medium rounded-full transition-colors disabled:opacity-50 ${
        isActive
          ? "bg-green-100 text-green-700 hover:bg-green-200"
          : "bg-gray-100 text-gray-500 hover:bg-gray-200"
      }`}
    >
      {isPending ? "..." : isActive ? "Hoạt động" : "Tạm dừng"}
    </button>
  );
}
