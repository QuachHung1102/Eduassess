import { prisma } from "@/lib/db/prisma";
import { auth } from "@/auth";
import { getOccupanciesBetween } from "@/lib/rooms/store";
import type { SessionUserBase } from "@/lib/types";

// ── Phân quyền đánh giá theo phân công ─────────────────────────

/** Một HS có được phân cho CBĐT này không (quan hệ StudentAdvisor). */
export async function isAssignedAdvisor(studentId: string, advisorId: string): Promise<boolean> {
  const link = await prisma.studentAdvisor.findUnique({
    where: { studentId_advisorId: { studentId, advisorId } },
    select: { id: true },
  });
  return !!link;
}

/**
 * CBĐT chỉ được đánh giá học sinh ĐƯỢC PHÂN CÔNG cho mình (StudentAdvisor).
 * OWNER / ADMIN / CBDTS (super) bỏ qua giới hạn này.
 */
export async function canEvaluateStudent(
  user: Pick<SessionUserBase, "id" | "role" | "staffPosition">,
  studentId: string,
): Promise<boolean> {
  if (user.role === "OWNER" || user.role === "ADMIN") return true;
  if (user.role === "STAFF" && user.staffPosition === "CBDTS") return true;
  return isAssignedAdvisor(studentId, user.id);
}

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
        _count: { select: { enrollments: { where: { status: "ACTIVE" } }, sessions: true } },
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
      _count: { select: { enrollments: { where: { status: "ACTIVE" } }, sessions: true } },
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
        select: {
          dayOfWeek: true,
          startTime: true,
          endTime: true,
          room: { select: { name: true } },
        },
        orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
      },
      _count: { select: { enrollments: { where: { status: "ACTIVE" } }, sessions: true, exams: true } },
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
          teachers: { select: { teacherId: true } },
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
      evaluations: {
        select: {
          studentId: true,
          performance: true,
          diligence: true,
          comprehension: true,
          note: true,
        },
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

/**
 * Tổng quan tiến độ các HS được phân cho CBĐT đang đăng nhập:
 * mức năng lực mới nhất theo môn + tỉ lệ điểm danh + TB đánh giá-buổi + số lớp.
 * Dùng cho trang /staff/overview.
 */
export async function getMyStudentsOverview() {
  const session = await auth();
  if (!session?.user?.id) return [];
  const advisorId = session.user.id;

  const links = await prisma.studentAdvisor.findMany({
    where: { advisorId },
    select: {
      studentId: true,
      student: {
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
      },
    },
    orderBy: { assignedAt: "desc" },
  });
  const studentIds = links.map((l) => l.studentId);
  if (studentIds.length === 0) return [];

  const [levels, attendances, evals] = await Promise.all([
    prisma.studentSubjectLevel.findMany({
      where: { studentId: { in: studentIds } },
      select: { studentId: true, subjectId: true, level: true, subject: { select: { name: true } } },
      orderBy: { evaluatedAt: "desc" },
    }),
    prisma.attendance.findMany({
      where: { studentId: { in: studentIds } },
      select: { studentId: true, status: true },
    }),
    prisma.sessionEvaluation.findMany({
      where: { studentId: { in: studentIds } },
      select: { studentId: true, performance: true, diligence: true, comprehension: true },
    }),
  ]);

  // Mức mới nhất theo (HS, môn).
  const levelsByStudent = new Map<string, { subject: string; level: string }[]>();
  const seen = new Set<string>();
  for (const lv of levels) {
    const key = `${lv.studentId}:${lv.subjectId}`;
    if (seen.has(key)) continue; // đã có bản mới hơn (orderBy desc)
    seen.add(key);
    const list = levelsByStudent.get(lv.studentId) ?? [];
    list.push({ subject: lv.subject.name, level: lv.level });
    levelsByStudent.set(lv.studentId, list);
  }

  const attByStudent = new Map<string, { present: number; total: number }>();
  for (const a of attendances) {
    const cur = attByStudent.get(a.studentId) ?? { present: 0, total: 0 };
    cur.total += 1;
    if (a.status === "PRESENT" || a.status === "LATE") cur.present += 1;
    attByStudent.set(a.studentId, cur);
  }

  const evalSumByStudent = new Map<string, { sum: number; n: number }>();
  for (const e of evals) {
    const cur = evalSumByStudent.get(e.studentId) ?? { sum: 0, n: 0 };
    for (const v of [e.performance, e.diligence, e.comprehension]) {
      if (v !== null) {
        cur.sum += v;
        cur.n += 1;
      }
    }
    evalSumByStudent.set(e.studentId, cur);
  }

  return links.map((l) => {
    const att = attByStudent.get(l.studentId) ?? { present: 0, total: 0 };
    const ev = evalSumByStudent.get(l.studentId);
    return {
      id: l.studentId,
      name: l.student.name,
      email: l.student.email,
      activeClassCount: l.student._count.classEnrollments,
      levels: levelsByStudent.get(l.studentId) ?? [],
      attendance: att,
      evalAvg: ev && ev.n > 0 ? ev.sum / ev.n : null,
    };
  });
}

/**
 * Lọc TOÀN BỘ học sinh (cho CBDTS/role có student.view_all để tìm & đánh giá).
 * - q: tìm theo tên/email.
 * - subjectId + level: lọc theo mức năng lực mới nhất ở một môn ("UNASSESSED" = chưa đánh giá môn đó).
 * Trả kèm mức theo môn + CBĐT phụ trách để CBDTS giám sát.
 */
export async function getAllStudentsFiltered(filters: {
  q?: string;
  subjectId?: string;
  level?: string;
}) {
  const q = filters.q?.trim();
  const students = await prisma.user.findMany({
    where: {
      role: "STUDENT",
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" as const } },
              { email: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      name: true,
      email: true,
      studentAdvisees: { select: { advisor: { select: { name: true } } } },
    },
    orderBy: { name: "asc" },
    take: 300,
  });
  const ids = students.map((s) => s.id);
  if (ids.length === 0) return [];

  const levels = await prisma.studentSubjectLevel.findMany({
    where: {
      studentId: { in: ids },
      ...(filters.subjectId ? { subjectId: filters.subjectId } : {}),
    },
    select: { studentId: true, subjectId: true, level: true, subject: { select: { name: true } } },
    orderBy: { evaluatedAt: "desc" },
  });

  const latestBySubject = new Map<string, { subject: string; level: string }[]>();
  const subjLevelByStudent = new Map<string, string>();
  const seen = new Set<string>();
  for (const lv of levels) {
    const key = `${lv.studentId}:${lv.subjectId}`;
    if (seen.has(key)) continue; // bản mới hơn đã thấy (orderBy desc)
    seen.add(key);
    const list = latestBySubject.get(lv.studentId) ?? [];
    list.push({ subject: lv.subject.name, level: lv.level });
    latestBySubject.set(lv.studentId, list);
    if (filters.subjectId && lv.subjectId === filters.subjectId)
      subjLevelByStudent.set(lv.studentId, lv.level);
  }

  let result = students.map((s) => ({
    id: s.id,
    name: s.name,
    email: s.email,
    advisors: s.studentAdvisees.map((a) => a.advisor.name).filter(Boolean) as string[],
    levels: latestBySubject.get(s.id) ?? [],
    subjectLevel: filters.subjectId ? subjLevelByStudent.get(s.id) ?? null : null,
  }));

  if (filters.subjectId && filters.level) {
    result =
      filters.level === "UNASSESSED"
        ? result.filter((s) => s.subjectLevel === null)
        : result.filter((s) => s.subjectLevel === filters.level);
  }
  return result;
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
  // RoomSchedule (ADR-0001): phòng bận = có block giao khoảng giờ cần xếp
  // (gồm cả buổi học lẫn đặt phòng đã duyệt).
  const blocks = await getOccupanciesBetween({
    from: new Date(`${date}T${startTime}:00`),
    to: new Date(`${date}T${endTime}:00`),
    excludeSessionId,
  });
  const occupiedIds = [...new Set(blocks.map((b) => b.roomId))];

  return prisma.room.findMany({
    where: {
      isActive: true,
      id: { notIn: occupiedIds },
    },
    orderBy: { name: "asc" },
  });
}

/** Giáo viên + lịch rảnh hiện tại — cho CBĐT xem/sửa hộ tại /staff/teachers/[id]. */
export async function getTeacherWithAvailability(teacherId: string) {
  const [teacher, availability] = await Promise.all([
    prisma.user.findFirst({
      where: { id: teacherId, role: "TEACHER" },
      select: { id: true, name: true, email: true },
    }),
    prisma.teacherAvailability.findMany({
      where: { teacherId },
      orderBy: [{ dayOfWeek: "asc" }, { slot: "asc" }],
    }),
  ]);
  return { teacher, availability };
}

/** Danh sách giáo viên kèm số ô lịch rảnh đã khai — cho trang /staff/teachers. */
export async function getTeachersWithAvailabilityCount() {
  const teachers = await prisma.user.findMany({
    where: { role: "TEACHER" },
    select: {
      id: true,
      name: true,
      email: true,
      _count: { select: { teacherAvailability: { where: { availabilityMode: { not: "BUSY" } } } } },
    },
    orderBy: { name: "asc" },
  });
  return teachers.map((t) => ({
    id: t.id,
    name: t.name,
    email: t.email,
    declaredSlots: t._count.teacherAvailability,
  }));
}

/** Tất cả giáo viên trong hệ thống để chọn khi tạo buổi học. */
export async function getTeachersList() {
  return prisma.user.findMany({
    where: { role: "TEACHER" },
    select: { id: true, name: true, email: true },
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
 * Lịch sử dụng phòng trong một ngày — đọc từ bảng room_occupancies (ADR-0001),
 * nguồn sự thật hợp nhất ClassSession + RoomBooking đã duyệt.
 * Dùng để dựng lưới chọn phòng + giờ khi xếp buổi học.
 */
export async function getRoomUsageForDate(
  date: string, // "YYYY-MM-DD"
  excludeSessionId?: string,
): Promise<RoomUsageForDate[]> {
  const dayStart = new Date(`${date}T00:00:00`);
  const dayEnd = new Date(`${date}T23:59:59`);

  const [rooms, blocks] = await Promise.all([
    prisma.room.findMany({
      where: { isActive: true },
      select: { id: true, name: true, capacity: true },
      orderBy: { name: "asc" },
    }),
    getOccupanciesBetween({ from: dayStart, to: dayEnd, excludeSessionId }),
  ]);

  const blocksByRoom = new Map<string, RoomOccupancyBlock[]>();
  for (const b of blocks) {
    const list = blocksByRoom.get(b.roomId) ?? [];
    list.push({
      startTime: toLocalHhmm(b.startsAt),
      endTime: toLocalHhmm(b.endsAt),
      label: b.label,
      source: b.source,
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
 * Gợi ý HS đúng môn + trình độ mục tiêu để ĐÁNH DẤU "Phù hợp" trong bảng "Thêm
 * học sinh" ở trang chi tiết lớp ĐÃ CÓ (staff + admin). Chỉ khớp năng lực,
 * KHÔNG lọc lịch rảnh/trùng buổi — khác getEligibleStudentsForSchedule (lọc cứng
 * khi TẠO lớp). Kèm số lớp đang RECRUITING/ONGOING.
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
