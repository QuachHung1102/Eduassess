import Link from "next/link";
import { getStudentExams } from "@/lib/student/queries";
import { startExamAction } from "@/lib/student/actions";
import { FaIcon } from "@/components/ui/FaIcon";
import { faTrophy, faBookOpen, faSchool, faFilePen, faClock, faCalendar, faHourglassHalf } from "@fortawesome/free-solid-svg-icons";

export default async function StudentExamsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const [{ pending, completed }, sp] = await Promise.all([getStudentExams(), searchParams]);
  const tab = sp.tab === "completed" ? "completed" : "pending";

  return (
    <div className="flex flex-col gap-4">
      <div className="shrink-0">
        <h1 className="text-2xl font-bold text-gray-900">Bài kiểm tra</h1>
        <p className="text-gray-500 text-sm mt-1">Các bài kiểm tra được giáo viên giao</p>
      </div>

      {/* Tabs */}
      <div className="shrink-0 flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        <Link
          href="/student/exams?tab=pending"
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            tab === "pending" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Chờ làm ({pending.length})
        </Link>
        <Link
          href="/student/exams?tab=completed"
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            tab === "completed" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Đã hoàn thành ({completed.length})
        </Link>
      </div>

      {/* Pending exams */}
      {tab === "pending" && (
        <div className="space-y-3">
          {pending.length === 0 ? (
            <div className="text-center py-16 text-gray-400 bg-white rounded-xl border border-gray-100 shadow-sm">
              <div className="text-3xl mb-2"><FaIcon icon={faTrophy} /></div>
              <p>Không có bài nào đang chờ làm</p>
            </div>
          ) : (
            pending.map((exam) => (
              <div key={exam.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 md:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <Link href={`/student/exams/${exam.id}`} className="font-semibold text-gray-900 hover:text-blue-600 transition-colors">
                    {exam.title}
                  </Link>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><FaIcon icon={faBookOpen} />{exam.subject.name}</span>
                    <span className="flex items-center gap-1"><FaIcon icon={faSchool} />Lớp {exam.class.name}</span>
                    <span className="flex items-center gap-1"><FaIcon icon={faFilePen} />{exam._count.examQuestions} câu</span>
                    <span className="flex items-center gap-1"><FaIcon icon={faClock} />{exam.duration} phút</span>
                    {exam.dueAt && (() => {
                      const due = new Date(exam.dueAt);
                      const now = new Date();
                      const hoursLeft = (due.getTime() - now.getTime()) / 3600000;
                      const isUrgent = hoursLeft < 24;
                      return (
                        <span className={`flex items-center gap-1 ${isUrgent ? "text-red-600 font-medium" : "text-gray-500"}`}>
                          <FaIcon icon={faHourglassHalf} />
                          Hạn: {due.toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      );
                    })()}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {exam.attempt && exam.attempt.submittedAt === null && (
                    <span className="text-xs text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-full whitespace-nowrap">Đang làm dở</span>
                  )}
                  <form action={startExamAction.bind(null, exam.id)}>
                    <button
                      type="submit"
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors whitespace-nowrap"
                    >
                      {exam.attempt && exam.attempt.submittedAt === null ? "Tiếp tục" : "Bắt đầu"}
                    </button>
                  </form>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Completed exams */}
      {tab === "completed" && (
        <div className="space-y-3">
          {completed.length === 0 ? (
            <div className="text-center py-16 text-gray-400 bg-white rounded-xl border border-gray-100 shadow-sm">
              <div className="text-3xl mb-2"><FaIcon icon={faFilePen} /></div>
              <p>Chưa hoàn thành bài nào</p>
            </div>
          ) : (
            completed.map((exam) => {
              const score = exam.attempt.score;
              const scoreColor =
                score === null ? "text-gray-500" : score >= 80 ? "text-green-600" : score >= 50 ? "text-yellow-600" : "text-red-600";
              return (
                <div key={exam.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 md:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900">{exam.title}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><FaIcon icon={faBookOpen} />{exam.subject.name}</span>
                      <span className="flex items-center gap-1"><FaIcon icon={faSchool} />Lớp {exam.class.name}</span>
                      <span className="flex items-center gap-1"><FaIcon icon={faCalendar} />{exam.attempt.submittedAt ? new Date(exam.attempt.submittedAt).toLocaleDateString("vi-VN") : ""}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <span className={`text-xl font-bold tabular-nums ${scoreColor}`}>
                      {score !== null ? `${score.toFixed(0)}%` : "—"}
                    </span>
                    <Link
                      href={`/student/exams/${exam.id}/results/${exam.attempt.id}`}
                      className="text-sm font-medium text-blue-600 hover:underline whitespace-nowrap"
                    >
                      Xem kết quả →
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
