import Link from "next/link";
import { getStudentProgress } from "@/lib/student/queries";
import { FaIcon } from "@/components/ui/FaIcon";
import { faChartBar } from "@fortawesome/free-solid-svg-icons";

export default async function StudentProgressPage() {
  const attempts = await getStudentProgress();

  const avgScore =
    attempts.length > 0
      ? attempts.reduce((sum, a) => sum + (a.score ?? 0), 0) / attempts.length
      : null;

  return (
    <div className="flex flex-col h-full gap-6">
      <div className="shrink-0">
        <h1 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>Tiến trình học tập</h1>
        <p className="text-sm mt-1" style={{ color: "color-mix(in srgb, var(--foreground) 60%, transparent)" }}>Lịch sử làm bài và phân tích năng lực của bạn</p>
      </div>

      {/* Summary cards */}
      <div className="shrink-0 grid grid-cols-3 gap-3 md:gap-4">
        <div className="primary-panel p-4 md:p-5 text-center">
          <div className="text-2xl md:text-3xl font-bold" style={{ color: "var(--foreground)" }}>{attempts.length}</div>
          <div className="text-xs mt-1" style={{ color: "color-mix(in srgb, var(--foreground) 60%, transparent)" }}>Bài đã làm</div>
        </div>
        <div className="primary-panel p-4 md:p-5 text-center">
          <div className={`text-2xl md:text-3xl font-bold ${avgScore === null ? "text-gray-400" : avgScore >= 80 ? "text-green-600" : avgScore >= 50 ? "text-yellow-600" : "text-red-600"}`}>
            {avgScore !== null ? `${avgScore.toFixed(1)}%` : "—"}
          </div>
          <div className="text-xs mt-1" style={{ color: "color-mix(in srgb, var(--foreground) 60%, transparent)" }}>Điểm TB</div>
        </div>
        <div className="primary-panel p-4 md:p-5 text-center">
          <div className="text-2xl md:text-3xl font-bold" style={{ color: "var(--primary)" }}>
            {attempts.filter((a) => (a.score ?? 0) >= 80).length}
          </div>
          <div className="text-xs mt-1" style={{ color: "color-mix(in srgb, var(--foreground) 60%, transparent)" }}>Trên 80%</div>
        </div>
      </div>

      {/* History */}
      <div className="primary-panel flex-1 overflow-hidden flex flex-col">
        <div className="px-4 md:px-6 py-4 shrink-0" style={{ borderBottom: "1px solid var(--border-soft)" }}>
          <h2 className="font-semibold" style={{ color: "var(--foreground)" }}>Lịch sử làm bài</h2>
        </div>

        {attempts.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-16" style={{ color: "color-mix(in srgb, var(--foreground) 45%, transparent)" }}>
            <div className="text-3xl mb-2"><FaIcon icon={faChartBar} /></div>
            <p>Chưa có lịch sử làm bài</p>
          </div>
        ) : (
          <>
            {/* Mobile: card list */}
            <div className="md:hidden flex-1 overflow-y-auto" style={{ borderTop: "1px solid var(--border-soft)" }}>
              {attempts.map((attempt) => {
                const score = attempt.score;
                const scoreColor =
                  score === null ? "text-gray-400" : score >= 80 ? "text-green-600" : score >= 50 ? "text-yellow-600" : "text-red-600";
                return (
                  <div key={attempt.id} className="px-4 py-3 flex items-center justify-between gap-3" style={{ borderBottom: "1px solid var(--border-soft)" }}>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate" style={{ color: "var(--foreground)" }}>{attempt.exam.title}</p>
                      <p className="text-xs mt-0.5 truncate" style={{ color: "color-mix(in srgb, var(--foreground) 60%, transparent)" }}>
                        {attempt.exam.subject.name} · Lớp {attempt.exam.class.name}
                      </p>
                      <p className="text-xs" style={{ color: "color-mix(in srgb, var(--foreground) 45%, transparent)" }}>
                        {attempt.submittedAt
                          ? new Date(attempt.submittedAt).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })
                          : "—"}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`text-base font-bold tabular-nums ${scoreColor}`}>
                        {score !== null ? `${score.toFixed(0)}%` : "—"}
                      </span>
                      <Link
                        href={`/student/exams/${attempt.examId}/results/${attempt.id}`}
                        className="text-xs font-medium hover:underline"
                        style={{ color: "var(--primary)" }}
                      >
                        Xem
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop: table */}
            <div className="hidden md:block overflow-auto flex-1">
              <table className="w-full text-sm themed-table">
                <thead>
                  <tr>
                    {["Tên bài", "Môn học", "Lớp", "Ngày nộp", "Điểm", ""].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {attempts.map((attempt) => {
                    const score = attempt.score;
                    const scoreColor =
                      score === null ? "text-gray-400" : score >= 80 ? "text-green-600 font-semibold" : score >= 50 ? "text-yellow-600 font-semibold" : "text-red-600 font-semibold";
                    return (
                      <tr key={attempt.id}>
                        <td className="px-4 py-3 font-medium" style={{ color: "var(--foreground)" }}>{attempt.exam.title}</td>
                        <td className="px-4 py-3" style={{ color: "color-mix(in srgb, var(--foreground) 70%, transparent)" }}>{attempt.exam.subject.name}</td>
                        <td className="px-4 py-3" style={{ color: "color-mix(in srgb, var(--foreground) 70%, transparent)" }}>Lớp {attempt.exam.class.name}</td>
                        <td className="px-4 py-3 text-xs" style={{ color: "color-mix(in srgb, var(--foreground) 60%, transparent)" }}>
                          {attempt.submittedAt
                            ? new Date(attempt.submittedAt).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
                            : "—"}
                        </td>
                        <td className={`px-4 py-3 ${scoreColor}`}>
                          {score !== null ? `${score.toFixed(0)}%` : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <Link href={`/student/exams/${attempt.examId}/results/${attempt.id}`} className="text-xs hover:underline" style={{ color: "var(--primary)" }}>
                            Xem kết quả
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

