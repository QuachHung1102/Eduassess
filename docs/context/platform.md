# Ngữ cảnh: Platform (dùng chung)

> Nền tảng kỹ thuật + ngôn ngữ domain dùng chung cho **mọi** ngữ cảnh. Luôn đọc file này **trước** khi đọc `back-office.md` hoặc `student-facing.md`. Bản đồ tổng: `CONTEXT-MAP.md` (gốc repo).

Eduassess là nền tảng **đánh giá năng lực học sinh theo chuẩn đầu ra** cho một trung tâm đào tạo đa môn học. Hạt nhân của hệ thống là việc **Assessment** — đo năng lực hiện tại của từng học sinh trên từng môn — để cán bộ đào tạo (CBĐT) xếp lớp và lộ trình học sát với thực lực. Xung quanh hạt nhân đó là các công cụ hỗ trợ: quản lý lớp & lịch học, khóa học online tự học, ngân hàng câu hỏi & bài kiểm tra, flashcard, lịch rảnh, phòng học & đặt phòng, thông báo.

> Tài liệu này là **bản đồ kiến trúc + từ điển domain** dùng cho agent khi đọc/sửa code. Đọc nó trước khi chạm vào một vùng chức năng. Khi output của bạn nhắc tới một khái niệm domain (tên issue, hypothesis, tên test, tên biến), dùng đúng thuật ngữ trong phần **Từ điển** cuối file — đừng trôi sang synonym mà glossary ghi `_Avoid_`.

---

## 1. Tech stack

| Lớp | Công nghệ | Ghi chú |
|---|---|---|
| Framework | **Next.js 16.2.1** (App Router) | ⚠️ Bản này có breaking change so với kiến thức huấn luyện — đọc `node_modules/next/dist/docs/` trước khi viết code Next. Heed deprecation notices. |
| UI | **React 19.2**, **TailwindCSS 4** | `@tailwindcss/typography` cho nội dung markdown |
| Auth | **NextAuth 5 (beta)** | Strategy **JWT**, provider **Credentials** (email + password, bcrypt). Xem §2.2. |
| ORM/DB | **Prisma 7** + **PostgreSQL** (`@prisma/adapter-pg`) | Schema chia nhiều file trong `prisma/schema/` |
| Lưu media | **Cloudinary** (`next-cloudinary`) | avatar, thumbnail khóa học, ảnh flashcard, video bài giảng, (sắp tới) ảnh sơ đồ phòng |
| AI | **Anthropic SDK** (`@anthropic-ai/sdk`) | `lib/ai/index.ts` — model **`claude-opus-4-6`**, env `CLAUDE_API_KEY`. Ba hàm: `suggestQuestions` (gợi ý 3–5 câu trắc nghiệm), `generateExamFeedback` (nhận xét bài làm, cache vào `ExamAttempt.aiFeedback`), `suggestProficiencyLevel` (đề xuất mức năng lực từ điểm Exam + điểm danh + đánh giá-buổi, on-demand). |
| Toán/Markdown | KaTeX, mathlive, react-markdown + remark/rehype | render đề toán, nội dung bài giảng |
| Icon | FontAwesome | dùng trong nav |

Scripts chính (`package.json`): `dev`, `build`, `db:generate`, `db:seed` (`prisma/seed.ts`), `db:migrate`, `db:push`, `db:studio`.

---

## 2. Nguyên tắc kiến trúc (đọc kỹ — áp dụng cho mọi feature)

### 2.1 Pure module + Seam

Mô hình lặp lại xuyên suốt codebase. Một **module thuần** (`lib/<domain>/store.ts` hoặc tương đương) chứa toàn bộ logic nghiệp vụ và mọi đường đọc/ghi DB của một domain. Một **seam** (server action trong `lib/<role>/actions/*.ts`) bọc module đó để xử lý các thứ phụ thuộc ngữ cảnh request: **auth, kiểm tra permission, revalidate, redirect**.

- Module nhận **context object** quyết định chính sách, không tự đọc session. Ví dụ điển hình: tham số `ownerId` — truyền `userId` để giới hạn theo người tạo (Teacher chỉ sửa của mình), truyền `undefined` để thao tác trên mọi bản ghi (Admin/Owner).
- Cùng một module phục vụ nhiều role; sự khác biệt chính sách nằm ở context truyền vào, **không** phân nhánh `if role === ...` bên trong module.
- Chi tiết kỹ thuật (Cloudinary cleanup, đánh lại thứ tự, find-or-create Topic, đóng gói options) là **private** trong module.

Các module đã theo pattern này — dùng làm mẫu khi viết feature mới:

| Module thuần | Seam(s) | Ghi chú |
|---|---|---|
| `lib/questions/store.ts` | `lib/teacher/actions/question.ts`, `lib/admin/actions.ts` | `createQuestion({createdById, status})`, `updateQuestion({ownerId, updateMeta})`, `listQuestions(filter, ctx)`, `assertTopicExists(subjectId, gradeId, topicName)` (validate Topic option-list, dùng chung 2 seam) |
| `lib/flashcards/store.ts` | `lib/teacher/actions/flashcard.ts`, `lib/admin/flashcard-actions.ts` | `ownerId` giới hạn theo người tạo |
| `lib/availability/store.ts` | `lib/student/actions.ts`, `lib/teacher/actions/schedule.ts`, seam CBĐT xem-sửa hộ | interface thống nhất `subject: { kind: "student" \| "teacher"; id }` |
| `lib/classes/scheduling.ts` (logic thuần) + `lib/classes/eligibility.ts` (query lọc) | `lib/classes/actions.ts` | logic sinh Session & lọc khả thi tách khỏi action |
| `lib/rooms/store.ts` | `lib/classes/actions.ts`, `lib/booking/actions.ts` | RoomSchedule denormalized (ADR-0001): `syncSessionOccupancy`/`syncBookingOccupancy` ghi block trong cùng transaction với hành động gốc; `findRoomConflict`/`getOccupanciesBetween` cho mọi đường đọc lịch phòng; `isOverlapViolation` bắt lỗi EXCLUDE constraint |

**Khi thêm feature có ghi DB:** tạo/đặt logic trong module thuần, để auth + revalidate ở seam. Đừng viết Prisma trực tiếp trong server action nếu domain đã có module.

### 2.2 Page guard

Mọi Server Component (`page.tsx`) cần đăng nhập vào qua seam chung `lib/auth/page-guard.ts` thay vì lặp `auth()` + `redirect("/login")`:

- `requirePageSession()` → trả `SessionUserBase` (đẩy `/login` nếu chưa đăng nhập).
- `requirePageRole(...roles)` → thêm chặn theo Role (đẩy về `ROLE_HOME[role]` nếu sai vai trò).
- Khác với `requireSession`/`requireRole` trong `lib/auth/require.ts` (dành cho **server action**, trả `{ user, error }` để tự xử lý).
- Kiểm tra quyền sở hữu đặc thù từng trang (tác giả Course, người tạo Question…) vẫn nằm tại chính trang đó **sau** guard.
- `resolveUserIdByRole(sessionUser, role)` (cũng trong `lib/auth/require.ts`) → tra id `User` thực sự khớp `role` mong muốn: thử `session.user.id` trước, nếu role không khớp thì fallback tra theo `email`, trả `null` nếu không có bản ghi nào khớp. Dùng ở các seam Student/Teacher tự thao tác trên dữ liệu của chính mình (vd `saveMyAvailabilityAction`, `getMyTeacherAvailability`) để chống lệch giữa `session.user.id` và bản ghi `User` thật.

### 2.3 Permission framework (table-driven)

Phân quyền lưu trong DB, ADMIN bật/tắt qua UI mà không cần deploy. Trung tâm: `lib/auth/permissions.ts` (`can`, `canAny`, `getUserPermissionKeys`).

Quy tắc `can(user, key)`:
1. `OWNER` → **mọi quyền** (bypass DB; `getUserPermissionKeys` trả sentinel `"*"`).
2. `ADMIN` → mọi quyền **trừ** nhóm bị chặn (`ADMIN_BLOCKED_KEYS`: `booking.create`, `booking.create_for_other`, `booking.approve` — admin không tham gia luồng đặt phòng).
3. User khác → **union** quyền theo `Role` (`RolePermission`) **+** theo `StaffPosition` nếu role = `STAFF` (`PositionPermission`).
4. Kết quả cache trong process **5 phút**; gọi `invalidatePermissionCache()` sau khi sửa matrix.

- **Source of truth của key:** `lib/auth/permission-keys.ts` (`PERMISSIONS`). Quy ước key `<domain>.<action>`. Thêm feature có phân quyền ⇒ thêm key ở đây **+ cập nhật seed**.
- Hành động nhạy cảm ghi `AuditLog` (model `AuditLog`). **Hiện đã ghi:** sửa phân quyền (`lib/admin/permission-actions.ts`), đánh giá năng lực (`evaluateStudentLevelAction`, cùng transaction), gửi thông báo hệ thống (`sendNotificationAction` trong `lib/notifications/actions.ts`). **Dự kiến (chưa ghi):** duyệt/từ chối booking, tạo lớp, phân học sinh.

### 2.4 Routing & navigation

- Route group: `app/(auth)/` (login, register, forgot/reset password, security-questions-reset) và `app/(dashboard)/` (toàn bộ khu đăng nhập).
- Mỗi role có **home zone**: `ROLE_HOME` trong `lib/auth/access.ts` (`/owner`, `/admin`, `/staff`, `/teacher`, `/student`, `/parent`). STAFF dùng chung `/staff`, sub-tab ẩn/hiện theo permission.
- `ROUTE_ROLES` map prefix → role được phép (OWNER/ADMIN truy cập được phần lớn prefix để giám sát). `PUBLIC_ROUTES` không cần đăng nhập.
- Menu sidebar: `lib/navigation/dashboard.ts` (`NAV_BY_HOME` + `dashboardNavItemsFor()`), tự lọc theo role + permission.

### 2.5 Quy ước chung

- **UI tiếng Việt**, code/identifier tiếng Anh dùng đúng thuật ngữ glossary.
- Schema Prisma chia theo domain trong `prisma/schema/` (1 file/nhóm model). Enum tập trung ở `enums.prisma`.
- Giờ trong tuần lưu dạng chuỗi `"HH:mm"`; ngày buổi học dùng `@db.Date`.
- Thang giờ thống nhất **07:00–22:00, mỗi ô 1 tiếng** — dùng chung cho `TimeSlot` (Availability), lưới xếp buổi học và lưới xếp phòng.

---

## 3. Roles & con người

| Role (enum) | UI | Vai trò |
|---|---|---|
| `OWNER` | Nhân viên công nghệ (NVCN) | Developer/system owner. Mọi quyền. Khu `/owner` (audit, debug hệ thống). |
| `ADMIN` | Quản trị | Quản trị hệ thống. Mọi quyền trừ luồng booking. Khu `/admin`. |
| `STAFF` | Nhân viên | Nghiệp vụ, chức danh xác định bởi `StaffPosition`. Khu `/staff`. |
| `TEACHER` | Giáo viên | Dạy lớp, tạo Course/Exam/Question/Flashcard. Khu `/teacher`. |
| `STUDENT` | Học sinh | Đối tượng được đánh giá. Làm bài, học Course, luyện flashcard, khai lịch rảnh. Khu `/student`. |
| `PARENT` | Phụ huynh | Liên kết ≥1 Student (`ParentStudent`), theo dõi tiến độ & nhận noti. Khu `/parent`. |

**`StaffPosition`** (chỉ khi role = STAFF): `NVSALE` (tư vấn), `NVLT` (lễ tân — duyệt đặt phòng), `CBNK` (ngoại khóa), `CBDH` (du học), **`CBDT`** (cán bộ đào tạo — vai trò domain trung tâm), **`CBDTS`** (super CBDT, quản & phân công CBDT qua `supervisorId` và `StudentAdvisor`).

Quan hệ người: `User.supervisorId` (CBDTS → CBDT), `ParentStudent` (phụ huynh ↔ học sinh, có `isPrimary`), `StudentAdvisor` (CBDTS phân Student cho CBDT — quyết định CBDT nào được **đánh giá** HS đó; enforce qua `canEvaluateStudent`, OWNER/ADMIN/CBDTS bỏ qua giới hạn).

> **Tự đăng ký** (`/register`) **chỉ tạo tài khoản `STUDENT`** (`registerAction` hard-code role); GV/STAFF/PARENT do admin tạo (`/admin/users`).

---

## 5. Mô hình dữ liệu (tổng quan)

Schema ở `prisma/schema/*.prisma`. Nhóm theo domain:

### User & tổ chức (`user.prisma`, `permission.prisma`)
`User` (role + staffPosition + supervisorId + hồ sơ) · `ParentStudent` · `Permission` / `RolePermission` / `PositionPermission` · `AuditLog`.

### Phân loại nội dung (`subject_grade_topic.prisma`)
`Subject` (`canAddQuestions` để admin khóa thêm câu hỏi) · `Grade` (1–12, tier `SchoolLevel`) · `Topic` (thuộc 1 Subject + 1 Grade).

### Đánh giá năng lực & lớp học (`class.prisma`)
- `Class` (subject, `advisorId`=CBĐT, `mode`, `targetLevel`, `sessionCount`, `startDate`, `status`) — độc lập hoàn toàn với Course.
- `ClassWeeklySlot` (khung lịch tuần: dayOfWeek + start/end + `roomId` nullable — **mỗi khung tuần một phòng riêng**, đóng dấu lên các Session sinh ra; GV vẫn theo Session).
- `ClassTeacher` (n-n GV↔lớp) · `ClassEnrollment` (HS trong lớp, `ACTIVE`/`DROPPED`).
- `ClassSession` (buổi cụ thể: date, time, mode, roomId nullable, teacherId, `SessionStatus`).
- `Attendance` (`PRESENT`/`ABSENT`/`LATE`/`EXCUSED`).
- `SessionEvaluation` (GV đánh giá HS sau 1 buổi: `performance`/`diligence`/`comprehension` thang 1–5 nullable + note, unique `(sessionId, studentId)`) — đầu vào cho Assessment.
- `StudentAvailability` / `TeacherAvailability` (matrix 7 ngày × TimeSlot × `AvailabilityMode`).
- `StudentSubjectLevel` (**lịch sử** đánh giá; lấy hiện tại = ORDER BY `evaluatedAt` DESC LIMIT 1) · `StudentAdvisor` (CBDTS phân HS cho CBĐT).

### Kiểm tra & câu hỏi (`exam.prisma`, `question.prisma`)
`Question` (options JSON 4 đáp án, `difficulty`, `status` PENDING→APPROVED, `isUnivExam`, topic+subject) · `Exam` (gắn 1 Class, `kind` EXAM/QUIZ, duration, showAnswer, allowRetake, dueAt) · `ExamQuestion` (thứ tự) · `ExamAttempt` (score 0–100, `aiFeedback` cache) · `ExamAnswer`.

### Khóa học online (`course.prisma`)
`Course` (`CourseStatus` DRAFT→PENDING→PUBLISHED→ARCHIVED, isFree) · `Lesson` (markdown + video, order) · `Enrollment` · `LessonProgress` · `CourseReview` (1–5 sao) · `CourseQA` (thread câu hỏi/trả lời).

### Flashcard (`flashcard.prisma`)
`FlashcardSet` (subject+grade+topicName+difficulty) · `FlashcardCard` (ảnh + caption + order) · `FlashcardSession` (phiên luyện của HS).

### Phòng & đặt phòng (`booking.prisma`, `room_schedule.prisma`)
`Room` (capacity, isActive, 1:1 `RoomLayoutImage`) · `BookingReason` (label + priority) · `RoomBooking` (requester/bookedFor/reviewer, start/end, `BookingStatus`) · `RoomLayoutImage` (ảnh sơ đồ vị trí phòng: `url` + `publicId` Cloudinary, 1:1 với Room) · `RoomOccupancy` (bảng `room_occupancies` — xem dưới).

> ✅ **RoomSchedule đã là bảng denormalized** (ADR-0001 đã triển khai, model `RoomOccupancy` trong `prisma/schema/room_schedule.prisma`): hợp nhất 2 nguồn — ClassSession (SCHEDULED/COMPLETED, có roomId) + RoomBooking (APPROVED) — mỗi block giữ FK về nguồn (`sessionId`/`bookingId`, onDelete Cascade nên xóa lớp/phòng/booking tự dọn block). **Mọi đường ghi** đi qua module thuần `lib/rooms/store.ts` (`syncSessionOccupancy`, `syncBookingOccupancy`, `occupyForSessions`) trong **cùng transaction** với hành động gốc; **mọi đường check/đọc lịch phòng** (`checkSessionConflict`, seam booking, `getEligibleRoomsBySlot`, `getAvailableRooms`, `getRoomUsageForDate`) đọc bảng này qua `findRoomConflict`/`getOccupanciesBetween`. Tầng cuối chống đua tranh: EXCLUDE constraint `room_occupancies_no_overlap` (btree_gist, khoảng nửa mở `[startsAt, endsAt)`) — DB từ chối hai block giao nhau trên cùng phòng, seam bắt `isOverlapViolation()` để trả lỗi thân thiện. Check **GV trùng giờ** vẫn query `ClassSession` (GV không phải phòng). Nghi drift: `npm run db:rebuild-occupancy` (dựng lại từ nguồn), `npm run db:check-occupancy` (đếm + kiểm constraint).

### Hệ thống (`notification.prisma`, `password_reset.prisma`, `security_question.prisma`)
`Notification` (`NotificationType`, readAt, href deep-link) · reset mật khẩu · câu hỏi bảo mật.

---

## Dùng chung (route)

- `/notifications` · `/settings` — dùng cho mọi role (xem §4 chi tiết theo khu ở `back-office.md` và `student-facing.md`).

---

## 8. Từ điển thuật ngữ (Glossary)

Quy ước: mỗi mục là định nghĩa chuẩn + `_Avoid_` (synonym không được dùng). Khi cần một khái niệm chưa có ở đây → hoặc bạn đang bịa ngôn ngữ project không dùng (xem lại), hoặc có gap thật (ghi nhận cho `/grill-with-docs`).

### Roles & people

**CBDT** — Cán bộ đào tạo: nhân viên trung tâm theo dõi, đánh giá và xếp lộ trình học cho nhóm HS được phân công. Vai trò domain trung tâm, không chỉ là chức danh tổ chức.
_Avoid_: Advisor, Mentor, Tutor, Cố vấn, Cố vấn học tập, StudentAdvisor

**CBDTS** — Super CBDT: CBDT cấp cao, quản lý và phân công công việc cho các CBDT thường.
_Avoid_: Senior Advisor, Lead CBDT

**Student** — Người học đăng ký tại trung tâm; đối tượng chính được đánh giá, xếp lớp, theo dõi. UI: "Học sinh".
_Avoid_: Learner, Pupil, Trainee, User (khi nói về vai trò học sinh)

**Teacher** — Người dạy lớp hoặc tạo khóa học/đề thi/câu hỏi. UI: "Giáo viên".
_Avoid_: Tutor, Instructor, GV (trong code)

**Parent** — Phụ huynh liên kết ≥1 Student để theo dõi tiến độ & nhận thông báo. UI: "Phụ huynh".
_Avoid_: Guardian, PH (trong code)

### Học tập

**Class** — Lớp học do trung tâm tổ chức với danh sách Session cụ thể, có điểm danh và GV trực tiếp dạy. OFFLINE/ONLINE/HYBRID. UI: "Lớp học". Hoàn toàn độc lập với Course.
_Avoid_: Cohort, Group, Batch, Khóa, Course

**Course** — Khóa học online tự học, gồm các Lesson (markdown + video) theo thứ tự, giáo trình riêng biệt với Class. Vòng đời draft → pending → published → archived. UI: "Khóa học online".
_Avoid_: Class, Curriculum, Khóa học (nếu không có chữ "online")

**Lesson** — Một bài học trong Course; đơn vị nội dung HS tự học và đánh dấu hoàn thành. UI: "Bài giảng".
_Avoid_: Chapter, Unit, Module, Bài học (khi nói buổi học của Class — dùng Session)

**Session** — Một buổi học cụ thể của Class: ngày, giờ, phòng, GV và bảng điểm danh. UI: "Buổi học".
_Avoid_: Class (khi nói 1 buổi đơn lẻ), Meeting, Lesson, Lịch học

**Phân công lớp** (workflow) — Xếp người vào lớp ngay tại trang chi tiết qua hai bảng chọn tìm-kiếm (GV / HS). Gõ tìm theo tên/email, tích nhiều người; HS phù hợp (đúng môn + đúng trình độ mục tiêu) gắn nhãn "Phù hợp" và đẩy lên đầu. Một lần xác nhận phân nhiều người + gửi thông báo từng người. Dùng chung component `PeoplePickerModal` (`components/staff/PeoplePickerModal.tsx`) và seam `enrollStudentsAction`/`assignClassTeachersAction` (`lib/classes/actions.ts`) ở cả `/staff/classes/[id]` lẫn `/admin/classes/[id]`. UI: "Phân giáo viên" / "Thêm học sinh".
_Avoid_: Assign panel, Bulk picker, Multi-select dialog

**ClassWeeklySlot** — Mẫu lịch học lặp theo tuần của Class: mỗi dòng là (thứ + giờ bắt đầu + giờ kết thúc + `roomId` riêng của khung đó). **Mỗi khung tuần có thể ở một phòng khác nhau** (T2 phòng A, T4 phòng B); phòng đóng dấu lên các Session sinh ra từ khung. GV vẫn theo từng Session. Kết hợp `Class.startDate` + `sessionCount` để sinh danh sách Session ngày-giờ cụ thể. UI: "Khung lịch tuần".
_Avoid_: Recurrence, Timetable, WeeklySchedule, Lịch cố định

**Tạo lớp ràng buộc** (workflow) — Tạo Class lấy Khung lịch tuần làm xương sống: CBĐT vẽ khung trên lưới ngày×giờ, tùy chọn "ưu tiên giáo viên" để xám/khóa ô GV bận, rồi hệ thống **lọc cứng** GV/phòng/HS có thể nhận lịch (Availability + RoomSchedule + Session đã có). Chỉ bên khả thi hiện ra; bên chưa khai lịch bị ẩn. **Phòng chọn theo từng khung tuần** (mỗi khung một phòng riêng, `getEligibleRoomsBySlot`); GV (1) / phòng-mỗi-khung (1) / HS (nhiều) chọn qua **modal tìm-kiếm `PickEntityModal`** (`components/staff/PickEntityModal.tsx`) — chọn tạm, mở lại nhớ lựa chọn, chỉ ghi khi bấm "Tạo lớp". (Khác `PeoplePickerModal` ở "Phân công lớp" vốn ghi DB ngay.) HS khả thi gồm cả nhóm đúng `targetLevel` (nhãn "Phù hợp") và nhóm chưa từng được đánh giá môn đó (nhãn "Chưa đánh giá", `level: null`), hiển thị đồng thời, nhóm "Phù hợp" lên đầu. Logic thuần `lib/classes/scheduling.ts`, query lọc `lib/classes/eligibility.ts`, kiểm tra lại tại server action (re-check từng buổi qua `findRoomConflict`). UI: "Tạo lớp học mới".
_Avoid_: Class wizard, Smart scheduler, Auto-assign

**Buổi bù** (makeup session) — Đánh dấu Session diễn ra (xanh) / nghỉ (đỏ); buổi nghỉ bắt buộc nhập lý do → `CANCELLED`. Hệ thống đề xuất ngày bù (dò Khung lịch tuần, tránh ngày đã có buổi) để CBĐT xác nhận/chỉnh; khi xác nhận kiểm tra lại trùng phòng & GV rồi nối Session mới kế thừa phòng/GV gốc. UI: "Buổi bù".
_Avoid_: Reschedule, Compensatory session, Dạy bù (trong code)

### Đánh giá năng lực

**Assessment** — Hành động CBDT (tương lai: AI hỗ trợ) chốt mức năng lực hiện tại của Student theo Subject, ghi `SubjectLevel`. Tham chiếu điểm Exam + đánh giá-buổi + điểm danh, nhưng test đầu vào làm offline nên **mức ban đầu do CBĐT nhập tay**. Chỉ CBĐT được phân công HS đó mới đánh giá được. Tính năng cốt lõi. UI: "Đánh giá năng lực".
_Avoid_: Evaluation, Review, Grading, Nhận xét

**SessionEvaluation** — Đánh giá của GV cho một Student **sau một Session** trên 3 chiều thang 1–5: `performance` (năng lực) / `diligence` (chuyên cần) / `comprehension` (tiếp thu) + ghi chú. 1 bản ghi/`(sessionId, studentId)`; là dữ liệu đầu vào để CBĐT ra `SubjectLevel` chính xác hơn (gom trung bình theo môn trong panel tham chiếu). Khác **Assessment**: đây là đánh giá *từng buổi* của GV, không phải mức năng lực *tổng* trên môn. UI: "Đánh giá sau buổi học".
_Avoid_: Rating, Feedback, Review, Đánh giá (khi nói mức năng lực môn — dùng Assessment/SubjectLevel)

**ProficiencyLevel** — Mức năng lực gán cho Student trên một Subject: `WEAK` (<50), `AVERAGE` (50–79), `GOOD` (80–89), `EXCELLENT` (90–100). Ngưỡng dùng cho gợi ý tự động; CBĐT có thể chốt khác. Nhãn/màu tập trung ở `lib/constants/labels.ts` (`STUDENT_LEVEL_LABEL`/`STUDENT_LEVEL_COLOR`/`STUDENT_LEVELS`). UI: "Mức năng lực".
_Avoid_: Skill Level, Rating, Rank, Grade (nhầm khối lớp), StudentLevel

**SubjectLevel** — Bản ghi gán một ProficiencyLevel cho Student trên một Subject tại thời điểm cụ thể (model `StudentSubjectLevel`). UI: "Năng lực môn của học sinh".
_Avoid_: Skill, Performance, StudentLevel, Level (khi đứng một mình)

**Score** — Điểm một Student đạt được trong một ExamAttempt; đầu vào của Assessment. Thang 0–100.
_Avoid_: Mark, Grade, Result, Điểm (trong code)

### Kiểm tra & câu hỏi

**Exam** — Bài kiểm tra lớn (~45 phút), template tái sử dụng, gồm nhiều Question + thời gian & điều kiện nộp. `kind = EXAM` (mặc định) phân biệt với **Quiz** (`kind = QUIZ`) trên cùng model. UI: "Bài kiểm tra"/"Đề kiểm tra".
_Avoid_: Test, Assessment (đã có nghĩa khác), Bài thi

**Quiz** — Bài kiểm tra nhỏ (~15 phút), template tái sử dụng. **Không phải model riêng** — là `Exam` có `kind = QUIZ` (dùng chung Question/Attempt/chấm/AI); khác EXAM ở duration mặc định (~15 vs ~45) + nhãn. UI: "Bài kiểm tra nhỏ".
_Avoid_: Mini Exam, Short Test, Bài tập nhanh

**ExamAttempt** — Một lượt một Student làm một Exam/Quiz: thời điểm bắt đầu, đáp án, điểm, feedback AI. UI: "Lượt làm bài".
_Avoid_: Submission, Result, Try, Attempt (khi đứng một mình)

**Question** — Câu hỏi trắc nghiệm trong ngân hàng (4 đáp án + đáp án đúng + mức độ + chủ đề), tái sử dụng giữa nhiều Exam/Quiz. PENDING → APPROVED. UI: "Câu hỏi".
Mọi đường ghi qua module thuần `lib/questions/store.ts` (create/update/delete/listQuestions). `createQuestion` nhận `{ createdById, status }` (Teacher → PENDING, Admin → APPROVED); `updateQuestion` nhận `{ ownerId, updateMeta }` (`ownerId`=userId giới hạn theo người tạo, `undefined`=mọi câu; `updateMeta` bật/tắt đổi môn/chủ đề). Auth/quyền dùng môn/revalidate/redirect ở seam. Trường "Chủ đề" là **option-list** theo (môn+khối): cả seam Teacher (`createQuestionAction`, `saveAiQuestionAction`) và Admin (`adminCreateQuestionAction`, `adminUpdateQuestionAction`) gọi chung `assertTopicExists(subjectId, gradeId, topicName)` (export từ `lib/questions/store.ts`) để kiểm `topicName` thuộc đúng `subjectId+gradeId` trước khi ghi. Field dùng chung ở `components/questions/QuestionFields.tsx`.
_Avoid_: Item, Problem

### Lịch rảnh & xếp lớp

**Availability** — Bản kê thời gian một chủ thể (Student/Teacher) có thể học/dạy: 105 ô (7 ngày × 15 TimeSlot) trong tuần điển hình. Lưu hai bảng (`StudentAvailability`, `TeacherAvailability`) nhưng mọi đường đọc/ghi qua module duy nhất `lib/availability/` — interface `subject: { kind: "student" \| "teacher"; id }`, permission ở seam. Route `/student/schedule` (HS tự khai) và `/teacher/schedule` (GV tự khai) dùng chung `components/availability/AvailabilityMatrix.tsx`; CBĐT xem-sửa **hộ học sinh** tại `/staff/students/[id]` (`saveStudentAvailabilityAction`) **và hộ giáo viên** tại `/staff/teachers/[id]` (`saveTeacherAvailabilityAction`, gate `class.create`). UI: "Lịch rảnh".
_Avoid_: Schedule (chỉ là tên route), Calendar, Free time, Lịch sẵn

**TimeSlot** — Một ô 1 tiếng trong tuần (vd `MORNING_07_08`, `AFTERNOON_14_15`). Đơn vị nhỏ nhất của Availability. UI: "Khung giờ".
_Avoid_: Slot (khi đứng một mình), Time block, Period

**TimeGroup** — Nhóm TimeSlot theo buổi: MORNING/AFTERNOON/EVENING. Dùng tổ chức UI matrix & "tô cả buổi". UI: "Buổi".
_Avoid_: Period, Phase, Session (đã có nghĩa khác)

**AvailabilityMode** — Trạng thái một ô: `BUSY` (bận/chưa khai), `ONLINE_ONLY`, `BOTH`. UI: "Trạng thái rảnh" hoặc "Bận / Online / Được".
_Avoid_: Status, AvailabilityStatus, Mode (khi đứng một mình)

### Phòng & lịch phòng

**Room** — Phòng học vật lý, có sức chứa & trạng thái. Khi tạo bắt buộc đính 1 RoomLayoutImage. UI: "Phòng học".
_Avoid_: Venue, Hall

**RoomLayoutImage** — Ảnh sơ đồ phòng (toàn trung tâm/tầng) highlight đỏ vị trí phòng. Model `RoomLayoutImage` 1:1 với Room (`url` + `publicId` Cloudinary). Bắt buộc đính khi tạo Room (validate ở `createRoomAction`); thay ảnh thì dọn ảnh cũ trên Cloudinary (`updateRoomAction`/`deleteRoomAction`). Hiển thị qua nút "Xem vị trí" → modal (`components/rooms/RoomLayoutButton.tsx`, dùng ở `/staff/rooms` + `/admin/rooms`). Giúp người mới định hướng.
_Avoid_: Floor plan, Map, Sơ đồ

**RoomBooking** — Yêu cầu đặt phòng ad-hoc do Teacher/Staff/CBDT/Owner/Parent tạo (Student **không**; Admin **bị chặn** các key booking). Bắt buộc `reason` để NVLT cân nhắc ưu tiên. PENDING → APPROVED/REJECTED. Khi duyệt APPROVED chiếm 1 block RoomOccupancy trong cùng transaction (xem §5). UI: "Đặt phòng".
_Avoid_: Reservation, Booking (đứng một mình), Yêu cầu phòng

**RoomSchedule** — "Tất cả khoảng thời gian một Room bị chiếm", từ 2 nguồn: Session của Class + RoomBooking đã duyệt. Là bảng denormalized `room_occupancies` làm nguồn sự thật duy nhất (**ADR-0001, đã triển khai** — xem §5): mọi đường ghi qua `lib/rooms/store.ts` trong cùng transaction với hành động gốc, DB chặn block giao nhau bằng EXCLUDE constraint. UI: "Lịch phòng".
_Avoid_: RoomCalendar, RoomAvailability (ngược nghĩa), Room timetable

**RoomOccupancy** — Một block thời gian đơn lẻ trên RoomSchedule (model `RoomOccupancy`: roomId + `[startsAt, endsAt)` nửa mở + source + FK về nguồn). `source` = `CLASS_SESSION` (→Session) hoặc `BOOKING` (→RoomBooking). Trang `/staff/rooms/schedule` (`getRoomUsageForDate`, `lib/classes/queries.ts`) hiển thị lưới các Room khả dụng × khung giờ trong ngày, tô đỏ (CLASS_SESSION) / xanh (BOOKING) kèm danh sách chi tiết theo phòng — dùng để CBĐT xem chéo nhiều phòng & phát hiện xung đột trước khi xếp lịch. UI: "Lịch sử dụng phòng".
_Avoid_: Slot, Block, Reservation

**Lưới xếp buổi học** — Bảng phòng × khung giờ (07:00–22:00, mỗi cột 1 tiếng) để CBĐT xếp một Session: mỗi hàng một Room, ô bị chiếm theo RoomSchedule tô đỏ & khóa, bấm các ô trống liên tiếp cùng phòng để chọn phòng + khung giờ trong một thao tác. Khác với trang "Lịch sử dụng phòng" (chỉ xem, đa phòng): lưới này dùng để **chọn** phòng+giờ cho một buổi cụ thể (`SessionScheduler`, `/staff/classes/[id]/sessions/new`). UI: "Chọn phòng & khung giờ".
_Avoid_: Room picker grid, Timetable selector, Scheduler widget

### Phân loại nội dung

**Subject** — Môn học cấp 1 (Toán, Vật lý, Tiếng Anh…). Chiều phân loại lớn nhất cho Question/Exam/Course/Class và là chiều của Assessment. UI: "Môn học".
_Avoid_: Discipline, Field, Môn

**Topic** — Chủ đề kiến thức trong một Subject (vd "Hàm số bậc 2" thuộc Toán). Gắn cho Question & lọc nội dung. UI: "Chủ đề".
_Avoid_: Category, Tag, Theme, Chuyên đề

**Grade** — Khối lớp (1–12), nhóm thành tier `PRIMARY` (1–5), `MIDDLE` (6–9), `HIGH` (10–12). UI: "Khối lớp".
_Avoid_: Class (đã có nghĩa khác), Year, Level (đã có nghĩa khác), Lớp

### Đăng ký & điểm danh

**Enrollment** — Bản ghi một Student đăng ký vào một Course online (model `Enrollment`). UI: "Đăng ký khóa học".
_Avoid_: Subscription, Registration, ClassEnrollment (khác hẳn)

**ClassEnrollment** — Bản ghi một Student được xếp vào một Class (model `ClassEnrollment`), `ACTIVE`/`DROPPED`. **Không gọi tắt là Enrollment**. UI: "Học sinh trong lớp".
_Avoid_: Enrollment (đã có nghĩa khác), Membership, Roster entry

**Attendance** — Điểm danh một Student tại một Session: `PRESENT`/`ABSENT`/`LATE`/`EXCUSED`. UI: "Điểm danh".
_Avoid_: Check-in, Presence

### Flashcard

**FlashcardSet** — Một bộ thẻ từ có chủ đề & mức độ, do Teacher/Admin tạo. UI: "Bộ thẻ từ".
Mọi đọc/ghi FlashcardSet & FlashcardCard qua module thuần `lib/flashcards/store.ts` (create/delete/addCard/removeCard/updateCard). Tham số `ownerId`: `userId` giới hạn theo người tạo, `undefined` cho mọi bộ. Cloudinary cleanup & đánh lại thứ tự card ẩn trong module; auth/revalidate/redirect ở seam (`lib/teacher/actions/flashcard.ts`, `lib/admin/flashcard-actions.ts`). UI dùng chung qua prop `role`.
_Avoid_: Deck, Card set, Vocabulary set

**FlashcardCard** — Một thẻ đơn (ảnh + caption + thứ tự). UI: "Thẻ từ".
_Avoid_: Card, Item, Flashcard (khi đứng một mình)

**FlashcardSession** — Một phiên Student luyện một FlashcardSet, có trạng thái hoàn thành. UI: "Phiên học thẻ".
_Avoid_: Practice, Study session, Session (đã có nghĩa khác)

### Hệ thống

**Notification** — Thông báo gửi tới một User về một sự kiện, đọc tại `/notifications` (model `Notification`: `type: NotificationType`, `readAt`, `href` deep-link). UI: "Thông báo". Các `NotificationType` đang được tạo và nơi tạo:
- `EXAM_ASSIGNED` — GV giao đề mới cho lớp (`lib/teacher/actions/exam.ts`)
- `EXAM_GRADED` — bài thi của HS đã được chấm (`lib/student/actions.ts`)
- `QUESTION_APPROVED` — Admin duyệt câu hỏi GV tạo (`lib/admin/actions.ts`)
- `COURSE_APPROVED` — Admin duyệt khóa học, chuyển status sang PUBLISHED (`approveCourseAction` trong `lib/courses/actions.ts`)
- `BOOKING_APPROVED` / `BOOKING_REJECTED` — duyệt/từ chối yêu cầu đặt phòng (`lib/booking/actions.ts`)
- `CLASS_ASSIGNED` — HS được thêm vào lớp (`lib/classes/actions.ts`)
- `SCHEDULE_CHANGED` — buổi học bị nghỉ/hoãn/đổi lịch hoặc có buổi bù mới (`lib/classes/actions.ts`)
- `STUDENT_ASSIGNED` — CBDTS phân HS mới cho CBĐT (`lib/classes/actions.ts`)
- `SYSTEM` — soạn & gửi thủ công (`sendNotificationAction`, `lib/notifications/actions.ts`, permission `notification.send`; ghi AuditLog). **Phạm vi người nhận theo vai trò người gửi** (`lib/notifications/targeting.ts`): ADMIN/OWNER gửi mọi nhóm role · CBĐT chỉ HS mình phụ trách · NVLT chỉ nhóm Nhân viên · và gửi **đích danh cá nhân** (tìm-chọn). Trang `/admin/notifications` + `/staff/notifications` (staff có quyền `notification.send`).

Mọi `NotificationType` nay đều có nơi tạo.
_Avoid_: Alert, Message

**Permission framework** — Phân quyền table-driven: `can(user, key)` union quyền theo Role + StaffPosition; OWNER có mọi quyền, ADMIN có mọi quyền trừ nhóm booking; cache 5 phút. Key ở `lib/auth/permission-keys.ts`. Xem §2.3.
_Avoid_: ACL, Role guard (khi nói về framework này)

**Page guard** — Seam chung `lib/auth/page-guard.ts` cho Server Component: `requirePageSession()` / `requirePageRole(...roles)` (tự `redirect`). Khác `requireSession`/`requireRole` trong `lib/auth/require.ts` (cho server action, trả `{ user, error }`). Xem §2.2.
_Avoid_: Middleware (đây là guard tầng page), Auth wrapper

**Seam** — Lớp server action bọc một module thuần để xử lý auth/permission/revalidate/redirect; module nhận context quyết định chính sách. Xem §2.1.
_Avoid_: Wrapper, Service layer (khi nói về pattern này)
