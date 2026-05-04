import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { EditExamForm } from "./EditExamForm";

export default async function EditExamPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) notFound();

  const exam = await prisma.exam.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      duration: true,
      showAnswer: true,
      allowRetake: true,
      dueAt: true,
      createdById: true,
      subject: { select: { name: true } },
      class: { select: { name: true } },
    },
  });

  if (!exam || exam.createdById !== session.user.id) notFound();

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="shrink-0">
        <Link href={`/teacher/exams/${id}`} className="text-sm text-blue-600 hover:underline">
          ← Quay lại chi tiết đề
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Chỉnh sửa đề kiểm tra</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          {exam.subject.name} · Lớp {exam.class.name}
        </p>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="max-w-2xl bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <EditExamForm exam={exam} />
        </div>
      </div>
    </div>
  );
}
