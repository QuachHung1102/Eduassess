"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/require";
import type { Role } from "@/lib/types";
import * as store from "@/lib/courses/store";

// ─── Helpers ─────────────────────────────────────────────────

/**
 * Auth cho seam Course: đi qua helper chung `requireRole` (lib/auth/require)
 * thay vì tự đọc session. Ném lỗi nếu không hợp lệ — giữ nguyên hợp đồng cũ
 * của các action trong file này (không đổi call site / client).
 */
async function requireAuth(allowedRoles: Role[]) {
  const result = await requireRole(...allowedRoles);
  if (result.error !== null) throw new Error(result.error);
  return result.user;
}

/** ownerId cho store: Admin = undefined (mọi khóa), còn lại = giới hạn theo id. */
function ownerScope(user: { id?: string; role?: string | null }) {
  return user.role === "ADMIN" ? undefined : user.id;
}

// ─── Course CRUD ─────────────────────────────────────────────

export async function createCourseAction(data: {
  title: string;
  description: string;
  subjectId: string;
  thumbnail?: string;
}) {
  const user = await requireAuth(["TEACHER", "ADMIN"]);

  const r = await store.createCourse(data, {
    authorId: user.id!,
    publish: user.role === "ADMIN",
  });

  revalidatePath("/teacher/courses");
  revalidatePath("/admin/courses");
  return { courseId: r.courseId };
}

export async function updateCourseAction(
  courseId: string,
  data: { title?: string; description?: string; subjectId?: string; thumbnail?: string },
) {
  const user = await requireAuth(["TEACHER", "ADMIN"]);

  const r = await store.updateCourse(courseId, data, { ownerId: ownerScope(user) });
  if ("error" in r) return r;

  revalidatePath(`/teacher/courses/${courseId}/edit`);
  revalidatePath(`/student/courses/${courseId}`);
  return { success: true };
}

export async function submitCourseForReviewAction(courseId: string) {
  const user = await requireAuth(["TEACHER"]);

  const r = await store.submitCourseForReview(courseId, { ownerId: user.id! });
  if ("error" in r) return r;

  revalidatePath("/teacher/courses");
  revalidatePath("/admin/courses");
  return { success: true };
}

export async function deleteCourseAction(courseId: string) {
  const user = await requireAuth(["TEACHER", "ADMIN"]);

  const r = await store.deleteCourse(courseId, { ownerId: ownerScope(user) });
  if ("error" in r) return r;

  revalidatePath("/teacher/courses");
  revalidatePath("/admin/courses");
  return { success: true };
}

// ─── Admin: Approve / Reject ──────────────────────────────────

export async function approveCourseAction(courseId: string) {
  await requireAuth(["ADMIN"]);

  await store.approveCourse(courseId);

  revalidatePath("/admin/courses");
  revalidatePath("/student/courses");
  return { success: true };
}

export async function rejectCourseAction(courseId: string) {
  await requireAuth(["ADMIN"]);

  await store.setCourseStatus(courseId, "DRAFT");

  revalidatePath("/admin/courses");
  return { success: true };
}

export async function archiveCourseAction(courseId: string) {
  await requireAuth(["ADMIN"]);

  await store.setCourseStatus(courseId, "ARCHIVED");

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

  const r = await store.createLesson(data, { ownerId: ownerScope(user) });
  if ("error" in r) return r;

  revalidatePath(`/teacher/courses/${data.courseId}/edit`);
  return { lessonId: r.lessonId };
}

export async function updateLessonAction(
  lessonId: string,
  data: { title?: string; content?: string; videoUrl?: string },
) {
  const user = await requireAuth(["TEACHER", "ADMIN"]);

  const r = await store.updateLesson(lessonId, data, { ownerId: ownerScope(user) });
  if ("error" in r) return r;

  revalidatePath(`/teacher/courses/${r.courseId}/edit`);
  return { success: true };
}

export async function reorderLessonsAction(courseId: string, orderedIds: string[]) {
  const user = await requireAuth(["TEACHER", "ADMIN"]);

  const r = await store.reorderLessons(courseId, orderedIds, { ownerId: ownerScope(user) });
  if ("error" in r) return r;

  revalidatePath(`/teacher/courses/${courseId}/edit`);
  return { success: true };
}

export async function deleteLessonAction(lessonId: string) {
  const user = await requireAuth(["TEACHER", "ADMIN"]);

  const r = await store.deleteLesson(lessonId, { ownerId: ownerScope(user) });
  if ("error" in r) return r;

  revalidatePath(`/teacher/courses/${r.courseId}/edit`);
  return { success: true };
}

// ─── Student: Enrollment & Progress ──────────────────────────

export async function enrollCourseAction(courseId: string) {
  const user = await requireAuth(["STUDENT"]);

  await store.enrollCourse(courseId, user.id!);

  revalidatePath(`/student/courses/${courseId}`);
  return { success: true };
}

export async function markLessonCompleteAction(lessonId: string) {
  const user = await requireAuth(["STUDENT"]);

  const r = await store.markLessonComplete(lessonId, user.id!);

  revalidatePath(`/student/courses/${r.courseId}/learn/${lessonId}`);
  return { success: true };
}

// ─── Student: Review ─────────────────────────────────────────

export async function submitReviewAction(data: {
  courseId: string;
  rating: number;
  comment: string;
}) {
  const user = await requireAuth(["STUDENT"]);

  const r = await store.submitReview(data, user.id!);
  if ("error" in r) return r;

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

  const r = await store.postQA(data, user.id!);
  if ("error" in r) return r;

  revalidatePath(`/student/courses/${data.courseId}`);
  return { qaId: r.qaId };
}
