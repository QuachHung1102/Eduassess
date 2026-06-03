"use server";

import type { TimeSlot as PrismaTimeSlot } from "@prisma/client";
import { auth } from "@/auth";
import { normalizeAvailabilitySlots } from "@/lib/availability/time-slots";
import { prisma } from "@/lib/db/prisma";
import { can } from "@/lib/auth/permissions";
import { revalidatePath } from "next/cache";
import type { ClassMode, ClassStatus, SessionStatus, AttendanceStatus, StudentLevel, DayOfWeek, TimeSlot, AvailabilityMode } from "@/lib/types";

// ── Guard ──────────────────────────────────────────────────────
async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Chưa đăng nhập");
  return session;
}

// ── Class CRUD ─────────────────────────────────────────────────

export async function createClassAction(data: {
  name: string;
  subjectId: string;
  mode: ClassMode;
  targetLevel: StudentLevel;
  sessionCount: number;
  note?: string;
}) {
  const session = await requireSession();
  const hasPermission = await can(session.user, "class.create");
  if (!hasPermission) return { error: "Không có quyền tạo lớp" };
  if (!data.name.trim()) return { error: "Thiếu tên lớp" };
  if (!data.subjectId) return { error: "Thiếu môn học" };

  const cls = await prisma.class.create({
    data: {
      name: data.name.trim(),
      subjectId: data.subjectId,
      advisorId: session.user.id,
      createdById: session.user.id,
      mode: data.mode,
      targetLevel: data.targetLevel,
      sessionCount: data.sessionCount,
      note: data.note?.trim() || null,
      status: "DRAFT",
    },
  });

  revalidatePath("/staff/classes");
  return { success: true, classId: cls.id };
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

  const normalizedSlots = normalizeAvailabilitySlots(slots);

  await prisma.$transaction(async (tx) => {
    await tx.studentAvailability.deleteMany({ where: { studentId } });

    if (normalizedSlots.length === 0) {
      return;
    }

    await tx.studentAvailability.createMany({
      data: normalizedSlots.map((slot) => ({
        studentId,
        dayOfWeek: slot.dayOfWeek,
        slot: slot.slot as PrismaTimeSlot,
        availabilityMode: slot.availabilityMode,
      })),
      skipDuplicates: true,
    });
  });

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
