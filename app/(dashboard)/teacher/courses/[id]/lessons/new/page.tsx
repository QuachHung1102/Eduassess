import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { requirePageSession } from "@/lib/auth/page-guard";
import { CreateLessonClient } from "./CreateLessonClient";

export default async function NewLessonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requirePageSession();

  const course = await prisma.course.findUnique({
    where: { id },
    select: { id: true, title: true, authorId: true },
  });

  if (!course) notFound();

  if (user.role !== "ADMIN" && course.authorId !== user.id) {
    redirect("/teacher/courses");
  }

  return (
    <CreateLessonClient
      courseId={course.id}
      courseTitle={course.title}
    />
  );
}
