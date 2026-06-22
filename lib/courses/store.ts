/**
 * Module thuần cho domain Khóa học online (Course/Lesson).
 *
 * Chứa toàn bộ logic nghiệp vụ + mọi đường đọc/ghi DB của Course, Lesson,
 * Enrollment, LessonProgress, CourseReview, CourseQA. KHÔNG đọc session —
 * auth/permission/revalidate nằm ở seam (`lib/courses/actions.ts`).
 *
 * Chính sách sở hữu đi qua context `ownerId`:
 *   - `ownerId = userId` → giới hạn theo người tạo (Teacher chỉ sửa của mình).
 *   - `ownerId = undefined` → thao tác trên mọi bản ghi (Admin).
 */

import { prisma } from "@/lib/db/prisma";
import type { CourseStatus } from "@prisma/client";

type Err = { error: string };
type Ok<T> = { success: true } & T;
type Result<T = unknown> = Err | Ok<T>;

const NOT_FOUND = { error: "Không tìm thấy khóa học" } as const;
const NO_RIGHT = { error: "Không có quyền" } as const;

/** Khóa thuộc về owner? (undefined ownerId = admin, bỏ qua giới hạn) */
function ownsCourse(authorId: string, ownerId?: string) {
  return ownerId === undefined || authorId === ownerId;
}

// ─── Course CRUD ─────────────────────────────────────────────

export async function createCourse(
  data: { title: string; description: string; subjectId: string; thumbnail?: string },
  ctx: { authorId: string; publish: boolean },
): Promise<Ok<{ courseId: string }>> {
  const course = await prisma.course.create({
    data: {
      title: data.title.trim(),
      description: data.description.trim() || null,
      subjectId: data.subjectId,
      thumbnail: data.thumbnail || null,
      authorId: ctx.authorId,
      status: ctx.publish ? "PUBLISHED" : "DRAFT",
    },
  });
  return { success: true, courseId: course.id };
}

export async function updateCourse(
  courseId: string,
  data: { title?: string; description?: string; subjectId?: string; thumbnail?: string },
  ctx: { ownerId?: string },
): Promise<Result> {
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) return NOT_FOUND;
  if (!ownsCourse(course.authorId, ctx.ownerId)) return { error: "Không có quyền chỉnh sửa" };

  await prisma.course.update({
    where: { id: courseId },
    data: {
      ...(data.title !== undefined ? { title: data.title.trim() } : {}),
      ...(data.description !== undefined ? { description: data.description.trim() || null } : {}),
      ...(data.subjectId !== undefined ? { subjectId: data.subjectId } : {}),
      ...(data.thumbnail !== undefined ? { thumbnail: data.thumbnail || null } : {}),
    },
  });
  return { success: true };
}

/** Teacher gửi khóa học (DRAFT, có ≥1 bài) cho admin duyệt. */
export async function submitCourseForReview(
  courseId: string,
  ctx: { ownerId: string },
): Promise<Result> {
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) return NOT_FOUND;
  if (!ownsCourse(course.authorId, ctx.ownerId)) return NO_RIGHT;
  if (course.status !== "DRAFT") return { error: "Chỉ có thể gửi duyệt khi ở trạng thái Nháp" };

  const lessonCount = await prisma.lesson.count({ where: { courseId } });
  if (lessonCount === 0)
    return { error: "Khóa học cần có ít nhất 1 bài giảng trước khi gửi duyệt" };

  await prisma.course.update({ where: { id: courseId }, data: { status: "PENDING" } });
  return { success: true };
}

export async function deleteCourse(
  courseId: string,
  ctx: { ownerId?: string },
): Promise<Result> {
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) return NOT_FOUND;
  if (!ownsCourse(course.authorId, ctx.ownerId)) return { error: "Không có quyền xóa" };

  await prisma.course.delete({ where: { id: courseId } });
  return { success: true };
}

// ─── Admin: chuyển trạng thái duyệt ──────────────────────────

/** Duyệt & xuất bản; gửi noti cho tác giả. */
export async function approveCourse(courseId: string): Promise<Result> {
  const course = await prisma.course.update({
    where: { id: courseId },
    data: { status: "PUBLISHED" },
    select: { title: true, authorId: true },
  });

  await prisma.notification.create({
    data: {
      userId: course.authorId,
      title: "Khóa học đã được duyệt",
      message: `Khóa học "${course.title}" của bạn đã được admin phê duyệt và xuất bản.`,
      type: "COURSE_APPROVED",
      href: "/teacher/courses",
    },
  });
  return { success: true };
}

/** Đổi trạng thái khóa học (từ chối → DRAFT, ẩn → ARCHIVED). */
export async function setCourseStatus(
  courseId: string,
  status: CourseStatus,
): Promise<Result> {
  await prisma.course.update({ where: { id: courseId }, data: { status } });
  return { success: true };
}

// ─── Lesson CRUD ─────────────────────────────────────────────

export async function createLesson(
  data: { courseId: string; title: string; content: string; videoUrl?: string },
  ctx: { ownerId?: string },
): Promise<Result<{ lessonId: string }>> {
  const course = await prisma.course.findUnique({ where: { id: data.courseId } });
  if (!course) return NOT_FOUND;
  if (!ownsCourse(course.authorId, ctx.ownerId)) return NO_RIGHT;

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
  return { success: true, lessonId: lesson.id };
}

export async function updateLesson(
  lessonId: string,
  data: { title?: string; content?: string; videoUrl?: string },
  ctx: { ownerId?: string },
): Promise<Result<{ courseId: string }>> {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { course: true },
  });
  if (!lesson) return { error: "Không tìm thấy bài giảng" };
  if (!ownsCourse(lesson.course.authorId, ctx.ownerId)) return NO_RIGHT;

  await prisma.lesson.update({
    where: { id: lessonId },
    data: {
      ...(data.title !== undefined ? { title: data.title.trim() } : {}),
      ...(data.content !== undefined ? { content: data.content } : {}),
      ...(data.videoUrl !== undefined ? { videoUrl: data.videoUrl?.trim() || null } : {}),
    },
  });
  return { success: true, courseId: lesson.courseId };
}

export async function reorderLessons(
  courseId: string,
  orderedIds: string[],
  ctx: { ownerId?: string },
): Promise<Result> {
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) return { error: "Không tìm thấy" };
  if (!ownsCourse(course.authorId, ctx.ownerId)) return NO_RIGHT;

  await prisma.$transaction(
    orderedIds.map((id, idx) =>
      prisma.lesson.update({ where: { id }, data: { order: idx + 1 } }),
    ),
  );
  return { success: true };
}

export async function deleteLesson(
  lessonId: string,
  ctx: { ownerId?: string },
): Promise<Result<{ courseId: string }>> {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { course: true },
  });
  if (!lesson) return { error: "Không tìm thấy" };
  if (!ownsCourse(lesson.course.authorId, ctx.ownerId)) return NO_RIGHT;

  const courseId = lesson.courseId;
  await prisma.lesson.delete({ where: { id: lessonId } });
  return { success: true, courseId };
}

// ─── Student: Enrollment & Progress ──────────────────────────

export async function enrollCourse(courseId: string, studentId: string): Promise<Ok<unknown>> {
  const existing = await prisma.enrollment.findUnique({
    where: { courseId_studentId: { courseId, studentId } },
  });
  if (existing) return { success: true };

  await prisma.enrollment.create({ data: { courseId, studentId } });
  return { success: true };
}

export async function markLessonComplete(
  lessonId: string,
  studentId: string,
): Promise<Ok<{ courseId: string | undefined }>> {
  await prisma.lessonProgress.upsert({
    where: { lessonId_studentId: { lessonId, studentId } },
    create: { lessonId, studentId },
    update: { completedAt: new Date() },
  });

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { courseId: true },
  });
  return { success: true, courseId: lesson?.courseId };
}

// ─── Student: Review ─────────────────────────────────────────

export async function submitReview(
  data: { courseId: string; rating: number; comment: string },
  studentId: string,
): Promise<Result> {
  if (data.rating < 1 || data.rating > 5) return { error: "Đánh giá không hợp lệ" };

  const enrollment = await prisma.enrollment.findUnique({
    where: { courseId_studentId: { courseId: data.courseId, studentId } },
  });
  if (!enrollment) return { error: "Bạn chưa ghi danh khóa học này" };

  await prisma.courseReview.upsert({
    where: { courseId_studentId: { courseId: data.courseId, studentId } },
    create: {
      courseId: data.courseId,
      studentId,
      rating: data.rating,
      comment: data.comment.trim() || null,
    },
    update: { rating: data.rating, comment: data.comment.trim() || null },
  });
  return { success: true };
}

// ─── Q&A ─────────────────────────────────────────────────────

export async function postQA(
  data: { courseId: string; content: string; parentId?: string },
  authorId: string,
): Promise<Result<{ qaId: string }>> {
  if (!data.content.trim()) return { error: "Nội dung không được để trống" };

  const qa = await prisma.courseQA.create({
    data: {
      courseId: data.courseId,
      authorId,
      content: data.content.trim(),
      parentId: data.parentId || null,
    },
  });
  return { success: true, qaId: qa.id };
}
