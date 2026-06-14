"use client";

import { useState } from "react";
import Image from "next/image";
import { FaIcon } from "@/components/ui/FaIcon";
import { faLocationDot, faXmark } from "@fortawesome/free-solid-svg-icons";

/**
 * Nút "Xem vị trí" → modal hiển thị ảnh sơ đồ vị trí phòng (RoomLayoutImage).
 * Không render gì nếu phòng chưa có ảnh sơ đồ.
 */
export function RoomLayoutButton({
  roomName,
  layoutImageUrl,
  className,
}: {
  roomName: string;
  layoutImageUrl: string | null;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  if (!layoutImageUrl) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          className ??
          "inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline"
        }
      >
        <FaIcon icon={faLocationDot} />
        Xem vị trí
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Vị trí phòng: {roomName}</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                aria-label="Đóng"
              >
                <FaIcon icon={faXmark} />
              </button>
            </div>
            <div className="p-4 overflow-auto bg-gray-50">
              <Image
                src={layoutImageUrl}
                alt={`Sơ đồ vị trí phòng ${roomName}`}
                width={1000}
                height={700}
                className="w-full h-auto rounded-lg"
                unoptimized
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
