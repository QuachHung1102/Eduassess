import Link from "next/link";
import { getTeacherExams } from "@/lib/teacher/queries";
import { FaIcon } from "@/components/ui/FaIcon";
import { faPlus, faFilePen } from "@fortawesome/free-solid-svg-icons";

export default async function ExamsPage() {
  const exams = await getTeacherExams();

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Đề kiểm tra</h1>
          <p className="text-gray-500 text-sm mt-1">
            {exams.length > 0 ? `${exams.length} đề kiểm tra` : "Tạo và quản lý đề kiểm tra cho các lớp"}
          </p>
        </div>
        <Link
          href="/teacher/exams/create"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <FaIcon icon={faPlus} className="mr-1.5" /> Tạo đề mới
        </Link>
      </div>

      <div className="flex-1 flex flex-col min-h-0 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-auto flex-1">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100 sticky top-0">
            <tr>
              {["Tên đề", "Môn", "Lớp", "Số câu", "Thời gian", "Lượt làm", ""].map((h) => (
                <th
                  key={h}
                  className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {exams.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-16 text-gray-400">
                  <div className="text-3xl mb-2"><FaIcon icon={faFilePen} /></div>
                  <p>Chưa có đề kiểm tra nào. Hãy tạo đề đầu tiên!</p>
                </td>
              </tr>
            ) : (
              exams.map((exam) => (
                <tr key={exam.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link
                      href={`/teacher/exams/${exam.id}`}
                      className="font-medium text-gray-900 hover:text-blue-600 transition-colors"
                    >
                      {exam.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{exam.subject.name}</td>
                  <td className="px-4 py-3 text-gray-600">Lớp {exam.class.name}</td>
                  <td className="px-4 py-3 text-gray-600">{exam._count.examQuestions} câu</td>
                  <td className="px-4 py-3 text-gray-600">{exam.duration} phút</td>
                  <td className="px-4 py-3 text-gray-600">{exam._count.examAttempts} lượt</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/teacher/exams/${exam.id}`}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Chi tiết
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
