/**
 * Seed test quy mô lớn: nhiều lớp OFFLINE (xếp phòng conflict-free qua allocator)
 * + buổi/điểm danh/đánh giá + occupancy phòng. Chạy sau seedContent().
 * Idempotent: guard lớp theo name; con dùng createMany skipDuplicates.
 */
import bcrypt from "bcryptjs";
import type { AttendanceStatus, BookingStatus, ClassMode, ClassStatus, DayOfWeek, NotificationType, SessionStatus, StudentLevel } from "@prisma/client";
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

  // ── Lấp khoảng trống ─────────────────────────────────────────
  const DEMO_IMG = "https://res.cloudinary.com/dwjziopfp/image/upload/v1780816970/flashcards/mzk60dlcwdt4lh5ru7fp.jpg";

  // RoomLayoutImage (1:1, bắt buộc khi tạo phòng qua UI)
  for (const r of rooms) {
    await prisma.roomLayoutImage.upsert({
      where: { roomId: r.id },
      update: {},
      create: { roomId: r.id, url: DEMO_IMG, publicId: `seed/room-${r.id}` },
    });
  }

  // RoomBooking: APPROVED trên Thứ Bảy (không trùng buổi học MON–FRI) + PENDING/REJECTED
  const reason = await prisma.bookingReason.findFirst({ select: { id: true } });
  const reviewer = await prisma.user.findFirst({ where: { role: "STAFF", staffPosition: "NVLT" }, select: { id: true } });
  if (reason && (await prisma.roomBooking.count()) === 0) {
    const sat = addDays(mondayWeeksAgo(0), 5);
    type Bk = {
      roomId: string; requesterId: string; bookedForId: string; reasonId: string;
      startAt: Date; endAt: Date; status: BookingStatus;
      reviewerId: string | null; reviewedAt: Date | null; rejectReason: string | null;
    };
    const bookings: Bk[] = [];
    let bi = 0;
    for (const room of rooms) {
      for (const h of [8, 12, 16]) {
        if (bi >= 8) break;
        const startAt = new Date(sat); startAt.setUTCHours(h, 0, 0, 0);
        const endAt = new Date(sat); endAt.setUTCHours(h + 2, 0, 0, 0);
        bookings.push({ roomId: room.id, requesterId: rng.pick(teachers).id, bookedForId: rng.pick(teachers).id, reasonId: reason.id, startAt, endAt, status: "APPROVED", reviewerId: reviewer?.id ?? null, reviewedAt: new Date(), rejectReason: null });
        bi += 1;
      }
    }
    for (let i = 0; i < 18; i += 1) {
      const day = addDays(mondayWeeksAgo(rng.int(0, 2)), rng.int(0, 4));
      const h = rng.pick([8, 10, 14, 16]);
      const startAt = new Date(day); startAt.setUTCHours(h, 0, 0, 0);
      const endAt = new Date(day); endAt.setUTCHours(h + 2, 0, 0, 0);
      const rejected = i % 4 === 0;
      bookings.push({ roomId: rng.pick(rooms).id, requesterId: rng.pick(teachers).id, bookedForId: rng.pick(teachers).id, reasonId: reason.id, startAt, endAt, status: rejected ? "REJECTED" : "PENDING", reviewerId: rejected ? reviewer?.id ?? null : null, reviewedAt: rejected ? new Date() : null, rejectReason: rejected ? "Phòng đã có lịch khác" : null });
    }
    await prisma.roomBooking.createMany({ data: bookings });
    console.log(`✅ Booking: ${bookings.length} (8 APPROVED trên T7 + PENDING/REJECTED)`);
  }

  // Notification: vài bản ghi mỗi NotificationType
  if ((await prisma.notification.count()) === 0) {
    const notifs: { userId: string; title: string; message: string; type: NotificationType; href: string | null; readAt: Date | null }[] = [];
    const push = (userId: string, type: NotificationType, title: string, message: string, href: string | null, read = false) =>
      notifs.push({ userId, title, message, type, href, readAt: read ? new Date() : null });
    students.slice(0, 20).forEach((s, i) => {
      push(s.id, "EXAM_ASSIGNED", "Đề kiểm tra mới", "Bạn có đề kiểm tra mới cần làm.", "/student/exams", i % 2 === 0);
      push(s.id, "EXAM_GRADED", "Bài đã chấm", "Bài kiểm tra của bạn đã được chấm điểm.", "/student/exams", i % 3 === 0);
      push(s.id, "CLASS_ASSIGNED", "Được xếp lớp", "Bạn đã được thêm vào một lớp học.", "/student/classes", false);
    });
    teachers.slice(0, 5).forEach((t) => {
      push(t.id, "QUESTION_APPROVED", "Câu hỏi được duyệt", "Câu hỏi bạn tạo đã được duyệt.", "/teacher/question-bank", true);
      push(t.id, "COURSE_APPROVED", "Khóa học xuất bản", "Khóa học của bạn đã được duyệt.", "/teacher/courses", false);
    });
    push(teachers[0].id, "BOOKING_APPROVED", "Đặt phòng được duyệt", "Yêu cầu đặt phòng đã được duyệt.", "/booking", false);
    push(teachers[0].id, "BOOKING_REJECTED", "Đặt phòng bị từ chối", "Yêu cầu đặt phòng bị từ chối.", "/booking", false);
    push(teachers[0].id, "SCHEDULE_CHANGED", "Lịch thay đổi", "Một buổi học đã đổi lịch.", "/teacher/classes", false);
    push(cbdtList[0].id, "STUDENT_ASSIGNED", "Học sinh mới", "Bạn được phân học sinh mới.", "/staff/students", false);
    push(students[0].id, "SYSTEM", "Thông báo hệ thống", "Chào mừng đến với EduAssess!", "/notifications", false);
    await prisma.notification.createMany({ data: notifs });
    console.log(`✅ Notification: ${notifs.length} (đủ loại)`);
  }

  // ExamAttempt.aiFeedback cho vài lượt
  const attemptsNoFb = await prisma.examAttempt.findMany({ where: { aiFeedback: null, score: { not: null } }, take: 10, select: { id: true } });
  for (const a of attemptsNoFb) {
    await prisma.examAttempt.update({
      where: { id: a.id },
      data: { aiFeedback: "Em làm tốt phần đầu nhưng cần xem lại các câu về phương trình bậc hai. Hãy luyện thêm dạng xét dấu tam thức." },
    });
  }
  if (attemptsNoFb.length) console.log(`✅ AI feedback: ${attemptsNoFb.length} lượt`);

  // FlashcardSession: nhiều HS × bộ thẻ
  const sets = await prisma.flashcardSet.findMany({ select: { id: true } });
  if (sets.length && (await prisma.flashcardSession.count()) === 0) {
    const fsData: { setId: string; studentId: string; completedAt: Date | null }[] = [];
    for (const st of students.slice(0, 60)) {
      for (const set of rng.shuffle(sets).slice(0, rng.int(1, 3))) {
        fsData.push({ setId: set.id, studentId: st.id, completedAt: rng.bool(0.6) ? new Date() : null });
      }
    }
    for (let i = 0; i < fsData.length; i += 1000) await prisma.flashcardSession.createMany({ data: fsData.slice(i, i + 1000) });
    console.log(`✅ FlashcardSession: ${fsData.length}`);
  }

  // SecurityAnswer cho vài HS
  if ((await prisma.securityAnswer.count()) === 0) {
    const hash = await bcrypt.hash("hanoi", 12);
    const saData = students.slice(0, 10).flatMap((st) => [
      { userId: st.id, questionNo: 1, questionText: "Thành phố bạn sinh ra?", answerHash: hash },
      { userId: st.id, questionNo: 2, questionText: "Tên thú cưng đầu tiên?", answerHash: hash },
      { userId: st.id, questionNo: 3, questionText: "Trường tiểu học của bạn?", answerHash: hash },
    ]);
    await prisma.securityAnswer.createMany({ data: saData });
    console.log(`✅ SecurityAnswer: ${saData.length / 3} HS`);
  }

  // AuditLog vài bản ghi
  if ((await prisma.auditLog.count()) === 0) {
    await prisma.auditLog.createMany({
      data: [
        { actorId: cbdts?.id ?? null, action: "user.code.update", entityType: "User", entityId: students[0].id, payload: { before: null, after: "HS-2026-000001" } },
        { actorId: reviewer?.id ?? null, action: "booking.approve", entityType: "RoomBooking", entityId: "seed", payload: { note: "seed" } },
      ],
    });
    console.log("✅ AuditLog: 2");
  }

  // Dựng occupancy từ MỌI session + booking (conflict-free nhờ allocator)
  const occ = await rebuildRoomOccupancies();
  console.log(`✅ Occupancy: ${occ.sessions} block buổi học, ${occ.bookings} block đặt phòng`);
}
