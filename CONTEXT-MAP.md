# Eduassess — CONTEXT MAP

Eduassess là nền tảng **đánh giá năng lực học sinh theo chuẩn đầu ra** cho một trung tâm đào tạo đa môn học. Hạt nhân của hệ thống là việc **Assessment** — đo năng lực hiện tại của từng học sinh trên từng môn — để cán bộ đào tạo (CBĐT) xếp lớp và lộ trình học sát với thực lực. Xung quanh hạt nhân đó là các công cụ hỗ trợ: quản lý lớp & lịch học, khóa học online tự học, ngân hàng câu hỏi & bài kiểm tra, flashcard, lịch rảnh, phòng học & đặt phòng, thông báo.

> Repo này dùng **tài liệu domain đa ngữ cảnh (multi-context)**. File này là **bản đồ**: đọc nó trước, rồi đọc ngữ cảnh ứng với vùng code bạn sắp chạm. Tài liệu domain dùng cho agent khi đọc/sửa code.

## Cách đọc

1. **Luôn đọc `docs/context/platform.md` trước.** Nó chứa nền tảng dùng chung: tech stack, nguyên tắc kiến trúc (pure module + seam, page guard, permission, routing), roles, mô hình dữ liệu, và **Từ điển thuật ngữ (Glossary)** — ngôn ngữ domain chung cho mọi ngữ cảnh.
2. Rồi đọc ngữ cảnh ứng với vùng bạn sửa (bảng dưới).
3. Khi output của bạn nhắc tới một khái niệm domain (tên issue, hypothesis, tên test, tên biến), dùng đúng thuật ngữ trong Glossary ở `platform.md` — đừng trôi sang synonym mà glossary ghi `_Avoid_`.

## Ba ngữ cảnh

| Ngữ cảnh | Vùng phụ trách | File |
|---|---|---|
| **Platform (dùng chung)** | Hạ tầng & ngôn ngữ domain: tech stack, kiến trúc, roles, mô hình dữ liệu, Glossary, hạ tầng thông báo, `/notifications`, `/settings` | `docs/context/platform.md` |
| **Back-office** | Khu nhân sự: `/owner`, `/admin`, `/staff`, `/teacher`. Assessment, lớp & lịch, ngân hàng câu hỏi/đề, khóa học (soạn/duyệt), phòng & đặt phòng, vòng đời nghiệp vụ, roadmap | `docs/context/back-office.md` |
| **Student-facing** | Khu người học: `/student`, `/parent`. Làm bài, flashcard, tự học Course, xem lịch lớp, khai lịch rảnh, phụ huynh theo dõi | `docs/context/student-facing.md` |

## Đánh số mục (giữ nguyên xuyên file)

Tài liệu gốc đánh số §1–§8; khi tách vẫn **giữ số cũ** để mọi tham chiếu chéo ("xem §5", "xem §2.3"…) còn đúng:

- §1 Tech stack · §2 Kiến trúc · §3 Roles · §5 Mô hình dữ liệu · §8 Glossary → `platform.md`
- §4 Bản đồ route → **tách**: `/owner /admin /staff /teacher` ở `back-office.md`, `/student /parent` ở `student-facing.md`
- §6 Vòng đời & workflow · §7 Roadmap → `back-office.md` (student-facing có bản rút gọn §6' phần liên quan người học)

## ADR

Quyết định kiến trúc ở `docs/adr/`:

- **ADR-0001** — RoomSchedule denormalized (`docs/adr/0001-room-schedule-denormalized.md`, đã triển khai).
- **ADR-0002** — Route role-gate tại zone layout, `ROUTE_ROLES` là nguồn sự thật (`docs/adr/0002-route-role-gate-zone-layout.md`, đã triển khai).
