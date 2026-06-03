import { prisma } from "@/lib/db/prisma";
import { ALL_PERMISSION_DEFS } from "@/lib/auth/permission-keys";
import { requirePermission } from "@/lib/auth/require";
import { PERMISSIONS } from "@/lib/auth/permission-keys";
import { PermissionMatrixClient } from "./PermissionMatrixClient";
import { redirect } from "next/navigation";

export default async function RolePermissionsPage() {
  const auth = await requirePermission(PERMISSIONS.PERMISSION_MANAGE.key);
  if (auth.error) redirect("/login");

  const [rolePerms, positionPerms] = await Promise.all([
    prisma.rolePermission.findMany({ select: { role: true, permissionKey: true } }),
    prisma.positionPermission.findMany({ select: { position: true, permissionKey: true } }),
  ]);

  // Gom group theo role / position
  const byRole: Record<string, string[]> = {};
  for (const r of rolePerms) {
    (byRole[r.role] ??= []).push(r.permissionKey);
  }
  const byPosition: Record<string, string[]> = {};
  for (const p of positionPerms) {
    (byPosition[p.position] ??= []).push(p.permissionKey);
  }

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="shrink-0">
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Phân quyền vai trò</h1>
        <p className="text-[var(--foreground)]/60 text-sm mt-1">
          Bật / tắt quyền cho từng vai trò và chức danh nhân viên.
          OWNER luôn có mọi quyền và không hiển thị ở đây.
        </p>
      </div>

      <PermissionMatrixClient
        permissions={ALL_PERMISSION_DEFS.map((p) => ({
          key: p.key,
          domain: p.domain,
          description: p.description,
        }))}
        rolePerms={byRole}
        positionPerms={byPosition}
      />
    </div>
  );
}
