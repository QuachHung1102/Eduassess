import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { listQuestions } from "@/lib/questions/store";
import { loadAvailability } from "@/lib/availability/store";
import { resolveUserIdByRole } from "@/lib/auth/require";

// Lấy danh sách môn học
export async function getSubjects() {
  return prisma.subject.findMany({ orderBy: { name: "asc" } });
}

// Lấy danh sách môn học mà giáo viên hiện tại được phân công dạy
// Chỉ trả về môn có canAddQuestions = true (dùng cho form tạo câu hỏi)
export async function getTeacherSubjects() {
  const session = await auth();
  if (!session?.user?.id) return [];
  const rows = await prisma.classTeacher.findMany({
    where: { teacherId: session.user.id },
    include: { class: { include: { subject: true } } },
  });
  const seen = new Set<string>();
  const subjects: { id: string; name: string; canAddQuestions: boolean }[] = [];
  for (const r of rows) {
    if (!seen.has(r.class.subjectId)) {
      seen.add(r.class.subjectId);
      subjects.push(r.class.subject as { id: string; name: string; canAddQuestions: boolean });
    }
  }
  return subjects.filter((s) => s.canAddQuestions);
}

// Lấy danh sách khối lớp
export async function getGrades() {
  return prisma.grade.findMany({ orderBy: { gradeNumber: "asc" } });
}

// Lấy chủ đề theo môn + khối
export async function getTopics(subjectId: string, gradeId: string) {
  return prisma.topic.findMany({
    where: { subjectId, gradeId },
    orderBy: { name: "asc" },
  });
}

// Lấy danh sách câu hỏi của giáo viên hiện tại (có filter)
export async function getTeacherQuestions(filters?: {
  subjectId?: string;
  gradeId?: string;
  difficulty?: string;
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  const session = await auth();
  if (!session?.user?.id) return { questions: [], total: 0 };

  return listQuestions(
    {
      subjectId: filters?.subjectId,
      gradeId: filters?.gradeId,
      difficulty: filters?.difficulty,
      status: filters?.status,
      search: filters?.search,
    },
    {
      ownerId: session.user.id,
      page: filters?.page ?? 1,
      pageSize: filters?.pageSize ?? 10,
      include: {
        subject: true,
        topic: { include: { grade: true } },
      },
    },
  );
}

// Lấy các lớp giáo viên hiện tại đang phụ trách
export async function getTeacherClasses() {
  const session = await auth();
  if (!session?.user?.id) return [];

  return prisma.classTeacher.findMany({
    where: { teacherId: session.user.id },
    include: {
      class: { include: { subject: true } },
    },
    orderBy: { class: { name: "asc" } },
  });
}

// Lấy danh sách đề kiểm tra của giáo viên
export async function getTeacherExams() {
  const session = await auth();
  if (!session?.user?.id) return [];

  return prisma.exam.findMany({
    where: { createdById: session.user.id },
    include: {
      subject: true,
      class: true,
      _count: { select: { examQuestions: true, examAttempts: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

// Lấy chi tiết một đề kiểm tra (kèm danh sách câu hỏi)
export async function getTeacherExamDetail(examId: string) {
  const session = await auth();
  if (!session?.user?.id) return null;

  return prisma.exam.findFirst({
    where: { id: examId, createdById: session.user.id },
    include: {
      subject: true,
      class: true,
      examQuestions: {
        orderBy: { order: "asc" },
        include: {
          question: {
            include: { topic: true },
          },
        },
      },
      _count: { select: { examAttempts: true } },
    },
  });
}

// Stats cho dashboard teacher
export async function getTeacherStats() {
  const session = await auth();
  if (!session?.user?.id)
    return { questionCount: 0, examCount: 0, studentCount: 0, pendingCount: 0 };

  const [questionCount, examCount, , pendingCount] = await Promise.all([
    prisma.question.count({ where: { createdById: session.user.id } }),
    prisma.exam.count({ where: { createdById: session.user.id } }),
    prisma.classTeacher.count({ where: { teacherId: session.user.id } }),
    prisma.question.count({ where: { createdById: session.user.id, status: "PENDING" } }),
  ]);

  // Đếm học sinh trong các lớp giáo viên phụ trách
  const teacherClassIds = await prisma.classTeacher
    .findMany({ where: { teacherId: session.user.id }, select: { classId: true } })
    .then((rows) => [...new Set(rows.map((r) => r.classId))]);

  const studentCount = await prisma.classEnrollment.count({
    where: { classId: { in: teacherClassIds }, status: "ACTIVE" },
  });

  return { questionCount, examCount, studentCount, pendingCount };
}

// Chi tiết lớp học (danh sách HS + đề thi của lớp đó)
export async function getTeacherClassDetail(classId: string) {
  const session = await auth();
  if (!session?.user?.id) return null;

  // Kiểm tra giáo viên có phụ trách lớp này không
  const assignment = await prisma.classTeacher.findFirst({
    where: { teacherId: session.user.id, classId },
  });
  if (!assignment) return null;

  return prisma.class.findUnique({
    where: { id: classId },
    include: {
      subject: true,
      enrollments: {
        include: {
          student: { select: { id: true, name: true, email: true, sex: true } },
        },
        orderBy: { student: { name: "asc" } },
      },
      exams: {
        include: {
          subject: { select: { name: true } },
          _count: { select: { examQuestions: true, examAttempts: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      teachers: {
        where: { teacherId: session.user.id },
      },
    },
  });
}

// Kết quả bài làm của học sinh cho một đề (teacher xem)
export async function getTeacherExamAttempts(examId: string) {
  const session = await auth();
  if (!session?.user?.id) return null;

  const exam = await prisma.exam.findFirst({
    where: { id: examId, createdById: session.user.id },
    select: { id: true, title: true, examQuestions: { select: { questionId: true } } },
  });
  if (!exam) return null;

  const totalQuestions = exam.examQuestions.length;

  const attempts = await prisma.examAttempt.findMany({
    where: { examId },
    include: {
      student: { select: { id: true, name: true, email: true } },
    },
    orderBy: { submittedAt: "desc" },
  });

  return { exam, attempts, totalQuestions };
}

// Chi tiết bài làm của một học sinh (teacher xem)
export async function getTeacherAttemptDetail(attemptId: string) {
  const session = await auth();
  if (!session?.user?.id) return null;

  const attempt = await prisma.examAttempt.findUnique({
    where: { id: attemptId },
    include: {
      student: { select: { name: true, email: true } },
      exam: {
        select: {
          id: true,
          title: true,
          createdById: true,
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

  if (!attempt) return null;
  // Verify exam belongs to this teacher
  if (attempt.exam.createdById !== session.user.id) return null;

  return attempt;
}

// Lấy một câu hỏi theo id (chỉ của giáo viên hiện tại)
export async function getTeacherQuestionById(questionId: string) {
  const session = await auth();
  if (!session?.user?.id) return null;

  return prisma.question.findFirst({
    where: { id: questionId, createdById: session.user.id },
    include: {
      topic: { include: { grade: true } },
      subject: true,
    },
  });
}

// ── Flashcard management (teacher) ───────────────────────────

export async function getTeacherFlashcardSets() {
  const session = await auth();
  if (!session?.user?.id) return [];

  const sets = await prisma.flashcardSet.findMany({
    include: {
      subject: { select: { name: true } },
      grade: { select: { gradeNumber: true, level: true } },
      createdBy: { select: { id: true, name: true, role: true } },
      cards: {
        select: { id: true, imageUrl: true },
        orderBy: { order: "asc" },
        take: 1,
      },
      _count: { select: { cards: true, sessions: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return sets.map((set) => ({
    ...set,
    canManage: set.createdById === session.user.id,
  }));
}

export async function getTeacherFlashcardSetDetail(setId: string) {
  const session = await auth();
  if (!session?.user?.id) return null;

  const set = await prisma.flashcardSet.findFirst({
    where: { id: setId },
    include: {
      subject: { select: { name: true } },
      grade: { select: { gradeNumber: true, level: true } },
      createdBy: { select: { id: true, name: true, role: true } },
      cards: {
        orderBy: { order: "asc" },
      },
      _count: { select: { sessions: true } },
    },
  });

  if (!set) return null;

  return {
    ...set,
    canManage: set.createdById === session.user.id,
  };
}

export async function getTeacherFlashcardFilters() {
  const session = await auth();
  if (!session?.user?.id) {
    return { subjects: [], grades: [], topics: [] };
  }

  const [subjects, grades, topics] = await Promise.all([
    prisma.subject.findMany({
      where: {
        flashcardSets: {
          some: { createdById: session.user.id },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.grade.findMany({
      where: {
        flashcardSets: {
          some: { createdById: session.user.id },
        },
      },
      orderBy: [{ gradeNumber: "asc" }, { level: "asc" }],
    }),
    prisma.flashcardSet.findMany({
      where: { createdById: session.user.id },
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

export async function getTeacherFlashcardRandomSet(filters?: {
  subjectId?: string;
  gradeId?: string;
  topicName?: string;
  difficulty?: "EASY" | "MEDIUM" | "HARD";
}) {
  const session = await auth();
  if (!session?.user?.id) return null;

  const sets = await prisma.flashcardSet.findMany({
    where: {
      createdById: session.user.id,
      ...(filters?.subjectId ? { subjectId: filters.subjectId } : {}),
      ...(filters?.gradeId ? { gradeId: filters.gradeId } : {}),
      ...(filters?.topicName ? { topicName: filters.topicName } : {}),
      ...(filters?.difficulty ? { difficulty: filters.difficulty } : {}),
    },
    select: { id: true },
  });

  if (sets.length === 0) return null;

  const randomIndex = Math.floor(Math.random() * sets.length);
  return getTeacherFlashcardSetDetail(sets[randomIndex].id);
}

// ── Buổi học của lớp mà giáo viên phụ trách ──────────────────
export async function getTeacherClassSessions(classId: string) {
  const session = await auth();
  if (!session?.user?.id) return null;

  // Giáo viên chỉ xem được lớp mình phụ trách
  const assignment = await prisma.classTeacher.findFirst({
    where: { teacherId: session.user.id, classId },
  });
  if (!assignment) return null;

  return prisma.classSession.findMany({
    where: { classId },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
    include: {
      room: { select: { id: true, name: true } },
      teacher: { select: { id: true, name: true } },
      _count: { select: { attendances: true } },
    },
  });
}

// ── Chi tiết buổi học + danh sách điểm danh ──────────────────
export async function getTeacherSessionDetail(classId: string, sessionId: string) {
  const session = await auth();
  if (!session?.user?.id) return null;

  // Giáo viên chỉ xem được lớp mình phụ trách
  const assignment = await prisma.classTeacher.findFirst({
    where: { teacherId: session.user.id, classId },
  });
  if (!assignment) return null;

  const [classSession, enrollments] = await Promise.all([
    prisma.classSession.findUnique({
      where: { id: sessionId },
      include: {
        class: { select: { id: true, name: true } },
        room: { select: { id: true, name: true } },
        teacher: { select: { id: true, name: true } },
        attendances: {
          include: {
            student: { select: { id: true, name: true, email: true } },
          },
        },
      },
    }),
    prisma.classEnrollment.findMany({
      where: { classId, status: "ACTIVE" },
      include: { student: { select: { id: true, name: true, email: true } } },
      orderBy: { student: { name: "asc" } },
    }),
  ]);

  if (!classSession || classSession.classId !== classId) return null;

  return { session: classSession, enrollments };
}

// ── Lịch rảnh của giáo viên đang đăng nhập ───────────────────
export async function getMyTeacherAvailability() {
  const session = await auth();
  if (!session?.user?.id) return [];

  const teacherId = await resolveUserIdByRole(
    { id: session.user.id, email: session.user.email },
    "TEACHER",
  );
  if (!teacherId) return [];

  return loadAvailability({ kind: "teacher", id: teacherId });
}
