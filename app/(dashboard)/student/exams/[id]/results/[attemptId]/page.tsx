import Link from "next/link";
import { notFound } from "next/navigation";
import { getStudentAttemptResult } from "@/lib/student/queries";
import { AiFeedback } from "./AiFeedback";
import { MathText } from "@/components/MathText";
import { FaIcon } from "@/components/ui/FaIcon";
import { faTrophy, faThumbsUp, faBookOpen } from "@fortawesome/free-solid-svg-icons";

export default async function ExamResultPage({
  params,
}: {
  params: Promise<{ id: string; attemptId: string }>;
}) {
  const { id, attemptId } = await params;
  const attempt = await getStudentAttemptResult(attemptId);

  if (!attempt || attempt.examId !== id) notFound();

  const score = attempt.score ?? 0;
  const total = attempt.exam.examQuestions.length;

  const answerMap = new Map(attempt.answers.map((a) => [a.questionId, a]));

  const scoreColor =
    score >= 80 ? "text-green-600" : score >= 50 ? "text-yellow-600" : "text-red-600";
  const scoreBg =
    score >= 80 ? "bg-green-50 border-green-200" : score >= 50 ? "bg-yellow-50 border-yellow-200" : "bg-red-50 border-red-200";

  const correctCount = attempt.answers.filter((a) => a.isCorrect).length;

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="shrink-0">
        <Link href="/student/exams?tab=completed" className="text-sm text-blue-600 hover:underline">
          ← Quay lại danh sách
        </Link>
        <h1 className="text-xl md:text-2xl font-bold text-gray-900 mt-3">{attempt.exam.title}</h1>
        <p className="text-sm text-gray-500 mt-1">
          Nộp lúc: {attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleString("vi-VN") : "—"}
        </p>
      </div>

      {/* Score card */}
      <div className={`shrink-0 rounded-xl border p-5 md:p-6 ${scoreBg}`}>
        <div className="flex items-center gap-5 md:gap-6">
          <div className={`text-4xl md:text-5xl font-bold tabular-nums shrink-0 ${scoreColor}`}>
            {score.toFixed(0)}%
          </div>
          <div>
            <p className="font-semibold text-gray-900">
              {correctCount}/{total} câu đúng
            </p>
            <p className="text-sm text-gray-600 mt-0.5">
              {score >= 80
                ? <><FaIcon icon={faTrophy} className="mr-1 text-yellow-500" /> Xuất sắc! Bạn đã nắm rất vững kiến thức.</>
                : score >= 50
                ? <><FaIcon icon={faThumbsUp} className="mr-1" /> Khá tốt! Tiếp tục ôn luyện để hoàn thiện hơn.</>
                : <><FaIcon icon={faBookOpen} className="mr-1" /> Cần ôn luyện thêm. Hãy xem lại các câu sai bên dưới.</>}
            </p>
          </div>
        </div>
      </div>

      {/* AI Feedback */}
      <AiFeedback attemptId={attemptId} initialFeedback={attempt.aiFeedback ?? null} />

      {/* Question review */}
      {attempt.exam.showAnswer && (
        <div className="space-y-4">
          <h2 className="font-semibold text-gray-900">Đánh giá chi tiết</h2>
          {attempt.exam.examQuestions.map((eq, idx) => {
            const q = eq.question;
            const options = q.options as { label: string; text: string; isCorrect: boolean }[];
            const ans = answerMap.get(q.id);
            const selectedIdx = ans?.selectedOption ?? null;
            const correctIdx = options.findIndex((o) => o.isCorrect);

            return (
              <div
                key={q.id}
                className={`bg-white rounded-xl border p-4 md:p-5 ${ans?.isCorrect ? "border-green-200" : "border-red-200"}`}
              >
                <div className="flex items-start gap-3 mb-4">
                  <span className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${ans?.isCorrect ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                    {ans?.isCorrect ? "✓" : "✗"}
                  </span>
                  <p className="text-sm font-medium text-gray-900 leading-relaxed">
                    <span className="text-gray-400 mr-2">Câu {idx + 1}.</span>
                    <MathText text={q.content} />
                  </p>
                </div>

                <div className="space-y-2 ml-10">
                  {options.map((opt, optIdx) => {
                    const isSelected = selectedIdx === optIdx;
                    const isCorrect = optIdx === correctIdx;

                    let cls = "px-3 py-2 rounded-lg border text-sm flex items-start gap-2 ";
                    if (isCorrect && isSelected) cls += "bg-green-100 border-green-400 text-green-900 font-medium";
                    else if (isCorrect) cls += "bg-green-50 border-green-300 text-green-800";
                    else if (isSelected) cls += "bg-red-50 border-red-300 text-red-800";
                    else cls += "bg-gray-50 border-gray-200 text-gray-600";

                    return (
                      <div key={opt.label} className={cls}>
                        <span className="font-semibold shrink-0">{opt.label}.</span>
                        <span className="flex-1">
                          <MathText text={opt.text} />
                          {isCorrect && !isSelected && (
                            <span className="ml-2 text-xs text-green-700 font-medium whitespace-nowrap">← Đáp án đúng</span>
                          )}
                          {isSelected && !isCorrect && (
                            <span className="ml-2 text-xs text-red-700 font-medium whitespace-nowrap">← Bạn chọn</span>
                          )}
                          {isSelected && isCorrect && (
                            <span className="ml-2 text-xs text-green-700 font-medium whitespace-nowrap">← Đúng ✓</span>
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {selectedIdx === null && (
                  <p className="ml-10 mt-2 text-xs text-gray-400 italic">Bạn đã bỏ qua câu này</p>
                )}

                {q.explanation && (
                  <div className="ml-10 mt-3 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                    <p className="text-xs font-medium text-blue-800 mb-1">💡 Giải thích</p>
                    <p className="text-xs text-blue-700"><MathText text={q.explanation} /></p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!attempt.exam.showAnswer && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center text-gray-500 text-sm">
          Giáo viên đã tắt tính năng xem đáp án cho đề này.
        </div>
      )}
    </div>
  );
}
