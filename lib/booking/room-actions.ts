"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requirePermission } from "@/lib/auth/require";
import { PERMISSIONS } from "@/lib/auth/permission-keys";
import cloudinary from "@/lib/cloudinary";

/** Ảnh sơ đồ vị trí phòng do form upload sẵn lên Cloudinary trước khi submit. */
type LayoutImageInput = { url: string; publicId?: string };

/** Xóa ảnh cũ trên Cloudinary khi thay/xóa — best-effort, không chặn luồng chính. */
async function destroyCloudinaryAsset(publicId: string | null | undefined) {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch {
    // Ảnh mồ côi trên Cloudinary không ảnh hưởng dữ liệu — bỏ qua lỗi.
  }
}

export async function createRoomAction(data: {
  name: string;
  capacity: number;
  description?: string;
  layoutImage?: LayoutImageInput;
}) {
  const perm = await requirePermission(PERMISSIONS.ROOM_CREATE.key);
  if (perm.error !== null) return { error: perm.error };

  const name = data.name.trim();
  if (!name) return { error: "Tên phòng không được để trống" };
  if (data.capacity < 1) return { error: "Sức chứa phải ít nhất 1 người" };
  if (!data.layoutImage?.url) return { error: "Cần tải lên ảnh sơ đồ vị trí phòng" };

  const existing = await prisma.room.findUnique({ where: { name } });
  if (existing) return { error: "Tên phòng đã tồn tại" };

  await prisma.room.create({
    data: {
      name,
      capacity: data.capacity,
      description: data.description?.trim() || null,
      layoutImage: {
        create: { url: data.layoutImage.url, publicId: data.layoutImage.publicId || null },
      },
    },
  });

  revalidatePath("/admin/rooms");
  revalidatePath("/staff/rooms");
  return { error: null };
}

export async function updateRoomAction(
  id: string,
  data: {
    name: string;
    capacity: number;
    description?: string;
    /** Chỉ truyền khi người dùng chọn ảnh mới; bỏ trống = giữ ảnh hiện có. */
    layoutImage?: LayoutImageInput;
  },
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

  // Thay ảnh sơ đồ (nếu có ảnh mới): upsert rồi dọn ảnh cũ trên Cloudinary.
  if (data.layoutImage?.url) {
    const old = await prisma.roomLayoutImage.findUnique({
      where: { roomId: id },
      select: { publicId: true },
    });
    await prisma.roomLayoutImage.upsert({
      where: { roomId: id },
      update: { url: data.layoutImage.url, publicId: data.layoutImage.publicId || null },
      create: {
        roomId: id,
        url: data.layoutImage.url,
        publicId: data.layoutImage.publicId || null,
      },
    });
    if (old?.publicId && old.publicId !== data.layoutImage.publicId) {
      await destroyCloudinaryAsset(old.publicId);
    }
  }

  revalidatePath("/admin/rooms");
  revalidatePath("/staff/rooms");
  return { error: null };
}

export async function toggleRoomActiveAction(id: string, isActive: boolean) {
  const perm = await requirePermission(PERMISSIONS.ROOM_UPDATE.key);
  if (perm.error !== null) return { error: perm.error };

  await prisma.room.update({ where: { id }, data: { isActive } });
  revalidatePath("/admin/rooms");
  revalidatePath("/staff/rooms");
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

  // Lấy publicId trước khi xóa (cascade xóa bản ghi RoomLayoutImage nhưng không
  // xóa asset trên Cloudinary) rồi dọn ảnh sau.
  const layout = await prisma.roomLayoutImage.findUnique({
    where: { roomId: id },
    select: { publicId: true },
  });

  await prisma.room.delete({ where: { id } });
  await destroyCloudinaryAsset(layout?.publicId);

  revalidatePath("/admin/rooms");
  revalidatePath("/staff/rooms");
  return { error: null };
}
