import Link from "next/link";
import { notFound } from "next/navigation";
import { getTeacherClassDetail } from "@/lib/teacher/queries";
import { FaIcon } from "@/components/ui/FaIcon";
import { faPlus } from "@fortawesome/free-solid-svg-icons";

export default async function TeacherClassDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cls = await getTeacherClassDetail(id);

  if (!cls) notFound();

  const subjects = cls.teacherClasses.map((tc) => tc.subject.name);

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <div className="shrink-0">
        <Link href="/teacher/classes" className="text-sm text-blue-600 hover:underline">
          ← Quay lại danh sách lớp
        </Link>
        <div className="flex items-start justify-between mt-2">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Lớp {cls.name}</h1>
            <p className="text-gray-500 text-sm mt-1">
              Khối {cls.grade.gradeNumber} ·{" "}
              {subjects.length > 0 ? subjects.join(", ") : "Chưa có môn"}
            </p>
          </div>
          <Link
            href="/teacher/exams/create"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <FaIcon icon={faPlus} className="mr-1.5" /> Tạo đề cho lớp này
          </Link>
        </div>
      </div>

      {/* Stat strip */}
      <div className="shrink-0 grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="text-xs text-gray-500 mb-1">Học sinh</div>
          <div className="text-2xl font-bold text-gray-900">{cls.studentClasses.length}</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="text-xs text-gray-500 mb-1">Đề kiểm tra</div>
          <div className="text-2xl font-bold text-gray-900">{cls.exams.length}</div>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0">
        {/* Students list */}
        <div className="flex-1 flex flex-col min-h-0 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 shrink-0">
            <h2 className="font-semibold text-gray-900 text-sm">
              Danh sách học sinh ({cls.studentClasses.length})
            </h2>
          </div>
          <div className="flex-1 overflow-auto">
            {cls.studentClasses.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm py-12">
                Lớp chưa có học sinh nào
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100 sticky top-0">
                  <tr>
                    {["#", "Họ tên", "Email"].map((h) => (
                      <th
                        key={h}
                        className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {cls.studentClasses.map((sc, idx) => (
                    <tr key={sc.student.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 text-gray-400 text-xs w-8">{idx + 1}</td>
                      <td className="px-4 py-2.5 font-medium text-gray-900">{sc.student.name}</td>
                      <td className="px-4 py-2.5 text-gray-500 text-xs">{sc.student.email}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Exams list */}
        <div className="lg:w-80 flex flex-col min-h-0 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 shrink-0">
            <h2 className="font-semibold text-gray-900 text-sm">
              Đề kiểm tra ({cls.exams.length})
            </h2>
          </div>
          <div className="flex-1 overflow-auto">
            {cls.exams.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm py-12 text-center px-4">
                Chưa có đề nào cho lớp này
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {cls.exams.map((exam) => (
                  <Link
                    key={exam.id}
                    href={`/teacher/exams/${exam.id}`}
                    className="block px-4 py-3 hover:bg-gray-50 transition-colors group"
                  >
                    <p className="text-sm font-medium text-gray-900 group-hover:text-blue-600 line-clamp-1">
                      {exam.title}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {exam.subject.name} · {exam._count.examQuestions} câu · {exam._count.examAttempts} lượt làm
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
