import { getMyClassSessions } from "@/lib/student/queries";
import { requirePageSession } from "@/lib/auth/page-guard";
import { FaIcon } from "@/components/ui/FaIcon";
import { faSchool, faLocationDot, faChalkboardUser, faClock } from "@fortawesome/free-solid-svg-icons";
import type { SessionStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const STATUS_META: Record<SessionStatus, { label: string; cls: string }> = {
  SCHEDULED: { label: "Sắp học", cls: "bg-blue-100 text-blue-700" },
  COMPLETED: { label: "Đã học", cls: "bg-green-100 text-green-700" },
  CANCELLED: { label: "Nghỉ", cls: "bg-red-100 text-red-700" },
  POSTPONED: { label: "Hoãn", cls: "bg-amber-100 text-amber-700" },
};

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function dateLabel(d: Date): string {
  return new Date(`${ymd(d)}T00:00:00`).toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
  });
}

export default async function StudentClassesPage() {
  await requirePageSession();
  const sessions = await getMyClassSessions();

  const today = ymd(new Date());
  // Sắp tới = chưa qua ngày & chưa hủy; còn lại xuống "Đã qua".
  const upcoming = sessions.filter((s) => ymd(s.date) >= today && s.status !== "CANCELLED");
  const past = sessions
    .filter((s) => !(ymd(s.date) >= today && s.status !== "CANCELLED"))
    .reverse(); // gần nhất lên đầu

  return (
    <div className="flex flex-col gap-6">
      <div className="shrink-0">
        <div className="mb-1 flex items-center gap-2">
          <span className="text-xl shrink-0" style={{ color: "var(--primary)" }}>
            <FaIcon icon={faSchool} />
          </span>
          <h1 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>
            Lịch học của tôi
          </h1>
        </div>
        <p className="text-sm" style={{ color: "color-mix(in srgb, var(--foreground) 60%, transparent)" }}>
          Các buổi học của lớp bạn đang theo — ngày, giờ, phòng và giáo viên.
        </p>
      </div>

      {sessions.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center gap-3 rounded-xl py-16"
          style={{ color: "color-mix(in srgb, var(--foreground) 50%, transparent)", border: "1px solid var(--border-soft)" }}
        >
          <FaIcon icon={faSchool} className="text-4xl" />
          <p className="text-sm">Bạn chưa được xếp vào lớp nào.</p>
        </div>
      ) : (
        <>
          <SessionGroup title="Sắp tới" emptyText="Không có buổi học sắp tới." sessions={upcoming} />
          {past.length > 0 && <SessionGroup title="Đã qua" sessions={past} muted />}
        </>
      )}
    </div>
  );
}

type SessionRow = Awaited<ReturnType<typeof getMyClassSessions>>[number];

function SessionGroup({
  title,
  sessions,
  emptyText,
  muted,
}: {
  title: string;
  sessions: SessionRow[];
  emptyText?: string;
  muted?: boolean;
}) {
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: "color-mix(in srgb, var(--foreground) 55%, transparent)" }}>
        {title} ({sessions.length})
      </h2>
      {sessions.length === 0 ? (
        <p className="text-sm" style={{ color: "color-mix(in srgb, var(--foreground) 45%, transparent)" }}>
          {emptyText}
        </p>
      ) : (
        <div className="flex flex-col gap-2" style={{ opacity: muted ? 0.75 : 1 }}>
          {sessions.map((s) => {
            const status = STATUS_META[s.status as SessionStatus];
            return (
              <div
                key={s.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-xl px-4 py-3"
                style={{ background: "var(--surface)", border: "1px solid var(--border-soft)" }}
              >
                <div className="min-w-40 flex-1">
                  <p className="text-sm font-semibold capitalize" style={{ color: "var(--foreground)" }}>
                    {dateLabel(s.date)}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs" style={{ color: "color-mix(in srgb, var(--foreground) 55%, transparent)" }}>
                    <FaIcon icon={faClock} /> Buổi {s.sessionNumber} · {s.startTime}–{s.endTime}
                  </p>
                </div>

                <div className="min-w-40 flex-1">
                  <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                    {s.class.name}
                  </p>
                  <p className="text-xs" style={{ color: "color-mix(in srgb, var(--foreground) 55%, transparent)" }}>
                    {s.class.subject.name}
                  </p>
                </div>

                <div className="flex flex-col gap-0.5 text-xs" style={{ color: "color-mix(in srgb, var(--foreground) 65%, transparent)" }}>
                  <span className="flex items-center gap-1.5">
                    <FaIcon icon={faLocationDot} />
                    {s.room ? s.room.name : s.mode === "ONLINE" ? "Online" : "Chưa có phòng"}
                  </span>
                  {s.teacher.name && (
                    <span className="flex items-center gap-1.5">
                      <FaIcon icon={faChalkboardUser} />
                      {s.teacher.name}
                    </span>
                  )}
                </div>

                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${status.cls}`}>
                  {status.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
