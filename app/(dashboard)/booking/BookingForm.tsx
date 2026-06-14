"use client";

import { useEffect, useState, useTransition } from "react";
import { createBookingAction } from "@/lib/booking/actions";
import { FaIcon } from "@/components/ui/FaIcon";
import { faPlus, faXmark } from "@fortawesome/free-solid-svg-icons";

type Room = { id: string; name: string; capacity: number };
type Reason = { id: string; label: string; priority: number };

type Props = {
  rooms: Room[];
  reasons: Reason[];
};

/** Định dạng Date → chuỗi cho input datetime-local (giờ địa phương). */
function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function BookingForm({ rooms, reasons }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  // Set khi mở modal (tránh lệch SSR/client); chặn chọn giờ quá khứ.
  const [minDateTime, setMinDateTime] = useState("");
  const [startValue, setStartValue] = useState("");

  function openModal() {
    setMsg(null);
    setMinDateTime(toLocalInput(new Date()));
    setStartValue("");
    setOpen(true);
  }

  useEffect(() => {
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg(null);
    const fd = new FormData(e.currentTarget);
    const form = e.currentTarget;

    const data = {
      roomId: fd.get("roomId") as string,
      reasonId: fd.get("reasonId") as string,
      startAt: fd.get("startAt") as string,
      endAt: fd.get("endAt") as string,
      note: (fd.get("note") as string) || undefined,
    };

    // Validate phía client để báo sớm, không đợi server.
    if (!data.startAt || !data.endAt) {
      setMsg({ type: "error", text: "Vui lòng chọn thời gian bắt đầu và kết thúc" });
      return;
    }
    const start = new Date(data.startAt);
    const end = new Date(data.endAt);
    if (start < new Date()) {
      setMsg({ type: "error", text: "Không thể đặt phòng trong quá khứ" });
      return;
    }
    if (end <= start) {
      setMsg({ type: "error", text: "Giờ kết thúc phải sau giờ bắt đầu" });
      return;
    }

    startTransition(async () => {
      const res = await createBookingAction(data);
      if (res.error) {
        setMsg({ type: "error", text: res.error });
      } else {
        setMsg({ type: "success", text: "Yêu cầu đặt phòng đã được gửi. Chờ NVLT duyệt." });
        form.reset();
        setTimeout(() => setOpen(false), 700);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="hover-action-primary focus-ring-strong press-feedback-inset inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
      >
        <FaIcon icon={faPlus} /> Đặt phòng mới
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <button
            type="button"
            aria-label="Đóng"
            onClick={() => setOpen(false)}
            className="booking-modal-backdrop absolute inset-0 bg-black/40 backdrop-blur-[2px]"
          />

          <div
            className="booking-modal-panel relative w-full sm:max-w-xl bg-white rounded-t-2xl sm:rounded-2xl border border-gray-100 shadow-2xl p-5 sm:p-6 max-h-[92vh] overflow-auto"
            role="dialog"
            aria-modal="true"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold text-foreground text-lg">Tạo yêu cầu đặt phòng</h2>
                <p className="text-xs text-foreground/60 mt-1">Chọn phòng, thời gian và mục đích để gửi yêu cầu duyệt.</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="hover-action-subtle focus-ring-soft press-feedback-soft w-8 h-8 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
                aria-label="Đóng modal"
              >
                <FaIcon icon={faXmark} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div>
                <label className="block text-xs font-medium text-foreground/60 mb-1">Phòng</label>
                <select
                  name="roomId"
                  required
                  className="focus-ring-soft w-full rounded-lg border border-(--border-soft) bg-surface px-3 py-2 text-sm"
                >
                  <option value="">-- Chọn phòng --</option>
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} (tối đa {r.capacity} người)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground/60 mb-1">Mục đích</label>
                <select
                  name="reasonId"
                  required
                  className="focus-ring-soft w-full rounded-lg border border-(--border-soft) bg-surface px-3 py-2 text-sm"
                >
                  <option value="">-- Chọn mục đích --</option>
                  {reasons.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-foreground/60 mb-1">Bắt đầu</label>
                  <input
                    type="datetime-local"
                    name="startAt"
                    required
                    min={minDateTime}
                    value={startValue}
                    onChange={(e) => setStartValue(e.target.value)}
                    className="focus-ring-soft w-full rounded-lg border border-(--border-soft) bg-surface px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground/60 mb-1">Kết thúc</label>
                  <input
                    type="datetime-local"
                    name="endAt"
                    required
                    min={startValue || minDateTime}
                    className="focus-ring-soft w-full rounded-lg border border-(--border-soft) bg-surface px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground/60 mb-1">
                  Ghi chú <span className="text-foreground/30">(tuỳ chọn)</span>
                </label>
                <textarea
                  name="note"
                  rows={3}
                  placeholder="Thêm ghi chú nếu cần..."
                  className="focus-ring-soft w-full rounded-lg border border-(--border-soft) bg-surface px-3 py-2 text-sm resize-none"
                />
              </div>

              {msg && (
                <p
                  className={`text-sm px-3 py-2 rounded-lg ${
                    msg.type === "success"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-red-50 text-red-600 border border-red-200"
                  }`}
                >
                  {msg.text}
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="hover-action-subtle focus-ring-soft press-feedback-soft px-4 py-2 text-sm font-medium border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  aria-busy={pending}
                  className="hover-action-primary focus-ring-strong press-feedback-inset state-disabled loading-inline px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
                >
                  {pending ? "Đang gửi..." : "Gửi yêu cầu"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
