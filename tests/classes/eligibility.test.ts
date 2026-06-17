import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

// Mock toàn bộ I/O: lớp DB và store lịch phòng — logic lọc chạy thật, dữ liệu giả lập.
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    user: { findMany: vi.fn() },
    classSession: { findMany: vi.fn() },
    studentSubjectLevel: { findMany: vi.fn() },
    classEnrollment: { findMany: vi.fn() },
    room: { findMany: vi.fn() },
    teacherAvailability: { findMany: vi.fn() },
  },
}));
vi.mock("@/lib/rooms/store", () => ({
  getOccupanciesBetween: vi.fn(),
}));

import { prisma } from "@/lib/db/prisma";
import { getOccupanciesBetween } from "@/lib/rooms/store";
import {
  getEligibleRoomsBySlot,
  getEligibleStudentsForSchedule,
  getEligibleTeachersForSchedule,
  getTeacherAvailableCells,
} from "@/lib/classes/eligibility";
import type { PlannedSession, WeeklyCell, WeeklySlotInput } from "@/lib/classes/scheduling";

const userFindMany = prisma.user.findMany as unknown as Mock;
const sessionFindMany = prisma.classSession.findMany as unknown as Mock;
const levelFindMany = prisma.studentSubjectLevel.findMany as unknown as Mock;
const enrollmentFindMany = prisma.classEnrollment.findMany as unknown as Mock;
const roomFindMany = prisma.room.findMany as unknown as Mock;
const teacherAvailFindMany = prisma.teacherAvailability.findMany as unknown as Mock;
const occBetween = getOccupanciesBetween as unknown as Mock;

const MON_18_19: WeeklyCell = { dayOfWeek: "MON", slot: "EVENING_18_19" };

beforeEach(() => {
  for (const m of [
    userFindMany,
    sessionFindMany,
    levelFindMany,
    enrollmentFindMany,
    roomFindMany,
    teacherAvailFindMany,
    occBetween,
  ]) {
    m.mockReset().mockResolvedValue([]);
  }
});

// ── getTeacherAvailableCells ─────────────────────────────────
describe("getTeacherAvailableCells", () => {
  it("chỉ trả ô có mode hợp lệ; lớp OFFLINE loại ONLINE_ONLY và bỏ BUSY", async () => {
    teacherAvailFindMany.mockResolvedValue([
      { dayOfWeek: "MON", slot: "EVENING_18_19", availabilityMode: "BOTH" },
      { dayOfWeek: "MON", slot: "EVENING_19_20", availabilityMode: "ONLINE_ONLY" },
      { dayOfWeek: "TUE", slot: "EVENING_18_19", availabilityMode: "BUSY" },
    ]);
    expect(await getTeacherAvailableCells("t1", "OFFLINE")).toEqual(["MON_EVENING_18_19"]);
  });

  it("lớp ONLINE chấp nhận cả BOTH và ONLINE_ONLY", async () => {
    teacherAvailFindMany.mockResolvedValue([
      { dayOfWeek: "MON", slot: "EVENING_18_19", availabilityMode: "BOTH" },
      { dayOfWeek: "MON", slot: "EVENING_19_20", availabilityMode: "ONLINE_ONLY" },
    ]);
    expect(await getTeacherAvailableCells("t1", "ONLINE")).toEqual([
      "MON_EVENING_18_19",
      "MON_EVENING_19_20",
    ]);
  });
});

// ── getEligibleTeachersForSchedule ───────────────────────────
describe("getEligibleTeachersForSchedule", () => {
  const plannedSessions: PlannedSession[] = [
    { sessionNumber: 1, date: "2026-06-15", dayOfWeek: "MON", startTime: "18:00", endTime: "19:00" },
  ];

  it("không có ô nào ⇒ trả rỗng, không chạm DB", async () => {
    expect(
      await getEligibleTeachersForSchedule({ cells: [], mode: "OFFLINE", plannedSessions }),
    ).toEqual([]);
    expect(userFindMany).not.toHaveBeenCalled();
  });

  it("lọc GV theo lịch rảnh rồi loại GV trùng buổi đã có", async () => {
    userFindMany.mockResolvedValue([
      {
        id: "t1",
        name: "GV Một",
        email: "t1@x",
        teacherAvailability: [{ dayOfWeek: "MON", slot: "EVENING_18_19", availabilityMode: "BOTH" }],
      },
      { id: "t2", name: "GV Hai", email: "t2@x", teacherAvailability: [] }, // không rảnh
      {
        id: "t3",
        name: "GV Ba",
        email: "t3@x",
        teacherAvailability: [{ dayOfWeek: "MON", slot: "EVENING_18_19", availabilityMode: "BOTH" }],
      },
    ]);
    // t3 đã có buổi trùng giờ ngày 2026-06-15
    sessionFindMany.mockResolvedValue([
      { teacherId: "t3", date: new Date("2026-06-15T00:00:00"), startTime: "18:00", endTime: "19:00" },
    ]);

    const result = await getEligibleTeachersForSchedule({
      cells: [MON_18_19],
      mode: "OFFLINE",
      plannedSessions,
    });
    expect(result).toEqual([{ id: "t1", name: "GV Một", email: "t1@x" }]);
  });

  it("không GV nào rảnh ⇒ không truy vấn buổi học", async () => {
    userFindMany.mockResolvedValue([
      { id: "t2", name: "GV Hai", email: "t2@x", teacherAvailability: [] },
    ]);
    expect(
      await getEligibleTeachersForSchedule({ cells: [MON_18_19], mode: "OFFLINE", plannedSessions }),
    ).toEqual([]);
    expect(sessionFindMany).not.toHaveBeenCalled();
  });
});

// ── getEligibleRoomsBySlot ───────────────────────────────────
describe("getEligibleRoomsBySlot", () => {
  const slots: WeeklySlotInput[] = [{ dayOfWeek: "MON", startTime: "18:00", endTime: "20:00" }];
  const plannedSessions: PlannedSession[] = [
    { sessionNumber: 1, date: "2026-06-15", dayOfWeek: "MON", startTime: "18:00", endTime: "20:00" },
  ];

  it("rỗng khi không có khung hoặc không có buổi", async () => {
    expect(await getEligibleRoomsBySlot({ slots: [], plannedSessions })).toEqual([]);
    expect(await getEligibleRoomsBySlot({ slots, plannedSessions: [] })).toEqual([]);
  });

  it("loại phòng bị chiếm trùng giờ ở buổi của khung", async () => {
    roomFindMany.mockResolvedValue([
      { id: "r1", name: "P.101", capacity: 30 },
      { id: "r2", name: "P.102", capacity: 30 },
    ]);
    // r2 đã bị chiếm 18:00–20:00 ngày 2026-06-15
    occBetween.mockResolvedValue([
      {
        roomId: "r2",
        startsAt: new Date("2026-06-15T18:00:00"),
        endsAt: new Date("2026-06-15T20:00:00"),
        source: "CLASS_SESSION",
        label: "Lớp khác",
      },
    ]);

    const result = await getEligibleRoomsBySlot({ slots, plannedSessions });
    expect(result).toEqual([
      { slotKey: "MON_18:00_20:00", rooms: [{ id: "r1", name: "P.101", capacity: 30 }] },
    ]);
  });
});

// ── getEligibleStudentsForSchedule ───────────────────────────
describe("getEligibleStudentsForSchedule", () => {
  const cells = [MON_18_19];
  const plannedSessions: PlannedSession[] = [
    { sessionNumber: 1, date: "2026-06-15", dayOfWeek: "MON", startTime: "18:00", endTime: "19:00" },
  ];

  it("thiếu subjectId/targetLevel ⇒ rỗng, không chạm DB", async () => {
    expect(
      await getEligibleStudentsForSchedule({ cells, mode: "OFFLINE", subjectId: "", targetLevel: "AVERAGE", plannedSessions }),
    ).toEqual([]);
    expect(levelFindMany).not.toHaveBeenCalled();
  });

  it("gộp HS đúng năng lực + HS chưa đánh giá, xếp HS khớp lên trước", async () => {
    // s1: đánh giá mới nhất AVERAGE (khớp), s2: GOOD (không khớp) → chỉ s1 vào nhóm matched.
    levelFindMany.mockResolvedValue([
      { studentId: "s1", level: "AVERAGE" },
      { studentId: "s2", level: "GOOD" },
    ]);
    // user.findMany #1: HS chưa từng đánh giá (notIn [s1,s2]) → s3.
    userFindMany.mockResolvedValueOnce([{ id: "s3" }]);
    // user.findMany #2: ứng viên kèm lịch rảnh + đếm lớp đang học.
    const avail = [{ dayOfWeek: "MON", slot: "EVENING_18_19", availabilityMode: "BOTH" }];
    userFindMany.mockResolvedValueOnce([
      { id: "s1", name: "HS Một", email: "s1@x", studentAvailability: avail, _count: { classEnrollments: 1 } },
      { id: "s3", name: "HS Ba", email: "s3@x", studentAvailability: avail, _count: { classEnrollments: 0 } },
    ]);
    // s1 đang học lớp c1, nhưng c1 không có buổi trùng (classSession trả rỗng) ⇒ không bị loại.
    enrollmentFindMany.mockResolvedValue([{ studentId: "s1", classId: "c1" }]);
    sessionFindMany.mockResolvedValue([]);

    const result = await getEligibleStudentsForSchedule({
      cells,
      mode: "OFFLINE",
      subjectId: "subj-toan",
      targetLevel: "AVERAGE",
      plannedSessions,
    });

    expect(result).toEqual([
      { id: "s1", name: "HS Một", email: "s1@x", level: "AVERAGE", activeClassCount: 1 },
      { id: "s3", name: "HS Ba", email: "s3@x", level: null, activeClassCount: 0 },
    ]);
  });
});
