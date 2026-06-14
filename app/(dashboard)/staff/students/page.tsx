import Link from "next/link";
import { getMyStudents } from "@/lib/classes/queries";
import { FaIcon } from "@/components/ui/FaIcon";
import { faUserGraduate } from "@fortawesome/free-solid-svg-icons";
import {
  STUDENT_LEVEL_LABEL as LEVEL_LABEL,
  STUDENT_LEVEL_COLOR as LEVEL_COLOR,
} from "@/lib/constants/labels";

export default async function StaffStudentsPage() {
  const students = await getMyStudents();

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Học sinh phụ trách</h1>
          <p className="text-gray-500 text-sm mt-1">{students.length} học sinh</p>
        </div>
      </div>

      {/* Empty state */}
      {students.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-400">
          <FaIcon icon={faUserGraduate} className="text-4xl" />
          <p className="text-sm">Chưa có học sinh nào được giao cho bạn</p>
        </div>
      )}

      {/* Student grid */}
      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pb-4">
          {students.map(({ student, latestLevels }) => {
            const activeCount = student.classEnrollments.length;
            return (
              <Link
                key={student.id}
                href={`/staff/students/${student.id}`}
                className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md hover:border-blue-100 transition-all group"
              >
                {/* Student info */}
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 text-sm font-bold flex items-center justify-center shrink-0">
                    {student.name?.[0]?.toUpperCase() ?? "?"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                      {student.name}
                    </p>
                    <p className="text-xs text-gray-400 truncate">{student.email}</p>
                  </div>
                </div>

                {/* Level badges */}
                {latestLevels.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {latestLevels.map((l) => (
                      <span
                        key={l.subject.id}
                        className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                          LEVEL_COLOR[l.level] ?? "bg-gray-100 text-gray-600"
                        }`}
                        title={`${l.subject.name}: ${LEVEL_LABEL[l.level]}`}
                      >
                        {l.subject.name}: {LEVEL_LABEL[l.level]}
                      </span>
                    ))}
                  </div>
                )}

                {/* Active classes count */}
                <p className="text-xs text-gray-400 mt-3">
                  {activeCount > 0
                    ? `Đang học ${activeCount} lớp`
                    : "Chưa có lớp"}
                </p>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
