import Link from "next/link";
import { FlashcardDeleteButton } from "@/components/flashcards/FlashcardDeleteButton";
import { FlashcardSetCard } from "@/components/flashcards/FlashcardSetCard";
import { getAdminFlashcardSets } from "@/lib/admin/queries";
import { FaIcon } from "@/components/ui/FaIcon";
import { faPlus, faLayerGroup } from "@fortawesome/free-solid-svg-icons";

export default async function AdminFlashcardsPage() {
  const sets = await getAdminFlashcardSets();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Flashcard</h1>
          <p className="mt-1 text-sm text-gray-500">Quản trị toàn bộ bộ flashcard ảnh trong hệ thống</p>
        </div>
        <Link
          href="/admin/flashcards/create"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          <FaIcon icon={faPlus} className="mr-1" /> Tạo bộ flashcard
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 items-stretch">
        {sets.length === 0 ? (
          <div className="col-span-full rounded-xl border border-gray-100 bg-white py-16 text-center text-gray-400 shadow-sm">
            <div className="mb-2 text-3xl"><FaIcon icon={faLayerGroup} /></div>
            <p>Chưa có bộ flashcard nào trong hệ thống.</p>
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
                <>
                  <Link href={`/admin/flashcards/${set.id}`} className="text-sm font-medium text-blue-600 hover:underline whitespace-nowrap">
                    Quản lý thẻ →
                  </Link>
                  <FlashcardDeleteButton setId={set.id} role="admin" />
                </>
              }
            />
          ))
        )}
      </div>
    </div>
  );
}
