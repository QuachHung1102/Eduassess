import Link from "next/link";

type Props = {
  baseUrl: string;
  subjects: { id: string; name: string }[];
  defaults?: {
    subjectId?: string;
    difficulty?: string;
    status?: string;
  };
};

export function QuestionFilters({ baseUrl, subjects, defaults = {} }: Props) {
  return (
    <form className="shrink-0 bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Môn học</label>
          <select
            name="subjectId"
            defaultValue={defaults.subjectId ?? ""}
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
            defaultValue={defaults.difficulty ?? ""}
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
            defaultValue={defaults.status ?? ""}
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
          href={baseUrl}
          className="border border-gray-300 text-gray-600 px-4 py-1.5 rounded-lg text-sm hover:bg-gray-50 transition-colors"
        >
          Xoá bộ lọc
        </Link>
      </div>
    </form>
  );
}
