import Link from "next/link";
import { auth } from "@/auth";
import { FaIcon } from "@/components/ui/FaIcon";
import {
  faShieldHalved,
  faClipboardList,
  faToolbox,
  faTerminal,
  faUsers,
  faSchool,
} from "@fortawesome/free-solid-svg-icons";

export default async function OwnerDashboard() {
  const session = await auth();
  const name = session?.user?.name ?? "NVCN";

  const cards = [
    { href: "/owner/audit",            label: "Nhật ký kiểm tra",  desc: "Theo dõi mọi hành động nhạy cảm",   icon: faClipboardList, color: "text-amber-600" },
    { href: "/owner/system",           label: "Hệ thống",           desc: "Debug, theo dõi, cấu hình",         icon: faToolbox,       color: "text-indigo-600" },
    { href: "/admin/role-permissions", label: "Ma trận quyền",     desc: "Tinh chỉnh phân quyền hệ thống", icon: faTerminal,      color: "text-blue-600" },
    { href: "/admin",                  label: "Khu Admin",          desc: "Vào dashboard Admin để quản trị",   icon: faShieldHalved,  color: "text-rose-600" },
    { href: "/admin/users",            label: "Tài khoản",          desc: "Quản lý người dùng, phân vai",     icon: faUsers,         color: "text-purple-600" },
    { href: "/admin/classes",          label: "Lớp học",            desc: "Xếp lớp, phân công giáo viên",     icon: faSchool,        color: "text-emerald-600" },
  ];

  return (
    <div className="flex flex-col h-full gap-6">
      <div className="shrink-0">
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Xin chào, {name}</h1>
        <p className="text-sm text-[var(--foreground)]/60 mt-1">
          Bạn đang đăng nhập với quyền OWNER (nhân viên công nghệ). Bạn có toàn quyền hệ thống.
        </p>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {cards.map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className="block p-5 clay-card hover-card-soft focus-ring-soft press-feedback-soft"
            >
              <div className={`text-2xl mb-2 ${c.color}`}>
                <FaIcon icon={c.icon} />
              </div>
              <div className="font-semibold text-[var(--foreground)]">{c.label}</div>
              <div className="text-sm text-[var(--foreground)]/60 mt-1">{c.desc}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
