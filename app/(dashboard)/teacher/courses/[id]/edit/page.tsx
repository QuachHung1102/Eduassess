import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { getCourseWithLessons } from "@/lib/courses/queries";
import { getAdminSubjects } from "@/lib/admin/queries";
import { CourseEditorClient } from "./CourseEditorClient";

export default async function CourseEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [course, subjects] = await Promise.all([
    getCourseWithLessons(id),
    getAdminSubjects(),
  ]);

  if (!course) notFound();

  // Only author or admin can edit
  if (
    session.user.role !== "ADMIN" &&
    course.authorId !== session.user.id
  ) {
    redirect("/teacher/courses");
  }

  return (
    <CourseEditorClient
      course={course}
      subjects={subjects}
      userRole={session.user.role as string}
    />
  );
}
