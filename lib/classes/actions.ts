"use server";

import { auth } from "@/auth";
import { saveAvailability } from "@/lib/availability/store";
import { prisma } from "@/lib/db/prisma";
import { can } from "@/lib/auth/permissions";
import { getRoomUsageForDate, type RoomUsageForDate } from "@/lib/classes/queries";
import {
  generateSessionPlan,
  weeklyPatternToCells,
  suggestMakeupDate,
  type WeeklySlotInput,
} from "@/lib/classes/scheduling";
import {
  getEligibleTeachersForSchedule,
  getEligibleRoomsForSchedule,
  getEligibleStudentsForSchedule,
  getTeacherAvailableCells,
  getRoomBusyCells,
  type EligibleTeacher,
  type EligibleRoom,
  type EligibleStudent,
} from "@/lib/classes/eligibility";
import { revalidatePath } from "next/cache";
import type { ClassMode, ClassStatus, SessionStatus, AttendanceStatus, StudentLevel, DayOfWeek, TimeSlot, AvailabilityMode } from "@/lib/types";

// ── Guard ──────────────────────────────────────────────────────
async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Chưa đăng nhập");
  return session;
}

// ── Class CRUD ─────────────────────────────────────────────────

/**
 * Tạo lớp KÈM khung lịch tuần + sinh buổi học + phân GV/HS trong một lần.
 * Lọc cứng: re-check GV/phòng/HS còn khả thi với lịch (chống trùng phòng/lịch
 * do trạng thái UI cũ hoặc đua tranh). Sinh ClassSession theo khung tuần.
 */
export async function createClassWithScheduleAction(data: {
  name: string;
  subjectId: string;
  mode: ClassMode; // OFFLINE | ONLINE
  targetLevel: StudentLevel;
  startDate: string; // "YYYY-MM-DD"
  weeklySlots: WeeklySlotInput[];
  sessionCount: number;
  teacherId: string;
  roomId?: string; // bắt buộc nếu OFFLINE
  studentIds: string[];
  note?: string;
}) {
  const session = await requireSession();
  const hasPermission = await can(session.user, "class.create");
  if (!hasPermission) return { error: "Không có quyền tạo lớp" };

  if (!data.name.trim()) return { error: "Thiếu tên lớp" };
  if (!data.subjectId) return { error: "Thiếu môn học" };
  if (!data.startDate) return { error: "Thiếu ngày bắt đầu" };
  if (data.weeklySlots.length === 0) return { error: "Chưa chọn khung lịch tuần" };
  if (data.sessionCount <= 0) return { error: "Số buổi phải lớn hơn 0" };
  if (!data.teacherId) return { error: "Chưa chọn giáo viên" };

  const needsRoom = data.mode !== "ONLINE";
  if (needsRoom && !data.roomId) return { error: "Lớp offline cần chọn phòng" };

  const cells = weeklyPatternToCells(data.weeklySlots);
  const plan = generateSessionPlan({
    startDate: data.startDate,
    weeklySlots: data.weeklySlots,
    sessionCount: data.sessionCount,
  });
  if (plan.length < data.sessionCount)
    return { error: "Không sinh đủ số buổi từ khung lịch đã chọn" };

  // ── Re-check khả thi (lọc cứng) ──
  const eligibleTeachers = await getEligibleTeachersForSchedule({
    cells,
    mode: data.mode,
    plannedSessions: plan,
  });
  if (!eligibleTeachers.some((t) => t.id === data.teacherId))
    return { error: "Giáo viên không còn rảnh/đã trùng lịch với khung này" };

  if (needsRoom) {
    const eligibleRooms = await getEligibleRoomsForSchedule({
      plannedSessions: plan,
      capacityNeeded: data.studentIds.length,
    });
    if (!eligibleRooms.some((r) => r.id === data.roomId))
      return { error: "Phòng không còn trống cho toàn bộ buổi của khung này" };
  }

  if (data.studentIds.length > 0) {
    const eligibleStudents = await getEligibleStudentsForSchedule({
      cells,
      mode: data.mode,
      subjectId: data.subjectId,
      targetLevel: data.targetLevel,
      plannedSessions: plan,
    });
    const eligibleSet = new Set(eligibleStudents.map((s) => s.id));
    const invalid = data.studentIds.filter((id) => !eligibleSet.has(id));
    if (invalid.length > 0)
      return { error: `${invalid.length} học sinh không còn khả thi với lịch này` };
  }

  const roomId = needsRoom ? data.roomId! : null;

  const classId = await prisma.$transaction(async (tx) => {
    const cls = await tx.class.create({
      data: {
        name: data.name.trim(),
        subjectId: data.subjectId,
        advisorId: session.user.id,
        createdById: session.user.id,
        mode: data.mode,
        targetLevel: data.targetLevel,
        sessionCount: plan.length,
        startDate: new Date(`${data.startDate}T00:00:00`),
        note: data.note?.trim() || null,
        status: "DRAFT",
      },
    });

    await tx.classWeeklySlot.createMany({
      data: data.weeklySlots.map((s) => ({
        classId: cls.id,
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime,
      })),
    });

    await tx.classTeacher.create({
      data: { classId: cls.id, teacherId: data.teacherId },
    });

    await tx.classSession.createMany({
      data: plan.map((p) => ({
        classId: cls.id,
        sessionNumber: p.sessionNumber,
        date: new Date(`${p.date}T00:00:00`),
        startTime: p.startTime,
        endTime: p.endTime,
        mode: data.mode,
        roomId,
        teacherId: data.teacherId,
        status: "SCHEDULED" as const,
      })),
    });

    if (data.studentIds.length > 0) {
      await tx.classEnrollment.createMany({
        data: data.studentIds.map((studentId) => ({
          classId: cls.id,
          studentId,
          status: "ACTIVE" as const,
        })),
      });
      await tx.notification.createMany({
        data: data.studentIds.map((studentId) => ({
          userId: studentId,
          title: "Bạn đã được thêm vào lớp học",
          message: `Bạn đã được thêm vào lớp "${cls.name}". Kiểm tra lịch học của bạn để biết thêm chi tiết.`,
          type: "CLASS_ASSIGNED" as const,
          href: `/student/exams`,
        })),
      });
    }

    return cls.id;
  });

  revalidatePath("/staff/classes");
  return { success: true, classId };
}

/**
 * Lọc GV / phòng / HS khả thi cho khung lịch đang dựng (gọi từ client builder).
 * Trả về { error } nếu thiếu quyền/dữ liệu.
 */
export async function getScheduleEligibilityAction(input: {
  weeklySlots: WeeklySlotInput[];
  startDate: string;
  sessionCount: number;
  mode: ClassMode;
  subjectId: string;
  targetLevel: StudentLevel;
}): Promise<
  | { error: string }
  | {
      teachers: EligibleTeacher[];
      rooms: EligibleRoom[];
      students: EligibleStudent[];
      plannedCount: number;
    }
> {
  const session = await requireSession();
  if (!(await can(session.user, "class.create"))) return { error: "Không có quyền" };
  if (input.weeklySlots.length === 0) return { error: "Chưa chọn khung lịch tuần" };
  if (!input.startDate || input.sessionCount <= 0)
    return { error: "Thiếu ngày bắt đầu hoặc số buổi" };

  const cells = weeklyPatternToCells(input.weeklySlots);
  const plan = generateSessionPlan({
    startDate: input.startDate,
    weeklySlots: input.weeklySlots,
    sessionCount: input.sessionCount,
  });

  const [teachers, students, rooms] = await Promise.all([
    getEligibleTeachersForSchedule({ cells, mode: input.mode, plannedSessions: plan }),
    input.subjectId && input.targetLevel
      ? getEligibleStudentsForSchedule({
          cells,
          mode: input.mode,
          subjectId: input.subjectId,
          targetLevel: input.targetLevel,
          plannedSessions: plan,
        })
      : Promise.resolve([] as EligibleStudent[]),
    input.mode === "ONLINE"
      ? Promise.resolve([] as EligibleRoom[])
      : getEligibleRoomsForSchedule({ plannedSessions: plan }),
  ]);

  return { teachers, rooms, students, plannedCount: plan.length };
}

/** Ô lịch GV rảnh — tô lưới khi ưu tiên chọn giáo viên trước. */
export async function getTeacherCellsAction(
  teacherId: string,
  mode: ClassMode,
): Promise<{ cells: string[] } | { error: string }> {
  const session = await requireSession();
  if (!(await can(session.user, "class.create"))) return { error: "Không có quyền" };
  if (!teacherId) return { error: "Chưa chọn giáo viên" };
  return { cells: await getTeacherAvailableCells(teacherId, mode) };
}

/** Ô lịch phòng BẬN — tô xám lưới khi ưu tiên chọn phòng trước. */
export async function getRoomBusyCellsAction(
  roomId: string,
  startDate: string,
  weeks: number,
): Promise<{ cells: string[] } | { error: string }> {
  const session = await requireSession();
  if (!(await can(session.user, "class.create"))) return { error: "Không có quyền" };
  if (!roomId || !startDate) return { error: "Thiếu phòng hoặc ngày bắt đầu" };
  return { cells: await getRoomBusyCells({ roomId, startDate, weeks: Math.max(1, weeks) }) };
}

export async function updateClassAction(
  classId: string,
  data: {
    name?: string;
    mode?: ClassMode;
    targetLevel?: StudentLevel;
    sessionCount?: number;
    status?: ClassStatus;
    note?: string;
  },
) {
  const session = await requireSession();
  const hasPermission = await can(session.user, "class.update");
  if (!hasPermission) return { error: "Không có quyền sửa lớp" };

  const cls = await prisma.class.findUnique({ where: { id: classId } });
  if (!cls) return { error: "Không tìm thấy lớp" };
  // CBDT chỉ sửa lớp của mình
  if (
    session.user.role === "STAFF" &&
    cls.advisorId !== session.user.id
  ) return { error: "Bạn không phải cố vấn của lớp này" };

  await prisma.class.update({
    where: { id: classId },
    data: {
      ...(data.name ? { name: data.name.trim() } : {}),
      ...(data.mode ? { mode: data.mode } : {}),
      ...(data.targetLevel ? { targetLevel: data.targetLevel } : {}),
      ...(data.sessionCount !== undefined ? { sessionCount: data.sessionCount } : {}),
      ...(data.status ? { status: data.status } : {}),
      ...(data.note !== undefined ? { note: data.note?.trim() || null } : {}),
    },
  });

  revalidatePath(`/staff/classes/${classId}`);
  revalidatePath("/staff/classes");
  return { success: true };
}

// ── Session CRUD ───────────────────────────────────────────────

export async function createSessionAction(
  classId: string,
  data: {
    sessionNumber: number;
    date: string;      // "YYYY-MM-DD"
    startTime: string; // "HH:mm"
    endTime: string;   // "HH:mm"
    mode: ClassMode;
    roomId?: string;
    teacherId: string;
    note?: string;
  },
) {
  const session = await requireSession();
  const hasPermission = await can(session.user, "class.manage_session");
  if (!hasPermission) return { error: "Không có quyền tạo buổi học" };
  if (!data.date || !data.startTime || !data.endTime || !data.teacherId)
    return { error: "Thiếu thông tin buổi học" };
  if (data.startTime >= data.endTime)
    return { error: "Giờ bắt đầu phải trước giờ kết thúc" };

  // Check duplicate sessionNumber in same class
  const existing = await prisma.classSession.findFirst({
    where: { classId, sessionNumber: data.sessionNumber },
  });
  if (existing)
    return { error: `Buổi số ${data.sessionNumber} đã tồn tại trong lớp` };

  await prisma.classSession.create({
    data: {
      classId,
      sessionNumber: data.sessionNumber,
      date: new Date(data.date),
      startTime: data.startTime,
      endTime: data.endTime,
      mode: data.mode,
      roomId: data.roomId || null,
      teacherId: data.teacherId,
      note: data.note?.trim() || null,
      status: "SCHEDULED",
    },
  });

  revalidatePath(`/staff/classes/${classId}`);
  return { success: true };
}

/**
 * Lấy lịch sử dụng phòng trong một ngày để dựng lưới xếp buổi học.
 * Trả về { error } khi không đủ quyền, ngược lại trả về danh sách phòng + block đã chiếm.
 */
export async function getRoomUsageAction(
  date: string, // "YYYY-MM-DD"
  excludeSessionId?: string,
): Promise<{ rooms: RoomUsageForDate[] } | { error: string }> {
  const session = await requireSession();
  const hasPermission = await can(session.user, "class.manage_session");
  if (!hasPermission) return { error: "Không có quyền xem lịch phòng" };
  if (!date) return { error: "Thiếu ngày cần xem" };

  const rooms = await getRoomUsageForDate(date, excludeSessionId);
  return { rooms };
}

// ── Đánh dấu buổi & bù buổi ────────────────────────────────────

function ymdLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function hhmmLocal(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/**
 * Đánh dấu một buổi học diễn ra (xanh) hay nghỉ (đỏ).
 * - cancelled=false → đưa về SCHEDULED.
 * - cancelled=true  → CANCELLED + ghi lý do, kèm đề xuất ngày bù.
 */
export async function markSessionAction(
  sessionId: string,
  input: { cancelled: boolean; reason?: string },
): Promise<
  | { error: string }
  | { success: true; suggestion?: { date: string; startTime: string; endTime: string } | null }
> {
  const session = await requireSession();
  if (!(await can(session.user, "class.manage_session")))
    return { error: "Không có quyền cập nhật buổi học" };

  const sess = await prisma.classSession.findUnique({
    where: { id: sessionId },
    include: {
      class: {
        include: {
          weeklySlots: { select: { dayOfWeek: true, startTime: true, endTime: true } },
          sessions: { select: { date: true } },
        },
      },
    },
  });
  if (!sess) return { error: "Không tìm thấy buổi học" };
  if (session.user.role === "STAFF" && sess.class.advisorId !== session.user.id)
    return { error: "Bạn không phải cố vấn của lớp này" };

  if (!input.cancelled) {
    await prisma.classSession.update({
      where: { id: sessionId },
      data: { status: "SCHEDULED" },
    });
    revalidatePath(`/staff/classes/${sess.classId}`);
    return { success: true };
  }

  if (!input.reason?.trim()) return { error: "Cần nhập lý do nghỉ" };
  await prisma.classSession.update({
    where: { id: sessionId },
    data: { status: "CANCELLED", note: input.reason.trim() },
  });

  // Thông báo cho học sinh đang học + giáo viên dạy buổi này.
  const dateLabel = new Date(`${ymdLocal(sess.date)}T00:00:00`).toLocaleDateString("vi-VN", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
  const buoiLabel = `Buổi ${sess.sessionNumber} – ${sess.class.name} (${dateLabel})`;
  const enrollments = await prisma.classEnrollment.findMany({
    where: { classId: sess.classId, status: "ACTIVE" },
    select: { studentId: true },
  });
  const recipients: { userId: string; title: string; message: string; type: "SCHEDULE_CHANGED"; href: string }[] = [
    ...enrollments.map((e) => ({
      userId: e.studentId,
      title: "Buổi học bị nghỉ",
      message: `${buoiLabel} đã bị nghỉ. Lý do: ${input.reason!.trim()}. Lớp sẽ sắp xếp buổi bù.`,
      type: "SCHEDULE_CHANGED" as const,
      href: `/student/exams`,
    })),
    {
      userId: sess.teacherId,
      title: "Buổi học bị nghỉ",
      message: `${buoiLabel} đã bị nghỉ. Lý do: ${input.reason!.trim()}.`,
      type: "SCHEDULE_CHANGED" as const,
      href: `/teacher/classes/${sess.classId}`,
    },
  ];
  if (recipients.length > 0) {
    await prisma.notification.createMany({ data: recipients, skipDuplicates: true });
  }

  const weeklySlots: WeeklySlotInput[] = sess.class.weeklySlots.map((s) => ({
    dayOfWeek: s.dayOfWeek,
    startTime: s.startTime,
    endTime: s.endTime,
  }));
  const allDates = sess.class.sessions.map((s) => ymdLocal(s.date));
  const lastDate = [...allDates].sort().at(-1) ?? ymdLocal(sess.date);
  const suggestion = suggestMakeupDate({ afterDate: lastDate, weeklySlots, avoidDates: allDates });

  revalidatePath(`/staff/classes/${sess.classId}`);
  return { success: true, suggestion };
}

/**
 * Tạo buổi bù cho một buổi đã hủy — kế thừa phòng/GV/hình thức của buổi gốc,
 * re-check trùng phòng & GV cho ngày/giờ mới rồi nối thêm buổi.
 */
export async function createMakeupSessionAction(
  cancelledSessionId: string,
  input: { date: string; startTime: string; endTime: string },
): Promise<{ error: string } | { success: true }> {
  const session = await requireSession();
  if (!(await can(session.user, "class.manage_session")))
    return { error: "Không có quyền tạo buổi bù" };

  const sess = await prisma.classSession.findUnique({
    where: { id: cancelledSessionId },
    include: { class: { select: { advisorId: true, name: true } } },
  });
  if (!sess) return { error: "Không tìm thấy buổi học gốc" };
  if (session.user.role === "STAFF" && sess.class.advisorId !== session.user.id)
    return { error: "Bạn không phải cố vấn của lớp này" };
  if (!input.date || !input.startTime || !input.endTime)
    return { error: "Thiếu thông tin buổi bù" };
  if (input.startTime >= input.endTime)
    return { error: "Giờ bắt đầu phải trước giờ kết thúc" };

  const dateObj = new Date(`${input.date}T00:00:00`);

  // GV bận?
  const teacherBusy = await prisma.classSession.findFirst({
    where: {
      teacherId: sess.teacherId,
      date: dateObj,
      status: { in: ["SCHEDULED", "COMPLETED"] },
      AND: [{ startTime: { lt: input.endTime } }, { endTime: { gt: input.startTime } }],
    },
  });
  if (teacherBusy) return { error: "Giáo viên đã có buổi khác trùng giờ ngày này" };

  // Phòng bận?
  if (sess.roomId) {
    const roomBusy = await prisma.classSession.findFirst({
      where: {
        roomId: sess.roomId,
        date: dateObj,
        status: { in: ["SCHEDULED", "COMPLETED"] },
        AND: [{ startTime: { lt: input.endTime } }, { endTime: { gt: input.startTime } }],
      },
    });
    if (roomBusy) return { error: "Phòng đã có buổi khác trùng giờ ngày này" };

    const dayStart = new Date(`${input.date}T00:00:00`);
    const dayEnd = new Date(`${input.date}T23:59:59`);
    const bookings = await prisma.roomBooking.findMany({
      where: { roomId: sess.roomId, status: "APPROVED", startAt: { lt: dayEnd }, endAt: { gt: dayStart } },
      select: { startAt: true, endAt: true },
    });
    const bookingClash = bookings.some(
      (b) => hhmmLocal(b.startAt) < input.endTime && hhmmLocal(b.endAt) > input.startTime,
    );
    if (bookingClash) return { error: "Phòng đã có lịch đặt trùng giờ ngày này" };
  }

  const max = await prisma.classSession.aggregate({
    where: { classId: sess.classId },
    _max: { sessionNumber: true },
  });
  const nextNumber = (max._max.sessionNumber ?? 0) + 1;

  // Buổi bù KHÔNG tăng sessionCount: con số mục tiêu giữ nguyên số buổi của
  // giáo trình; buổi bù chỉ thay thế buổi đã nghỉ, không phải buổi mới.
  await prisma.classSession.create({
    data: {
      classId: sess.classId,
      sessionNumber: nextNumber,
      date: dateObj,
      startTime: input.startTime,
      endTime: input.endTime,
      mode: sess.mode,
      roomId: sess.roomId,
      teacherId: sess.teacherId,
      status: "SCHEDULED",
      note: `Bù cho buổi #${sess.sessionNumber}`,
    },
  });

  // Thông báo lịch bù cho học sinh đang học + giáo viên dạy.
  const dateLabel = new Date(`${input.date}T00:00:00`).toLocaleDateString("vi-VN", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
  const msgBody = `Đã có buổi bù cho buổi #${sess.sessionNumber} của lớp ${sess.class.name}: ${dateLabel}, ${input.startTime}–${input.endTime}.`;
  const enrollments = await prisma.classEnrollment.findMany({
    where: { classId: sess.classId, status: "ACTIVE" },
    select: { studentId: true },
  });
  const recipients: { userId: string; title: string; message: string; type: "SCHEDULE_CHANGED"; href: string }[] = [
    ...enrollments.map((e) => ({
      userId: e.studentId,
      title: "Có buổi bù mới",
      message: msgBody,
      type: "SCHEDULE_CHANGED" as const,
      href: `/student/exams`,
    })),
    {
      userId: sess.teacherId,
      title: "Có buổi bù mới",
      message: msgBody,
      type: "SCHEDULE_CHANGED" as const,
      href: `/teacher/classes/${sess.classId}`,
    },
  ];
  if (recipients.length > 0) {
    await prisma.notification.createMany({ data: recipients, skipDuplicates: true });
  }

  revalidatePath(`/staff/classes/${sess.classId}`);
  return { success: true };
}

export async function updateSessionAction(
  sessionId: string,
  data: {
    date?: string;
    startTime?: string;
    endTime?: string;
    mode?: ClassMode;
    roomId?: string | null;
    teacherId?: string;
    status?: SessionStatus;
    note?: string;
  },
) {
  const session = await requireSession();
  const hasPermission = await can(session.user, "class.manage_session");
  if (!hasPermission) return { error: "Không có quyền sửa buổi học" };

  const sess = await prisma.classSession.findUnique({
    where: { id: sessionId },
    include: {
      class: { select: { name: true } },
    },
  });
  if (!sess) return { error: "Không tìm thấy buổi học" };

  if (data.startTime && data.endTime && data.startTime >= data.endTime)
    return { error: "Giờ bắt đầu phải trước giờ kết thúc" };

  await prisma.classSession.update({
    where: { id: sessionId },
    data: {
      ...(data.date ? { date: new Date(data.date) } : {}),
      ...(data.startTime ? { startTime: data.startTime } : {}),
      ...(data.endTime ? { endTime: data.endTime } : {}),
      ...(data.mode ? { mode: data.mode } : {}),
      ...("roomId" in data ? { roomId: data.roomId } : {}),
      ...(data.teacherId ? { teacherId: data.teacherId } : {}),
      ...(data.status ? { status: data.status } : {}),
      ...(data.note !== undefined ? { note: data.note?.trim() || null } : {}),
    },
  });

  // Thông báo lịch thay đổi nếu ngày/giờ thay đổi hoặc buổi bị huỷ/hoãn
  const scheduleChanged = data.date || data.startTime || data.endTime;
  const cancelled = data.status === "CANCELLED";
  const postponed = data.status === "POSTPONED";
  if (scheduleChanged || cancelled || postponed) {
    const enrollments = await prisma.classEnrollment.findMany({
      where: { classId: sess.classId, status: "ACTIVE" },
      select: { studentId: true },
    });
    if (enrollments.length > 0) {
      const buoiLabel = `Buổi ${sess.sessionNumber} – ${sess.class.name}`;
      const msgBody = cancelled
        ? `${buoiLabel} đã bị huỷ.`
        : postponed
          ? `${buoiLabel} đã bị hoãn. Vui lòng chờ thông báo lịch mới.`
          : `${buoiLabel} vừa được cập nhật lịch học. Kiểm tra lịch của bạn để biết thời gian mới.`;
      await prisma.notification.createMany({
        data: enrollments.map((e) => ({
          userId: e.studentId,
          title: cancelled ? "Buổi học bị huỷ" : postponed ? "Buổi học bị hoãn" : "Lịch học thay đổi",
          message: msgBody,
          type: "SCHEDULE_CHANGED" as const,
          href: `/student/exams`,
        })),
        skipDuplicates: true,
      });
    }
  }

  revalidatePath(`/staff/classes/${sess.classId}`);
  revalidatePath(`/staff/classes/${sess.classId}/sessions/${sessionId}`);
  return { success: true };
}

// ── Điểm danh ─────────────────────────────────────────────────

export async function saveAttendanceAction(
  sessionId: string,
  records: { studentId: string; status: AttendanceStatus; note?: string }[],
) {
  const session = await requireSession();
  const hasPermission = await can(session.user, "class.take_attendance");
  if (!hasPermission) return { error: "Không có quyền điểm danh" };

  const classSession = await prisma.classSession.findUnique({
    where: { id: sessionId },
  });
  if (!classSession) return { error: "Không tìm thấy buổi học" };

  // Upsert tất cả trong 1 transaction
  await prisma.$transaction(
    records.map((r) =>
      prisma.attendance.upsert({
        where: { sessionId_studentId: { sessionId, studentId: r.studentId } },
        update: { status: r.status, note: r.note?.trim() || null },
        create: {
          sessionId,
          studentId: r.studentId,
          status: r.status,
          note: r.note?.trim() || null,
        },
      }),
    ),
  );

  // Đánh dấu buổi đã hoàn thành
  if (classSession.status === "SCHEDULED") {
    await prisma.classSession.update({
      where: { id: sessionId },
      data: { status: "COMPLETED" },
    });
  }

  revalidatePath(`/staff/classes/${classSession.classId}/sessions/${sessionId}`);
  revalidatePath(`/staff/classes/${classSession.classId}`);
  return { success: true };
}

// ── Năng lực học sinh ─────────────────────────────────────────

export async function evaluateStudentLevelAction(data: {
  studentId: string;
  subjectId: string;
  level: StudentLevel;
  note?: string;
}) {
  const session = await requireSession();
  const hasPermission = await can(session.user, "student.evaluate");
  if (!hasPermission) return { error: "Không có quyền đánh giá năng lực" };

  await prisma.studentSubjectLevel.create({
    data: {
      studentId: data.studentId,
      subjectId: data.subjectId,
      level: data.level,
      evaluatedById: session.user.id,
      note: data.note?.trim() || null,
    },
  });

  revalidatePath(`/staff/students/${data.studentId}`);
  return { success: true };
}

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

// ── Thành viên lớp (CBDT) ─────────────────────────────────────

/** Thêm học sinh vào lớp (hoặc kích hoạt lại nếu DROPPED). */
export async function enrollStudentAction(classId: string, studentId: string) {
  const session = await requireSession();
  const hasPermission = await can(session.user, "class.update");
  if (!hasPermission) return { error: "Không có quyền thêm học sinh" };

  const cls = await prisma.class.findUnique({ where: { id: classId } });
  if (!cls) return { error: "Không tìm thấy lớp" };
  if (session.user.role === "STAFF" && cls.advisorId !== session.user.id)
    return { error: "Bạn không phải cố vấn của lớp này" };

  await prisma.classEnrollment.upsert({
    where: { classId_studentId: { classId, studentId } },
    update: { status: "ACTIVE" },
    create: { classId, studentId, status: "ACTIVE" },
  });

  // Thông báo cho học sinh
  await prisma.notification.create({
    data: {
      userId: studentId,
      title: "Bạn đã được thêm vào lớp học",
      message: `Bạn đã được thêm vào lớp "${cls.name}". Kiểm tra lịch học của bạn để biết thêm chi tiết.`,
      type: "CLASS_ASSIGNED",
      href: `/student/exams`,
    },
  });

  revalidatePath(`/staff/classes/${classId}`);
  return { success: true };
}

/** Thêm nhiều học sinh vào lớp cùng lúc. */
export async function enrollStudentsAction(classId: string, studentIds: string[]) {
  const session = await requireSession();
  const hasPermission = await can(session.user, "class.update");
  if (!hasPermission) return { error: "Không có quyền thêm học sinh" };
  if (studentIds.length === 0) return { error: "Chưa chọn học sinh nào" };

  const cls = await prisma.class.findUnique({ where: { id: classId } });
  if (!cls) return { error: "Không tìm thấy lớp" };
  if (session.user.role === "STAFF" && cls.advisorId !== session.user.id)
    return { error: "Bạn không phải cố vấn của lớp này" };

  await prisma.$transaction([
    ...studentIds.map((studentId) =>
      prisma.classEnrollment.upsert({
        where: { classId_studentId: { classId, studentId } },
        update: { status: "ACTIVE" },
        create: { classId, studentId, status: "ACTIVE" },
      }),
    ),
    prisma.notification.createMany({
      data: studentIds.map((studentId) => ({
        userId: studentId,
        title: "Bạn đã được thêm vào lớp học",
        message: `Bạn đã được thêm vào lớp "${cls.name}". Kiểm tra lịch học của bạn để biết thêm chi tiết.`,
        type: "CLASS_ASSIGNED" as const,
        href: `/student/exams`,
      })),
    }),
  ]);

  revalidatePath(`/staff/classes/${classId}`);
  revalidatePath(`/admin/classes/${classId}`);
  return { success: true };
}

/** Xóa học sinh khỏi lớp (đặt DROPPED). */
export async function dropStudentAction(classId: string, studentId: string) {
  const session = await requireSession();
  const hasPermission = await can(session.user, "class.update");
  if (!hasPermission) return { error: "Không có quyền xóa học sinh" };

  const cls = await prisma.class.findUnique({ where: { id: classId } });
  if (!cls) return { error: "Không tìm thấy lớp" };
  if (session.user.role === "STAFF" && cls.advisorId !== session.user.id)
    return { error: "Bạn không phải cố vấn của lớp này" };

  await prisma.classEnrollment.update({
    where: { classId_studentId: { classId, studentId } },
    data: { status: "DROPPED" },
  });

  revalidatePath(`/staff/classes/${classId}`);
  return { success: true };
}

/** Phân giáo viên vào lớp. */
export async function assignClassTeacherAction(classId: string, teacherId: string) {
  const session = await requireSession();
  const hasPermission = await can(session.user, "class.update");
  if (!hasPermission) return { error: "Không có quyền phân giáo viên" };

  const cls = await prisma.class.findUnique({ where: { id: classId } });
  if (!cls) return { error: "Không tìm thấy lớp" };
  if (session.user.role === "STAFF" && cls.advisorId !== session.user.id)
    return { error: "Bạn không phải cố vấn của lớp này" };

  await prisma.classTeacher.upsert({
    where: { classId_teacherId: { classId, teacherId } },
    update: {},
    create: { classId, teacherId },
  });

  revalidatePath(`/staff/classes/${classId}`);
  return { success: true };
}

/** Phân nhiều giáo viên vào lớp cùng lúc. */
export async function assignClassTeachersAction(classId: string, teacherIds: string[]) {
  const session = await requireSession();
  const hasPermission = await can(session.user, "class.update");
  if (!hasPermission) return { error: "Không có quyền phân giáo viên" };
  if (teacherIds.length === 0) return { error: "Chưa chọn giáo viên nào" };

  const cls = await prisma.class.findUnique({ where: { id: classId } });
  if (!cls) return { error: "Không tìm thấy lớp" };
  if (session.user.role === "STAFF" && cls.advisorId !== session.user.id)
    return { error: "Bạn không phải cố vấn của lớp này" };

  await prisma.$transaction(
    teacherIds.map((teacherId) =>
      prisma.classTeacher.upsert({
        where: { classId_teacherId: { classId, teacherId } },
        update: {},
        create: { classId, teacherId },
      }),
    ),
  );

  revalidatePath(`/staff/classes/${classId}`);
  revalidatePath(`/admin/classes/${classId}`);
  return { success: true };
}

/** Gỡ giáo viên khỏi lớp. */
export async function removeClassTeacherAction(classId: string, teacherId: string) {
  const session = await requireSession();
  const hasPermission = await can(session.user, "class.update");
  if (!hasPermission) return { error: "Không có quyền gỡ giáo viên" };

  const cls = await prisma.class.findUnique({ where: { id: classId } });
  if (!cls) return { error: "Không tìm thấy lớp" };
  if (session.user.role === "STAFF" && cls.advisorId !== session.user.id)
    return { error: "Bạn không phải cố vấn của lớp này" };

  await prisma.classTeacher.delete({
    where: { classId_teacherId: { classId, teacherId } },
  });

  revalidatePath(`/staff/classes/${classId}`);
  return { success: true };
}

// ── Phân học sinh cho CBDT (CBDTS thực hiện) ─────────────────

export async function assignStudentAdvisorAction(studentId: string, advisorId: string) {
  const session = await requireSession();
  const hasPermission = await can(session.user, "student.assign");
  if (!hasPermission) return { error: "Không có quyền phân học sinh" };

  await prisma.studentAdvisor.upsert({
    where: { studentId_advisorId: { studentId, advisorId } },
    update: { assignedById: session.user.id, assignedAt: new Date() },
    create: { studentId, advisorId, assignedById: session.user.id },
  });

  // Thông báo cho CBDT được phân
  await prisma.notification.create({
    data: {
      userId: advisorId,
      title: "Học sinh mới được phân cho bạn",
      message: "CBDTS vừa phân một học sinh mới để bạn quản lý và theo dõi.",
      type: "STUDENT_ASSIGNED",
      href: "/staff/students",
    },
  });

  revalidatePath("/staff/students/assign");
  revalidatePath(`/staff/students/${studentId}`);
  return { success: true };
}

export async function removeStudentAdvisorAction(studentId: string, advisorId: string) {
  const session = await requireSession();
  const hasPermission = await can(session.user, "student.assign");
  if (!hasPermission) return { error: "Không có quyền gỡ phân công" };

  await prisma.studentAdvisor.delete({
    where: { studentId_advisorId: { studentId, advisorId } },
  });

  revalidatePath("/staff/students/assign");
  revalidatePath(`/staff/students/${studentId}`);
  return { success: true };
}

/**
 * Server action để fetch gợi ý học sinh cho form tạo lớp.
 * Không cần permission đặc biệt — chỉ cần là STAFF.
 */
export async function getSuggestedStudentsAction(subjectId: string, targetLevel: string) {
  await requireSession();
  if (!subjectId || !targetLevel) return { students: [] };

  // Step 1: find students with matching subject level (de-dup by studentId)
  const levels = await prisma.studentSubjectLevel.findMany({
    where: { subjectId, level: targetLevel as never },
    select: { studentId: true, level: true },
    orderBy: { evaluatedAt: "desc" },
  });

  const seen = new Set<string>();
  const studentIds: string[] = [];
  const levelMap = new Map<string, string>();
  for (const l of levels) {
    if (!seen.has(l.studentId)) {
      seen.add(l.studentId);
      studentIds.push(l.studentId);
      levelMap.set(l.studentId, l.level);
    }
  }

  if (studentIds.length === 0) return { students: [] };

  // Step 2: load user details + count active class enrollments
  const users = await prisma.user.findMany({
    where: { id: { in: studentIds } },
    select: {
      id: true,
      name: true,
      email: true,
      _count: {
        select: {
          classEnrollments: { where: { class: { status: { in: ["RECRUITING", "ONGOING"] } } } },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  const students = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    level: levelMap.get(u.id) ?? targetLevel,
    activeClassCount: u._count.classEnrollments,
  }));

  return { students };
}

// ── Lazy-load cho trang phân công CBDT ───────────────────────

const PAGE_SIZE = 10;

/**
 * Lấy danh sách học sinh đã được phân cho một CBDT.
 * Dùng khi mở rộng card CBDT trên trang /staff/students/assign.
 */
export async function getAdvisorStudentsAction(advisorId: string): Promise<{
  students: { id: string; name: string | null; email: string | null; assignedAt: Date }[];
  error?: string;
}> {
  const session = await requireSession();
  const hasPermission = await can(session.user, "student.assign");
  if (!hasPermission) return { students: [], error: "Không có quyền" };

  const rows = await prisma.studentAdvisor.findMany({
    where: { advisorId },
    include: { student: { select: { id: true, name: true, email: true } } },
    orderBy: { assignedAt: "desc" },
  });

  return {
    students: rows.map((r) => ({
      id: r.student.id,
      name: r.student.name,
      email: r.student.email,
      assignedAt: r.assignedAt,
    })),
  };
}

/**
 * Tìm học sinh chưa được phân cho advisor này.
 * Hỗ trợ phân trang và tìm kiếm theo tên/email.
 */
export async function searchAssignableStudentsAction(
  advisorId: string,
  query: string,
  page: number
): Promise<{
  students: { id: string; name: string | null; email: string | null }[];
  total: number;
  hasMore: boolean;
  error?: string;
}> {
  const session = await requireSession();
  const hasPermission = await can(session.user, "student.assign");
  if (!hasPermission) return { students: [], total: 0, hasMore: false, error: "Không có quyền" };

  // IDs đã được phân cho advisor này
  const assigned = await prisma.studentAdvisor.findMany({
    where: { advisorId },
    select: { studentId: true },
  });
  const assignedIds = assigned.map((a) => a.studentId);

  const q = query.trim();
  const where = {
    role: "STUDENT" as const,
    id: { notIn: assignedIds },
    ...(q && {
      OR: [
        { name: { contains: q, mode: "insensitive" as const } },
        { email: { contains: q, mode: "insensitive" as const } },
      ],
    }),
  };

  const [total, students] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
    }),
  ]);

  return {
    students,
    total,
    hasMore: page * PAGE_SIZE < total,
  };
}
