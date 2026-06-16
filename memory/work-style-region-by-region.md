---
name: work-style-region-by-region
description: Cách làm việc ưa thích — theo vùng chức năng, cả kiến trúc lẫn UI, tuần tự
metadata:
  type: feedback
---

Khi cải thiện codebase, user chọn làm **theo từng vùng chức năng**, mỗi vùng làm **cả 2 trục**: deepening kiến trúc (module thuần + seam) *và* chỉnh lại UI/UX cho gọn/hợp lý — rồi mới sang vùng khác. Thực hiện **tuần tự từng bước nhỏ**.

**Why:** User nói "nhiều phần đã xong nhưng giao diện còn xấu và chưa tối ưu, hợp lý" → muốn vừa làm sạch kiến trúc vừa polish UI cùng lúc trong một vùng.

**How to apply:** Mỗi bước nhỏ, verify ngay (`npx tsc --noEmit`, eslint) trước khi sang bước kế. Giữ hành vi khi refactor (đổi return shape phải sửa cả client). Vùng đầu đã làm: Course/Lesson (tách `lib/courses/store.ts`, auth qua `requireRole`, thay confirm/prompt bằng `components/ui/ConfirmDialog`). Lưu ý: `app/globals.css` có tầng remap class Tailwind cứng → màu tự theo theme, đừng vội "sửa màu hardcoded". Liên quan [[prefers-vietnamese]].
