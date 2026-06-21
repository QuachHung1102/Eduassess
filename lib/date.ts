/**
 * Tiện ích ngày cho cột `@db.Date` (Postgres "date" — chỉ ngày, không giờ).
 *
 * Postgres lưu `@db.Date` theo PHẦN NGÀY-UTC của Date truyền vào. Do đó để
 * round-trip một ngày dương lịch ổn định, BẤT KỂ múi giờ máy chạy:
 *  - Ghi: "YYYY-MM-DD" → Date ở **UTC nửa đêm** (ngày-UTC khớp đúng).
 *    Mẫu cũ `new Date("YYYY-MM-DDT00:00:00")` dùng giờ LOCAL → ở UTC+7 lùi 1 ngày khi lưu.
 *  - Đọc: Date Prisma trả (UTC nửa đêm) → 10 ký tự đầu của ISO.
 */

/** "YYYY-MM-DD" → Date để ghi cột `@db.Date` (UTC nửa đêm, không lệch múi giờ). */
export function ymdToDbDate(ymd: string): Date {
  return new Date(`${ymd}T00:00:00.000Z`);
}

/** Date của cột `@db.Date` (Prisma trả UTC nửa đêm) → "YYYY-MM-DD". */
export function dbDateToYmd(date: Date): string {
  return date.toISOString().slice(0, 10);
}
