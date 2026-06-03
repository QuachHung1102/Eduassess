"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

// ─── Helpers ─────────────────────────────────────────────────

async function requireAuth(allowedRoles: string[]) {
  const session = await auth();
  if (!session?.user) throw new Error("Chưa đăng nhập");
  if (!allowedRoles.includes(session.user.role as string))
    throw new Error("Không có quyền thực hiện");
  return session.user;
}

// ─── Course CRUD ─────────────────────────────────────────────

export async function createCourseAction(data: {
  title: string;
  description: string;
  subjectId: string;
  thumbnail?: string;
}) {
  const user = await requireAuth(["TEACHER", "ADMIN"]);

  const course = await prisma.course.create({
    data: {
      title: data.title.trim(),
      description: data.description.trim() || null,
      subjectId: data.subjectId,
      thumbnail: data.thumbnail || null,
      authorId: user.id!,
      status: user.role === "ADMIN" ? "PUBLISHED" : "DRAFT",
    },
  });

  revalidatePath("/teacher/courses");
  revalidatePath("/admin/courses");
  return { courseId: course.id };
}

export async function updateCourseAction(
  courseId: string,
  data: {
    title?: string;
    description?: string;
    subjectId?: string;
    thumbnail?: string;
  },
) {
  const user = await requireAuth(["TEACHER", "ADMIN"]);

  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) return { error: "Không tìm thấy khóa học" };
  if (user.role !== "ADMIN" && course.authorId !== user.id)
    return { error: "Không có quyền chỉnh sửa" };

  await prisma.course.update({
    where: { id: courseId },
    data: {
      ...(data.title !== undefined ? { title: data.title.trim() } : {}),
      ...(data.description !== undefined
        ? { description: data.description.trim() || null }
        : {}),
      ...(data.subjectId !== undefined ? { subjectId: data.subjectId } : {}),
      ...(data.thumbnail !== undefined ? { thumbnail: data.thumbnail || null } : {}),
    },
  });

  revalidatePath(`/teacher/courses/${courseId}/edit`);
  revalidatePath(`/student/courses/${courseId}`);
  return { success: true };
}

export async function submitCourseForReviewAction(courseId: string) {
  const user = await requireAuth(["TEACHER"]);

  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) return { error: "Không tìm thấy khóa học" };
  if (course.authorId !== user.id) return { error: "Không có quyền" };
  if (course.status !== "DRAFT") return { error: "Chỉ có thể gửi duyệt khi ở trạng thái Nháp" };

  const lessonCount = await prisma.lesson.count({ where: { courseId } });
  if (lessonCount === 0) return { error: "Khóa học cần có ít nhất 1 bài giảng trước khi gửi duyệt" };

  await prisma.course.update({
    where: { id: courseId },
    data: { status: "PENDING" },
  });

  revalidatePath("/teacher/courses");
  revalidatePath("/admin/courses");
  return { success: true };
}

export async function deleteCourseAction(courseId: string) {
  const user = await requireAuth(["TEACHER", "ADMIN"]);

  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) return { error: "Không tìm thấy khóa học" };
  if (user.role !== "ADMIN" && course.authorId !== user.id)
    return { error: "Không có quyền xóa" };

  await prisma.course.delete({ where: { id: courseId } });

  revalidatePath("/teacher/courses");
  revalidatePath("/admin/courses");
  return { success: true };
}

// ─── Admin: Approve / Reject ──────────────────────────────────

export async function approveCourseAction(courseId: string) {
  await requireAuth(["ADMIN"]);

  await prisma.course.update({
    where: { id: courseId },
    data: { status: "PUBLISHED" },
  });

  revalidatePath("/admin/courses");
  revalidatePath("/student/courses");
  return { success: true };
}

export async function rejectCourseAction(courseId: string) {
  await requireAuth(["ADMIN"]);

  await prisma.course.update({
    where: { id: courseId },
    data: { status: "DRAFT" },
  });

  revalidatePath("/admin/courses");
  return { success: true };
}

export async function archiveCourseAction(courseId: string) {
  await requireAuth(["ADMIN"]);

  await prisma.course.update({
    where: { id: courseId },
    data: { status: "ARCHIVED" },
  });

  revalidatePath("/admin/courses");
  revalidatePath("/student/courses");
  return { success: true };
}

// ─── Lesson CRUD ─────────────────────────────────────────────

export async function createLessonAction(data: {
  courseId: string;
  title: string;
  content: string;
  videoUrl?: string;
}) {
  const user = await requireAuth(["TEACHER", "ADMIN"]);

  const course = await prisma.course.findUnique({ where: { id: data.courseId } });
  if (!course) return { error: "Không tìm thấy khóa học" };
  if (user.role !== "ADMIN" && course.authorId !== user.id)
    return { error: "Không có quyền" };

  const lastLesson = await prisma.lesson.findFirst({
    where: { courseId: data.courseId },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  const lesson = await prisma.lesson.create({
    data: {
      courseId: data.courseId,
      title: data.title.trim(),
      content: data.content,
      videoUrl: data.videoUrl?.trim() || null,
      order: (lastLesson?.order ?? 0) + 1,
    },
  });

  revalidatePath(`/teacher/courses/${data.courseId}/edit`);
  return { lessonId: lesson.id };
}

export async function updateLessonAction(
  lessonId: string,
  data: { title?: string; content?: string; videoUrl?: string },
) {
  const user = await requireAuth(["TEACHER", "ADMIN"]);

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { course: true },
  });
  if (!lesson) return { error: "Không tìm thấy bài giảng" };
  if (user.role !== "ADMIN" && lesson.course.authorId !== user.id)
    return { error: "Không có quyền" };

  await prisma.lesson.update({
    where: { id: lessonId },
    data: {
      ...(data.title !== undefined ? { title: data.title.trim() } : {}),
      ...(data.content !== undefined ? { content: data.content } : {}),
      ...(data.videoUrl !== undefined
        ? { videoUrl: data.videoUrl?.trim() || null }
        : {}),
    },
  });

  revalidatePath(`/teacher/courses/${lesson.courseId}/edit`);
  return { success: true };
}

export async function reorderLessonsAction(
  courseId: string,
  orderedIds: string[],
) {
  const user = await requireAuth(["TEACHER", "ADMIN"]);

  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) return { error: "Không tìm thấy" };
  if (user.role !== "ADMIN" && course.authorId !== user.id)
    return { error: "Không có quyền" };

  await prisma.$transaction(
    orderedIds.map((id, idx) =>
      prisma.lesson.update({ where: { id }, data: { order: idx + 1 } }),
    ),
  );

  revalidatePath(`/teacher/courses/${courseId}/edit`);
  return { success: true };
}

export async function deleteLessonAction(lessonId: string) {
  const user = await requireAuth(["TEACHER", "ADMIN"]);

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { course: true },
  });
  if (!lesson) return { error: "Không tìm thấy" };
  if (user.role !== "ADMIN" && lesson.course.authorId !== user.id)
    return { error: "Không có quyền" };

  const courseId = lesson.courseId;
  await prisma.lesson.delete({ where: { id: lessonId } });

  revalidatePath(`/teacher/courses/${courseId}/edit`);
  return { success: true };
}

// ─── Student: Enrollment & Progress ──────────────────────────

export async function enrollCourseAction(courseId: string) {
  const user = await requireAuth(["STUDENT"]);

  const existing = await prisma.enrollment.findUnique({
    where: { courseId_studentId: { courseId, studentId: user.id! } },
  });
  if (existing) return { success: true };

  await prisma.enrollment.create({
    data: { courseId, studentId: user.id! },
  });

  revalidatePath(`/student/courses/${courseId}`);
  return { success: true };
}

export async function markLessonCompleteAction(lessonId: string) {
  const user = await requireAuth(["STUDENT"]);

  await prisma.lessonProgress.upsert({
    where: { lessonId_studentId: { lessonId, studentId: user.id! } },
    create: { lessonId, studentId: user.id! },
    update: { completedAt: new Date() },
  });

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { courseId: true },
  });

  revalidatePath(`/student/courses/${lesson?.courseId}/learn/${lessonId}`);
  return { success: true };
}

// ─── Student: Review ─────────────────────────────────────────

export async function submitReviewAction(data: {
  courseId: string;
  rating: number;
  comment: string;
}) {
  const user = await requireAuth(["STUDENT"]);

  if (data.rating < 1 || data.rating > 5) return { error: "Đánh giá không hợp lệ" };

  const enrollment = await prisma.enrollment.findUnique({
    where: { courseId_studentId: { courseId: data.courseId, studentId: user.id! } },
  });
  if (!enrollment) return { error: "Bạn chưa ghi danh khóa học này" };

  await prisma.courseReview.upsert({
    where: { courseId_studentId: { courseId: data.courseId, studentId: user.id! } },
    create: {
      courseId: data.courseId,
      studentId: user.id!,
      rating: data.rating,
      comment: data.comment.trim() || null,
    },
    update: {
      rating: data.rating,
      comment: data.comment.trim() || null,
    },
  });

  revalidatePath(`/student/courses/${data.courseId}`);
  return { success: true };
}

// ─── Q&A ─────────────────────────────────────────────────────

export async function postQAAction(data: {
  courseId: string;
  content: string;
  parentId?: string;
}) {
  const user = await requireAuth(["STUDENT", "TEACHER", "ADMIN"]);

  if (!data.content.trim()) return { error: "Nội dung không được để trống" };

  const qa = await prisma.courseQA.create({
    data: {
      courseId: data.courseId,
      authorId: user.id!,
      content: data.content.trim(),
      parentId: data.parentId || null,
    },
  });

  revalidatePath(`/student/courses/${data.courseId}`);
  return { qaId: qa.id };
}
