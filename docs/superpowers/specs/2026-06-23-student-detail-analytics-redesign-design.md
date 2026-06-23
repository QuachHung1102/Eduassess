# Spec: Cải tiến khu Học sinh của CBĐT — trang chi tiết phân tích theo môn + mã định danh

- **Ngày:** 2026-06-23
- **Trạng thái:** Đã chốt qua brainstorming, chờ review trước khi lập plan
- **Phạm vi:** Khu staff `/staff/students*`. Hiển thị mã định danh, thêm tìm kiếm, và thiết kế lại trang chi tiết HS thành dạng tab + 4 biểu đồ phân tích theo môn. **KHÔNG** đụng framework phân quyền, **KHÔNG** xây trang quản lý `UserCategory`.

## 1. Bối cảnh & mục tiêu

CBĐT cần một trang chi tiết HS đủ sâu để **theo dõi & phân tích kết quả và năng lực của học sinh theo từng giai đoạn** — đồng bộ với dữ liệu bài kiểm tra (Exam), điểm danh và đánh giá-buổi đã có sẵn nhưng chưa được trực quan hóa. Đồng thời khắc phục hai khoảng lệch giữa context và code (xem §2).

Mục tiêu:
1. Hiện **Mã định danh** (`User.code`) ở khu staff (danh sách + chi tiết) — hiện mới chỉ có ở `/admin/*` và `/settings`.
2. Thêm **tìm kiếm** vào `/staff/students` (HS phụ trách của CBĐT) và mở rộng tìm theo mã ở `/staff/students/all`.
3. **Thiết kế lại** `/staff/students/[id]`: bố cục **chia tab**, phần phân tích **tổ chức theo môn, theo thời gian**, thêm 4 biểu đồ (SVG thuần).
4. **Cập nhật tài liệu domain** cho khớp thực tế (hệ thống mã + redesign).

## 2. Đối chiếu context ↔ code (phát hiện)

| # | Phát hiện | Trạng thái |
|---|---|---|
| G1 | Hệ thống **Mã định danh** (`User.code` + `UserCategory` + `UserCodeCounter`) đã build & dùng ở `/admin/users` (cột Mã), form sửa user, `/settings`, picker thông báo — nhưng **context (`platform.md §5`, `back-office.md §4`) không hề ghi**. | Lệch tài liệu |
| G2 | Khu staff **không hiện mã**: `/staff/students`, `/staff/students/all`, `/staff/students/[id]`. | Lệch UI |
| G3 | `/staff/students` (HS phụ trách CBĐT) **không có bộ lọc/tìm kiếm** nào. (`/staff/students/all` có lọc tên/email/môn/mức nhưng **không** tìm theo mã.) | Thiếu tính năng |
| G4 | Trang chi tiết HS **chưa "đồng bộ với các bài test"**: không hiển thị điểm `ExamAttempt`, tỉ lệ điểm danh, hay đánh giá-buổi (`SessionEvaluation`) — dù dữ liệu đã có trong DB & seed. Chỉ có 1 biểu đồ `ProficiencyTrend`. | Thiếu tính năng |
| G5 | Bố cục chi tiết HS hiện nhồi **ma trận lịch rảnh** (rộng, 7×15) vào nửa cột `lg:grid-cols-2` chung với form đánh giá → chật. | Lỗi bố cục |

## 3. Quyết định (từ brainstorming)

| Vấn đề | Quyết định |
|---|---|
| Trục "giai đoạn" của phân tích | **Theo môn, theo thời gian** — mỗi môn một khối, dữ liệu xếp theo mốc thời gian. Khớp bản chất Assessment (đo theo Subject) và `ProficiencyTrend` hiện có. |
| Bố cục trang chi tiết | **Chia tab**: header cố định + 4 tab (Tổng quan · Năng lực theo môn · Lịch rảnh · Đánh giá). |
| Biểu đồ | **4 loại, đều SVG thuần** (không thêm thư viện): Đường điểm Exam · Quỹ đạo năng lực (tái dùng) · Tỉ lệ điểm danh · Radar đánh giá-buổi 3 chiều. |
| Tầng dữ liệu | **Pure module + seam** (§2.1): module thuần `lib/students/analytics.ts` (TDD) + query nạp dữ liệu. |
| Tìm kiếm `/staff/students` | **Lọc phía client** (danh sách đã giới hạn theo advisor) theo tên/email/mã. |
| Tìm kiếm `/staff/students/all` | Mở rộng `q` (server) khớp thêm `code`; thêm cột Mã. |
| Phân quyền | **Giữ nguyên**. Gate đánh giá `canEvaluateStudent` không đổi. |

## 4. Tầng dữ liệu

### 4.1 Module thuần `lib/students/analytics.ts` (TDD, không chạm DB)

Nhận các mảng "thô" (đã select tối thiểu) và trả về cấu trúc đã gom theo môn + tổng quan. Hợp đồng:

```ts
type ExamScorePoint = { score: number; submittedAt: Date; title: string; kind: "EXAM" | "QUIZ" };
type AttendanceTally = { present: number; late: number; absent: number; excused: number; total: number };
type EvalAvg = { performance: number | null; diligence: number | null; comprehension: number | null; n: number };

type SubjectAnalytics = {
  subjectId: string;
  subjectName: string;
  examScores: ExamScorePoint[];   // sắp tăng dần theo submittedAt
  attendance: AttendanceTally;
  evalAvg: EvalAvg;               // trung bình từng chiều trên các SessionEvaluation của môn
};

type StudentAnalytics = {
  bySubject: Map<string, SubjectAnalytics>; // key = subjectId
  overall: {
    examCount: number;             // số lượt đã nộp + đã chấm
    examAvgScore: number | null;
    attendance: AttendanceTally;
    attendanceRate: number | null; // (present + late) / total
  };
};

function buildStudentAnalytics(input: {
  examAttempts: { score: number; submittedAt: Date; exam: { title: string; kind: "EXAM" | "QUIZ"; subjectId: string; subjectName: string } }[];
  attendances: { status: "PRESENT" | "LATE" | "ABSENT" | "EXCUSED"; subjectId: string; subjectName: string }[];
  sessionEvals: { performance: number | null; diligence: number | null; comprehension: number | null; subjectId: string; subjectName: string }[];
}): StudentAnalytics
```

Quy ước:
- **attendanceRate** & "present" trong tổng quan: `PRESENT` và `LATE` đều tính là có mặt (đồng bộ `getMyStudentsOverview` hiện có). Donut vẫn vẽ tách 4 trạng thái.
- **evalAvg**: trung bình mỗi chiều bỏ qua giá trị `null`; `n` = tổng số ô (chiều) có giá trị; nếu chiều không có dữ liệu → `null`.
- **examAvgScore**: trung bình `score` các lượt; rỗng → `null`.
- Môn chỉ xuất hiện trong `bySubject` khi có ≥1 dữ liệu exam/điểm danh/đánh giá-buổi.

### 4.2 Query `getStudentAnalytics(studentId)` (trong `lib/classes/queries.ts`)

Nạp song song rồi gọi `buildStudentAnalytics`:
- `prisma.examAttempt.findMany({ where: { studentId, submittedAt: { not: null }, score: { not: null } }, select: { score, submittedAt, exam: { select: { title, kind, subjectId, subject: { select: { name } } } } }, orderBy: { submittedAt: "asc" } })`.
- `prisma.attendance.findMany({ where: { studentId }, select: { status, session: { select: { class: { select: { subjectId, subject: { select: { name } } } } } } } })`.
- `prisma.sessionEvaluation.findMany({ where: { studentId }, select: { performance, diligence, comprehension, session: { select: { class: { select: { subjectId, subject: { select: { name } } } } } } } })`.
- Map các hàng (điểm danh/đánh giá-buổi nối môn qua `session.class.subjectId`) về hợp đồng input ở §4.1.

> **Mức năng lực** (`levelTrend`/`currentLevel`) **không** tính trong module này — tái dùng `levelHistory` từ `getStudentDetail` (đã trả về kèm `subject` + `evaluatedAt`) và lọc theo môn ở UI. Tránh nạp trùng `StudentSubjectLevel`.

### 4.3 Bổ sung select `code`

- `getMyStudents` (xem §7.1): thêm `code` vào `select` của student.
- `getStudentDetail`: thêm `code` vào `select`.
- `getAllStudentsFiltered`: thêm `code` vào `select` **và** vào nhánh `OR` của `q` (`{ code: { contains: q, mode: "insensitive" } }`).

## 5. Component (SVG thuần, `components/students/`, không thêm lib)

| Component | Loại | Mô tả |
|---|---|---|
| `ProficiencyTrend` (đã có) | render | Tái dùng; lọc `levelHistory` còn 1 môn rồi truyền vào (component tự gom theo môn nên truyền mảng 1 môn là ra 1 đường). |
| `ExamScoreTrend` (mới) | render | Line-chart 0–100 theo `submittedAt` cho 1 môn; điểm tô màu theo ngưỡng năng lực (`STUDENT_LEVEL_HEX` qua quy tắc <50/50–79/80–89/≥90); tooltip `<title>` tên đề + điểm + ngày. ViewBox co giãn như `ProficiencyTrend`. |
| `AttendanceDonut` (mới) | render | Donut 4 trạng thái (PRESENT/LATE/ABSENT/EXCUSED) + nhãn tỉ lệ ở giữa; màu cố định; chú thích bên cạnh. |
| `SessionEvalRadar` (mới) | render | Radar tam giác 3 trục (năng lực/chuyên cần/tiếp thu), thang 1–5; nếu thiếu chiều → vẽ phần có dữ liệu, ghi "—" cho chiều rỗng. |
| `SubjectAnalyticsPanel` (mới) | render | Nhận analytics 1 môn + `levelHistory` lọc theo môn; xếp 4 biểu đồ **cạnh nhau**, tự xuống hàng khi hẹp (grid responsive). |
| `StudentDetailTabs` (mới) | client | Quản lý tab đang chọn; render header (luôn hiện) + thân theo tab. Nhận toàn bộ dữ liệu đã fetch từ server (props), không tự fetch. |

## 6. Trang chi tiết `/staff/students/[id]`

`page.tsx` (server) fetch song song `getStudentDetail(id)` + `getStudentAnalytics(id)` + `getSubjectsList()` + tính `canEvaluate`, rồi truyền vào `<StudentDetailTabs>`.

**Header (ngoài tab, luôn hiện):** avatar · tên · **Mã** (`code`, mono, "—" nếu null) · email · giới tính/ngày sinh/SĐT · CBĐT phụ trách.

**Tab 1 — Tổng quan:**
- Lớp đang học (giữ danh sách hiện có).
- Dải thống kê nhanh: số môn đã đánh giá · số Exam đã làm · điểm TB Exam · tỉ lệ điểm danh tổng.
- `AttendanceDonut` tổng (mọi môn) + chip mức năng lực hiện tại từng môn (từ `levelHistory`).

**Tab 2 — Năng lực theo môn:**
- Bộ chọn môn = hợp các môn xuất hiện trong (`levelHistory` ∪ `analytics.bySubject`) — môn có Exam nhưng chưa đánh giá vẫn hiện. UI pills (dropdown nếu nhiều).
- `SubjectAnalyticsPanel` cho môn đang chọn: ProficiencyTrend · ExamScoreTrend · SessionEvalRadar · AttendanceDonut (của môn).
- Ca rỗng: môn chưa có dữ liệu → thông báo nhẹ thay vì biểu đồ trống.

**Tab 3 — Lịch rảnh:** `AvailabilityMatrix` **full-width** (`onSave = saveStudentAvailabilityAction.bind(null, id)`), gỡ khỏi grid 2 cột.

**Tab 4 — Đánh giá:** `EvaluateForm` nếu `canEvaluate` (giữ nguyên gate + thông báo khi không phụ trách) + Lịch sử đánh giá (`levelHistory`).

## 7. Trang danh sách

### 7.1 `/staff/students` (CBĐT)
- Tách phần lưới card thành **client component** nhận `students` + lọc tức thì theo ô tìm kiếm (tên/email/**mã**, không phân biệt hoa thường, bỏ dấu cách thừa).
- Mỗi card hiện thêm **Mã** (mono, dưới email). `PageHeader.subtitle` giữ đếm tổng; hiển thị thêm số kết quả khớp khi đang lọc.

### 7.2 `/staff/students/all` (CBDTS)
- Thêm cột **Mã** vào bảng (mono).
- Tìm kiếm `q` khớp thêm `code` (đã ở §4.3). Placeholder đổi thành "Nhập tên, email hoặc mã…".

## 8. Cập nhật context

- **`platform.md §5`** (User & tổ chức): bổ sung `User.code` (Mã định danh, `@unique`) + `UserCategory` / `UserCodeCounter` (loại + bộ đếm cấp mã theo năm). Trỏ tới spec `2026-06-17-user-code-system-design.md`.
- **`platform.md §8` Glossary**: thêm mục **"Mã định danh (code) / UserCategory"** — định nghĩa + `_Avoid_` (Username, Mã số, ID khi nói về cuid).
- **`back-office.md §4`**: cập nhật `/staff/students` (có tìm kiếm + hiện mã) và `/staff/students/[id]` (bố cục tab + 4 biểu đồ phân tích theo môn).
- **`back-office.md §7.4`**: ghi đợt cải tiến UX trang chi tiết HS đã hoàn thành (đối chiếu & gỡ khỏi roadmap nếu có).

## 9. Test

- **TDD `lib/students/analytics.ts`** (theo precedent `tests/classes/eligibility.test.ts`, `lib/users/user-code.ts`):
  - Gom đúng theo `subjectId`; nhiều môn; môn chỉ-Exam / chỉ-điểm-danh / chỉ-đánh-giá.
  - `attendanceRate`: PRESENT+LATE = có mặt; tổng 0 → `null`.
  - `evalAvg`: bỏ qua `null`; chiều rỗng → `null`; `n` đúng.
  - `examAvgScore` rỗng → `null`; sắp `examScores` tăng theo `submittedAt`.
- Component biểu đồ: render thuần, không test bắt buộc (project không test component nặng) — đảm bảo không crash với mảng rỗng.

## 10. Giả định / mặc định

- Mã chỉ **hiển thị/tìm** ở khu staff (không sửa mã ở đây — sửa vẫn ở `/admin/users/[id]`).
- Điểm danh & đánh giá-buổi quy về môn qua `Session → Class.subjectId` (Session không giữ subjectId trực tiếp).
- Chỉ tính `ExamAttempt` đã `submittedAt` và đã có `score`.
- Lọc client ở `/staff/students` chấp nhận được vì danh sách giới hạn theo advisor (vài chục HS); `/staff/students/all` vẫn lọc server (tới 300 bản ghi).

## 11. Ngoài phạm vi (đã chốt)

- Không tích hợp `UserCategory` vào phân quyền (đã ghi ở spec mã định danh Phase 2).
- Không xây trang quản lý `UserCategory` cho staff.
- Không thêm thư viện biểu đồ — giữ SVG thuần.
- Không đổi luồng đánh giá / `EvaluateForm` (chỉ chuyển vị trí sang tab).
