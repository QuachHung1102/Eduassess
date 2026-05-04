import Link from "next/link";
import { getTeacherQuestions, getSubjects } from "@/lib/teacher/queries";
import { DeleteQuestionButton } from "./DeleteQuestionButton";
import { FaIcon } from "@/components/ui/FaIcon";
import { faRobot, faPlus, faGraduationCap } from "@fortawesome/free-solid-svg-icons";
import { QuestionTable } from "@/components/ui/QuestionTable";
import { QuestionFilters } from "@/components/questions/QuestionFilters";

const PAGE_SIZE = 50;

import { DIFFICULTY_LABEL, DIFFICULTY_COLOR } from "@/lib/constants/labels";
const STATUS_LABEL: Record<string, string> = {
  PENDING: "Chờ duyệt",
  APPROVED: "Đã duyệt",
};
const STATUS_COLOR: Record<string, string> = {
  PENDING: "bg-orange-100 text-orange-700",
  APPROVED: "bg-blue-100 text-blue-700",
};

export default async function QuestionBankPage({
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
    getTeacherQuestions({
      subjectId: params.subjectId,
      difficulty: params.difficulty,
      status: params.status,
      page: currentPage,
      pageSize: PAGE_SIZE,
    }),
    getSubjects(),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const buildUrl = (page: number) => {
    const q = new URLSearchParams();
    if (params.subjectId) q.set("subjectId", params.subjectId);
    if (params.difficulty) q.set("difficulty", params.difficulty);
    if (params.status) q.set("status", params.status);
    if (page > 1) q.set("page", String(page));
    const qs = q.toString();
    return qs ? `/teacher/question-bank?${qs}` : "/teacher/question-bank";
  };

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ngân hàng câu hỏi</h1>
          <p className="text-gray-500 text-sm mt-1">{total} câu hỏi</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/teacher/question-bank/ai-suggest"
            className="flex items-center gap-2 border border-blue-600 text-blue-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-50 transition-colors"
          >
            <FaIcon icon={faRobot} className="mr-1.5" /> AI gợi ý
          </Link>
          <Link
            href="/teacher/question-bank/create"
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <FaIcon icon={faPlus} className="mr-1.5" /> Thêm câu hỏi
          </Link>
        </div>
      </div>

      {/* Filters */}
      <QuestionFilters
        baseUrl="/teacher/question-bank"
        subjects={subjects}
        defaults={{
          subjectId: params.subjectId,
          difficulty: params.difficulty,
          status: params.status,
        }}
      />

      {/* Table */}
      <QuestionTable
        headers={["Câu hỏi", "Môn", "Chủ đề / Khối", "Độ khó", "Trạng thái", ""]}
        isEmpty={questions.length === 0}
        emptyText="Chưa có câu hỏi nào. Hãy thêm câu hỏi đầu tiên!"
        footer={
          <>
            <p className="text-xs text-gray-500">
              Trang {currentPage}/{totalPages} &mdash; {total} câu hỏi
            </p>
            <div className="flex items-center gap-1">
              {currentPage > 1 ? (
                <Link
                  href={buildUrl(currentPage - 1)}
                  className="px-3 py-1.5 rounded-lg text-sm border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  ‹
                </Link>
              ) : (
                <span className="px-3 py-1.5 rounded-lg text-sm border border-gray-100 text-gray-300 cursor-not-allowed">
                  ‹
                </span>
              )}

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                .reduce<(number | "...")[]>((acc, p, idx, arr) => {
                  if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("...");
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) =>
                  p === "..." ? (
                    <span key={`ellipsis-${i}`} className="px-2 py-1.5 text-sm text-gray-400">
                      …
                    </span>
                  ) : (
                    <Link
                      key={p}
                      href={buildUrl(p as number)}
                      className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                        p === currentPage
                          ? "bg-blue-600 text-white border-blue-600"
                          : "border-gray-200 text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      {p}
                    </Link>
                  ),
                )}

              {currentPage < totalPages ? (
                <Link
                  href={buildUrl(currentPage + 1)}
                  className="px-3 py-1.5 rounded-lg text-sm border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  ›
                </Link>
              ) : (
                <span className="px-3 py-1.5 rounded-lg text-sm border border-gray-100 text-gray-300 cursor-not-allowed">
                  ›
                </span>
              )}
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
            <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
              <span>{q.topic.name}</span>
              <span className="text-gray-400"> · Lớp {q.topic.grade.gradeNumber}</span>
            </td>
            <td className="px-4 py-3">
              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${DIFFICULTY_COLOR[q.difficulty]}`}>
                {DIFFICULTY_LABEL[q.difficulty]}
              </span>
            </td>
            <td className="px-4 py-3">
              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[q.status]}`}>
                {STATUS_LABEL[q.status]}
              </span>
            </td>
            <td className="px-4 py-3">
              <div className="flex items-center gap-2">
                <Link
                  href={`/teacher/question-bank/${q.id}/edit`}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Sửa
                </Link>
                <DeleteQuestionButton questionId={q.id} />
              </div>
            </td>
          </tr>
        ))}
      </QuestionTable>
    </div>
  );
}
