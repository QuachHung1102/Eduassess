import Link from "next/link";
import { notFound } from "next/navigation";
import { getSessionWithAttendance } from "@/lib/classes/queries";
import { AttendanceForm } from "./AttendanceForm";
import type { AttendanceStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const MODE_LABEL: Record<string, string> = { ONLINE: "Online", OFFLINE: "Offline", HYBRID: "Hybrid" };
const SESSION_STATUS_LABEL: Record<string, string> = {
  SCHEDULED: "Đã lên lịch", COMPLETED: "Hoàn thành",
  CANCELLED: "Đã hủy", POSTPONED: "Tạm hoãn",
};

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string; sessionId: string }>;
}) {
  const { id, sessionId } = await params;
  const session = await getSessionWithAttendance(sessionId);
  if (!session) notFound();

  const students = session.class.enrollments.map((e) => e.student);
  const attendanceMap = new Map(session.attendances.map((a) => [a.studentId, a]));

  const rows = students.map((s) => {
    const existing = attendanceMap.get(s.id);
    return {
      studentId: s.id,
      studentName: s.name,
      email: s.email,
      status: (existing?.status ?? "PRESENT") as AttendanceStatus,
      note: existing?.note ?? "",
    };
  });

  const canTakeAttendance = session.status === "SCHEDULED" || session.status === "COMPLETED";

  return (
    <div className="flex flex-col gap-4">
      {/* Breadcrumb + header */}
      <div className="shrink-0">
        <Link href={`/staff/classes/${id}`} className="text-sm text-blue-600 hover:underline">
          ← {session.class.name ?? "Lớp học"}
        </Link>

        <div className="flex items-start justify-between mt-2 gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              Buổi #{session.sessionNumber} —{" "}
              {new Date(session.date).toLocaleDateString("vi-VN", {
                weekday: "long",
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              })}
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">
              {session.startTime} – {session.endTime} ·{" "}
              {MODE_LABEL[session.mode as string]} ·{" "}
              {session.room?.name ?? "Không có phòng"} ·{" "}
              GV: {session.teacher.name}
            </p>
          </div>
          <span className="shrink-0 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
            {SESSION_STATUS_LABEL[session.status] ?? session.status}
          </span>
        </div>
      </div>

      {/* Attendance content */}
      {students.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center text-gray-400">
          <p>Lớp chưa có học sinh nào đang học.</p>
        </div>
      ) : canTakeAttendance ? (
        <AttendanceForm
          sessionId={sessionId}
          classId={id}
          students={rows}
        />
      ) : (
        /* Read-only view for non-actionable sessions */
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
            <p className="text-sm text-gray-600">Buổi học này không thể điểm danh.</p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-50">
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase">Học sinh</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase">Ghi chú</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map((r) => (
                <tr key={r.studentId}>
                  <td className="px-4 py-3 text-gray-800">{r.studentName ?? r.email}</td>
                  <td className="px-4 py-3 text-gray-500">{r.status}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{r.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
