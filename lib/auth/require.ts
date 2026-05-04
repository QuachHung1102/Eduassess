/**
 * Shared auth helpers for server actions.
 * Each helper returns { user, error } — caller decides what to do with error.
 */

import { auth } from "@/auth";

type SessionUser = {
  id: string;
  role: string;
  name?: string | null;
  email?: string | null;
};

type AuthResult<T> =
  | { user: T; error: null }
  | { user: null; error: string };

/** Require any authenticated session */
export async function requireSession(): Promise<AuthResult<SessionUser>> {
  const session = await auth();
  if (!session?.user?.id) return { user: null, error: "Chưa đăng nhập" };
  return { user: session.user as SessionUser, error: null };
}

/** Require ADMIN role */
export async function requireAdmin(): Promise<AuthResult<SessionUser>> {
  const result = await requireSession();
  if (result.error) return result;
  if (!result.user || result.user.role !== "ADMIN") return { user: null, error: "Không có quyền" };
  return result;
}

/** Require TEACHER role */
export async function requireTeacher(): Promise<AuthResult<SessionUser>> {
  const result = await requireSession();
  if (result.error) return result;
  if (!result.user || result.user.role !== "TEACHER") return { user: null, error: "Không có quyền" };
  return result;
}
