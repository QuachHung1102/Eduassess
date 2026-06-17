import Link from "next/link";
import { redirect } from "next/navigation";
import { FaIcon } from "@/components/ui/FaIcon";
import { faArrowLeft, faShuffle } from "@fortawesome/free-solid-svg-icons";
import { getRandomStudentFlashcardSet, getStudentFlashcardFilters } from "@/lib/student/queries";
import { DIFFICULTY_LABEL, LEVEL_LABEL } from "@/lib/constants/labels";

const FIELD_STYLE = {
  border: "1.5px solid var(--border-soft)",
  backgroundColor: "var(--surface-strong)",
  color: "var(--foreground)",
  borderRadius: "0.625rem",
  padding: "0.55rem 0.75rem",
  fontSize: "0.875rem",
  outline: "none",
  width: "100%",
  appearance: "auto" as const,
};

const LABEL_STYLE = { color: "color-mix(in srgb, var(--foreground) 70%, transparent)" };

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
        <Link
          href="/student/flashcards"
          className="inline-flex items-center gap-1.5 text-sm font-medium transition-opacity hover:opacity-75"
          style={{ color: "var(--primary)" }}
        >
          <FaIcon icon={faArrowLeft} className="text-xs" />
          Quay lại danh sách flashcard
        </Link>
        <h1 className="mt-2 text-2xl font-bold" style={{ color: "var(--foreground)" }}>
          Học ngẫu nhiên
        </h1>
        <p className="mt-1 text-sm" style={{ color: "color-mix(in srgb, var(--foreground) 55%, transparent)" }}>
          Chọn chủ đề và độ khó, hệ thống sẽ mở ngẫu nhiên một bộ flashcard phù hợp.
        </p>
      </div>

      <div
        className="rounded-2xl p-6"
        style={{ backgroundColor: "var(--surface-strong)", border: "1.5px solid var(--border-soft)" }}
      >
        {hasFilters ? (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            Không tìm thấy bộ flashcard phù hợp với bộ lọc hiện tại.
          </div>
        ) : null}

        <form className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium" style={LABEL_STYLE}>
                Môn học
              </label>
              <select name="subjectId" defaultValue={filters.subjectId ?? ""} style={FIELD_STYLE}>
                <option value="">Tất cả môn học</option>
                {filterOptions.subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium" style={LABEL_STYLE}>
                Khối lớp
              </label>
              <select name="gradeId" defaultValue={filters.gradeId ?? ""} style={FIELD_STYLE}>
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
              <label className="mb-1.5 block text-sm font-medium" style={LABEL_STYLE}>
                Chủ đề
              </label>
              <select name="topicName" defaultValue={filters.topicName ?? ""} style={FIELD_STYLE}>
                <option value="">Tất cả chủ đề</option>
                {filterOptions.topics.map((topic) => (
                  <option key={topic} value={topic}>
                    {topic}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium" style={LABEL_STYLE}>
                Độ khó
              </label>
              <select name="difficulty" defaultValue={filters.difficulty ?? ""} style={FIELD_STYLE}>
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
            className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: "var(--primary)" }}
          >
            <FaIcon icon={faShuffle} className="text-xs" />
            Mở một bộ ngẫu nhiên
          </button>
        </form>
      </div>
    </div>
  );
}
