# EduAssess — Nền tảng quản lý đào tạo & đánh giá

EduAssess là hệ thống quản lý toàn diện dành cho **trung tâm giáo dục**, bao gồm quản lý lớp học, ngân hàng câu hỏi, đề kiểm tra trực tuyến, khoá học nội dung số, đặt phòng học, và phân quyền nhân sự theo chức vụ.

---

## Mục lục

- [Vai trò người dùng](#vai-trò-người-dùng)
- [Tính năng chính](#tính-năng-chính)
- [Công nghệ sử dụng](#công-nghệ-sử-dụng)
- [Cấu trúc dự án](#cấu-trúc-dự-án)
- [Luồng hoạt động](#luồng-hoạt-động)
- [Cài đặt & Chạy local](#cài-đặt--chạy-local)
- [Cơ sở dữ liệu](#cơ-sở-dữ-liệu)
- [Quy ước code](#quy-ước-code)

---

## Vai trò người dùng

| Vai trò | Mô tả |
|---|---|
| `OWNER` | Nhân viên công nghệ — toàn quyền hệ thống |
| `ADMIN` | Quản trị viên — quản lý người dùng, lớp, câu hỏi, phân quyền |
| `STAFF` | Nhân viên trung tâm — phân theo chức vụ (xem bên dưới) |
| `TEACHER` | Giáo viên — ngân hàng câu hỏi, đề kiểm tra, khóa học |
| `STUDENT` | Học sinh — làm bài, xem kết quả, học khóa học |
| `PARENT` | Phụ huynh — theo dõi học sinh |

**Chức vụ nhân viên (`StaffPosition`):**

| Mã | Chức danh |
|---|---|
| `NVSALE` | Chuyên viên tư vấn tuyển sinh |
| `NVLT` | Nhân viên lễ tân |
| `CBNK` | Cán bộ ngoại khoá |
| `CBDH` | Cán bộ du học |
| `CBDT` | Cán bộ đào tạo (phụ trách lớp học) |
| `CBDTS` | Cán bộ đào tạo super (quản lý CBDT) |

---

## Tính năng chính

### Quản lý lớp học (Phase 3)
- Tạo lớp theo môn học, hình thức (Online / Offline / Hybrid), năng lực mục tiêu
- Phân công giáo viên và học sinh vào lớp
- Quản lý buổi học (`ClassSession`): lịch, phòng, giáo viên dạy, điểm danh
- Theo dõi năng lực học sinh theo môn (`StudentSubjectLevel`)
- Cố vấn học sinh (`StudentAdvisor`): CBDT phụ trách từng học sinh

### Ngân hàng câu hỏi
- Câu hỏi trắc nghiệm 4 đáp án (A/B/C/D), hỗ trợ LaTeX cho công thức toán
- Phân loại theo: môn học → chủ đề (`Topic`) → độ khó (`EASY / MEDIUM / HARD`)
- Giáo viên soạn câu hỏi, Admin duyệt (`PENDING → APPROVED`)
- **Gợi ý câu hỏi AI**: tích hợp Anthropic Claude — tự động sinh câu hỏi theo yêu cầu, render LaTeX, giải thích đáp án

### Đề kiểm tra trực tuyến
- Giáo viên tạo đề từ câu hỏi đã duyệt, gắn với lớp học, đặt thời hạn nộp
- Học sinh làm bài trực tuyến có đếm ngược thời gian
- Chấm điểm tự động, hiển thị điểm % ngay sau nộp
- **AI Feedback**: sau khi nộp, Claude phân tích từng câu sai và đưa nhận xét cá nhân hoá
- Tùy chọn cho xem đáp án / làm lại

### Khoá học nội dung số
- Giáo viên soạn khoá học dạng bài giảng Markdown + video (Cloudinary / YouTube)
- Admin duyệt trước khi xuất bản (`DRAFT → PENDING → PUBLISHED`)
- Học sinh đăng ký, theo dõi tiến độ từng bài, đánh giá khoá học
- Hỏi đáp (`CourseQA`) ngay trong bài giảng

### Flashcard
- Học sinh / giáo viên tạo bộ flashcard theo môn học
- Ghi nhận phiên học (`FlashcardSession`) để theo dõi tiến độ ôn tập

### Đặt phòng học
- Quản lý danh sách phòng (sức chứa, trạng thái hoạt động)
- Nhân viên / giáo viên gửi yêu cầu đặt phòng kèm lý do, thời gian
- Admin duyệt / từ chối; kiểm tra xung đột lịch tự động
- Thông báo kết quả qua hệ thống notification

### Phân quyền động
- Hệ thống permission theo **key** (`room.create`, `class.create`, `user.manage`, ...)
- Gắn quyền theo `Role` hoặc theo `StaffPosition` — bật/tắt qua UI mà không cần deploy lại
- `OWNER` luôn có toàn quyền (hard-coded)
- Audit log ghi nhận mọi hành động nhạy cảm

### Thông báo
- Thông báo trong app: giao đề mới, chấm điểm xong, duyệt câu hỏi, đặt phòng, phân lớp, đổi lịch...

---

## Công nghệ sử dụng

| Lớp | Công nghệ |
|---|---|
| Framework | Next.js 16.2.1 (App Router, Turbopack) |
| UI | React 19, Tailwind CSS v4, FontAwesome |
| Xác thực | Auth.js (next-auth) v5 beta — JWT strategy |
| ORM | Prisma 7.6.0 — multi-file schema |
| Database | PostgreSQL (local: `eduassess` trên `localhost:5432`) |
| AI | Anthropic Claude API (`@anthropic-ai/sdk`) |
| Upload | Cloudinary (`next-cloudinary`) |
| Toán học | KaTeX, react-katex, MathLive |
| Markdown | react-markdown, remark-gfm, remark-math, rehype-katex |
| Mã hoá | bcryptjs |

---

## Cấu trúc dự án

```
app/
├── (auth)/              # Trang login, quên mật khẩu, đổi mật khẩu
├── (dashboard)/         # Layout chính sau khi đăng nhập
│   ├── admin/           # Quản trị: users, classes, exams, questions, permissions, rooms
│   ├── teacher/         # GV: ngân hàng câu hỏi, đề kiểm tra, khoá học, lớp học
│   ├── student/         # HS: làm bài, xem kết quả, khoá học, flashcard
│   ├── staff/           # NV: dashboard (đang phát triển)
│   ├── owner/           # Owner: dashboard hệ thống
│   ├── parent/          # PH: theo dõi học sinh
│   ├── booking/         # Đặt phòng học
│   ├── settings/        # Cài đặt cá nhân
│   └── notifications/   # Thông báo
├── api/
│   ├── auth/            # NextAuth handlers
│   ├── courses/         # Upload bài giảng
│   └── upload/          # Upload ảnh Cloudinary
└── dashboard/           # Redirect sau đăng nhập theo role

lib/
├── auth/                # Cấu hình NextAuth, kiểm tra quyền (can())
├── db/                  # Prisma client
├── admin/               # queries.ts + actions.ts cho admin
├── teacher/             # queries.ts + actions/ cho giáo viên
├── student/             # queries.ts + actions.ts cho học sinh
└── proxy/               # Request guard (Next.js proxy.ts)

prisma/
├── schema/
│   ├── base.prisma              # Datasource, generator
│   ├── user.prisma              # User, ParentStudent
│   ├── enums.prisma             # Tất cả enum
│   ├── class.prisma             # Class, ClassTeacher, ClassEnrollment, ClassSession, Attendance, ...
│   ├── exam.prisma              # Exam, ExamQuestion, ExamAttempt, ExamAnswer
│   ├── question.prisma          # Question
│   ├── subject_grade_topic.prisma # Subject, Grade, Topic
│   ├── course.prisma            # Course, Lesson, Enrollment, LessonProgress, CourseReview, CourseQA
│   ├── flashcard.prisma         # FlashcardSet, FlashcardCard, FlashcardSession
│   ├── booking.prisma           # Room, BookingReason, RoomBooking
│   ├── permission.prisma        # Permission, RolePermission, PositionPermission, AuditLog
│   └── notification.prisma      # Notification
├── seed.ts              # Dữ liệu mẫu
└── seedPermissions.ts   # Seed bộ quyền mặc định
```

---

## Luồng hoạt động

### 1. Xác thực & Phân quyền

```
Người dùng nhập email/password
  → bcryptjs verify
  → JWT session (next-auth v5)
  → middleware kiểm tra role → redirect về dashboard tương ứng
  → can(session, "permission.key") kiểm tra RolePermission / PositionPermission
```

### 2. Ngân hàng câu hỏi & AI Suggest

```
Giáo viên mở trang "Ngân hàng câu hỏi"
  → Nhập prompt (chủ đề, độ khó, môn học)
  → Gọi Anthropic Claude API (server action)
  → Claude trả về JSON: { content, options[], explanation }
  → Hiển thị preview với render LaTeX (react-katex)
  → Giáo viên xác nhận → lưu vào DB với status = PENDING
  → Admin vào trang "Duyệt câu hỏi" → APPROVED
```

### 3. Tạo & Làm đề kiểm tra

```
[Giáo viên]
  Chọn lớp + môn → Tìm câu hỏi (filter theo chủ đề / độ khó / đã duyệt)
  → Kéo thả vào đề → Đặt thời gian, thời hạn nộp → Lưu (Exam + ExamQuestion[])
  → Hệ thống gửi Notification "EXAM_ASSIGNED" đến tất cả học sinh trong lớp

[Học sinh]
  Vào trang "Bài kiểm tra" → Thấy đề được giao
  → Bắt đầu làm: tạo ExamAttempt → Trả lời từng câu (lưu ExamAnswer)
  → Nộp bài → Hệ thống chấm điểm tự động → score = % câu đúng
  → Gọi Claude API → AI Feedback cá nhân hoá → lưu vào aiFeedback
  → Hiển thị kết quả + phân tích từng câu sai
```

### 4. Lớp học (Training Center)

```
[Admin / CBDT]
  Tạo lớp: đặt tên, chọn môn, hình thức (Online/Offline/Hybrid), mục tiêu
  → Phân công giáo viên (ClassTeacher)
  → Thêm học sinh (ClassEnrollment)

[CBDT]
  Tạo lịch buổi học (ClassSession): ngày, giờ, phòng, GV dạy
  → Điểm danh từng buổi (Attendance)
  → Đánh giá năng lực học sinh (StudentSubjectLevel)
```

### 5. Đặt phòng học

```
Nhân viên / Giáo viên
  → Chọn phòng, ngày giờ, lý do
  → Gửi yêu cầu (RoomBooking status=PENDING)
  → Hệ thống kiểm tra xung đột lịch với booking APPROVED cùng phòng

Admin
  → Xem danh sách yêu cầu → Duyệt / Từ chối
  → Gửi Notification "BOOKING_APPROVED / BOOKING_REJECTED"
  → Ghi AuditLog
```

### 6. Khoá học nội dung số

```
[Giáo viên]
  Tạo khoá học → Soạn bài giảng (Markdown + video Cloudinary/YouTube)
  → Gửi duyệt (status: DRAFT → PENDING)

[Admin]
  Duyệt khoá học → status = PUBLISHED
  → Gửi Notification "COURSE_APPROVED"

[Học sinh]
  Đăng ký khoá học (Enrollment) → Học từng bài (LessonProgress)
  → Đặt câu hỏi (CourseQA) → Đánh giá (CourseReview)
```

---

## Cài đặt & Chạy local

**Yêu cầu:** Node.js 20+, PostgreSQL 15+

```bash
# 1. Cài dependencies
npm install

# 2. Tạo file .env.local
DATABASE_URL="postgresql://postgres:password@localhost:5432/eduassess"
NEXTAUTH_SECRET="your-secret"
ANTHROPIC_API_KEY="sk-ant-..."
CLOUDINARY_CLOUD_NAME="..."
CLOUDINARY_API_KEY="..."
CLOUDINARY_API_SECRET="..."

# 3. Tạo database & chạy migration
npm run db:migrate

# 4. Seed dữ liệu mẫu
npm run db:seed

# 5. Chạy ứng dụng
npm run dev
```

Ứng dụng chạy tại `http://localhost:3000`.

**Tài khoản mẫu:**

| Vai trò | Email | Mật khẩu |
|---|---|---|
| Owner | `owner@eduassess.vn` | `Owner123!` |
| Admin | `admin@eduassess.vn` | `Admin123!` |
| Giáo viên | `gv.toan1@eduassess.vn` | `Teacher123!` |
| Học sinh | `hs0001@eduassess.vn` | `Student123!` |

**Lệnh database hữu ích:**

```bash
npm run db:migrate    # Chạy migration mới
npm run db:seed       # Seed dữ liệu mẫu
npm run db:studio     # Mở Prisma Studio (GUI xem DB)
npm run db:reset      # Reset toàn bộ DB (cẩn thận!)
npm run db:generate   # Tái tạo Prisma Client sau khi sửa schema
```

---

## Cơ sở dữ liệu

Schema được chia nhỏ theo domain trong `prisma/schema/` thay vì một file duy nhất. Prisma đọc toàn bộ thư mục nhờ cấu hình `"prisma": { "schema": "prisma/schema" }` trong `package.json`.

**Các domain chính:**

| File | Mô tả |
|---|---|
| `user.prisma` | Người dùng, quan hệ phụ huynh-học sinh |
| `class.prisma` | Lớp học, giáo viên, học sinh, buổi học, điểm danh, năng lực |
| `exam.prisma` | Đề kiểm tra, câu hỏi trong đề, lượt làm bài, đáp án |
| `question.prisma` | Ngân hàng câu hỏi |
| `subject_grade_topic.prisma` | Môn học, khối, chủ đề |
| `course.prisma` | Khoá học, bài giảng, đăng ký, tiến độ, đánh giá |
| `flashcard.prisma` | Bộ flashcard, phiên ôn tập |
| `booking.prisma` | Phòng học, lý do đặt, yêu cầu đặt phòng |
| `permission.prisma` | Quyền, phân quyền theo role/chức vụ, audit log |
| `notification.prisma` | Thông báo trong app |

---

## Quy ước code

- **Phân tách rõ framework và logic nghiệp vụ**: file trong `app/` chỉ chứa UI và route handler; logic nằm trong `lib/`.
- **Tổ chức theo domain**: `lib/admin/`, `lib/teacher/`, `lib/student/` thay vì gộp chung.
- **Server Actions**: mọi mutation (tạo/sửa/xoá) đều là `"use server"` action, không gọi trực tiếp Prisma từ component.
- **Schema Prisma chia nhỏ**: mỗi domain một file trong `prisma/schema/`.
- **Permission check**: dùng `can(session, "key")` từ `lib/auth/` trước mọi hành động nhạy cảm.
- **Convention files**: giữ `proxy.ts`, `auth.ts`, `app/layout.tsx` ở vị trí framework yêu cầu; đặt logic vào `lib/`.


## Next Refactor Targets

The next cleanup steps that will improve maintainability most are:

1. Move `lib/actions/auth.ts` and `lib/actions/register.ts` into `lib/auth/actions/`.
2. Extract dashboard navigation config from `app/(dashboard)/layout.tsx` into `lib/navigation/`.
3. Group teacher, student, and admin UI constants/components by feature instead of keeping everything inline in page files.

