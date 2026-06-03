import Link from "next/link";
import { auth } from "@/auth";
import { getStudentStats } from "@/lib/student/queries";
import { FaIcon } from "@/components/ui/FaIcon";
import { StatCard } from "@/components/ui/StatCard";
import { faFilePen, faCircleCheck, faLayerGroup, faStar, faRobot, faBookOpen, faChartLine, faCalendarCheck } from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";

export default async function StudentDashboard() {
  const [session, stats] = await Promise.all([auth(), getStudentStats()]);
  const name = session?.user?.name?.split(" ").pop() ?? "bạn";

  const statCards: { label: string; value: number | string; icon: IconDefinition; href: string; stagger: 1 | 2 | 3 | 4 }[] = [
    { label: "Bài chờ làm",  value: stats.pendingExams,    icon: faFilePen,     href: "/student/exams",     stagger: 1 },
    { label: "Đã hoàn thành", value: stats.completedExams, icon: faCircleCheck, href: "/student/progress",  stagger: 2 },
    { label: "Bộ flashcard", value: stats.flashcardSets,   icon: faLayerGroup,  href: "/student/flashcards", stagger: 3 },
    {
      label: "Điểm TB",
      value: stats.avgScore !== null ? `${stats.avgScore.toFixed(1)}%` : "—",
      icon: faStar,
      href: "/student/progress",
      stagger: 4,
    },
  ];

  return (
      <div className="flex flex-col gap-6">
      <div className="shrink-0 animate-fade-in-up">
        <h1 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>
          Xin chào,{" "}
          <span style={{ color: "var(--primary)" }}>{name}</span>!
        </h1>
        <p className="text-sm mt-1" style={{ color: "color-mix(in srgb, var(--foreground) 60%, transparent)" }}>Đây là trang học tập cá nhân của bạn</p>
      </div>

      <div className="shrink-0 grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <StatCard key={s.label} icon={s.icon} value={s.value} label={s.label} href={s.href} />
        ))}
      </div>

      {/* Quick access */}
      <div className="shrink-0 animate-fade-in-up stagger-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: "color-mix(in srgb, var(--foreground) 55%, transparent)" }}>Truy cập nhanh</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { href: "/student/exams",      label: "Làm bài kiểm tra", desc: "Bài chưa hoàn thành",   icon: faFilePen,        color: "text-rose-500" },
            { href: "/student/flashcards", label: "Học flashcard",    desc: "Bộ thẻ ôn tập",         icon: faLayerGroup,     color: "text-amber-500" },
            { href: "/student/courses",    label: "Khóa học",        desc: "Tiếp tục khóa học",    icon: faBookOpen,       color: "text-indigo-500" },
            { href: "/student/progress",   label: "Tiến trình",       desc: "Xem điểm & thống kê",  icon: faChartLine,      color: "text-emerald-500" },
            { href: "/student/schedule",   label: "Lịch rảnh",        desc: "Khai báo thời gian học", icon: faCalendarCheck, color: "text-teal-500" },
          ].map((q) => (
            <Link
              key={q.href}
              href={q.href}
              className="clay-card hover-card-soft focus-ring-soft press-feedback-soft flex flex-col gap-2 p-4"
            >
              <div className={`text-xl ${q.color}`}><FaIcon icon={q.icon} /></div>
              <div>
                <div className="font-semibold text-sm" style={{ color: "var(--foreground)" }}>{q.label}</div>
                <div className="text-xs mt-0.5" style={{ color: "color-mix(in srgb, var(--foreground) 50%, transparent)" }}>{q.desc}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* AI suggestion */}
      <div className="primary-panel rounded-xl p-5 animate-fade-in-up stagger-5">
        <div className="flex items-start gap-3">
          <span className="text-2xl" style={{ color: "var(--primary)" }}>
            <FaIcon icon={faRobot} />
          </span>
          <div>
            <h3 className="font-semibold text-sm" style={{ color: "var(--primary-dark)" }}>
              Gợi ý từ AI
            </h3>
            <p className="text-sm mt-1" style={{ color: "color-mix(in srgb, var(--foreground) 70%, transparent)" }}>
              Hoàn thành ít nhất một bài kiểm tra để AI phân tích điểm mạnh/yếu và gợi ý nội dung ôn tập phù hợp.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
