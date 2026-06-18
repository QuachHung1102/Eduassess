# 0002 — Enforce phân quyền route tại zone layout (ROUTE_ROLES là nguồn sự thật)

**Status: Đã triển khai (2026-06-18).** Guard chung `requirePageZone(prefix)`
(`lib/auth/page-guard.ts`) + 6 file `app/(dashboard)/{owner,admin,staff,teacher,student,parent}/layout.tsx`.
Guardrail `tests/auth/route-coverage.test.ts`. Nhánh `reform/a-correctness-security`.

## Context

Khu đăng nhập `app/(dashboard)/` chỉ được bảo vệ ở `layout.tsx` gốc bằng **kiểm tra
đăng nhập** (`if (!session?.user) redirect("/login")`) — **không** chặn theo role.
Không có `middleware.ts`. `ROUTE_ROLES` / `getAllowedRolesFor` (`lib/auth/access.ts`)
đã được định nghĩa nhưng **không nằm trên đường đi của request** (code chết). Chỉ
~25/86 trang `page.tsx` tự gọi `requirePageRole`/`requirePermission`.

Hệ quả: một user đã đăng nhập (HS/PH/GV) gõ thẳng URL của khu khác — vd `/admin/users`
— có thể xem dữ liệu không thuộc vai trò mình (danh sách user: tên, email, mã, SĐT,
role), vì cả trang lẫn query (`getAdminUsers`) đều không tự guard. Đây là Broken
Access Control (OWASP A01). Lỗ hổng là **drift giữa thiết kế (§2.2: "mọi page.tsx
qua page-guard") và hiện thực** — không phải lỗi thiết kế.

## Decision

Enforce phân quyền route ở **tầng zone layout**, không trông cậy mỗi trang tự nhớ guard:

- Mỗi khu nhà của role (`ROLE_HOME`) có một `layout.tsx` gọi `requirePageZone("/<zone>")`.
- `requirePageZone` tra `ROUTE_ROLES[prefix]` rồi `requirePageRole(...roles)` → **`ROUTE_ROLES`
  trở thành nguồn sự thật được dùng thật**. Một layout phủ mọi trang con.
- Mô hình bảo vệ 3 lớp: (1) auth ở dashboard layout, (2) role-gate theo khu ở zone
  layout, (3) permission-gate mịn tại page (giữ nguyên).
- `/booking` **cố ý KHÔNG role-gate**: gate theo permission `booking.create` ngay tại
  page, vì quyền này có thể cấp cho nhiều role (kể cả Parent). Role-gate sẽ chặn nhầm.

## Considered alternatives

**`middleware.ts` đọc role từ JWT** — một chokepoint duy nhất, không thể quên theo khu.
Bị loại (ở iteration này) vì: NextAuth v5 (beta) + Next 16 có breaking change; middleware
chạy edge runtime → một control bảo mật sai sót sẽ nguy hiểm; AGENTS.md cảnh báo phải đọc
docs Next 16 trước. Zone layout là server component thuần, dùng lại seam `requirePageRole`
đã có & đã test → ít rủi ro hơn. Có thể bổ sung middleware làm defense-in-depth sau.

**Để mỗi page tự gọi `requirePageRole`** — hiện trạng. Bị loại: dễ quên (đã quên ở ~70%
trang); không có guardrail; lặp code.

Đánh đổi: thêm 1 lần đọc JWT/khu (rẻ, không chạm DB). Thêm khu role mới phải thêm 1
`layout.tsx` — convention được guardrail test ép tuân thủ.
