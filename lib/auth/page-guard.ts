/**
 * Page guards — dùng ở Server Component (page.tsx) để chặn truy cập.
 *
 * Khác với `lib/auth/require.ts` (trả về { user, error } cho server action),
 * các guard ở đây tự `redirect()` khi không đạt điều kiện và trả về user đã
 * chuẩn hoá (SessionUserBase) để page dùng tiếp.
 */

import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/require";
import { ROLE_HOME, ROUTE_ROLES } from "@/lib/auth/access";
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

/**
 * Guard cả một khu route theo prefix trong `ROUTE_ROLES` — dùng tại
 * `app/(dashboard)/<zone>/layout.tsx` để chặn role cho MỌI trang con của khu,
 * không phụ thuộc từng page có tự gọi guard hay không.
 *
 * `ROUTE_ROLES` là nguồn sự thật cho ai được vào khu nào. Nếu prefix chưa có
 * trong bảng (cấu hình thiếu) → fail-safe về mức chỉ yêu cầu đăng nhập và log
 * cảnh báo (guardrail test `tests/auth/route-coverage.test.ts` chặn trường hợp này).
 */
export async function requirePageZone(prefix: string): Promise<SessionUserBase> {
  const roles = ROUTE_ROLES[prefix];
  if (!roles) {
    console.error(`[page-guard] Zone "${prefix}" không có trong ROUTE_ROLES — chỉ enforce đăng nhập.`);
    return requirePageSession();
  }
  return requirePageRole(...roles);
}
