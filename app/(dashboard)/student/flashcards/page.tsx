import Link from "next/link";
import { getStudentFlashcardFilters, getStudentFlashcardSets } from "@/lib/student/queries";
import { FlashcardSetCard } from "@/components/flashcards/FlashcardSetCard";
import { FaIcon } from "@/components/ui/FaIcon";
import { faShuffle, faLayerGroup } from "@fortawesome/free-solid-svg-icons";
import { DIFFICULTY_LABEL, LEVEL_LABEL } from "@/lib/constants/labels";

function buildQueryString(params: Record<string, string | undefined>) {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }

  const query = search.toString();
  return query ? `?${query}` : "";
}

export default async function StudentFlashcardsPage({
  searchParams,
}: {
  searchParams: Promise<{
    subjectId?: string;
    gradeId?: string;
    topicName?: string;
    difficulty?: "EASY" | "MEDIUM" | "HARD";
    search?: string;
  }>;
}) {
  const filters = await searchParams;
  const [filterOptions, sets] = await Promise.all([
    getStudentFlashcardFilters(),
    getStudentFlashcardSets(filters),
  ]);

  const randomHref = `/student/flashcards/random${buildQueryString({
    subjectId: filters.subjectId,
    gradeId: filters.gradeId,
    topicName: filters.topicName,
    difficulty: filters.difficulty,
  })}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-blue-100 bg-linear-to-br from-blue-50 via-white to-cyan-50 p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Ôn tập Flashcard</h1>
            <p className="mt-1 text-sm text-gray-500">
              Tất cả học sinh đều có thể ôn tập theo cấp, khối, chủ đề và độ khó.
            </p>
          </div>
          <Link
            href={randomHref}
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            <FaIcon icon={faShuffle} className="mr-1.5" /> Học ngẫu nhiên
          </Link>
        </div>

        <form className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          <select
            name="subjectId"
            defaultValue={filters.subjectId ?? ""}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tất cả môn học</option>
            {filterOptions.subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>

          <select
            name="gradeId"
            defaultValue={filters.gradeId ?? ""}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tất cả khối</option>
            {filterOptions.grades.map((grade) => (
              <option key={grade.id} value={grade.id}>
                {LEVEL_LABEL[grade.level]} · Lớp {grade.gradeNumber}
              </option>
            ))}
          </select>

          <select
            name="topicName"
            defaultValue={filters.topicName ?? ""}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tất cả chủ đề</option>
            {filterOptions.topics.map((topic) => (
              <option key={topic} value={topic}>
                {topic}
              </option>
            ))}
          </select>

          <select
            name="difficulty"
            defaultValue={filters.difficulty ?? ""}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Mọi độ khó</option>
            {Object.entries(DIFFICULTY_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          <div className="flex gap-3">
            <input
              name="search"
              defaultValue={filters.search ?? ""}
              placeholder="Tìm theo tên bộ"
              className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800"
            >
              Lọc
            </button>
          </div>
        </form>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 items-stretch">
        {sets.length === 0 ? (
          <div className="col-span-full rounded-xl border border-gray-100 bg-white py-16 text-center text-gray-400 shadow-sm">
            <div className="mb-2 text-3xl"><FaIcon icon={faLayerGroup} /></div>
            <p>Không có bộ flashcard nào khớp với bộ lọc hiện tại.</p>
          </div>
        ) : (
          sets.map((set, index) => (
            <FlashcardSetCard
              key={set.id}
              priority={index === 0}
              title={set.title}
              previewImageUrl={set.cards[0]?.imageUrl}
              cardCount={set._count.cards}
              sessionCount={set._count.sessions}
              subject={set.subject.name}
              grade={set.grade}
              topicName={set.topicName}
              difficulty={set.difficulty}
              badge={
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 truncate max-w-36">
                  {set.createdBy.name}
                </span>
              }
              actions={
                <Link href={`/student/flashcards/${set.id}`} className="text-sm font-medium text-blue-600 hover:underline whitespace-nowrap">
                  Mở chế độ học →
                </Link>
              }
            />
          ))
        )}
      </div>
    </div>
  );
}
