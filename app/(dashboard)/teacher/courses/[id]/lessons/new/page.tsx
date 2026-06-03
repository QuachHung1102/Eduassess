import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CreateLessonClient } from "./CreateLessonClient";

export default async function NewLessonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const course = await prisma.course.findUnique({
    where: { id },
    select: { id: true, title: true, authorId: true },
  });

  if (!course) notFound();

  if (
    session.user.role !== "ADMIN" &&
    course.authorId !== session.user.id
  ) {
    redirect("/teacher/courses");
  }

  return (
    <CreateLessonClient
      courseId={course.id}
      courseTitle={course.title}
    />
  );
}
