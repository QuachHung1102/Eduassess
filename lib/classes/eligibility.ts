import { prisma } from "@/lib/db/prisma";
import {
  normalizeAvailabilitySlots,
} from "@/lib/availability/time-slots";
import {
  allowedAvailabilityModes,
  cellKey,
  coversAllCells,
  dayOfWeekFromYmd,
  timeRangeToDigitalSlots,
  type PlannedSession,
  type WeeklyCell,
} from "@/lib/classes/scheduling";
import type { AvailabilityMode, ClassMode, DayOfWeek, StudentLevel, TimeSlot } from "@/lib/types";

// ─── Lọc GV / HS / phòng khả thi cho một khung lịch ───────────
// Triết lý: LỌC CỨNG. Người chưa khai báo lịch rảnh = BUSY = bị loại.
// Một người chỉ khả thi khi rảnh (mode hợp lệ) ở TẤT CẢ ô của khung lịch
// VÀ không trùng buổi đã có trên các ngày cụ thể.

export interface EligibleTeacher {
  id: string;
  name: string | null;
  email: string;
}

export interface EligibleStudent {
  id: string;
  name: string | null;
  email: string;
  /** Năng lực môn học mới nhất, hoặc null nếu HS chưa từng được đánh giá môn này. */
  level: StudentLevel | null;
  activeClassCount: number;
}

export interface EligibleRoom {
  id: string;
  name: string;
  capacity: number;
}

function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart < bEnd && aEnd > bStart;
}

function toLocalHhmm(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function toYmd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Map từ rows lịch rảnh (đã có thể chứa slot legacy) → Map<cellKey, mode>. */
function availabilityMap(
  rows: { dayOfWeek: DayOfWeek; slot: TimeSlot; availabilityMode: AvailabilityMode }[],
): Map<string, AvailabilityMode> {
  const normalized = normalizeAvailabilitySlots(
    rows.map((r) => ({ dayOfWeek: r.dayOfWeek, slot: r.slot, availabilityMode: r.availabilityMode })),
  );
  const map = new Map<string, AvailabilityMode>();
  for (const cell of normalized) {
    map.set(cellKey(cell.dayOfWeek, cell.slot), cell.availabilityMode);
  }
  return map;
}

// ─── Giáo viên khả thi ────────────────────────────────────────

export async function getEligibleTeachersForSchedule(opts: {
  cells: WeeklyCell[];
  mode: ClassMode;
  plannedSessions: PlannedSession[];
}): Promise<EligibleTeacher[]> {
  const { cells, mode, plannedSessions } = opts;
  if (cells.length === 0) return [];

  const teachers = await prisma.user.findMany({
    where: { role: "TEACHER" },
    select: {
      id: true,
      name: true,
      email: true,
      teacherAvailability: {
        select: { dayOfWeek: true, slot: true, availabilityMode: true },
      },
    },
    orderBy: { name: "asc" },
  });

  // 1) Lọc theo lịch rảnh tuần.
  const availableByCells = teachers.filter((t) =>
    coversAllCells(cells, availabilityMap(t.teacherAvailability), mode),
  );
  if (availableByCells.length === 0) return [];

  // 2) Loại GV đã có buổi trùng giờ trên các ngày cụ thể.
  const candidateIds = availableByCells.map((t) => t.id);
  const plannedDates = [...new Set(plannedSessions.map((s) => s.date))];
  const existing = await prisma.classSession.findMany({
    where: {
      teacherId: { in: candidateIds },
      date: { in: plannedDates.map((d) => new Date(d)) },
      status: { in: ["SCHEDULED", "COMPLETED"] },
    },
    select: { teacherId: true, date: true, startTime: true, endTime: true },
  });

  const busyTeacherIds = new Set<string>();
  for (const ex of existing) {
    const exYmd = toYmd(ex.date);
    for (const ps of plannedSessions) {
      if (ps.date === exYmd && overlaps(ps.startTime, ps.endTime, ex.startTime, ex.endTime)) {
        busyTeacherIds.add(ex.teacherId);
        break;
      }
    }
  }

  return availableByCells
    .filter((t) => !busyTeacherIds.has(t.id))
    .map((t) => ({ id: t.id, name: t.name, email: t.email }));
}

// ─── Học sinh khả thi ─────────────────────────────────────────

export async function getEligibleStudentsForSchedule(opts: {
  cells: WeeklyCell[];
  mode: ClassMode;
  subjectId: string;
  targetLevel: string;
  plannedSessions: PlannedSession[];
}): Promise<EligibleStudent[]> {
  const { cells, mode, subjectId, targetLevel, plannedSessions } = opts;
  if (cells.length === 0 || !subjectId || !targetLevel) return [];

  // 1) Lấy HS đúng môn + đúng năng lực mục tiêu (đánh giá mới nhất),
  // VÀ HS chưa từng được đánh giá môn này — hiện cả hai nhóm để CBĐT tự
  // quyết định (nhóm "Chưa đánh giá" được đánh dấu riêng ở `level: null`).
  const levels = await prisma.studentSubjectLevel.findMany({
    where: { subjectId },
    select: { studentId: true, level: true },
    orderBy: { evaluatedAt: "desc" },
  });
  const latestLevel = new Map<string, StudentLevel>();
  for (const l of levels) {
    if (!latestLevel.has(l.studentId)) latestLevel.set(l.studentId, l.level);
  }
  const matchedIds = [...latestLevel.entries()]
    .filter(([, level]) => level === targetLevel)
    .map(([id]) => id);

  const evaluatedIds = [...latestLevel.keys()];
  const unassessed = await prisma.user.findMany({
    where: {
      role: "STUDENT",
      ...(evaluatedIds.length > 0 ? { id: { notIn: evaluatedIds } } : {}),
    },
    select: { id: true },
  });

  const seedCandidateIds = [...matchedIds, ...unassessed.map((u) => u.id)];
  if (seedCandidateIds.length === 0) return [];

  // 2) Lọc theo lịch rảnh tuần.
  const students = await prisma.user.findMany({
    where: { id: { in: seedCandidateIds }, role: "STUDENT" },
    select: {
      id: true,
      name: true,
      email: true,
      studentAvailability: {
        select: { dayOfWeek: true, slot: true, availabilityMode: true },
      },
      _count: {
        select: {
          classEnrollments: {
            where: { class: { status: { in: ["RECRUITING", "ONGOING"] } } },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });
  const availableByCells = students.filter((s) =>
    coversAllCells(cells, availabilityMap(s.studentAvailability), mode),
  );
  if (availableByCells.length === 0) return [];

  // 3) Loại HS trùng buổi với lớp khác đang theo học.
  const candidateIds = availableByCells.map((s) => s.id);
  const plannedDates = [...new Set(plannedSessions.map((s) => s.date))];

  const enrollments = await prisma.classEnrollment.findMany({
    where: { studentId: { in: candidateIds }, status: "ACTIVE" },
    select: { studentId: true, classId: true },
  });
  const classIdsByStudent = new Map<string, string[]>();
  const allClassIds = new Set<string>();
  for (const e of enrollments) {
    const list = classIdsByStudent.get(e.studentId) ?? [];
    list.push(e.classId);
    classIdsByStudent.set(e.studentId, list);
    allClassIds.add(e.classId);
  }

  const otherSessions = allClassIds.size
    ? await prisma.classSession.findMany({
        where: {
          classId: { in: [...allClassIds] },
          date: { in: plannedDates.map((d) => new Date(d)) },
          status: { in: ["SCHEDULED", "COMPLETED"] },
        },
        select: { classId: true, date: true, startTime: true, endTime: true },
      })
    : [];
  const sessionsByClass = new Map<string, { ymd: string; startTime: string; endTime: string }[]>();
  for (const s of otherSessions) {
    const list = sessionsByClass.get(s.classId) ?? [];
    list.push({ ymd: toYmd(s.date), startTime: s.startTime, endTime: s.endTime });
    sessionsByClass.set(s.classId, list);
  }

  const busyStudentIds = new Set<string>();
  for (const studentId of candidateIds) {
    const classes = classIdsByStudent.get(studentId) ?? [];
    let conflict = false;
    for (const cid of classes) {
      const occ = sessionsByClass.get(cid) ?? [];
      for (const o of occ) {
        if (plannedSessions.some((ps) => ps.date === o.ymd && overlaps(ps.startTime, ps.endTime, o.startTime, o.endTime))) {
          conflict = true;
          break;
        }
      }
      if (conflict) break;
    }
    if (conflict) busyStudentIds.add(studentId);
  }

  return availableByCells
    .filter((s) => !busyStudentIds.has(s.id))
    .map((s) => ({
      id: s.id,
      name: s.name,
      email: s.email,
      level: latestLevel.get(s.id) ?? null,
      activeClassCount: s._count.classEnrollments,
    }))
    .sort((a, b) => {
      // HS đúng năng lực mục tiêu lên trước nhóm "Chưa đánh giá".
      const aMatched = a.level === targetLevel ? 0 : 1;
      const bMatched = b.level === targetLevel ? 0 : 1;
      return aMatched - bMatched;
    });
}

// ─── Phòng khả thi ────────────────────────────────────────────

export async function getEligibleRoomsForSchedule(opts: {
  plannedSessions: PlannedSession[];
  capacityNeeded?: number;
}): Promise<EligibleRoom[]> {
  const { plannedSessions, capacityNeeded = 0 } = opts;
  if (plannedSessions.length === 0) return [];

  const plannedDates = [...new Set(plannedSessions.map((s) => s.date))];
  const dateObjs = plannedDates.map((d) => new Date(d));
  const spanStart = new Date(`${plannedDates.slice().sort()[0]}T00:00:00`);
  const spanEnd = new Date(`${plannedDates.slice().sort().at(-1)}T23:59:59`);

  const [rooms, sessions, bookings] = await Promise.all([
    prisma.room.findMany({
      where: { isActive: true, capacity: { gte: capacityNeeded } },
      select: { id: true, name: true, capacity: true },
      orderBy: { name: "asc" },
    }),
    prisma.classSession.findMany({
      where: {
        date: { in: dateObjs },
        roomId: { not: null },
        status: { in: ["SCHEDULED", "COMPLETED"] },
      },
      select: { roomId: true, date: true, startTime: true, endTime: true },
    }),
    prisma.roomBooking.findMany({
      where: { status: "APPROVED", startAt: { lt: spanEnd }, endAt: { gt: spanStart } },
      select: { roomId: true, startAt: true, endAt: true },
    }),
  ]);

  // roomId → ymd → danh sách khoảng bận.
  const busy = new Map<string, Map<string, { startTime: string; endTime: string }[]>>();
  function addBusy(roomId: string, ymd: string, startTime: string, endTime: string) {
    const byDate = busy.get(roomId) ?? new Map();
    const list = byDate.get(ymd) ?? [];
    list.push({ startTime, endTime });
    byDate.set(ymd, list);
    busy.set(roomId, byDate);
  }
  for (const s of sessions) {
    if (!s.roomId) continue;
    addBusy(s.roomId, toYmd(s.date), s.startTime, s.endTime);
  }
  for (const b of bookings) {
    addBusy(b.roomId, toYmd(b.startAt), toLocalHhmm(b.startAt), toLocalHhmm(b.endAt));
  }

  return rooms
    .filter((room) => {
      const byDate = busy.get(room.id);
      if (!byDate) return true;
      for (const ps of plannedSessions) {
        const intervals = byDate.get(ps.date) ?? [];
        if (intervals.some((iv) => overlaps(ps.startTime, ps.endTime, iv.startTime, iv.endTime))) {
          return false;
        }
      }
      return true;
    })
    .map((r) => ({ id: r.id, name: r.name, capacity: r.capacity }));
}

// ─── Hỗ trợ "tô khả thi" lên lưới (pre-constrain) ─────────────

/** Tập ô (cellKey) mà giáo viên rảnh — dùng để tô lưới khi chọn GV trước. */
export async function getTeacherAvailableCells(
  teacherId: string,
  mode: ClassMode,
): Promise<string[]> {
  const rows = await prisma.teacherAvailability.findMany({
    where: { teacherId },
    select: { dayOfWeek: true, slot: true, availabilityMode: true },
  });
  const allowed = new Set(allowedAvailabilityModes(mode));
  const map = availabilityMap(rows);
  return [...map.entries()].filter(([, m]) => allowed.has(m)).map(([k]) => k);
}

/**
 * Tập ô (cellKey) mà phòng BẬN trong khoảng `weeks` tuần kể từ startDate —
 * dùng để tô xám lưới khi chọn phòng trước. Xấp xỉ (an toàn theo hướng lọc cứng):
 * một ô bị coi là bận nếu phòng vướng lịch ở thứ+giờ đó trong BẤT KỲ tuần nào.
 */
export async function getRoomBusyCells(opts: {
  roomId: string;
  startDate: string; // "YYYY-MM-DD"
  weeks: number;
}): Promise<string[]> {
  const { roomId, startDate, weeks } = opts;
  const spanStart = new Date(`${startDate}T00:00:00`);
  const spanEnd = new Date(spanStart);
  spanEnd.setDate(spanEnd.getDate() + weeks * 7);

  const [sessions, bookings] = await Promise.all([
    prisma.classSession.findMany({
      where: {
        roomId,
        date: { gte: spanStart, lt: spanEnd },
        status: { in: ["SCHEDULED", "COMPLETED"] },
      },
      select: { date: true, startTime: true, endTime: true },
    }),
    prisma.roomBooking.findMany({
      where: { roomId, status: "APPROVED", startAt: { lt: spanEnd }, endAt: { gt: spanStart } },
      select: { startAt: true, endAt: true },
    }),
  ]);

  const busyCells = new Set<string>();
  function mark(ymd: string, startTime: string, endTime: string) {
    const dow = dayOfWeekFromYmd(ymd);
    for (const slot of timeRangeToDigitalSlots(startTime, endTime)) {
      busyCells.add(cellKey(dow, slot));
    }
  }
  for (const s of sessions) mark(toYmd(s.date), s.startTime, s.endTime);
  for (const b of bookings) mark(toYmd(b.startAt), toLocalHhmm(b.startAt), toLocalHhmm(b.endAt));

  return [...busyCells];
}
