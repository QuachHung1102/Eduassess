import { describe, expect, it } from "vitest";
import { ymdToDbDate, dbDateToYmd } from "@/lib/date";

// Cột `@db.Date` của Postgres lưu PHẦN NGÀY THEO UTC của Date được truyền vào.
// Vì vậy muốn lưu đúng ngày dương lịch (vd "2026-06-22") thì Date phải có
// thành phần NGÀY-UTC đúng bằng ngày đó — bất kể máy chạy ở múi giờ nào.
// (Mẫu cũ `new Date("2026-06-22T00:00:00")` là giờ LOCAL → ở UTC+7 lùi 1 ngày.)

describe("ymdToDbDate — chuỗi YYYY-MM-DD → Date để ghi cột @db.Date", () => {
  it("giữ đúng ngày dương lịch (UTC date), không lệch theo múi giờ máy", () => {
    expect(ymdToDbDate("2026-06-22").toISOString().slice(0, 10)).toBe("2026-06-22");
  });

  it("đúng ở mốc đầu/cuối tháng & năm", () => {
    expect(ymdToDbDate("2026-01-01").toISOString().slice(0, 10)).toBe("2026-01-01");
    expect(ymdToDbDate("2026-12-31").toISOString().slice(0, 10)).toBe("2026-12-31");
  });
});

describe("dbDateToYmd — Date Prisma trả về (@db.Date = UTC nửa đêm) → YYYY-MM-DD", () => {
  it("đọc lại đúng ngày đã lưu", () => {
    expect(dbDateToYmd(new Date("2026-06-22T00:00:00.000Z"))).toBe("2026-06-22");
  });
});

describe("round-trip ymd → db → ymd ổn định", () => {
  it("không đổi giá trị qua một vòng ghi/đọc", () => {
    for (const ymd of ["2026-01-01", "2026-06-22", "2026-12-31"]) {
      expect(dbDateToYmd(ymdToDbDate(ymd))).toBe(ymd);
    }
  });
});
