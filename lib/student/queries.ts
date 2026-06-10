import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { loadAvailability } from "@/lib/availability/store";
import { resolveUserIdByRole } from "@/lib/auth/require";

// ── Dashboard stats ──────────────────────────────────────────
export async function getStudentStats() {
  const session = await auth();
  if (!session?.user?.id)
    return { pendingExams: 0, completedExams: 0, avgScore: null as number | null, flashcardSets: 0 };

  const studentId = session.user.id;

  // Tìm classIds của học sinh
  const studentClasses = await prisma.classEnrollment.findMany({
    where: { studentId, status: "ACTIVE" },
    select: { classId: true },
  });
  const classIds = studentClasses.map((sc) => sc.classId);

  // Tất cả đề thi của các lớp học sinh đang thuộc
  const allExams = await prisma.exam.findMany({
    where: { classId: { in: classIds } },
    select: { id: true },
  });
  const allExamIds = allExams.map((e) => e.id);

  // Attempts đã submit
  const submittedAttempts = await prisma.examAttempt.findMany({
    where: { studentId, submittedAt: { not: null }, examId: { in: allExamIds } },
    select: { examId: true, score: true },
  });
  const attemptedExamIds = new Set(submittedAttempts.map((a) => a.examId));

  const pendingExams = allExamIds.filter((id) => !attemptedExamIds.has(id)).length;
  const completedExams = attemptedExamIds.size;

  const scores = submittedAttempts.map((a) => a.score).filter((s): s is number => s !== null);
  const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;

  const flashcardSets = await prisma.flashcardSet.count();

  return { pendingExams, completedExams, avgScore, flashcardSets };
}

// ── Exams for student (split pending / completed) ────────────
export async function getStudentExams() {
  const session = await auth();
  if (!session?.user?.id) return { pending: [], completed: [] };

  const studentId = session.user.id;

  const studentClasses = await prisma.classEnrollment.findMany({
    where: { studentId, status: "ACTIVE" },
    select: { classId: true },
  });
  const classIds = studentClasses.map((sc) => sc.classId);

  const exams = await prisma.exam.findMany({
    where: { classId: { in: classIds } },
    include: {
      subject: { select: { name: true } },
      class: { select: { name: true } },
      _count: { select: { examQuestions: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Lấy attempts của học sinh cho các đề này
  const attempts = await prisma.examAttempt.findMany({
    where: { studentId, examId: { in: exams.map((e) => e.id) } },
    orderBy: { startedAt: "desc" },
  });
  const attemptMap = new Map(attempts.map((a) => [a.examId, a]));

  const pending = exams.filter((e) => {
    const attempt = attemptMap.get(e.id);
    return !attempt || attempt.submittedAt === null;
  });

  const completed = exams
    .filter((e) => {
      const attempt = attemptMap.get(e.id);
      return attempt && attempt.submittedAt !== null;
    })
    .map((e) => ({ ...e, attempt: attemptMap.get(e.id)! }));

  const pendingWithAttempt = pending.map((e) => ({
    ...e,
    attempt: attemptMap.get(e.id) ?? null,
  }));

  return { pending: pendingWithAttempt, completed };
}

// ── Exam detail (for start page) ─────────────────────────────
export async function getStudentExamDetail(examId: string) {
  const session = await auth();
  if (!session?.user?.id) return null;

  const studentId = session.user.id;

  // Kiểm tra học sinh có trong lớp được giao đề không
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: {
      subject: { select: { name: true } },
      class: { select: { id: true, name: true } },
      _count: { select: { examQuestions: true } },
    },
  });
  if (!exam) return null;

  const inClass = await prisma.classEnrollment.findFirst({
    where: { studentId, classId: exam.classId, status: "ACTIVE" },
  });
  if (!inClass) return null;

  // Attempt của học sinh cho đề này
  const attempt = await prisma.examAttempt.findFirst({
    where: { studentId, examId },
    orderBy: { startedAt: "desc" },
  });

  return { ...exam, attempt: attempt ?? null };
}

// ── Exam questions for taking (no isCorrect exposed) ─────────
export async function getExamForTaking(examId: string, attemptId: string) {
  const session = await auth();
  if (!session?.user?.id) return null;

  const attempt = await prisma.examAttempt.findUnique({
    where: { id: attemptId },
  });
  if (!attempt || attempt.studentId !== session.user.id || attempt.submittedAt !== null)
    return null;

  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: {
      subject: { select: { name: true } },
      examQuestions: {
        orderBy: { order: "asc" },
        include: {
          question: {
            select: {
              id: true,
              content: true,
              options: true, // JSON — sẽ strip isCorrect ở đây
              difficulty: true,
              topic: { select: { name: true } },
            },
          },
        },
      },
    },
  });
  if (!exam) return null;

  // Strip isCorrect khỏi options trước khi gửi về client
  const questions = exam.examQuestions.map((eq) => {
    const rawOptions = eq.question.options as {
      label: string;
      text: string;
      isCorrect: boolean;
    }[];
    return {
      id: eq.question.id,
      order: eq.order,
      content: eq.question.content,
      difficulty: eq.question.difficulty,
      topicName: eq.question.topic.name,
      options: rawOptions.map((o) => ({ label: o.label, text: o.text })),
    };
  });

  return {
    id: exam.id,
    title: exam.title,
    duration: exam.duration,
    subjectName: exam.subject.name,
    questions,
    attemptId,
    startedAt: attempt.startedAt,
  };
}

// ── Attempt result (after submit) ────────────────────────────
export async function getStudentAttemptResult(attemptId: string) {
  const session = await auth();
  if (!session?.user?.id) return null;

  const attempt = await prisma.examAttempt.findUnique({
    where: { id: attemptId },
    include: {
      exam: {
        include: {
          subject: { select: { name: true } },
          examQuestions: {
            orderBy: { order: "asc" },
            include: {
              question: {
                select: {
                  id: true,
                  content: true,
                  options: true,
                  explanation: true,
                  difficulty: true,
                  topic: { select: { name: true } },
                },
              },
            },
          },
        },
      },
      answers: true,
    },
  });

  if (!attempt || attempt.studentId !== session.user.id) return null;

  return attempt;
}

// ── Progress history ─────────────────────────────────────────
export async function getStudentProgress() {
  const session = await auth();
  if (!session?.user?.id) return [];

  return prisma.examAttempt.findMany({
    where: { studentId: session.user.id, submittedAt: { not: null } },
    include: {
      exam: {
        include: {
          subject: { select: { name: true } },
          class: { select: { name: true } },
        },
      },
    },
    orderBy: { submittedAt: "desc" },
  });
}

// ── Flashcard sets available to all students ─────────────────
export async function getStudentFlashcardSets(filters?: {
  subjectId?: string;
  gradeId?: string;
  topicName?: string;
  difficulty?: "EASY" | "MEDIUM" | "HARD";
  search?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) return [];

  return prisma.flashcardSet.findMany({
    where: {
      ...(filters?.subjectId ? { subjectId: filters.subjectId } : {}),
      ...(filters?.gradeId ? { gradeId: filters.gradeId } : {}),
      ...(filters?.topicName ? { topicName: filters.topicName } : {}),
      ...(filters?.difficulty ? { difficulty: filters.difficulty } : {}),
      ...(filters?.search
        ? {
            OR: [
              { title: { contains: filters.search, mode: "insensitive" } },
              { topicName: { contains: filters.search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: {
      subject: { select: { name: true } },
      grade: { select: { gradeNumber: true, level: true } },
      createdBy: { select: { name: true } },
      cards: {
        select: { id: true, imageUrl: true, caption: true },
        orderBy: { order: "asc" },
        take: 1,
      },
      _count: { select: { cards: true, sessions: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getStudentFlashcardSetDetail(setId: string) {
  const session = await auth();
  if (!session?.user?.id) return null;

  const studentId = session.user.id;

  const set = await prisma.flashcardSet.findUnique({
    where: { id: setId },
    include: {
      subject: { select: { name: true } },
      grade: { select: { gradeNumber: true, level: true } },
      createdBy: { select: { name: true } },
      cards: {
        orderBy: { order: "asc" },
      },
    },
  });
  if (!set) return null;

  // Last session stats
  const lastSession = await prisma.flashcardSession.findFirst({
    where: { setId, studentId },
    orderBy: { startedAt: "desc" },
  });

  const totalSessions = await prisma.flashcardSession.count({
    where: { setId, studentId },
  });

  return { ...set, lastSession, totalSessions };
}

export async function getStudentFlashcardFilters() {
  const session = await auth();
  if (!session?.user?.id) {
    return { subjects: [], grades: [], topics: [] };
  }

  const [subjects, grades, topics] = await Promise.all([
    prisma.subject.findMany({
      where: { flashcardSets: { some: {} } },
      orderBy: { name: "asc" },
    }),
    prisma.grade.findMany({
      where: { flashcardSets: { some: {} } },
      orderBy: [{ gradeNumber: "asc" }, { level: "asc" }],
    }),
    prisma.flashcardSet.findMany({
      distinct: ["topicName"],
      select: { topicName: true },
      orderBy: { topicName: "asc" },
    }),
  ]);

  return {
    subjects,
    grades,
    topics: topics.map((item) => item.topicName),
  };
}

export async function getRandomStudentFlashcardSet(filters?: {
  subjectId?: string;
  gradeId?: string;
  topicName?: string;
  difficulty?: "EASY" | "MEDIUM" | "HARD";
}) {
  const session = await auth();
  if (!session?.user?.id) return null;

  const sets = await prisma.flashcardSet.findMany({
    where: {
      ...(filters?.subjectId ? { subjectId: filters.subjectId } : {}),
      ...(filters?.gradeId ? { gradeId: filters.gradeId } : {}),
      ...(filters?.topicName ? { topicName: filters.topicName } : {}),
      ...(filters?.difficulty ? { difficulty: filters.difficulty } : {}),
    },
    select: { id: true },
  });

  if (sets.length === 0) return null;

  const randomIndex = Math.floor(Math.random() * sets.length);
  return getStudentFlashcardSetDetail(sets[randomIndex].id);
}

// ── Lịch rảnh của học sinh đang đăng nhập ────────────────────
export async function getMyStudentAvailability() {
  const session = await auth();
  if (!session?.user?.id) return [];

  const studentId = await resolveUserIdByRole(
    { id: session.user.id, email: session.user.email },
    "STUDENT",
  );
  if (!studentId) return [];

  return loadAvailability({ kind: "student", id: studentId });
}
