"use server";

import { auth } from "@/auth";
import { saveAvailability } from "@/lib/availability/store";
import { prisma } from "@/lib/db/prisma";
import { can } from "@/lib/auth/permissions";
import { getRoomUsageForDate, canEvaluateStudent, type RoomUsageForDate } from "@/lib/classes/queries";
import { suggestProficiencyLevel, type LevelSuggestion } from "@/lib/ai";
import { canTakeAttendance } from "@/lib/classes/session-status";
import {
  generateSessionPlan,
  weeklyPatternToCells,
  suggestMakeupDate,
  weeklySlotKey,
  type WeeklySlotInput,
} from "@/lib/classes/scheduling";
import {
  getEligibleTeachersForSchedule,
  getEligibleRoomsBySlot,
  getEligibleStudentsForSchedule,
  getTeacherAvailableCells,
  type EligibleTeacher,
  type EligibleStudent,
  type SlotEligibleRooms,
} from "@/lib/classes/eligibility";
import {
  findRoomConflict,
  isOverlapViolation,
  occupyForSessions,
  sessionOccupancyRange,
  syncSessionOccupancy,
} from "@/lib/rooms/store";
import { ymdToDbDate, dbDateToYmd } from "@/lib/date";
import { revalidatePath } from "next/cache";
import type { ClassMode, ClassStatus, SessionStatus, AttendanceStatus, StudentLevel, DayOfWeek, TimeSlot, AvailabilityMode } from "@/lib/types";

// ── Guard ──────────────────────────────────────────────────────
async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Chưa đăng nhập");
  return session;
}

// EXCLUDE constraint trên room_occupancies từ chối hai block giao nhau —
// thông báo khi thua cuộc đua ghi đồng thời với một CBĐT/NVLT khác.
const OVERLAP_RACE_ERROR =
  "Phòng vừa bị lịch khác chiếm trong lúc bạn thao tác. Tải lại trang để xem lịch mới nhất.";

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
  /** Mỗi khung tuần mang phòng riêng (roomId bắt buộc nếu OFFLINE). */
  weeklySlots: (WeeklySlotInput & { roomId?: string })[];
  sessionCount: number;
  teacherId: string;
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

  // Phòng theo từng khung tuần (OFFLINE bắt buộc đủ phòng cho mọi khung).
  const roomBySlot = new Map<string, string>();
  if (needsRoom) {
    for (const s of data.weeklySlots) {
      if (!s.roomId) return { error: "Mỗi khung lịch của lớp offline cần chọn phòng" };
      roomBySlot.set(weeklySlotKey(s.dayOfWeek, s.startTime, s.endTime), s.roomId);
    }
  }

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
    // Mỗi buổi: phòng của khung tương ứng phải còn trống (room_occupancies).
    for (const p of plan) {
      const roomId = roomBySlot.get(weeklySlotKey(p.dayOfWeek, p.startTime, p.endTime))!;
      const conflict = await findRoomConflict({
        roomId,
        ...sessionOccupancyRange({ date: p.date, startTime: p.startTime, endTime: p.endTime }),
      });
      if (conflict)
        return {
          error: `Phòng cho khung ${p.dayOfWeek} ${p.startTime}–${p.endTime} đã bị chiếm vào ${p.date} (${conflict.source === "CLASS_SESSION" ? "buổi học khác" : "đặt phòng"}).`,
        };
    }
    // Sức chứa phòng phải đủ cho số học sinh được chọn.
    if (data.studentIds.length > 0) {
      const chosenRooms = await prisma.room.findMany({
        where: { id: { in: [...new Set(roomBySlot.values())] } },
        select: { name: true, capacity: true },
      });
      const tooSmall = chosenRooms.find((r) => r.capacity < data.studentIds.length);
      if (tooSmall)
        return {
          error: `Phòng ${tooSmall.name} (sức chứa ${tooSmall.capacity}) không đủ cho ${data.studentIds.length} học sinh.`,
        };
    }
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

  let classId: string;
  try {
    classId = await prisma.$transaction(async (tx) => {
    const cls = await tx.class.create({
      data: {
        name: data.name.trim(),
        subjectId: data.subjectId,
        advisorId: session.user.id,
        createdById: session.user.id,
        mode: data.mode,
        targetLevel: data.targetLevel,
        sessionCount: plan.length,
        startDate: ymdToDbDate(data.startDate),
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
        roomId: needsRoom
          ? roomBySlot.get(weeklySlotKey(s.dayOfWeek, s.startTime, s.endTime)) ?? null
          : null,
      })),
    });

    await tx.classTeacher.create({
      data: { classId: cls.id, teacherId: data.teacherId },
    });

    await tx.classSession.createMany({
      data: plan.map((p) => ({
        classId: cls.id,
        sessionNumber: p.sessionNumber,
        date: ymdToDbDate(p.date),
        startTime: p.startTime,
        endTime: p.endTime,
        mode: data.mode,
        roomId: needsRoom
          ? roomBySlot.get(weeklySlotKey(p.dayOfWeek, p.startTime, p.endTime)) ?? null
          : null,
        teacherId: data.teacherId,
        status: "SCHEDULED" as const,
      })),
    });

    // RoomSchedule (ADR-0001): chiếm block cho các buổi có phòng (ONLINE → bỏ qua).
    const createdSessions = await tx.classSession.findMany({
      where: { classId: cls.id },
      select: { id: true, roomId: true, date: true, startTime: true, endTime: true },
    });
    await occupyForSessions(createdSessions, tx);

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
          href: `/student/classes`,
        })),
      });
    }

    return cls.id;
    });
  } catch (err) {
    if (isOverlapViolation(err)) return { error: OVERLAP_RACE_ERROR };
    throw err;
  }

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
      roomsBySlot: SlotEligibleRooms[];
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

  const [teachers, students, roomsBySlot] = await Promise.all([
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
      ? Promise.resolve([] as SlotEligibleRooms[])
      : getEligibleRoomsBySlot({ slots: input.weeklySlots, plannedSessions: plan }),
  ]);

  return { teachers, roomsBySlot, students, plannedCount: plan.length };
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

  const dateObj = ymdToDbDate(data.date);
  const conflict = await checkSessionConflict({
    date: dateObj,
    startTime: data.startTime,
    endTime: data.endTime,
    teacherId: data.teacherId,
    roomId: data.roomId || null,
  });
  if (conflict) return { error: conflict };

  try {
    await prisma.$transaction(async (tx) => {
      const created = await tx.classSession.create({
        data: {
          classId,
          sessionNumber: data.sessionNumber,
          date: dateObj,
          startTime: data.startTime,
          endTime: data.endTime,
          mode: data.mode,
          roomId: data.roomId || null,
          teacherId: data.teacherId,
          note: data.note?.trim() || null,
          status: "SCHEDULED",
        },
      });
      await syncSessionOccupancy(created, tx);
    });
  } catch (err) {
    if (isOverlapViolation(err)) return { error: OVERLAP_RACE_ERROR };
    throw err;
  }

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

/**
 * Kiểm tra GV/phòng có bị trùng giờ. GV check trên ClassSession; phòng check
 * trên bảng room_occupancies (hợp nhất buổi học + đặt phòng đã duyệt — ADR-0001).
 * Trả về thông báo lỗi nếu trùng, null nếu khả thi.
 */
async function checkSessionConflict(opts: {
  date: Date;
  startTime: string;
  endTime: string;
  teacherId: string;
  roomId: string | null;
  excludeSessionId?: string;
}): Promise<string | null> {
  const { date, startTime, endTime, teacherId, roomId, excludeSessionId } = opts;

  const teacherBusy = await prisma.classSession.findFirst({
    where: {
      teacherId,
      date,
      status: { in: ["SCHEDULED", "COMPLETED"] },
      ...(excludeSessionId ? { id: { not: excludeSessionId } } : {}),
      AND: [{ startTime: { lt: endTime } }, { endTime: { gt: startTime } }],
    },
  });
  if (teacherBusy) return "Giáo viên đã có buổi khác trùng giờ ngày này";

  if (!roomId) return null;

  const conflict = await findRoomConflict({
    roomId,
    ...sessionOccupancyRange({ date, startTime, endTime }),
    excludeSessionId,
  });
  if (conflict)
    return conflict.source === "CLASS_SESSION"
      ? "Phòng đã có buổi khác trùng giờ ngày này"
      : "Phòng đã có lịch đặt trùng giờ ngày này";

  return null;
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
    // Khôi phục buổi: block phòng đã bị nhả khi hủy — re-check phòng/GV còn trống.
    const conflict = await checkSessionConflict({
      date: sess.date,
      startTime: sess.startTime,
      endTime: sess.endTime,
      teacherId: sess.teacherId,
      roomId: sess.roomId,
      excludeSessionId: sessionId,
    });
    if (conflict) return { error: `Không thể khôi phục buổi học: ${conflict}` };

    try {
      await prisma.$transaction(async (tx) => {
        const updated = await tx.classSession.update({
          where: { id: sessionId },
          data: { status: "SCHEDULED" },
        });
        await syncSessionOccupancy(updated, tx);
      });
    } catch (err) {
      if (isOverlapViolation(err)) return { error: OVERLAP_RACE_ERROR };
      throw err;
    }
    revalidatePath(`/staff/classes/${sess.classId}`);
    return { success: true };
  }

  if (!input.reason?.trim()) return { error: "Cần nhập lý do nghỉ" };
  await prisma.$transaction(async (tx) => {
    const updated = await tx.classSession.update({
      where: { id: sessionId },
      data: { status: "CANCELLED", note: input.reason!.trim() },
    });
    await syncSessionOccupancy(updated, tx);
  });

  // Thông báo cho học sinh đang học + giáo viên dạy buổi này.
  const dateLabel = new Date(`${dbDateToYmd(sess.date)}T00:00:00`).toLocaleDateString("vi-VN", {
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
      href: `/student/classes`,
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
  const allDates = sess.class.sessions.map((s) => dbDateToYmd(s.date));
  const lastDate = [...allDates].sort().at(-1) ?? dbDateToYmd(sess.date);
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

  const dateObj = ymdToDbDate(input.date);

  const conflict = await checkSessionConflict({
    date: dateObj,
    startTime: input.startTime,
    endTime: input.endTime,
    teacherId: sess.teacherId,
    roomId: sess.roomId,
  });
  if (conflict) return { error: conflict };

  const max = await prisma.classSession.aggregate({
    where: { classId: sess.classId },
    _max: { sessionNumber: true },
  });
  const nextNumber = (max._max.sessionNumber ?? 0) + 1;

  // Buổi bù KHÔNG tăng sessionCount: con số mục tiêu giữ nguyên số buổi của
  // giáo trình; buổi bù chỉ thay thế buổi đã nghỉ, không phải buổi mới.
  try {
    await prisma.$transaction(async (tx) => {
      const created = await tx.classSession.create({
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
      await syncSessionOccupancy(created, tx);
    });
  } catch (err) {
    if (isOverlapViolation(err)) return { error: OVERLAP_RACE_ERROR };
    throw err;
  }

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
      href: `/student/classes`,
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

  // Re-check trùng GV/phòng nếu thay đổi lịch (hoặc buổi quay lại trạng thái
  // chiếm phòng từ CANCELLED/POSTPONED) và buổi vẫn còn diễn ra.
  const finalDate = data.date ? ymdToDbDate(data.date) : sess.date;
  const finalStartTime = data.startTime ?? sess.startTime;
  const finalEndTime = data.endTime ?? sess.endTime;
  const finalTeacherId = data.teacherId ?? sess.teacherId;
  const finalRoomId = "roomId" in data ? data.roomId ?? null : sess.roomId;
  const finalStatus = data.status ?? sess.status;
  const scheduleFieldsChanged =
    !!data.date || !!data.startTime || !!data.endTime || !!data.teacherId || "roomId" in data;
  const wasOccupying = sess.status === "SCHEDULED" || sess.status === "COMPLETED";
  const willOccupy = finalStatus === "SCHEDULED" || finalStatus === "COMPLETED";
  if (willOccupy && (scheduleFieldsChanged || !wasOccupying)) {
    const conflict = await checkSessionConflict({
      date: finalDate,
      startTime: finalStartTime,
      endTime: finalEndTime,
      teacherId: finalTeacherId,
      roomId: finalRoomId,
      excludeSessionId: sessionId,
    });
    if (conflict) return { error: conflict };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const updated = await tx.classSession.update({
        where: { id: sessionId },
        data: {
          ...(data.date ? { date: finalDate } : {}),
          ...(data.startTime ? { startTime: data.startTime } : {}),
          ...(data.endTime ? { endTime: data.endTime } : {}),
          ...(data.mode ? { mode: data.mode } : {}),
          ...("roomId" in data ? { roomId: data.roomId } : {}),
          ...(data.teacherId ? { teacherId: data.teacherId } : {}),
          ...(data.status ? { status: data.status } : {}),
          ...(data.note !== undefined ? { note: data.note?.trim() || null } : {}),
        },
      });
      await syncSessionOccupancy(updated, tx);
    });
  } catch (err) {
    if (isOverlapViolation(err)) return { error: OVERLAP_RACE_ERROR };
    throw err;
  }

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
          href: `/student/classes`,
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

  // Gate theo thời gian (defense-in-depth, đồng bộ với UI): không cho điểm danh
  // buổi chưa bắt đầu hoặc đã nghỉ/hoãn. Tránh lật buổi tương lai thành COMPLETED.
  if (!canTakeAttendance(classSession, new Date())) {
    return { error: "Buổi học chưa bắt đầu nên chưa thể điểm danh." };
  }

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
  // CBĐT chỉ đánh giá học sinh được phân công cho mình.
  if (!(await canEvaluateStudent(session.user, data.studentId)))
    return { error: "Bạn chỉ được đánh giá học sinh được phân công cho mình" };

  // Ghi mức + AuditLog trong cùng transaction (hành động nhạy cảm — §2.3).
  await prisma.$transaction([
    prisma.studentSubjectLevel.create({
      data: {
        studentId: data.studentId,
        subjectId: data.subjectId,
        level: data.level,
        evaluatedById: session.user.id,
        note: data.note?.trim() || null,
      },
    }),
    prisma.auditLog.create({
      data: {
        actorId: session.user.id,
        action: "student.evaluate",
        entityType: "StudentSubjectLevel",
        entityId: data.studentId,
        payload: { subjectId: data.subjectId, level: data.level, note: data.note?.trim() || null },
      },
    }),
  ]);

  revalidatePath(`/staff/students/${data.studentId}`);
  return { success: true };
}

/**
 * Lưu đánh giá của GV cho các HS sau một buổi học (3 chiều 1–5 + ghi chú).
 * Mỗi record: ô để trống hoàn toàn ⇒ xóa đánh giá cũ; có ít nhất 1 giá trị ⇒ upsert.
 */
export async function saveSessionEvaluationsAction(
  sessionId: string,
  records: {
    studentId: string;
    performance: number | null;
    diligence: number | null;
    comprehension: number | null;
    note?: string;
  }[],
): Promise<{ error: string } | { success: true }> {
  const session = await requireSession();
  if (!(await can(session.user, "class.evaluate_session")))
    return { error: "Không có quyền đánh giá buổi học" };

  const sess = await prisma.classSession.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      classId: true,
      teacherId: true,
      class: { select: { advisorId: true, teachers: { select: { teacherId: true } } } },
    },
  });
  if (!sess) return { error: "Không tìm thấy buổi học" };

  // Chỉ người dạy buổi/GV của lớp/CBĐT phụ trách (hoặc OWNER/ADMIN/CBDTS) được đánh giá.
  const u = session.user;
  const privileged =
    u.role === "OWNER" || u.role === "ADMIN" || (u.role === "STAFF" && u.staffPosition === "CBDTS");
  const involved =
    sess.teacherId === u.id ||
    sess.class.advisorId === u.id ||
    sess.class.teachers.some((t) => t.teacherId === u.id);
  if (!privileged && !involved) return { error: "Bạn không phụ trách lớp này" };

  const clamp = (n: number | null) =>
    n === null ? null : Math.min(5, Math.max(1, Math.round(n)));

  await prisma.$transaction(
    records.map((r) => {
      const performance = clamp(r.performance);
      const diligence = clamp(r.diligence);
      const comprehension = clamp(r.comprehension);
      const note = r.note?.trim() || null;
      const empty = !performance && !diligence && !comprehension && !note;

      if (empty) {
        return prisma.sessionEvaluation.deleteMany({
          where: { sessionId, studentId: r.studentId },
        });
      }
      return prisma.sessionEvaluation.upsert({
        where: { sessionId_studentId: { sessionId, studentId: r.studentId } },
        update: { performance, diligence, comprehension, note, evaluatedById: session.user.id },
        create: {
          sessionId,
          studentId: r.studentId,
          performance,
          diligence,
          comprehension,
          note,
          evaluatedById: session.user.id,
        },
      });
    }),
  );

  revalidatePath(`/staff/classes/${sess.classId}/sessions/${sessionId}`);
  revalidatePath(`/teacher/classes/${sess.classId}/sessions/${sessionId}`);
  return { success: true };
}

export type StudentSubjectReference = {
  avgScore: number | null;
  attempts: { title: string; score: number | null; submittedAt: string }[];
  attendance: { present: number; total: number };
  /** Trung bình đánh giá-buổi của GV trên môn này (mỗi chiều 1–5; null nếu chưa có). */
  sessionEval: {
    performance: number | null;
    diligence: number | null;
    comprehension: number | null;
    count: number;
  };
  /** Mức đề xuất tự động (CBĐT xác nhận mới ghi); null nếu chưa đủ dữ liệu. */
  suggestedLevel: StudentLevel | null;
  suggestedReason: string | null;
};

/**
 * Dữ liệu tham chiếu giúp CBĐT đánh giá năng lực một HS trên một môn:
 * điểm các bài kiểm tra đã nộp (cùng môn) + tỉ lệ điểm danh các lớp môn đó.
 * Chỉ đọc — không thay StudentSubjectLevel; CBĐT vẫn tự quyết mức.
 */
export async function getStudentSubjectReferenceAction(
  studentId: string,
  subjectId: string,
): Promise<{ error: string } | StudentSubjectReference> {
  const session = await requireSession();
  if (!(await can(session.user, "student.evaluate"))) return { error: "Không có quyền" };
  if (!studentId || !subjectId) return { error: "Thiếu thông tin" };
  if (!(await canEvaluateStudent(session.user, studentId)))
    return { error: "Bạn chỉ được xem học sinh được phân công cho mình" };

  const [attempts, attendances, evals] = await Promise.all([
    prisma.examAttempt.findMany({
      where: { studentId, submittedAt: { not: null }, exam: { subjectId } },
      select: { score: true, submittedAt: true, exam: { select: { title: true } } },
      orderBy: { submittedAt: "desc" },
      take: 8,
    }),
    prisma.attendance.findMany({
      where: { studentId, session: { class: { subjectId } } },
      select: { status: true },
    }),
    prisma.sessionEvaluation.findMany({
      where: { studentId, session: { class: { subjectId } } },
      select: { performance: true, diligence: true, comprehension: true },
    }),
  ]);

  const scored = attempts.map((a) => a.score).filter((s): s is number => s !== null);
  const avgScore = scored.length ? scored.reduce((a, b) => a + b, 0) / scored.length : null;
  const present = attendances.filter((a) => a.status === "PRESENT" || a.status === "LATE").length;

  const avgOf = (vals: (number | null)[]) => {
    const xs = vals.filter((v): v is number => v !== null);
    return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
  };

  const sePerformance = avgOf(evals.map((e) => e.performance));
  const seDiligence = avgOf(evals.map((e) => e.diligence));
  const seComprehension = avgOf(evals.map((e) => e.comprehension));

  // ── Đề xuất mức (bán tự động): ưu tiên điểm Exam (ngưỡng tài liệu),
  // không có thì suy từ trung bình đánh giá-buổi (thang 5). CBĐT vẫn chốt.
  let suggestedLevel: StudentLevel | null = null;
  let suggestedReason: string | null = null;
  if (avgScore !== null) {
    suggestedLevel =
      avgScore < 50 ? "WEAK" : avgScore < 80 ? "AVERAGE" : avgScore < 90 ? "GOOD" : "EXCELLENT";
    suggestedReason = `điểm TB ${avgScore.toFixed(1)}`;
  } else {
    const seAvg = avgOf([sePerformance, seDiligence, seComprehension]);
    if (seAvg !== null) {
      suggestedLevel =
        seAvg < 2.5 ? "WEAK" : seAvg < 4 ? "AVERAGE" : seAvg < 4.5 ? "GOOD" : "EXCELLENT";
      suggestedReason = `đánh giá buổi ${seAvg.toFixed(1)}/5`;
    }
  }

  return {
    avgScore,
    attempts: attempts.slice(0, 5).map((a) => ({
      title: a.exam.title,
      score: a.score,
      submittedAt: a.submittedAt!.toISOString(),
    })),
    attendance: { present, total: attendances.length },
    sessionEval: {
      performance: sePerformance,
      diligence: seDiligence,
      comprehension: seComprehension,
      count: evals.length,
    },
    suggestedLevel,
    suggestedReason,
  };
}

/**
 * Đề xuất mức năng lực bằng AI (tổng hợp điểm Exam + điểm danh + đánh giá-buổi).
 * On-demand: chỉ chạy khi CBĐT bấm nút — kiểm soát chi phí. CBĐT vẫn tự chốt.
 */
export async function getAiLevelSuggestionAction(
  studentId: string,
  subjectId: string,
): Promise<{ error: string } | LevelSuggestion> {
  const ref = await getStudentSubjectReferenceAction(studentId, subjectId);
  if ("error" in ref) return ref; // đã kiểm quyền + canEvaluateStudent bên trong

  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
    select: { name: true },
  });
  if (!subject) return { error: "Không tìm thấy môn học" };

  const hasData =
    ref.avgScore !== null || ref.attendance.total > 0 || ref.sessionEval.count > 0;
  if (!hasData)
    return { error: "Chưa có dữ liệu (điểm/điểm danh/đánh giá buổi) để AI phân tích." };

  try {
    return await suggestProficiencyLevel({
      subject: subject.name,
      avgScore: ref.avgScore,
      examScores: ref.attempts
        .map((a) => a.score)
        .filter((s): s is number => s !== null),
      attendance: ref.attendance,
      sessionEval: ref.sessionEval,
    });
  } catch {
    return { error: "AI không phản hồi được lúc này. Vui lòng thử lại." };
  }
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
      href: `/student/classes`,
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
        href: `/student/classes`,
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
