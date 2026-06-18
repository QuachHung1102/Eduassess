# Luồng A — Correctness & Security Pass (thiết kế)

> Ngày: 2026-06-18 · Nhánh: `reform/a-correctness-security`
> Đây là luồng đầu của cuộc cải tổ (A→B→C→D). Mục tiêu: bịt lỗ hổng phân quyền, tăng khả năng chẩn đoán lỗi runtime, không thay đổi giao diện.

## Bối cảnh & vấn đề

1. **Broken access control (nghiêm trọng).** `app/(dashboard)/layout.tsx` chỉ chặn *đăng nhập* (`if (!session?.user) redirect("/login")`), **không** chặn *role*. Không có `middleware.ts` ở root. `ROUTE_ROLES`/`getAllowedRolesFor` (`lib/auth/access.ts`) được định nghĩa nhưng **không nằm trên đường đi của request** → là code chết. Chỉ ~25/86 trang `page.tsx` tự gọi `requirePageRole`/`requirePermission`. Hệ quả: một user đã đăng nhập (HS/PH/GV) gõ thẳng `/admin/users` xem được toàn bộ danh sách user (tên, email, mã, SĐT, role) — `getAdminUsers` (`lib/admin/queries.ts:92`) cũng không tự guard. Đây là OWASP A01.

2. **Lỗi runtime khó chẩn đoán.** Bug "gửi thông báo" được báo cáo nhưng đọc tĩnh `sendNotificationAction` + `targeting.ts` thấy logic đúng. Các server action hiện **nuốt lỗi runtime** thành thông báo chung hoặc để Next bắt → người vận hành không thấy nguyên nhân. Nghi vấn cao nhất: `auditLog.create({ actorId: sender.id })` ném lỗi FK khi `session.user.id` lệch bản ghi `User` (xem `resolveUserIdByRole`, `lib/auth/require.ts`).

## Phạm vi (iteration này)

- **A1 — Route role-gate tập trung (chính):** mọi trang trong khu đăng nhập được chặn theo role tại tầng *zone layout*, không phụ thuộc tác giả trang có nhớ guard hay không.
- **A2 — Hiện lỗi runtime + hardening AuditLog:** server action ghi log lỗi có ngữ cảnh + thông báo rõ hơn; bảo đảm `actorId` là id User thật.
- **A3 — Guardrail chống tái phát:** test bảo đảm mọi zone mới đều được gate.
- **D (kèm theo):** cập nhật `docs/context/platform.md` + ADR-0002.

**Ngoài phạm vi:** redesign UI (luồng B), tính năng mới (C), refactor không liên quan.

## A1 — Thiết kế route role-gate

**Cách tiếp cận đã chọn: zone `layout.tsx` guard, lấy role từ `ROUTE_ROLES`.**

Mỗi khu route bị giới hạn role có một `app/(dashboard)/<zone>/layout.tsx` gọi guard chung mới `requirePageZone(prefix)`; guard tra `ROUTE_ROLES[prefix]` rồi `requirePageRole(...roles)`. Một layout chặn **toàn bộ** trang con bên dưới → vá cả 86 trang trong một lần, dùng lại đúng seam `requirePageRole` đã có & đã test.

Vì sao không dùng `middleware.ts`: NextAuth v5 (beta) + Next 16 có breaking change; middleware chạy edge runtime, dễ sai một control bảo mật. Zone layout là server component thuần, idiomatic với codebase, ít rủi ro. (Có thể thêm middleware làm defense-in-depth ở luồng sau.)

**Phân loại zone** (theo `ROUTE_ROLES`):

| Zone | Roles | Loại |
|---|---|---|
| `/owner` | OWNER | role-gate |
| `/admin` | OWNER, ADMIN | role-gate |
| `/staff` | OWNER, ADMIN, STAFF | role-gate |
| `/teacher` | OWNER, ADMIN, TEACHER | role-gate |
| `/student` | OWNER, ADMIN, STUDENT | role-gate |
| `/parent` | OWNER, ADMIN, PARENT | role-gate |
| `/booking` | OWNER, STAFF, TEACHER | role-gate (ADMIN cố ý bị loại) |
| `/notifications`, `/settings`, `/dashboard` | mọi role đăng nhập | shared — chỉ cần auth (đã có ở dashboard layout) |

`ROUTE_ROLES` trở thành **nguồn sự thật** được dùng thật (hết code chết). Per-page `requirePermission`/`requirePageRole` giữ nguyên để gate mịn hơn theo tính năng (vd `/admin/role-permissions` cần `permission.manage`).

**Thay đổi code:**
- `lib/auth/page-guard.ts`: thêm `requirePageZone(prefix)`.
- 7 file mới `app/(dashboard)/{owner,admin,staff,teacher,student,parent,booking}/layout.tsx` — pass-through, chỉ guard.
- Không sửa các trang hiện có; không đổi UI.

## A2 — Hiện lỗi runtime + hardening

- `sendNotificationAction`: bọc phần ghi DB trong `try/catch`, `console.error("[notify] ...", err)` kèm ngữ cảnh (sender, target.kind, count), trả `{ error: "Gửi thông báo thất bại, thử lại sau." }` thay vì để lỗi nổ.
- `actorId` AuditLog: dùng id đã xác thực là User thật. Trước mắt log rõ; nếu xác nhận lệch id sẽ chuyển sang resolve. (Không over-fix khi chưa có lỗi thực.)

## A3 — Guardrail test

`tests/auth/route-coverage.test.ts`:
1. Mọi thư mục zone trong `app/(dashboard)/` hoặc nằm trong `ROUTE_ROLES`, hoặc thuộc allowlist shared (`notifications`, `settings`, `dashboard`).
2. Mọi zone role-gate (có trong `ROUTE_ROLES`, trừ `/booking` nếu cần) có file `layout.tsx`.

→ Thêm zone mới mà quên gate ⇒ test đỏ.

## Kiểm thử & nghiệm thu

- `npx vitest run` xanh (gồm test mới).
- `npx tsc --noEmit` sạch; `npm run lint` sạch.
- Thủ công (mô tả, chạy ở bước verify): đăng nhập STUDENT, vào thẳng `/admin/users` → bị đẩy về `/student`.

## Kế hoạch thực thi (commit nhỏ)

1. `requirePageZone` + test access map.
2. 7 zone layout + guardrail test.
3. A2 instrumentation notification.
4. Cập nhật platform.md + ADR-0002.

## ADR-0002 (tóm tắt, sẽ ghi riêng)

**Quyết định:** Enforce phân quyền theo route tại *zone layout*, lấy role từ `ROUTE_ROLES`; per-page guard là lớp gate mịn bổ sung, không phải lớp duy nhất.
