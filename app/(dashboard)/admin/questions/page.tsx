import Link from "next/link";
import { getAdminQuestions, getAdminSubjects } from "@/lib/admin/queries";
import { AdminDeleteQuestionButton } from "./AdminDeleteQuestionButton";
import { AdminQuestionStatusButton } from "./AdminQuestionStatusButton";
import { FaIcon } from "@/components/ui/FaIcon";
import { faPlus, faGraduationCap, faPenToSquare } from "@fortawesome/free-solid-svg-icons";
import { QuestionTable } from "@/components/ui/QuestionTable";
import { QuestionFilters } from "@/components/questions/QuestionFilters";
import { DIFFICULTY_LABEL, DIFFICULTY_COLOR } from "@/lib/constants/labels";

const PAGE_SIZE = 50;

export default async function AdminQuestionsPage({
  searchParams,
}: {
  searchParams: Promise<{
    subjectId?: string;
    difficulty?: string;
    status?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;
  const currentPage = Math.max(1, parseInt(params.page ?? "1", 10));

  const [{ questions, total }, subjects] = await Promise.all([
    getAdminQuestions({
      subjectId: params.subjectId,
      difficulty: params.difficulty,
      status: params.status,
      page: currentPage,
      pageSize: PAGE_SIZE,
    }),
    getAdminSubjects(),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const buildUrl = (page: number) => {
    const q = new URLSearchParams();
    if (params.subjectId) q.set("subjectId", params.subjectId);
    if (params.difficulty) q.set("difficulty", params.difficulty);
    if (params.status) q.set("status", params.status);
    if (page > 1) q.set("page", String(page));
    const qs = q.toString();
    return qs ? `/admin/questions?${qs}` : "/admin/questions";
  };

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ngân hàng câu hỏi</h1>
          <p className="text-gray-500 text-sm mt-1">{total} câu hỏi</p>
        </div>
        <Link
          href="/admin/questions/create"
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <FaIcon icon={faPlus} className="mr-1.5" /> Thêm câu hỏi
        </Link>
      </div>

      {/* Filters */}
      <QuestionFilters
        baseUrl="/admin/questions"
        subjects={subjects}
        defaults={{
          subjectId: params.subjectId,
          difficulty: params.difficulty,
          status: params.status,
        }}
      />

      {/* Table */}
      <QuestionTable
        headers={["Nội dung", "Môn", "Chủ đề", "Người tạo", "Độ khó", "Trạng thái", ""]}
        isEmpty={questions.length === 0}
        footer={
          <>
            <span className="text-xs text-gray-500">
              Trang {currentPage}/{totalPages} · {total} câu hỏi
            </span>
            <div className="flex gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => Math.abs(p - currentPage) <= 2 || p === 1 || p === totalPages)
                .map((p, idx, arr) => (
                  <span key={p}>
                    {idx > 0 && arr[idx - 1] !== p - 1 && (
                      <span className="px-1 text-gray-400">…</span>
                    )}
                    <Link
                      href={buildUrl(p)}
                      className={`inline-flex items-center justify-center w-7 h-7 rounded text-xs font-medium transition-colors ${
                        p === currentPage
                          ? "bg-blue-600 text-white"
                          : "text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      {p}
                    </Link>
                  </span>
                ))}
            </div>
          </>
        }
      >
        {questions.map((q) => (
          <tr key={q.id}>
            <td className="px-4 py-3 max-w-xs">
              <p className="truncate text-gray-900" title={q.content}>{q.content}</p>
              {q.isUnivExam && (
                <span className="inline-block mt-1 text-xs px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 font-medium">
                  <FaIcon icon={faGraduationCap} className="mr-1" />Ôn thi ĐH
                </span>
              )}
            </td>
            <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{q.subject.name}</td>
            <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{q.topic.name}</td>
            <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">{q.createdBy.name}</td>
            <td className="px-4 py-3">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${DIFFICULTY_COLOR[q.difficulty]}`}>
                {DIFFICULTY_LABEL[q.difficulty]}
              </span>
            </td>
            <td className="px-4 py-3">
              <AdminQuestionStatusButton questionId={q.id} currentStatus={q.status} />
            </td>
            <td className="px-4 py-3">
              <div className="flex items-center gap-1.5">
                <Link
                  href={`/admin/questions/${q.id}/edit`}
                  className="inline-flex items-center justify-center w-7 h-7 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                  title="Chỉnh sửa"
                >
                  <FaIcon icon={faPenToSquare} />
                </Link>
                <AdminDeleteQuestionButton questionId={q.id} />
              </div>
            </td>
          </tr>
        ))}
      </QuestionTable>
    </div>
  );
}
