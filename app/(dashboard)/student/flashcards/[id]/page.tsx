import { notFound } from "next/navigation";
import Link from "next/link";
import { getStudentFlashcardSetDetail } from "@/lib/student/queries";
import { FlashcardStudyClient } from "./FlashcardStudyClient";
import { FlashcardSetMeta } from "@/components/flashcards/FlashcardSetMeta";
import { FaIcon } from "@/components/ui/FaIcon";
import { faLayerGroup } from "@fortawesome/free-solid-svg-icons";

export default async function StudentFlashcardDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const set = await getStudentFlashcardSetDetail(id);

  if (!set) notFound();

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="shrink-0">
        <Link href="/student/flashcards" className="text-sm text-blue-600 hover:underline">
          ← Danh sách flashcard
        </Link>
        <h1 className="text-xl md:text-2xl font-bold text-gray-900 mt-1">{set.title}</h1>
        <FlashcardSetMeta
          subject={set.subject.name}
          grade={set.grade}
          topicName={set.topicName}
          difficulty={set.difficulty}
          cardCount={set.cards.length}
          createdByName={set.createdBy.name}
        />
      </div>

      {/* Study area */}
      {set.cards.length === 0 ? (
        <div className="text-center py-16 text-gray-400 bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="text-3xl mb-2"><FaIcon icon={faLayerGroup} /></div>
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
  );
}
