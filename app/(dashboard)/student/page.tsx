import { auth } from "@/auth";
import { getStudentStats } from "@/lib/student/queries";
import { FaIcon } from "@/components/ui/FaIcon";
import { StatCard } from "@/components/ui/StatCard";
import { faFilePen, faCircleCheck, faLayerGroup, faStar, faRobot } from "@fortawesome/free-solid-svg-icons";
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
        <h1 className="text-2xl font-bold text-gray-900">
          Xin chào,{" "}
          <span style={{ color: "var(--primary)" }}>{name}</span>!
        </h1>
        <p className="text-gray-500 text-sm mt-1">Đây là trang học tập cá nhân của bạn</p>
      </div>

      <div className="shrink-0 grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <StatCard key={s.label} icon={s.icon} value={s.value} label={s.label} href={s.href} stagger={s.stagger} />
        ))}
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
