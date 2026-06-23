import { STUDENT_LEVELS } from "@/lib/constants/labels";

export type ExamKind = "EXAM" | "QUIZ";
export type AttendanceStatus = "PRESENT" | "LATE" | "ABSENT" | "EXCUSED";
export type StudentLevel = (typeof STUDENT_LEVELS)[number];

export type ExamScorePoint = { score: number; submittedAt: Date; title: string; kind: ExamKind };
export type AttendanceTally = { present: number; late: number; absent: number; excused: number; total: number };
export type EvalAvg = { performance: number | null; diligence: number | null; comprehension: number | null; n: number };

export type SubjectAnalytics = {
  subjectId: string;
  subjectName: string;
  examScores: ExamScorePoint[];
  attendance: AttendanceTally;
  evalAvg: EvalAvg;
};

export type StudentAnalytics = {
  bySubject: SubjectAnalytics[];
  overall: {
    examCount: number;
    examAvgScore: number | null;
    attendance: AttendanceTally;
    attendanceRate: number | null;
  };
};

export type AnalyticsInput = {
  examAttempts: { score: number; submittedAt: Date; exam: { title: string; kind: ExamKind; subjectId: string; subjectName: string } }[];
  attendances: { status: AttendanceStatus; subjectId: string; subjectName: string }[];
  sessionEvals: { performance: number | null; diligence: number | null; comprehension: number | null; subjectId: string; subjectName: string }[];
};

/** Quy tắc ngưỡng điểm → mức năng lực (đồng bộ lib/classes/actions/evaluation.ts:196). */
export function scoreToLevel(score: number): StudentLevel {
  return score < 50 ? "WEAK" : score < 80 ? "AVERAGE" : score < 90 ? "GOOD" : "EXCELLENT";
}

function emptyTally(): AttendanceTally {
  return { present: 0, late: 0, absent: 0, excused: 0, total: 0 };
}

function addToTally(t: AttendanceTally, status: AttendanceStatus): void {
  t.total += 1;
  if (status === "PRESENT") t.present += 1;
  else if (status === "LATE") t.late += 1;
  else if (status === "ABSENT") t.absent += 1;
  else if (status === "EXCUSED") t.excused += 1;
}

export function buildStudentAnalytics(input: AnalyticsInput): StudentAnalytics {
  const bySubject = new Map<string, SubjectAnalytics>();
  const ensure = (subjectId: string, subjectName: string): SubjectAnalytics => {
    let s = bySubject.get(subjectId);
    if (!s) {
      s = { subjectId, subjectName, examScores: [], attendance: emptyTally(), evalAvg: { performance: null, diligence: null, comprehension: null, n: 0 } };
      bySubject.set(subjectId, s);
    }
    return s;
  };

  for (const a of input.examAttempts) {
    const s = ensure(a.exam.subjectId, a.exam.subjectName);
    s.examScores.push({ score: a.score, submittedAt: a.submittedAt, title: a.exam.title, kind: a.exam.kind });
  }

  for (const at of input.attendances) {
    const s = ensure(at.subjectId, at.subjectName);
    addToTally(s.attendance, at.status);
  }

  const evalSums = new Map<string, { p: number; pn: number; d: number; dn: number; c: number; cn: number }>();
  for (const e of input.sessionEvals) {
    ensure(e.subjectId, e.subjectName);
    const cur = evalSums.get(e.subjectId) ?? { p: 0, pn: 0, d: 0, dn: 0, c: 0, cn: 0 };
    if (e.performance != null) { cur.p += e.performance; cur.pn += 1; }
    if (e.diligence != null) { cur.d += e.diligence; cur.dn += 1; }
    if (e.comprehension != null) { cur.c += e.comprehension; cur.cn += 1; }
    evalSums.set(e.subjectId, cur);
  }
  for (const [subjectId, sums] of evalSums) {
    const s = bySubject.get(subjectId)!;
    s.evalAvg = {
      performance: sums.pn ? sums.p / sums.pn : null,
      diligence: sums.dn ? sums.d / sums.dn : null,
      comprehension: sums.cn ? sums.c / sums.cn : null,
      n: sums.pn + sums.dn + sums.cn,
    };
  }

  for (const s of bySubject.values()) {
    s.examScores.sort((a, b) => a.submittedAt.getTime() - b.submittedAt.getTime());
  }

  const overall = emptyTally();
  for (const at of input.attendances) addToTally(overall, at.status);
  const scores = input.examAttempts.map((a) => a.score);
  const examAvgScore = scores.length ? scores.reduce((x, y) => x + y, 0) / scores.length : null;
  const presentish = overall.present + overall.late;
  const attendanceRate = overall.total ? presentish / overall.total : null;

  const subjects = [...bySubject.values()].sort((a, b) => a.subjectName.localeCompare(b.subjectName, "vi"));

  return {
    bySubject: subjects,
    overall: { examCount: input.examAttempts.length, examAvgScore, attendance: overall, attendanceRate },
  };
}
