import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminExamDetail } from "@/lib/admin/queries";
import { AdminEditExamForm } from "./AdminEditExamForm";

export default async function AdminEditExamPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const exam = await getAdminExamDetail(id);

  if (!exam) notFound();

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="shrink-0">
        <Link href={`/admin/exams/${id}`} className="text-sm text-blue-600 hover:underline">
          ← Quay lại chi tiết đề
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Chỉnh sửa đề kiểm tra</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          {exam.subject.name} · {exam.class.name}
        </p>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="max-w-2xl bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <AdminEditExamForm
          exam={{
            id: exam.id,
            title: exam.title,
            duration: exam.duration,
            showAnswer: exam.showAnswer,
            allowRetake: exam.allowRetake,
            dueAt: exam.dueAt ?? null,
          }}
        />
        </div>
      </div>
    </div>
  );
}
