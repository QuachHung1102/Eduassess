import Link from "next/link";
import { getSubjectsList } from "@/lib/classes/queries";
import { CreateClassForm } from "./CreateClassForm";

export default async function NewClassPage() {
  const subjects = await getSubjectsList();

  return (
    <div className="max-w-xl">
      <div className="mb-6">
        <Link href="/staff/classes" className="text-sm text-blue-600 hover:underline">
          ← Quay lại danh sách lớp
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Tạo lớp học mới</h1>
        <p className="text-gray-500 text-sm mt-1">
          Lớp sẽ được tạo với trạng thái <strong>Soạn thảo</strong>. Bạn có thể thêm buổi học và học sinh sau.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <CreateClassForm subjects={subjects} />
      </div>
    </div>
  );
}
