import Link from "next/link";
import { getTeacherSubjects, getGrades } from "@/lib/teacher/queries";
import { CreateFlashcardSetForm } from "./CreateFlashcardSetForm";

export default async function CreateFlashcardSetPage() {
  const [subjects, grades] = await Promise.all([getTeacherSubjects(), getGrades()]);

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="shrink-0">
        <Link href="/teacher/flashcards" className="text-sm text-blue-600 hover:underline">
          ← Quay lại danh sách flashcard
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Tạo bộ flashcard</h1>
        <p className="text-gray-500 text-sm mt-1">
          Chọn môn, khối, chủ đề và độ khó. Sau đó tải ảnh vào bộ flashcard.
        </p>
      </div>
      <div className="flex-1 overflow-auto">
        <div className="max-w-xl bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <CreateFlashcardSetForm subjects={subjects} grades={grades} />
        </div>
      </div>
    </div>
  );
}
