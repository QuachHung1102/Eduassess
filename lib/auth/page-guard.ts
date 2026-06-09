/**
 * Page guards — dùng ở Server Component (page.tsx) để chặn truy cập.
 *
 * Khác với `lib/auth/require.ts` (trả về { user, error } cho server action),
 * các guard ở đây tự `redirect()` khi không đạt điều kiện và trả về user đã
 * chuẩn hoá (SessionUserBase) để page dùng tiếp.
 */

import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/require";
import { ROLE_HOME } from "@/lib/auth/access";
import type { Role, SessionUserBase } from "@/lib/types";

/** Yêu cầu đăng nhập; chưa đăng nhập → về /login. */
export async function requirePageSession(): Promise<SessionUserBase> {
  const { user, error } = await requireSession();
  if (error !== null) redirect("/login");
  return user;
}

/**
 * Yêu cầu đăng nhập + đúng role. Chưa đăng nhập → /login;
 * sai role → về trang chủ của role hiện tại.
 */
export async function requirePageRole(...roles: Role[]): Promise<SessionUserBase> {
  const user = await requirePageSession();
  if (!roles.includes(user.role)) redirect(ROLE_HOME[user.role]);
  return user;
}
