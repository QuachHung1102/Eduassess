import { describe, it, expect } from "vitest";
import { buildStudentAnalytics, scoreToLevel, type AnalyticsInput } from "@/lib/students/analytics";

const empty: AnalyticsInput = { examAttempts: [], attendances: [], sessionEvals: [] };
const att = (status: "PRESENT" | "LATE" | "ABSENT" | "EXCUSED") => ({ status, subjectId: "s1", subjectName: "Toán" });

describe("scoreToLevel", () => {
  it("ánh xạ ngưỡng <50/50–79/80–89/≥90", () => {
    expect(scoreToLevel(0)).toBe("WEAK");
    expect(scoreToLevel(49.9)).toBe("WEAK");
    expect(scoreToLevel(50)).toBe("AVERAGE");
    expect(scoreToLevel(79)).toBe("AVERAGE");
    expect(scoreToLevel(80)).toBe("GOOD");
    expect(scoreToLevel(89)).toBe("GOOD");
    expect(scoreToLevel(90)).toBe("EXCELLENT");
    expect(scoreToLevel(100)).toBe("EXCELLENT");
  });
});

describe("buildStudentAnalytics", () => {
  it("ca rỗng → bySubject rỗng, overall null đúng", () => {
    const r = buildStudentAnalytics(empty);
    expect(r.bySubject).toEqual([]);
    expect(r.overall.examCount).toBe(0);
    expect(r.overall.examAvgScore).toBeNull();
    expect(r.overall.attendanceRate).toBeNull();
  });

  it("gom theo subjectId; examScores sắp tăng theo submittedAt; examAvgScore đúng", () => {
    const r = buildStudentAnalytics({
      examAttempts: [
        { score: 80, submittedAt: new Date("2026-03-02"), exam: { title: "B", kind: "EXAM", subjectId: "s1", subjectName: "Toán" } },
        { score: 60, submittedAt: new Date("2026-03-01"), exam: { title: "A", kind: "QUIZ", subjectId: "s1", subjectName: "Toán" } },
      ],
      attendances: [],
      sessionEvals: [],
    });
    expect(r.bySubject).toHaveLength(1);
    expect(r.bySubject[0].examScores.map((e) => e.title)).toEqual(["A", "B"]);
    expect(r.overall.examAvgScore).toBe(70);
    expect(r.overall.examCount).toBe(2);
  });

  it("attendanceRate: PRESENT+LATE = có mặt", () => {
    const r = buildStudentAnalytics({ examAttempts: [], attendances: [att("PRESENT"), att("LATE"), att("ABSENT"), att("EXCUSED")], sessionEvals: [] });
    expect(r.overall.attendance).toMatchObject({ present: 1, late: 1, absent: 1, excused: 1, total: 4 });
    expect(r.overall.attendanceRate).toBe(0.5);
    expect(r.bySubject[0].attendance.total).toBe(4);
  });

  it("evalAvg: bỏ qua null; chiều rỗng → null; n đúng", () => {
    const r = buildStudentAnalytics({
      examAttempts: [],
      attendances: [],
      sessionEvals: [
        { performance: 4, diligence: null, comprehension: 3, subjectId: "s1", subjectName: "Toán" },
        { performance: 2, diligence: null, comprehension: 5, subjectId: "s1", subjectName: "Toán" },
      ],
    });
    const e = r.bySubject[0].evalAvg;
    expect(e.performance).toBe(3);
    expect(e.diligence).toBeNull();
    expect(e.comprehension).toBe(4);
    expect(e.n).toBe(4);
  });

  it("nhiều môn → sắp theo tên môn (vi)", () => {
    const r = buildStudentAnalytics({
      examAttempts: [
        { score: 70, submittedAt: new Date("2026-01-01"), exam: { title: "X", kind: "EXAM", subjectId: "s2", subjectName: "Vật lý" } },
        { score: 70, submittedAt: new Date("2026-01-01"), exam: { title: "Y", kind: "EXAM", subjectId: "s1", subjectName: "Hóa học" } },
      ],
      attendances: [],
      sessionEvals: [],
    });
    expect(r.bySubject.map((s) => s.subjectName)).toEqual(["Hóa học", "Vật lý"]);
  });
});
