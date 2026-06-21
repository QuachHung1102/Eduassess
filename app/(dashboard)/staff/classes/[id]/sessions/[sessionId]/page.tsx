import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { can } from "@/lib/auth/permissions";
import { getSessionWithAttendance } from "@/lib/classes/queries";
import {
  getSessionPhase,
  canTakeAttendance,
  attendanceGateMessage,
  SESSION_PHASE_LABEL,
  SESSION_PHASE_COLOR,
} from "@/lib/classes/session-status";
import { AttendanceForm } from "@/components/classes/AttendanceForm";
import { SessionEvaluationForm } from "@/components/classes/SessionEvaluationForm";
import type { AttendanceStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const MODE_LABEL: Record<string, string> = { ONLINE: "Online", OFFLINE: "Offline", HYBRID: "Hybrid" };

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

  // Pha thời gian dẫn xuất + gate điểm danh (đồng bộ server action).
  const sessionTime = {
    date: session.date,
    startTime: session.startTime,
    endTime: session.endTime,
    status: session.status,
  };
  const now = new Date();
  const phase = getSessionPhase(sessionTime, now);
  const canTake = canTakeAttendance(sessionTime, now);

  const blockedMessage = attendanceGateMessage(phase, session.startTime);

  const sessionUser = (await auth())?.user;
  const canEvaluate = sessionUser ? await can(sessionUser, "class.evaluate_session") : false;
  const evalMap = new Map(session.evaluations.map((e) => [e.studentId, e]));
  const evalRows = students.map((s) => {
    const ev = evalMap.get(s.id);
    return {
      studentId: s.id,
      studentName: s.name,
      email: s.email,
      performance: ev?.performance ?? null,
      diligence: ev?.diligence ?? null,
      comprehension: ev?.comprehension ?? null,
      note: ev?.note ?? "",
    };
  });

  return (
    <div className="flex flex-col gap-4">
      {/* Breadcrumb + header */}
      <div className="shrink-0">
        <Link href={`/staff/classes/${id}`} className="text-sm text-primary hover:underline">
          ← {session.class.name ?? "Lớp học"}
        </Link>

        <div className="flex items-start justify-between mt-2 gap-3">
          <div>
            <h1 className="text-xl font-bold text-foreground">
              Buổi #{session.sessionNumber} —{" "}
              {new Date(session.date).toLocaleDateString("vi-VN", {
                weekday: "long",
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              })}
            </h1>
            <p className="text-foreground/60 text-sm mt-0.5">
              {session.startTime} – {session.endTime} ·{" "}
              {MODE_LABEL[session.mode as string]} ·{" "}
              {session.room?.name ?? "Không có phòng"} ·{" "}
              GV: {session.teacher.name}
            </p>
          </div>
          <span className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-medium ${SESSION_PHASE_COLOR[phase]}`}>
            {SESSION_PHASE_LABEL[phase]}
          </span>
        </div>
      </div>

      {/* Attendance content */}
      {students.length === 0 ? (
        <div className="clay-card p-12 text-center text-foreground/45">
          <p>Lớp chưa có học sinh nào đang học.</p>
        </div>
      ) : canTake ? (
        <AttendanceForm sessionId={sessionId} students={rows} redirectPath={`/staff/classes/${id}`} />
      ) : (
        /* Read-only view for non-actionable sessions */
        <div className="clay-card overflow-hidden p-0">
          <div className="px-4 py-3 bg-surface-tint border-b border-soft">
            <p className="text-sm text-foreground/70">{blockedMessage}</p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-soft">
                <th className="text-left px-4 py-2.5 text-xs font-medium text-foreground/60 uppercase">Học sinh</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-foreground/60 uppercase">Trạng thái</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-foreground/60 uppercase">Ghi chú</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-soft">
              {rows.map((r) => (
                <tr key={r.studentId}>
                  <td className="px-4 py-3 text-foreground">{r.studentName ?? r.email}</td>
                  <td className="px-4 py-3 text-foreground/60">{r.status}</td>
                  <td className="px-4 py-3 text-foreground/45 text-xs">{r.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Đánh giá sau buổi học */}
      {canTake && canEvaluate && students.length > 0 && (
        <div className="mt-2">
          <h2 className="font-semibold text-foreground mb-3">Đánh giá sau buổi học</h2>
          <SessionEvaluationForm sessionId={sessionId} students={evalRows} />
        </div>
      )}
    </div>
  );
}
