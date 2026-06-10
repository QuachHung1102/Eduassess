/**
 * Shared auth helpers for server actions.
 * Mỗi helper trả về { user, error } — caller tự quyết định cách xử lý error.
 */

import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { can } from "@/lib/auth/permissions";
import type { PermissionKey } from "@/lib/auth/permission-keys";
import type { Role, StaffPosition, SessionUserBase } from "@/lib/types";

type AuthResult<T> =
  | { user: T; error: null }
  | { user: null; error: string };

async function readSessionUser(): Promise<SessionUserBase | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  const u = session.user as Partial<SessionUserBase>;
  if (!u.role) return null;
  return {
    id: session.user.id,
    role: u.role as Role,
    staffPosition: (u.staffPosition ?? null) as StaffPosition | null,
    name: session.user.name,
    email: session.user.email,
  };
}

/** Yêu cầu phiên đăng nhập bất kỳ. */
export async function requireSession(): Promise<AuthResult<SessionUserBase>> {
  const user = await readSessionUser();
  if (!user) return { user: null, error: "Chưa đăng nhập" };
  return { user, error: null };
}

/** Yêu cầu user có ít nhất 1 trong các role được liệt kê. */
export async function requireRole(
  ...roles: Role[]
): Promise<AuthResult<SessionUserBase>> {
  const result = await requireSession();
  if (result.error !== null) return result;
  if (!roles.includes(result.user.role)) {
    return { user: null, error: "Không có quyền" };
  }
  return result;
}

/** Shortcut: yêu cầu ADMIN hoặc OWNER. */
export async function requireAdmin(): Promise<AuthResult<SessionUserBase>> {
  return requireRole("ADMIN", "OWNER");
}

/** Shortcut: yêu cầu TEACHER. */
export async function requireTeacher(): Promise<AuthResult<SessionUserBase>> {
  return requireRole("TEACHER");
}

/**
 * Yêu cầu user có permission cụ thể (đọc từ permission framework).
 * Dùng cho các action không gắn cứng vào 1 role.
 */
export async function requirePermission(
  key: PermissionKey,
): Promise<AuthResult<SessionUserBase>> {
  const result = await requireSession();
  if (result.error !== null) return result;
  const ok = await can(result.user, key);
  if (!ok) return { user: null, error: "Không có quyền" };
  return result;
}

/**
 * Tra id User thực sự ứng với role mong muốn từ thông tin session.
 *
 * Một số tài khoản (vd. học sinh/giáo viên do staff tạo trước) có thể có
 * session.user.id không khớp record User mong đợi (do đăng nhập qua OAuth
 * tạo User khác id). Tra theo id trước; nếu role không khớp, fallback tra
 * theo email. Trả null nếu không tìm thấy User nào khớp role.
 */
export async function resolveUserIdByRole(
  sessionUser: { id?: string; email?: string | null },
  role: Role,
): Promise<string | null> {
  if (sessionUser.id) {
    const byId = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: { id: true, role: true },
    });
    if (byId?.role === role) return byId.id;
  }
  if (sessionUser.email) {
    const byEmail = await prisma.user.findUnique({
      where: { email: sessionUser.email },
      select: { id: true, role: true },
    });
    if (byEmail?.role === role) return byEmail.id;
  }
  return null;
}
