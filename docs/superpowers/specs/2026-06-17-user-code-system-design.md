# Spec: Hệ thống mã định danh user (Phase 1)

- **Ngày:** 2026-06-17
- **Trạng thái:** Đã chốt qua brainstorming, chờ review trước khi lập plan
- **Phạm vi:** Phase 1 — mã user + bảng loại cấu hình. KHÔNG đụng framework phân quyền.

## 1. Bối cảnh & mục tiêu

Mỗi User cần một **mã định danh người-đọc-được** để quản lý theo hệ thống nhân sự của trung tâm (dùng `id` cuid không quản lý tốt). Mã theo **loại** user, prefix khác nhau:
`HS-2026-000001` (học sinh), `CN-894` (nhân viên công nghệ), `MKT-712` (marketing)…

Hiện trạng: `User.avatarUrl` đã có; **chưa có** field mã nào; "marketing" chưa tồn tại trong `StaffPosition`.

## 2. Quyết định (từ brainstorming)

| Vấn đề | Quyết định |
|---|---|
| Quản lý prefix | **Bảng cấu hình trong DB** (admin tự thêm/sửa loại + prefix qua UI) |
| Ánh xạ loại → user | **Chiều độc lập** (`UserCategory`), tách khỏi `StaffPosition` |
| Phân quyền | **Giữ nguyên** (Role + StaffPosition). Tích hợp loại vào quyền = Phase 2 |
| Đánh số HS | `HS-{năm tạo}-{seq}`, **reset mỗi năm**, pad 6 |
| Mã NV/GV/PH | **Auto** `{PREFIX}-{seq}` khi tạo, admin **sửa được** thành số HR thật |
| Tự đăng ký | **Bỏ** (xem §6). Mọi tài khoản do admin/staff tạo |
| Tạo HS | Admin (`createUserAction`) **+ thêm luồng staff** (`student.create`, đã có key) |
| Đăng nhập | Vẫn bằng **email**; mã chỉ để quản lý/tìm/hiển thị |

## 3. Mô hình dữ liệu

File mới `prisma/schema/user_category.prisma`:

```prisma
model UserCategory {
  id          String   @id @default(cuid())
  label       String              // "Học sinh", "Nhân viên công nghệ", "Marketing"
  prefix      String   @unique    // "HS", "CN", "MKT" (admin sửa được)
  systemKey   String?  @unique    // "STUDENT"/"OWNER"/"STAFF_NVSALE"… cho loại hệ thống; null cho loại admin tự thêm (Marketing). Dùng để resolve ổn định dù prefix đổi.
  includeYear Boolean  @default(false) // HS = true
  padWidth    Int      @default(6)     // số chữ số tối thiểu (000001); 0 = không pad
  sortOrder   Int      @default(0)
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  users    User[]
  counters UserCodeCounter[]
  @@map("user_categories")
}

// Bộ đếm atomic, tách riêng để reset theo năm cho HS.
model UserCodeCounter {
  id         String @id @default(cuid())
  categoryId String
  year       Int    // HS = năm tạo; loại không-năm = 0
  nextSeq    Int    @default(1)

  category UserCategory @relation(fields: [categoryId], references: [id], onDelete: Cascade)
  @@unique([categoryId, year])
  @@map("user_code_counters")
}
```

`User` thêm:
```prisma
code       String?       @unique  // null tạm khi migrate; luôn set khi tạo + sau backfill
categoryId String?
category   UserCategory? @relation(fields: [categoryId], references: [id])
@@index([categoryId])
```

## 4. Sinh mã

**Pure module** `lib/users/user-code.ts` (không DB, **TDD**):
```
formatUserCode({ prefix, includeYear, padWidth, year, seq }): string
  includeYear  → `${prefix}-${year}-${padStart(seq, padWidth)}`   // HS-2026-000001
  !includeYear → `${prefix}-${padStart(seq, padWidth)}`           // CN-001
```

**Cấp số atomic** (store, trong cùng transaction tạo user):
- `year = includeYear ? new Date().getFullYear() : 0`
- `upsert` counter `(categoryId, year)`: create `nextSeq=2` / update `nextSeq: { increment: 1 }`; `seq = row.nextSeq - 1`.
- Chống đua tranh bằng `@@unique([categoryId, year])` + increment atomic; race tạo-mới hiếm → bắt unique-violation và retry.
- Admin override mã: bỏ qua auto, validate format + `@unique`.

## 5. Luồng tạo/sửa (tái dùng chung 1 helper sinh mã)

- **`createUserAction`** (admin, `requireAdmin`): thêm chọn **Category** + ô **Code** (auto-fill, sửa được). Sinh mã trong transaction tạo user.
- **`createStudentAction`** (staff, **mới**): gate `can(user, "student.create")` (đã cấp cho CBDTS; admin mở rộng qua matrix). Ép `role = STUDENT`, category có `systemKey = "STUDENT"`, auto mã. `revalidatePath("/staff/students")`.
- **`updateUserAction`**: cho sửa `code` (validate `@unique`) + đổi `categoryId`. Sửa mã → ghi **`AuditLog`**. Đổi category **không** regenerate mã (mã là danh tính cố định).

## 6. Bỏ tự đăng ký

| Nơi | Hành động |
|---|---|
| `app/(auth)/register/page.tsx` | Xoá trang |
| `lib/auth/actions/register.ts` | Xoá `registerAction` |
| `app/(auth)/login/page.tsx:35` | Bỏ link "Đăng ký ngay" |
| `app/page.tsx:115,342` | Đổi CTA "Đăng ký miễn phí" → "Đăng nhập" |
| `lib/auth/access.ts` | Bỏ `/register` khỏi `PUBLIC_ROUTES` |
| `lib/proxy/app-proxy.ts` | Bỏ tham chiếu `/register` |

(Chỗ "đăng ký" về Enrollment/ghi danh lớp — giữ nguyên.)

## 7. UI

- **`/admin/user-categories`** (mới, `requireAdmin`): CRUD loại (label, prefix, includeYear, padWidth, isActive).
- **Form tạo/sửa user** (`AddUserForm`, `UserForms`): + Category select, + Code field (auto-fill + override).
- **Danh sách user** (`admin/users/page.tsx`): + cột **Mã**, + **tìm theo mã** (mở rộng search hiện có).
- **`/staff/students/new`** (mới): form staff tạo HS → `createStudentAction`.
- **Settings** (`SettingsForms`): hiện **Mã** read-only cho chính chủ.

## 8. Backfill + seed test đầy đủ

### 8a. Backfill (DB đang chạy)
Script `scripts/backfill-user-codes.ts` (1 lần, idempotent — bỏ qua user đã có mã):
1. Seed loại mặc định kèm `systemKey`, 1 dòng / (Role, StaffPosition): STUDENT→`HS` (year, pad6); OWNER→`CN`; TEACHER→`GV`; PARENT→`PH`; ADMIN→`QT`; STAFF: NVSALE/NVLT/CBNK/CBDH/CBDT/CBDTS → prefix mặc định. *(Marketing admin tự thêm, `systemKey=null`.)*
2. Gán `categoryId` cho user cũ: map `role` (hoặc `staffPosition` nếu STAFF) → `systemKey`.
3. Sinh mã: HS gom theo **năm tạo**, sắp `createdAt` → seq; loại khác sắp `createdAt` → seq. Cập nhật counters.

### 8b. Seed test đầy đủ (dựng mới — quy mô VÀI TRĂM+ HS)
Mục tiêu: mọi role + mọi màn hình có data thật, stress-scale.
- **Quy mô**: ~300–500 HS · ~30 GV · nhiều NV mỗi position · PH (link tới HS) · hàng chục Class.
- **Mọi user có `category` + `code`** (HS auto `HS-2026-NNNNNN`…).
- **Lấp khoảng trống** (hiện chưa seed): RoomBooking (đủ trạng thái) + RoomOccupancy, RoomLayoutImage, FlashcardSession, Notification (mọi loại), ExamAttempt.aiFeedback, AuditLog, SecurityAnswer.
- **Ràng buộc kỹ thuật ở quy mô lớn**:
  - **Occupancy phòng KHÔNG được trùng** (EXCLUDE constraint `room_occupancies_no_overlap`) → cần bước **xếp phòng/giờ conflict-free** (tôn trọng cả capacity phòng vs sĩ số lớp); ghi occupancy qua `lib/rooms/store` (logic ADR-0001), không insert thô.
  - **Hiệu năng**: dùng `createMany` theo lô (session/attendance/answer có thể hàng chục nghìn dòng), tránh insert từng dòng.
  - **Tất định**: sinh tên/dữ liệu từ pool (`seedData/*.json`) + seed RNG cố định để chạy lại cho kết quả giống nhau.
- Cập nhật `prisma/seed.ts` + `prisma/seedContent.ts` (thống nhất với `seedData/seed.ts`).

## 9. Phân quyền (Phase 1, tối thiểu)

- Tạo HS bởi staff: **tái dùng key `student.create` sẵn có** (không thêm key). Mặc định CBDTS có; admin cấp thêm CBĐT/NVSALE qua matrix UI.
- Quản lý `UserCategory`: **admin-only** (`requireAdmin`). Không thêm key mới ở Phase 1.

## 10. Test

- **TDD** `lib/users/user-code.ts`: có/không năm; padWidth 6 / 3 / 0; seq lớn (vượt padWidth); biên.
- (Tùy chọn) test cấp-số với prisma mock theo pattern `tests/classes/eligibility.test.ts`.

## 11. Giả định / mặc định

- `code` bắt buộc & `@unique` sau tạo (nullable trong DB chỉ để migrate trước backfill).
- Đổi category không regenerate mã.
- `prefix` unique giữa các loại.
- Mã không phải credential đăng nhập (Phase 1).

## 12. Ngoài phạm vi (đã chốt)

- **Phase 2:** tích hợp `UserCategory` vào framework phân quyền (CategoryPermission / thay dần PositionPermission).
- **Phase 3:** cập nhật avatar (field `avatarUrl` đã có; cần UI upload + action + thêm `avatarPublicId` để dọn ảnh cũ Cloudinary).
