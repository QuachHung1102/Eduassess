import Link from "next/link";
import { getAdminStats, getAdminActionStats } from "@/lib/admin/queries";
import { FaIcon } from "@/components/ui/FaIcon";
import { StatCard } from "@/components/ui/StatCard";
import {
  faChalkboardUser,
  faUserGraduate,
  faSchool,
  faDatabase,
  faFilePen,
  faBookOpen,
  faUsers,
  faUserShield,
  faDoorOpen,
  faLayerGroup,
  faCircleQuestion,
  faUserCheck,
} from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";

export default async function AdminDashboard() {
  const [stats, action] = await Promise.all([getAdminStats(), getAdminActionStats()]);

  const statCards: { label: string; value: number; icon: IconDefinition; href: string; color: string }[] = [
    { label: "Giáo viên", value: stats.teacherCount, icon: faChalkboardUser, href: "/admin/users?role=TEACHER", color: "text-purple-600" },
    { label: "Học sinh", value: stats.studentCount, icon: faUserGraduate, href: "/admin/users?role=STUDENT", color: "text-blue-600" },
    { label: "Lớp học", value: stats.classCount, icon: faSchool, href: "/admin/classes", color: "text-emerald-600" },
    { label: "Câu hỏi", value: stats.questionCount, icon: faDatabase, href: "/admin/questions", color: "text-amber-600" },
    { label: "Đề kiểm tra", value: stats.examCount, icon: faFilePen, href: "/admin/exams", color: "text-red-600" },
    { label: "Chủ đề", value: stats.topicCount, icon: faBookOpen, href: "/admin/subjects", color: "text-indigo-600" },
  ];

  const quickLinks: { href: string; label: string; desc: string; icon: IconDefinition }[] = [
    { href: "/admin/users",            label: "Quản lý tài khoản",   desc: "Thêm, sửa, xóa GV/HS",        icon: faUsers },
    { href: "/admin/classes",          label: "Quản lý lớp học",   desc: "Xếp lớp, phân công GV",       icon: faSchool },
    { href: "/admin/rooms",            label: "Phòng học",           desc: "Quản lý danh sách phòng",    icon: faDoorOpen },
    { href: "/admin/subjects",         label: "Môn học & Chủ đề",  desc: "Quản lý môn + chủ đề",       icon: faBookOpen },
    { href: "/admin/questions",        label: "Ngân hàng câu hỏi", desc: "Duyệt và quản lý câu hỏi",    icon: faDatabase },
    { href: "/admin/exams",            label: "Đề kiểm tra",         desc: "Xem và quản lý đề thi",       icon: faFilePen },
    { href: "/admin/flashcards",       label: "Flashcard",           desc: "Quản lý bộ thẻ từ",         icon: faLayerGroup },
    { href: "/admin/courses",          label: "Khóa học online",     desc: "Quản lý khóa học",          icon: faBookOpen },
    { href: "/admin/role-permissions", label: "Phân quyền GV",       desc: "Xem tổng quan phân công",    icon: faUserShield },
  ];

  return (
    <div className="flex flex-col h-full gap-6">
      <div className="shrink-0">
        <h1 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>Tổng quan hệ thống</h1>
        <p className="text-sm mt-1" style={{ color: "color-mix(in srgb, var(--foreground) 60%, transparent)" }}>Quản lý toàn bộ người dùng và phân quyền</p>
      </div>

      <div className="flex-1 space-y-6 overflow-auto pb-4">
        {/* Cần xử lý / sức khỏe hệ thống (C4) */}
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: "color-mix(in srgb, var(--foreground) 55%, transparent)" }}>Cần xử lý</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard icon={faCircleQuestion} value={action.pendingQuestions} label="Câu hỏi chờ duyệt" href="/admin/questions" />
            <StatCard icon={faBookOpen} value={action.pendingCourses} label="Khóa học chờ duyệt" href="/admin/courses" />
            <StatCard icon={faDoorOpen} value={action.pendingBookings} label="Đặt phòng chờ duyệt" />
            <StatCard icon={faUserCheck} value={action.attendanceRatePct !== null ? `${action.attendanceRatePct}%` : "—"} label="Tỉ lệ điểm danh" />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {statCards.map((s) => (
            <StatCard
              key={s.label}
              icon={s.icon}
              value={s.value}
              label={s.label}
              href={s.href}
              color={s.color}
            />
          ))}
        </div>

        {/* Quick links */}
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: "color-mix(in srgb, var(--foreground) 55%, transparent)" }}>Truy cập nhanh</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {quickLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="primary-panel hover-card-soft focus-ring-soft press-feedback-soft p-4 flex items-start gap-3 group"
              >
                <span className="text-2xl shrink-0" style={{ color: "var(--primary)" }}><FaIcon icon={l.icon} /></span>
                <div>
                  <p className="font-semibold text-sm transition-colors" style={{ color: "var(--foreground)" }}>{l.label}</p>
                  <p className="text-xs mt-0.5" style={{ color: "color-mix(in srgb, var(--foreground) 50%, transparent)" }}>{l.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
