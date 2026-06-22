import { auth } from "@/auth";

/**
 * Bắt buộc đăng nhập cho server action vùng classes — ném lỗi nếu chưa đăng
 * nhập. Helper dùng chung cho các file action trong `lib/classes/actions/*` và
 * `lib/classes/actions.ts`. KHÔNG phải server action (không "use server").
 */
export async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Chưa đăng nhập");
  return session;
}
