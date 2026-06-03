import { getStudentFlashcardFilters, getStudentFlashcardSets } from "@/lib/student/queries";
import { FlashcardsPageClient } from "./FlashcardsPageClient";

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
    <FlashcardsPageClient
      filterOptions={filterOptions}
      sets={sets}
      filters={filters}
      randomHref={randomHref}
    />
  );
}

