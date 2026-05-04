import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";

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
