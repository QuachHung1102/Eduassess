/**
 * Seed test quy mô lớn: nhiều lớp OFFLINE (xếp phòng conflict-free qua allocator)
 * + buổi/điểm danh/đánh giá + occupancy phòng. Chạy sau seedContent().
 * Idempotent: guard lớp theo name; con dùng createMany skipDuplicates.
 */
import type { AttendanceStatus, ClassMode, ClassStatus, DayOfWeek, SessionStatus, StudentLevel } from "@prisma/client";
import { prisma } from "../lib/db/prisma";
import { makeRng } from "../lib/seed/rng";
import { allocateRooms } from "../lib/seed/room-allocator";
import { rebuildRoomOccupancies } from "../lib/rooms/store";

const DAYS: DayOfWeek[] = ["MON", "TUE", "WED", "THU", "FRI"];
const DAY_OFFSET: Record<string, number> = { MON: 0, TUE: 1, WED: 2, THU: 3, FRI: 4 };
const TIMES: Array<[number, number]> = [[8, 10], [10, 12], [14, 16], [16, 18], [18, 20], [19, 21]];
const STATUSES: ClassStatus[] = ["RECRUITING", "ONGOING", "FINISHED"];
const LEVELS: StudentLevel[] = ["WEAK", "AVERAGE", "GOOD", "EXCELLENT"];

const hhmm = (h: number) => `${String(h).padStart(2, "0")}:00`;
function mondayWeeksAgo(weeks: number): Date {
  const d = new Date();
  d.setUTCHours(12, 0, 0, 0);
  const diffToMon = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - diffToMon - weeks * 7);
  return d;
}
const addDays = (base: Date, days: number) => {
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
};

export async function seedLarge() {
  const rng = makeRng(2026);

  const rooms = await prisma.room.findMany({ where: { isActive: true }, select: { id: true, capacity: true } });
  const subjects = await prisma.subject.findMany({ select: { id: true, name: true } });
  const grades = await prisma.grade.findMany({ select: { id: true, gradeNumber: true } });
  const teachers = await prisma.user.findMany({ where: { role: "TEACHER" }, select: { id: true }, orderBy: { email: "asc" } });
  const students = await prisma.user.findMany({ where: { role: "STUDENT" }, select: { id: true }, orderBy: { email: "asc" } });
  const cbdtList = await prisma.user.findMany({ where: { role: "STAFF", staffPosition: "CBDT" }, select: { id: true } });
  const cbdts = await prisma.user.findFirst({ where: { role: "STAFF", staffPosition: "CBDTS" }, select: { id: true } });

  if (rooms.length === 0 || subjects.length === 0 || teachers.length < 2 || students.length < 50 || cbdtList.length === 0) {
    console.warn("⚠️  Thiếu dữ liệu nền — bỏ qua seedLarge.");
    return;
  }

  const subjectById = new Map(subjects.map((s) => [s.id, s.name]));
  const gradeById = new Map(grades.map((g) => [g.id, g.gradeNumber]));

  const N_CLASSES = Number(process.env.SEED_OFFLINE_CLASSES ?? 20);

  type Spec = {
    idx: number;
    subjectId: string;
    gradeId: string;
    status: ClassStatus;
    level: StudentLevel;
    size: number;
    slots: { day: DayOfWeek; start: number; end: number }[];
    weeksAgoStart: number;
  };

  const specs: Spec[] = Array.from({ length: N_CLASSES }, (_, i) => {
    const status = STATUSES[i % 3];
    const nSlots = rng.int(1, 2);
    const days = rng.shuffle(DAYS).slice(0, nSlots);
    const [start, end] = TIMES[i % TIMES.length]; // xoay thời gian để phân tán → ít trùng
    return {
      idx: i,
      subjectId: rng.pick(subjects).id,
      gradeId: rng.pick(grades).id,
      status,
      level: rng.pick(LEVELS),
      size: rng.int(8, 18),
      slots: days.map((d) => ({ day: d, start, end })),
      weeksAgoStart: status === "FINISHED" ? 8 : status === "ONGOING" ? 3 : 0,
    };
  });

  const alloc = allocateRooms({
    classes: specs.map((s) => ({ id: String(s.idx), size: s.size, slots: s.slots })),
    rooms,
    rng,
  });
  const byClass = new Map<string, typeof alloc.assignments>();
  for (const a of alloc.assignments) {
    const arr = byClass.get(a.classId) ?? [];
    arr.push(a);
    byClass.set(a.classId, arr);
  }

  const todayMid = new Date();
  todayMid.setUTCHours(0, 0, 0, 0);
  let created = 0;

  for (const spec of specs) {
    const assigned = byClass.get(String(spec.idx)) ?? [];
    if (assigned.length < spec.slots.length) continue; // không xếp đủ phòng → bỏ qua an toàn

    const letter = String.fromCharCode(65 + (spec.idx % 26));
    const name = `${subjectById.get(spec.subjectId)} ${gradeById.get(spec.gradeId)} – Lớp ${letter} (seed)`;
    if (await prisma.class.findFirst({ where: { name }, select: { id: true } })) continue;

    const startDate = mondayWeeksAgo(spec.weeksAgoStart);
    const advisor = rng.pick(cbdtList);
    const teacher = rng.pick(teachers);

    const cls = await prisma.class.create({
      data: {
        name,
        subjectId: spec.subjectId,
        advisorId: advisor.id,
        createdById: cbdts?.id ?? advisor.id,
        mode: "OFFLINE",
        targetLevel: spec.level,
        sessionCount: spec.slots.length * 4,
        startDate,
        status: spec.status,
      },
    });
    await prisma.classTeacher.create({ data: { classId: cls.id, teacherId: teacher.id } });
    await prisma.classWeeklySlot.createMany({
      data: assigned.map((a) => ({
        classId: cls.id,
        dayOfWeek: a.day as DayOfWeek,
        startTime: hhmm(a.start),
        endTime: hhmm(a.end),
        roomId: a.roomId,
      })),
      skipDuplicates: true,
    });

    const enrollees = rng.shuffle(students).slice(0, spec.size);
    await prisma.classEnrollment.createMany({
      data: enrollees.map((s) => ({ classId: cls.id, studentId: s.id })),
      skipDuplicates: true,
    });

    // Sinh buổi: 4 tuần × mỗi khung
    let n = 0;
    const sessionsData: {
      classId: string;
      sessionNumber: number;
      date: Date;
      startTime: string;
      endTime: string;
      mode: ClassMode;
      roomId: string;
      teacherId: string;
      status: SessionStatus;
    }[] = [];
    for (let w = 0; w < 4; w++) {
      for (const a of assigned) {
        n += 1;
        const date = addDays(startDate, w * 7 + DAY_OFFSET[a.day]);
        sessionsData.push({
          classId: cls.id,
          sessionNumber: n,
          date,
          startTime: hhmm(a.start),
          endTime: hhmm(a.end),
          mode: "OFFLINE",
          roomId: a.roomId,
          teacherId: teacher.id,
          status: date < todayMid ? "COMPLETED" : "SCHEDULED",
        });
      }
    }
    await prisma.classSession.createMany({ data: sessionsData });

    // Điểm danh + đánh giá cho buổi COMPLETED
    const pastSessions = await prisma.classSession.findMany({
      where: { classId: cls.id, status: "COMPLETED" },
      select: { id: true, sessionNumber: true },
    });
    const attData: { sessionId: string; studentId: string; status: AttendanceStatus }[] = [];
    const evalData: { sessionId: string; studentId: string; performance: number; diligence: number; comprehension: number; evaluatedById: string }[] = [];
    for (const ps of pastSessions) {
      enrollees.forEach((st, si) => {
        const status: AttendanceStatus = si % 9 === 0 ? "ABSENT" : si % 7 === 0 ? "LATE" : "PRESENT";
        attData.push({ sessionId: ps.id, studentId: st.id, status });
        evalData.push({
          sessionId: ps.id,
          studentId: st.id,
          performance: 3 + ((si + ps.sessionNumber) % 3),
          diligence: 3 + ((si + 1) % 3),
          comprehension: 3 + ((si + 2) % 3),
          evaluatedById: teacher.id,
        });
      });
    }
    for (let i = 0; i < attData.length; i += 1000)
      await prisma.attendance.createMany({ data: attData.slice(i, i + 1000), skipDuplicates: true });
    for (let i = 0; i < evalData.length; i += 1000)
      await prisma.sessionEvaluation.createMany({ data: evalData.slice(i, i + 1000), skipDuplicates: true });

    await prisma.studentAdvisor.createMany({
      data: enrollees.map((s) => ({ studentId: s.id, advisorId: advisor.id, assignedById: cbdts?.id ?? advisor.id })),
      skipDuplicates: true,
    });

    created += 1;
  }
  console.log(`✅ seedLarge: ${created} lớp OFFLINE (+ buổi/điểm danh/đánh giá), ${alloc.unassigned.length} khung không xếp được`);

  // Dựng occupancy từ MỌI session + booking (conflict-free nhờ allocator)
  const occ = await rebuildRoomOccupancies();
  console.log(`✅ Occupancy: ${occ.sessions} block buổi học, ${occ.bookings} block đặt phòng`);
}
