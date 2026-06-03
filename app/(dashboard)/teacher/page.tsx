import Link from "next/link";
import { getTeacherStats } from "@/lib/teacher/queries";
import { auth } from "@/auth";
import { FaIcon } from "@/components/ui/FaIcon";
import { StatCard } from "@/components/ui/StatCard";
import { faDatabase, faFilePen, faUsers, faHourglass, faPlus, faRobot, faSchool, faLayerGroup, faCalendarCheck, faBookOpen } from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";

export default async function TeacherDashboard() {
  const [session, stats] = await Promise.all([auth(), getTeacherStats()]);

  const statCards: { label: string; value: number; icon: IconDefinition; href: string }[] = [
    { label: "Câu hỏi trong ngân hàng", value: stats.questionCount, icon: faDatabase, href: "/teacher/question-bank" },
    { label: "Đề kiểm tra đã tạo", value: stats.examCount, icon: faFilePen, href: "/teacher/exams" },
    { label: "Học sinh đang quản lý", value: stats.studentCount, icon: faUsers, href: "/teacher/classes" },
    { label: "Câu hỏi chờ duyệt", value: stats.pendingCount, icon: faHourglass, href: "/teacher/question-bank?status=PENDING" },
  ];

  const name = session?.user?.name?.split(" ").pop() ?? "Giáo viên";

  return (
    <div className="flex flex-col h-full gap-6">
      <div className="shrink-0">
        <h1 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>Xin chào, {name}!</h1>
        <p className="text-sm mt-1" style={{ color: "color-mix(in srgb, var(--foreground) 60%, transparent)" }}>Đây là tổng quan hoạt động của bạn</p>
      </div>

      {/* Stats */}
      <div className="shrink-0 grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <StatCard key={s.label} icon={s.icon} value={s.value} label={s.label} href={s.href} />
        ))}
      </div>

      {/* Quick actions */}
      <div className="primary-panel flex-1 p-5">
        <h2 className="font-semibold mb-4 text-sm uppercase tracking-wide" style={{ color: "color-mix(in srgb, var(--foreground) 55%, transparent)" }}>Thao tác nhanh</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {[
            { href: "/teacher/question-bank/create",  label: "Thêm câu hỏi",      icon: faPlus,          desc: "Tạo câu hỏi mới" },
            { href: "/teacher/exams/create",           label: "Tạo đề kiểm tra",   icon: faFilePen,       desc: "Soạn đề mới" },
            { href: "/teacher/question-bank/ai-suggest", label: "AI gợi ý câu hỏi", icon: faRobot,       desc: "Gợi ý tự động" },
            { href: "/teacher/classes",                label: "Lớp học",           icon: faSchool,        desc: "Quản lý lớp" },
            { href: "/teacher/question-bank",          label: "Ngân hàng câu hỏi", icon: faDatabase,      desc: "Xem toàn bộ" },
            { href: "/teacher/exams",                  label: "Đề kiểm tra",       icon: faFilePen,       desc: "Danh sách đề" },
            { href: "/teacher/flashcards",             label: "Flashcard",         icon: faLayerGroup,    desc: "Bộ thẻ từ" },
            { href: "/teacher/courses",                label: "Khóa học online",   icon: faBookOpen,      desc: "Tạo & quản lý" },
            { href: "/booking",                        label: "Đặt phòng",         icon: faCalendarCheck, desc: "Yêu cầu đặt phòng" },
          ].map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="hover-card-soft focus-ring-soft press-feedback-soft flex flex-col gap-1 rounded-xl border p-3"
              style={{ borderColor: "var(--border-soft)", background: "var(--surface-strong)" }}
            >
              <span className="text-lg" style={{ color: "var(--primary)" }}><FaIcon icon={a.icon} /></span>
              <span className="font-semibold text-sm" style={{ color: "var(--foreground)" }}>{a.label}</span>
              <span className="text-xs" style={{ color: "color-mix(in srgb, var(--foreground) 50%, transparent)" }}>{a.desc}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
