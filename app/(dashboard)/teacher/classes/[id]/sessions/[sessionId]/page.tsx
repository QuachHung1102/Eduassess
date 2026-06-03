import Link from "next/link";
import { notFound } from "next/navigation";
import { getTeacherSessionDetail } from "@/lib/teacher/queries";
import { TeacherAttendanceForm } from "./TeacherAttendanceForm";
import { FaIcon } from "@/components/ui/FaIcon";
import {
  faCalendarAlt,
  faClipboardList,
  faCircleCheck,
  faCircleXmark,
  faClock,
  faHourglassHalf,
  faLocationDot,
  faChalkboardUser,
} from "@fortawesome/free-solid-svg-icons";
import type { AttendanceStatus } from "@/lib/types";

const SESSION_STATUS_CONFIG = {
  SCHEDULED: { label: "Sắp diễn ra", color: "bg-blue-100 text-blue-700",    icon: faHourglassHalf },
  COMPLETED: { label: "Đã xong",     color: "bg-green-100 text-green-700",  icon: faCircleCheck   },
  CANCELLED: { label: "Đã hủy",      color: "bg-red-100 text-red-700",      icon: faCircleXmark   },
  POSTPONED: { label: "Tạm hoãn",    color: "bg-yellow-100 text-yellow-700", icon: faClock         },
} as const;

const MODE_LABEL: Record<string, string> = {
  ONLINE: "Online", OFFLINE: "Offline", HYBRID: "Hybrid",
};

function formatDate(d: Date) {
  return new Date(d).toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default async function TeacherSessionDetailPage({
  params,
}: {
  params: Promise<{ id: string; sessionId: string }>;
}) {
  const { id, sessionId } = await params;
  const data = await getTeacherSessionDetail(id, sessionId);
  if (!data) notFound();

  const { session: s, enrollments } = data;
  const statusConfig = SESSION_STATUS_CONFIG[s.status as keyof typeof SESSION_STATUS_CONFIG] ??
    SESSION_STATUS_CONFIG.SCHEDULED;

  const canAttend = s.status === "SCHEDULED" || s.status === "COMPLETED";

  // Build initial attendance rows
  const attendanceMap = new Map(
    s.attendances.map((a) => [a.studentId, { status: a.status as AttendanceStatus, note: a.note ?? "" }])
  );

  const studentRows = enrollments.map((e) => {
    const existing = attendanceMap.get(e.student.id);
    return {
      studentId: e.student.id,
      studentName: e.student.name,
      email: e.student.email ?? "",
      status: existing?.status ?? ("ABSENT" as AttendanceStatus),
      note: existing?.note ?? "",
    };
  });

  const presentCount = s.attendances.filter(
    (a) => a.status === "PRESENT" || a.status === "LATE"
  ).length;

  return (
    <div className="flex flex-col gap-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm flex-wrap">
        <Link href="/teacher/classes" className="hover:underline" style={{ color: "var(--primary)" }}>
          Lớp học
        </Link>
        <span style={{ color: "color-mix(in srgb, var(--foreground) 35%, transparent)" }}>›</span>
        <Link href={`/teacher/classes/${id}`} className="hover:underline" style={{ color: "var(--primary)" }}>
          {s.class.name}
        </Link>
        <span style={{ color: "color-mix(in srgb, var(--foreground) 35%, transparent)" }}>›</span>
        <Link href={`/teacher/classes/${id}/sessions`} className="hover:underline" style={{ color: "var(--primary)" }}>
          Buổi học
        </Link>
        <span style={{ color: "color-mix(in srgb, var(--foreground) 35%, transparent)" }}>›</span>
        <span style={{ color: "var(--foreground)" }}>Buổi #{s.sessionNumber}</span>
      </div>

      {/* Session info */}
      <div className="primary-panel p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span style={{ color: "var(--primary)" }}><FaIcon icon={faCalendarAlt} /></span>
              <h1 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>
                Buổi #{s.sessionNumber} – {s.class.name}
              </h1>
            </div>
            <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${statusConfig.color}`}>
              <FaIcon icon={statusConfig.icon} />
              {statusConfig.label}
            </span>
          </div>
          {s.status === "COMPLETED" && (
            <div className="text-right text-sm" style={{ color: "color-mix(in srgb, var(--foreground) 60%, transparent)" }}>
              <span className="font-medium text-green-700">{presentCount}</span>/{enrollments.length} có mặt
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div className="flex items-start gap-2">
            <span className="mt-0.5" style={{ color: "var(--primary)" }}><FaIcon icon={faCalendarAlt} /></span>
            <div>
              <p className="text-xs mb-0.5" style={{ color: "color-mix(in srgb, var(--foreground) 50%, transparent)" }}>Ngày học</p>
              <p className="font-medium" style={{ color: "var(--foreground)" }}>{formatDate(s.date)}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="mt-0.5" style={{ color: "var(--primary)" }}><FaIcon icon={faClock} /></span>
            <div>
              <p className="text-xs mb-0.5" style={{ color: "color-mix(in srgb, var(--foreground) 50%, transparent)" }}>Thời gian</p>
              <p className="font-medium" style={{ color: "var(--foreground)" }}>{s.startTime} – {s.endTime}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="mt-0.5" style={{ color: "var(--primary)" }}><FaIcon icon={faLocationDot} /></span>
            <div>
              <p className="text-xs mb-0.5" style={{ color: "color-mix(in srgb, var(--foreground) 50%, transparent)" }}>Địa điểm</p>
              <p className="font-medium" style={{ color: "var(--foreground)" }}>
                {MODE_LABEL[s.mode] ?? s.mode}{s.room ? ` · ${s.room.name}` : ""}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="mt-0.5" style={{ color: "var(--primary)" }}><FaIcon icon={faChalkboardUser} /></span>
            <div>
              <p className="text-xs mb-0.5" style={{ color: "color-mix(in srgb, var(--foreground) 50%, transparent)" }}>Giáo viên</p>
              <p className="font-medium" style={{ color: "var(--foreground)" }}>{s.teacher.name ?? "—"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Attendance section */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span style={{ color: "var(--primary)" }}><FaIcon icon={faClipboardList} /></span>
          <h2 className="font-semibold" style={{ color: "var(--foreground)" }}>Điểm danh</h2>
        </div>

        {!canAttend ? (
          <div
            className="primary-panel flex items-center justify-center py-12 text-sm text-center"
            style={{ color: "color-mix(in srgb, var(--foreground) 45%, transparent)" }}
          >
            Buổi học đã bị hủy hoặc tạm hoãn — không thể điểm danh.
          </div>
        ) : enrollments.length === 0 ? (
          <div
            className="primary-panel flex items-center justify-center py-12 text-sm"
            style={{ color: "color-mix(in srgb, var(--foreground) 45%, transparent)" }}
          >
            Lớp chưa có học sinh nào.
          </div>
        ) : (
          <TeacherAttendanceForm
            sessionId={sessionId}
            students={studentRows}
            redirectPath={`/teacher/classes/${id}/sessions`}
          />
        )}
      </div>
    </div>
  );
}
