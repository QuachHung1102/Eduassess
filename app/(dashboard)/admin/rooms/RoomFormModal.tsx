"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { createRoomAction, updateRoomAction } from "@/lib/booking/room-actions";

type Room = {
  id: string;
  name: string;
  capacity: number;
  description: string | null;
  layoutImageUrl: string | null;
};

type Props =
  | { mode: "create" }
  | { mode: "edit"; room: Room };

export function RoomFormModal(props: Props) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  /** Ảnh mới vừa upload trong phiên này; null nếu giữ ảnh cũ (khi sửa). */
  const [newImage, setNewImage] = useState<{ url: string; publicId?: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEdit = props.mode === "edit";
  const room = isEdit ? props.room : null;
  const previewUrl = newImage?.url ?? room?.layoutImageUrl ?? "";

  function openModal() {
    setOpen(true);
    setError("");
    setNewImage(null);
  }

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("Chỉ hỗ trợ tệp ảnh (JPG, PNG, WebP, GIF)");
      return;
    }
    setUploading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/rooms/upload", { method: "POST", body: fd });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "Tải ảnh thất bại");
      }
      const { url, publicId } = (await res.json()) as { url: string; publicId?: string };
      setNewImage({ url, publicId });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Tải ảnh thất bại");
    } finally {
      setUploading(false);
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    const name = (fd.get("name") as string) ?? "";
    const capacity = parseInt((fd.get("capacity") as string) ?? "0", 10);
    const description = (fd.get("description") as string) ?? "";

    if (!isEdit && !newImage) {
      setError("Cần tải lên ảnh sơ đồ vị trí phòng");
      return;
    }

    startTransition(async () => {
      const result = isEdit
        ? await updateRoomAction(room!.id, {
            name,
            capacity,
            description,
            layoutImage: newImage ?? undefined,
          })
        : await createRoomAction({ name, capacity, description, layoutImage: newImage! });

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
        onClick={openModal}
        className={
          isEdit
            ? "px-3 py-1.5 text-xs font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
            : "px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        }
      >
        {isEdit ? "Sửa" : "+ Thêm phòng"}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6">
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

              {/* Ảnh sơ đồ vị trí phòng */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ảnh sơ đồ vị trí {!isEdit && <span className="text-red-500">*</span>}
                </label>
                <p className="text-xs text-gray-400 mb-2">
                  Sơ đồ trung tâm/tầng, đánh dấu đỏ vị trí phòng để người mới dễ định hướng.
                </p>

                {previewUrl ? (
                  <div className="relative mb-2 rounded-lg overflow-hidden border border-gray-200">
                    <Image
                      src={previewUrl}
                      alt="Sơ đồ vị trí phòng"
                      width={400}
                      height={240}
                      className="w-full h-40 object-contain bg-gray-50"
                      unoptimized
                    />
                  </div>
                ) : null}

                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full px-3 py-2 text-sm border border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors disabled:opacity-50"
                >
                  {uploading
                    ? "Đang tải ảnh..."
                    : previewUrl
                      ? "Đổi ảnh khác"
                      : "Tải lên ảnh sơ đồ"}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
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
                  disabled={isPending || uploading}
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
