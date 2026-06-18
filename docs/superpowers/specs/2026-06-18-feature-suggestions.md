# Gợi ý tính năng (luồng C)

> Ngày: 2026-06-18. Định hướng tính năng **net-new** (ngoài roadmap §7 vốn đã hoàn thành phần lớn). Xếp theo mức độ bám hạt nhân **Assessment** và đòn bẩy giá trị/chi phí. Mỗi mục: *Vì sao · Tận dụng cái đã có · Effort.*

## Nhóm 1 — Mở rộng hạt nhân Assessment (ưu tiên cao nhất)

### C1. Lộ trình học theo năng lực (Learning Path)
Sau khi Assessment chốt `SubjectLevel`, hệ thống đề xuất & theo dõi lộ trình đưa HS đi WEAK→AVERAGE→GOOD→EXCELLENT (gợi ý Class/Course phù hợp level kế tiếp, mốc mục tiêu).
- **Vì sao:** CONTEXT mô tả sứ mệnh là "xếp lộ trình học sát thực lực", nhưng hiện chỉ có *chốt mức*, chưa có *lộ trình*. Đây là bước nối tự nhiên của hạt nhân.
- **Tận dụng:** `StudentSubjectLevel` (lịch sử), `Class.targetLevel`, `Course`. Lọc đề xuất giống `eligibility.ts`.
- **Effort:** Vừa–lớn (model `LearningPath`/`PathStep` + UI). **Giá trị cao nhất.**

### C2. Biểu đồ tiến bộ năng lực theo thời gian (Proficiency trend)
`StudentSubjectLevel` đã lưu lịch sử (`evaluatedAt`) nhưng UI chỉ lấy bản mới nhất. Vẽ timeline/line-chart mức năng lực từng môn cho CBĐT + Phụ huynh.
- **Vì sao:** Dữ liệu đã có sẵn, chỉ thiếu trực quan hoá; cho thấy *quỹ đạo* chứ không chỉ điểm hiện tại.
- **Tận dụng:** Query lịch sử có sẵn; thêm 1 component chart (không cần lib nặng).
- **Effort:** Nhỏ. **Quick win.**

### C3. Báo cáo định kỳ cho phụ huynh
Tổng hợp điểm danh + điểm Exam + mức năng lực + TB `SessionEvaluation` thành báo cáo (in-app, tuỳ chọn xuất PDF) gửi định kỳ.
- **Vì sao:** `/parent` hiện chỉ có "Con tôi" + "Lịch học"; báo cáo là thứ phụ huynh trung tâm dạy thêm cần nhất (giữ chân khách).
- **Tận dụng:** Mọi dữ liệu đã có; `Notification` để báo "có báo cáo mới".
- **Effort:** Vừa.

## Nhóm 2 — Vận hành & điều phối

### C4. Dashboard analytics cho Admin/Owner
KPI: phân bố HS theo level, tỉ lệ điểm danh trung bình, lớp sắp đầy/vắng, câu hỏi PENDING tồn, booking chờ duyệt.
- **Tận dụng:** Aggregate query trên dữ liệu hiện có; khu `/owner`, `/admin` đang khá mỏng.
- **Effort:** Vừa.

### C5. Nhắc lịch tự động (reminders)
Cron sinh `Notification` cho buổi học sắp diễn ra, **Exam sắp đến hạn** (`Exam.dueAt` đã có), buổi bù.
- **Tận dụng:** Hạ tầng `Notification` + deep-link đã đủ; chỉ thêm job định kỳ.
- **Effort:** Nhỏ–vừa.

### C6. Xuất dữ liệu (CSV/PDF)
Xuất danh sách lớp, bảng điểm, điểm danh, danh sách HS theo bộ lọc.
- **Effort:** Nhỏ mỗi báo cáo; làm dần.

## Nhóm 3 — Trải nghiệm & chất lượng

### C7. Tìm kiếm toàn cục (global search)
Ô tìm nhảy nhanh tới HS / lớp / đề / câu hỏi. Với 86 trang, điều hướng đang nặng.
- **Effort:** Vừa.

### C8. Nhập câu hỏi hàng loạt (bulk import)
Import Question từ Excel/CSV (kèm validate Topic theo môn+khối như `assertTopicExists`).
- **Vì sao:** Ngân hàng câu hỏi khó scale nếu nhập tay từng câu.
- **Effort:** Vừa.

### C9. Hoàn thiện AuditLog (kỹ thuật, gần với luồng A)
Ghi audit cho duyệt/từ chối booking, tạo lớp, phân HS (CONTEXT §2.3 ghi là "dự kiến, chưa ghi"). Hệ thống có dữ liệu HS nên truy vết là cần.
- **Effort:** Nhỏ.

## Khuyến nghị thứ tự
**C2 → C5 → C1 → C3 → C4** (quick wins lấy đà, rồi tính năng lõi lớn). C9 nên gộp vào luồng A. C7/C8/C6 làm xen kẽ khi rảnh.

> Đây là tài liệu định hướng để chọn, **không phải cam kết build**. Mỗi mục được chọn sẽ đi qua chu trình brainstorm → spec → plan riêng.
