import Link from "next/link";
import { CldImage } from "@/components/ui/CloudinaryImage";
import { getStudentFlashcardFilters, getStudentFlashcardSets } from "@/lib/student/queries";

const DIFFICULTY_LABEL: Record<string, string> = {
  EASY: "Dễ",
  MEDIUM: "Trung bình",
  HARD: "Khó",
};

const DIFFICULTY_TILE_THEME: Record<string, string> = {
  EASY: "flashcard-set-tile flashcard-set-tile-easy",
  MEDIUM: "flashcard-set-tile flashcard-set-tile-medium",
  HARD: "flashcard-set-tile flashcard-set-tile-hard",
};

const DIFFICULTY_BADGE_THEME: Record<string, string> = {
  EASY: "bg-emerald-100 text-emerald-700",
  MEDIUM: "bg-amber-100 text-amber-700",
  HARD: "bg-fuchsia-100 text-fuchsia-700",
};

const LEVEL_LABEL: Record<string, string> = {
  PRIMARY: "Tiểu học",
  MIDDLE: "THCS",
  HIGH: "THPT",
};

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
            🎲 Học ngẫu nhiên
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 items-stretch">
        {sets.length === 0 ? (
          <div className="col-span-full rounded-xl border border-gray-100 bg-white py-16 text-center text-gray-400 shadow-sm">
            <div className="mb-2 text-3xl">🃏</div>
            <p>Không có bộ flashcard nào khớp với bộ lọc hiện tại.</p>
          </div>
        ) : (
          sets.map((set) => (
            <Link
              key={set.id}
              href={`/student/flashcards/${set.id}`}
              className={`group ${DIFFICULTY_TILE_THEME[set.difficulty]} p-5 h-full flex flex-col transition-all hover:-translate-y-1 hover:shadow-xl`}
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="shrink-0 text-xl">🃏</span>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${DIFFICULTY_BADGE_THEME[set.difficulty]}`}>
                    {DIFFICULTY_LABEL[set.difficulty]}
                  </span>
                </div>
                <span className="shrink-0 rounded-full bg-white/80 px-2 py-0.5 text-xs text-slate-700 shadow-sm">
                  {set._count.cards} thẻ
                </span>
              </div>
              <h2 className="truncate font-semibold text-gray-900 transition-colors group-hover:text-blue-600">
                {set.title}
              </h2>
              <div className="mt-3 overflow-hidden rounded-2xl border border-white/70 bg-white/80 aspect-4/3 shadow-sm shrink-0">
                {set.cards[0] ? (
                  <CldImage
                    src={set.cards[0].imageUrl}
                    alt={set.title}
                    width={800}
                    height={600}
                    crop="fill"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm font-medium text-slate-400">
                    Chưa có ảnh preview
                  </div>
                )}
              </div>
              <div className="mt-2 flex-1 space-y-1 text-xs text-gray-500">
                <p className="truncate">📚 {set.subject.name}</p>
                <p className="truncate">{LEVEL_LABEL[set.grade.level]} · Lớp {set.grade.gradeNumber}</p>
                <p className="truncate">🏷️ {set.topicName}</p>
                <p className="truncate">👤 {set.createdBy.name}</p>
              </div>
              <div className="mt-4 flex items-center justify-between text-xs">
                <span className="text-gray-400">
                  {set._count.sessions > 0 ? `${set._count.sessions} lượt ôn` : "Chưa có lượt ôn"}
                </span>
                <span className="font-medium text-blue-600 group-hover:underline whitespace-nowrap">Mở chế độ học →</span>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
