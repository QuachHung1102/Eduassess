import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { requireSession } from "@/lib/auth/require";
import { allowedGroupRoles, canSendMyStudents } from "./targeting";
import type { Role } from "@/lib/types";

const ROLE_GROUP_LABEL: Record<string, string> = {
  STUDENT: "Học sinh",
  TEACHER: "Giáo viên",
  PARENT: "Phụ huynh",
  STAFF: "Nhân viên",
};

export type NotificationSenderContext = {
  groups: { role: Role; label: string; count: number }[];
  myStudents: { enabled: boolean; count: number };
};

export async function getUnreadNotificationCount() {
  const session = await auth();
  if (!session?.user?.id) return 0;
  return prisma.notification.count({
    where: { userId: session.user.id, readAt: null },
  });
}

export async function getNotifications(limit = 30) {
  const session = await auth();
  if (!session?.user?.id) return [];
  return prisma.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

/** Bối cảnh người gửi: nhóm role được phép (kèm số lượng) + HS phụ trách. */
export async function getSenderNotificationContext(): Promise<NotificationSenderContext | null> {
  const { user, error } = await requireSession();
  if (error !== null) return null;
  const groups = await Promise.all(
    allowedGroupRoles(user).map(async (role) => ({
      role,
      label: ROLE_GROUP_LABEL[role] ?? role,
      count: await prisma.user.count({ where: { role } }),
    })),
  );
  const myStudents = canSendMyStudents(user)
    ? { enabled: true, count: await prisma.studentAdvisor.count({ where: { advisorId: user.id } }) }
    : { enabled: false, count: 0 };
  return { groups, myStudents };
}
