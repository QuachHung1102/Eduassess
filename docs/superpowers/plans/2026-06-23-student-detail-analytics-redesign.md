# Cải tiến khu Học sinh CBĐT — chi tiết theo môn + mã định danh — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hiện Mã định danh + thêm tìm kiếm ở khu staff Học sinh, và thiết kế lại trang chi tiết HS thành dạng tab với 4 biểu đồ phân tích theo môn.

**Architecture:** Một module thuần `lib/students/analytics.ts` (TDD) gom dữ liệu Exam/điểm danh/đánh giá-buổi theo môn; query `getStudentAnalytics` nạp DB rồi gọi module thuần (pattern *pure module + seam*). Tầng UI là các component SVG thuần (không thêm thư viện) + một container client quản lý tab. Trang danh sách lọc phía client (HS phụ trách) và mở rộng tìm-theo-mã phía server (`/all`).

**Tech Stack:** Next.js 16 (App Router, RSC), React 19, Prisma 7 (PostgreSQL), TailwindCSS 4, Vitest 4. Biểu đồ = SVG thuần.

## Global Constraints

- **UI tiếng Việt**, code/identifier tiếng Anh theo Glossary (`docs/context/platform.md §8`).
- **Không thêm thư viện biểu đồ** — chỉ SVG thuần, theo mẫu `components/students/ProficiencyTrend.tsx`.
- Nhãn/màu mức năng lực lấy từ `lib/constants/labels.ts` (`STUDENT_LEVEL_LABEL`/`STUDENT_LEVEL_COLOR`/`STUDENT_LEVEL_HEX`/`STUDENT_LEVELS`) — không hardcode.
- Ngưỡng điểm→mức: `<50` WEAK · `50–79` AVERAGE · `80–89` GOOD · `≥90` EXCELLENT (đồng bộ `lib/classes/actions/evaluation.ts:196`).
- `attendanceRate` & "có mặt": `PRESENT` **và** `LATE` đều tính là có mặt (đồng bộ `getMyStudentsOverview`).
- Module thuần `lib/students/analytics.ts` **không** import prisma (để component client import được helper `scoreToLevel`).
- Test runner: `npx vitest run <file>`. Typecheck: `npx tsc --noEmit`. Lint: `npm run lint`.
- Mọi đường ghi DB đã có; plan này **chỉ đọc** — không thêm migration, không sửa schema.

---

### Task 1: Module thuần `lib/students/analytics.ts` + test (TDD)

**Files:**
- Create: `lib/students/analytics.ts`
- Test: `tests/students/analytics.test.ts`

**Interfaces:**
- Produces:
  - `scoreToLevel(score: number): "WEAK" | "AVERAGE" | "GOOD" | "EXCELLENT"`
  - `buildStudentAnalytics(input: AnalyticsInput): StudentAnalytics`
  - Types: `AnalyticsInput`, `StudentAnalytics`, `SubjectAnalytics`, `ExamScorePoint`, `AttendanceTally`, `EvalAvg`, `ExamKind`, `AttendanceStatus`.
  - Shapes:
    - `ExamScorePoint = { score: number; submittedAt: Date; title: string; kind: "EXAM" | "QUIZ" }`
    - `AttendanceTally = { present: number; late: number; absent: number; excused: number; total: number }`
    - `EvalAvg = { performance: number | null; diligence: number | null; comprehension: number | null; n: number }`
    - `SubjectAnalytics = { subjectId: string; subjectName: string; examScores: ExamScorePoint[]; attendance: AttendanceTally; evalAvg: EvalAvg }`
    - `StudentAnalytics = { bySubject: SubjectAnalytics[]; overall: { examCount: number; examAvgScore: number | null; attendance: AttendanceTally; attendanceRate: number | null } }`
    - `AnalyticsInput = { examAttempts: { score: number; submittedAt: Date; exam: { title: string; kind: "EXAM"|"QUIZ"; subjectId: string; subjectName: string } }[]; attendances: { status: "PRESENT"|"LATE"|"ABSENT"|"EXCUSED"; subjectId: string; subjectName: string }[]; sessionEvals: { performance: number|null; diligence: number|null; comprehension: number|null; subjectId: string; subjectName: string }[] }`

- [ ] **Step 1: Write the failing test**

Create `tests/students/analytics.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/students/analytics.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/students/analytics"` (file chưa tồn tại).

- [ ] **Step 3: Write minimal implementation**

Create `lib/students/analytics.ts`:

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/students/analytics.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/students/analytics.ts tests/students/analytics.test.ts
git commit -m "feat(students): module thuần phân tích theo môn (analytics) + test"
```

---

### Task 2: Query `getStudentAnalytics` + bổ sung `code` vào các select

**Files:**
- Modify: `lib/classes/queries.ts` (thêm `getStudentAnalytics`; thêm `code` vào `getMyStudents`, `getStudentDetail`, `getAllStudentsFiltered`)

**Interfaces:**
- Consumes: `buildStudentAnalytics` (Task 1).
- Produces:
  - `getStudentAnalytics(studentId: string): Promise<StudentAnalytics>`
  - `getMyStudents()` → mỗi `student` có thêm `code: string | null`.
  - `getStudentDetail()` → `student.code: string | null`.
  - `getAllStudentsFiltered()` → mỗi phần tử có thêm `code: string | null`; `q` khớp thêm `code`.

- [ ] **Step 1: Thêm import + hàm `getStudentAnalytics`**

Ở đầu `lib/classes/queries.ts`, sau dòng `import { getOccupanciesBetween } from "@/lib/rooms/store";`, thêm:

```ts
import { buildStudentAnalytics, type StudentAnalytics } from "@/lib/students/analytics";
```

Cuối phần "Học sinh được phân cho CBDT" (ngay trước `getStudentDetail`), thêm:

```ts
/**
 * Phân tích theo môn cho trang chi tiết HS: điểm Exam (đã nộp+chấm),
 * điểm danh và đánh giá-buổi — gom theo môn qua module thuần.
 */
export async function getStudentAnalytics(studentId: string): Promise<StudentAnalytics> {
  const [examAttempts, attendances, sessionEvals] = await Promise.all([
    prisma.examAttempt.findMany({
      where: { studentId, submittedAt: { not: null }, score: { not: null } },
      select: {
        score: true,
        submittedAt: true,
        exam: { select: { title: true, kind: true, subjectId: true, subject: { select: { name: true } } } },
      },
      orderBy: { submittedAt: "asc" },
    }),
    prisma.attendance.findMany({
      where: { studentId },
      select: { status: true, session: { select: { class: { select: { subjectId: true, subject: { select: { name: true } } } } } } },
    }),
    prisma.sessionEvaluation.findMany({
      where: { studentId },
      select: {
        performance: true,
        diligence: true,
        comprehension: true,
        session: { select: { class: { select: { subjectId: true, subject: { select: { name: true } } } } } },
      },
    }),
  ]);

  return buildStudentAnalytics({
    examAttempts: examAttempts.map((a) => ({
      score: a.score as number,
      submittedAt: a.submittedAt as Date,
      exam: { title: a.exam.title, kind: a.exam.kind, subjectId: a.exam.subjectId, subjectName: a.exam.subject.name },
    })),
    attendances: attendances.map((at) => ({
      status: at.status,
      subjectId: at.session.class.subjectId,
      subjectName: at.session.class.subject.name,
    })),
    sessionEvals: sessionEvals.map((e) => ({
      performance: e.performance,
      diligence: e.diligence,
      comprehension: e.comprehension,
      subjectId: e.session.class.subjectId,
      subjectName: e.session.class.subject.name,
    })),
  });
}
```

- [ ] **Step 2: Thêm `code` vào `getMyStudents`**

Trong `getMyStudents`, ở `student: { select: { ... } }` thêm `code: true` (cạnh `email`):

```ts
        select: {
          id: true,
          name: true,
          email: true,
          code: true,
          sex: true,
          phoneNumber: true,
          dateOfBirth: true,
          classEnrollments: {
            where: { status: "ACTIVE" },
            include: { class: { include: { subject: true } } },
          },
        },
```

- [ ] **Step 3: Thêm `code` vào `getStudentDetail`**

Trong `getStudentDetail`, ở `prisma.user.findUnique({ ... select: { ... } })` thêm `code: true` (cạnh `email`):

```ts
      select: {
        id: true,
        name: true,
        email: true,
        code: true,
        sex: true,
        phoneNumber: true,
        dateOfBirth: true,
        address: true,
        classEnrollments: {
```

- [ ] **Step 4: Thêm `code` vào `getAllStudentsFiltered` (select + OR + kết quả)**

Trong `getAllStudentsFiltered`:

a) Nhánh `OR` của `q` thêm dòng `code`:

```ts
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" as const } },
              { email: { contains: q, mode: "insensitive" as const } },
              { code: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
```

b) `select` thêm `code: true`:

```ts
    select: {
      id: true,
      name: true,
      email: true,
      code: true,
      studentAdvisees: { select: { advisor: { select: { name: true } } } },
    },
```

c) Trong `result = students.map((s) => ({ ... }))` thêm `code: s.code`:

```ts
  let result = students.map((s) => ({
    id: s.id,
    name: s.name,
    email: s.email,
    code: s.code,
    advisors: s.studentAdvisees.map((a) => a.advisor.name).filter(Boolean) as string[],
    levels: latestBySubject.get(s.id) ?? [],
    subjectLevel: filters.subjectId ? subjLevelByStudent.get(s.id) ?? null : null,
  }));
```

- [ ] **Step 5: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: Không lỗi mới liên quan `lib/classes/queries.ts` / `lib/students/analytics.ts`.

- [ ] **Step 6: Commit**

```bash
git add lib/classes/queries.ts
git commit -m "feat(students): query getStudentAnalytics + expose code ở các query HS"
```

---

### Task 3: Component `ExamScoreTrend` (SVG thuần)

**Files:**
- Create: `components/students/ExamScoreTrend.tsx`

**Interfaces:**
- Consumes: `scoreToLevel` (Task 1), `STUDENT_LEVEL_HEX` (`lib/constants/labels.ts`).
- Produces: `ExamScoreTrend({ points }: { points: { score: number; submittedAt: Date | string; title: string; kind: "EXAM" | "QUIZ" }[] })`.

- [ ] **Step 1: Viết component**

Create `components/students/ExamScoreTrend.tsx`:

```tsx
import { STUDENT_LEVEL_HEX } from "@/lib/constants/labels";
import { scoreToLevel } from "@/lib/students/analytics";

type Point = { score: number; submittedAt: Date | string; title: string; kind: "EXAM" | "QUIZ" };

const W = 320;
const H = 120;
const M = { left: 30, right: 12, top: 10, bottom: 22 };
const PW = W - M.left - M.right;
const PH = H - M.top - M.bottom;
const Y_TICKS = [0, 25, 50, 75, 100];

function fmt(d: Date | string): string {
  return new Date(d).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

/** Đường điểm bài kiểm tra (0–100) theo thời gian nộp; điểm tô màu theo mức năng lực. */
export function ExamScoreTrend({ points }: { points: Point[] }) {
  if (points.length === 0) {
    return <p className="text-xs text-foreground/45">Chưa có bài kiểm tra đã chấm</p>;
  }
  const pts = [...points].sort((a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime());
  const n = pts.length;
  const xOf = (i: number) => (n > 1 ? M.left + (i / (n - 1)) * PW : M.left + PW / 2);
  const yOf = (score: number) => M.top + (1 - score / 100) * PH;
  const coords = pts.map((p, i) => ({ x: xOf(i), y: yOf(p.score), p }));
  const polyline = coords.map((c) => `${c.x},${c.y}`).join(" ");

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid meet"
      className="h-auto w-full"
      role="img"
      aria-label={`Điểm bài kiểm tra: ${pts.map((p) => `${p.title} ${p.score}`).join(", ")}`}
    >
      {Y_TICKS.map((t) => {
        const y = yOf(t);
        return (
          <g key={t} className="text-foreground/40">
            <line x1={M.left} y1={y} x2={W - M.right} y2={y} stroke="currentColor" strokeWidth={0.5} opacity={0.35} />
            <text x={M.left - 5} y={y + 3} textAnchor="end" fill="currentColor" fontSize={9}>{t}</text>
          </g>
        );
      })}

      {n > 1 && (
        <polyline points={polyline} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" className="text-primary" />
      )}

      {coords.map((c, i) => (
        <circle key={i} cx={c.x} cy={c.y} r={3.5} fill={STUDENT_LEVEL_HEX[scoreToLevel(c.p.score)]}>
          <title>{`${c.p.title} · ${c.p.score} điểm · ${fmt(c.p.submittedAt)}`}</title>
        </circle>
      ))}

      <g className="text-foreground/40" fill="currentColor" fontSize={9}>
        {n > 1 ? (
          <>
            <text x={M.left} y={H - 6} textAnchor="start">{fmt(pts[0].submittedAt)}</text>
            <text x={W - M.right} y={H - 6} textAnchor="end">{fmt(pts[n - 1].submittedAt)}</text>
          </>
        ) : (
          <text x={M.left + PW / 2} y={H - 6} textAnchor="middle">{fmt(pts[0].submittedAt)}</text>
        )}
      </g>
    </svg>
  );
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: Không lỗi.

- [ ] **Step 3: Commit**

```bash
git add components/students/ExamScoreTrend.tsx
git commit -m "feat(students): biểu đồ đường điểm Exam theo thời gian"
```

---

### Task 4: Component `AttendanceDonut` (SVG thuần)

**Files:**
- Create: `components/students/AttendanceDonut.tsx`

**Interfaces:**
- Produces: `AttendanceDonut({ tally }: { tally: { present: number; late: number; absent: number; excused: number; total: number } })`.

- [ ] **Step 1: Viết component**

Create `components/students/AttendanceDonut.tsx`:

```tsx
type Tally = { present: number; late: number; absent: number; excused: number; total: number };

const SEG = [
  { key: "present", label: "Có mặt", color: "#22c55e" },
  { key: "late", label: "Đi muộn", color: "#eab308" },
  { key: "absent", label: "Vắng", color: "#ef4444" },
  { key: "excused", label: "Có phép", color: "#94a3b8" },
] as const;

const R = 42;
const C = 50;
const STROKE = 16;
const CIRC = 2 * Math.PI * R;

/** Donut tỉ lệ điểm danh 4 trạng thái; tâm hiển thị % có mặt (PRESENT+LATE). */
export function AttendanceDonut({ tally }: { tally: Tally }) {
  if (tally.total === 0) {
    return <p className="text-xs text-foreground/45">Chưa có dữ liệu điểm danh</p>;
  }
  const rate = Math.round(((tally.present + tally.late) / tally.total) * 100);
  let offset = 0;
  const arcs = SEG.map((s) => {
    const frac = tally[s.key] / tally.total;
    const dash = frac * CIRC;
    const el = (
      <circle
        key={s.key}
        cx={C}
        cy={C}
        r={R}
        fill="none"
        stroke={s.color}
        strokeWidth={STROKE}
        strokeDasharray={`${dash} ${CIRC - dash}`}
        strokeDashoffset={-offset}
        transform={`rotate(-90 ${C} ${C})`}
      />
    );
    offset += dash;
    return el;
  });

  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 100 100" className="h-28 w-28 shrink-0" role="img" aria-label={`Tỉ lệ có mặt ${rate}%`}>
        {arcs}
        <text x={C} y={C - 2} textAnchor="middle" fontSize={18} fontWeight={700} fill="currentColor" className="text-foreground">{rate}%</text>
        <text x={C} y={C + 12} textAnchor="middle" fontSize={8} fill="currentColor" className="text-foreground/50">có mặt</text>
      </svg>
      <ul className="space-y-1 text-xs">
        {SEG.map((s) => (
          <li key={s.key} className="flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
            <span className="text-foreground/70">{s.label}</span>
            <span className="font-medium text-foreground">{tally[s.key]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: Không lỗi.

- [ ] **Step 3: Commit**

```bash
git add components/students/AttendanceDonut.tsx
git commit -m "feat(students): donut tỉ lệ điểm danh"
```

---

### Task 5: Component `SessionEvalRadar` (SVG thuần)

**Files:**
- Create: `components/students/SessionEvalRadar.tsx`

**Interfaces:**
- Produces: `SessionEvalRadar({ dims }: { dims: { performance: number | null; diligence: number | null; comprehension: number | null } })`.

- [ ] **Step 1: Viết component**

Create `components/students/SessionEvalRadar.tsx`:

```tsx
type Dims = { performance: number | null; diligence: number | null; comprehension: number | null };

const AXES = [
  { key: "performance", label: "Năng lực" },
  { key: "diligence", label: "Chuyên cần" },
  { key: "comprehension", label: "Tiếp thu" },
] as const;

const CX = 60;
const CY = 60;
const RADIUS = 38;
const MAXV = 5;

function axisAngle(i: number): number {
  return -Math.PI / 2 + (i * 2 * Math.PI) / 3;
}
function point(i: number, value: number): { x: number; y: number } {
  const r = (value / MAXV) * RADIUS;
  const a = axisAngle(i);
  return { x: CX + r * Math.cos(a), y: CY + r * Math.sin(a) };
}

/** Radar tam giác 3 chiều đánh giá-buổi (thang 1–5). Chiều null vẽ về tâm + ghi "—". */
export function SessionEvalRadar({ dims }: { dims: Dims }) {
  const values = AXES.map((ax) => dims[ax.key]);
  if (values.every((v) => v == null)) {
    return <p className="text-xs text-foreground/45">Chưa có đánh giá sau buổi học</p>;
  }
  const dataPts = AXES.map((_, i) => point(i, values[i] ?? 0));
  const polygon = dataPts.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <div className="flex flex-col items-center">
      <svg
        viewBox="0 0 120 120"
        className="h-36 w-36"
        role="img"
        aria-label={`Đánh giá buổi học: ${AXES.map((ax, i) => `${ax.label} ${values[i] ?? "—"}`).join(", ")}`}
      >
        {[1, 2, 3, 4, 5].map((lvl) => {
          const ring = AXES.map((_, i) => point(i, lvl)).map((p) => `${p.x},${p.y}`).join(" ");
          return <polygon key={lvl} points={ring} fill="none" stroke="currentColor" strokeWidth={0.4} opacity={0.3} className="text-foreground/40" />;
        })}

        {AXES.map((ax, i) => {
          const tip = point(i, MAXV);
          const lp = point(i, MAXV + 1.15);
          return (
            <g key={ax.key} className="text-foreground/60">
              <line x1={CX} y1={CY} x2={tip.x} y2={tip.y} stroke="currentColor" strokeWidth={0.4} opacity={0.4} />
              <text x={lp.x} y={lp.y} textAnchor="middle" dominantBaseline="middle" fontSize={7.5} fill="currentColor">{ax.label}</text>
            </g>
          );
        })}

        <polygon points={polygon} fill="#6366f1" fillOpacity={0.25} stroke="#6366f1" strokeWidth={1.2} />
        {dataPts.map((p, i) => (values[i] != null ? <circle key={i} cx={p.x} cy={p.y} r={2} fill="#6366f1" /> : null))}
      </svg>
      <div className="mt-1 flex gap-3 text-[11px] text-foreground/60">
        {AXES.map((ax, i) => (
          <span key={ax.key}>{ax.label}: <span className="font-medium text-foreground">{values[i] != null ? values[i]!.toFixed(1) : "—"}</span></span>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: Không lỗi.

- [ ] **Step 3: Commit**

```bash
git add components/students/SessionEvalRadar.tsx
git commit -m "feat(students): radar đánh giá-buổi 3 chiều"
```

---

### Task 6: Component `SubjectAnalyticsPanel`

**Files:**
- Create: `components/students/SubjectAnalyticsPanel.tsx`

**Interfaces:**
- Consumes: `ProficiencyTrend` (`./ProficiencyTrend`), `ExamScoreTrend` (Task 3), `AttendanceDonut` (Task 4), `SessionEvalRadar` (Task 5), `SubjectAnalytics` type (Task 1).
- Produces: `SubjectAnalyticsPanel({ subjectName, analytics, levelPoints }: { subjectName: string; analytics: SubjectAnalytics | undefined; levelPoints: { level: string; evaluatedAt: Date | string; subject: { id: string; name: string } }[] })`.

> Lưu ý: `ProficiencyTrend` tự gom theo môn & tự hiển thị tên môn + mức mới nhất, nên truyền `levelPoints` đã lọc còn 1 môn là ra đúng 1 đường.

- [ ] **Step 1: Viết component**

Create `components/students/SubjectAnalyticsPanel.tsx`:

```tsx
import { ProficiencyTrend } from "./ProficiencyTrend";
import { ExamScoreTrend } from "./ExamScoreTrend";
import { AttendanceDonut } from "./AttendanceDonut";
import { SessionEvalRadar } from "./SessionEvalRadar";
import type { SubjectAnalytics } from "@/lib/students/analytics";

type LevelPoint = { level: string; evaluatedAt: Date | string; subject: { id: string; name: string } };

const EMPTY_TALLY = { present: 0, late: 0, absent: 0, excused: 0, total: 0 };
const EMPTY_DIMS = { performance: null, diligence: null, comprehension: null };

/** 4 biểu đồ phân tích cho MỘT môn, xếp ngang (lưới 2 cột), tự xuống hàng khi hẹp. */
export function SubjectAnalyticsPanel({
  subjectName,
  analytics,
  levelPoints,
}: {
  subjectName: string;
  analytics: SubjectAnalytics | undefined;
  levelPoints: LevelPoint[];
}) {
  const hasAny =
    levelPoints.length > 0 ||
    (analytics && (analytics.examScores.length > 0 || analytics.attendance.total > 0 || analytics.evalAvg.n > 0));

  if (!hasAny) {
    return <p className="text-sm text-foreground/45">Môn {subjectName} chưa có dữ liệu phân tích.</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <div className="clay-card p-4">
        <h3 className="mb-2 text-sm font-medium text-foreground/70">Quỹ đạo năng lực</h3>
        {levelPoints.length > 0 ? (
          <ProficiencyTrend levelHistory={levelPoints} />
        ) : (
          <p className="text-xs text-foreground/45">Chưa đánh giá năng lực môn này</p>
        )}
      </div>
      <div className="clay-card p-4">
        <h3 className="mb-2 text-sm font-medium text-foreground/70">Điểm bài kiểm tra</h3>
        <ExamScoreTrend points={analytics?.examScores ?? []} />
      </div>
      <div className="clay-card p-4">
        <h3 className="mb-2 text-sm font-medium text-foreground/70">Điểm danh môn</h3>
        <AttendanceDonut tally={analytics?.attendance ?? EMPTY_TALLY} />
      </div>
      <div className="clay-card p-4">
        <h3 className="mb-2 text-sm font-medium text-foreground/70">Đánh giá sau buổi học</h3>
        <SessionEvalRadar dims={analytics?.evalAvg ?? EMPTY_DIMS} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: Không lỗi.

- [ ] **Step 3: Commit**

```bash
git add components/students/SubjectAnalyticsPanel.tsx
git commit -m "feat(students): panel ghép 4 biểu đồ phân tích theo môn"
```

---

### Task 7: Container `StudentDetailTabs` (client) + viết lại `page.tsx`

**Files:**
- Create: `components/students/StudentDetailTabs.tsx`
- Modify: `app/(dashboard)/staff/students/[id]/page.tsx`

**Interfaces:**
- Consumes: `SubjectAnalyticsPanel` (Task 6), `AttendanceDonut` (Task 4), `EvaluateForm` (`../../app/(dashboard)/staff/students/[id]/EvaluateForm` → import qua alias `@/app/(dashboard)/staff/students/[id]/EvaluateForm`), `AvailabilityMatrix` (`@/components/availability/AvailabilityMatrix`), `saveStudentAvailabilityAction` (`@/lib/classes/actions/availability`), `StudentAnalytics` type (Task 1), `getStudentDetail`/`getStudentAnalytics`/`getSubjectsList`/`canEvaluateStudent` (`@/lib/classes/queries`).
- Produces: `StudentDetailTabs(props)` — props liệt kê trong Step 1.

- [ ] **Step 1: Viết `StudentDetailTabs.tsx`**

Create `components/students/StudentDetailTabs.tsx`:

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { AvailabilityMatrix } from "@/components/availability/AvailabilityMatrix";
import { saveStudentAvailabilityAction } from "@/lib/classes/actions/availability";
import { EvaluateForm } from "@/app/(dashboard)/staff/students/[id]/EvaluateForm";
import { SubjectAnalyticsPanel } from "./SubjectAnalyticsPanel";
import { AttendanceDonut } from "./AttendanceDonut";
import { STUDENT_LEVEL_LABEL, STUDENT_LEVEL_COLOR } from "@/lib/constants/labels";
import type { StudentAnalytics } from "@/lib/students/analytics";
import type { DayOfWeek, TimeSlot, AvailabilityMode } from "@/lib/types";

type LevelHistoryItem = { id: string; level: string; subjectId: string; subjectName: string; note: string | null; evaluatedAt: string };
type ClassItem = { id: string; name: string; subjectName: string; advisorName: string | null; status: string };
type Header = { name: string; code: string | null; email: string; sex: string | null; dateOfBirth: string | null; phoneNumber: string | null; advisorNames: string[] };

const CLASS_STATUS_LABEL: Record<string, string> = {
  DRAFT: "Nháp", RECRUITING: "Tuyển sinh", ONGOING: "Đang học", COMPLETED: "Hoàn thành", CANCELLED: "Đã hủy",
};
const TABS = ["overview", "subjects", "availability", "evaluation"] as const;
type Tab = (typeof TABS)[number];
const TAB_LABEL: Record<Tab, string> = {
  overview: "Tổng quan", subjects: "Năng lực theo môn", availability: "Lịch rảnh", evaluation: "Đánh giá",
};

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-foreground/5 px-3 py-2">
      <p className="text-xs text-foreground/50">{label}</p>
      <p className="text-lg font-bold text-foreground">{value}</p>
    </div>
  );
}

export function StudentDetailTabs({
  studentId,
  header,
  classEnrollments,
  analytics,
  levelHistory,
  subjectTabList,
  availability,
  subjects,
  canEvaluate,
}: {
  studentId: string;
  header: Header;
  classEnrollments: ClassItem[];
  analytics: StudentAnalytics;
  levelHistory: LevelHistoryItem[];
  subjectTabList: { id: string; name: string }[];
  availability: { dayOfWeek: string; slot: string; availabilityMode: string }[];
  subjects: { id: string; name: string }[];
  canEvaluate: boolean;
}) {
  const [tab, setTab] = useState<Tab>("overview");
  const [subjectId, setSubjectId] = useState<string>(subjectTabList[0]?.id ?? "");

  const currentLevelBySubject = new Map<string, string>();
  for (const lv of levelHistory) if (!currentLevelBySubject.has(lv.subjectId)) currentLevelBySubject.set(lv.subjectId, lv.level);

  const initial = header.name?.[0]?.toUpperCase() ?? "?";

  return (
    <div className="flex flex-col gap-5">
      <Link href="/staff/students" className="text-sm text-primary hover:underline">← Danh sách học sinh</Link>

      {/* Header (luôn hiện) */}
      <div className="clay-card p-5">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/15 text-lg font-bold text-primary">{initial}</div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-foreground">{header.name}</h1>
            <p className="text-sm text-foreground/60">
              {header.email}
              {header.code && <span className="ml-2 font-mono text-xs text-foreground/45">{header.code}</span>}
            </p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          {[
            { label: "Giới tính", value: header.sex === "MALE" ? "Nam" : header.sex === "FEMALE" ? "Nữ" : "—" },
            { label: "Ngày sinh", value: header.dateOfBirth ? new Date(header.dateOfBirth).toLocaleDateString("vi-VN") : "—" },
            { label: "Điện thoại", value: header.phoneNumber ?? "—" },
            { label: "CBĐT phụ trách", value: header.advisorNames.join(", ") || "—" },
          ].map((f) => (
            <div key={f.label}>
              <p className="mb-0.5 text-xs text-foreground/45">{f.label}</p>
              <p className="font-medium text-foreground">{f.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tab nav */}
      <div className="flex flex-wrap gap-1 border-b border-soft">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${tab === t ? "border-primary text-primary" : "border-transparent text-foreground/60 hover:text-foreground"}`}
          >
            {TAB_LABEL[t]}
          </button>
        ))}
      </div>

      {/* Tab: Tổng quan */}
      {tab === "overview" && (
        <div className="flex flex-col gap-5">
          {classEnrollments.length > 0 && (
            <div className="clay-card overflow-hidden p-0">
              <div className="border-b border-soft px-4 py-3">
                <h2 className="text-sm font-semibold text-foreground">Lớp đang học ({classEnrollments.length})</h2>
              </div>
              {classEnrollments.map((e) => (
                <div key={e.id} className="flex items-center justify-between border-t border-soft px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{e.name}</p>
                    <p className="text-xs text-foreground/60">{e.subjectName}{e.advisorName ? ` · CBĐT: ${e.advisorName}` : ""}</p>
                  </div>
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">{CLASS_STATUS_LABEL[e.status] ?? e.status}</span>
                </div>
              ))}
            </div>
          )}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <div className="clay-card p-4">
              <h2 className="mb-3 font-semibold text-foreground">Thống kê nhanh</h2>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Stat label="Môn đã đánh giá" value={String(currentLevelBySubject.size)} />
                <Stat label="Bài KT đã làm" value={String(analytics.overall.examCount)} />
                <Stat label="Điểm TB" value={analytics.overall.examAvgScore != null ? analytics.overall.examAvgScore.toFixed(1) : "—"} />
                <Stat label="Tỉ lệ có mặt" value={analytics.overall.attendanceRate != null ? `${Math.round(analytics.overall.attendanceRate * 100)}%` : "—"} />
              </div>
              {currentLevelBySubject.size > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {[...currentLevelBySubject.entries()].map(([sid, level]) => {
                    const name = subjectTabList.find((s) => s.id === sid)?.name ?? "";
                    return (
                      <span key={sid} className={`rounded-full px-2 py-0.5 text-xs font-medium ${STUDENT_LEVEL_COLOR[level] ?? "bg-gray-100 text-gray-600"}`}>
                        {name}: {STUDENT_LEVEL_LABEL[level] ?? level}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="clay-card p-4">
              <h2 className="mb-3 font-semibold text-foreground">Điểm danh tổng</h2>
              <AttendanceDonut tally={analytics.overall.attendance} />
            </div>
          </div>
        </div>
      )}

      {/* Tab: Năng lực theo môn */}
      {tab === "subjects" && (
        <div className="flex flex-col gap-4">
          {subjectTabList.length === 0 ? (
            <p className="text-sm text-foreground/45">Học sinh chưa có dữ liệu môn nào.</p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                {subjectTabList.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSubjectId(s.id)}
                    className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${subjectId === s.id ? "bg-primary text-white" : "bg-foreground/5 text-foreground/70 hover:bg-foreground/10"}`}
                  >
                    {s.name}
                    {currentLevelBySubject.has(s.id) && <span className="ml-1.5 opacity-80">· {STUDENT_LEVEL_LABEL[currentLevelBySubject.get(s.id)!]}</span>}
                  </button>
                ))}
              </div>
              <SubjectAnalyticsPanel
                subjectName={subjectTabList.find((s) => s.id === subjectId)?.name ?? ""}
                analytics={analytics.bySubject.find((b) => b.subjectId === subjectId)}
                levelPoints={levelHistory
                  .filter((lv) => lv.subjectId === subjectId)
                  .map((lv) => ({ level: lv.level, evaluatedAt: lv.evaluatedAt, subject: { id: lv.subjectId, name: lv.subjectName } }))}
              />
            </>
          )}
        </div>
      )}

      {/* Tab: Lịch rảnh */}
      {tab === "availability" && (
        <div className="clay-card p-4">
          <h2 className="mb-4 font-semibold text-foreground">Lịch rảnh hàng tuần</h2>
          <AvailabilityMatrix
            initial={availability.map((a) => ({
              dayOfWeek: a.dayOfWeek as DayOfWeek,
              slot: a.slot as TimeSlot,
              availabilityMode: a.availabilityMode as AvailabilityMode,
            }))}
            onSave={(slots) => saveStudentAvailabilityAction(studentId, slots)}
          />
        </div>
      )}

      {/* Tab: Đánh giá */}
      {tab === "evaluation" && (
        <div className="flex flex-col gap-5">
          <div className="clay-card p-4">
            <h2 className="mb-4 font-semibold text-foreground">Đánh giá năng lực</h2>
            {canEvaluate ? (
              <EvaluateForm studentId={studentId} subjects={subjects} />
            ) : (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-600">
                Bạn không phụ trách học sinh này nên không thể đánh giá. Chỉ CBĐT được CBDTS phân công mới đánh giá được.
              </p>
            )}
          </div>
          <div className="clay-card p-4">
            <h3 className="mb-2 text-sm font-medium text-foreground/60">Lịch sử đánh giá</h3>
            {levelHistory.length === 0 ? (
              <p className="text-xs text-foreground/45">Chưa có đánh giá nào</p>
            ) : (
              <div className="max-h-72 space-y-2 overflow-auto">
                {levelHistory.map((lv) => (
                  <div key={lv.id} className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-sm font-medium text-foreground">{lv.subjectName}</span>
                      {lv.note && <span className="ml-2 text-xs italic text-foreground/45">{lv.note}</span>}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STUDENT_LEVEL_COLOR[lv.level] ?? "bg-gray-100 text-gray-600"}`}>{STUDENT_LEVEL_LABEL[lv.level] ?? lv.level}</span>
                      <span className="text-xs text-foreground/45">{new Date(lv.evaluatedAt).toLocaleDateString("vi-VN")}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Viết lại `app/(dashboard)/staff/students/[id]/page.tsx`**

Thay toàn bộ nội dung file bằng:

```tsx
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getStudentDetail, getStudentAnalytics, getSubjectsList, canEvaluateStudent } from "@/lib/classes/queries";
import { StudentDetailTabs } from "@/components/students/StudentDetailTabs";

export const dynamic = "force-dynamic";

export default async function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [data, analytics, subjects] = await Promise.all([
    getStudentDetail(id),
    getStudentAnalytics(id),
    getSubjectsList(),
  ]);
  if (!data.student) notFound();

  const { student, availability, levelHistory, advisorLinks } = data;

  const sessionUser = (await auth())?.user;
  const canEvaluate = sessionUser ? await canEvaluateStudent(sessionUser, id) : false;

  const levelHistoryItems = levelHistory.map((lv) => ({
    id: lv.id,
    level: lv.level,
    subjectId: lv.subject.id,
    subjectName: lv.subject.name,
    note: lv.note,
    evaluatedAt: lv.evaluatedAt.toISOString(),
  }));

  // Danh sách môn cho tab "Năng lực theo môn" = hợp môn có đánh giá ∪ môn có dữ liệu phân tích.
  const subjMap = new Map<string, string>();
  for (const lv of levelHistory) subjMap.set(lv.subject.id, lv.subject.name);
  for (const b of analytics.bySubject) subjMap.set(b.subjectId, b.subjectName);
  const subjectTabList = [...subjMap.entries()]
    .map(([sid, name]) => ({ id: sid, name }))
    .sort((a, b) => a.name.localeCompare(b.name, "vi"));

  return (
    <StudentDetailTabs
      studentId={id}
      header={{
        name: student.name,
        code: student.code,
        email: student.email,
        sex: student.sex,
        dateOfBirth: student.dateOfBirth ? student.dateOfBirth.toISOString() : null,
        phoneNumber: student.phoneNumber,
        advisorNames: advisorLinks.map((a) => a.advisor.name).filter(Boolean) as string[],
      }}
      classEnrollments={student.classEnrollments.map((e) => ({
        id: e.class.id,
        name: e.class.name,
        subjectName: e.class.subject.name,
        advisorName: e.class.advisor.name,
        status: e.class.status,
      }))}
      analytics={analytics}
      levelHistory={levelHistoryItems}
      subjectTabList={subjectTabList}
      availability={availability.map((a) => ({ dayOfWeek: a.dayOfWeek, slot: a.slot, availabilityMode: a.availabilityMode }))}
      subjects={subjects}
      canEvaluate={canEvaluate}
    />
  );
}
```

- [ ] **Step 3: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: Không lỗi. (Nếu báo `student.code` không tồn tại → Task 2 Step 3 chưa xong.)

- [ ] **Step 4: Verify build trang**

Run: `npm run build`
Expected: Build thành công, không lỗi RSC (server truyền props serializable cho client component).

- [ ] **Step 5: Commit**

```bash
git add "components/students/StudentDetailTabs.tsx" "app/(dashboard)/staff/students/[id]/page.tsx"
git commit -m "feat(students): trang chi tiết HS dạng tab + phân tích theo môn"
```

---

### Task 8: `/staff/students` — tìm kiếm client + hiện Mã

**Files:**
- Create: `app/(dashboard)/staff/students/StudentsListClient.tsx`
- Modify: `app/(dashboard)/staff/students/page.tsx`

**Interfaces:**
- Consumes: `getMyStudents` (đã có `code` từ Task 2), `STUDENT_LEVEL_LABEL`/`STUDENT_LEVEL_COLOR`.
- Produces: `StudentsListClient({ students }: { students: StudentCard[] })` với `StudentCard = { id: string; name: string; email: string; code: string | null; activeCount: number; levels: { subjectId: string; subjectName: string; level: string }[] }`.

- [ ] **Step 1: Viết `StudentsListClient.tsx`**

Create `app/(dashboard)/staff/students/StudentsListClient.tsx`:

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { STUDENT_LEVEL_LABEL as LEVEL_LABEL, STUDENT_LEVEL_COLOR as LEVEL_COLOR } from "@/lib/constants/labels";

type StudentCard = {
  id: string;
  name: string;
  email: string;
  code: string | null;
  activeCount: number;
  levels: { subjectId: string; subjectName: string; level: string }[];
};

export function StudentsListClient({ students }: { students: StudentCard[] }) {
  const [q, setQ] = useState("");
  const query = q.toLowerCase().trim();
  const filtered = query
    ? students.filter(
        (s) =>
          s.name.toLowerCase().includes(query) ||
          s.email.toLowerCase().includes(query) ||
          (s.code ? s.code.toLowerCase().includes(query) : false),
      )
    : students;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Tìm theo tên, email hoặc mã…"
        className="w-full rounded-lg border border-soft bg-surface-strong px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary sm:w-80"
      />
      {query && <p className="text-xs text-foreground/45">{filtered.length} / {students.length} học sinh khớp</p>}
      {filtered.length === 0 ? (
        <p className="py-10 text-center text-sm text-foreground/45">Không có học sinh nào khớp.</p>
      ) : (
        <div className="flex-1 overflow-auto">
          <div className="grid grid-cols-1 gap-4 pb-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((s) => (
              <Link key={s.id} href={`/staff/students/${s.id}`} className="clay-card hover-card-soft press-feedback-soft group p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary">{s.name?.[0]?.toUpperCase() ?? "?"}</div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-foreground">{s.name}</p>
                    <p className="truncate text-xs text-foreground/60">{s.email}</p>
                    {s.code && <p className="truncate font-mono text-[11px] text-foreground/45">{s.code}</p>}
                  </div>
                </div>
                {s.levels.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {s.levels.map((l) => (
                      <span
                        key={l.subjectId}
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${LEVEL_COLOR[l.level] ?? "bg-gray-100 text-gray-600"}`}
                        title={`${l.subjectName}: ${LEVEL_LABEL[l.level]}`}
                      >
                        {l.subjectName}: {LEVEL_LABEL[l.level]}
                      </span>
                    ))}
                  </div>
                )}
                <p className="mt-3 text-xs text-foreground/60">{s.activeCount > 0 ? `Đang học ${s.activeCount} lớp` : "Chưa có lớp"}</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Viết lại `page.tsx` để dùng client list**

Thay toàn bộ `app/(dashboard)/staff/students/page.tsx` bằng:

```tsx
import Link from "next/link";
import { getMyStudents } from "@/lib/classes/queries";
import { requirePageSession } from "@/lib/auth/page-guard";
import { can } from "@/lib/auth/permissions";
import { PageHeader } from "@/components/layout/PageHeader";
import { FaIcon } from "@/components/ui/FaIcon";
import { faUserGraduate } from "@fortawesome/free-solid-svg-icons";
import { StudentsListClient } from "./StudentsListClient";

export default async function StaffStudentsPage() {
  const me = await requirePageSession();
  const canCreate = await can(me, "student.create");
  const students = await getMyStudents();

  const cards = students.map(({ student }) => ({
    id: student.id,
    name: student.name,
    email: student.email,
    code: student.code,
    activeCount: student.classEnrollments.length,
    levels: [] as { subjectId: string; subjectName: string; level: string }[],
  }));

  // Gắn mức năng lực mới nhất theo môn vào từng card.
  students.forEach(({ student, latestLevels }, i) => {
    cards[i].levels = latestLevels.map((l) => ({ subjectId: l.subject.id, subjectName: l.subject.name, level: l.level }));
  });

  return (
    <div className="flex h-full flex-col gap-4 sm:gap-6">
      <PageHeader
        icon={faUserGraduate}
        title="Học sinh phụ trách"
        subtitle={`${students.length} học sinh`}
        actions={
          canCreate && (
            <Link href="/staff/students/new" className="clay-btn bg-primary px-4 py-2 text-sm font-medium text-white">
              + Thêm học sinh
            </Link>
          )
        }
      />

      {students.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-foreground/60">
          <FaIcon icon={faUserGraduate} className="text-4xl" />
          <p className="text-sm">Chưa có học sinh nào được giao cho bạn</p>
        </div>
      ) : (
        <StudentsListClient students={cards} />
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: Không lỗi.

- [ ] **Step 4: Commit**

```bash
git add "app/(dashboard)/staff/students/StudentsListClient.tsx" "app/(dashboard)/staff/students/page.tsx"
git commit -m "feat(students): tìm kiếm + hiện Mã ở trang HS phụ trách CBĐT"
```

---

### Task 9: `/staff/students/all` — cột Mã + placeholder tìm-theo-mã

**Files:**
- Modify: `app/(dashboard)/staff/students/all/page.tsx`

**Interfaces:**
- Consumes: `getAllStudentsFiltered` (đã trả `code` + khớp `q` theo code từ Task 2).

- [ ] **Step 1: Đổi placeholder ô tìm kiếm**

Trong `all/page.tsx`, đổi placeholder input `q`:

```tsx
          <input name="q" defaultValue={q} placeholder="Nhập tên, email hoặc mã…" className={`${inputCls} w-64`} />
```

- [ ] **Step 2: Thêm cột "Mã" vào header bảng**

Đổi mảng header để chèn "Mã" sau "Học sinh":

```tsx
                  {["Học sinh", "Mã", "Năng lực theo môn", "CBĐT phụ trách", ""].map((h) => (
```

- [ ] **Step 3: Thêm ô Mã vào mỗi hàng**

Ngay sau `<td>` "Học sinh" (cái chứa `s.name`/`s.email`), thêm `<td>` Mã:

```tsx
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{s.name ?? s.email}</p>
                      <p className="text-xs text-gray-400">{s.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-gray-600">{s.code ?? "—"}</span>
                    </td>
```

- [ ] **Step 4: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: Không lỗi (`s.code` có nhờ Task 2).

- [ ] **Step 5: Commit**

```bash
git add "app/(dashboard)/staff/students/all/page.tsx"
git commit -m "feat(students): cột Mã + tìm theo mã ở trang Tất cả học sinh"
```

---

### Task 10: Cập nhật context docs

**Files:**
- Modify: `docs/context/platform.md` (§5 User & tổ chức; §8 Glossary)
- Modify: `docs/context/back-office.md` (§4 `/staff`; §7.4)

- [ ] **Step 1: `platform.md` §5 — thêm `code`/`UserCategory`**

Trong §5, mục "User & tổ chức (`user.prisma`, `permission.prisma`)", thêm câu mô tả mã định danh (sau dòng `User (...)`):

```markdown
### User & tổ chức (`user.prisma`, `permission.prisma`, `user_category.prisma`)
`User` (role + staffPosition + supervisorId + hồ sơ + **`code`** mã định danh `@unique` + `categoryId`) · `ParentStudent` · `Permission` / `RolePermission` / `PositionPermission` · `AuditLog` · **`UserCategory`** (loại tài khoản: `label`+`prefix`+`systemKey`+`includeYear`+`padWidth`) / **`UserCodeCounter`** (bộ đếm atomic cấp mã, reset theo năm cho HS). Mã sinh tự động khi tạo user (`HS-2026-000001`, `CN-007`…), admin sửa được; xem spec `docs/superpowers/specs/2026-06-17-user-code-system-design.md`. Hiển thị ở `/admin/users`, `/settings`, và khu staff `/staff/students*`.
```

- [ ] **Step 2: `platform.md` §8 — thêm mục Glossary**

Trong §8, mục "Roles & people" (sau mục **Parent**), thêm:

```markdown
**Mã định danh (code) / UserCategory** — Chuỗi người-đọc-được định danh một User theo loại (`User.code`, `@unique`, vd `HS-2026-000001`). Loại + prefix cấu hình ở `UserCategory`; số thứ tự cấp atomic qua `UserCodeCounter` (HS reset theo năm). Sinh tự động khi tạo, admin sửa được; **không** phải credential đăng nhập (vẫn đăng nhập bằng email). UI: "Mã".
_Avoid_: Username, Mã số (khi đứng một mình), ID (khi nói về cuid `User.id`)
```

- [ ] **Step 3: `back-office.md` §4 — cập nhật mô tả `/staff`**

Trong `### /staff`, đổi đoạn mô tả Học sinh + chi tiết HS:

```markdown
- **Học sinh** (`/staff/students` — HS được phân cho CBĐT, **có ô tìm kiếm theo tên/email/mã**, mỗi card hiện **Mã**; `/staff/students/[id]`) · **Tất cả học sinh** (`/staff/students/all` — lọc toàn bộ HS, **tìm theo tên/email/mã**, có cột Mã; gate `student.view_all`; lối vào của CBDTS)
```

Và thêm mô tả trang chi tiết HS (ngay sau bullet `/staff` đầu tiên hoặc trong cùng mục, thêm dòng):

```markdown
- **Chi tiết học sinh** (`/staff/students/[id]`) — bố cục **chia tab**: *Tổng quan* (lớp đang học + thống kê nhanh + donut điểm danh) · *Năng lực theo môn* (chọn môn → 4 biểu đồ SVG thuần: quỹ đạo năng lực, đường điểm Exam theo thời gian, radar đánh giá-buổi 3 chiều, donut điểm danh môn) · *Lịch rảnh* (ma trận full-width) · *Đánh giá* (`EvaluateForm` + lịch sử). Dữ liệu gom theo môn qua module thuần `lib/students/analytics.ts` + query `getStudentAnalytics`. Header luôn hiện **Mã**.
```

- [ ] **Step 4: `back-office.md` §7.4 — ghi nhận đã làm**

Trong `### 7.4 Cải thiện liên tục`, thêm bullet:

```markdown
- ✅ **Trang chi tiết HS** thiết kế lại dạng tab + phân tích theo môn (4 biểu đồ SVG thuần, đồng bộ Exam/điểm danh/đánh giá-buổi); khu staff hiện Mã định danh + tìm theo mã. (2026-06-23)
```

- [ ] **Step 5: Commit**

```bash
git add docs/context/platform.md docs/context/back-office.md
git commit -m "docs(context): ghi nhận hệ thống Mã định danh + redesign trang chi tiết HS"
```

---

### Task 11: Verify tích hợp toàn bộ

**Files:** (không sửa — chỉ chạy kiểm tra)

- [ ] **Step 1: Chạy toàn bộ test**

Run: `npm test`
Expected: Tất cả PASS (gồm `tests/students/analytics.test.ts` + các test cũ).

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: Không lỗi mới.

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: Build thành công.

- [ ] **Step 4: Kiểm tra thủ công (nếu chạy `npm run dev`)**

Checklist:
- `/staff/students`: ô tìm kiếm lọc theo tên/email/mã; card hiện Mã.
- `/staff/students/all`: cột Mã hiện; tìm theo mã ra đúng HS.
- `/staff/students/[id]`: 4 tab chuyển đúng; tab "Năng lực theo môn" đổi môn cập nhật 4 biểu đồ; tab Lịch rảnh full-width; tab Đánh giá giữ gate `canEvaluate`; header hiện Mã.
- HS không có dữ liệu Exam/điểm danh: biểu đồ hiện thông báo rỗng, không crash.

- [ ] **Step 5: Commit (nếu có chỉnh sửa nhỏ khi verify)**

```bash
git add -A
git commit -m "chore(students): hoàn thiện sau verify tích hợp"
```

---

## Self-Review

**1. Spec coverage:**
- Spec §1 mục tiêu 1 (hiện Mã khu staff) → Task 2 (select code) + Task 7 (header) + Task 8 (card) + Task 9 (cột Mã). ✅
- Spec §1 mục tiêu 2 (tìm kiếm) → Task 8 (client `/students`) + Task 2/9 (`/all` theo mã). ✅
- Spec §1 mục tiêu 3 (redesign tab + 4 biểu đồ theo môn) → Task 3–7. ✅
- Spec §1 mục tiêu 4 (cập nhật docs) → Task 10. ✅
- Spec §4.1 module thuần + §4.2 query → Task 1 + Task 2. ✅
- Spec §4.3 thêm `code` 3 query → Task 2. ✅
- Spec §5 components → Task 3–7 (ProficiencyTrend tái dùng trong Task 6). ✅
- Spec §6 4 tab → Task 7. ✅
- Spec §7 danh sách → Task 8–9. ✅
- Spec §9 test (TDD analytics) → Task 1. ✅

**2. Placeholder scan:** Không có "TBD/TODO/implement later"; mọi step có code/lệnh cụ thể. ✅

**3. Type consistency:**
- `buildStudentAnalytics`/`scoreToLevel`/`StudentAnalytics`/`SubjectAnalytics` dùng nhất quán Task 1 → 2 → 6 → 7. ✅
- `getStudentAnalytics(studentId): Promise<StudentAnalytics>` khớp giữa Task 2 (produces) và Task 7 (consumes). ✅
- `AttendanceTally` shape `{present,late,absent,excused,total}` khớp giữa `AttendanceDonut` (Task 4), `analytics` (Task 1), `SubjectAnalyticsPanel` (Task 6), `StudentDetailTabs` overall (Task 7). ✅
- `EvaluateForm({ studentId, subjects })` + `AvailabilityMatrix({ initial, onSave })` + `saveStudentAvailabilityAction(studentId, slots)` khớp chữ ký thực tế đã xác minh. ✅
- `getAllStudentsFiltered` trả thêm `code` (Task 2) → dùng ở Task 9. ✅

Không phát hiện sai lệch.
