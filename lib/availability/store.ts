import type { TimeSlot as PrismaTimeSlot } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { normalizeAvailabilitySlots } from "@/lib/availability/time-slots";
import type { AvailabilityMode, DayOfWeek, TimeSlot } from "@/lib/types";

/**
 * Module lịch rảnh — nguồn sự thật cho việc đọc/ghi Availability của một
 * chủ thể (Student hoặc Teacher). Thuần: không kiểm tra quyền, không
 * revalidate cache. Permission và revalidate là chính sách của call site
 * (server action), không thuộc về module này.
 */

export type AvailabilitySubject =
  | { kind: "student"; id: string }
  | { kind: "teacher"; id: string };

export type AvailabilityCell = {
  dayOfWeek: DayOfWeek;
  slot: TimeSlot;
  availabilityMode: AvailabilityMode;
};

/** Đọc toàn bộ ô Availability của chủ thể, đã sắp xếp theo ngày + slot. */
export async function loadAvailability(
  subject: AvailabilitySubject,
): Promise<AvailabilityCell[]> {
  if (subject.kind === "student") {
    return prisma.studentAvailability.findMany({
      where: { studentId: subject.id },
      orderBy: [{ dayOfWeek: "asc" }, { slot: "asc" }],
      select: { dayOfWeek: true, slot: true, availabilityMode: true },
    });
  }

  return prisma.teacherAvailability.findMany({
    where: { teacherId: subject.id },
    orderBy: [{ dayOfWeek: "asc" }, { slot: "asc" }],
    select: { dayOfWeek: true, slot: true, availabilityMode: true },
  });
}

/**
 * Ghi đè toàn bộ Availability của chủ thể: normalize (bỏ ô BUSY, mở rộng
 * slot legacy) → xoá hết → tạo lại trong một transaction.
 */
export async function saveAvailability(
  subject: AvailabilitySubject,
  slots: AvailabilityCell[],
): Promise<void> {
  const normalized = normalizeAvailabilitySlots(slots);

  await prisma.$transaction(async (tx) => {
    if (subject.kind === "student") {
      await tx.studentAvailability.deleteMany({
        where: { studentId: subject.id },
      });
      if (normalized.length === 0) return;
      await tx.studentAvailability.createMany({
        data: normalized.map((cell) => ({
          studentId: subject.id,
          dayOfWeek: cell.dayOfWeek,
          slot: cell.slot as PrismaTimeSlot,
          availabilityMode: cell.availabilityMode,
        })),
        skipDuplicates: true,
      });
      return;
    }

    await tx.teacherAvailability.deleteMany({
      where: { teacherId: subject.id },
    });
    if (normalized.length === 0) return;
    await tx.teacherAvailability.createMany({
      data: normalized.map((cell) => ({
        teacherId: subject.id,
        dayOfWeek: cell.dayOfWeek,
        slot: cell.slot as PrismaTimeSlot,
        availabilityMode: cell.availabilityMode,
      })),
      skipDuplicates: true,
    });
  });
}
