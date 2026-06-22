import { describe, expect, it, vi } from "vitest";

// store.ts import prisma ở top-level; stub để không chạm DB thật. Các helper
// thời gian được test dưới đây là hàm thuần, không gọi prisma.
vi.mock("@/lib/db/prisma", () => ({ prisma: {} }));

import {
  combineDateTime,
  sessionOccupancyRange,
  isOverlapViolation,
  NO_OVERLAP_CONSTRAINT,
} from "@/lib/rooms/store";

// Tất cả assert theo UTC tuyệt đối → test độc lập với TZ của máy chạy CI.
// 14:00 giờ Saigon (UTC+7) = 07:00Z cùng ngày.
describe("combineDateTime — ghép ngày+giờ ở Asia/Saigon (UTC+7)", () => {
  it("nhận chuỗi YYYY-MM-DD", () => {
    expect(combineDateTime("2026-06-22", "14:00").toISOString()).toBe(
      "2026-06-22T07:00:00.000Z",
    );
  });

  it("nhận Date của cột @db.Date (UTC nửa đêm) — KHÔNG lùi ngày", () => {
    // Prisma trả @db.Date dạng UTC nửa đêm; phải ra đúng 06-22, không phải 06-21.
    const dbDate = new Date("2026-06-22T00:00:00.000Z");
    expect(combineDateTime(dbDate, "14:00").toISOString()).toBe(
      "2026-06-22T07:00:00.000Z",
    );
  });

  it("nửa đêm Saigon = 17:00Z hôm trước (offset tường minh)", () => {
    expect(combineDateTime("2026-06-22", "00:00").toISOString()).toBe(
      "2026-06-21T17:00:00.000Z",
    );
  });
});

describe("sessionOccupancyRange", () => {
  it("dựng [startsAt, endsAt) theo giờ Saigon", () => {
    const { startsAt, endsAt } = sessionOccupancyRange({
      date: "2026-06-22",
      startTime: "18:00",
      endTime: "20:00",
    });
    expect(startsAt.toISOString()).toBe("2026-06-22T11:00:00.000Z");
    expect(endsAt.toISOString()).toBe("2026-06-22T13:00:00.000Z");
  });

  it("nhất quán giữa nguồn ngày chuỗi và @db.Date", () => {
    const fromStr = sessionOccupancyRange({
      date: "2026-06-22",
      startTime: "09:00",
      endTime: "10:30",
    });
    const fromDbDate = sessionOccupancyRange({
      date: new Date("2026-06-22T00:00:00.000Z"),
      startTime: "09:00",
      endTime: "10:30",
    });
    expect(fromDbDate.startsAt.toISOString()).toBe(fromStr.startsAt.toISOString());
    expect(fromDbDate.endsAt.toISOString()).toBe(fromStr.endsAt.toISOString());
  });
});

describe("isOverlapViolation", () => {
  it("bắt lỗi EXCLUDE constraint theo tên", () => {
    expect(isOverlapViolation(new Error(`boom ${NO_OVERLAP_CONSTRAINT} blah`))).toBe(
      true,
    );
  });

  it("bỏ qua lỗi khác / non-Error", () => {
    expect(isOverlapViolation(new Error("lỗi khác"))).toBe(false);
    expect(isOverlapViolation("không phải Error")).toBe(false);
    expect(isOverlapViolation(null)).toBe(false);
  });
});
