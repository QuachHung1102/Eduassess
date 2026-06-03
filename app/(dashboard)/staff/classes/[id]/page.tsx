import Link from "next/link";
import { notFound } from "next/navigation";
import { getClassDetail, getAvailableStudents, getTeachersList } from "@/lib/classes/queries";
import { FaIcon } from "@/components/ui/FaIcon";
import { faPlus, faCalendarCheck } from "@fortawesome/free-solid-svg-icons";
import { UpdateClassStatusButton } from "./UpdateClassStatusButton";
import { EnrollStudentForm } from "./EnrollStudentForm";
import { DropStudentButton } from "./DropStudentButton";
import { AssignClassTeacherForm } from "./AssignClassTeacherForm";
import { RemoveClassTeacherButton } from "./RemoveClassTeacherButton";
import type { ClassStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Soạn thảo", RECRUITING: "Tuyển sinh",
  ONGOING: "Đang học", FINISHED: "Hoàn thành", CANCELLED: "Đã hủy",
};
const STATUS_COLOR: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-600", RECRUITING: "bg-blue-100 text-blue-700",
  ONGOING: "bg-green-100 text-green-700", FINISHED: "bg-purple-100 text-purple-700",
  CANCELLED: "bg-red-100 text-red-700",
};
const MODE_LABEL: Record<string, string> = { ONLINE: "Online", OFFLINE: "Offline", HYBRID: "Hybrid" };
const SESSION_STATUS_LABEL: Record<string, string> = {
  SCHEDULED: "Đã lên lịch", COMPLETED: "Hoàn thành",
  CANCELLED: "Đã hủy", POSTPONED: "Tạm hoãn",
};
const SESSION_STATUS_COLOR: Record<string, string> = {
  SCHEDULED: "bg-blue-100 text-blue-700", COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700", POSTPONED: "bg-yellow-100 text-yellow-700",
};
const LEVEL_LABEL: Record<string, string> = { WEAK: "Yếu", AVERAGE: "Trung bình", GOOD: "Khá / Giỏi" };

export default async function StaffClassDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [cls, availableStudents, allTeachers] = await Promise.all([
    getClassDetail(id),
    getAvailableStudents(id),
    getTeachersList(),
  ]);
  if (!cls) notFound();

  const assignedTeacherIds = new Set(cls.teachers.map((t) => t.teacher.id));
  const availableTeachers = allTeachers.filter((t) => !assignedTeacherIds.has(t.id));

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Breadcrumb */}
      <div className="shrink-0">
        <Link href="/staff/classes" className="text-sm text-blue-600 hover:underline">
          ← Danh sách lớp
        </Link>

        {/* Header */}
        <div className="flex items-start justify-between mt-2 gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900">{cls.name}</h1>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  STATUS_COLOR[cls.status] ?? "bg-gray-100 text-gray-600"
                }`}
              >
                {STATUS_LABEL[cls.status] ?? cls.status}
              </span>
            </div>
            <p className="text-gray-500 text-sm mt-1">
              {cls.subject.name} · {MODE_LABEL[cls.mode]} ·{" "}
              Mục tiêu: {LEVEL_LABEL[cls.targetLevel]} ·{" "}
              CBDT: {cls.advisor.name}
            </p>
            {cls.note && (
              <p className="text-gray-400 text-xs mt-1 italic">{cls.note}</p>
            )}
          </div>
          <UpdateClassStatusButton classId={id} currentStatus={cls.status as ClassStatus} />
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          {[
            { label: "Học sinh", value: cls._count.enrollments },
            { label: "Buổi học", value: `${cls._count.sessions}${cls.sessionCount > 0 ? ` / ${cls.sessionCount}` : ""}` },
            { label: "Đề kiểm tra", value: cls._count.exams },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-lg border border-gray-100 px-4 py-3 text-center shadow-sm">
              <div className="text-xl font-bold text-gray-900">{s.value}</div>
              <div className="text-xs text-gray-400 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0">

        {/* Left — Sessions */}
        <div className="flex-1 flex flex-col min-h-0 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between shrink-0">
            <h2 className="font-semibold text-gray-800">Lịch buổi học</h2>
            <Link
              href={`/staff/classes/${id}/sessions/new`}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors"
            >
              <FaIcon icon={faPlus} className="text-xs" /> Thêm buổi
            </Link>
          </div>

          <div className="flex-1 overflow-auto">
            {cls.sessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-2 py-12 text-gray-400">
                <FaIcon icon={faCalendarCheck} className="text-3xl" />
                <p className="text-sm">Chưa có buổi học nào</p>
                <Link href={`/staff/classes/${id}/sessions/new`} className="text-xs text-emerald-600 hover:underline">
                  Lên lịch buổi đầu tiên
                </Link>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    {["#", "Ngày", "Giờ", "Phòng", "Giáo viên", "Trạng thái", ""].map((h) => (
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
                  {cls.sessions.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-2.5 text-gray-400 text-xs">{s.sessionNumber}</td>
                      <td className="px-4 py-2.5 font-medium text-gray-800 text-sm">
                        {new Date(s.date).toLocaleDateString("vi-VN", {
                          weekday: "short", day: "2-digit", month: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-2.5 text-gray-500 text-xs">
                        {s.startTime} – {s.endTime}
                      </td>
                      <td className="px-4 py-2.5 text-gray-500 text-xs">
                        {s.room?.name ?? <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-2.5 text-gray-500 text-xs">{s.teacher.name}</td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            SESSION_STATUS_COLOR[s.status] ?? "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {SESSION_STATUS_LABEL[s.status] ?? s.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <Link
                          href={`/staff/classes/${id}/sessions/${s.id}`}
                          className="text-xs text-blue-500 hover:underline"
                        >
                          {s.status === "SCHEDULED" ? "Điểm danh" : "Xem"}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right — Students + Teachers */}
        <div className="lg:w-80 flex flex-col gap-4">
          {/* Teachers */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-50">
              <h2 className="font-semibold text-gray-800 text-sm">
                Giáo viên ({cls.teachers.length})
              </h2>
            </div>
            <div className="divide-y divide-gray-50">
              {cls.teachers.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6">Chưa có giáo viên</p>
              ) : (
                cls.teachers.map((t) => (
                  <div key={t.teacher.id} className="px-4 py-3 flex items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-800">{t.teacher.name}</p>
                      <p className="text-xs text-gray-400">{t.teacher.email}</p>
                    </div>
                    <RemoveClassTeacherButton
                      classId={id}
                      teacherId={t.teacher.id}
                      teacherName={t.teacher.name}
                    />
                  </div>
                ))
              )}
            </div>
            <AssignClassTeacherForm classId={id} teachers={availableTeachers} />
          </div>

          {/* Students */}
          <div className="flex-1 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col min-h-0">
            <div className="px-4 py-3 border-b border-gray-50 shrink-0">
              <h2 className="font-semibold text-gray-800 text-sm">
                Học sinh ({cls.enrollments.length})
              </h2>
            </div>
            <div className="overflow-auto flex-1">
              {cls.enrollments.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6">Chưa có học sinh</p>
              ) : (
                <div className="divide-y divide-gray-50">
                  {cls.enrollments.map((e, idx) => (
                    <div key={e.student.id} className="px-4 py-2.5 flex items-center gap-2">
                      <span className="text-xs text-gray-400 w-5 text-right shrink-0">{idx + 1}</span>
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/staff/students/${e.student.id}`}
                          className="text-sm font-medium text-gray-800 hover:text-blue-600 truncate block"
                        >
                          {e.student.name}
                          {e.student.sex && (
                            <span className="ml-1 text-xs text-gray-400">
                              ({e.student.sex === "MALE" ? "Nam" : "Nữ"})
                            </span>
                          )}
                        </Link>
                        <p className="text-xs text-gray-400 truncate">{e.student.email}</p>
                      </div>
                      <DropStudentButton
                        classId={id}
                        studentId={e.student.id}
                        studentName={e.student.name}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
            <EnrollStudentForm classId={id} students={availableStudents} />
          </div>
        </div>
      </div>
    </div>
  );
}
