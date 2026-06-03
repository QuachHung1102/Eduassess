"use server";

import { prisma } from "@/lib/db/prisma";
import { requirePermission } from "@/lib/auth/require";
import { invalidatePermissionCache } from "@/lib/auth/permissions";
import { PERMISSIONS, type PermissionKey } from "@/lib/auth/permission-keys";
import type { Role, StaffPosition } from "@/lib/types";
import { revalidatePath } from "next/cache";

const ALL_KEYS = new Set<string>(
  Object.values(PERMISSIONS).map((p) => p.key),
);

const VALID_ROLES: Role[] = ["ADMIN", "STAFF", "TEACHER", "STUDENT", "PARENT"];
const VALID_POSITIONS: StaffPosition[] = ["NVSALE", "NVLT", "CBNK", "CBDH", "CBDT", "CBDTS"];

function sanitizeKeys(input: string[]): PermissionKey[] {
  return input.filter((k) => ALL_KEYS.has(k)) as PermissionKey[];
}

/**
 * Cập nhật toàn bộ quyền của 1 Role.
 * - OWNER bị block (luôn có mọi quyền — hard-coded).
 * - Cách làm: xóa tất cả RolePermission của role, thêm lại theo `keys`.
 */
export async function updateRolePermissionsAction(role: Role, keys: string[]) {
  const auth = await requirePermission(PERMISSIONS.PERMISSION_MANAGE.key);
  if (auth.error !== null) return { error: auth.error };

  if (role === "OWNER") return { error: "Không thể chỉnh sửa quyền của OWNER" };
  if (!VALID_ROLES.includes(role)) return { error: "Role không hợp lệ" };

  const cleanKeys = sanitizeKeys(keys);

  await prisma.$transaction([
    prisma.rolePermission.deleteMany({ where: { role } }),
    prisma.rolePermission.createMany({
      data: cleanKeys.map((k) => ({ role, permissionKey: k })),
      skipDuplicates: true,
    }),
    prisma.auditLog.create({
      data: {
        actorId: auth.user.id,
        action: "permission.role.update",
        entityType: "RolePermission",
        entityId: role,
        payload: { keys: cleanKeys },
      },
    }),
  ]);

  invalidatePermissionCache({ role });
  revalidatePath("/admin/role-permissions");
  return { success: true };
}

/**
 * Cập nhật toàn bộ quyền của 1 StaffPosition.
 */
export async function updatePositionPermissionsAction(
  position: StaffPosition,
  keys: string[],
) {
  const auth = await requirePermission(PERMISSIONS.PERMISSION_MANAGE.key);
  if (auth.error !== null) return { error: auth.error };

  if (!VALID_POSITIONS.includes(position)) return { error: "Chức danh không hợp lệ" };

  const cleanKeys = sanitizeKeys(keys);

  await prisma.$transaction([
    prisma.positionPermission.deleteMany({ where: { position } }),
    prisma.positionPermission.createMany({
      data: cleanKeys.map((k) => ({ position, permissionKey: k })),
      skipDuplicates: true,
    }),
    prisma.auditLog.create({
      data: {
        actorId: auth.user.id,
        action: "permission.position.update",
        entityType: "PositionPermission",
        entityId: position,
        payload: { keys: cleanKeys },
      },
    }),
  ]);

  invalidatePermissionCache({ position });
  revalidatePath("/admin/role-permissions");
  return { success: true };
}
