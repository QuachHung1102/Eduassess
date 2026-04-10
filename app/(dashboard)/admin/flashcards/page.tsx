import Link from "next/link";
import { CldImage } from "@/components/ui/CloudinaryImage";
import { FlashcardDeleteButton } from "@/components/flashcards/FlashcardDeleteButton";
import { getAdminFlashcardSets } from "@/lib/admin/queries";

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
          ➕ Tạo bộ flashcard
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 items-stretch">
        {sets.length === 0 ? (
          <div className="col-span-full rounded-xl border border-gray-100 bg-white py-16 text-center text-gray-400 shadow-sm">
            <div className="mb-2 text-3xl">🃏</div>
            <p>Chưa có bộ flashcard nào trong hệ thống.</p>
          </div>
        ) : (
          sets.map((set) => (
            <div key={set.id} className="flex flex-col h-full rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-2">
                <span className="shrink-0 text-xl">🃏</span>
                <div className="flex items-center gap-2 min-w-0">
                  <span className="shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-600 whitespace-nowrap">
                    {set._count.cards} thẻ
                  </span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 truncate max-w-36">
                    {set.createdBy.name}
                  </span>
                </div>
              </div>
              <div className="overflow-hidden rounded-xl border border-slate-100 bg-slate-50 aspect-4/3 shrink-0">
                {set.cards[0] ? (
                  <CldImage
                    src={set.cards[0].imageUrl}
                    alt={set.title}
                    width={800}
                    height={600}
                    crop="fill"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm font-medium text-slate-400">
                    Chưa có ảnh preview
                  </div>
                )}
              </div>
              <div className="mt-3 flex flex-col gap-1 flex-1 min-w-0">
                <h2 className="font-semibold text-gray-900 truncate">{set.title}</h2>
                <p className="text-xs text-gray-500 truncate">
                  📚 {set.subject.name} · {LEVEL_LABEL[set.grade.level]} · Lớp {set.grade.gradeNumber}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  🏷️ {set.topicName} · {DIFFICULTY_LABEL[set.difficulty]}
                </p>
                <p className="text-xs text-gray-400">{set._count.sessions} lượt ôn</p>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
                <Link href={`/admin/flashcards/${set.id}`} className="text-sm font-medium text-blue-600 hover:underline whitespace-nowrap">
                  Quản lý thẻ →
                </Link>
                <FlashcardDeleteButton setId={set.id} role="admin" />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
