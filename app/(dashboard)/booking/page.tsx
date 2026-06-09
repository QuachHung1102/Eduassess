/**
 * /booking — Trang đặt phòng của user (xem lịch + tạo mới)
 * Quyền: BOOKING_CREATE (hoặc BOOKING_CREATE_FOR_OTHER)
 */

import { redirect } from "next/navigation";
import { can } from "@/lib/auth/permissions";
import { PERMISSIONS } from "@/lib/auth/permission-keys";
import { requirePageSession } from "@/lib/auth/page-guard";
import { getMyBookings, getActiveRooms, getBookingReasons } from "@/lib/booking/queries";
import { BookingList } from "./BookingList";
import { BookingForm } from "./BookingForm";

export default async function BookingPage({
  searchParams,
}: {
  searchParams: Promise<{
    roomId?: string;
    status?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const user = await requirePageSession();

  const params = await searchParams;

  const [canCreate, canApprove] = await Promise.all([
    can(user, PERMISSIONS.BOOKING_CREATE.key),
    can(user, PERMISSIONS.BOOKING_APPROVE.key),
  ]);

  if (!canCreate) redirect("/");

  const fromDate = params.from ? new Date(`${params.from}T00:00:00`) : undefined;
  const toDate = params.to ? new Date(`${params.to}T23:59:59.999`) : undefined;

  const [bookings, rooms, reasons] = await Promise.all([
    getMyBookings(user.id, {
      roomId: params.roomId || undefined,
      status: (params.status as "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED" | undefined) || undefined,
      from: fromDate,
      to: toDate,
    }),
    getActiveRooms(),
    getBookingReasons(),
  ]);

  return (
    <div className="flex flex-col h-full gap-6">
      <div className="shrink-0 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Đặt phòng</h1>
          <p className="text-sm text-foreground/60 mt-1">
            Quản lý lịch đặt phòng của bạn
          </p>
        </div>
        <div className="flex items-center gap-2">
          <BookingForm rooms={rooms} reasons={reasons} />
          {canApprove && (
            <a
              href="/booking/approve"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Duyệt yêu cầu
            </a>
          )}
        </div>
      </div>

      <form method="GET" className="shrink-0 bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Phòng</label>
            <select
              name="roomId"
              defaultValue={params.roomId ?? ""}
              className="h-10 border border-gray-200 rounded-lg px-3 text-sm bg-white text-gray-900 min-w-48"
            >
              <option value="">Tất cả phòng</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Trạng thái</label>
            <select
              name="status"
              defaultValue={params.status ?? ""}
              className="h-10 border border-gray-200 rounded-lg px-3 text-sm bg-white text-gray-900 min-w-40"
            >
              <option value="">Tất cả</option>
              <option value="PENDING">Chờ duyệt</option>
              <option value="APPROVED">Đã duyệt</option>
              <option value="REJECTED">Đã từ chối</option>
              <option value="CANCELLED">Đã huỷ</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Từ ngày</label>
            <input
              type="date"
              name="from"
              defaultValue={params.from ?? ""}
              className="h-10 border border-gray-200 rounded-lg px-3 text-sm bg-white text-gray-900"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Đến ngày</label>
            <input
              type="date"
              name="to"
              defaultValue={params.to ?? ""}
              className="h-10 border border-gray-200 rounded-lg px-3 text-sm bg-white text-gray-900"
            />
          </div>
          <button
            type="submit"
            className="h-10 bg-gray-900 text-white px-4 rounded-lg text-sm font-medium hover:bg-black transition-colors"
          >
            Lọc
          </button>
          {(params.roomId || params.status || params.from || params.to) && (
            <a
              href="/booking"
              className="h-10 inline-flex items-center border border-gray-300 text-gray-600 px-3 rounded-lg text-sm hover:bg-gray-50 transition-colors"
            >
              Xóa bộ lọc
            </a>
          )}
        </div>
      </form>

      <div className="flex-1 overflow-auto min-h-0">
        <BookingList bookings={bookings} userId={user.id} />
      </div>
    </div>
  );
}
