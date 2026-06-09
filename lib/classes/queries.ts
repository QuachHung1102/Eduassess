import { prisma } from "@/lib/db/prisma";
import { auth } from "@/auth";

// ── Lớp học ──────────────────────────────────────────────────

/**
 * Danh sách lớp mà user là advisor (CBDT) hoặc GV phụ trách.
 * ADMIN / OWNER gọi getAdminClasses() ở lib/admin/queries.ts thay.
 */
export async function getMyClasses() {
  const session = await auth();
  if (!session?.user?.id) return [];
  const userId = session.user.id;
  const role = session.user.role;

  if (role === "TEACHER") {
    return prisma.class.findMany({
      where: { teachers: { some: { teacherId: userId } } },
      include: {
        subject: true,
        advisor: { select: { id: true, name: true } },
        _count: { select: { enrollments: true, sessions: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  // STAFF (CBDT) — lớp mà họ là advisor
  return prisma.class.findMany({
    where: { advisorId: userId },
    include: {
      subject: true,
      advisor: { select: { id: true, name: true } },
      _count: { select: { enrollments: true, sessions: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

/** Chi tiết một lớp — sessions, enrollments, teachers. */
export async function getClassDetail(classId: string) {
  return prisma.class.findUnique({
    where: { id: classId },
    include: {
      subject: true,
      advisor: { select: { id: true, name: true, email: true } },
      createdBy: { select: { id: true, name: true } },
      teachers: {
        include: { teacher: { select: { id: true, name: true, email: true } } },
        orderBy: { assignedAt: "asc" },
      },
      enrollments: {
        where: { status: "ACTIVE" },
        include: { student: { select: { id: true, name: true, email: true, sex: true } } },
        orderBy: { joinedAt: "asc" },
      },
      sessions: {
        include: {
          teacher: { select: { id: true, name: true } },
          room: { select: { id: true, name: true } },
          _count: { select: { attendances: true } },
        },
        orderBy: [{ date: "asc" }, { startTime: "asc" }],
      },
      weeklySlots: {
        select: { dayOfWeek: true, startTime: true, endTime: true },
        orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
      },
      _count: { select: { enrollments: true, sessions: true, exams: true } },
    },
  });
}

/** Danh sách buổi học đầy đủ cho lớp. */
export async function getClassSessions(classId: string) {
  return prisma.classSession.findMany({
    where: { classId },
    include: {
      teacher: { select: { id: true, name: true } },
      room: { select: { id: true, name: true } },
      _count: { select: { attendances: true } },
    },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });
}

/** Chi tiết buổi học kèm điểm danh từng học sinh. */
export async function getSessionWithAttendance(sessionId: string) {
  const session = await prisma.classSession.findUnique({
    where: { id: sessionId },
    include: {
      class: {
        include: {
          subject: true,
          enrollments: {
            where: { status: "ACTIVE" },
            include: { student: { select: { id: true, name: true, email: true, sex: true } } },
            orderBy: { joinedAt: "asc" },
          },
        },
      },
      teacher: { select: { id: true, name: true } },
      room: { select: { id: true, name: true } },
      attendances: {
        include: { student: { select: { id: true, name: true } } },
      },
    },
  });
  return session;
}

// ── Học sinh được phân cho CBDT ───────────────────────────────

/** Danh sách học sinh được phân cho advisor hiện tại. */
export async function getMyStudents() {
  const session = await auth();
  if (!session?.user?.id) return [];

  const advisorLinks = await prisma.studentAdvisor.findMany({
    where: { advisorId: session.user.id },
    include: {
      student: {
        select: {
          id: true,
          name: true,
          email: true,
          sex: true,
          phoneNumber: true,
          dateOfBirth: true,
          classEnrollments: {
            where: { status: "ACTIVE" },
            include: { class: { include: { subject: true } } },
          },
        },
      },
    },
    orderBy: { assignedAt: "desc" },
  });

  // Lấy level mới nhất cho từng HS-môn
  const studentIds = advisorLinks.map((l) => l.studentId);
  const levels = await prisma.studentSubjectLevel.findMany({
    where: { studentId: { in: studentIds } },
    include: { subject: true },
    orderBy: { evaluatedAt: "desc" },
  });

  // Map latest level per studentId-subjectId
  const latestLevelMap = new Map<string, typeof levels[0]>();
  for (const lv of levels) {
    const key = `${lv.studentId}:${lv.subjectId}`;
    if (!latestLevelMap.has(key)) latestLevelMap.set(key, lv);
  }

  return advisorLinks.map((link) => ({
    ...link,
    latestLevels: [...latestLevelMap.values()].filter(
      (lv) => lv.studentId === link.studentId,
    ),
  }));
}

/** Chi tiết học sinh: lịch rảnh + lịch sử năng lực + lớp đang học. */
export async function getStudentDetail(studentId: string) {
  const [student, availability, levelHistory, advisorLinks] = await Promise.all([
    prisma.user.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        name: true,
        email: true,
        sex: true,
        phoneNumber: true,
        dateOfBirth: true,
        address: true,
        classEnrollments: {
          where: { status: "ACTIVE" },
          include: {
            class: {
              include: {
                subject: true,
                advisor: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    }),
    prisma.studentAvailability.findMany({
      where: { studentId },
      orderBy: [{ dayOfWeek: "asc" }, { slot: "asc" }],
    }),
    prisma.studentSubjectLevel.findMany({
      where: { studentId },
      include: {
        subject: true,
        evaluatedBy: { select: { id: true, name: true } },
      },
      orderBy: { evaluatedAt: "desc" },
    }),
    prisma.studentAdvisor.findMany({
      where: { studentId },
      include: {
        advisor: { select: { id: true, name: true } },
        assignedBy: { select: { id: true, name: true } },
      },
    }),
  ]);

  return { student, availability, levelHistory, advisorLinks };
}

// ── Lookup helpers ───────────────────────────────────────────

/** Danh sách phòng còn trống trong khoảng thời gian. */
export async function getAvailableRooms(
  date: string,    // "YYYY-MM-DD"
  startTime: string, // "HH:mm"
  endTime: string,   // "HH:mm"
  excludeSessionId?: string,
) {
  // Tìm phòng đã có session SCHEDULED/COMPLETED trùng thời gian
  const occupied = await prisma.classSession.findMany({
    where: {
      date: new Date(date),
      roomId: { not: null },
      status: { in: ["SCHEDULED", "COMPLETED"] },
      id: excludeSessionId ? { not: excludeSessionId } : undefined,
      // Overlap: existing.startTime < endTime AND existing.endTime > startTime
      AND: [
        { startTime: { lt: endTime } },
        { endTime: { gt: startTime } },
      ],
    },
    select: { roomId: true },
  });
  const occupiedIds = occupied.map((s) => s.roomId).filter(Boolean) as string[];

  return prisma.room.findMany({
    where: {
      isActive: true,
      id: { notIn: occupiedIds },
    },
    orderBy: { name: "asc" },
  });
}

/** Tất cả giáo viên trong hệ thống để chọn khi tạo buổi học. */
export async function getTeachersList() {
  return prisma.user.findMany({
    where: { role: "TEACHER" },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });
}

/** Tất cả phòng đang hoạt động (id + tên + sức chứa) — để ưu tiên chọn phòng trước. */
export async function getActiveRoomsList() {
  return prisma.room.findMany({
    where: { isActive: true },
    select: { id: true, name: true, capacity: true },
    orderBy: { name: "asc" },
  });
}

/** Danh sách môn học. */
export async function getSubjectsList() {
  return prisma.subject.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

/** Học sinh CHƯA được đăng ký vào lớp (để hiển thị danh sách thêm vào). */
export async function getAvailableStudents(classId: string) {
  const enrolled = await prisma.classEnrollment.findMany({
    where: { classId, status: "ACTIVE" },
    select: { studentId: true },
  });
  const enrolledIds = enrolled.map((e) => e.studentId);

  return prisma.user.findMany({
    where: { role: "STUDENT", id: { notIn: enrolledIds } },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });
}

/** Số buổi tiếp theo chưa được tạo cho lớp (để tự điền sessionNumber). */
export async function getNextSessionNumber(classId: string): Promise<number> {
  const max = await prisma.classSession.aggregate({
    where: { classId },
    _max: { sessionNumber: true },
  });
  return (max._max.sessionNumber ?? 0) + 1;
}

// ── Lịch sử dụng phòng (cho lưới xếp buổi học) ────────────────

export interface RoomOccupancyBlock {
  startTime: string; // "HH:mm"
  endTime: string;   // "HH:mm"
  label: string;     // mô tả (tên lớp / mục đích đặt phòng)
  source: "CLASS_SESSION" | "BOOKING";
}

export interface RoomUsageForDate {
  id: string;
  name: string;
  capacity: number;
  blocks: RoomOccupancyBlock[];
}

function toLocalHhmm(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/**
 * Lịch sử dụng phòng trong một ngày — hợp nhất hai nguồn:
 * ClassSession (buổi học của lớp khác) + RoomBooking (đặt phòng đã duyệt).
 * Dùng để dựng lưới chọn phòng + giờ khi xếp buổi học.
 */
export async function getRoomUsageForDate(
  date: string, // "YYYY-MM-DD"
  excludeSessionId?: string,
): Promise<RoomUsageForDate[]> {
  const dayStart = new Date(`${date}T00:00:00`);
  const dayEnd = new Date(`${date}T23:59:59`);

  const [rooms, sessions, bookings] = await Promise.all([
    prisma.room.findMany({
      where: { isActive: true },
      select: { id: true, name: true, capacity: true },
      orderBy: { name: "asc" },
    }),
    prisma.classSession.findMany({
      where: {
        date: new Date(date),
        roomId: { not: null },
        status: { in: ["SCHEDULED", "COMPLETED"] },
        id: excludeSessionId ? { not: excludeSessionId } : undefined,
      },
      select: {
        roomId: true,
        startTime: true,
        endTime: true,
        class: { select: { name: true } },
      },
    }),
    prisma.roomBooking.findMany({
      where: {
        status: "APPROVED",
        startAt: { lt: dayEnd },
        endAt: { gt: dayStart },
      },
      select: {
        roomId: true,
        startAt: true,
        endAt: true,
        reason: { select: { label: true } },
      },
    }),
  ]);

  const blocksByRoom = new Map<string, RoomOccupancyBlock[]>();
  for (const s of sessions) {
    if (!s.roomId) continue;
    const list = blocksByRoom.get(s.roomId) ?? [];
    list.push({
      startTime: s.startTime,
      endTime: s.endTime,
      label: s.class.name,
      source: "CLASS_SESSION",
    });
    blocksByRoom.set(s.roomId, list);
  }
  for (const b of bookings) {
    const list = blocksByRoom.get(b.roomId) ?? [];
    list.push({
      startTime: toLocalHhmm(b.startAt),
      endTime: toLocalHhmm(b.endAt),
      label: b.reason.label,
      source: "BOOKING",
    });
    blocksByRoom.set(b.roomId, list);
  }

  return rooms.map((r) => ({
    id: r.id,
    name: r.name,
    capacity: r.capacity,
    blocks: (blocksByRoom.get(r.id) ?? []).sort((a, b) =>
      a.startTime.localeCompare(b.startTime),
    ),
  }));
}

// ── Phân công học sinh cho CBDT (CBDTS) ───────────────────────

/**
 * Lấy toàn bộ danh sách học sinh kèm advisor hiện tại.
 * Dùng cho trang /staff/students/assign (CBDTS only).
 */
export async function getAllStudentsWithAdvisors() {
  const session = await auth();
  if (!session?.user?.id) return { students: [], advisors: [] };

  const [students, advisors] = await Promise.all([
    prisma.user.findMany({
      where: { role: "STUDENT" },
      orderBy: { name: "asc" },
      include: {
        studentAdvisees: {
          include: {
            advisor: { select: { id: true, name: true } },
          },
        },
      },
    }),
    // Chỉ CBDT (staffPosition === CBDT) được phân
    prisma.user.findMany({
      where: { role: "STAFF", staffPosition: "CBDT" },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        staffPosition: true,
        _count: { select: { advisorStudents: true } },
      },
    }),
  ]);

  return { students, advisors };
}

/**
 * Gợi ý học sinh phù hợp khi tạo lớp: lọc theo môn + trình độ từ StudentSubjectLevel.
 * Chỉ trả về students, kèm số lớp đang ở trạng thái RECRUITING/ONGOING.
 */
export async function getSuggestedStudents(subjectId: string, targetLevel: string) {
  if (!subjectId || !targetLevel) return [];

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

  if (studentIds.length === 0) return [];

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

  return users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    level: levelMap.get(u.id) ?? targetLevel,
    activeClassCount: u._count.classEnrollments,
  }));
}
