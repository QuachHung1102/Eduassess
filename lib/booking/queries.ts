/**
 * Read-only queries cho Room Booking.
 */

import { prisma } from "@/lib/db/prisma";

const BOOKING_SELECT = {
  id: true,
  startAt: true,
  endAt: true,
  note: true,
  status: true,
  rejectReason: true,
  createdAt: true,
  room: { select: { id: true, name: true, capacity: true } },
  reason: { select: { id: true, label: true, priority: true } },
  requester: { select: { id: true, name: true, email: true } },
  bookedFor: { select: { id: true, name: true, email: true } },
  reviewer: { select: { id: true, name: true } },
} as const;

export type BookingItem = Awaited<ReturnType<typeof getMyBookings>>[number];

/** Lịch đặt phòng của chính mình (requester hoặc bookedFor) */
export async function getMyBookings(
  userId: string,
  filters?: {
    roomId?: string;
    status?: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
    from?: Date;
    to?: Date;
  },
) {
  return prisma.roomBooking.findMany({
    where: {
      OR: [{ requesterId: userId }, { bookedForId: userId }],
      ...(filters?.roomId ? { roomId: filters.roomId } : {}),
      ...(filters?.status ? { status: filters.status } : {}),
      ...(filters?.from || filters?.to
        ? {
            startAt: {
              ...(filters?.from ? { gte: filters.from } : {}),
              ...(filters?.to ? { lte: filters.to } : {}),
            },
          }
        : {}),
    },
    select: BOOKING_SELECT,
    orderBy: { startAt: "asc" },
  });
}

/** Tất cả lịch đặt phòng (dành cho NVLT / ADMIN duyệt) */
export async function getAllBookings(filter?: { status?: string }) {
  return prisma.roomBooking.findMany({
    where: filter?.status ? { status: filter.status as "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED" } : undefined,
    select: BOOKING_SELECT,
    orderBy: [{ status: "asc" }, { startAt: "asc" }],
  });
}

/** Rooms còn hoạt động */
export async function getActiveRooms() {
  return prisma.room.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });
}

/** Tất cả lý do đặt phòng */
export async function getBookingReasons() {
  return prisma.bookingReason.findMany({
    orderBy: { priority: "desc" },
  });
}

/** Lịch APPROVED của 1 phòng trong khoảng thời gian (dùng cho calendar view) */
export async function getRoomSchedule(roomId: string, from: Date, to: Date) {
  return prisma.roomBooking.findMany({
    where: {
      roomId,
      status: "APPROVED",
      startAt: { lt: to },
      endAt: { gt: from },
    },
    select: {
      id: true,
      startAt: true,
      endAt: true,
      reason: { select: { label: true } },
      bookedFor: { select: { name: true } },
    },
    orderBy: { startAt: "asc" },
  });
}
