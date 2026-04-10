import Link from "next/link";
import { notFound } from "next/navigation";
import { FlashcardSetEditor } from "@/components/flashcards/FlashcardSetEditor";
import { getAdminFlashcardSetDetail } from "@/lib/admin/queries";

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

export default async function AdminFlashcardSetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const set = await getAdminFlashcardSetDetail(id);

  if (!set) notFound();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link href="/admin/flashcards" className="text-sm text-blue-600 hover:underline">
          ← Danh sách flashcard
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-gray-900">{set.title}</h1>
        <p className="mt-1 text-sm text-gray-500">
          📚 {set.subject.name} · {LEVEL_LABEL[set.grade.level]} · Lớp {set.grade.gradeNumber}
        </p>
        <p className="mt-1 text-sm text-gray-500">
          🏷️ {set.topicName} · {DIFFICULTY_LABEL[set.difficulty]} · {set.cards.length} thẻ
        </p>
        <p className="mt-1 text-sm text-gray-400">Người tạo: {set.createdBy.name}</p>
        {set.description ? <p className="mt-1 text-sm text-gray-400">{set.description}</p> : null}
      </div>

      <FlashcardSetEditor setId={set.id} role="admin" cards={set.cards} />
    </div>
  );
}
