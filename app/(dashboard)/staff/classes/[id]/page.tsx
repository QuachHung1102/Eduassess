import Link from "next/link";
import { notFound } from "next/navigation";
import { getClassDetail, getAvailableStudents, getTeachersList, getSuggestedStudents } from "@/lib/classes/queries";
import { FaIcon } from "@/components/ui/FaIcon";
import { faPlus, faCalendarCheck } from "@fortawesome/free-solid-svg-icons";
import { UpdateClassStatusButton } from "./UpdateClassStatusButton";
import { AddStudentsButton } from "./AddStudentsButton";
import { DropStudentButton } from "./DropStudentButton";
import { AddTeachersButton } from "./AddTeachersButton";
import { RemoveClassTeacherButton } from "./RemoveClassTeacherButton";
import { SessionOccurrenceTable } from "./SessionOccurrenceTable";
import { STUDENT_LEVEL_LABEL as LEVEL_LABEL } from "@/lib/constants/labels";
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
const DAY_LABEL: Record<string, string> = {
  MON: "T.2", TUE: "T.3", WED: "T.4", THU: "T.5", FRI: "T.6", SAT: "T.7", SUN: "CN",
};

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
  const suggested = await getSuggestedStudents(cls.subject.id, cls.targetLevel);
  const suggestedIds = suggested.map((s) => s.id);

  // Thống kê buổi theo trạng thái. sessionCount = mục tiêu giáo trình (cố định).
  // Buổi nghỉ (CANCELLED) không tính vào tiến độ; buổi bù thay thế buổi nghỉ.
  const sessionStats = cls.sessions.reduce(
    (acc, s) => {
      if (s.status === "CANCELLED") acc.cancelled += 1;
      else acc.active += 1;
      if (s.status === "COMPLETED") acc.completed += 1;
      if (s.note?.startsWith("Bù cho buổi")) acc.makeup += 1;
      return acc;
    },
    { active: 0, completed: 0, cancelled: 0, makeup: 0 },
  );
  const sessionProgress =
    cls.sessionCount > 0 ? `${sessionStats.active} / ${cls.sessionCount}` : `${sessionStats.active}`;

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
            { label: "Buổi học", value: sessionProgress },
            { label: "Đề kiểm tra", value: cls._count.exams },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-lg border border-gray-100 px-4 py-3 text-center shadow-sm">
              <div className="text-xl font-bold text-gray-900">{s.value}</div>
              <div className="text-xs text-gray-400 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Breakdown buổi học theo trạng thái */}
        {cls._count.sessions > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
              {sessionStats.completed} diễn ra
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-blue-500" />
              {sessionStats.active - sessionStats.completed} chờ học
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
              {sessionStats.cancelled} nghỉ
            </span>
            {sessionStats.makeup > 0 && (
              <span className="inline-flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
                {sessionStats.makeup} bù
              </span>
            )}
            <span className="text-gray-400">· mục tiêu {cls.sessionCount} buổi</span>
          </div>
        )}

        {/* Khung lịch tuần — mỗi khung kèm phòng cố định của nó */}
        {cls.weeklySlots.length > 0 && (
          <div className="mt-3">
            <p className="text-xs font-medium text-gray-500 mb-1.5">Khung lịch tuần</p>
            <div className="flex flex-wrap gap-2">
              {cls.weeklySlots.map((slot, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs shadow-sm"
                >
                  <span className="font-semibold text-gray-700">{DAY_LABEL[slot.dayOfWeek] ?? slot.dayOfWeek}</span>
                  <span className="text-gray-500">{slot.startTime}–{slot.endTime}</span>
                  <span className="text-gray-300">·</span>
                  <span className={slot.room ? "text-blue-600 font-medium" : "text-gray-400"}>
                    {slot.room ? slot.room.name : cls.mode === "ONLINE" ? "Online" : "Chưa gán phòng"}
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0">

        {/* Left — Sessions */}
        <div className="flex-1 flex flex-col min-h-0 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between shrink-0">
            <h2 className="font-semibold text-gray-800">Lịch buổi học</h2>
            <Link
              href={`/staff/classes/${id}/sessions/new`}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white rounded-lg transition-colors hover:opacity-90"
              style={{ background: "var(--primary)" }}
            >
              <FaIcon icon={faPlus} className="text-xs" /> Thêm buổi
            </Link>
          </div>

          <div className="flex-1 overflow-auto">
            {cls.sessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-2 py-12 text-gray-400">
                <FaIcon icon={faCalendarCheck} className="text-3xl" />
                <p className="text-sm">Chưa có buổi học nào</p>
                <Link href={`/staff/classes/${id}/sessions/new`} className="text-xs hover:underline" style={{ color: "var(--primary)" }}>
                  Lên lịch buổi đầu tiên
                </Link>
              </div>
            ) : (
              <SessionOccurrenceTable
                classId={id}
                sessions={cls.sessions.map((s) => ({
                  id: s.id,
                  sessionNumber: s.sessionNumber,
                  date: s.date.toISOString().slice(0, 10),
                  startTime: s.startTime,
                  endTime: s.endTime,
                  roomName: s.room?.name ?? null,
                  teacherName: s.teacher.name,
                  status: s.status,
                  note: s.note,
                }))}
              />
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
            <div className="border-t border-gray-100">
              <AddTeachersButton classId={id} teachers={availableTeachers} />
            </div>
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
            <div className="border-t border-gray-100 shrink-0">
              <AddStudentsButton classId={id} students={availableStudents} suggestedIds={suggestedIds} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
