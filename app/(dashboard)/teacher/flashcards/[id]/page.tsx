import { notFound } from "next/navigation";
import Link from "next/link";
import { getTeacherFlashcardSetDetail } from "@/lib/teacher/queries";
import { FlashcardSetManager } from "./FlashcardSetManager";

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

export default async function TeacherFlashcardSetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const set = await getTeacherFlashcardSetDetail(id);
  if (!set) notFound();

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="shrink-0 flex items-center justify-between">
        <div>
          <Link href="/teacher/flashcards" className="text-sm text-blue-600 hover:underline">
            ← Danh sách flashcard
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">{set.title}</h1>
          <p className="text-gray-500 text-sm mt-1">
            📚 {set.subject.name} · {LEVEL_LABEL[set.grade.level]} · Lớp {set.grade.gradeNumber}
          </p>
          <p className="text-gray-500 text-sm mt-1">
            🏷️ {set.topicName} · {DIFFICULTY_LABEL[set.difficulty]} · {set.cards.length} thẻ
          </p>
          <p className="text-gray-500 text-sm mt-1">
            👤 {set.createdBy.name} · {set.createdBy.role === "ADMIN" ? "Thư viện admin" : "Bộ của giáo viên"}
          </p>
          {set.description ? <p className="text-sm text-gray-400 mt-1">{set.description}</p> : null}
        </div>
      </div>

      <FlashcardSetManager setId={id} cards={set.cards} canManage={set.canManage} />
    </div>
  );
}
