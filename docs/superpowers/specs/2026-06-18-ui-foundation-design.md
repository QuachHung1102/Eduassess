# Luồng B — Nền tảng UI & responsive (thiết kế)

> Ngày: 2026-06-18 · Nhánh: `reform/a-correctness-security`.
> **Phát hiện cốt lõi:** dự án KHÔNG thiếu design system — nó đã có sẵn hệ **"clay" + theme token "Ngũ Hành"** nhưng **áp dụng không nhất quán**. Luồng B = đưa các trang lệch về chuẩn + thêm quy ước responsive, *không* vẽ lại bản sắc.

## Hiện trạng (đo được)

- **Token theme** dùng rộng: `var(--foreground)` 427 lần, `var(--surface*)` 144 lần. Hệ clay: `clay-card` (9 file), `focus-ring-soft` (16), `press-feedback-soft` (12), `hover-card-soft` (10).
- **Nhưng gray thô cũng tràn lan:** `bg-white` 187 lần, `text-gray-900` 186 lần → ~một nửa bề mặt **bỏ qua theme** (đổi theme chỉ đổi sidebar, content vẫn trắng/xám).
- **Responsive yếu:** chỉ 18 `xl:` + 1 `2xl:` toàn dự án; `globals.css` 1698 dòng nhưng chỉ 2 `@media`. Trang form hay cap `max-w-2xl` → trống màn lớn; bảng nhiều cột không có nhánh mobile → vỡ/scroll ngang.
- Type & shell **đã tốt:** Be Vietnam Pro + Geist Mono; sidebar đã responsive (drawer mobile + collapse desktop). **Giữ nguyên.**

## Hệ thiết kế chuẩn (canonical — chốt để áp đồng loạt)

- **Màu:** token theme (`--background --foreground --surface --surface-strong --primary --primary-dark --border-soft …`); muted = `color-mix(in srgb, var(--foreground) 60%, transparent)`. **Không** dùng `bg-white`/`text-gray-*` cho bề mặt/chữ chính.
- **Type:** display+body = Be Vietnam Pro (300–800), data/mono = Geist Mono. Thang: h1 `text-xl sm:text-2xl font-bold`, nhãn `text-xs uppercase tracking-wide`.
- **Bề mặt:** `clay-card` cho panel; tương tác thêm `hover-card-soft focus-ring-soft press-feedback-soft`.
- **Layout/responsive (phần thêm mới):**
  - Dải **StatCard** đầu trang dữ liệu (2 cột mobile → 4–6 cột lg) để lấp chiều rộng màn lớn.
  - **Bảng:** `hidden md:block` cho bảng + `md:hidden` danh sách thẻ cho mobile (không scroll ngang).
  - Trang form: dùng 2 cột từ `lg` (form + panel ngữ cảnh/preview) thay vì cap hẹp giữa màn.
  - Header trang qua `PageHeader` dùng chung.

```
Trang dữ liệu (md+)                 Mobile (<md)
┌─ PageHeader ──────────────┐       ┌ PageHeader ┐
│ [Stat][Stat][Stat][Stat]  │       │ [Stat][Stat]│
│ ┌───────── bảng ────────┐ │       │ [Stat][Stat]│
│ │ th  th  th  th  th    │ │       │ ┌─ thẻ HS ─┐ │
│ │ ──────────────────────│ │       │ └──────────┘ │
│ └───────────────────────┘ │       │ ┌─ thẻ HS ─┐ │
└───────────────────────────┘       └──────────────┘
```

- **"Signature":** không thêm chi tiết loè loẹt — điểm nhận diện là **tính nhất quán** + dải accent `--primary` của theme. Kỷ luật, không trang trí thừa.

> Quyết định cần nêu riêng (chưa làm): có ép toàn bộ content theo theme token không, hay giữ một số vùng trung tính? Pass đầu ưu tiên cấu trúc/responsive; tô màu theme mở rộng dần.

## Primitive đã dựng

- `components/layout/PageHeader.tsx` — header chuẩn (icon + title + subtitle + actions), theme-aware.
- `components/ui/StatCard.tsx` — mở rộng: `href` thành tuỳ chọn (ô thống kê tĩnh khi không điều hướng), giữ tương thích 3 trang đang dùng.

## Trang mẫu (proof) — `/staff/overview`

Chuyển từ gray thô → chuẩn: `PageHeader` + dải 4 StatCard (tổng HS / đã đánh giá / điểm danh chung / TB đánh giá buổi) + bảng `md+`/thẻ mobile + bề mặt token. Verify: tsc sạch · build 0 lỗi · eslint sạch.

## Rollout (sau khi duyệt mẫu)

Theo cụm, mỗi cụm 1 commit nhỏ: (1) các trang `/staff/*` bảng-dày → (2) `/admin/*` → (3) `/teacher/*` → (4) form pages (2 cột màn lớn) → (5) `/student` & `/parent`. Mỗi cụm: thay gray→token, thêm responsive bảng/lưới, dùng `PageHeader`.
