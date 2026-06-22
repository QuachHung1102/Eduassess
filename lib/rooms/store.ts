/**
 * RoomSchedule store — module thuần đọc/ghi RoomOccupancy (ADR-0001).
 *
 * Đây là source-of-truth cho "phòng bị chiếm khi nào": mọi đường ghi vào
 * ClassSession (có phòng) và RoomBooking (đã duyệt) phải sync block tương ứng
 * qua module này, trong CÙNG transaction với hành động gốc. Mọi đường đọc
 * lịch phòng / check xung đột phòng đọc bảng room_occupancies thay vì query
 * chéo ClassSession + RoomBooking.
 *
 * Module KHÔNG biết về phiên đăng nhập, permission, revalidate — những việc
 * đó nằm ở seam (lib/classes/actions.ts, lib/booking/actions.ts).
 *
 * Tầng chống đua tranh cuối cùng là EXCLUDE constraint trên DB
 * (`room_occupancies_no_overlap`): hai transaction ghi block giao nhau trên
 * cùng phòng thì transaction sau bị DB từ chối — seam bắt qua
 * `isOverlapViolation()` để trả lỗi thân thiện.
 *
 * Quy ước thời gian: block là khoảng nửa mở [startsAt, endsAt) — giờ kết thúc
 * của block này được phép bằng giờ bắt đầu của block kế tiếp.
 */

import { prisma } from "@/lib/db/prisma";
import { dbDateToYmd } from "@/lib/date";
import type { Prisma } from "@prisma/client";
import type { BookingStatus, OccupancySource, SessionStatus } from "@prisma/client";

/** Client Prisma hoặc transaction client — để gọi được bên trong $transaction. */
type Db = Prisma.TransactionClient | typeof prisma;

export const NO_OVERLAP_CONSTRAINT = "room_occupancies_no_overlap";

// ── Helpers thời gian ─────────────────────────────────────────

/**
 * Múi giờ vận hành cố định: Asia/Saigon (UTC+7, không DST). Ghép ngày-giờ theo
 * offset TƯỜNG MINH để instant chiếm phòng không phụ thuộc TZ của máy chạy:
 * trên host UTC+7 cho kết quả y hệt mẫu cũ `new Date("…T…")`, trên host UTC
 * không còn lệch −7h. Xem thêm lib/date.ts cho cột @db.Date.
 */
const SAIGON_UTC_OFFSET = "+07:00";

/**
 * Ghép ngày + giờ "HH:mm" thành instant tại giờ Asia/Saigon.
 * - Chuỗi "YYYY-MM-DD" dùng trực tiếp.
 * - Date của cột @db.Date (Prisma trả UTC nửa đêm) lấy phần ngày theo UTC
 *   (`dbDateToYmd`) — KHÔNG dùng getter local, tránh lùi ngày trên host lệch âm.
 */
export function combineDateTime(date: Date | string, hhmm: string): Date {
  const ymd = typeof date === "string" ? date : dbDateToYmd(date);
  return new Date(`${ymd}T${hhmm}:00${SAIGON_UTC_OFFSET}`);
}

/** Khoảng thời gian một buổi học chiếm phòng. */
export function sessionOccupancyRange(s: {
  date: Date | string;
  startTime: string;
  endTime: string;
}): { startsAt: Date; endsAt: Date } {
  return {
    startsAt: combineDateTime(s.date, s.startTime),
    endsAt: combineDateTime(s.date, s.endTime),
  };
}

// ── Check xung đột ────────────────────────────────────────────

export type RoomConflict = {
  source: OccupancySource;
  startsAt: Date;
  endsAt: Date;
  /** Tên lớp (CLASS_SESSION) hoặc lý do đặt phòng (BOOKING). */
  label: string;
};

/**
 * Tìm block chiếm phòng giao với [startsAt, endsAt) trên một phòng.
 * Trả về block đầu tiên tìm thấy (kèm nhãn để dựng thông báo lỗi), null nếu trống.
 * - excludeSessionId/excludeBookingId: bỏ qua block của chính bản ghi đang sửa.
 */
export async function findRoomConflict(
  opts: {
    roomId: string;
    startsAt: Date;
    endsAt: Date;
    excludeSessionId?: string;
    excludeBookingId?: string;
  },
  db: Db = prisma,
): Promise<RoomConflict | null> {
  const and: Prisma.RoomOccupancyWhereInput[] = [];
  if (opts.excludeSessionId)
    and.push({ OR: [{ sessionId: null }, { sessionId: { not: opts.excludeSessionId } }] });
  if (opts.excludeBookingId)
    and.push({ OR: [{ bookingId: null }, { bookingId: { not: opts.excludeBookingId } }] });

  const hit = await db.roomOccupancy.findFirst({
    where: {
      roomId: opts.roomId,
      startsAt: { lt: opts.endsAt },
      endsAt: { gt: opts.startsAt },
      ...(and.length > 0 ? { AND: and } : {}),
    },
    include: {
      session: { select: { class: { select: { name: true } } } },
      booking: { select: { reason: { select: { label: true } } } },
    },
  });
  if (!hit) return null;

  return {
    source: hit.source,
    startsAt: hit.startsAt,
    endsAt: hit.endsAt,
    label: hit.session?.class.name ?? hit.booking?.reason.label ?? "",
  };
}

/** Nhận diện lỗi EXCLUDE constraint khi hai transaction ghi block giao nhau. */
export function isOverlapViolation(err: unknown): boolean {
  return err instanceof Error && err.message.includes(NO_OVERLAP_CONSTRAINT);
}

// ── Sync từ nguồn (gọi trong cùng transaction với hành động gốc) ──

/**
 * Đồng bộ block của một buổi học: chiếm phòng khi (có roomId && status
 * SCHEDULED/COMPLETED), ngược lại nhả block (CANCELLED/POSTPONED, bỏ phòng,
 * chuyển ONLINE).
 */
export async function syncSessionOccupancy(
  session: {
    id: string;
    roomId: string | null;
    date: Date | string;
    startTime: string;
    endTime: string;
    status: SessionStatus;
  },
  db: Db = prisma,
): Promise<void> {
  const occupies =
    session.roomId !== null && (session.status === "SCHEDULED" || session.status === "COMPLETED");

  if (!occupies) {
    await db.roomOccupancy.deleteMany({ where: { sessionId: session.id } });
    return;
  }

  const { startsAt, endsAt } = sessionOccupancyRange(session);
  await db.roomOccupancy.upsert({
    where: { sessionId: session.id },
    update: { roomId: session.roomId!, startsAt, endsAt },
    create: {
      roomId: session.roomId!,
      startsAt,
      endsAt,
      source: "CLASS_SESSION",
      sessionId: session.id,
    },
  });
}

/**
 * Tạo block cho một loạt buổi học mới (sinh từ khung tuần khi tạo lớp).
 * Chỉ dùng cho session vừa create — session đã tồn tại dùng `syncSessionOccupancy`.
 */
export async function occupyForSessions(
  sessions: {
    id: string;
    roomId: string | null;
    date: Date | string;
    startTime: string;
    endTime: string;
  }[],
  db: Db = prisma,
): Promise<void> {
  const data = sessions
    .filter((s) => s.roomId !== null)
    .map((s) => ({
      roomId: s.roomId!,
      ...sessionOccupancyRange(s),
      source: "CLASS_SESSION" as const,
      sessionId: s.id,
    }));
  if (data.length > 0) await db.roomOccupancy.createMany({ data });
}

/** Đồng bộ block của một đặt phòng: chiếm khi APPROVED, ngược lại nhả. */
export async function syncBookingOccupancy(
  booking: {
    id: string;
    roomId: string;
    startAt: Date;
    endAt: Date;
    status: BookingStatus;
  },
  db: Db = prisma,
): Promise<void> {
  if (booking.status !== "APPROVED") {
    await db.roomOccupancy.deleteMany({ where: { bookingId: booking.id } });
    return;
  }

  await db.roomOccupancy.upsert({
    where: { bookingId: booking.id },
    update: { roomId: booking.roomId, startsAt: booking.startAt, endsAt: booking.endAt },
    create: {
      roomId: booking.roomId,
      startsAt: booking.startAt,
      endsAt: booking.endAt,
      source: "BOOKING",
      bookingId: booking.id,
    },
  });
}

// ── Đọc lịch phòng (cho lưới UI & lọc khả thi) ────────────────

export type OccupancyBlock = {
  roomId: string;
  startsAt: Date;
  endsAt: Date;
  source: OccupancySource;
  /** Tên lớp (CLASS_SESSION) hoặc lý do đặt phòng (BOOKING). */
  label: string;
};

/**
 * Mọi block chiếm phòng giao với [from, to), kèm nhãn hiển thị.
 * - roomId: giới hạn một phòng (bỏ trống = mọi phòng).
 * - excludeSessionId: bỏ block của buổi đang sửa (lưới chọn lại phòng/giờ).
 */
export async function getOccupanciesBetween(
  opts: {
    from: Date;
    to: Date;
    roomId?: string;
    excludeSessionId?: string;
  },
  db: Db = prisma,
): Promise<OccupancyBlock[]> {
  const rows = await db.roomOccupancy.findMany({
    where: {
      startsAt: { lt: opts.to },
      endsAt: { gt: opts.from },
      ...(opts.roomId ? { roomId: opts.roomId } : {}),
      ...(opts.excludeSessionId
        ? { OR: [{ sessionId: null }, { sessionId: { not: opts.excludeSessionId } }] }
        : {}),
    },
    include: {
      session: { select: { class: { select: { name: true } } } },
      booking: { select: { reason: { select: { label: true } } } },
    },
    orderBy: { startsAt: "asc" },
  });

  return rows.map((r) => ({
    roomId: r.roomId,
    startsAt: r.startsAt,
    endsAt: r.endsAt,
    source: r.source,
    label: r.session?.class.name ?? r.booking?.reason.label ?? "",
  }));
}

// ── Backfill / rebuild ────────────────────────────────────────

/**
 * Dựng lại toàn bộ room_occupancies từ 2 nguồn — dùng một lần khi migrate
 * dữ liệu cũ (script `prisma/backfill-room-occupancy.ts`) hoặc khi nghi ngờ drift.
 */
export async function rebuildRoomOccupancies(): Promise<{ sessions: number; bookings: number }> {
  return prisma.$transaction(async (tx) => {
    await tx.roomOccupancy.deleteMany({});

    const sessions = await tx.classSession.findMany({
      where: { roomId: { not: null }, status: { in: ["SCHEDULED", "COMPLETED"] } },
      select: { id: true, roomId: true, date: true, startTime: true, endTime: true },
    });
    if (sessions.length > 0) {
      await tx.roomOccupancy.createMany({
        data: sessions.map((s) => ({
          roomId: s.roomId!,
          ...sessionOccupancyRange(s),
          source: "CLASS_SESSION" as const,
          sessionId: s.id,
        })),
      });
    }

    const bookings = await tx.roomBooking.findMany({
      where: { status: "APPROVED" },
      select: { id: true, roomId: true, startAt: true, endAt: true },
    });
    if (bookings.length > 0) {
      await tx.roomOccupancy.createMany({
        data: bookings.map((b) => ({
          roomId: b.roomId,
          startsAt: b.startAt,
          endsAt: b.endAt,
          source: "BOOKING" as const,
          bookingId: b.id,
        })),
      });
    }

    return { sessions: sessions.length, bookings: bookings.length };
  });
}
