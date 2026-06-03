# 0001 — RoomSchedule là bảng denormalized, không phải view computed

## Context

Lịch phòng (`RoomSchedule`) phải hợp nhất hai nguồn dữ liệu khác nhau:
1. **ClassSession** — auto-tạo khi CBDT xếp Class với pattern lặp (vd "T5 17h–19h, 20 buổi").
2. **RoomBooking** — yêu cầu đặt phòng ad-hoc, có trạng thái PENDING/APPROVED/REJECTED.

Hai nguồn đều có thể chiếm cùng một Room và phải detect xung đột chéo: tạo Session mới không được trùng RoomBooking đã duyệt, và ngược lại.

## Decision

Lưu `RoomSchedule` thành **bảng denormalized riêng**, với mỗi `RoomOccupancy` ghi rõ nguồn (`source: CLASS_SESSION | BOOKING` + foreign key tới Session hoặc RoomBooking tương ứng). Bảng được cập nhật trong cùng transaction với hành động sinh ra nó (tạo Session, duyệt RoomBooking, etc.) và có **unique constraint trên `(roomId, startsAt, endsAt)` overlap** để DB từ chối double-booking ở tầng thấp nhất.

## Considered alternatives

**View computed (query 2 bảng + merge khi đọc)** — đơn giản hơn, không bao giờ data drift. Bị loại vì:
- Logic detect xung đột phải lặp lại ở mọi điểm gọi (tạo Session, duyệt Booking, render UI matrix phòng). Dễ bỏ sót.
- Không tận dụng được DB constraint — phải dựa vào application-level lock, dễ race condition khi hai CBDT thao tác đồng thời.
- UI matrix phòng (giống `/student/schedule` nhưng phức tạp hơn) sẽ query rất nóng — denormalize giúp đơn giản query path.

Đánh đổi: phải đảm bảo mọi đường ghi vào Session/RoomBooking đều cập nhật `RoomSchedule` trong cùng transaction. Rủi ro data drift được kiểm soát bằng (a) constraint DB, (b) tập trung mọi đường ghi qua một module `lib/rooms/` duy nhất.

## Chỉnh sửa lại logic và UX-UI
- Nhiều phần trong hệ thống có logic, UX-UI chưa tốt. Cần đánh giá để thiết kế, sửa lại.