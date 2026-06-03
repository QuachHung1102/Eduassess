import { prisma } from "@/lib/db/prisma";

// ── Dashboard stats ──────────────────────────────────────────
export async function getAdminStats() {
  const [teacherCount, studentCount, questionCount, examCount, classCount, topicCount] = await Promise.all([
    prisma.user.count({ where: { role: "TEACHER" } }),
    prisma.user.count({ where: { role: "STUDENT" } }),
    prisma.question.count(),
    prisma.exam.count(),
    prisma.class.count(),
    prisma.topic.count(),
  ]);
  return { teacherCount, studentCount, questionCount, examCount, classCount, topicCount };
}

// ── Subjects with canAddQuestions ───────────────────────────
export async function getAdminSubjects() {
  return prisma.subject.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { questions: true } },
    },
  });
}

// ── All questions (paginated) ────────────────────────────────
export async function getAdminQuestions(filters?: {
  subjectId?: string;
  gradeId?: string;
  difficulty?: string;
  status?: string;
  creator?: string;
  isUnivExam?: "YES" | "NO";
  hasExplanation?: "YES" | "NO";
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  const page = filters?.page ?? 1;
  const pageSize = filters?.pageSize ?? 15;
  const skip = (page - 1) * pageSize;

  const where = {
    ...(filters?.subjectId ? { subjectId: filters.subjectId } : {}),
    ...(filters?.gradeId ? { topic: { gradeId: filters.gradeId } } : {}),
    ...(filters?.difficulty ? { difficulty: filters.difficulty as "EASY" | "MEDIUM" | "HARD" } : {}),
    ...(filters?.status ? { status: filters.status as "PENDING" | "APPROVED" } : {}),
    ...(filters?.creator
      ? { createdBy: { name: { contains: filters.creator, mode: "insensitive" as const } } }
      : {}),
    ...(filters?.isUnivExam === "YES"
      ? { isUnivExam: true }
      : filters?.isUnivExam === "NO"
        ? { isUnivExam: false }
        : {}),
    ...(filters?.hasExplanation === "YES"
      ? { explanation: { not: null } }
      : filters?.hasExplanation === "NO"
        ? { OR: [{ explanation: null }, { explanation: "" }] }
        : {}),
    ...(filters?.search
      ? { content: { contains: filters.search, mode: "insensitive" as const } }
      : {}),
  };

  const [questions, total] = await Promise.all([
    prisma.question.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      include: {
        subject: { select: { name: true } },
        topic: { select: { name: true } },
        createdBy: { select: { name: true } },
      },
    }),
    prisma.question.count({ where }),
  ]);

  return { questions, total };
}

// ── Grades (for create question form) ───────────────────────
export async function getAdminGrades() {
  return prisma.grade.findMany({ orderBy: { gradeNumber: "asc" } });
}

// ── High-school grades only (10–12) ──────────────────────────
export async function getAdminHighSchoolGrades() {
  return prisma.grade.findMany({
    where: { level: "HIGH" },
    orderBy: { gradeNumber: "asc" },
  });
}

// ── Topics for subject+grade ─────────────────────────────────
export async function getAdminTopics(subjectId: string, gradeId: string) {
  return prisma.topic.findMany({
    where: { subjectId, gradeId },
    orderBy: { name: "asc" },
  });
}

// ── All users (paginated) ────────────────────────────────────
type AdminUserRole = "TEACHER" | "STUDENT" | "STAFF" | "PARENT" | "ADMIN";
type AdminStaffPosition = "NVSALE" | "NVLT" | "CBNK" | "CBDH" | "CBDT" | "CBDTS";
type AdminSexFilter = "MALE" | "FEMALE";
type HasPhoneFilter = "YES" | "NO";
const ADMIN_LIST_ROLES: AdminUserRole[] = ["ADMIN", "STAFF", "TEACHER", "STUDENT", "PARENT"];

export async function getAdminUsers(filters?: {
  role?: AdminUserRole;
  staffPosition?: AdminStaffPosition;
  sex?: AdminSexFilter;
  hasPhone?: HasPhoneFilter;
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  const page = filters?.page ?? 1;
  const pageSize = filters?.pageSize ?? 20;
  const skip = (page - 1) * pageSize;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {
    role: filters?.role ? filters.role : { in: ADMIN_LIST_ROLES },
    ...(filters?.staffPosition ? { staffPosition: filters.staffPosition } : {}),
    ...(filters?.sex ? { sex: filters.sex } : {}),
    ...(filters?.hasPhone === "YES"
      ? { phoneNumber: { not: null } }
      : filters?.hasPhone === "NO"
        ? { OR: [{ phoneNumber: null }, { phoneNumber: "" }] }
        : {}),
    ...(filters?.search
      ? {
          OR: [
            { name: { contains: filters.search, mode: "insensitive" as const } },
            { email: { contains: filters.search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: [{ role: "asc" }, { name: "asc" }],
      skip,
      take: pageSize,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        staffPosition: true,
        sex: true,
        phoneNumber: true,
        createdAt: true,
        classEnrollments: {
          select: { class: { select: { name: true } } },
          take: 1,
        },
        classTeachers: {
          select: { class: { select: { subject: { select: { name: true } } } } },
          take: 5,
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return { users, total };
}

// Danh sách CBDTS — dùng cho dropdown supervisor khi tạo / sửa CBDT
export async function getCBDTSCandidates() {
  return prisma.user.findMany({
    where: { role: "STAFF", staffPosition: "CBDTS" },
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true },
  });
}

// ── All teachers (for dropdowns) ────────────────────────────
export async function getAdminTeachers(): Promise<{
  id: string;
  name: string;
  email: string;
  subjects: { id: string; name: string }[];
}[]> {
  const teachers = await prisma.user.findMany({
    where: { role: "TEACHER" },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      classTeachers: {
        select: { class: { select: { subjectId: true, subject: { select: { id: true, name: true } } } } },
      },
    },
  });
  return teachers.map((t) => {
    const seen = new Set<string>();
    const subjects: { id: string; name: string }[] = [];
    for (const ct of t.classTeachers) {
      const subjectId = ct.class.subjectId;
      if (!seen.has(subjectId)) {
        seen.add(subjectId);
        subjects.push(ct.class.subject);
      }
    }
    return { id: t.id, name: t.name, email: t.email, subjects };
  });
}

// ── All students (for dropdowns) ────────────────────────────
export async function getAdminStudents(search?: string) {
  return prisma.user.findMany({
    where: {
      role: "STUDENT",
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { name: "asc" },
    take: 50,
    select: {
      id: true, name: true, email: true,
      classEnrollments: { select: { class: { select: { id: true, name: true } } } },
    },
  });
}

// ── All classes (grouped by grade) ──────────────────────────
export async function getAdminClasses() {
  return prisma.class.findMany({
    orderBy: [{ subject: { name: "asc" } }, { name: "asc" }],
    include: {
      subject: { select: { name: true } },
      advisor: { select: { name: true } },
      _count: {
        select: { enrollments: true, teachers: true },
      },
    },
  });
}

// ── Class detail ─────────────────────────────────────────────
export async function getAdminClassDetail(classId: string) {
  return prisma.class.findUnique({
    where: { id: classId },
    include: {
      subject: true,
      advisor: { select: { id: true, name: true, email: true } },
      enrollments: {
        include: {
          student: {
            select: { id: true, name: true, email: true, sex: true, phoneNumber: true },
          },
        },
        orderBy: { student: { name: "asc" } },
      },
      teachers: {
        include: {
          teacher: { select: { id: true, name: true, email: true } },
        },
        orderBy: { teacher: { name: "asc" } },
      },
    },
  });
}

// ── Flashcards ───────────────────────────────────────────────
export async function getAdminFlashcardSets(filters?: {
  subjectId?: string;
  gradeId?: string;
  topicName?: string;
  difficulty?: "EASY" | "MEDIUM" | "HARD";
  search?: string;
}) {
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
      createdBy: { select: { name: true, role: true } },
      cards: {
        select: { id: true, imageUrl: true },
        orderBy: { order: "asc" },
        take: 1,
      },
      _count: { select: { cards: true, sessions: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getAdminFlashcardSetDetail(setId: string) {
  return prisma.flashcardSet.findUnique({
    where: { id: setId },
    include: {
      subject: { select: { name: true } },
      grade: { select: { gradeNumber: true, level: true } },
      createdBy: { select: { name: true, role: true } },
      cards: { orderBy: { order: "asc" } },
      _count: { select: { sessions: true } },
    },
  });
}

export async function getAdminFlashcardFilters() {
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

// ── Teacher permissions overview ─────────────────────────────
export async function getAdminTeacherPermissions(): Promise<{
  id: string;
  name: string;
  email: string;
  subjects: { id: string; name: string }[];
  classTeachers: {
    class: { id: string; name: string; subject: { id: string; name: string } };
  }[];
}[]> {
  const teachers = await prisma.user.findMany({
    where: { role: "TEACHER" },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      classTeachers: {
        select: {
          class: { select: { id: true, name: true, subjectId: true, subject: { select: { id: true, name: true } } } },
        },
        orderBy: { class: { name: "asc" } },
      },
    },
  });
  return teachers.map((t) => {
    const seen = new Set<string>();
    const subjects: { id: string; name: string }[] = [];
    for (const ct of t.classTeachers) {
      if (!seen.has(ct.class.subjectId)) {
        seen.add(ct.class.subjectId);
        subjects.push(ct.class.subject);
      }
    }
    return { id: t.id, name: t.name, email: t.email, subjects, classTeachers: t.classTeachers };
  });
}

// ── User detail (for edit page) ───────────────────────────────
export async function getAdminUserDetail(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      sex: true,
      phoneNumber: true,
      address: true,
      dateOfBirth: true,
      createdAt: true,
      classEnrollments: {
        select: { class: { select: { id: true, name: true } } },
      },
      classTeachers: {
        select: {
          class: { select: { id: true, name: true, subject: { select: { name: true } } } },
        },
        orderBy: { class: { name: "asc" } },
      },
    },
  }) as Promise<{
    id: string;
    name: string;
    email: string;
    role: string;
    sex: string | null;
    phoneNumber: string | null;
    address: string | null;
    dateOfBirth: Date | null;
    createdAt: Date;
    classEnrollments: { class: { id: string; name: string } }[];
    classTeachers: { class: { id: string; name: string; subject: { name: string } } }[];
  } | null>;
}

// ── Topics for subjects page (grouped by grade) ──────────────
export async function getAdminSubjectsWithTopics() {
  return prisma.subject.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { questions: true } },
      topics: {
        orderBy: [{ grade: { gradeNumber: "asc" } }, { name: "asc" }],
        include: {
          grade: { select: { gradeNumber: true } },
          _count: { select: { questions: true } },
        },
      },
    },
  });
}

// ── All exams (admin overview) ───────────────────────────────
export async function getAdminExams(filters?: {
  subjectId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  const page = filters?.page ?? 1;
  const pageSize = filters?.pageSize ?? 20;
  const skip = (page - 1) * pageSize;

  const where = {
    ...(filters?.subjectId ? { subjectId: filters.subjectId } : {}),
    ...(filters?.search
      ? {
          OR: [
            { title: { contains: filters.search, mode: "insensitive" as const } },
            { createdBy: { name: { contains: filters.search, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };

  const [exams, total] = await Promise.all([
    prisma.exam.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      include: {
        subject: { select: { name: true } },
        class: { select: { name: true } },
        createdBy: { select: { name: true } },
        _count: { select: { examQuestions: true, examAttempts: true } },
      },
    }),
    prisma.exam.count({ where }),
  ]);

  return { exams, total };
}

// ── Exam detail (admin) ───────────────────────────────────────
export async function getAdminExamDetail(examId: string) {
  return prisma.exam.findUnique({
    where: { id: examId },
    include: {
      subject: true,
      class: true,
      createdBy: { select: { id: true, name: true, email: true } },
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

// ── Question detail (for admin edit) ─────────────────────────
export async function getAdminQuestionById(questionId: string) {
  return prisma.question.findUnique({
    where: { id: questionId },
    include: {
      subject: true,
      topic: { include: { grade: true } },
      createdBy: { select: { id: true, name: true } },
    },
  });
}
