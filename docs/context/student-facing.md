# Ngữ cảnh: Student-facing (`/student`, `/parent`)

> Khu người học & phụ huynh: làm bài kiểm tra, luyện flashcard, tự học Course, xem lịch lớp, khai lịch rảnh; phụ huynh theo dõi con. Học sinh là **đối tượng được đánh giá** — phần *sản sinh* dữ liệu (Assessment, tạo lớp, chấm bài, soạn Course/Exam/Flashcard) nằm ở khu back-office.
>
> **Đọc trước:** `platform.md` (tech stack, kiến trúc, roles, mô hình dữ liệu §5, **Từ điển §8** — ngôn ngữ domain dùng chung). Khu nghiệp vụ nội bộ ở `back-office.md`. Bản đồ tổng: `CONTEXT-MAP.md`.

Trạng thái: ✅ đã có · 🚧 một phần / cần sửa · 📋 roadmap (xem §7 trong `back-office.md`).

---

## 4. Bản đồ chức năng theo vùng route (khu người học)

### `/student` — Học sinh
- Bài kiểm tra (`/student/exams`, `[id]/take`, results) · Flashcard (`/student/flashcards`, `random`) · Tiến trình (`/student/progress`) · Khóa học (`/student/courses`, `[id]/learn/[lessonId]`) · **Lịch học** (`/student/classes` — buổi học lớp mình, đích deep-link của noti lớp/lịch) · **Lịch rảnh** (`/student/schedule` — khai báo availability).

### `/parent` — Phụ huynh
- Con tôi (`/parent/children`) · Lịch học của con (`/parent/schedule`).

### Dùng chung
- `/notifications` · `/settings` (chi tiết hạ tầng thông báo ở `platform.md`).

> Khu back-office (`/owner`, `/admin`, `/staff`, `/teacher`): xem `back-office.md`.

---

## 6'. Luồng phía người học (rút gọn từ §6)

> Phần này tóm các luồng mà **học sinh/phụ huynh trực tiếp tham gia**. Toàn bộ vòng đời nghiệp vụ đầy đủ (phân HS → Assessment → tạo lớp → dạy & đánh giá → bù buổi) ở §6 của `back-office.md`.

- **Đăng ký tài khoản:** Tự đăng ký (`/register`) **chỉ tạo tài khoản `STUDENT`** (`registerAction` hard-code role); GV/STAFF/PARENT do admin tạo. Xem §3 (`platform.md`).
- **Làm bài kiểm tra:** HS làm Exam/Quiz được giao cho lớp mình (`/student/exams/[id]/take`), tạo một **ExamAttempt** (điểm 0–100, đáp án, feedback AI cache trong `ExamAttempt.aiFeedback`). Khi bài được chấm, HS nhận noti `EXAM_GRADED` (`lib/student/actions.ts`). Điểm là **đầu vào của Assessment** (panel tham chiếu của CBĐT — xem `back-office.md`).
- **Luyện flashcard:** HS luyện một **FlashcardSet** (`/student/flashcards`, `random`), mỗi lần là một **FlashcardSession**. Bộ thẻ do Teacher/Admin soạn (khu back-office).
- **Tự học Course:** HS đăng ký (**Enrollment**) một Course online đã `PUBLISHED`, học từng **Lesson** (`/student/courses/[id]/learn/[lessonId]`) và đánh dấu hoàn thành (**LessonProgress**); có thể đánh giá (`CourseReview`) và hỏi/đáp (`CourseQA`). **Course** (tự học online) độc lập hoàn toàn với **Class** (lớp có buổi học & điểm danh) — xem Từ điển §8.
- **Xem lịch lớp:** `/student/classes` hiển thị các **Session** của lớp HS đang theo; là đích deep-link của noti `CLASS_ASSIGNED` / `SCHEDULE_CHANGED`.
- **Khai lịch rảnh:** HS tự khai **Availability** tại `/student/schedule` (`saveStudentAvailabilityAction`; seam tự-thao-tác dùng `resolveUserIdByRole`, xem §2.2 trong `platform.md`). Lịch rảnh HS là **đầu vào cho bộ lọc cứng khi CBĐT tạo lớp** (xem "Tạo lớp ràng buộc" ở `back-office.md`). CBĐT cũng có thể khai/sửa **hộ** HS tại `/staff/students/[id]`.
- **Phụ huynh theo dõi:** Parent liên kết ≥1 Student (`ParentStudent`), xem con (`/parent/children`) và lịch học của con (`/parent/schedule`), nhận thông báo liên quan.

> Thuật ngữ (ExamAttempt, FlashcardSession, Enrollment, Lesson, Session, Availability, Class vs Course…): tra **Từ điển §8** trong `platform.md` — dùng đúng định nghĩa chuẩn, tránh các synonym `_Avoid_`.
