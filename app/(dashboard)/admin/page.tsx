import Link from "next/link";
import { getAdminStats } from "@/lib/admin/queries";
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
} from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";

export default async function AdminDashboard() {
  const stats = await getAdminStats();

  const statCards: { label: string; value: number; icon: IconDefinition; href: string; color: string }[] = [
    { label: "Giáo viên", value: stats.teacherCount, icon: faChalkboardUser, href: "/admin/users?role=TEACHER", color: "text-purple-600" },
    { label: "Học sinh", value: stats.studentCount, icon: faUserGraduate, href: "/admin/users?role=STUDENT", color: "text-blue-600" },
    { label: "Lớp học", value: stats.classCount, icon: faSchool, href: "/admin/classes", color: "text-emerald-600" },
    { label: "Câu hỏi", value: stats.questionCount, icon: faDatabase, href: "/admin/questions", color: "text-amber-600" },
    { label: "Đề kiểm tra", value: stats.examCount, icon: faFilePen, href: "/admin/exams", color: "text-red-600" },
    { label: "Chủ đề", value: stats.topicCount, icon: faBookOpen, href: "/admin/subjects", color: "text-indigo-600" },
  ];

  const quickLinks: { href: string; label: string; desc: string; icon: IconDefinition }[] = [
    { href: "/admin/users", label: "Quản lý tài khoản", desc: "Thêm, sửa, xóa GV/HS", icon: faUsers },
    { href: "/admin/classes", label: "Quản lý lớp học", desc: "Xếp lớp, phân công GV", icon: faSchool },
    { href: "/admin/permissions", label: "Phân quyền GV", desc: "Xem tổng quan phân công", icon: faUserShield },
    { href: "/admin/subjects", label: "Môn học & Chủ đề", desc: "Quản lý môn + chủ đề", icon: faBookOpen },
    { href: "/admin/questions", label: "Ngân hàng câu hỏi", desc: "Duyệt và quản lý câu hỏi", icon: faDatabase },
  ];

  return (
    <div className="flex flex-col h-full gap-6">
      <div className="shrink-0">
        <h1 className="text-2xl font-bold text-gray-900">Tổng quan hệ thống</h1>
        <p className="text-gray-500 text-sm mt-1">Quản lý toàn bộ người dùng và phân quyền</p>
      </div>

      <div className="flex-1 space-y-6 overflow-auto pb-4">
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
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Truy cập nhanh</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {quickLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-200 hover:bg-blue-50/30 transition-all flex items-start gap-3 group"
              >
                <span className="text-2xl shrink-0"><FaIcon icon={l.icon} /></span>
                <div>
                  <p className="font-semibold text-gray-900 text-sm group-hover:text-blue-700 transition-colors">{l.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{l.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
