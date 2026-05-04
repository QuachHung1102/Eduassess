import Link from "next/link";
import { getTeacherStats } from "@/lib/teacher/queries";
import { auth } from "@/auth";
import { FaIcon } from "@/components/ui/FaIcon";
import { StatCard } from "@/components/ui/StatCard";
import { faDatabase, faFilePen, faUsers, faHourglass, faPlus, faRobot } from "@fortawesome/free-solid-svg-icons";
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
        <h1 className="text-2xl font-bold text-gray-900">Xin chào, {name}!</h1>
        <p className="text-gray-500 text-sm mt-1">Đây là tổng quan hoạt động của bạn</p>
      </div>

      {/* Stats */}
      <div className="shrink-0 grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <StatCard key={s.label} icon={s.icon} value={s.value} label={s.label} href={s.href} />
        ))}
      </div>

      {/* Quick actions */}
      <div className="flex-1 bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Thao tác nhanh</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
          { href: "/teacher/question-bank/create", label: "Thêm câu hỏi mới", icon: faPlus },
            { href: "/teacher/question-bank/ai-suggest", label: "AI gợi ý câu hỏi", icon: faRobot },
            { href: "/teacher/exams/create", label: "Tạo đề kiểm tra", icon: faFilePen },
          ].map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="flex items-center gap-3 border border-gray-200 rounded-lg px-4 py-3 text-sm hover:bg-gray-50 transition-colors"
            >
              <span><FaIcon icon={a.icon} /></span>
              <span className="font-medium text-gray-700">{a.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
