export const dynamic = "force-dynamic";

import { auth } from "@/auth";
import { ROLE_HOME } from "@/lib/auth/access";
import { redirect } from "next/navigation";
import type { Role } from "@/lib/types";

/**
 * Trang trung chuyển sau khi đăng nhập.
 * Đọc session từ server và redirect về dashboard đúng role.
 */
export default async function DashboardRedirectPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  redirect(ROLE_HOME[session.user.role as Role]);
}
