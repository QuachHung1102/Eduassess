import Link from "next/link";
import { FlashcardSetForm } from "@/components/flashcards/FlashcardSetForm";
import { getAdminGrades, getAdminSubjects } from "@/lib/admin/queries";

export default async function AdminCreateFlashcardSetPage() {
  const [subjects, grades] = await Promise.all([getAdminSubjects(), getAdminGrades()]);

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="shrink-0">
        <Link href="/admin/flashcards" className="text-sm text-blue-600 hover:underline">
          ← Quay lại danh sách flashcard
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">Tạo bộ flashcard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Admin có thể tạo bộ thẻ dùng chung cho toàn bộ học sinh.
        </p>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="max-w-xl rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <FlashcardSetForm role="admin" subjects={subjects} grades={grades} />
        </div>
      </div>
    </div>
  );
}
