"use client";

import { useTransition, useState } from "react";
import { cancelBookingAction } from "@/lib/booking/actions";
import type { BookingItem } from "@/lib/booking/queries";

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Chờ duyệt",
  APPROVED: "Đã duyệt",
  REJECTED: "Đã từ chối",
  CANCELLED: "Đã huỷ",
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700 border-amber-200",
  APPROVED: "bg-emerald-100 text-emerald-700 border-emerald-200",
  REJECTED: "bg-red-100 text-red-600 border-red-200",
  CANCELLED: "bg-gray-100 text-gray-500 border-gray-200",
};

function formatDT(d: Date) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(d));
}

function BookingRow({ booking, userId }: { booking: BookingItem; userId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const canCancel = booking.status === "PENDING" && booking.requester.id === userId;

  function handleCancel() {
    if (!confirm("Bạn có chắc muốn huỷ yêu cầu này?")) return;
    startTransition(async () => {
      const res = await cancelBookingAction(booking.id);
      if (res.error) setError(res.error);
    });
  }

  return (
    <div className="clay-card booking-card p-4 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground truncate">{booking.room.name}</p>
          <p className="text-xs text-foreground/60">{booking.reason.label}</p>
        </div>
        <span
          className={`shrink-0 text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_COLORS[booking.status]}`}
        >
          {STATUS_LABELS[booking.status]}
        </span>
      </div>

      <div className="text-xs text-foreground/70 space-y-0.5">
        <p>
          <span className="font-medium">Bắt đầu:</span> {formatDT(booking.startAt)}
        </p>
        <p>
          <span className="font-medium">Kết thúc:</span> {formatDT(booking.endAt)}
        </p>
        {booking.requester.id !== booking.bookedFor.id && (
          <p>
            <span className="font-medium">Đặt cho:</span> {booking.bookedFor.name}
          </p>
        )}
        {booking.note && (
          <p>
            <span className="font-medium">Ghi chú:</span> {booking.note}
          </p>
        )}
        {booking.status === "REJECTED" && booking.rejectReason && (
          <p className="text-red-500">
            <span className="font-medium">Lý do từ chối:</span> {booking.rejectReason}
          </p>
        )}
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      {canCancel && (
        <button
          onClick={handleCancel}
          disabled={pending}
          className="self-end text-xs text-red-500 hover:text-red-700 disabled:opacity-40"
        >
          {pending ? "Đang huỷ..." : "Huỷ yêu cầu"}
        </button>
      )}
    </div>
  );
}

type Props = {
  bookings: BookingItem[];
  userId: string;
};

export function BookingList({ bookings, userId }: Props) {
  const upcoming = bookings.filter((b) => b.status === "PENDING" || b.status === "APPROVED");
  const past = bookings.filter((b) => b.status === "REJECTED" || b.status === "CANCELLED");

  if (bookings.length === 0) {
    return (
      <div className="clay-card p-8 flex items-center justify-center">
        <p className="text-foreground/40 text-sm">Bạn chưa có lịch đặt phòng nào.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 overflow-auto">
      {upcoming.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-foreground/60 uppercase tracking-wide mb-3">
            Hiện tại &amp; sắp tới
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {upcoming.map((b) => (
              <BookingRow key={b.id} booking={b} userId={userId} />
            ))}
          </div>
        </section>
      )}

      {past.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-foreground/60 uppercase tracking-wide mb-3">
            Lịch sử
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 opacity-70">
            {past.map((b) => (
              <BookingRow key={b.id} booking={b} userId={userId} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
