import { auth } from "@/auth";
import { dashboardNavItemsFor } from "@/lib/navigation/dashboard";
import { ROLE_LABELS } from "@/lib/auth/access";
import type { Role, StaffPosition } from "@/lib/types";
import Link from "next/link";
import { FaIcon } from "@/components/ui/FaIcon";

const POSITION_LABEL: Record<string, string> = {
  NVSALE: "Chuyên viên Tư vấn",
  NVLT:   "Nhân viên Lễ tân",
  CBNK:   "Cán bộ Ngoại khoá",
  CBDH:   "Cán bộ Du học",
  CBDT:   "Cán bộ Đào tạo",
  CBDTS:  "Cán bộ Đào tạo (Super)",
};

export default async function StaffDashboard() {
  const session = await auth();
  const name = session?.user?.name ?? "Nhân viên";
  const role = session?.user?.role as Role | undefined;
  const position = (session?.user?.staffPosition ?? null) as StaffPosition | null;
  const positionLabel = position ? POSITION_LABEL[position] ?? position : ROLE_LABELS.STAFF;

  // Lấy nav items của user để hiển thị làm shortcut
  const navItems = role
    ? await dashboardNavItemsFor({ role, staffPosition: position })
    : [];
  const shortcuts = navItems.filter((i) => i.href !== "/staff");

  return (
    <div className="flex flex-col h-full gap-6">
      <div className="shrink-0">
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Xin chào, {name}</h1>
        <p className="text-sm text-[var(--foreground)]/60 mt-1">
          Chức danh: <span className="font-medium text-[var(--foreground)]">{positionLabel}</span>
        </p>
      </div>

      <div className="flex-1 overflow-auto">
        {shortcuts.length === 0 ? (
          <p className="text-[var(--foreground)]/40 text-sm">
            Tài khoản của bạn chưa được cấp quyền truy cập tính năng nào. Hãy liên hệ admin.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {shortcuts.map((s) => (
              <Link
                key={s.href}
                href={s.href}
                className="flex items-center gap-3 p-4 clay-card hover-card-soft focus-ring-soft press-feedback-soft"
              >
                <div className="text-xl text-emerald-600">
                  <FaIcon icon={s.icon} />
                </div>
                <span className="font-medium text-[var(--foreground)]">{s.label}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
