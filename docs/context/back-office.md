# Ngữ cảnh: Back-office (`/owner`, `/admin`, `/staff`, `/teacher`)

> Khu nghiệp vụ nội bộ: Owner, Admin, Staff (CBĐT/CBDTS/NVLT…), Teacher. Trọng tâm là **Assessment** (hạt nhân) + quản lý lớp & lịch, ngân hàng câu hỏi/đề, khóa học (soạn/duyệt), phòng & đặt phòng.
>
> **Đọc trước:** `platform.md` (tech stack, kiến trúc, roles, mô hình dữ liệu §5, **Từ điển §8**). Khu người học ở `student-facing.md`. Bản đồ tổng: `CONTEXT-MAP.md`.

Trạng thái: ✅ đã có · 🚧 một phần / cần sửa · 📋 roadmap (xem §7).

---

## 4. Bản đồ chức năng theo vùng route (khu back-office)

### `/owner` — Nhân viên công nghệ
- Tổng quan · Nhật ký (`/owner/audit`, `audit.view`) · Hệ thống/debug (`/owner/system`, `system.debug`) · lối tắt sang khu Admin.

### `/admin` — Quản trị
- Tài khoản (`/admin/users`) · Phân quyền vai trò (`/admin/role-permissions`) · Phòng (`/admin/rooms`) · Lớp học (`/admin/classes`) · Môn học (`/admin/subjects`) · Đề kiểm tra (`/admin/exams`) · Flashcard (`/admin/flashcards`) · Ngân hàng câu hỏi (`/admin/questions`, duyệt PENDING→APPROVED) · Khóa học online (`/admin/courses`, duyệt) · Gửi thông báo (`/admin/notifications`, `notification.send`) · Quản lý permission (`/admin/permissions`).

### `/staff` — Nhân viên (CBĐT/CBDTS/NVLT…)
- Đặt phòng (`/booking`) · Duyệt đặt phòng (`/booking/approve`, NVLT) · Phòng (`/staff/rooms`, lịch sử dụng phòng `/staff/rooms/schedule`) · **Tiến độ học sinh** (`/staff/overview` — tổng quan mức năng lực + điểm danh + đánh giá-buổi của HS được phân) · Học sinh (`/staff/students` — HS được phân cho CBĐT, `/staff/students/[id]`) · **Tất cả học sinh** (`/staff/students/all` — lọc toàn bộ HS để mở hồ sơ & đánh giá, gate `student.view_all`; lối vào của CBDTS) · **Giáo viên** (`/staff/teachers`, `/staff/teachers/[id]` — CBĐT khai/sửa lịch rảnh GV hộ, gate `class.create`) · Phân công CBDT (`/staff/students/assign`, CBDTS) · Lớp học (`/staff/classes`, `/staff/classes/new`, `/staff/classes/[id]`, sessions, makeup…).

### `/teacher` — Giáo viên
- Ngân hàng câu hỏi (`/teacher/question-bank`, create, edit, `ai-suggest`) · Đề kiểm tra (`/teacher/exams`, create, `[id]/results`) · Lớp học (`/teacher/classes`, sessions, điểm danh) · Khóa học online (`/teacher/courses`, lessons) · **Lịch rảnh** (`/teacher/schedule`) · Đặt phòng.

> Khu người học (`/student`, `/parent`) và route dùng chung (`/notifications`, `/settings`): xem `student-facing.md` và `platform.md`.

---

## 6. Vòng đời & workflow cốt lõi

> Liệt kê theo vòng đời: **phân HS → đánh giá ban đầu → tạo lớp → phân công → dạy & đánh giá theo buổi → bù buổi**.

- **Phân học sinh:** CBDTS phân Student cho CBĐT (`StudentAdvisor`) → CBĐT mới được **đánh giá** HS đó (enforce qua `canEvaluateStudent`). Đây là bước đầu của vòng đời. *Quyết định thiết kế:* giới hạn theo phân công **chỉ áp cho đánh giá năng lực**; danh sách HS khả thi khi **tạo lớp cố ý KHÔNG lọc theo advisor** (mọi HS đúng môn/level đều hiện) để CBĐT xếp lớp linh hoạt — **không phải gap, không cần siết**.
- **Đánh giá năng lực (Assessment):** CBĐT chọn mức cho HS trên 1 Subject qua `EvaluateForm` (`/staff/students/[id]`), ghi `StudentSubjectLevel` (lưu lịch sử, `evaluatedById`). Seam: `evaluateStudentLevelAction`. **CBĐT chỉ đánh giá HS được phân công** cho mình (`canEvaluateStudent`; OWNER/ADMIN/CBDTS bỏ qua) — form bị ẩn nếu không phụ trách. **CBDTS** không nhận HS theo advisor nên vào qua `/staff/students/all` (lọc toàn bộ HS) rồi mở hồ sơ để đánh giá bất kỳ HS nào. **Test đầu vào hiện làm OFFLINE** ⇒ đánh giá **ban đầu** bắt buộc CBĐT nhập tay; chính mức này là đầu vào cho **bộ lọc năng lực khi xếp lớp** (HS chưa có mức → nhãn "Chưa đánh giá"). Quyết định vẫn thủ công nhưng form có **panel tham chiếu theo môn** (`getStudentSubjectReferenceAction`): điểm TB Exam + tỉ lệ điểm danh + trung bình `SessionEvaluation` (3 chiều) + **gợi ý mức** theo ngưỡng <50 / 50–79 / 80–100. Mức đề xuất (`suggestedLevel`) được **điền sẵn tự động** (ưu tiên điểm Exam theo ngưỡng <50/50–79/80–89/≥90, fallback trung bình đánh giá-buổi) — CBĐT chỉ xác nhận/chỉnh. Ngoài gợi ý theo ngưỡng (tức thì), có nút **"Phân tích bằng AI"** (on-demand, `getAiLevelSuggestionAction` → `suggestProficiencyLevel`) trả mức + lý do tổng hợp để CBĐT cân nhắc. Ghi `StudentSubjectLevel` + `AuditLog` cùng transaction. Mức: `WEAK` / `AVERAGE` / `GOOD` / `EXCELLENT`. Là **tính năng cốt lõi**, đầu vào cho xếp lớp.
- **Tạo lớp ràng buộc:** CBĐT vẽ Khung lịch tuần trên lưới ngày×giờ → hệ thống **lọc cứng** GV/phòng/HS khả thi (Availability cho người + RoomSchedule cho phòng + Session đã có); chỉ bên khả thi mới hiện. Logic thuần `lib/classes/scheduling.ts`, query lọc `lib/classes/eligibility.ts`, kiểm tra lại tại server action trước khi tạo. **Phòng chọn theo TỪNG khung tuần** (`getEligibleRoomsBySlot` trả phòng trống riêng cho mỗi khung — T2 và T4 có thể khác phòng); mỗi buổi sinh ra kế thừa phòng của khung tương ứng. GV/phòng/HS chọn qua **modal tìm-kiếm** (`PickEntityModal`, `components/staff/`) thay vì dropdown — danh sách HS/GV lớn không nhét vừa dropdown. Danh sách HS khả thi gồm cả nhóm đúng `targetLevel` (nhãn "Phù hợp", lên đầu) lẫn nhóm **chưa từng được đánh giá môn đó** (nhãn "Chưa đánh giá", `level: null`) — hiển thị đồng thời để CBĐT tự chọn, không ẩn nhóm nào.
- **Phân công lớp:** xếp GV/HS vào lớp tại trang chi tiết qua bảng chọn tìm-kiếm (HS đúng môn+đúng trình độ mục tiêu gắn nhãn "Phù hợp", đẩy lên đầu). Một lần xác nhận phân nhiều người + gửi noti từng người.
- **Đánh giá sau buổi học:** trong quá trình học, GV (người dạy buổi / GV của lớp / advisor; OWNER/ADMIN/CBDTS bỏ qua) chấm mỗi HS 3 chiều 1–5 (năng lực/chuyên cần/tiếp thu) ở trang buổi học, ghi `SessionEvaluation` qua `saveSessionEvaluationsAction`. Trung bình theo môn nuôi panel tham chiếu của Assessment (vòng lặp về bước đánh giá).
- **Buổi bù (makeup):** đánh dấu Session diễn ra/nghỉ; buổi nghỉ → nhập lý do → `CANCELLED`; hệ thống đề xuất ngày bù theo Khung lịch tuần, kiểm tra trùng phòng+GV rồi nối Session mới kế thừa phòng/GV gốc.
- **Câu hỏi:** Teacher tạo → PENDING; Admin tạo/duyệt → APPROVED. Trường "Chủ đề" là option-list theo (môn+khối), server kiểm tra `topicName` thuộc đúng `subjectId+gradeId`.
- **Khóa học:** Teacher soạn DRAFT → gửi PENDING → Admin duyệt PUBLISHED → ARCHIVED.
- **Đặt phòng:** Teacher/Staff/CBĐT/Owner/Parent tạo (Student **không**, và **Admin bị chặn** các key booking), bắt buộc `reason` → NVLT (hoặc người có `booking.approve`) duyệt → APPROVED. Xung đột kiểm trên bảng `room_occupancies` (`findRoomConflict`, `lib/rooms/store.ts`) — bắt **cả buổi học của lớp lẫn booking đã duyệt** — check lúc tạo + lúc duyệt; duyệt thì ghi block chiếm phòng trong cùng transaction, hai người duyệt đồng thời bị EXCLUDE constraint chặn (xem §5).

---

## 7. Roadmap — lộ trình theo giai đoạn

> Phần này mô tả công việc **chưa hoàn thành / sắp xây**, xếp theo giai đoạn: giai đoạn trước là nền cho giai đoạn sau, trong cùng giai đoạn thứ tự bullet = thứ tự ưu tiên. Đánh dấu để agent phân biệt với hiện trạng. Khi một mục được build xong, chuyển mô tả lên §4–6 và xóa khỏi đây.

### 7.1 Giai đoạn 1 — Nền tảng lịch phòng (gần xong)

> ✅ Đã triển khai & ghi ở §5 / §8: **RoomSchedule / RoomOccupancy** (ADR-0001) và **RoomLayoutImage**. Còn lại một mục tùy chọn:

- 📋 *(speculative — chưa rõ nhu cầu thực tế, cân nhắc bỏ)* **Lưới xếp lịch hàng loạt:** lưới phòng × khung giờ 07:00–22:00 cho phép *chọn* phòng+giờ cho nhiều lớp/buổi trong một luồng. Khác hai thứ đã có: `SessionScheduler` (chọn cho *một* buổi lẻ) và `/staff/rooms/schedule` (chỉ *xem*). Đọc occupancy qua `getOccupanciesBetween`.

### 7.2 Giai đoạn 2 — Hoàn thiện hạt nhân Assessment (cốt lõi đã xong)

Assessment là tính năng cốt lõi (§6). **Đã xong toàn bộ phần cốt lõi:** GV đánh giá sau mỗi buổi học (`SessionEvaluation`); panel tham chiếu gom điểm Exam/điểm danh/đánh giá-buổi; **đề xuất mức bán tự động** (`suggestedLevel` điền sẵn theo quy tắc ngưỡng, CBĐT xác nhận) + ghi `AuditLog`; mức **`EXCELLENT`** (nhãn/màu tập trung ở `lib/constants/labels.ts`); **Trang tổng quan CBĐT** (`/staff/overview`). *(Test đầu vào làm OFFLINE nên mức **ban đầu** vẫn do CBĐT nhập tay — auto chỉ tinh chỉnh khi đã có điểm/đánh giá trong quá trình học.)* Còn lại các mục mở rộng/tùy chọn:

- ✅ **Đề xuất AI** — nút "Phân tích bằng AI" ở `EvaluateForm` gọi `getAiLevelSuggestionAction` → `suggestProficiencyLevel` (on-demand, kiểm soát chi phí); trả mức + lý do, CBĐT bấm "Dùng mức này" để áp. Quy tắc ngưỡng vẫn là gợi ý mặc định tức thì.
- 📋 *(mở rộng)* **Trang tổng quan CBĐT** (`/staff/overview`) hiện liệt kê HS được phân + mức năng lực + điểm danh + TB đánh giá-buổi; có thể bổ sung tiến độ Course / lọc theo lớp nếu cần.

### 7.3 Giai đoạn 3 — Thông báo & tiện ích vận hành (đã xong)

> ✅ Hoàn thành & ghi ở §4–6/§8: thông báo `SYSTEM` (`/admin/notifications`), CBĐT khai/sửa lịch rảnh GV hộ (`/staff/teachers`), phân biệt Quiz qua `Exam.kind` (không tách model riêng — tái dùng hạ tầng Exam).

### 7.4 Cải thiện liên tục

- 🔧 Rà soát lại các vùng UX/UI/logic chưa tốt để thiết kế lại (ghi nhận trong ADR-0001).
