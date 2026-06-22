"use server";

import { saveAvailability } from "@/lib/availability/store";
import { can } from "@/lib/auth/permissions";
import { revalidatePath } from "next/cache";
import { requireSession } from "./_shared";
import type { DayOfWeek, TimeSlot, AvailabilityMode } from "@/lib/types";

// ── Lịch rảnh học sinh ────────────────────────────────────────

export async function saveStudentAvailabilityAction(
  studentId: string,
  slots: { dayOfWeek: DayOfWeek; slot: TimeSlot; availabilityMode: AvailabilityMode }[],
) {
  const session = await requireSession();
  // Only CBDT (STAFF with student.evaluate) or the student themselves
  if (
    session.user.id !== studentId &&
    !(await can(session.user, "student.evaluate"))
  )
    return { error: "Không có quyền cập nhật lịch rảnh" };

  await saveAvailability({ kind: "student", id: studentId }, slots);

  revalidatePath(`/staff/students/${studentId}`);
  return { success: true };
}

/**
 * CBĐT khai/sửa lịch rảnh GIÁO VIÊN hộ (hỗ trợ xếp lớp). Gate bằng `class.create`
 * — cùng quyền lập lịch lớp; GV vẫn tự khai ở `/teacher/schedule`.
 */
export async function saveTeacherAvailabilityAction(
  teacherId: string,
  slots: { dayOfWeek: DayOfWeek; slot: TimeSlot; availabilityMode: AvailabilityMode }[],
) {
  const session = await requireSession();
  if (!(await can(session.user, "class.create")))
    return { error: "Không có quyền cập nhật lịch rảnh giáo viên" };

  await saveAvailability({ kind: "teacher", id: teacherId }, slots);

  revalidatePath(`/staff/teachers/${teacherId}`);
  return { success: true };
}
