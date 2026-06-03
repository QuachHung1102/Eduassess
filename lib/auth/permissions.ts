/**
 * Trung tâm phân quyền.
 *
 * Nguyên tắc:
 *   - OWNER có MỌI quyền (bypass DB lookup).
 *   - Người dùng khác: union quyền theo Role + quyền theo StaffPosition (nếu role=STAFF).
 *   - Kết quả được cache trong process để tránh query DB mỗi request.
 *   - Khi ADMIN sửa permission matrix qua UI → gọi invalidatePermissionCache().
 */

import { prisma } from "@/lib/db/prisma";
import type { Role, StaffPosition, SessionUserBase } from "@/lib/types";
import type { PermissionKey } from "@/lib/auth/permission-keys";
import { ALL_PERMISSION_DEFS, PERMISSIONS } from "@/lib/auth/permission-keys";

type CacheEntry = { keys: Set<string>; loadedAt: number };

const TTL_MS = 5 * 60 * 1000; // 5 phút

const roleCache = new Map<Role, CacheEntry>();
const positionCache = new Map<StaffPosition, CacheEntry>();

const ADMIN_BLOCKED_KEYS = new Set<string>([
  PERMISSIONS.BOOKING_CREATE.key,
  PERMISSIONS.BOOKING_CREATE_FOR_OTHER.key,
  PERMISSIONS.BOOKING_APPROVE.key,
]);

function isAdminBlockedPermission(key: string): boolean {
  return ADMIN_BLOCKED_KEYS.has(key);
}

function getAdminDefaultKeys(): Set<string> {
  return new Set(
    ALL_PERMISSION_DEFS
      .map((d) => d.key)
      .filter((k) => !isAdminBlockedPermission(k)),
  );
}

function isFresh(entry: CacheEntry | undefined): entry is CacheEntry {
  return !!entry && Date.now() - entry.loadedAt < TTL_MS;
}

async function loadRolePermissions(role: Role): Promise<Set<string>> {
  const rows = await prisma.rolePermission.findMany({
    where: { role },
    select: { permissionKey: true },
  });
  return new Set(rows.map((r) => r.permissionKey));
}

async function loadPositionPermissions(position: StaffPosition): Promise<Set<string>> {
  const rows = await prisma.positionPermission.findMany({
    where: { position },
    select: { permissionKey: true },
  });
  return new Set(rows.map((r) => r.permissionKey));
}

async function getRoleKeys(role: Role): Promise<Set<string>> {
  const cached = roleCache.get(role);
  if (isFresh(cached)) return cached.keys;
  const keys = await loadRolePermissions(role);
  roleCache.set(role, { keys, loadedAt: Date.now() });
  return keys;
}

async function getPositionKeys(position: StaffPosition): Promise<Set<string>> {
  const cached = positionCache.get(position);
  if (isFresh(cached)) return cached.keys;
  const keys = await loadPositionPermissions(position);
  positionCache.set(position, { keys, loadedAt: Date.now() });
  return keys;
}

/**
 * Kiểm tra user có quyền cụ thể không.
 * @param user thông tin tối thiểu từ session: role, staffPosition
 * @param permissionKey VD: "room.approve"
 */
export async function can(
  user: Pick<SessionUserBase, "role" | "staffPosition"> | null | undefined,
  permissionKey: PermissionKey,
): Promise<boolean> {
  if (!user) return false;
  if (user.role === "OWNER") return true;
  if (user.role === "ADMIN") return !isAdminBlockedPermission(permissionKey);

  const roleKeys = await getRoleKeys(user.role);
  if (roleKeys.has(permissionKey)) return true;

  if (user.role === "STAFF" && user.staffPosition) {
    const positionKeys = await getPositionKeys(user.staffPosition);
    if (positionKeys.has(permissionKey)) return true;
  }

  return false;
}

/** Kiểm tra nhiều permission, trả về true nếu có ít nhất một. */
export async function canAny(
  user: Pick<SessionUserBase, "role" | "staffPosition"> | null | undefined,
  keys: PermissionKey[],
): Promise<boolean> {
  for (const k of keys) {
    if (await can(user, k)) return true;
  }
  return false;
}

/** Trả về toàn bộ permission key của user — dùng để build nav menu. */
export async function getUserPermissionKeys(
  user: Pick<SessionUserBase, "role" | "staffPosition"> | null | undefined,
): Promise<Set<string>> {
  if (!user) return new Set();
  if (user.role === "OWNER") {
    // OWNER có mọi quyền — trả về một sentinel; UI nên kiểm tra qua can() thay vì duyệt set này.
    return new Set(["*"]);
  }

  if (user.role === "ADMIN") {
    return getAdminDefaultKeys();
  }

  const roleKeys = await getRoleKeys(user.role);
  const merged = new Set(roleKeys);

  if (user.role === "STAFF" && user.staffPosition) {
    const positionKeys = await getPositionKeys(user.staffPosition);
    for (const k of positionKeys) merged.add(k);
  }

  return merged;
}

/**
 * Xóa cache permission — gọi sau khi ADMIN sửa permission matrix.
 * Nếu truyền `role`/`position` thì chỉ xóa cache cụ thể; không có tham số = xóa toàn bộ.
 */
export function invalidatePermissionCache(opts?: {
  role?: Role;
  position?: StaffPosition;
}) {
  if (!opts) {
    roleCache.clear();
    positionCache.clear();
    return;
  }
  if (opts.role) roleCache.delete(opts.role);
  if (opts.position) positionCache.delete(opts.position);
}
