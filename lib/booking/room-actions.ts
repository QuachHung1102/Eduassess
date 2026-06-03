"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requirePermission } from "@/lib/auth/require";
import { PERMISSIONS } from "@/lib/auth/permission-keys";

export async function createRoomAction(data: {
  name: string;
  capacity: number;
  description?: string;
}) {
  const perm = await requirePermission(PERMISSIONS.ROOM_CREATE.key);
  if (perm.error !== null) return { error: perm.error };

  const name = data.name.trim();
  if (!name) return { error: "Tên phòng không được để trống" };
  if (data.capacity < 1) return { error: "Sức chứa phải ít nhất 1 người" };

  const existing = await prisma.room.findUnique({ where: { name } });
  if (existing) return { error: "Tên phòng đã tồn tại" };

  await prisma.room.create({
    data: {
      name,
      capacity: data.capacity,
      description: data.description?.trim() || null,
    },
  });

  revalidatePath("/admin/rooms");
  return { error: null };
}

export async function updateRoomAction(
  id: string,
  data: { name: string; capacity: number; description?: string },
) {
  const perm = await requirePermission(PERMISSIONS.ROOM_UPDATE.key);
  if (perm.error !== null) return { error: perm.error };

  const name = data.name.trim();
  if (!name) return { error: "Tên phòng không được để trống" };
  if (data.capacity < 1) return { error: "Sức chứa phải ít nhất 1 người" };

  const conflict = await prisma.room.findFirst({ where: { name, id: { not: id } } });
  if (conflict) return { error: "Tên phòng đã tồn tại" };

  await prisma.room.update({
    where: { id },
    data: { name, capacity: data.capacity, description: data.description?.trim() || null },
  });

  revalidatePath("/admin/rooms");
  return { error: null };
}

export async function toggleRoomActiveAction(id: string, isActive: boolean) {
  const perm = await requirePermission(PERMISSIONS.ROOM_UPDATE.key);
  if (perm.error !== null) return { error: perm.error };

  await prisma.room.update({ where: { id }, data: { isActive } });
  revalidatePath("/admin/rooms");
  return { error: null };
}

export async function deleteRoomAction(id: string) {
  const perm = await requirePermission(PERMISSIONS.ROOM_DELETE.key);
  if (perm.error !== null) return { error: perm.error };

  const futureBookings = await prisma.roomBooking.count({
    where: {
      roomId: id,
      status: { in: ["PENDING", "APPROVED"] },
      startAt: { gt: new Date() },
    },
  });

  if (futureBookings > 0) {
    return { error: `Phòng còn ${futureBookings} lịch đặt sắp tới, không thể xóa` };
  }

  await prisma.room.delete({ where: { id } });
  revalidatePath("/admin/rooms");
  return { error: null };
}
