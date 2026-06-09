export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { ROLE_HOME } from "@/lib/auth/access";
import { requirePageSession } from "@/lib/auth/page-guard";

/**
 * Trang trung chuyển sau khi đăng nhập.
 * Đọc session từ server và redirect về dashboard đúng role.
 */
export default async function DashboardRedirectPage() {
  const user = await requirePageSession();
  redirect(ROLE_HOME[user.role]);
}
