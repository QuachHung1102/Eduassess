/**
 * Server actions cho Room Booking.
 * - createBookingAction  : BOOKING_CREATE (hoặc BOOKING_CREATE_FOR_OTHER)
 * - cancelBookingAction  : chủ đặt tự huỷ (khi PENDING)
 * - reviewBookingAction  : BOOKING_APPROVE — duyệt / từ chối
 */
"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requirePermission, requireSession } from "@/lib/auth/require";
import { PERMISSIONS } from "@/lib/auth/permission-keys";
import { findRoomConflict, isOverlapViolation, syncBookingOccupancy } from "@/lib/rooms/store";

// ─── Types ──────────────────────────────────────────────────────────────────

export type BookingFormData = {
  roomId: string;
  reasonId: string;
  startAt: string; // ISO string
  endAt: string; // ISO string
  note?: string;
  bookedForId?: string; // nếu đặt hộ người khác
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Thông báo lỗi khi phòng đã bị chiếm trong khoảng [startAt, endAt) —
 * check trên room_occupancies nên bắt cả buổi học của lớp lẫn booking đã duyệt.
 * Trả null nếu phòng trống.
 */
async function conflictMessage(
  roomId: string,
  startAt: Date,
  endAt: Date,
  excludeBookingId?: string,
): Promise<string | null> {
  const conflict = await findRoomConflict({ roomId, startsAt: startAt, endsAt: endAt, excludeBookingId });
  if (!conflict) return null;
  return conflict.source === "CLASS_SESSION"
    ? `Phòng đã có buổi học của lớp "${conflict.label}" trong khung giờ này. Vui lòng chọn thời gian khác.`
    : "Phòng đã được đặt trong khung giờ này. Vui lòng chọn thời gian khác.";
}

// ─── Create Booking ───────────────────────────────────────────────────────────

export async function createBookingAction(data: BookingFormData) {
  const auth = await requireSession();
  if (auth.error !== null) return { error: auth.error };

  const { user } = auth;

  // Nếu đặt hộ người khác → cần BOOKING_CREATE_FOR_OTHER
  const isForOther = data.bookedForId && data.bookedForId !== user.id;
  if (isForOther) {
    const perm = await requirePermission(PERMISSIONS.BOOKING_CREATE_FOR_OTHER.key);
    if (perm.error !== null) return { error: "Không có quyền đặt phòng hộ người khác" };
  } else {
    const perm = await requirePermission(PERMISSIONS.BOOKING_CREATE.key);
    if (perm.error !== null) return { error: perm.error };
  }

  const startAt = new Date(data.startAt);
  const endAt = new Date(data.endAt);

  if (isNaN(startAt.getTime()) || isNaN(endAt.getTime())) {
    return { error: "Thời gian không hợp lệ" };
  }
  if (startAt >= endAt) {
    return { error: "Thời gian kết thúc phải sau thời gian bắt đầu" };
  }
  if (startAt < new Date()) {
    return { error: "Không thể đặt phòng trong quá khứ" };
  }

  // Validate room & reason
  const [room, reason] = await Promise.all([
    prisma.room.findUnique({ where: { id: data.roomId, isActive: true } }),
    prisma.bookingReason.findUnique({ where: { id: data.reasonId } }),
  ]);
  if (!room) return { error: "Phòng không tồn tại hoặc đang bảo trì" };
  if (!reason) return { error: "Lý do không hợp lệ" };

  const conflictMsg = await conflictMessage(data.roomId, startAt, endAt);
  if (conflictMsg) return { error: conflictMsg };

  await prisma.roomBooking.create({
    data: {
      roomId: data.roomId,
      requesterId: user.id,
      bookedForId: isForOther ? data.bookedForId! : user.id,
      reasonId: data.reasonId,
      startAt,
      endAt,
      note: data.note?.trim() || null,
      status: "PENDING",
    },
  });

  revalidatePath("/booking");
  return { success: true };
}

// ─── Cancel Booking ───────────────────────────────────────────────────────────

export async function cancelBookingAction(bookingId: string) {
  const auth = await requireSession();
  if (auth.error !== null) return { error: auth.error };

  const booking = await prisma.roomBooking.findUnique({ where: { id: bookingId } });
  if (!booking) return { error: "Không tìm thấy lịch đặt phòng" };

  // Chỉ người đặt mới được huỷ, và chỉ khi PENDING
  if (booking.requesterId !== auth.user.id) {
    return { error: "Bạn không có quyền huỷ lịch đặt phòng này" };
  }
  if (booking.status !== "PENDING") {
    return { error: "Chỉ có thể huỷ yêu cầu đang chờ duyệt" };
  }

  await prisma.roomBooking.update({
    where: { id: bookingId },
    data: { status: "CANCELLED" },
  });

  revalidatePath("/booking");
  return { success: true };
}

// ─── Review Booking (Approve / Reject) ───────────────────────────────────────

export async function reviewBookingAction(
  bookingId: string,
  action: "approve" | "reject",
  rejectReason?: string,
) {
  const auth = await requirePermission(PERMISSIONS.BOOKING_APPROVE.key);
  if (auth.error !== null) return { error: auth.error };

  const booking = await prisma.roomBooking.findUnique({ where: { id: bookingId } });
  if (!booking) return { error: "Không tìm thấy lịch đặt phòng" };
  if (booking.status !== "PENDING") {
    return { error: "Yêu cầu này đã được xử lý" };
  }

  if (action === "approve") {
    // Re-check conflict khi duyệt (cả buổi học lẫn booking khác đã duyệt)
    const conflictMsg = await conflictMessage(booking.roomId, booking.startAt, booking.endAt, bookingId);
    if (conflictMsg) {
      return { error: `${conflictMsg} Hãy từ chối yêu cầu này.` };
    }
    try {
      // Duyệt + chiếm block phòng trong cùng transaction (ADR-0001);
      // EXCLUDE constraint chặn nốt trường hợp hai người duyệt đồng thời.
      await prisma.$transaction(async (tx) => {
        const approved = await tx.roomBooking.update({
          where: { id: bookingId },
          data: { status: "APPROVED", reviewerId: auth.user.id, reviewedAt: new Date() },
        });
        await syncBookingOccupancy(approved, tx);
      });
    } catch (err) {
      if (isOverlapViolation(err))
        return { error: "Phòng vừa bị lịch khác chiếm. Tải lại trang và từ chối yêu cầu này." };
      throw err;
    }
  } else {
    if (!rejectReason?.trim()) {
      return { error: "Vui lòng nhập lý do từ chối" };
    }
    await prisma.roomBooking.update({
      where: { id: bookingId },
      data: {
        status: "REJECTED",
        reviewerId: auth.user.id,
        reviewedAt: new Date(),
        rejectReason: rejectReason.trim(),
      },
    });
  }

  // Gửi notification cho người đặt
  const notifType = action === "approve" ? "BOOKING_APPROVED" : "BOOKING_REJECTED";
  const notifMsg =
    action === "approve"
      ? `Yêu cầu đặt phòng của bạn đã được duyệt.`
      : `Yêu cầu đặt phòng của bạn bị từ chối: ${rejectReason}`;

  await prisma.notification.create({
    data: {
      userId: booking.requesterId,
      title: action === "approve" ? "Đặt phòng được duyệt" : "Đặt phòng bị từ chối",
      message: notifMsg,
      type: notifType,
      href: "/booking",
    },
  });

  revalidatePath("/booking");
  revalidatePath("/booking/approve");
  return { success: true };
}
