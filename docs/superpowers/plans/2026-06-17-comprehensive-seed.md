# Comprehensive Test Seed — Implementation Plan (Plan 2)

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development hoặc superpowers:executing-plans. Steps dùng checkbox `- [ ]`.

**Goal:** Dựng seed test quy mô **~400 HS** với MỌI domain có data thật + lấp khoảng trống, **conflict-free**, **tất định**, **performant**.

**Architecture:** Tách helper pure (RNG, name-pool, room-allocator) — **TDD** — khỏi phần ghi DB. Phần ghi DB mở rộng `prisma/seed.ts` (scale user) + thêm `prisma/seedLarge.ts` (lớp OFFLINE + gap-fills) gọi sau `seedContent()`. Chạy qua `db:reset`.

**Tech Stack:** Prisma 7 + Postgres (EXCLUDE constraint `room_occupancies_no_overlap`), tsx, Vitest. Occupancy ghi qua `lib/rooms/store`.

**Quy ước commit:** kết thúc bằng `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

**Spec nguồn:** `docs/superpowers/specs/2026-06-17-user-code-system-design.md` §8b.

---

## Bối cảnh (từ đọc seed hiện tại)

- `seed.ts`: core (Subject/Grade/Topic/Question/User/Parent/Room/BookingReason) + gọi `seedPermissions`, `seedContent`, rồi `seedSystemCategories`+`assignCodesToUsersWithoutCode` (Plan 1). HS hiện ~40 (`hs0001`–`hs0040` từ JSON?).
- `seedContent.ts`: **idempotent**. 1 lớp demo **ONLINE** (né occupancy), flashcard/course/exam/level.
- **Khoảng trống chưa seed:** RoomOccupancy + RoomBooking, RoomLayoutImage, FlashcardSession, Notification, ExamAttempt.aiFeedback, AuditLog, SecurityAnswer.
- Mọi user đã có `code`/`categoryId` nhờ Plan 1 (bước cuối seed.ts).

## File Structure

| File | Trách nhiệm |
|---|---|
| `lib/seed/rng.ts` (tạo) | RNG tất định (mulberry32) + helpers (pick, shuffle, int) — **pure** |
| `lib/seed/names.ts` (tạo) | Pool họ/tên VN + `genStudent(i)`/`genTeacher(i)` — pure |
| `lib/seed/room-allocator.ts` (tạo) | **Xếp (room, slot) conflict-free** cho weekly slots — pure, **phần khó nhất** |
| `prisma/seed.ts` (sửa) | Scale user qua `createMany`; tham số quy mô qua env |
| `prisma/seedLarge.ts` (tạo) | Lớp OFFLINE (dùng allocator) + occupancy + gap-fills; gọi cuối `seed.ts` |
| `scripts/check-seed.ts` (tạo) | Đếm bản ghi mỗi domain + kiểm EXCLUDE constraint sau seed |

---

## Task 1: RNG tất định (TDD)

**Files:** `lib/seed/rng.ts`, `tests/seed/rng.test.ts`

- [ ] **Step 1 — test (FAIL):** cùng seed ⇒ cùng dãy; `int(a,b)` trong khoảng; `pick`/`shuffle` ổn định theo seed.
```ts
import { describe, expect, it } from "vitest";
import { makeRng } from "@/lib/seed/rng";

describe("makeRng", () => {
  it("tất định theo seed", () => {
    const a = makeRng(42); const b = makeRng(42);
    expect([a.next(), a.next(), a.next()]).toEqual([b.next(), b.next(), b.next()]);
  });
  it("int trong [min,max]", () => {
    const r = makeRng(1);
    for (let i = 0; i < 100; i++) { const n = r.int(3, 7); expect(n).toBeGreaterThanOrEqual(3); expect(n).toBeLessThanOrEqual(7); }
  });
  it("pick lấy phần tử trong mảng; shuffle giữ nguyên multiset", () => {
    const r = makeRng(7); const arr = [1,2,3,4,5];
    expect(arr).toContain(r.pick(arr));
    expect([...r.shuffle(arr)].sort()).toEqual([1,2,3,4,5]);
  });
});
```
- [ ] **Step 2 — run FAIL:** `npx vitest run tests/seed/rng.test.ts`
- [ ] **Step 3 — impl:**
```ts
export type Rng = {
  next(): number;                 // [0,1)
  int(min: number, max: number): number; // inclusive
  pick<T>(arr: readonly T[]): T;
  shuffle<T>(arr: readonly T[]): T[];
  bool(p?: number): boolean;
};
export function makeRng(seed: number): Rng {
  let s = seed >>> 0;
  const next = () => {
    s |= 0; s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (min: number, max: number) => min + Math.floor(next() * (max - min + 1));
  const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(next() * arr.length)];
  const shuffle = <T,>(arr: readonly T[]): T[] => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(next() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };
  const bool = (p = 0.5) => next() < p;
  return { next, int, pick, shuffle, bool };
}
```
- [ ] **Step 4 — run PASS.** **Step 5 — commit.**

---

## Task 2: Pool tên VN + generator hồ sơ (TDD nhẹ)

**Files:** `lib/seed/names.ts`, `tests/seed/names.test.ts`

- [ ] Pool `HỌ` (Nguyễn, Trần, Lê, Phạm, Hoàng, Phan, Vũ, Đặng, Bùi, Đỗ…), `TÊN_ĐỆM`, `TÊN`. Hàm `genName(rng)` ghép; `genStudent(i, rng)` → `{ name, email: hsNNNN@eduassess.vn, sex, dob, phone }` (email theo index để unique + ổn định).
- [ ] Test: email đúng định dạng + unique theo i; name không rỗng.
- [ ] commit.

---

## Task 3: Scale user trong seed.ts (createMany)

**Files:** `prisma/seed.ts`

- [ ] Đọc quy mô từ env: `const N_STUDENTS = Number(process.env.SEED_STUDENTS ?? 400)`, `N_TEACHERS = 30`. Giữ các tài khoản "mốc" (admin/owner/gv.toan1/hs0001…hs0005 cho e2e) **đầu danh sách** để email cố định.
- [ ] Sinh HS bằng `genStudent(i, rng)` → `prisma.user.createMany({ data: [...], skipDuplicates: true })` theo lô 500. Tương tự GV (gắn môn dạy sau), thêm vài NV mỗi position, ~50 PH (link `ParentStudent` tới HS ngẫu nhiên).
- [ ] Hash mật khẩu: dùng **một** hash `Student123!` chung cho HS (tránh bcrypt 400×, chậm) — chấp nhận cho seed test.
- [ ] Plan-1 bước cuối (`assignCodesToUsersWithoutCode`) tự cấp mã cho toàn bộ — không sửa.
- [ ] commit.

---

## Task 4: Room allocator conflict-free (TDD) — phần khó nhất

**Files:** `lib/seed/room-allocator.ts`, `tests/seed/room-allocator.test.ts`

Bài toán: cho danh sách lớp OFFLINE, mỗi lớp cần `k` khung tuần (day+giờ) và sĩ số `size`; cho danh sách phòng (capacity). Gán mỗi (lớp, khung) vào một (room, day, startHour) sao cho: **không hai khung trùng (room, day, [start,end))**, room.capacity ≥ size. Trả lịch hoặc báo phần không xếp được.

- [ ] **Step 1 — test (FAIL):** 2 lớp cùng MON 18–20 phải vào 2 phòng khác nhau; lớp size 40 không vào phòng cap 30; khung không trùng giờ cùng phòng OK; allocator tất định theo rng.
```ts
import { describe, expect, it } from "vitest";
import { allocateRooms, type RoomSlot } from "@/lib/seed/room-allocator";
import { makeRng } from "@/lib/seed/rng";

const rooms = [{ id: "r1", capacity: 30 }, { id: "r2", capacity: 45 }];
describe("allocateRooms", () => {
  it("hai khung trùng giờ ⇒ khác phòng", () => {
    const res = allocateRooms({
      classes: [
        { id: "c1", size: 20, slots: [{ day: "MON", start: 18, end: 20 }] },
        { id: "c2", size: 20, slots: [{ day: "MON", start: 18, end: 20 }] },
      ], rooms, rng: makeRng(1),
    });
    const r = res.assignments.filter((a) => a.day === "MON" && a.start === 18);
    expect(new Set(r.map((a) => a.roomId)).size).toBe(2);
    expect(res.unassigned).toHaveLength(0);
  });
  it("tôn trọng capacity", () => {
    const res = allocateRooms({ classes: [{ id: "c1", size: 40, slots: [{ day: "MON", start: 8, end: 10 }] }], rooms, rng: makeRng(1) });
    expect(res.assignments[0].roomId).toBe("r2"); // chỉ r2 đủ chỗ
  });
});
```
- [ ] **Step 2 — run FAIL.**
- [ ] **Step 3 — impl:** greedy — với mỗi (lớp, khung) theo thứ tự, chọn phòng đầu tiên `capacity≥size` và còn trống ở (day,[start,end)); đánh dấu chiếm. Trả `{ assignments: {classId, slotIndex, roomId, day, start, end}[], unassigned: [...] }`. Dùng map `occupied[roomId][day]` = mảng khoảng để check overlap.
- [ ] **Step 4 — run PASS.** **Step 5 — commit.**

> Đây là logic ánh xạ thẳng sang RoomOccupancy. seedLarge dùng kết quả allocator để tạo ClassWeeklySlot.roomId + ClassSession.roomId + occupancy.

---

## Task 5: seedLarge — lớp OFFLINE + occupancy + buổi/điểm danh/đánh giá

**Files:** `prisma/seedLarge.ts` (tạo), `prisma/seed.ts` (gọi sau `seedContent()`)

- [ ] Lấy rooms, teachers, students, subjects, cbdt từ DB. Gọi `allocateRooms` cho ~20–30 lớp OFFLINE (mix môn/khối/targetLevel/trạng thái RECRUITING/ONGOING/FINISHED).
- [ ] Mỗi lớp: tạo `Class` + `ClassTeacher` + `ClassWeeklySlot` (roomId từ allocator) + `ClassEnrollment` (size HS, ≤ capacity) + sinh `ClassSession` (ngày-giờ từ khung; quá khứ = COMPLETED). **Ghi occupancy qua `lib/rooms/store` `occupyForSessions`** (cùng logic ADR-0001 → tôn trọng EXCLUDE constraint) thay vì insert thô.
- [ ] Buổi COMPLETED: `attendance.createMany` + `sessionEvaluation.createMany` theo lô.
- [ ] ~vài lớp ONLINE nữa (không occupancy). Availability cho nhiều HS/GV hơn.
- [ ] commit.

> Nếu `occupyForSessions` ném `isOverlapViolation` ⇒ allocator có lỗi; sửa allocator (re-check tại đây là lưới an toàn cuối).

---

## Task 6: Lấp khoảng trống còn lại

**Files:** `prisma/seedLarge.ts`

- [ ] **RoomLayoutImage:** mỗi Room đính 1 ảnh (DEMO_IMG + publicId giả) nếu thiếu.
- [ ] **RoomBooking:** ~30 booking đủ trạng thái (PENDING/APPROVED/REJECTED); APPROVED ⇒ `syncBookingOccupancy` (conflict-free, dùng allocator hoặc khung giờ trống).
- [ ] **Notification:** vài bản ghi mỗi `NotificationType` cho HS/GV/PH (href deep-link hợp lệ).
- [ ] **ExamAttempt.aiFeedback:** set vài attempt có chuỗi feedback mẫu.
- [ ] **FlashcardSession:** ~nhiều HS × FlashcardSet (mix completedAt null/đã xong).
- [ ] **SecurityAnswer:** vài HS có 3 câu hỏi bảo mật (hash đáp án).
- [ ] **AuditLog:** vài bản ghi (vd `user.code.update`, `booking.approve`).
- [ ] commit.

---

## Task 7: Performance + verify

**Files:** `scripts/check-seed.ts` (tạo), `package.json` (script `db:check-seed`)

- [ ] Đảm bảo mọi vòng lặp lớn dùng `createMany` theo lô (≤ ~1000 dòng/lô). Tránh `await` trong vòng for cho bản ghi con.
- [ ] `check-seed.ts`: đếm mỗi domain (users theo role, classes theo status, sessions, occupancies, bookings, notifications, attempts…) + `npm run db:check-occupancy` (kiểm EXCLUDE).
- [ ] **Run end-to-end:** `npm run db:reset` (đo thời gian; mục tiêu < ~60s) → `npm run db:check-seed` (mọi domain > 0, không lỗi constraint).
- [ ] commit.

---

## Self-Review checklist (chạy sau khi viết xong code)
- Mọi user có `code` (Plan 1 bước cuối) · occupancy không vi phạm EXCLUDE · seed tất định (chạy 2 lần ra cùng số) · không `.create` trong vòng lặp nóng · e2e accounts (hs0005, đề luyện tập) vẫn còn.

## Ngoài phạm vi
- UI mới (Plan 2 chỉ là dữ liệu). Tinh chỉnh nội dung marketing.
