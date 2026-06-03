/**
 * Permission matrix mặc định.
 *
 * Cách dùng: chạy `npm run db:seed` (đã include) hoặc gọi seedPermissions(prisma) trực tiếp.
 * ADMIN có thể sửa matrix qua UI sau khi seed.
 *
 * Quy ước:
 *   - OWNER không có entry — code bypass mọi check (xem lib/auth/permissions.ts).
 *   - STAFF base role không có quyền nào — toàn bộ quyền của staff được gán theo StaffPosition.
 */

import type { PrismaClient } from "@prisma/client";
import { PERMISSIONS, ALL_PERMISSION_DEFS } from "../lib/auth/permission-keys";

type Role = "OWNER" | "ADMIN" | "STAFF" | "TEACHER" | "STUDENT" | "PARENT";
type StaffPosition = "NVSALE" | "NVLT" | "CBNK" | "CBDH" | "CBDT" | "CBDTS";

const P = PERMISSIONS;

// ── Permission cho từng Role ─────────────────────────────────
const ROLE_MATRIX: Record<Role, string[]> = {
  OWNER: [], // bypass — không cần entry

  ADMIN: ALL_PERMISSION_DEFS
    .filter((p) => p.key !== P.SYSTEM_DEBUG.key) // debug chỉ OWNER
    .map((p) => p.key),

  STAFF: [], // gán qua StaffPosition

  TEACHER: [
    P.ROOM_VIEW.key,
    P.BOOKING_CREATE.key,
    P.CLASS_VIEW_OWN.key,
    P.CLASS_TAKE_ATTENDANCE.key,
    P.EXAM_VIEW.key,
    P.EXAM_CREATE.key,
    P.EXAM_GRADE.key,
    P.QUESTION_VIEW.key,
    P.QUESTION_CREATE.key,
    P.FLASHCARD_VIEW.key,
    P.FLASHCARD_MANAGE.key,
    P.COURSE_VIEW.key,
    P.COURSE_CREATE.key,
    P.STUDENT_VIEW_ASSIGNED.key,
    P.SUBJECT_VIEW.key,
  ],

  STUDENT: [
    P.COURSE_VIEW.key,
    P.FLASHCARD_VIEW.key,
    P.EXAM_VIEW.key,
    P.CLASS_VIEW_OWN.key,
    P.SUBJECT_VIEW.key,
  ],

  PARENT: [
    P.COURSE_VIEW.key,
    P.CLASS_VIEW_OWN.key,
    P.STUDENT_VIEW_ASSIGNED.key, // chỉ con — kiểm tra thêm ở action
    P.SUBJECT_VIEW.key,
  ],
};

// ── Permission cho từng StaffPosition ────────────────────────
const POSITION_MATRIX: Record<StaffPosition, string[]> = {
  NVSALE: [
    P.ROOM_VIEW.key,
    P.BOOKING_CREATE.key,
    P.STUDENT_VIEW_ALL.key,
    P.COURSE_VIEW.key,
    P.SUBJECT_VIEW.key,
  ],

  NVLT: [
    P.ROOM_VIEW.key,
    P.ROOM_CREATE.key,
    P.ROOM_UPDATE.key,
    P.ROOM_DELETE.key,
    P.BOOKING_CREATE.key,
    P.BOOKING_CREATE_FOR_OTHER.key,
    P.BOOKING_APPROVE.key,
    P.BOOKING_VIEW_ALL.key,
  ],

  CBNK: [
    P.ROOM_VIEW.key,
    P.BOOKING_CREATE.key,
    P.STUDENT_VIEW_ALL.key,
    P.SUBJECT_VIEW.key,
  ],

  CBDH: [
    P.ROOM_VIEW.key,
    P.BOOKING_CREATE.key,
    P.STUDENT_VIEW_ALL.key,
    P.SUBJECT_VIEW.key,
  ],

  CBDT: [
    P.ROOM_VIEW.key,
    P.BOOKING_CREATE.key,
    P.STUDENT_VIEW_ASSIGNED.key,
    P.STUDENT_UPDATE.key,
    P.STUDENT_EVALUATE.key,
    P.CLASS_VIEW_ALL.key,
    P.CLASS_CREATE.key,
    P.CLASS_UPDATE.key,
    P.CLASS_MANAGE_SESSION.key,
    P.SUBJECT_VIEW.key,
    P.COURSE_VIEW.key,
  ],

  CBDTS: [
    // CBDTS có toàn bộ quyền CBDT + extra
    P.ROOM_VIEW.key,
    P.BOOKING_CREATE.key,
    P.STUDENT_VIEW_ALL.key,
    P.STUDENT_CREATE.key,
    P.STUDENT_UPDATE.key,
    P.STUDENT_DELETE.key,
    P.STUDENT_ASSIGN.key,
    P.STUDENT_EVALUATE.key,
    P.CLASS_VIEW_ALL.key,
    P.CLASS_CREATE.key,
    P.CLASS_UPDATE.key,
    P.CLASS_DELETE.key,
    P.CLASS_MANAGE_SESSION.key,
    P.SUBJECT_VIEW.key,
    P.SUBJECT_MANAGE.key,
    P.COURSE_VIEW.key,
  ],
};

/**
 * Seed bảng Permission + RolePermission + PositionPermission.
 * Idempotent: chạy lại sẽ upsert.
 */
export async function seedPermissions(prisma: PrismaClient) {
  // 1. Upsert mọi permission key
  await Promise.all(
    ALL_PERMISSION_DEFS.map((p) =>
      prisma.permission.upsert({
        where: { key: p.key },
        update: { domain: p.domain, description: p.description },
        create: { key: p.key, domain: p.domain, description: p.description },
      }),
    ),
  );

  // 2. Reset & gán RolePermission
  await prisma.rolePermission.deleteMany();
  for (const [role, keys] of Object.entries(ROLE_MATRIX) as [Role, string[]][]) {
    if (keys.length === 0) continue;
    await prisma.rolePermission.createMany({
      data: keys.map((k) => ({ role, permissionKey: k })),
      skipDuplicates: true,
    });
  }

  // 3. Reset & gán PositionPermission
  await prisma.positionPermission.deleteMany();
  for (const [position, keys] of Object.entries(POSITION_MATRIX) as [StaffPosition, string[]][]) {
    if (keys.length === 0) continue;
    await prisma.positionPermission.createMany({
      data: keys.map((k) => ({ position, permissionKey: k })),
      skipDuplicates: true,
    });
  }

  return {
    permissions: ALL_PERMISSION_DEFS.length,
    rolePermissions: Object.values(ROLE_MATRIX).reduce((s, ks) => s + ks.length, 0),
    positionPermissions: Object.values(POSITION_MATRIX).reduce((s, ks) => s + ks.length, 0),
  };
}
