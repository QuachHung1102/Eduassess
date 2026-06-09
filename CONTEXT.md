# Eduassess

Eduassess là nền tảng **đánh giá năng lực học sinh theo chuẩn đầu ra** cho trung tâm đào tạo đa môn học. Xung quanh phần đánh giá là các công cụ hỗ trợ — quản lý lớp, khóa học online, ngân hàng câu hỏi, flashcard, lịch học — để cán bộ đào tạo có thể xếp lớp và lộ trình học phù hợp với năng lực thực tế của từng học sinh.

## Language

### Roles & people

**CBDT**:
Cán bộ đào tạo — nhân viên trung tâm phụ trách theo dõi, đánh giá và xếp lộ trình học cho một nhóm học sinh được phân công. Là vai trò domain trung tâm, không chỉ là chức danh tổ chức.
_Avoid_: Advisor, Mentor, Tutor, Cố vấn, Cố vấn học tập, StudentAdvisor

**CBDTS**:
Super CBDT — CBDT cấp cao, quản lý và phân công công việc cho các CBDT thường.
_Avoid_: Senior Advisor, Lead CBDT

**Student**:
Người học đăng ký tại trung tâm — đối tượng chính được đánh giá, xếp lớp và theo dõi tiến độ. Tiếng Việt UI: "Học sinh".
_Avoid_: Learner, Pupil, Trainee, User (khi đang nói về vai trò học sinh)

**Teacher**:
Người dạy lớp học hoặc tạo khóa học/đề thi/câu hỏi. Tiếng Việt UI: "Giáo viên".
_Avoid_: Tutor, Instructor, GV (trong code)

**Parent**:
Phụ huynh liên kết với một hoặc nhiều Student để theo dõi tiến độ và nhận thông báo. Tiếng Việt UI: "Phụ huynh".
_Avoid_: Guardian, PH (trong code)

### Học tập

**Class**:
Lớp học do trung tâm tổ chức với danh sách buổi học (Session) cụ thể, có điểm danh và giáo viên trực tiếp dạy. Có thể là OFFLINE, ONLINE hoặc HYBRID. Tiếng Việt UI: "Lớp học". Hoàn toàn độc lập với Course.
_Avoid_: Cohort, Group, Batch, Khóa, Course

**Course**:
Khóa học online tự học, gồm các Lesson (markdown + video) theo thứ tự, có giáo trình riêng biệt với Class. Vòng đời: draft → pending → published → archived. Tiếng Việt UI: "Khóa học online".
_Avoid_: Class, Curriculum, Khóa học (nếu không có chữ "online" — dễ nhầm với Class)

**Lesson**:
Một bài học trong Course, là đơn vị nội dung mà Student tự học và đánh dấu hoàn thành. Tiếng Việt UI: "Bài giảng".
_Avoid_: Chapter, Unit, Module, Bài học (khi đang nói buổi học của Class — dùng Session)

**Session**:
Một buổi học cụ thể của Class, có ngày, giờ, phòng, giáo viên và bảng điểm danh. Tiếng Việt UI: "Buổi học".
_Avoid_: Class (khi nói về 1 buổi đơn lẻ), Meeting, Lesson, Lịch học

**Phân công lớp** (workflow):
Sau khi CBĐT tạo Class (DRAFT), việc xếp người vào lớp diễn ra ngay tại trang chi tiết lớp qua hai bảng chọn tìm-kiếm: một cho giáo viên, một cho học sinh. Vì danh sách giáo viên/học sinh rất lớn, bảng chọn cho phép gõ tìm theo tên/email và tích nhiều người cùng lúc; học sinh phù hợp (đúng môn + đúng trình độ mục tiêu) được gắn nhãn "Phù hợp" và đẩy lên đầu. Một lần xác nhận sẽ phân nhiều người và gửi thông báo cho từng người. Tiếng Việt UI: "Phân giáo viên" / "Thêm học sinh".
_Avoid_: Assign panel, Bulk picker, Multi-select dialog

**ClassWeeklySlot**:
Mẫu lịch học lặp theo tuần của một Class: mỗi dòng là (thứ trong tuần + giờ bắt đầu + giờ kết thúc), độc lập với phòng/giáo viên (những thứ này được đóng dấu lên từng Session cụ thể). Kết hợp với `Class.startDate` và `sessionCount`, hệ thống sinh ra danh sách Session ngày-giờ cụ thể. Tiếng Việt UI: "Khung lịch tuần".
_Avoid_: Recurrence, Timetable, WeeklySchedule, Lịch cố định

**Tạo lớp ràng buộc** (workflow):
Cách tạo Class lấy Khung lịch tuần làm xương sống: CBĐT vẽ khung lịch trên lưới ngày × giờ (cùng thang giờ với Availability), tùy chọn "ưu tiên trước" một giáo viên hoặc một phòng để làm xám/khóa các ô không khả thi, rồi hệ thống **lọc cứng** ra danh sách giáo viên, phòng và học sinh có thể nhận lịch đó mà không trùng (so theo Availability cho người + RoomSchedule cho phòng + các Session đã có). Chỉ những bên khả thi mới hiện ra để chọn; bên chưa khai báo lịch rảnh bị ẩn hoàn toàn. Gói logic thuần ở `lib/classes/scheduling.ts`, truy vấn lọc ở `lib/classes/eligibility.ts`, kiểm tra lại tại server action trước khi tạo. Tiếng Việt UI: "Tạo lớp học mới".
_Avoid_: Class wizard, Smart scheduler, Auto-assign

**Buổi bù** (makeup session):
Cơ chế theo dõi buổi học có diễn ra hay không: tại trang chi tiết lớp, CBĐT đánh dấu mỗi Session là diễn ra (xanh) hoặc nghỉ (đỏ); buổi nghỉ bắt buộc nhập lý do và chuyển trạng thái CANCELLED. Sau khi đánh dấu nghỉ, hệ thống đề xuất ngày bù (dò theo Khung lịch tuần, tránh các ngày đã có buổi) để CBĐT xác nhận hoặc chỉnh; khi xác nhận sẽ kiểm tra lại trùng phòng & giáo viên rồi nối thêm một Session mới kế thừa phòng/giáo viên của buổi gốc. Tiếng Việt UI: "Buổi bù".
_Avoid_: Reschedule, Compensatory session, Dạy bù (trong code)

### Đánh giá năng lực

**Assessment**:
Hành động Teacher/CBDT/AI đánh giá năng lực hiện tại của một Student theo một Subject, dựa trên điểm số các Exam mà Student đã làm. Là tính năng cốt lõi của hệ thống. Tiếng Việt UI: "Đánh giá năng lực".
_Avoid_: Evaluation, Review, Grading, Nhận xét

**ProficiencyLevel**:
Mức năng lực được gán cho một Student trên một Subject. Hiện tại các mức là `WEAK` (<50), `AVERAGE` (50–79), `GOOD` (80–100); dự kiến mở rộng thêm `EXCELLENT` cho học sinh đạt full GOOD trong quá trình học. Tiếng Việt UI: "Mức năng lực".
_Avoid_: Skill Level, Rating, Rank, Grade (dễ nhầm với khối lớp), StudentLevel

**SubjectLevel**:
Bản ghi gán một ProficiencyLevel cho một Student trên một Subject tại thời điểm cụ thể (model `StudentSubjectLevel`). Tiếng Việt UI: "Năng lực môn của học sinh".
_Avoid_: Skill, Performance, StudentLevel, Level (khi đứng một mình)

**Score**:
Điểm số một Student đạt được trong một ExamAttempt, là dữ liệu đầu vào của Assessment. Thang điểm 0–100.
_Avoid_: Mark, Grade, Result, Điểm (trong code)

### Kiểm tra & câu hỏi

**Exam**:
Bài kiểm tra lớn (~45 phút), template tái sử dụng được, gồm nhiều Question và có thời gian + điều kiện nộp. Tiếng Việt UI: "Bài kiểm tra" hoặc "Đề kiểm tra".
_Avoid_: Test, Assessment (đã có nghĩa khác — đánh giá năng lực), Bài thi

**Quiz**:
Bài kiểm tra nhỏ (~15 phút), template tái sử dụng được. Hiện chưa tách model riêng trong database — sẽ phân biệt với Exam khi triển khai. Tiếng Việt UI: "Bài kiểm tra nhỏ".
_Avoid_: Mini Exam, Short Test, Bài tập nhanh

**ExamAttempt**:
Một lượt một Student làm một Exam/Quiz cụ thể: bao gồm thời điểm bắt đầu, các đáp án, điểm số và feedback AI. Tiếng Việt UI: "Lượt làm bài".
_Avoid_: Submission, Result, Try, Attempt (khi đứng một mình)

**Question**:
Câu hỏi trắc nghiệm trong ngân hàng (4 đáp án + đáp án đúng + mức độ + chủ đề), có thể tái sử dụng giữa nhiều Exam/Quiz. Trạng thái: PENDING → APPROVED. Tiếng Việt UI: "Câu hỏi".
Mọi đường ghi Question đi qua một module thuần `lib/questions/store.ts` (createQuestion/updateQuestion/deleteQuestion). Validate, tìm-hoặc-tạo Topic và đóng gói 4 đáp án (label/text/isCorrect) là chi tiết ẩn trong module. Context truyền vào quyết định chính sách: `createQuestion` nhận `{ createdById, status }` (Teacher tạo → PENDING, Admin tạo → APPROVED); `updateQuestion` nhận `{ ownerId, updateMeta }` — `ownerId` là `userId` để giới hạn theo người tạo (Teacher chỉ sửa câu của mình) hoặc `undefined` cho mọi câu (Admin), còn `updateMeta` bật/tắt việc đổi môn/chủ đề (Teacher khóa, Admin mở). Auth, kiểm tra quyền dùng môn của Teacher, revalidate và redirect nằm ở seam (`lib/teacher/actions/question.ts`, `lib/admin/actions.ts`).
Đường đọc danh sách cũng dùng chung: `listQuestions(filter, ctx)` trong store dựng điều kiện lọc một chỗ (môn/khối/độ khó/trạng thái/người tạo/đề ĐH/có giải thích/tìm kiếm) và phân trang; `ctx.ownerId` giới hạn theo người tạo (Teacher) hay mọi câu (Admin), `ctx.include` do từng role truyền vào nên hình dạng dữ liệu trả về giữ nguyên cho UI. Seam chỉ còn `getTeacherQuestions` (gắn `ownerId = userId`) và `getAdminQuestions` (`ownerId = undefined`) trong các file queries.
Bốn form viết Question (Teacher/Admin × tạo/sửa) dựng từ các field dùng chung trong `components/questions/QuestionFields.tsx` (QuestionMetadataFields, QuestionContentField, QuestionOptionsField, QuestionExplanationField, QuestionDifficultyField, QuestionFormActions). Mỗi form giữ riêng phần đặc thù của role: Teacher-tạo có AiSuggestPanel và nuôi metadata cho AI, Teacher-sửa khóa môn/chủ đề (chỉ hiển thị), Admin được sửa metadata. Field chỉ lo trình bày; chính sách và submit nằm ở form + seam.
_Avoid_: Item, Problem

### Lịch rảnh & xếp lớp

**Availability**:
Bản kê thời gian một chủ thể (Student hoặc Teacher) có thể tham gia học/dạy, gồm 105 ô (7 ngày × 15 TimeSlot) trong một tuần điển hình. Đầu vào để CBDT xếp Class/Session phù hợp. Lưu ở hai bảng riêng (`StudentAvailability`, `TeacherAvailability`) nhưng mọi đường đọc/ghi đi qua một module duy nhất `lib/availability/` — interface thống nhất theo `subject: { kind: "student" | "teacher"; id }`, permission xử lý ở server action (seam), không trong module. Route `/student/schedule` (Student tự khai) và trang CBDT xem-sửa lịch hộ dùng chung component `AvailabilityMatrix`. Tiếng Việt UI: "Lịch rảnh".
_Avoid_: Schedule (dễ nhầm — Schedule chỉ là tên route), Calendar, Free time, Lịch sẵn

**TimeSlot**:
Một ô 1 tiếng trong tuần (vd `MORNING_07_08`, `AFTERNOON_14_15`). Là đơn vị nhỏ nhất của Availability. Tiếng Việt UI: "Khung giờ".
_Avoid_: Slot (khi đứng một mình — dễ nhầm với booking slot), Time block, Period

**TimeGroup**:
Nhóm TimeSlot theo buổi: MORNING (sáng), AFTERNOON (chiều), EVENING (tối). Dùng để tổ chức UI matrix và các thao tác "tô cả buổi". Tiếng Việt UI: "Buổi".
_Avoid_: Period, Phase, Session (đã có nghĩa khác — buổi học của Class)

**AvailabilityMode**:
Trạng thái một ô Availability: `BUSY` (bận/chưa khai báo), `ONLINE_ONLY` (chỉ học online), `BOTH` (được cả online lẫn offline). Tiếng Việt UI: "Trạng thái rảnh" hoặc trực tiếp "Bận / Online / Được".
_Avoid_: Status, AvailabilityStatus, Mode (khi đứng một mình)

### Phòng & lịch phòng

**Room**:
Phòng học vật lý của trung tâm, có sức chứa và trạng thái. Khi tạo Room bắt buộc đính kèm 1 RoomLayoutImage. Tiếng Việt UI: "Phòng học".
_Avoid_: Venue, Hall

**RoomLayoutImage**:
Ảnh sơ đồ phòng (toàn bộ trung tâm hoặc tầng) trong đó vị trí của Room này được highlight màu đỏ. Hiển thị qua một nút "Xem vị trí" → modal với ảnh. Mục đích: giúp người mới định hướng nhanh trong trung tâm.
_Avoid_: Floor plan, Map, Sơ đồ

**RoomBooking**:
Yêu cầu đặt phòng ad-hoc do Teacher/Staff/CBDT/Admin/Owner/Parent tạo (Student **không** có quyền tạo). Bắt buộc khai `reason` để lễ tân (`NVLT`) cân nhắc ưu tiên khi duyệt. Trạng thái: PENDING → APPROVED/REJECTED. Khi APPROVED sẽ chiếm 1 RoomOccupancy. Tiếng Việt UI: "Đặt phòng".
_Avoid_: Reservation, Booking (đứng một mình — sẽ có Booking khác trong tương lai), Yêu cầu phòng

**RoomSchedule**:
Bảng denormalized lưu **tất cả khoảng thời gian một Room bị chiếm dụng**, từ hai nguồn: (1) Session của Class đã xếp tại phòng đó, (2) RoomBooking đã được duyệt. Là nguồn sự thật duy nhất cho việc detect xung đột và disable ô trong UI chọn lịch phòng. Tiếng Việt UI: "Lịch phòng".
_Avoid_: RoomCalendar, RoomAvailability (ngược nghĩa với Student Availability), Room timetable

**RoomOccupancy**:
Một block thời gian đơn lẻ trên RoomSchedule (Room + start + end + source). `source` là `CLASS_SESSION` (link tới Session) hoặc `BOOKING` (link tới RoomBooking). Tiếng Việt UI: "Lịch sử dụng phòng".
_Avoid_: Slot, Block, Reservation

**Lưới xếp buổi học**:
Bảng phòng × khung giờ (07:00–22:00, mỗi cột 1 tiếng — cùng thang giờ với lịch rảnh của Student) mà CBĐT dùng để xếp một Session: mỗi hàng là một Room, ô đã bị chiếm theo RoomSchedule (cả Session lớp khác lẫn RoomBooking đã duyệt) bị tô đỏ và khóa, CBĐT bấm các ô trống liên tiếp trên cùng một phòng để chọn phòng + khung giờ trong một thao tác. Thay cho việc gõ tay phòng và giờ rời rạc. Tiếng Việt UI: "Chọn phòng & khung giờ".
_Avoid_: Room picker grid, Timetable selector, Scheduler widget

### Phân loại nội dung

**Subject**:
Môn học cấp 1 (vd Toán, Vật lý, Tiếng Anh). Là chiều phân loại lớn nhất cho Question, Exam, Course, Class và là chiều của Assessment (mỗi SubjectLevel gắn với 1 Subject). Tiếng Việt UI: "Môn học".
_Avoid_: Discipline, Field, Môn

**Topic**:
Chủ đề kiến thức trong một Subject (vd "Hàm số bậc 2" thuộc Toán). Dùng để gắn cho Question và lọc nội dung. Tiếng Việt UI: "Chủ đề".
_Avoid_: Category, Tag, Theme, Chuyên đề

**Grade**:
Khối lớp (1–12), nhóm thành tier `PRIMARY` (1–5), `MIDDLE` (6–9), `HIGH` (10–12). Tiếng Việt UI: "Khối lớp".
_Avoid_: Class (đã có nghĩa khác — lớp học tổ chức), Year, Level (đã có nghĩa khác — ProficiencyLevel), Lớp

### Đăng ký & điểm danh

**Enrollment**:
Bản ghi một Student đăng ký vào một Course online (model `Enrollment`). Tiếng Việt UI: "Đăng ký khóa học".
_Avoid_: Subscription, Registration, ClassEnrollment (khác hẳn)

**ClassEnrollment**:
Bản ghi một Student được xếp vào một Class tại trung tâm (model `ClassEnrollment`), trạng thái `ACTIVE` / `DROPPED`. **Không gọi tắt là Enrollment** — luôn đầy đủ `ClassEnrollment`. Tiếng Việt UI: "Học sinh trong lớp".
_Avoid_: Enrollment (đã có nghĩa khác — đăng ký Course), Membership, Roster entry

**Attendance**:
Điểm danh của một Student tại một Session: `PRESENT` / `ABSENT` / `LATE` / `EXCUSED`. Tiếng Việt UI: "Điểm danh".
_Avoid_: Check-in, Presence

### Flashcard

**FlashcardSet**:
Một bộ thẻ từ vựng có chủ đề và mức độ, do Teacher hoặc Admin tạo. Tiếng Việt UI: "Bộ thẻ từ".
_Avoid_: Deck, Card set, Vocabulary set

Mọi thao tác đọc/ghi FlashcardSet và FlashcardCard đi qua một module thuần `lib/flashcards/store.ts` (create/delete/addCard/removeCard/updateCard). Module nhận tham số `ownerId`: truyền `userId` để giới hạn theo người tạo (Teacher chỉ sửa bộ của mình), truyền `undefined` để thao tác trên mọi bộ (Admin/Owner). Cloudinary cleanup và việc đánh lại thứ tự card là chi tiết ẩn bên trong module. Auth + revalidate + redirect nằm ở seam (server action `lib/teacher/actions/flashcard.ts` và `lib/admin/flashcard-actions.ts`). Component UI (`FlashcardSetForm`, `FlashcardSetEditor`, `FlashcardDeleteButton`) dùng chung qua prop `role`.

**FlashcardCard**:
Một thẻ đơn trong FlashcardSet (ảnh + caption + thứ tự). Tiếng Việt UI: "Thẻ từ".
_Avoid_: Card, Item, Flashcard (khi đứng một mình — dễ nhầm với FlashcardSet)

**FlashcardSession**:
Một phiên Student luyện một FlashcardSet, có điểm và trạng thái hoàn thành. Tiếng Việt UI: "Phiên học thẻ".
_Avoid_: Practice, Study session, Session (đã có nghĩa khác — buổi học của Class)

### Hệ thống

**Notification**:
Thông báo gửi tới một User về một sự kiện (exam mới, booking duyệt/từ chối, course phê duyệt, ...). Tiếng Việt UI: "Thông báo".
_Avoid_: Alert, Message

**Page guard**:
Mọi Server Component (page.tsx) cần đăng nhập đều vào qua một seam chung `lib/auth/page-guard.ts` thay vì lặp lại `auth()` + `redirect("/login")`. `requirePageSession()` trả về `SessionUserBase` đã chắc chắn có (đẩy về `/login` nếu chưa đăng nhập); `requirePageRole(...roles)` thêm bước chặn theo Role (đẩy về `ROLE_HOME[role]` nếu sai vai trò). Khác với `requireSession`/`requireRole` trong `lib/auth/require.ts` (dành cho server action, trả `{ user, error }` để tự xử lý) — bộ `requirePage*` tự `redirect`, hợp với ngữ cảnh render trang. Kiểm tra quyền sở hữu đặc thù của từng trang (tác giả Course, người tạo câu hỏi, ...) vẫn nằm tại chính trang đó sau guard.
_Avoid_: Middleware (đây là guard ở tầng page, không phải middleware), Auth wrapper

