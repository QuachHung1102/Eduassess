"use client";

import { useState, useTransition } from "react";
import { createRoomAction, updateRoomAction } from "@/lib/booking/room-actions";

type Room = { id: string; name: string; capacity: number; description: string | null };

type Props =
  | { mode: "create" }
  | { mode: "edit"; room: Room };

export function RoomFormModal(props: Props) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const isEdit = props.mode === "edit";
  const room = isEdit ? props.room : null;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    const name = (fd.get("name") as string) ?? "";
    const capacity = parseInt((fd.get("capacity") as string) ?? "0", 10);
    const description = (fd.get("description") as string) ?? "";

    startTransition(async () => {
      const result = isEdit
        ? await updateRoomAction(room!.id, { name, capacity, description })
        : await createRoomAction({ name, capacity, description });

      if (result.error) {
        setError(result.error);
      } else {
        setOpen(false);
      }
    });
  }

  return (
    <>
      <button
        onClick={() => { setOpen(true); setError(""); }}
        className={
          isEdit
            ? "px-3 py-1.5 text-xs font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
            : "px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        }
      >
        {isEdit ? "Sửa" : "+ Thêm phòng"}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {isEdit ? `Sửa phòng: ${room!.name}` : "Thêm phòng mới"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tên phòng <span className="text-red-500">*</span>
                </label>
                <input
                  name="name"
                  required
                  defaultValue={room?.name ?? ""}
                  placeholder="Vd: P.101 – Phòng lớn"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sức chứa (người) <span className="text-red-500">*</span>
                </label>
                <input
                  name="capacity"
                  type="number"
                  required
                  min={1}
                  max={500}
                  defaultValue={room?.capacity ?? 20}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
                <textarea
                  name="description"
                  rows={2}
                  defaultValue={room?.description ?? ""}
                  placeholder="Tùy chọn: mô tả ngắn về phòng"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {isPending ? "Đang lưu..." : isEdit ? "Lưu thay đổi" : "Tạo phòng"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
