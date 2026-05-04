import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminQuestionById, getAdminGrades } from "@/lib/admin/queries";
import { getAdminSubjects } from "@/lib/admin/queries";
import { AdminEditQuestionForm } from "./AdminEditQuestionForm";

export default async function AdminEditQuestionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [question, subjects, grades] = await Promise.all([
    getAdminQuestionById(id),
    getAdminSubjects(),
    getAdminGrades(),
  ]);

  if (!question) notFound();

  const options = question.options as { label: string; text: string; isCorrect: boolean }[];

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="shrink-0">
        <Link href="/admin/questions" className="text-sm text-blue-600 hover:underline">
          ← Quay lại ngân hàng câu hỏi
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Sửa câu hỏi</h1>
        <p className="text-gray-500 text-sm mt-1">
          Người tạo: {question.createdBy.name}
        </p>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <AdminEditQuestionForm
            questionId={question.id}
            subjects={subjects.map((s) => ({ id: s.id, name: s.name }))}
            grades={grades}
            initialData={{
              content: question.content,
              explanation: question.explanation,
              difficulty: question.difficulty,
              subjectId: question.subjectId,
              gradeId: question.topic.gradeId,
              topicName: question.topic.name,
              options,
            }}
          />
        </div>
      </div>
    </div>
  );
}
