import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminClassDetail, getAdminClasses } from "@/lib/admin/queries";
import { getAvailableStudents, getSuggestedStudents, getTeachersList } from "@/lib/classes/queries";
import { RemoveStudentButton } from "./RemoveStudentButton";
import { TransferStudentButton } from "./TransferStudentButton";
import { AssignTeacherForm } from "./AssignTeacherForm";
import { RemoveTeacherButton } from "./RemoveTeacherButton";
import { AssignStudentForm } from "./AssignStudentForm";

export default async function AdminClassDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cls = await getAdminClassDetail(id);
  if (!cls) notFound();

  const [allClasses, availableStudents, suggested, allTeachers] = await Promise.all([
    getAdminClasses(),
    getAvailableStudents(id),
    getSuggestedStudents(cls.subject.id, cls.targetLevel),
    getTeachersList(),
  ]);

  const otherClasses = allClasses.filter((c) => c.id !== id);
  const suggestedIds = suggested.map((s) => s.id);
  const assignedTeacherIds = new Set(cls.teachers.map((tc) => tc.teacher.id));
  const availableTeachers = allTeachers.filter((t) => !assignedTeacherIds.has(t.id));

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <div className="shrink-0">
        <Link href="/admin/classes" className="text-sm text-blue-600 hover:underline mb-2 inline-block">
          ← Danh sách lớp
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Lớp {cls.name}</h1>
            <p className="text-gray-500 text-sm mt-0.5">
              {cls.subject.name} · {cls.enrollments.length} học sinh · {cls.teachers.length} phân công
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-5 gap-4 min-h-0 overflow-auto pb-4">
        {/* ── Left: Students (3/5 width) ── */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <h2 className="font-semibold text-gray-800">
                Danh sách học sinh ({cls.enrollments.length})
              </h2>
              <AssignStudentForm classId={id} students={availableStudents} suggestedIds={suggestedIds} />
            </div>
            <div className="overflow-auto max-h-[calc(100vh-320px)]">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100 sticky top-0">
                  <tr>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">#</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Họ tên</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Email</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {cls.enrollments.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-10 text-gray-400 text-sm">
                        Chưa có học sinh nào trong lớp
                      </td>
                    </tr>
                  ) : (
                    cls.enrollments.map((e, idx) => (
                      <tr key={e.student.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-2.5 text-gray-400 text-xs">{idx + 1}</td>
                        <td className="px-4 py-2.5 font-medium text-gray-900">
                          {e.student.name}
                          {e.student.sex && (
                            <span className="ml-1 text-xs text-gray-400">
                              ({e.student.sex === "MALE" ? "Nam" : "Nữ"})
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-gray-500 text-xs">{e.student.email}</td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center justify-end gap-1">
                            <TransferStudentButton
                              studentId={e.student.id}
                              studentName={e.student.name}
                              currentClassId={id}
                              otherClasses={otherClasses.map((c) => ({ id: c.id, name: c.name }))}
                            />
                            <RemoveStudentButton
                              studentId={e.student.id}
                              classId={id}
                              studentName={e.student.name}
                            />
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ── Right: Teachers (2/5 width) ── */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <h2 className="font-semibold text-gray-800">
                Giáo viên phân công ({cls.teachers.length})
              </h2>
              <AssignTeacherForm classId={id} teachers={availableTeachers} />
            </div>
            <div className="divide-y divide-gray-50">
              {cls.teachers.length === 0 ? (
                <div className="text-center py-10 text-gray-400 text-sm">
                  Chưa có giáo viên nào được phân công
                </div>
              ) : (
                cls.teachers.map((tc) => (
                  <div key={tc.teacher.id} className="px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{tc.teacher.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{tc.teacher.email}</p>
                    </div>
                    <RemoveTeacherButton
                      teacherId={tc.teacher.id}
                      classId={id}
                      label={tc.teacher.name}
                    />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
