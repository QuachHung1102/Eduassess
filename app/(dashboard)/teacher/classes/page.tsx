import Link from "next/link";
import { getTeacherClasses } from "@/lib/teacher/queries";
import { FaIcon } from "@/components/ui/FaIcon";
import { faSchool } from "@fortawesome/free-solid-svg-icons";

import { LEVEL_LABEL } from "@/lib/constants/labels";

export default async function ClassesPage() {
  const teacherClasses = await getTeacherClasses();

  // Gom nhóm theo class (một lớp có thể có nhiều môn)
  const classMap = new Map<string, { classId: string; className: string; gradeNumber: number; level: string; subjects: string[] }>();
  for (const tc of teacherClasses) {
    const key = tc.classId;
    if (!classMap.has(key)) {
      classMap.set(key, {
        classId: tc.classId,
        className: tc.class.name,
        gradeNumber: tc.class.grade.gradeNumber,
        level: tc.class.grade.level,
        subjects: [],
      });
    }
    classMap.get(key)!.subjects.push(tc.subject.name);
  }
  const classes = [...classMap.values()];

  return (
    <div className="flex flex-col h-full gap-6">
      <div className="shrink-0">
        <h1 className="text-2xl font-bold text-gray-900">Lớp học</h1>
        <p className="text-gray-500 text-sm mt-1">
          {classes.length > 0
            ? `${classes.length} lớp bạn đang phụ trách`
            : "Danh sách lớp bạn đang phụ trách"}
        </p>
      </div>

      {classes.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-gray-400">
          <div className="text-center">
            <div className="text-3xl mb-2"><FaIcon icon={faSchool} /></div>
            <p>Chưa có lớp nào được phân công. Liên hệ Admin để được cấp quyền.</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {classes.map((c) => (
              <Link
                key={c.classId}
                href={`/teacher/classes/${c.classId}`}
                className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md hover:border-blue-200 transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Lớp {c.className}</h2>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {LEVEL_LABEL[c.level]} · Khối {c.gradeNumber}
                    </p>
                  </div>
                  <span className="text-2xl"><FaIcon icon={faSchool} /></span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {c.subjects.map((sub) => (
                    <span
                      key={sub}
                      className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full font-medium"
                    >
                      {sub}
                    </span>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
