import Link from "next/link";
import { notFound } from "next/navigation";
import { getTeacherExamDetail } from "@/lib/teacher/queries";
import { DeleteExamButton } from "./DeleteExamButton";
import { FaIcon } from "@/components/ui/FaIcon";
import { faChartBar, faPen } from "@fortawesome/free-solid-svg-icons";

import { DIFFICULTY_LABEL, DIFFICULTY_COLOR } from "@/lib/constants/labels";

export default async function ExamDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const exam = await getTeacherExamDetail(id);

  if (!exam) notFound();

  const easyCount = exam.examQuestions.filter((eq) => eq.question.difficulty === "EASY").length;
  const mediumCount = exam.examQuestions.filter((eq) => eq.question.difficulty === "MEDIUM").length;
  const hardCount = exam.examQuestions.filter((eq) => eq.question.difficulty === "HARD").length;

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <div className="shrink-0 flex items-start justify-between">
        <div>
          <Link href="/teacher/exams" className="text-sm text-blue-600 hover:underline">
            ← Quay lại danh sách đề
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">{exam.title}</h1>
          <p className="text-gray-500 text-sm mt-1">
            {exam.subject.name} · Lớp {exam.class.name} · {exam.duration} phút
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/teacher/exams/${id}/edit`}
            className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <FaIcon icon={faPen} className="mr-1.5" /> Chỉnh sửa
          </Link>
          <Link
            href={`/teacher/exams/${id}/results`}
            className="border border-blue-300 text-blue-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-50 transition-colors"
          >
            <FaIcon icon={faChartBar} className="mr-1.5" /> Kết quả
          </Link>
          <DeleteExamButton examId={id} />
        </div>
      </div>

      {/* Info cards */}
      <div className="shrink-0 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Tổng câu hỏi", value: exam.examQuestions.length },
          { label: "Lượt làm bài", value: exam._count.examAttempts },
          { label: "Dễ / TB / Khó", value: `${easyCount} / ${mediumCount} / ${hardCount}` },
          { label: "Xem đáp án", value: exam.showAnswer ? "Có" : "Không" },
          {
            label: "Hạn nộp",
            value: exam.dueAt
              ? new Date(exam.dueAt).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
              : "Không giới hạn",
          },
        ].map((c) => (
          <div key={c.label} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <div className="text-xs text-gray-500 mb-1">{c.label}</div>
            <div className="text-xl font-bold text-gray-900">{c.value}</div>
          </div>
        ))}
      </div>

      {/* Questions list */}
      <div className="flex-1 flex flex-col min-h-0 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 shrink-0">
          <h2 className="font-semibold text-gray-900 text-sm">Danh sách câu hỏi ({exam.examQuestions.length})</h2>
        </div>
        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100 sticky top-0">
              <tr>
                {["#", "Nội dung câu hỏi", "Chủ đề", "Độ khó"].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {exam.examQuestions.map((eq) => (
                <tr key={eq.questionId} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-400 text-xs w-10">{eq.order}</td>
                  <td className="px-4 py-3">
                    <p className="line-clamp-2 text-gray-900">{eq.question.content}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                    {eq.question.topic.name}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${DIFFICULTY_COLOR[eq.question.difficulty]}`}>
                      {DIFFICULTY_LABEL[eq.question.difficulty]}
                    </span>
                  </td>
                </tr>
              ))}
              {exam.examQuestions.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center py-12 text-gray-400">
                    Đề này chưa có câu hỏi.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
