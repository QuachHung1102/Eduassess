"use client";

import { useState, useTransition } from "react";
import { reviewBookingAction } from "@/lib/booking/actions";
import type { BookingItem } from "@/lib/booking/queries";

function formatDT(d: Date) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(d));
}

function ApproveCard({ booking }: { booking: BookingItem }) {
  const [pending, startTransition] = useTransition();
  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [done, setDone] = useState<"approved" | "rejected" | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleApprove() {
    startTransition(async () => {
      const res = await reviewBookingAction(booking.id, "approve");
      if (res.error) {
        setError(res.error);
      } else {
        setDone("approved");
      }
    });
  }

  function handleReject() {
    if (!rejectReason.trim()) return;
    startTransition(async () => {
      const res = await reviewBookingAction(booking.id, "reject", rejectReason);
      if (res.error) {
        setError(res.error);
      } else {
        setDone("rejected");
      }
    });
  }

  if (done === "approved") {
    return (
      <div className="clay-card p-4 border-l-4 border-emerald-400">
        <p className="text-sm text-emerald-600 font-medium">✓ Đã duyệt</p>
        <p className="text-xs text-foreground/60">{booking.room.name}</p>
      </div>
    );
  }

  if (done === "rejected") {
    return (
      <div className="clay-card p-4 border-l-4 border-red-400">
        <p className="text-sm text-red-500 font-medium">✗ Đã từ chối</p>
        <p className="text-xs text-foreground/60">{booking.room.name}</p>
      </div>
    );
  }

  return (
    <div className="clay-card p-4 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-foreground">{booking.room.name}</p>
          <p className="text-xs text-foreground/60">{booking.reason.label}</p>
        </div>
        <span className="shrink-0 text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200 font-medium">
          Chờ duyệt
        </span>
      </div>

      {/* Info */}
      <div className="text-xs text-foreground/70 space-y-0.5">
        <p>
          <span className="font-medium">Người đặt:</span> {booking.requester.name ?? booking.requester.email}
        </p>
        {booking.requester.id !== booking.bookedFor.id && (
          <p>
            <span className="font-medium">Đặt cho:</span> {booking.bookedFor.name ?? booking.bookedFor.email}
          </p>
        )}
        <p>
          <span className="font-medium">Bắt đầu:</span> {formatDT(booking.startAt)}
        </p>
        <p>
          <span className="font-medium">Kết thúc:</span> {formatDT(booking.endAt)}
        </p>
        {booking.note && (
          <p>
            <span className="font-medium">Ghi chú:</span> {booking.note}
          </p>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded px-2 py-1">
          {error}
        </p>
      )}

      {/* Reject reason input */}
      {showReject && (
        <div className="flex flex-col gap-2">
          <textarea
            rows={2}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Lý do từ chối..."
            className="w-full rounded-lg border border-(--border-soft) bg-surface px-3 py-2 text-sm resize-none"
          />
          <div className="flex gap-2">
            <button
              onClick={handleReject}
              disabled={pending || !rejectReason.trim()}
              className="flex-1 py-1.5 text-xs font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg disabled:opacity-50 transition-colors"
            >
              {pending ? "Đang xử lý..." : "Xác nhận từ chối"}
            </button>
            <button
              onClick={() => setShowReject(false)}
              className="px-3 py-1.5 text-xs text-foreground/60 hover:text-foreground transition-colors"
            >
              Hủy
            </button>
          </div>
        </div>
      )}

      {/* Action buttons */}
      {!showReject && (
        <div className="flex gap-2">
          <button
            onClick={handleApprove}
            disabled={pending}
            className="flex-1 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-50 transition-colors"
          >
            {pending ? "Đang xử lý..." : "Duyệt"}
          </button>
          <button
            onClick={() => setShowReject(true)}
            disabled={pending}
            className="flex-1 py-2 text-sm font-medium text-red-500 border border-red-200 hover:bg-red-50 rounded-lg disabled:opacity-50 transition-colors"
          >
            Từ chối
          </button>
        </div>
      )}
    </div>
  );
}

type Props = {
  bookings: BookingItem[];
  reviewerId: string;
};

export function ApproveQueue({ bookings }: Props) {
  if (bookings.length === 0) {
    return (
      <div className="clay-card p-12 flex items-center justify-center">
        <p className="text-foreground/40 text-sm">Không có yêu cầu nào đang chờ duyệt.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {bookings.map((b) => (
        <ApproveCard key={b.id} booking={b} />
      ))}
    </div>
  );
}
