"use client";

import Link from "next/link";
import { FaIcon } from "@/components/ui/FaIcon";
import {
  faShuffle,
  faLayerGroup,
} from "@fortawesome/free-solid-svg-icons";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { FlashcardSetCard } from "@/components/flashcards/FlashcardSetCard";

type Subject = { id: string; name: string };
type Grade = { id: string; level: string; gradeNumber: number };
type FlashcardSet = {
  id: string;
  title: string;
  topicName: string;
  difficulty: string;
  subject: { name: string };
  grade: { level: string; gradeNumber: number };
  cards: { imageUrl: string | null }[];
  _count: { cards: number; sessions: number };
  createdBy: { name: string | null };
};

type Props = {
  filterOptions: { subjects: Subject[]; grades: Grade[]; topics: string[] };
  sets: FlashcardSet[];
  filters: {
    subjectId?: string;
    gradeId?: string;
    topicName?: string;
    difficulty?: string;
    search?: string;
  };
  randomHref: string;
};

const SELECT_STYLE = {
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

const DIFFICULTY_BADGE: Record<string, { bg: string; color: string }> = {
  EASY:   { bg: "rgba(22,163,74,0.1)",  color: "#15803d" },
  MEDIUM: { bg: "rgba(202,138,4,0.1)",  color: "#a16207" },
  HARD:   { bg: "rgba(220,38,38,0.1)",  color: "#b91c1c" },
};

export function FlashcardsPageClient({
  filterOptions,
  sets,
  filters,
  randomHref,
}: Props) {
  const { tr } = useLanguage();
  const fc = tr.flashcards;

  return (
    <div className="flex flex-col gap-4 flex-1 min-h-0">
      {/* ── Header ───────────────────────────────────────────── */}
      <div
        className="rounded-2xl p-5 shrink-0"
        style={{
          background:
            "linear-gradient(135deg, color-mix(in srgb, var(--primary) 10%, var(--surface-strong)) 0%, var(--surface-strong) 100%)",
          border: "1.5px solid var(--border-soft)",
        }}
      >
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div className="min-w-0">
            <h1
              className="text-xl font-bold leading-tight"
              style={{ color: "var(--foreground)" }}
            >
              {fc.pageTitle}
            </h1>
            <p
              className="mt-1 text-sm"
              style={{ color: "color-mix(in srgb, var(--foreground) 55%, transparent)" }}
            >
              {fc.pageSubtitle}
            </p>
          </div>
          <Link
            href={randomHref}
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shrink-0 transition-opacity hover:opacity-90"
            style={{ backgroundColor: "var(--primary)" }}
          >
            <FaIcon icon={faShuffle} className="text-xs" />
            {fc.randomStudy}
          </Link>
        </div>
      </div>

      {/* ── Filter form ───────────────────────────────────────── */}
      <form
        key={JSON.stringify(filters)}
        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-2.5 shrink-0"
      >
        <select
          name="subjectId"
          defaultValue={filters.subjectId ?? ""}
          style={SELECT_STYLE}
        >
          <option value="">{fc.allSubjects}</option>
          {filterOptions.subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        <select
          name="gradeId"
          defaultValue={filters.gradeId ?? ""}
          style={SELECT_STYLE}
        >
          <option value="">{fc.allGrades}</option>
          {filterOptions.grades.map((g) => (
            <option key={g.id} value={g.id}>
              {tr.level[g.level as keyof typeof tr.level]} · {tr.gradePrefix}{" "}
              {g.gradeNumber}
            </option>
          ))}
        </select>

        <select
          name="topicName"
          defaultValue={filters.topicName ?? ""}
          style={SELECT_STYLE}
        >
          <option value="">{fc.allTopics}</option>
          {filterOptions.topics.map((topic) => (
            <option key={topic} value={topic}>
              {topic}
            </option>
          ))}
        </select>

        <select
          name="difficulty"
          defaultValue={filters.difficulty ?? ""}
          style={SELECT_STYLE}
        >
          <option value="">{fc.allDifficulties}</option>
          {(["EASY", "MEDIUM", "HARD"] as const).map((d) => (
            <option key={d} value={d}>
              {tr.difficulty[d]}
            </option>
          ))}
        </select>

        <div className="flex gap-2">
          <input
            name="search"
            defaultValue={filters.search ?? ""}
            placeholder={fc.searchByName}
            className="min-w-0 flex-1 rounded-xl text-sm outline-none"
            style={{
              border: "1.5px solid var(--border-soft)",
              backgroundColor: "var(--surface-strong)",
              color: "var(--foreground)",
              padding: "0.55rem 0.75rem",
            }}
          />
          <button
            type="submit"
            className="rounded-xl px-4 py-2 text-sm font-semibold text-white shrink-0 transition-opacity hover:opacity-90"
            style={{ backgroundColor: "var(--foreground)" }}
          >
            {tr.common.filter}
          </button>
        </div>
      </form>

      {/* ── Card grid ────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {sets.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center rounded-2xl py-16 text-center"
            style={{
              border: "1.5px dashed var(--border-soft)",
              backgroundColor: "var(--surface-strong)",
              color: "color-mix(in srgb, var(--foreground) 40%, transparent)",
            }}
          >
            <FaIcon icon={faLayerGroup} className="text-3xl mb-3 opacity-30" />
            <p className="text-sm">{fc.noSets}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 pb-2">
            {sets.map((set, idx) => {
              const badge = tr.difficulty[set.difficulty as keyof typeof tr.difficulty] ?? set.difficulty;
              const badgeStyle = DIFFICULTY_BADGE[set.difficulty] ?? DIFFICULTY_BADGE.MEDIUM;
              return (
                <FlashcardSetCard
                  key={set.id}
                  priority={idx === 0}
                  title={set.title}
                  previewImageUrl={set.cards[0]?.imageUrl}
                  cardCount={set._count.cards}
                  sessionCount={set._count.sessions}
                  subject={set.subject.name}
                  grade={set.grade}
                  topicName={set.topicName}
                  badge={
                    <span
                      className="rounded-full px-2.5 py-0.5 text-xs font-semibold truncate max-w-40"
                      style={{ backgroundColor: badgeStyle.bg, color: badgeStyle.color }}
                    >
                      {badge}
                    </span>
                  }
                  actions={
                    <Link
                      href={`/student/flashcards/${set.id}`}
                      className="text-sm font-semibold transition-opacity hover:opacity-75 whitespace-nowrap"
                      style={{ color: "var(--primary)" }}
                    >
                      {fc.openStudy}
                    </Link>
                  }
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
