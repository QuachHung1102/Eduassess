import Link from "next/link";
import { getTeacherQuestions, getSubjects } from "@/lib/teacher/queries";
import { DeleteQuestionButton } from "./DeleteQuestionButton";

const PAGE_SIZE = 10;

const DIFFICULTY_LABEL: Record<string, string> = {
  EASY: "Dễ",
  MEDIUM: "Trung bình",
  HARD: "Khó",
};
const DIFFICULTY_COLOR: Record<string, string> = {
  EASY: "bg-green-100 text-green-700",
  MEDIUM: "bg-yellow-100 text-yellow-700",
  HARD: "bg-red-100 text-red-700",
};
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
            🤖 AI gợi ý
          </Link>
          <Link
            href="/teacher/question-bank/create"
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            ➕ Thêm câu hỏi
          </Link>
        </div>
      </div>

      {/* Filters */}
      <form className="shrink-0 bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Môn học</label>
            <select
              name="subjectId"
              defaultValue={params.subjectId ?? ""}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
            >
              <option value="">Tất cả môn</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Độ khó</label>
            <select
              name="difficulty"
              defaultValue={params.difficulty ?? ""}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
            >
              <option value="">Tất cả</option>
              <option value="EASY">Dễ</option>
              <option value="MEDIUM">Trung bình</option>
              <option value="HARD">Khó</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Trạng thái</label>
            <select
              name="status"
              defaultValue={params.status ?? ""}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
            >
              <option value="">Tất cả</option>
              <option value="PENDING">Chờ duyệt</option>
              <option value="APPROVED">Đã duyệt</option>
            </select>
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Lọc
          </button>
          <Link
            href="/teacher/question-bank"
            className="border border-gray-300 text-gray-600 px-4 py-1.5 rounded-lg text-sm hover:bg-gray-50 transition-colors"
          >
            Xoá bộ lọc
          </Link>
        </div>
      </form>

      {/* Table card — flex-1 fills remaining height */}
      <div className="flex-1 flex flex-col min-h-0 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Scrollable table area */}
        <div className="flex-1 overflow-auto min-h-0">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100 sticky top-0">
              <tr>
                {["Câu hỏi", "Môn", "Chủ đề / Khối", "Độ khó", "Trạng thái", ""].map((h) => (
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
              {questions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-gray-400">
                    <div className="text-3xl mb-2">🏦</div>
                    <p>Chưa có câu hỏi nào. Hãy thêm câu hỏi đầu tiên!</p>
                  </td>
                </tr>
              ) : (
                questions.map((q) => (
                  <tr key={q.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 max-w-xs">
                      <p className="truncate text-gray-900" title={q.content}>{q.content}</p>
                      {q.isUnivExam && (
                        <span className="inline-block mt-1 text-xs px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 font-medium">🎓 Ôn thi ĐH</span>
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
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination — always at bottom of card */}
        <div className="shrink-0 flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
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
        </div>
      </div>
    </div>
  );
}
