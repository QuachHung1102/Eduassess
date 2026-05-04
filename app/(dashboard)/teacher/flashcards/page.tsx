import Link from "next/link";
import { getTeacherFlashcardSets } from "@/lib/teacher/queries";
import { FlashcardSetCard } from "@/components/flashcards/FlashcardSetCard";
import { FlashcardDeleteButton } from "@/components/flashcards/FlashcardDeleteButton";
import { FaIcon } from "@/components/ui/FaIcon";
import { faPlus, faLayerGroup } from "@fortawesome/free-solid-svg-icons";

export default async function TeacherFlashcardsPage() {
  const sets = await getTeacherFlashcardSets();
  const ownSets = sets.filter((set) => set.canManage);
  const sharedSets = sets.filter((set) => !set.canManage);

  function renderSetCard(set: (typeof sets)[number], index: number) {
    return (
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
          <span className={`text-xs px-2 py-0.5 rounded-full truncate max-w-36 ${set.canManage ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
            {set.canManage ? "Bộ của tôi" : `Chia sẻ bởi ${set.createdBy.name ?? "?"}`}
          </span>
        }
        actions={
          <>
            <Link
              href={`/teacher/flashcards/${set.id}`}
              className="text-sm text-blue-600 hover:underline font-medium whitespace-nowrap"
            >
              {set.canManage ? "Quản lý thẻ →" : "Xem thư viện →"}
            </Link>
            {set.canManage ? <FlashcardDeleteButton setId={set.id} role="teacher" /> : null}
          </>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Flashcard</h1>
          <p className="text-gray-500 text-sm mt-1">Quản lý bộ thẻ ôn tập cho học sinh</p>
        </div>
        <Link
          href="/teacher/flashcards/create"
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <FaIcon icon={faPlus} className="mr-1" /> Tạo bộ flashcard
        </Link>
      </div>

      <div className="space-y-6">
        {sets.length === 0 ? (
          <div className="text-center py-16 text-gray-400 bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="text-3xl mb-2"><FaIcon icon={faLayerGroup} /></div>
            <p>Chưa có bộ flashcard nào. Tạo bộ đầu tiên để giao cho học sinh ôn luyện.</p>
          </div>
        ) : (
          <>
            <section className="space-y-3">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Bộ flashcard của tôi</h2>
                <p className="text-sm text-gray-500">Các bộ bạn có thể chỉnh sửa và cập nhật trực tiếp.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
                {ownSets.length > 0 ? ownSets.map((set, i) => renderSetCard(set, i)) : (
                  <div className="col-span-full rounded-xl border border-dashed border-gray-200 bg-white px-6 py-10 text-sm text-gray-400">
                    Bạn chưa tạo bộ flashcard nào riêng cho mình.
                  </div>
                )}
              </div>
            </section>
            <section className="space-y-3">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Thư viện chung</h2>
                <p className="text-sm text-gray-500">Các bộ do admin hoặc giáo viên khác tạo để bạn xem và dùng chung.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
                {sharedSets.length > 0 ? sharedSets.map((set, i) => renderSetCard(set, i)) : (
                  <div className="col-span-full rounded-xl border border-dashed border-gray-200 bg-white px-6 py-10 text-sm text-gray-400">
                    Chưa có bộ flashcard chia sẻ nào.
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
