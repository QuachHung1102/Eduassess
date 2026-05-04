import Link from "next/link";
import { notFound } from "next/navigation";
import { getTeacherQuestionById } from "@/lib/teacher/queries";
import { EditQuestionForm } from "./EditQuestionForm";

export default async function EditQuestionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const question = await getTeacherQuestionById(id);

  if (!question) notFound();

  const options = question.options as { label: string; text: string; isCorrect: boolean }[];

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="shrink-0">
        <Link href="/teacher/question-bank" className="text-sm text-blue-600 hover:underline">
          ← Quay lại ngân hàng câu hỏi
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Sửa câu hỏi</h1>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <EditQuestionForm
            questionId={question.id}
            initialData={{
              content: question.content,
              explanation: question.explanation,
              difficulty: question.difficulty,
              options,
              topic: {
                name: question.topic.name,
                grade: { id: question.topic.gradeId, gradeNumber: question.topic.grade.gradeNumber },
              },
              subject: { id: question.subject.id, name: question.subject.name },
            }}
          />
        </div>
      </div>
    </div>
  );
}
