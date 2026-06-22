"use server";

import { requireSession } from "@/lib/classes/actions/_shared";
import { prisma } from "@/lib/db/prisma";
import { can } from "@/lib/auth/permissions";
import { getRoomUsageForDate, type RoomUsageForDate } from "@/lib/classes/queries";
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
import { canAdministerClass, canOperateClassSession } from "@/lib/classes/access";
import { revalidatePath } from "next/cache";
import type { ClassMode, ClassStatus, SessionStatus, AttendanceStatus, StudentLevel } from "@/lib/types";

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

    // Ghi AuditLog (tạo lớp) trong CÙNG transaction — hành động nhạy cảm.
    await tx.auditLog.create({
      data: {
        actorId: session.user.id,
        action: "class.create",
        entityType: "Class",
        entityId: cls.id,
        payload: {
          name: cls.name,
          subjectId: data.subjectId,
          mode: data.mode,
          targetLevel: data.targetLevel,
          sessionCount: plan.length,
          teacherId: data.teacherId,
          studentCount: data.studentIds.length,
        },
      },
    });

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
  if (!canAdministerClass(session.user, cls))
    return { error: "Bạn không phải cố vấn của lớp này" };

  const cancelling = data.status === "CANCELLED" && cls.status !== "CANCELLED";

  await prisma.$transaction(async (tx) => {
    await tx.class.update({
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

    // Hủy lớp → hủy mọi buổi CHƯA diễn ra (SCHEDULED/POSTPONED) và nhả phòng đã
    // chiếm; giữ buổi đã COMPLETED làm lịch sử.
    if (cancelling) {
      const pending = await tx.classSession.findMany({
        where: { classId, status: { in: ["SCHEDULED", "POSTPONED"] } },
        select: { id: true },
      });
      for (const p of pending) {
        const updated = await tx.classSession.update({
          where: { id: p.id },
          data: { status: "CANCELLED" },
        });
        await syncSessionOccupancy(updated, tx);
      }
    }
  });

  // Thông báo học sinh đang học khi lớp bị hủy.
  if (cancelling) {
    const enrollments = await prisma.classEnrollment.findMany({
      where: { classId, status: "ACTIVE" },
      select: { studentId: true },
    });
    if (enrollments.length > 0) {
      await prisma.notification.createMany({
        data: enrollments.map((e) => ({
          userId: e.studentId,
          title: "Lớp học đã bị hủy",
          message: `Lớp "${cls.name}" đã bị hủy. Các buổi học chưa diễn ra đã được hủy theo.`,
          type: "SCHEDULE_CHANGED" as const,
          href: `/student/classes`,
        })),
        skipDuplicates: true,
      });
    }
  }

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

  const cls = await prisma.class.findUnique({
    where: { id: classId },
    select: { advisorId: true },
  });
  if (!cls) return { error: "Không tìm thấy lớp" };
  if (!canAdministerClass(session.user, cls))
    return { error: "Bạn không phải cố vấn của lớp này" };

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
  if (!canAdministerClass(session.user, sess.class))
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
  if (!canAdministerClass(session.user, sess.class))
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
      class: { select: { name: true, advisorId: true } },
    },
  });
  if (!sess) return { error: "Không tìm thấy buổi học" };
  if (!canAdministerClass(session.user, sess.class))
    return { error: "Bạn không phải cố vấn của lớp này" };

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
    include: {
      class: { select: { advisorId: true, teachers: { select: { teacherId: true } } } },
    },
  });
  if (!classSession) return { error: "Không tìm thấy buổi học" };
  if (
    !canOperateClassSession(session.user, {
      advisorId: classSession.class.advisorId,
      teacherIds: classSession.class.teachers.map((t) => t.teacherId),
      sessionTeacherId: classSession.teacherId,
    })
  )
    return { error: "Bạn không phụ trách lớp này" };

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

