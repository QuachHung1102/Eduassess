import { redirect, notFound } from "next/navigation";
import { getCourseWithLessons } from "@/lib/courses/queries";
import { getAdminSubjects } from "@/lib/admin/queries";
import { requirePageSession } from "@/lib/auth/page-guard";
import { CourseEditorClient } from "./CourseEditorClient";

export default async function CourseEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requirePageSession();

  const [course, subjects] = await Promise.all([
    getCourseWithLessons(id),
    getAdminSubjects(),
  ]);

  if (!course) notFound();

  // Only author or admin can edit
  if (user.role !== "ADMIN" && course.authorId !== user.id) {
    redirect("/teacher/courses");
  }

  return (
    <CourseEditorClient
      course={course}
      subjects={subjects}
      userRole={user.role}
    />
  );
}
