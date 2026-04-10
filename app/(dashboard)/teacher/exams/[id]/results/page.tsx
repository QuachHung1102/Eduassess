import Link from "next/link";
import { notFound } from "next/navigation";
import { getTeacherExamAttempts } from "@/lib/teacher/queries";

export default async function ExamResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getTeacherExamAttempts(id);

  if (!data) notFound();

  const { exam, attempts } = data;

  const submitted = attempts.filter((a) => a.submittedAt !== null);
  const avgScore =
    submitted.length > 0 && submitted.some((a) => a.score !== null)
      ? submitted
          .filter((a) => a.score !== null)
          .reduce((sum, a) => sum + (a.score ?? 0), 0) /
        submitted.filter((a) => a.score !== null).length
      : null;

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <div className="shrink-0 flex items-start justify-between">
        <div>
          <Link href={`/teacher/exams/${id}`} className="text-sm text-blue-600 hover:underline">
            ← Quay lại chi tiết đề
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">Kết quả: {exam.title}</h1>
        </div>
      </div>

      {/* Summary */}
      <div className="shrink-0 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Tổng lượt làm", value: attempts.length },
          { label: "Đã nộp", value: submitted.length },
          { label: "Đang làm", value: attempts.length - submitted.length },
          {
            label: "Điểm trung bình",
            value: avgScore !== null ? `${avgScore.toFixed(1)}%` : "—",
          },
        ].map((c) => (
          <div key={c.label} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <div className="text-xs text-gray-500 mb-1">{c.label}</div>
            <div className="text-xl font-bold text-gray-900">{c.value}</div>
          </div>
        ))}
      </div>

      {/* Attempts table */}
      <div className="flex-1 flex flex-col min-h-0 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 shrink-0">
          <h2 className="font-semibold text-gray-900 text-sm">
            Chi tiết từng học sinh ({attempts.length})
          </h2>
        </div>
        <div className="flex-1 overflow-auto">
          {attempts.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-400 py-16">
              <div className="text-center">
                <div className="text-3xl mb-2">📊</div>
                <p className="text-sm">Chưa có học sinh nào làm bài.</p>
              </div>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100 sticky top-0">
                <tr>
                  {["Học sinh", "Email", "Bắt đầu", "Nộp lúc", "Điểm", "Trạng thái", ""].map((h) => (
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
                {attempts.map((attempt) => {
                  const isSubmitted = attempt.submittedAt !== null;
                  const scorePct = attempt.score;
                  const scoreColor =
                    scorePct === null
                      ? "text-gray-400"
                      : scorePct >= 80
                        ? "text-green-600"
                        : scorePct >= 50
                          ? "text-yellow-600"
                          : "text-red-600";

                  return (
                    <tr key={attempt.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {attempt.student.name}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{attempt.student.email}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                        {new Date(attempt.startedAt).toLocaleString("vi-VN", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                        {attempt.submittedAt
                          ? new Date(attempt.submittedAt).toLocaleString("vi-VN", {
                              day: "2-digit",
                              month: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}
                      </td>
                      <td className={`px-4 py-3 font-semibold ${scoreColor}`}>
                        {scorePct !== null ? `${scorePct.toFixed(1)}%` : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {isSubmitted ? (
                          <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">
                            Đã nộp
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full font-medium">
                            Đang làm
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isSubmitted && (
                          <Link
                            href={`/teacher/exams/${id}/results/${attempt.id}`}
                            className="text-xs text-blue-600 hover:underline whitespace-nowrap"
                          >
                            Chi tiết →
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
