import Link from "next/link";
import { redirect } from "next/navigation";
import { getRandomStudentFlashcardSet, getStudentFlashcardFilters } from "@/lib/student/queries";
import { DIFFICULTY_LABEL, LEVEL_LABEL } from "@/lib/constants/labels";

export default async function StudentRandomFlashcardsPage({
  searchParams,
}: {
  searchParams: Promise<{
    subjectId?: string;
    gradeId?: string;
    topicName?: string;
    difficulty?: "EASY" | "MEDIUM" | "HARD";
  }>;
}) {
  const filters = await searchParams;
  const hasFilters = Boolean(filters.subjectId || filters.gradeId || filters.topicName || filters.difficulty);

  if (hasFilters) {
    const set = await getRandomStudentFlashcardSet(filters);
    if (set) {
      redirect(`/student/flashcards/${set.id}`);
    }
  }

  const filterOptions = await getStudentFlashcardFilters();

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <Link href="/student/flashcards" className="text-sm text-blue-600 hover:underline">
          ← Quay lại danh sách flashcard
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">Học ngẫu nhiên</h1>
        <p className="mt-1 text-sm text-gray-500">
          Chọn chủ đề và độ khó, hệ thống sẽ mở ngẫu nhiên một bộ flashcard phù hợp.
        </p>
      </div>

      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        {hasFilters ? (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            Không tìm thấy bộ flashcard phù hợp với bộ lọc hiện tại.
          </div>
        ) : null}

        <form className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Môn học</label>
              <select
                name="subjectId"
                defaultValue={filters.subjectId ?? ""}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Tất cả môn học</option>
                {filterOptions.subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Khối lớp</label>
              <select
                name="gradeId"
                defaultValue={filters.gradeId ?? ""}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Tất cả khối</option>
                {filterOptions.grades.map((grade) => (
                  <option key={grade.id} value={grade.id}>
                    {LEVEL_LABEL[grade.level]} · Lớp {grade.gradeNumber}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Chủ đề</label>
              <select
                name="topicName"
                defaultValue={filters.topicName ?? ""}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Tất cả chủ đề</option>
                {filterOptions.topics.map((topic) => (
                  <option key={topic} value={topic}>
                    {topic}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Độ khó</label>
              <select
                name="difficulty"
                defaultValue={filters.difficulty ?? ""}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Mọi độ khó</option>
                {Object.entries(DIFFICULTY_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            Mở một bộ ngẫu nhiên
          </button>
        </form>
      </div>
    </div>
  );
}
