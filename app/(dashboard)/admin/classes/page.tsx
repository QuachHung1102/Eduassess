import Link from "next/link";
import { getAdminClasses, getAdminHighSchoolGrades } from "@/lib/admin/queries";
import { AddClassForm } from "./AddClassForm";
import { DeleteClassButton } from "./DeleteClassButton";
import { FaIcon } from "@/components/ui/FaIcon";
import { faSchool } from "@fortawesome/free-solid-svg-icons";

export default async function AdminClassesPage() {
  const [classes, grades] = await Promise.all([getAdminClasses(), getAdminHighSchoolGrades()]);

  // Group by gradeNumber
  const grouped = new Map<number, typeof classes>();
  for (const cls of classes) {
    const g = cls.grade.gradeNumber;
    if (!grouped.has(g)) grouped.set(g, []);
    grouped.get(g)!.push(cls);
  }
  const sortedGrades = [...grouped.keys()].sort((a, b) => a - b);

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý lớp học</h1>
          <p className="text-gray-500 text-sm mt-1">{classes.length} lớp · 3 khối</p>
        </div>
        <AddClassForm grades={grades} />
      </div>

      {/* Classes grouped by grade */}
      <div className="flex-1 overflow-auto space-y-6 pb-4">
        {sortedGrades.map((gradeNumber) => {
          const gradeClasses = grouped.get(gradeNumber)!;
          return (
            <div key={gradeNumber} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-semibold text-gray-800">Khối {gradeNumber}</h2>
                <span className="text-xs text-gray-500">{gradeClasses.length} lớp</span>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-50">
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Tên lớp</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Học sinh</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Giáo viên phân công</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {gradeClasses.map((cls) => (
                    <tr key={cls.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/classes/${cls.id}`}
                          className="font-medium text-blue-600 hover:underline"
                        >
                          {cls.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        <span className="inline-flex items-center gap-1">
                          <span className="font-medium">{cls._count.studentClasses}</span>
                          <span className="text-gray-400">/ 30</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {cls._count.teacherClasses} phân công
                      </td>
                      <td className="px-4 py-3 text-right flex items-center justify-end gap-2">
                        <Link
                          href={`/admin/classes/${cls.id}`}
                          className="text-xs text-blue-600 hover:underline px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                        >
                          Chi tiết
                        </Link>
                        <DeleteClassButton classId={cls.id} className={cls.name} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}

        {classes.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-16 text-center text-gray-400">
            <div className="text-3xl mb-2"><FaIcon icon={faSchool} /></div>
            <p>Chưa có lớp học nào. Hãy thêm lớp đầu tiên!</p>
          </div>
        )}
      </div>
    </div>
  );
}
