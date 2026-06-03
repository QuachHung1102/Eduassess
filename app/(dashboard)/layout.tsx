import { auth } from "@/auth";
import { ROLE_LABELS } from "@/lib/auth/access";
import { dashboardNavItemsFor } from "@/lib/navigation/dashboard";
import { getUnreadNotificationCount } from "@/lib/notifications/queries";
import { redirect } from "next/navigation";
import type { Role, StaffPosition } from "@/lib/types";
import { DashboardSidebar } from "@/components/layout/DashboardSidebar";
import { DashboardRouteLoader } from "@/components/layout/DashboardRouteLoader";
import { PageTransition } from "@/components/layout/PageTransition";

// All dashboard pages are user-specific and require auth → always dynamic
export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = session.user.role as Role;
  const staffPosition = (session.user.staffPosition ?? null) as StaffPosition | null;
  const items = await dashboardNavItemsFor({ role, staffPosition });
  const roleLabel = ROLE_LABELS[role];
  const unreadCount = await getUnreadNotificationCount();

  return (
    <div className="flex h-screen overflow-hidden dashboard-shell">
      <DashboardRouteLoader />
      <DashboardSidebar
        navItems={items}
        userName={session.user.name ?? ""}
        userEmail={session.user.email ?? ""}
        roleLabel={roleLabel}
        unreadCount={unreadCount}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Spacer for mobile fixed header (h-14 = 56px) */}
        <div className="h-14 shrink-0 lg:hidden" aria-hidden="true" />
        <main className="flex-1 p-3 sm:p-4 md:p-5 lg:p-6 overflow-y-auto flex flex-col themed-scrollbar">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </div>
  );
}
