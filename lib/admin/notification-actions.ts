"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requirePermission } from "@/lib/auth/require";
import { PERMISSIONS } from "@/lib/auth/permission-keys";
import type { Role } from "@/lib/types";

/**
 * Admin soạn & gửi thông báo `SYSTEM` thủ công tới các nhóm vai trò.
 * Tạo một Notification cho mỗi user thuộc nhóm + ghi AuditLog.
 */
export async function sendSystemNotificationAction(data: {
  title: string;
  message: string;
  roles: Role[];
  href?: string;
}): Promise<{ error: string } | { success: true; count: number }> {
  const auth = await requirePermission(PERMISSIONS.NOTIFICATION_SEND.key);
  if (auth.error !== null) return { error: auth.error };

  const title = data.title.trim();
  const message = data.message.trim();
  if (!title) return { error: "Thiếu tiêu đề thông báo" };
  if (!message) return { error: "Thiếu nội dung thông báo" };
  if (data.roles.length === 0) return { error: "Chọn ít nhất một nhóm người nhận" };

  const users = await prisma.user.findMany({
    where: { role: { in: data.roles } },
    select: { id: true },
  });
  if (users.length === 0) return { error: "Không có người nhận nào thuộc nhóm đã chọn" };

  const href = data.href?.trim() || null;
  await prisma.$transaction([
    prisma.notification.createMany({
      data: users.map((u) => ({
        userId: u.id,
        title,
        message,
        type: "SYSTEM" as const,
        href,
      })),
    }),
    prisma.auditLog.create({
      data: {
        actorId: auth.user.id,
        action: "notification.send",
        entityType: "Notification",
        payload: { title, roles: data.roles, count: users.length, href },
      },
    }),
  ]);

  revalidatePath("/admin/notifications");
  return { success: true, count: users.length };
}
