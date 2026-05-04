import Link from "next/link";
import { getAdminExams, getAdminSubjects } from "@/lib/admin/queries";
import { AdminDeleteExamButton } from "./AdminDeleteExamButton";
import { FaIcon } from "@/components/ui/FaIcon";
import { faFilePen } from "@fortawesome/free-solid-svg-icons";

const PAGE_SIZE = 20;

export default async function AdminExamsPage({
  searchParams,
}: {
  searchParams: Promise<{ subjectId?: string; search?: string; page?: string }>;
}) {
  const params = await searchParams;
  const currentPage = Math.max(1, parseInt(params.page ?? "1", 10));

  const [{ exams, total }, subjects] = await Promise.all([
    getAdminExams({
      subjectId: params.subjectId,
      search: params.search,
      page: currentPage,
      pageSize: PAGE_SIZE,
    }),
    getAdminSubjects(),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const buildUrl = (page: number) => {
    const q = new URLSearchParams();
    if (params.subjectId) q.set("subjectId", params.subjectId);
    if (params.search) q.set("search", params.search);
    if (page > 1) q.set("page", String(page));
    const qs = q.toString();
    return qs ? `/admin/exams?${qs}` : "/admin/exams";
  };

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Đề kiểm tra</h1>
          <p className="text-gray-500 text-sm mt-1">{total} đề kiểm tra trong hệ thống</p>
        </div>
      </div>

      {/* Filters */}
      <form className="shrink-0 bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Tìm kiếm</label>
            <input
              name="search"
              defaultValue={params.search ?? ""}
              placeholder="Tên đề, tên giáo viên..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Môn học</label>
            <select
              name="subjectId"
              defaultValue={params.subjectId ?? ""}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Tất cả môn</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
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
            href="/admin/exams"
            className="border border-gray-300 text-gray-600 px-4 py-1.5 rounded-lg text-sm hover:bg-gray-50 transition-colors"
          >
            Xóa bộ lọc
          </Link>
        </div>
      </form>

      {/* Table */}
      <div className="flex-1 flex flex-col min-h-0 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100 sticky top-0">
              <tr>
                {["Tên đề", "Môn / Lớp", "Giáo viên", "Câu hỏi", "Lượt làm", "Thời gian", ""].map(
                  (h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide"
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {exams.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-gray-400">
                    <div className="text-3xl mb-2"><FaIcon icon={faFilePen} /></div>
                    <p>Chưa có đề kiểm tra nào.</p>
                  </td>
                </tr>
              ) : (
                exams.map((exam) => (
                  <tr key={exam.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 truncate max-w-xs" title={exam.title}>
                        {exam.title}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-xs">
                      <span>{exam.subject.name}</span>
                      <span className="text-gray-400"> · Lớp {exam.class.grade.gradeNumber} – {exam.class.name}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-xs">
                      {exam.createdBy.name}
                    </td>
                    <td className="px-4 py-3 text-gray-700 text-center">
                      {exam._count.examQuestions}
                    </td>
                    <td className="px-4 py-3 text-gray-700 text-center">
                      {exam._count.examAttempts}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {exam.duration} phút
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Link
                          href={`/admin/exams/${exam.id}`}
                          className="text-xs text-blue-600 hover:underline whitespace-nowrap"
                        >
                          Xem chi tiết
                        </Link>
                        <AdminDeleteExamButton examId={exam.id} />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="shrink-0 flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-white">
            <span className="text-xs text-gray-500">
              Trang {currentPage}/{totalPages} · {total} đề
            </span>
            <div className="flex gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => Math.abs(p - currentPage) <= 2 || p === 1 || p === totalPages)
                .map((p, idx, arr) => (
                  <span key={p} className="flex items-center">
                    {idx > 0 && arr[idx - 1] !== p - 1 && (
                      <span className="px-1 text-gray-400 text-xs">…</span>
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
          </div>
        )}
      </div>
    </div>
  );
}
