import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

// Mock lớp DB: không khởi tạo PrismaClient thật, không cần DATABASE_URL.
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    rolePermission: { findMany: vi.fn() },
    positionPermission: { findMany: vi.fn() },
  },
}));

import { prisma } from "@/lib/db/prisma";
import { PERMISSIONS } from "@/lib/auth/permission-keys";
import {
  can,
  canAny,
  getUserPermissionKeys,
  invalidatePermissionCache,
} from "@/lib/auth/permissions";

const roleFindMany = prisma.rolePermission.findMany as unknown as Mock;
const positionFindMany = prisma.positionPermission.findMany as unknown as Mock;

const owner = { role: "OWNER", staffPosition: null } as const;
const admin = { role: "ADMIN", staffPosition: null } as const;
const student = { role: "STUDENT", staffPosition: null } as const;
const staff = { role: "STAFF", staffPosition: "CBDH" } as const;

beforeEach(() => {
  invalidatePermissionCache();
  roleFindMany.mockReset().mockResolvedValue([]);
  positionFindMany.mockReset().mockResolvedValue([]);
});

describe("can — các nhánh đặc biệt (không chạm DB)", () => {
  it("user null/undefined luôn false", async () => {
    expect(await can(null, PERMISSIONS.USER_VIEW.key)).toBe(false);
    expect(await can(undefined, PERMISSIONS.USER_VIEW.key)).toBe(false);
    expect(roleFindMany).not.toHaveBeenCalled();
  });

  it("OWNER có mọi quyền mà không cần truy vấn DB", async () => {
    expect(await can(owner, PERMISSIONS.SYSTEM_MANAGE.key)).toBe(true);
    expect(await can(owner, PERMISSIONS.BOOKING_APPROVE.key)).toBe(true);
    expect(roleFindMany).not.toHaveBeenCalled();
  });

  it("ADMIN có mọi quyền TRỪ các quyền đặt phòng bị chặn", async () => {
    expect(await can(admin, PERMISSIONS.USER_VIEW.key)).toBe(true);
    expect(await can(admin, PERMISSIONS.BOOKING_CREATE.key)).toBe(false);
    expect(await can(admin, PERMISSIONS.BOOKING_CREATE_FOR_OTHER.key)).toBe(false);
    expect(await can(admin, PERMISSIONS.BOOKING_APPROVE.key)).toBe(false);
    expect(roleFindMany).not.toHaveBeenCalled();
  });
});

describe("can — quyền theo Role / StaffPosition", () => {
  it("STUDENT chỉ có quyền nằm trong role keys", async () => {
    roleFindMany.mockResolvedValue([{ permissionKey: PERMISSIONS.EXAM_VIEW.key }]);
    expect(await can(student, PERMISSIONS.EXAM_VIEW.key)).toBe(true);
    expect(await can(student, PERMISSIONS.USER_VIEW.key)).toBe(false);
  });

  it("STAFF hợp nhất quyền theo Role và theo chức danh", async () => {
    roleFindMany.mockResolvedValue([]);
    positionFindMany.mockResolvedValue([{ permissionKey: PERMISSIONS.BOOKING_APPROVE.key }]);
    expect(await can(staff, PERMISSIONS.BOOKING_APPROVE.key)).toBe(true);
    expect(await can(staff, PERMISSIONS.USER_DELETE.key)).toBe(false);
  });
});

describe("canAny", () => {
  it("true nếu có ít nhất một quyền khớp", async () => {
    roleFindMany.mockResolvedValue([{ permissionKey: PERMISSIONS.FLASHCARD_VIEW.key }]);
    expect(
      await canAny(student, [PERMISSIONS.USER_VIEW.key, PERMISSIONS.FLASHCARD_VIEW.key]),
    ).toBe(true);
    expect(await canAny(student, [PERMISSIONS.USER_VIEW.key, PERMISSIONS.USER_DELETE.key])).toBe(false);
  });
});

describe("getUserPermissionKeys", () => {
  it("user null → tập rỗng", async () => {
    expect((await getUserPermissionKeys(null)).size).toBe(0);
  });

  it("OWNER → sentinel '*'", async () => {
    expect(await getUserPermissionKeys(owner)).toEqual(new Set(["*"]));
  });

  it("ADMIN → mọi key trừ các quyền đặt phòng bị chặn", async () => {
    const keys = await getUserPermissionKeys(admin);
    expect(keys.has(PERMISSIONS.USER_VIEW.key)).toBe(true);
    expect(keys.has(PERMISSIONS.BOOKING_CREATE.key)).toBe(false);
    expect(keys.has(PERMISSIONS.BOOKING_APPROVE.key)).toBe(false);
  });

  it("STAFF → hợp nhất role keys + position keys", async () => {
    roleFindMany.mockResolvedValue([{ permissionKey: PERMISSIONS.CLASS_VIEW_ALL.key }]);
    positionFindMany.mockResolvedValue([{ permissionKey: PERMISSIONS.BOOKING_APPROVE.key }]);
    const keys = await getUserPermissionKeys(staff);
    expect(keys.has(PERMISSIONS.CLASS_VIEW_ALL.key)).toBe(true);
    expect(keys.has(PERMISSIONS.BOOKING_APPROVE.key)).toBe(true);
  });
});

describe("cache & invalidatePermissionCache", () => {
  it("cache kết quả role; xóa cache thì truy vấn lại", async () => {
    roleFindMany.mockResolvedValue([{ permissionKey: PERMISSIONS.EXAM_VIEW.key }]);

    await can(student, PERMISSIONS.EXAM_VIEW.key);
    await can(student, PERMISSIONS.EXAM_VIEW.key);
    expect(roleFindMany).toHaveBeenCalledTimes(1);

    invalidatePermissionCache();
    await can(student, PERMISSIONS.EXAM_VIEW.key);
    expect(roleFindMany).toHaveBeenCalledTimes(2);
  });
});
