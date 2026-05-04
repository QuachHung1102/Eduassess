import Link from "next/link";
import { notFound } from "next/navigation";
import { FlashcardSetEditor } from "@/components/flashcards/FlashcardSetEditor";
import { FlashcardSetMeta } from "@/components/flashcards/FlashcardSetMeta";
import { getAdminFlashcardSetDetail } from "@/lib/admin/queries";

export default async function AdminFlashcardSetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const set = await getAdminFlashcardSetDetail(id);

  if (!set) notFound();

  return (
    <div className="flex flex-col h-full gap-4">
      <div>
        <Link href="/admin/flashcards" className="text-sm text-blue-600 hover:underline">
          ← Danh sách flashcard
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-gray-900">{set.title}</h1>
        <FlashcardSetMeta
          subject={set.subject.name}
          grade={set.grade}
          topicName={set.topicName}
          difficulty={set.difficulty}
          cardCount={set.cards.length}
          createdByName={set.createdBy.name}
          description={set.description}
        />
      </div>

      <FlashcardSetEditor setId={set.id} role="admin" cards={set.cards} />
    </div>
  );
}
