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
_Avoid_: Item, Problem

### Lịch rảnh & xếp lớp

**Availability**:
Bản kê thời gian Student có thể tham gia học, gồm 105 ô (7 ngày × 15 TimeSlot) trong một tuần điển hình. Đầu vào để CBDT xếp Class/Session phù hợp. Route `/student/schedule` thao tác trực tiếp lên Availability của Student đang đăng nhập. Tiếng Việt UI: "Lịch rảnh".
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
