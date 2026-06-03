import Link from "next/link";
import { notFound } from "next/navigation";
import { getTeacherClassSessions, getTeacherClassDetail } from "@/lib/teacher/queries";
import { FaIcon } from "@/components/ui/FaIcon";
import {
  faCalendarAlt,
  faCircleCheck,
  faCircleXmark,
  faClock,
  faHourglassHalf,
  faClipboardList,
} from "@fortawesome/free-solid-svg-icons";

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
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default async function TeacherClassSessionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [cls, sessions] = await Promise.all([
    getTeacherClassDetail(id),
    getTeacherClassSessions(id),
  ]);

  if (!cls || !sessions) notFound();

  return (
    <div className="flex flex-col gap-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm flex-wrap">
        <Link href="/teacher/classes" className="hover:underline" style={{ color: "var(--primary)" }}>
          Lớp học
        </Link>
        <span style={{ color: "color-mix(in srgb, var(--foreground) 35%, transparent)" }}>›</span>
        <Link href={`/teacher/classes/${id}`} className="hover:underline" style={{ color: "var(--primary)" }}>
          {cls.name}
        </Link>
        <span style={{ color: "color-mix(in srgb, var(--foreground) 35%, transparent)" }}>›</span>
        <span style={{ color: "var(--foreground)" }}>Buổi học</span>
      </div>

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-0.5">
          <span style={{ color: "var(--primary)" }}><FaIcon icon={faCalendarAlt} /></span>
          <h1 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>
            Lịch buổi học
          </h1>
        </div>
        <p className="text-sm" style={{ color: "color-mix(in srgb, var(--foreground) 60%, transparent)" }}>
          Lớp {cls.name} · {cls.subject.name}
        </p>
      </div>

      {/* Sessions */}
      {sessions.length === 0 ? (
        <div
          className="primary-panel flex flex-col items-center justify-center py-20 text-center"
          style={{ color: "color-mix(in srgb, var(--foreground) 45%, transparent)" }}
        >
          <div className="text-3xl mb-2"><FaIcon icon={faCalendarAlt} /></div>
          <p>Chưa có buổi học nào được lên lịch.</p>
          <p className="text-xs mt-1">Cán bộ đào tạo sẽ tạo lịch cho lớp này.</p>
        </div>
      ) : (
        <div className="primary-panel overflow-hidden">
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="themed-table w-full text-sm">
              <thead>
                <tr>
                  {["Buổi", "Ngày", "Giờ", "Hình thức", "Phòng", "Trạng thái", "Điểm danh"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: "var(--border-soft)" }}>
                {sessions.map((s) => {
                  const st = SESSION_STATUS_CONFIG[s.status as keyof typeof SESSION_STATUS_CONFIG] ??
                    SESSION_STATUS_CONFIG.SCHEDULED;
                  const attendedCount = s._count.attendances;
                  const totalStudents = cls.enrollments.length;
                  const canAttend = s.status === "SCHEDULED" || s.status === "COMPLETED";
                  return (
                    <tr key={s.id}>
                      <td className="px-4 py-3 font-medium" style={{ color: "var(--foreground)" }}>
                        #{s.sessionNumber}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap" style={{ color: "color-mix(in srgb, var(--foreground) 75%, transparent)" }}>
                        {formatDate(s.date)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs" style={{ color: "color-mix(in srgb, var(--foreground) 65%, transparent)" }}>
                        {s.startTime} – {s.endTime}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {MODE_LABEL[s.mode] ?? s.mode}
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: "color-mix(in srgb, var(--foreground) 60%, transparent)" }}>
                        {s.room?.name ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${st.color}`}>
                          <FaIcon icon={st.icon} />
                          {st.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {canAttend ? (
                          <Link
                            href={`/teacher/classes/${id}/sessions/${s.id}`}
                            className="inline-flex items-center gap-1.5 text-xs font-medium hover:underline"
                            style={{ color: "var(--primary)" }}
                          >
                            <FaIcon icon={faClipboardList} />
                            {attendedCount}/{totalStudents}
                          </Link>
                        ) : (
                          <span className="text-xs" style={{ color: "color-mix(in srgb, var(--foreground) 35%, transparent)" }}>
                            —
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile card list */}
          <div className="md:hidden divide-y" style={{ borderColor: "var(--border-soft)" }}>
            {sessions.map((s) => {
              const st = SESSION_STATUS_CONFIG[s.status as keyof typeof SESSION_STATUS_CONFIG] ??
                SESSION_STATUS_CONFIG.SCHEDULED;
              const canAttend = s.status === "SCHEDULED" || s.status === "COMPLETED";
              return (
                <div key={s.id} className="px-4 py-3 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm" style={{ color: "var(--foreground)" }}>
                        Buổi #{s.sessionNumber}
                      </span>
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${st.color}`}>
                        <FaIcon icon={st.icon} />
                        {st.label}
                      </span>
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: "color-mix(in srgb, var(--foreground) 55%, transparent)" }}>
                      {formatDate(s.date)} · {s.startTime}–{s.endTime} · {MODE_LABEL[s.mode] ?? s.mode}
                      {s.room ? ` · ${s.room.name}` : ""}
                    </p>
                  </div>
                  {canAttend && (
                    <Link
                      href={`/teacher/classes/${id}/sessions/${s.id}`}
                      className="shrink-0 flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors hover-action-subtle focus-ring-soft"
                      style={{ border: "1px solid var(--border-soft)" }}
                    >
                      <FaIcon icon={faClipboardList} />
                      Điểm danh
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
