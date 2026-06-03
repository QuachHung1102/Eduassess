import { getAdminTeacherPermissions, getAdminClasses, getAdminSubjects } from "@/lib/admin/queries";
import { TeacherAssignmentCard } from "./TeacherAssignmentCard";

export default async function AdminPermissionsPage() {
  const [teachers, classes, subjects] = await Promise.all([
    getAdminTeacherPermissions(),
    getAdminClasses(),
    getAdminSubjects(),
  ]);

  const classItems = classes.map((c) => ({
    id: c.id,
    name: c.name,
    grade: { gradeNumber: 0 },
  }));

  const subjectItems = subjects.map((s) => ({ id: s.id, name: s.name }));

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="shrink-0">
        <h1 className="text-2xl font-bold text-gray-900">Phân công giáo viên</h1>
        <p className="text-gray-500 text-sm mt-1">
          Phân công môn học và lớp cho từng giáo viên. Nhấn{" "}
          <span className="font-medium text-emerald-600">+ Phân công</span> để thêm, hover vào hàng để xóa.
        </p>
      </div>

      <div className="flex-1 overflow-auto">
        {teachers.length === 0 ? (
          <p className="text-gray-400 text-sm py-10 text-center">Chưa có giáo viên nào trong hệ thống</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pb-4">
            {teachers.map((teacher) => (
              <TeacherAssignmentCard
                key={teacher.id}
                teacher={teacher}
                classes={classItems}
                subjects={subjectItems}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

