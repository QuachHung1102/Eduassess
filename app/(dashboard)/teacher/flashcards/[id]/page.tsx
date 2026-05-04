import Link from "next/link";
import { notFound } from "next/navigation";
import { getTeacherFlashcardSetDetail } from "@/lib/teacher/queries";
import { FlashcardSetMeta } from "@/components/flashcards/FlashcardSetMeta";
import { FlashcardSetManager } from "./FlashcardSetManager";

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
          <FlashcardSetMeta
            subject={set.subject.name}
            grade={set.grade}
            topicName={set.topicName}
            difficulty={set.difficulty}
            cardCount={set.cards.length}
            createdByName={set.createdBy.name}
            createdByRole={set.createdBy.role}
            description={set.description}
          />
        </div>
      </div>

      <FlashcardSetManager setId={id} cards={set.cards} canManage={set.canManage} />
    </div>
  );
}
