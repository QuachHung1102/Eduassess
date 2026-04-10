import { notFound } from "next/navigation";
import Link from "next/link";
import { getStudentFlashcardSetDetail } from "@/lib/student/queries";
import { FlashcardStudyClient } from "./FlashcardStudyClient";

const DIFFICULTY_LABEL: Record<string, string> = {
  EASY: "Dễ",
  MEDIUM: "Trung bình",
  HARD: "Khó",
};

const LEVEL_LABEL: Record<string, string> = {
  PRIMARY: "Tiểu học",
  MIDDLE: "THCS",
  HIGH: "THPT",
};

export default async function StudentFlashcardDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const set = await getStudentFlashcardSetDetail(id);

  if (!set) notFound();

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <div className="shrink-0 flex items-center gap-4">
        <Link href="/student/flashcards" className="text-sm text-blue-600 hover:underline">
          ← Danh sách flashcard
        </Link>
        <span className="text-gray-300">|</span>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">📚 {set.subject.name}</span>
          <span className="text-sm text-gray-500">
            🏫 {LEVEL_LABEL[set.grade.level]} · Lớp {set.grade.gradeNumber}
          </span>
          <span className="text-sm text-gray-500">🏷️ {set.topicName}</span>
          <span className="text-sm text-gray-500">🎯 {DIFFICULTY_LABEL[set.difficulty]}</span>
          <span className="text-sm text-gray-500">👤 {set.createdBy.name}</span>
        </div>
      </div>

      {/* Study area */}
      <div className="flex-1 flex flex-col justify-center">
        {set.cards.length === 0 ? (
          <div className="text-center py-16 text-gray-400 bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="text-3xl mb-2">🃏</div>
            <p>Bộ flashcard này chưa có thẻ nào. Giáo viên sẽ thêm thẻ sớm.</p>
          </div>
        ) : (
          <FlashcardStudyClient
            setId={set.id}
            title={set.title}
            difficulty={set.difficulty}
            cards={set.cards}
            totalSessions={set.totalSessions}
          />
        )}
      </div>
    </div>
  );
}
