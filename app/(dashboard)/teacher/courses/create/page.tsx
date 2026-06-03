import { getAdminSubjects } from "@/lib/admin/queries";
import { CreateCourseForm } from "./CreateCourseForm";

export default async function CreateCoursePage() {
  const subjects = await getAdminSubjects();
  return (
    <div className="w-full max-w-xl mx-auto">
      {/* Page header */}
      <div className="mb-5">
        <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
          <span>Khóa học</span>
          <span>/</span>
          <span className="text-gray-600 font-medium">Tạo mới</span>
        </div>
        <h1 className="text-xl font-bold text-gray-900">Tạo khóa học mới</h1>
        <p className="text-gray-500 text-sm mt-1">
          Điền thông tin cơ bản. Bạn có thể thêm bài giảng sau khi tạo.
        </p>
      </div>

      {/* Steps hint */}
      <div className="flex items-center gap-2 mb-5">
        {[
          { n: 1, label: "Thông tin cơ bản", active: true },
          { n: 2, label: "Thêm bài giảng", active: false },
          { n: 3, label: "Gửi duyệt", active: false },
        ].map((s, i) => (
          <div key={s.n} className="flex items-center gap-2">
            {i > 0 && <div className="w-6 h-px bg-gray-200" />}
            <div className="flex items-center gap-1.5">
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                  s.active ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-400"
                }`}
              >
                {s.n}
              </div>
              <span className={`text-xs font-medium hidden sm:block ${
                s.active ? "text-blue-600" : "text-gray-400"
              }`}>{s.label}</span>
            </div>
          </div>
        ))}
      </div>

      <CreateCourseForm subjects={subjects} />
    </div>
  );
}
