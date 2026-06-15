import Link from "next/link";
import { notFound } from "next/navigation";
import { getStudentExamDetail } from "@/lib/student/queries";
import { startExamAction } from "@/lib/student/actions";
import { FaIcon } from "@/components/ui/FaIcon";
import { faBookOpen, faSchool, faFilePen, faClock, faCircleCheck, faTriangleExclamation, faClipboardList } from "@fortawesome/free-solid-svg-icons";

export default async function StudentExamDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const exam = await getStudentExamDetail(id);

  if (!exam) notFound();

  const attempt = exam.attempt;
  const isSubmitted = attempt !== null && attempt.submittedAt !== null;
  const isInProgress = attempt !== null && attempt.submittedAt === null;
  const isPastDue = exam.dueAt !== null && new Date() > new Date(exam.dueAt);

  return (
    <div className="flex flex-col gap-6 w-full max-w-2xl">
      <div className="shrink-0">
        <Link href="/student/exams" className="text-sm text-blue-600 hover:underline">
          ← Quay lại danh sách
        </Link>
        <h1 className="text-xl md:text-2xl font-bold text-gray-900 mt-3">{exam.title}</h1>
      </div>

      {/* Exam info card */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 md:p-6 shrink-0">
        <h2 className="font-semibold text-gray-900 mb-4">Thông tin đề thi</h2>
        <div className="grid grid-cols-2 gap-3 md:gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xl text-gray-400 shrink-0"><FaIcon icon={faBookOpen} /></span>
            <div className="min-w-0">
              <div className="text-xs text-gray-500">Môn học</div>
              <div className="font-medium text-gray-900 text-sm truncate">{exam.subject.name}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xl text-gray-400 shrink-0"><FaIcon icon={faSchool} /></span>
            <div className="min-w-0">
              <div className="text-xs text-gray-500">Lớp</div>
              <div className="font-medium text-gray-900 text-sm">{exam.class.name}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xl text-gray-400 shrink-0"><FaIcon icon={faFilePen} /></span>
            <div className="min-w-0">
              <div className="text-xs text-gray-500">Số câu hỏi</div>
              <div className="font-medium text-gray-900 text-sm">{exam._count.examQuestions} câu</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xl text-gray-400 shrink-0"><FaIcon icon={faClock} /></span>
            <div className="min-w-0">
              <div className="text-xs text-gray-500">Thời gian</div>
              <div className="font-medium text-gray-900 text-sm">{exam.duration} phút</div>
            </div>
          </div>
        </div>
      </div>

      {/* Status + action */}
      {isSubmitted ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 md:p-6 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="font-semibold text-green-900"><FaIcon icon={faCircleCheck} className="mr-1.5" /> Bạn đã hoàn thành bài này</p>
              <p className="text-sm text-green-700 mt-1">
                Điểm: <span className="font-bold">{attempt.score !== null ? `${attempt.score.toFixed(0)}%` : "—"}</span>
                {" · "}
                Nộp lúc: {attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleString("vi-VN") : "—"}
              </p>
            </div>
            <Link
              href={`/student/exams/${id}/results/${attempt.id}`}
              className="self-start sm:self-auto bg-green-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors whitespace-nowrap"
            >
              Xem kết quả
            </Link>
          </div>
        </div>
      ) : isInProgress ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5 md:p-6 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="font-semibold text-yellow-900"><FaIcon icon={faTriangleExclamation} className="mr-1.5" /> Bạn đang làm bài này dở</p>
              <p className="text-sm text-yellow-700 mt-1">
                Bắt đầu lúc: {new Date(attempt.startedAt).toLocaleString("vi-VN")}
              </p>
            </div>
            <Link
              href={`/student/exams/${id}/take?attemptId=${attempt.id}`}
              className="self-start sm:self-auto bg-yellow-500 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-yellow-600 transition-colors whitespace-nowrap"
            >
              Tiếp tục làm bài
            </Link>
          </div>
        </div>
      ) : isPastDue ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 md:p-6 shrink-0">
          <p className="font-semibold text-red-900">
            <FaIcon icon={faTriangleExclamation} className="mr-1.5" /> Đã quá hạn nộp bài
          </p>
          <p className="text-sm text-red-700 mt-1">
            Hạn nộp: {exam.dueAt ? new Date(exam.dueAt).toLocaleString("vi-VN") : "—"}. Bạn không thể bắt đầu bài này nữa.
          </p>
        </div>
      ) : (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 md:p-6 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="font-semibold text-blue-900"><FaIcon icon={faClipboardList} className="mr-1.5" /> Sẵn sàng bắt đầu?</p>
              <p className="text-sm text-blue-700 mt-1">
                Bạn có {exam.duration} phút để hoàn thành {exam._count.examQuestions} câu hỏi.
                Chú ý: không được làm lại sau khi nộp.
                {exam.dueAt && ` Hạn nộp: ${new Date(exam.dueAt).toLocaleString("vi-VN")}.`}
              </p>
            </div>
            <form action={startExamAction.bind(null, id)} className="self-start sm:self-auto">
              <button
                type="submit"
                className="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors whitespace-nowrap"
              >
                Bắt đầu làm bài
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
