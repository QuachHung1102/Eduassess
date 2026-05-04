import { notFound } from "next/navigation";
import Link from "next/link";
import { getTeacherAttemptDetail } from "@/lib/teacher/queries";
import { MathText } from "@/components/MathText";

import { DIFFICULTY_LABEL } from "@/lib/constants/labels";
const OPTION_LABELS = ["A", "B", "C", "D"];

type Option = { text: string; isCorrect: boolean };

export default async function TeacherAttemptDetailPage({
  params,
}: {
  params: Promise<{ id: string; attemptId: string }>;
}) {
  const { id, attemptId } = await params;
  const attempt = await getTeacherAttemptDetail(attemptId);
  if (!attempt) notFound();

  const answerMap = new Map(attempt.answers.map((a) => [a.questionId, a]));
  const total = attempt.exam.examQuestions.length;
  const correct = attempt.answers.filter((a) => a.isCorrect).length;

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <div className="shrink-0">
        <Link
          href={`/teacher/exams/${id}/results`}
          className="text-sm text-blue-600 hover:underline"
        >
          ← Quay lại kết quả lớp
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">
          {attempt.student.name} — {attempt.exam.title}
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          {attempt.student.email} · Điểm:{" "}
          <span className="font-semibold text-gray-900">
            {attempt.score !== null ? `${attempt.score.toFixed(1)}%` : "—"}
          </span>{" "}
          · {correct}/{total} câu đúng
        </p>
      </div>

      {/* Per-question breakdown */}
      <div className="flex-1 overflow-auto flex flex-col gap-3">
        {attempt.exam.examQuestions.map((eq, idx) => {
          const answer = answerMap.get(eq.question.id);
          const options = eq.question.options as Option[];
          const correctIdx = options.findIndex((o) => o.isCorrect);
          const selectedIdx = answer?.selectedOption ?? null;
          const isCorrect = answer?.isCorrect ?? false;

          return (
            <div
              key={eq.question.id}
              className={`bg-white rounded-xl border shadow-sm p-5 ${isCorrect ? "border-green-200" : "border-red-200"}`}
            >
              <div className="flex items-start gap-3 mb-3">
                <span
                  className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                    isCorrect ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                  }`}
                >
                  {idx + 1}
                </span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                      eq.question.difficulty === "EASY" ? "bg-green-100 text-green-700" :
                      eq.question.difficulty === "MEDIUM" ? "bg-yellow-100 text-yellow-700" :
                      "bg-red-100 text-red-700"
                    }`}>
                      {DIFFICULTY_LABEL[eq.question.difficulty]}
                    </span>
                    <span className="text-xs text-gray-400">{eq.question.topic.name}</span>
                  </div>
                  <p className="text-gray-900 font-medium text-sm">
                    <MathText text={eq.question.content} />
                  </p>
                </div>
                <span className={`shrink-0 text-sm font-semibold ${isCorrect ? "text-green-600" : "text-red-600"}`}>
                  {isCorrect ? "✓" : "✗"}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-9">
                {options.map((opt, oi) => {
                  const isSelected = selectedIdx === oi;
                  const isCorrectOpt = oi === correctIdx;
                  let cls = "border border-gray-100 bg-gray-50 text-gray-600";
                  if (isCorrectOpt) cls = "border border-green-300 bg-green-50 text-green-800";
                  if (isSelected && !isCorrectOpt) cls = "border border-red-300 bg-red-50 text-red-700";

                  return (
                    <div key={oi} className={`flex items-start gap-2 px-3 py-2 rounded-lg text-sm ${cls}`}>
                      <span className="font-medium shrink-0">{OPTION_LABELS[oi]}.</span>
                      <MathText text={opt.text} />
                      {isSelected && !isCorrectOpt && (
                        <span className="ml-auto shrink-0 text-xs">← HS chọn</span>
                      )}
                      {isCorrectOpt && (
                        <span className="ml-auto shrink-0 text-xs">✓</span>
                      )}
                    </div>
                  );
                })}
              </div>

              {selectedIdx === null && (
                <p className="pl-9 mt-2 text-xs text-gray-400 italic">Học sinh bỏ qua câu này</p>
              )}

              {eq.question.explanation && (
                <div className="pl-9 mt-3 p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-800">
                  <span className="font-medium">Giải thích: </span>
                  <MathText text={eq.question.explanation} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
