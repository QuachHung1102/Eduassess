# User Code System — Implementation Plan (Plan 1: Feature)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cấp mỗi User một mã định danh người-đọc-được theo loại (`HS-2026-000001`, `CN-007`…), quản qua bảng `UserCategory` cấu hình được; bỏ tính năng tự đăng ký.

**Architecture:** `UserCategory` (loại HR + prefix + format) là chiều độc lập, tách khỏi `StaffPosition`. Sinh mã atomic qua `UserCodeCounter` (đếm theo (category, năm)). Logic format tách pure module (`lib/users/user-code.ts`, TDD); cấp số chạy trong cùng transaction tạo user. Phân quyền GIỮ NGUYÊN (Phase 2 mới đụng). Spec: `docs/superpowers/specs/2026-06-17-user-code-system-design.md`.

**Tech Stack:** Next.js 16 (App Router), Prisma 7 + PostgreSQL, NextAuth 5, Vitest. ⚠️ Next bản này có breaking change — đọc `node_modules/next/dist/docs/` trước khi viết code Next.

**Quy ước commit:** kết thúc message bằng `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

---

## File Structure

| File | Trách nhiệm |
|---|---|
| `prisma/schema/user_category.prisma` (tạo) | Model `UserCategory`, `UserCodeCounter` |
| `prisma/schema/user.prisma` (sửa) | Thêm `code`, `categoryId` vào `User` |
| `lib/users/user-code.ts` (tạo) | Pure: `formatUserCode` |
| `lib/users/user-code-store.ts` (tạo) | DB: `generateUserCode` (atomic), `resolveCategory*` |
| `lib/users/categories.ts` (tạo) | Hằng `SYSTEM_CATEGORIES` (systemKey ↔ role/position ↔ prefix mặc định) |
| `lib/admin/actions.ts` (sửa) | `createUserAction`/`updateUserAction` cắm sinh/sửa mã |
| `lib/users/actions.ts` (tạo) | Seam staff `createStudentByStaffAction` (gate `student.create`) |
| `lib/admin/user-category-actions.ts` (tạo) | CRUD `UserCategory` (admin) |
| `app/(auth)/register/*`, `lib/auth/actions/register.ts` (xoá) | Bỏ tự đăng ký |
| `app/(dashboard)/admin/user-categories/*` (tạo) | UI quản loại |
| `app/(dashboard)/staff/students/new/*` (tạo) | UI staff tạo HS |
| `scripts/backfill-user-codes.ts` (tạo) | Backfill mã cho DB đang chạy |

---

## Task 1: Schema — `UserCategory`, `UserCodeCounter`, `User.code/categoryId`

**Files:**
- Create: `prisma/schema/user_category.prisma`
- Modify: `prisma/schema/user.prisma`

- [ ] **Step 1: Tạo file model**

`prisma/schema/user_category.prisma`:
```prisma
model UserCategory {
  id          String   @id @default(cuid())
  label       String
  prefix      String   @unique
  systemKey   String?  @unique // "STUDENT"/"OWNER"/"STAFF_NVSALE"… null cho loại admin tự thêm
  includeYear Boolean  @default(false)
  padWidth    Int      @default(6)
  sortOrder   Int      @default(0)
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  users    User[]
  counters UserCodeCounter[]
  @@map("user_categories")
}

model UserCodeCounter {
  id         String @id @default(cuid())
  categoryId String
  year       Int // HS=năm tạo; loại không-năm=0
  nextSeq    Int    @default(1)

  category UserCategory @relation(fields: [categoryId], references: [id], onDelete: Cascade)
  @@unique([categoryId, year])
  @@map("user_code_counters")
}
```

- [ ] **Step 2: Thêm field vào `User`**

Trong `prisma/schema/user.prisma`, sau dòng `avatarUrl String?` thêm:
```prisma
  code       String?       @unique
  categoryId String?
  category   UserCategory? @relation(fields: [categoryId], references: [id])
```
Và trong block `@@index` của User, thêm: `@@index([categoryId])`

- [ ] **Step 3: Tạo migration + generate client**

Run:
```bash
npx prisma migrate dev --name add_user_category_and_code
npx prisma generate
```
Expected: migration tạo bảng `user_categories`, `user_code_counters`, cột `users.code`/`users.categoryId`; client generate OK.

- [ ] **Step 4: Commit**
```bash
git add prisma/
git commit -m "feat(user-code): add UserCategory, UserCodeCounter, User.code/categoryId

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: Pure `formatUserCode` (TDD)

**Files:**
- Create: `lib/users/user-code.ts`
- Test: `tests/users/user-code.test.ts`

- [ ] **Step 1: Viết test thất bại**

`tests/users/user-code.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { formatUserCode } from "@/lib/users/user-code";

describe("formatUserCode", () => {
  it("có năm: prefix-năm-seq(pad)", () => {
    expect(formatUserCode({ prefix: "HS", includeYear: true, padWidth: 6, year: 2026, seq: 1 }))
      .toBe("HS-2026-000001");
  });
  it("không năm: prefix-seq(pad)", () => {
    expect(formatUserCode({ prefix: "CN", includeYear: false, padWidth: 3, year: 0, seq: 7 }))
      .toBe("CN-007");
  });
  it("padWidth 0 ⇒ không pad", () => {
    expect(formatUserCode({ prefix: "MKT", includeYear: false, padWidth: 0, year: 0, seq: 712 }))
      .toBe("MKT-712");
  });
  it("seq vượt padWidth ⇒ giữ nguyên độ dài", () => {
    expect(formatUserCode({ prefix: "HS", includeYear: true, padWidth: 6, year: 2026, seq: 1234567 }))
      .toBe("HS-2026-1234567");
  });
});
```

- [ ] **Step 2: Chạy test — xác nhận FAIL**

Run: `npx vitest run tests/users/user-code.test.ts`
Expected: FAIL — `Cannot find package '@/lib/users/user-code'`.

- [ ] **Step 3: Implement tối thiểu**

`lib/users/user-code.ts`:
```ts
export type FormatUserCodeInput = {
  prefix: string;
  includeYear: boolean;
  padWidth: number;
  year: number;
  seq: number;
};

/** Ghép mã từ thành phần. Pure — không DB. */
export function formatUserCode({ prefix, includeYear, padWidth, year, seq }: FormatUserCodeInput): string {
  const num = String(seq).padStart(Math.max(padWidth, 0), "0");
  return includeYear ? `${prefix}-${year}-${num}` : `${prefix}-${num}`;
}
```

- [ ] **Step 4: Chạy test — xác nhận PASS**

Run: `npx vitest run tests/users/user-code.test.ts`
Expected: PASS (4 test).

- [ ] **Step 5: Commit**
```bash
git add lib/users/user-code.ts tests/users/user-code.test.ts
git commit -m "feat(user-code): pure formatUserCode with TDD

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: Hằng `SYSTEM_CATEGORIES` + atomic `generateUserCode`

**Files:**
- Create: `lib/users/categories.ts`, `lib/users/user-code-store.ts`
- Test: `tests/users/user-code-store.test.ts`

- [ ] **Step 1: Hằng systemKey**

`lib/users/categories.ts`:
```ts
import type { Role, StaffPosition } from "@prisma/client";

export type SystemCategorySeed = {
  systemKey: string;
  label: string;
  prefix: string;
  includeYear: boolean;
  padWidth: number;
  role: Role;
  staffPosition: StaffPosition | null;
};

// 1 dòng / (role, position). Marketing KHÔNG ở đây — admin tự thêm (systemKey=null).
export const SYSTEM_CATEGORIES: SystemCategorySeed[] = [
  { systemKey: "STUDENT", label: "Học sinh",            prefix: "HS",  includeYear: true,  padWidth: 6, role: "STUDENT", staffPosition: null },
  { systemKey: "TEACHER", label: "Giáo viên",           prefix: "GV",  includeYear: false, padWidth: 3, role: "TEACHER", staffPosition: null },
  { systemKey: "PARENT",  label: "Phụ huynh",           prefix: "PH",  includeYear: false, padWidth: 4, role: "PARENT",  staffPosition: null },
  { systemKey: "ADMIN",   label: "Quản trị",            prefix: "QT",  includeYear: false, padWidth: 2, role: "ADMIN",   staffPosition: null },
  { systemKey: "OWNER",   label: "Nhân viên công nghệ", prefix: "CN",  includeYear: false, padWidth: 3, role: "OWNER",   staffPosition: null },
  { systemKey: "STAFF_NVSALE", label: "Tư vấn tuyển sinh", prefix: "TS",  includeYear: false, padWidth: 3, role: "STAFF", staffPosition: "NVSALE" },
  { systemKey: "STAFF_NVLT",   label: "Lễ tân",            prefix: "LT",  includeYear: false, padWidth: 3, role: "STAFF", staffPosition: "NVLT" },
  { systemKey: "STAFF_CBNK",   label: "Cán bộ ngoại khóa", prefix: "NK",  includeYear: false, padWidth: 3, role: "STAFF", staffPosition: "CBNK" },
  { systemKey: "STAFF_CBDH",   label: "Cán bộ du học",     prefix: "DH",  includeYear: false, padWidth: 3, role: "STAFF", staffPosition: "CBDH" },
  { systemKey: "STAFF_CBDT",   label: "Cán bộ đào tạo",    prefix: "DT",  includeYear: false, padWidth: 3, role: "STAFF", staffPosition: "CBDT" },
  { systemKey: "STAFF_CBDTS",  label: "CBĐT super",        prefix: "DTS", includeYear: false, padWidth: 3, role: "STAFF", staffPosition: "CBDTS" },
];

/** systemKey ứng với (role, position) — dùng resolve category mặc định khi tạo user. */
export function systemKeyFor(role: Role, staffPosition: StaffPosition | null): string {
  if (role === "STAFF" && staffPosition) return `STAFF_${staffPosition}`;
  return role;
}
```

- [ ] **Step 2: Viết test `generateUserCode` (mock tx) — FAIL**

`tests/users/user-code-store.test.ts`:
```ts
import { describe, expect, it, vi } from "vitest";
import { generateUserCode } from "@/lib/users/user-code-store";
import type { UserCategory } from "@prisma/client";

function cat(over: Partial<UserCategory>): UserCategory {
  return {
    id: "c1", label: "Học sinh", prefix: "HS", systemKey: "STUDENT",
    includeYear: true, padWidth: 6, sortOrder: 0, isActive: true,
    createdAt: new Date(), updatedAt: new Date(), ...over,
  } as UserCategory;
}

describe("generateUserCode", () => {
  it("HS: dùng năm hiện tại, seq = nextSeq-1 sau increment", async () => {
    const upsert = vi.fn().mockResolvedValue({ nextSeq: 2 }); // lần đầu → seq 1
    const tx = { userCodeCounter: { upsert } } as never;
    const year = new Date().getFullYear();

    const code = await generateUserCode(tx, cat({}));

    expect(code).toBe(`HS-${year}-000001`);
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { categoryId_year: { categoryId: "c1", year } } }),
    );
  });

  it("loại không-năm: year=0, không có phần năm trong mã", async () => {
    const upsert = vi.fn().mockResolvedValue({ nextSeq: 8 }); // seq 7
    const tx = { userCodeCounter: { upsert } } as never;

    const code = await generateUserCode(tx, cat({ prefix: "CN", systemKey: "OWNER", includeYear: false, padWidth: 3 }));

    expect(code).toBe("CN-007");
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { categoryId_year: { categoryId: "c1", year: 0 } } }),
    );
  });
});
```
Run: `npx vitest run tests/users/user-code-store.test.ts` → FAIL (module thiếu).

- [ ] **Step 3: Implement `generateUserCode`**

`lib/users/user-code-store.ts`:
```ts
import type { Prisma, UserCategory } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { formatUserCode } from "./user-code";

type Tx = Prisma.TransactionClient;

/** Cấp số kế tiếp cho category (atomic trong transaction) rồi format mã. */
export async function generateUserCode(tx: Tx, category: UserCategory): Promise<string> {
  const year = category.includeYear ? new Date().getFullYear() : 0;
  const counter = await tx.userCodeCounter.upsert({
    where: { categoryId_year: { categoryId: category.id, year } },
    create: { categoryId: category.id, year, nextSeq: 2 },
    update: { nextSeq: { increment: 1 } },
  });
  const seq = counter.nextSeq - 1;
  return formatUserCode({
    prefix: category.prefix,
    includeYear: category.includeYear,
    padWidth: category.padWidth,
    year,
    seq,
  });
}

/** Tìm category theo systemKey (dùng resolve mặc định khi tạo user). */
export async function findCategoryBySystemKey(tx: Tx, systemKey: string): Promise<UserCategory | null> {
  return tx.userCategory.findFirst({ where: { systemKey, isActive: true } });
}
```

- [ ] **Step 4: Chạy test — PASS.** Run: `npx vitest run tests/users/user-code-store.test.ts` → PASS (2).

- [ ] **Step 5: Commit**
```bash
git add lib/users/categories.ts lib/users/user-code-store.ts tests/users/user-code-store.test.ts
git commit -m "feat(user-code): SYSTEM_CATEGORIES + atomic generateUserCode

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: Seed loại mặc định (cần cho mọi luồng tạo)

**Files:**
- Create: `lib/users/seed-categories.ts`
- Modify: `prisma/seed.ts` (gọi ở đầu, trước khi tạo user)

- [ ] **Step 1: Hàm upsert loại từ hằng**

`lib/users/seed-categories.ts`:
```ts
import { prisma } from "@/lib/db/prisma";
import { SYSTEM_CATEGORIES } from "./categories";

/** Tạo/đồng bộ các UserCategory hệ thống (idempotent theo systemKey). */
export async function seedSystemCategories() {
  for (const [i, c] of SYSTEM_CATEGORIES.entries()) {
    await prisma.userCategory.upsert({
      where: { systemKey: c.systemKey },
      update: {},
      create: {
        label: c.label, prefix: c.prefix, systemKey: c.systemKey,
        includeYear: c.includeYear, padWidth: c.padWidth, sortOrder: i,
      },
    });
  }
}
```

- [ ] **Step 2: Gọi trong `prisma/seed.ts`**

Trong `prisma/seed.ts`, ngay sau seed Subject/Grade và TRƯỚC khi tạo user đầu tiên (admin), thêm:
```ts
import { seedSystemCategories } from "@/lib/users/seed-categories";
// ...
await seedSystemCategories();
console.log("✅ user categories");
```
> Mỗi `prisma.user.upsert/create` user trong seed phải gán `categoryId` + `code`. Vì seed lớn được làm ở Plan 2, ở Plan 1 chỉ cần các user seed cốt lõi (admin/owner/gv/hs mẫu) có category+code. Dùng helper `assignSeedUserCode` (Step 3).

- [ ] **Step 3: Helper gán code cho user seed**

Thêm vào `lib/users/seed-categories.ts`:
```ts
import { systemKeyFor } from "./categories";
import { generateUserCode } from "./user-code-store";
import type { Role, StaffPosition } from "@prisma/client";

/** Gán category + code cho 1 user seed đã tồn tại (dùng trong seed.ts). */
export async function assignSeedUserCode(userId: string, role: Role, staffPosition: StaffPosition | null) {
  const systemKey = systemKeyFor(role, staffPosition);
  const category = await prisma.userCategory.findFirst({ where: { systemKey } });
  if (!category) throw new Error(`Thiếu UserCategory cho ${systemKey}`);
  await prisma.$transaction(async (tx) => {
    const existing = await tx.user.findUnique({ where: { id: userId }, select: { code: true } });
    if (existing?.code) return; // idempotent
    const code = await generateUserCode(tx, category);
    await tx.user.update({ where: { id: userId }, data: { categoryId: category.id, code } });
  });
}
```
Trong `prisma/seed.ts`, sau khi tạo mỗi user (hoặc cuối file lặp qua tất cả user chưa có code), gọi `assignSeedUserCode(user.id, role, staffPosition)`.

- [ ] **Step 4: Chạy seed thử**
Run: `npm run db:reset` (xoá + migrate + seed). Expected: seed chạy xong, các user có `code` (kiểm: `npm run db:studio` xem cột code).

- [ ] **Step 5: Commit**
```bash
git add lib/users/seed-categories.ts prisma/seed.ts
git commit -m "feat(user-code): seed system categories + assign codes to seed users

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: Cắm sinh mã vào `createUserAction` (admin)

**Files:**
- Modify: `lib/admin/actions.ts` (`createUserAction`, dòng ~291–352)

- [ ] **Step 1: Sửa `createUserAction`**

Thay block tạo user (`const user = await prisma.user.create({...})` … tới trước `revalidatePath`) bằng:
```ts
  // Resolve category: ưu tiên categoryId từ form, fallback theo (role, staffPosition).
  const categoryIdRaw = (formData.get("categoryId") as string | null)?.trim() || null;
  const codeOverride = (formData.get("code") as string | null)?.trim() || null;

  const { systemKeyFor } = await import("@/lib/users/categories");
  const category = categoryIdRaw
    ? await prisma.userCategory.findUnique({ where: { id: categoryIdRaw } })
    : await prisma.userCategory.findFirst({ where: { systemKey: systemKeyFor(role as AllowedRole, staffPosition) } });
  if (!category) return { error: "Không tìm thấy loại tài khoản phù hợp" };

  if (codeOverride) {
    const dup = await prisma.user.findUnique({ where: { code: codeOverride } });
    if (dup) return { error: "Mã này đã được dùng" };
  }

  const hashed = await bcrypt.hash(password, 12);
  const { generateUserCode } = await import("@/lib/users/user-code-store");
  const user = await prisma.$transaction(async (tx) => {
    const code = codeOverride ?? (await generateUserCode(tx, category));
    return tx.user.create({
      data: {
        name, email, password: hashed,
        role: role as AllowedRole, staffPosition, supervisorId,
        sex: sex || null, phoneNumber, address,
        dateOfBirth: dobStr ? new Date(dobStr) : null,
        categoryId: category.id, code,
      },
    });
  });

  revalidatePath("/admin/users");
  redirect(`/admin/users/${user.id}`);
```
> Để import tĩnh ở đầu file thay vì `await import` nếu không gây vòng lặp import: `import { systemKeyFor } from "@/lib/users/categories"; import { generateUserCode } from "@/lib/users/user-code-store";`

- [ ] **Step 2: Typecheck**
Run: `npx tsc --noEmit` → No errors.

- [ ] **Step 3: Commit**
```bash
git add lib/admin/actions.ts
git commit -m "feat(user-code): generate code on admin createUserAction

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6: Seam staff `createStudentByStaffAction`

**Files:**
- Create: `lib/users/actions.ts`

- [ ] **Step 1: Implement seam (gate `student.create`)**

`lib/users/actions.ts`:
```ts
"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireSession } from "@/lib/auth/require";
import { can } from "@/lib/auth/permissions";
import { generateUserCode, findCategoryBySystemKey } from "./user-code-store";

export async function createStudentByStaffAction(formData: FormData) {
  const { user: actor, error } = await requireSession();
  if (error || !actor) return { error: error ?? "Chưa đăng nhập" };
  if (!(await can(actor, "student.create"))) return { error: "Không có quyền tạo học sinh" };

  const name = (formData.get("name") as string)?.trim();
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const password = (formData.get("password") as string)?.trim();
  if (!name || !email || !password) return { error: "Vui lòng điền đầy đủ" };
  if (password.length < 8) return { error: "Mật khẩu phải có ít nhất 8 ký tự" };

  if (await prisma.user.findUnique({ where: { email } })) return { error: "Email đã được dùng" };

  const hashed = await bcrypt.hash(password, 12);
  await prisma.$transaction(async (tx) => {
    const category = await findCategoryBySystemKey(tx, "STUDENT");
    if (!category) throw new Error("Thiếu UserCategory STUDENT");
    const code = await generateUserCode(tx, category);
    await tx.user.create({
      data: { name, email, password: hashed, role: "STUDENT", categoryId: category.id, code },
    });
  });

  revalidatePath("/staff/students");
  return { success: true };
}
```
> Kiểm tra chữ ký `requireSession`/`can` trong `lib/auth/require.ts` + `lib/auth/permissions.ts` (đọc trước) và chỉnh cho khớp (sync hay async, shape trả về).

- [ ] **Step 2: Typecheck** → `npx tsc --noEmit` → No errors.

- [ ] **Step 3: Commit**
```bash
git add lib/users/actions.ts
git commit -m "feat(user-code): staff createStudentByStaffAction gated by student.create

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 7: Sửa mã + category trong `updateUserAction` (+ AuditLog)

**Files:**
- Modify: `lib/admin/actions.ts` (`updateUserAction`, dòng ~354–386)

- [ ] **Step 1: Thêm xử lý code/category**

Trong `updateUserAction`, sau khi đọc các field hiện có, thêm:
```ts
  const codeRaw = (formData.get("code") as string | null)?.trim() || null;
  const categoryIdRaw = (formData.get("categoryId") as string | null)?.trim() || null;

  if (codeRaw) {
    const dup = await prisma.user.findFirst({ where: { code: codeRaw, NOT: { id: userId } } });
    if (dup) return { error: "Mã này đã được dùng bởi tài khoản khác" };
  }

  const before = await prisma.user.findUnique({ where: { id: userId }, select: { code: true } });
```
Và trong `data` của `prisma.user.update`, thêm: `code: codeRaw ?? undefined, categoryId: categoryIdRaw ?? undefined,`
Sau `update`, nếu `codeRaw && codeRaw !== before?.code`, ghi audit:
```ts
  if (codeRaw && codeRaw !== before?.code) {
    await prisma.auditLog.create({
      data: { actorId: (await requireAdmin()).user!.id, action: "USER_CODE_UPDATE",
              targetType: "User", targetId: userId, detail: `${before?.code ?? "∅"} → ${codeRaw}` },
    });
  }
```
> Đọc model `AuditLog` trong `prisma/schema/permission.prisma` để khớp tên field (actorId/action/targetType/targetId/detail). Chỉnh cho đúng schema thật.

- [ ] **Step 2: Typecheck** → No errors.

- [ ] **Step 3: Commit**
```bash
git add lib/admin/actions.ts
git commit -m "feat(user-code): edit code/category in updateUserAction with AuditLog

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 8: Bỏ tự đăng ký

**Files:**
- Delete: `app/(auth)/register/page.tsx`, `lib/auth/actions/register.ts`
- Modify: `app/(auth)/login/page.tsx`, `app/page.tsx`, `lib/auth/access.ts`, `lib/proxy/app-proxy.ts`

- [ ] **Step 1: Xoá trang + action**
```bash
git rm "app/(auth)/register/page.tsx" lib/auth/actions/register.ts
```

- [ ] **Step 2: Gỡ link/route**
- `app/(auth)/login/page.tsx`: xoá block `<Link href="/register">…Đăng ký ngay…</Link>` (dòng ~35–36) và câu dẫn "Chưa có tài khoản?" nếu có.
- `app/page.tsx`: đổi 2 CTA `<Link href="/register">` (dòng ~115, ~342) thành `href="/login"` và nhãn "Đăng nhập"; sửa câu mời (dòng ~338) khỏi ngụ ý tự đăng ký.
- `lib/auth/access.ts`: bỏ `"/register"` khỏi mảng `PUBLIC_ROUTES`.
- `lib/proxy/app-proxy.ts`: bỏ `pathname === "/register"` khỏi điều kiện redirect (dòng ~11).

- [ ] **Step 3: Verify build/lint**
Run: `npx tsc --noEmit && npx eslint "app/(auth)/login/page.tsx" "app/page.tsx" lib/auth/access.ts lib/proxy/app-proxy.ts`
Expected: No errors. Grep còn sót: `npx rg "/register|registerAction" app lib` → chỉ còn các chỗ "đăng ký" về Enrollment (không phải route).

- [ ] **Step 4: Commit**
```bash
git add -A
git commit -m "feat(auth): remove self-registration; only admin/staff create accounts

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 9: Admin UI — quản lý `UserCategory`

**Files:**
- Create: `lib/admin/user-category-actions.ts`, `app/(dashboard)/admin/user-categories/page.tsx`, `app/(dashboard)/admin/user-categories/CategoryManager.tsx`
- Modify: `lib/navigation/dashboard.ts` (thêm mục menu admin)

- [ ] **Step 1: Server actions CRUD**

`lib/admin/user-category-actions.ts` — `"use server"`, mỗi hàm gọi `requireAdmin()` rồi:
- `createCategoryAction(fd)`: đọc `label, prefix, includeYear(bool), padWidth(int)`; validate `prefix` không rỗng + chưa tồn tại; `prisma.userCategory.create` (`systemKey: null`); `revalidatePath("/admin/user-categories")`.
- `updateCategoryAction(id, fd)`: cập nhật `label/prefix/includeYear/padWidth/isActive/sortOrder`; nếu đổi `prefix` check unique.
- `deleteCategoryAction(id)`: chặn xoá nếu `users` đang trỏ tới (`count > 0`) hoặc `systemKey != null` (loại hệ thống) → trả lỗi; else delete.

- [ ] **Step 2: Page (server) + Client manager**

`page.tsx`: `await requirePageRole("ADMIN","OWNER")`; `const categories = await prisma.userCategory.findMany({ orderBy: { sortOrder: "asc" }, include: { _count: { select: { users: true } } } })`; render `<CategoryManager categories={categories} />`.
`CategoryManager.tsx` (`"use client"`): bảng liệt kê (label, prefix, includeYear, padWidth, số user, active) + form thêm/sửa (gọi actions qua `useTransition`). Mirror style modal của `AddUserForm.tsx`.

- [ ] **Step 3: Menu** — trong `lib/navigation/dashboard.ts`, thêm item `{ href: "/admin/user-categories", label: "Loại tài khoản & mã", icon: … }` vào nhóm admin (theo cấu trúc `NAV_BY_HOME` hiện có; đọc file trước).

- [ ] **Step 4: Verify** → `npx tsc --noEmit && npx eslint "app/(dashboard)/admin/user-categories/**" lib/admin/user-category-actions.ts`.

- [ ] **Step 5: Commit**
```bash
git add "app/(dashboard)/admin/user-categories" lib/admin/user-category-actions.ts lib/navigation/dashboard.ts
git commit -m "feat(user-code): admin UI to manage UserCategory

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 10: Form tạo/sửa user — chọn Category + ô Code

**Files:**
- Modify: `app/(dashboard)/admin/users/AddUserForm.tsx`, `app/(dashboard)/admin/users/[id]/UserForms.tsx`, `app/(dashboard)/admin/users/page.tsx` + `[id]/page.tsx` (truyền `categories` xuống)

- [ ] **Step 1: Truyền categories vào form**

Trong page server tương ứng: `const categories = await prisma.userCategory.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } })` rồi truyền prop `categories` vào `<AddUserForm>` / form sửa.

- [ ] **Step 2: Thêm field vào `AddUserForm.tsx`**

Mở rộng props: `{ cbdtsCandidates, categories }` với `categories: { id: string; label: string; prefix: string }[]`. Sau block Email+Password, thêm:
```tsx
<div className="grid grid-cols-2 gap-3">
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">Loại / Mã</label>
    <select name="categoryId" defaultValue="" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
      <option value="">— Tự động theo vai trò —</option>
      {categories.map((c) => (
        <option key={c.id} value={c.id}>{c.label} ({c.prefix})</option>
      ))}
    </select>
  </div>
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">Mã (tùy chọn)</label>
    <input name="code" type="text" placeholder="Để trống = tự sinh" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
  </div>
</div>
```
`createUserAction` (Task 5) đã đọc `categoryId` + `code`.

- [ ] **Step 3: Tương tự cho form sửa** (`UserForms.tsx`): thêm `categoryId` select (defaultValue = user.categoryId hiện tại) + `code` input (defaultValue = user.code). `updateUserAction` (Task 7) đã xử lý.

- [ ] **Step 4: Verify** → `npx tsc --noEmit`.

- [ ] **Step 5: Commit**
```bash
git add "app/(dashboard)/admin/users"
git commit -m "feat(user-code): category + code fields on user create/edit forms

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 11: Danh sách user — cột Mã + tìm theo mã

**Files:**
- Modify: `app/(dashboard)/admin/users/page.tsx` (bảng), query users (trong page hoặc `lib/admin/queries.ts`)

- [ ] **Step 1: Query** — đọc nơi load danh sách user; trong filter `where.OR` của ô tìm kiếm (đang match name/email), thêm: `{ code: { contains: q, mode: "insensitive" } }`. `select`/`include` thêm `code: true` và `category: { select: { label: true } }`.

- [ ] **Step 2: Bảng** — thêm cột "Mã" (hiển thị `user.code ?? "—"`, font mono) trước hoặc sau cột Tên.

- [ ] **Step 3: Verify** → `npx tsc --noEmit`.

- [ ] **Step 4: Commit**
```bash
git add "app/(dashboard)/admin/users/page.tsx" lib/admin/queries.ts
git commit -m "feat(user-code): show code column + search users by code

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 12: Staff UI — trang tạo học sinh

**Files:**
- Create: `app/(dashboard)/staff/students/new/page.tsx`, `app/(dashboard)/staff/students/new/NewStudentForm.tsx`
- Modify: `app/(dashboard)/staff/students/page.tsx` (nút "+ Thêm học sinh" nếu có quyền)

- [ ] **Step 1: Page guard** — `page.tsx`: `const me = await requirePageSession();` rồi `if (!(await can(me, "student.create"))) redirect("/staff/students");` Render `<NewStudentForm />`.

- [ ] **Step 2: Form** — `NewStudentForm.tsx` (`"use client"`): các field name/email/password/sex/dob/phone/address; submit gọi `createStudentByStaffAction` (Task 6) qua `useTransition`; hiện lỗi/redirect `/staff/students` khi thành công. Mirror `AddUserForm` (bỏ phần role/position).

- [ ] **Step 3: Nút vào trang** — trong `staff/students/page.tsx`, nếu `can(me,"student.create")` thêm `<Link href="/staff/students/new">+ Thêm học sinh</Link>`.

- [ ] **Step 4: Verify** → `npx tsc --noEmit && npx eslint "app/(dashboard)/staff/students/new/**"`.

- [ ] **Step 5: Commit**
```bash
git add "app/(dashboard)/staff/students"
git commit -m "feat(user-code): staff page to create students

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 13: Settings — hiển thị mã (read-only)

**Files:**
- Modify: `app/(dashboard)/settings/page.tsx` (load `code`), `app/(dashboard)/settings/SettingsForms.tsx` (hiển thị)

- [ ] **Step 1:** Trong settings page, `select` thêm `code: true, category: { select: { label: true } }`; truyền xuống form.
- [ ] **Step 2:** Trong `SettingsForms.tsx`, ở khối hồ sơ, thêm dòng read-only: `Mã của bạn: <span className="font-mono">{code ?? "—"}</span>` (kèm label category). Không cho sửa.
- [ ] **Step 3: Verify** → `npx tsc --noEmit`.
- [ ] **Step 4: Commit**
```bash
git add "app/(dashboard)/settings"
git commit -m "feat(user-code): show own code in settings (read-only)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 14: Backfill script (DB đang chạy)

**Files:**
- Create: `scripts/backfill-user-codes.ts`
- Modify: `package.json` (thêm script `db:backfill-codes`)

- [ ] **Step 1: Script**

`scripts/backfill-user-codes.ts`:
```ts
import "dotenv/config";
import { prisma } from "@/lib/db/prisma";
import { seedSystemCategories } from "@/lib/users/seed-categories";
import { systemKeyFor } from "@/lib/users/categories";
import { generateUserCode } from "@/lib/users/user-code-store";

async function main() {
  await seedSystemCategories();
  // HS sắp theo createdAt để số thứ tự ổn định theo năm; loại khác cũng theo createdAt.
  const users = await prisma.user.findMany({
    where: { code: null },
    orderBy: { createdAt: "asc" },
    select: { id: true, role: true, staffPosition: true },
  });
  let done = 0;
  for (const u of users) {
    const systemKey = systemKeyFor(u.role, u.staffPosition);
    const category = await prisma.userCategory.findFirst({ where: { systemKey } });
    if (!category) { console.warn(`Bỏ qua ${u.id}: thiếu category ${systemKey}`); continue; }
    await prisma.$transaction(async (tx) => {
      const code = await generateUserCode(tx, category);
      await tx.user.update({ where: { id: u.id }, data: { categoryId: category.id, code } });
    });
    done++;
  }
  console.log(`✅ Backfill ${done}/${users.length} user`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: package.json** — thêm vào `scripts`: `"db:backfill-codes": "tsx scripts/backfill-user-codes.ts"`.

- [ ] **Step 3: Chạy thử** (trên DB dev có sẵn user chưa có mã): `npm run db:backfill-codes` → log số user được cấp; kiểm `db:studio`.

- [ ] **Step 4: Commit**
```bash
git add scripts/backfill-user-codes.ts package.json
git commit -m "feat(user-code): one-off backfill script for existing users

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Hoàn tất Plan 1

- [ ] **Verify tổng**: `npx tsc --noEmit` (sạch) · `npx vitest run` (toàn bộ pass) · `npm run db:reset` (seed chạy, user có code) · đăng nhập admin tạo thử 1 user (có mã) + 1 HS qua staff.
- [ ] Cập nhật spec status nếu cần.

**Plan 2 (seed lớn)** làm sau khi Plan 1 merge: dựng `prisma/seedContent.ts` quy mô vài trăm HS, lấp khoảng trống (RoomBooking/Occupancy conflict-free, FlashcardSession, Notification, aiFeedback…), `createMany` theo lô, RNG cố định.
