import { prisma } from "@/lib/db/prisma";

// ─── Teacher / Admin ─────────────────────────────────────────

export async function getCoursesForAuthor(authorId: string) {
  return prisma.course.findMany({
    where: { authorId },
    include: {
      subject: { select: { name: true } },
      _count: { select: { lessons: true, enrollments: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getCourseWithLessons(courseId: string) {
  return prisma.course.findUnique({
    where: { id: courseId },
    include: {
      subject: { select: { id: true, name: true } },
      author: { select: { id: true, name: true } },
      lessons: { orderBy: { order: "asc" } },
      _count: { select: { enrollments: true, reviews: true } },
    },
  });
}

// ─── Admin ───────────────────────────────────────────────────

export async function getCoursesForAdmin(filters?: {
  status?: string;
  subjectId?: string;
}) {
  return prisma.course.findMany({
    where: {
      ...(filters?.status ? { status: filters.status as never } : {}),
      ...(filters?.subjectId ? { subjectId: filters.subjectId } : {}),
    },
    include: {
      subject: { select: { name: true } },
      author: { select: { name: true, email: true } },
      _count: { select: { lessons: true, enrollments: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
}

// ─── Student ─────────────────────────────────────────────────

export async function getPublishedCourses(filters?: {
  subjectId?: string;
}) {
  return prisma.course.findMany({
    where: {
      status: "PUBLISHED",
      ...(filters?.subjectId ? { subjectId: filters.subjectId } : {}),
    },
    include: {
      subject: { select: { name: true } },
      author: { select: { name: true } },
      _count: { select: { lessons: true, enrollments: true, reviews: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getCourseForStudent(courseId: string, studentId: string) {
  const [course, enrollment, completedLessons] = await Promise.all([
    prisma.course.findUnique({
      where: { id: courseId, status: "PUBLISHED" },
      include: {
        subject: { select: { name: true } },
        author: { select: { name: true, email: true } },
        lessons: { orderBy: { order: "asc" } },
        reviews: {
          include: { student: { select: { name: true } } },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        _count: { select: { enrollments: true } },
      },
    }),
    prisma.enrollment.findUnique({
      where: { courseId_studentId: { courseId, studentId } },
    }),
    prisma.lessonProgress.findMany({
      where: { studentId, lesson: { courseId } },
      select: { lessonId: true },
    }),
  ]);

  return {
    course,
    isEnrolled: !!enrollment,
    completedLessonIds: completedLessons.map((p) => p.lessonId),
  };
}

export async function getLessonForStudent(lessonId: string, studentId: string) {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { course: { select: { id: true, title: true, status: true } } },
  });
  if (!lesson || lesson.course.status !== "PUBLISHED") return null;

  const [enrollment, completed] = await Promise.all([
    prisma.enrollment.findUnique({
      where: {
        courseId_studentId: {
          courseId: lesson.courseId,
          studentId,
        },
      },
    }),
    prisma.lessonProgress.findUnique({
      where: { lessonId_studentId: { lessonId, studentId } },
    }),
  ]);

  // Adjacent lessons for navigation
  const siblings = await prisma.lesson.findMany({
    where: { courseId: lesson.courseId },
    orderBy: { order: "asc" },
    select: { id: true, title: true, order: true },
  });

  const idx = siblings.findIndex((l) => l.id === lessonId);

  return {
    lesson,
    isEnrolled: !!enrollment,
    isCompleted: !!completed,
    prev: idx > 0 ? siblings[idx - 1] : null,
    next: idx < siblings.length - 1 ? siblings[idx + 1] : null,
    totalLessons: siblings.length,
  };
}

export async function getCourseQA(courseId: string) {
  return prisma.courseQA.findMany({
    where: { courseId, parentId: null },
    include: {
      author: { select: { name: true, role: true } },
      replies: {
        include: { author: { select: { name: true, role: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}
