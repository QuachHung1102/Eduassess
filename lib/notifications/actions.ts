"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/require";
import { PERMISSIONS } from "@/lib/auth/permission-keys";
import { validateTarget, type SendTarget } from "./targeting";

export async function markNotificationReadAction(notificationId: string) {
  const session = await auth();
  if (!session?.user?.id) return;
  await prisma.notification.updateMany({
    where: { id: notificationId, userId: session.user.id },
    data: { readAt: new Date() },
  });
  revalidatePath("/notifications");
}

export async function markAllNotificationsReadAction() {
  const session = await auth();
  if (!session?.user?.id) return;
  await prisma.notification.updateMany({
    where: { userId: session.user.id, readAt: null },
    data: { readAt: new Date() },
  });
  revalidatePath("/notifications");
}

/**
 * Gửi thông báo `SYSTEM` — phạm vi người nhận theo vai trò người gửi:
 *  - groups: theo nhóm role (ADMIN/OWNER mọi nhóm, NVLT chỉ Nhân viên)
 *  - my-students: HS được phân (chỉ CBĐT)
 *  - users: đích danh cá nhân
 * Server enforce qua validateTarget. Ghi AuditLog.
 */
export async function sendNotificationAction(input: {
  title: string;
  message: string;
  href?: string;
  target: SendTarget;
}): Promise<{ error: string } | { success: true; count: number }> {
  const authResult = await requirePermission(PERMISSIONS.NOTIFICATION_SEND.key);
  if (authResult.error !== null) return { error: authResult.error };
  const sender = authResult.user;

  const title = input.title.trim();
  const message = input.message.trim();
  if (!title) return { error: "Thiếu tiêu đề thông báo" };
  if (!message) return { error: "Thiếu nội dung thông báo" };

  const targetError = validateTarget(sender, input.target);
  if (targetError) return { error: targetError };

  let userIds: string[];
  const t = input.target;
  if (t.kind === "groups") {
    const users = await prisma.user.findMany({ where: { role: { in: t.roles } }, select: { id: true } });
    userIds = users.map((u) => u.id);
  } else if (t.kind === "my-students") {
    const advisees = await prisma.studentAdvisor.findMany({ where: { advisorId: sender.id }, select: { studentId: true } });
    userIds = [...new Set(advisees.map((a) => a.studentId))];
  } else {
    const users = await prisma.user.findMany({ where: { id: { in: t.userIds } }, select: { id: true } });
    userIds = users.map((u) => u.id);
  }

  if (userIds.length === 0) return { error: "Không có người nhận nào" };

  const href = input.href?.trim() || null;
  await prisma.$transaction([
    prisma.notification.createMany({
      data: userIds.map((id) => ({ userId: id, title, message, type: "SYSTEM" as const, href })),
    }),
    prisma.auditLog.create({
      data: {
        actorId: sender.id,
        action: "notification.send",
        entityType: "Notification",
        payload: { title, target: t, count: userIds.length, href },
      },
    }),
  ]);

  revalidatePath("/admin/notifications");
  revalidatePath("/staff/notifications");
  return { success: true, count: userIds.length };
}
