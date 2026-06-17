import { describe, expect, it } from "vitest";
import {
  addDays,
  allowedAvailabilityModes,
  cellKey,
  coversAllCells,
  dayOfWeekFromYmd,
  generateSessionPlan,
  suggestMakeupDate,
  timeRangeToDigitalSlots,
  weeklyPatternToCells,
  weeklySlotKey,
  type WeeklyCell,
} from "@/lib/classes/scheduling";
import type { AvailabilityMode } from "@/lib/types";

describe("dayOfWeekFromYmd", () => {
  it("trả về đúng thứ trong tuần", () => {
    expect(dayOfWeekFromYmd("2026-06-15")).toBe("MON");
    expect(dayOfWeekFromYmd("2026-06-16")).toBe("TUE");
    expect(dayOfWeekFromYmd("2026-06-21")).toBe("SUN");
  });
});

describe("addDays", () => {
  it("cộng ngày trong cùng tháng", () => {
    expect(addDays("2026-06-15", 1)).toBe("2026-06-16");
    expect(addDays("2026-06-15", 7)).toBe("2026-06-22");
  });

  it("xử lý vắt sang tháng và năm", () => {
    expect(addDays("2026-06-30", 1)).toBe("2026-07-01");
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });
});

describe("timeRangeToDigitalSlots", () => {
  it("trả về các ô digital mà khoảng giờ CHẠM tới (overlap)", () => {
    expect(timeRangeToDigitalSlots("18:00", "20:00")).toEqual([
      "EVENING_18_19",
      "EVENING_19_20",
    ]);
  });

  it("tính cả ô bị chạm một phần", () => {
    expect(timeRangeToDigitalSlots("08:15", "09:45")).toEqual([
      "MORNING_08_09",
      "MORNING_09_10",
    ]);
  });
});

describe("weeklyPatternToCells", () => {
  it("gom các ô (thứ × slot) và khử trùng lặp", () => {
    expect(weeklyPatternToCells([{ dayOfWeek: "MON", startTime: "18:00", endTime: "20:00" }])).toEqual([
      { dayOfWeek: "MON", slot: "EVENING_18_19" },
      { dayOfWeek: "MON", slot: "EVENING_19_20" },
    ]);
  });
});

describe("cellKey & weeklySlotKey", () => {
  it("sinh khóa định danh đúng định dạng", () => {
    expect(cellKey("MON", "EVENING_18_19")).toBe("MON_EVENING_18_19");
    expect(weeklySlotKey("WED", "18:00", "20:00")).toBe("WED_18:00_20:00");
  });
});

describe("allowedAvailabilityModes", () => {
  it("ONLINE nhận BOTH và ONLINE_ONLY", () => {
    expect(allowedAvailabilityModes("ONLINE")).toEqual(["BOTH", "ONLINE_ONLY"]);
  });

  it("OFFLINE/HYBRID chỉ nhận BOTH", () => {
    expect(allowedAvailabilityModes("OFFLINE")).toEqual(["BOTH"]);
    expect(allowedAvailabilityModes("HYBRID")).toEqual(["BOTH"]);
  });
});

describe("coversAllCells", () => {
  const cells: WeeklyCell[] = [
    { dayOfWeek: "MON", slot: "EVENING_18_19" },
    { dayOfWeek: "WED", slot: "EVENING_18_19" },
  ];

  it("trả về false khi không có ô nào", () => {
    expect(coversAllCells([], new Map(), "OFFLINE")).toBe(false);
  });

  it("đủ điều kiện khi rảnh (mode hợp lệ) ở mọi ô", () => {
    const map = new Map<string, AvailabilityMode>([
      [cellKey("MON", "EVENING_18_19"), "BOTH"],
      [cellKey("WED", "EVENING_18_19"), "BOTH"],
    ]);
    expect(coversAllCells(cells, map, "OFFLINE")).toBe(true);
  });

  it("thiếu một ô bất kỳ ⇒ không đủ điều kiện", () => {
    const map = new Map<string, AvailabilityMode>([
      [cellKey("MON", "EVENING_18_19"), "BOTH"],
    ]);
    expect(coversAllCells(cells, map, "OFFLINE")).toBe(false);
  });

  it("ONLINE_ONLY không hợp lệ cho lớp OFFLINE nhưng hợp lệ cho ONLINE", () => {
    const map = new Map<string, AvailabilityMode>([
      [cellKey("MON", "EVENING_18_19"), "ONLINE_ONLY"],
      [cellKey("WED", "EVENING_18_19"), "ONLINE_ONLY"],
    ]);
    expect(coversAllCells(cells, map, "OFFLINE")).toBe(false);
    expect(coversAllCells(cells, map, "ONLINE")).toBe(true);
  });
});

describe("generateSessionPlan", () => {
  it("sinh đúng số buổi, lặp theo khung tuần, đánh số tuần tự", () => {
    const plan = generateSessionPlan({
      startDate: "2026-06-15", // Thứ Hai
      weeklySlots: [
        { dayOfWeek: "MON", startTime: "18:00", endTime: "20:00" },
        { dayOfWeek: "WED", startTime: "18:00", endTime: "20:00" },
      ],
      sessionCount: 4,
    });
    expect(plan).toEqual([
      { sessionNumber: 1, date: "2026-06-15", dayOfWeek: "MON", startTime: "18:00", endTime: "20:00" },
      { sessionNumber: 2, date: "2026-06-17", dayOfWeek: "WED", startTime: "18:00", endTime: "20:00" },
      { sessionNumber: 3, date: "2026-06-22", dayOfWeek: "MON", startTime: "18:00", endTime: "20:00" },
      { sessionNumber: 4, date: "2026-06-24", dayOfWeek: "WED", startTime: "18:00", endTime: "20:00" },
    ]);
  });

  it("nhiều khung cùng ngày được sắp theo giờ bắt đầu", () => {
    const plan = generateSessionPlan({
      startDate: "2026-06-15",
      weeklySlots: [
        { dayOfWeek: "MON", startTime: "10:00", endTime: "11:00" },
        { dayOfWeek: "MON", startTime: "08:00", endTime: "09:00" },
      ],
      sessionCount: 2,
    });
    expect(plan.map((s) => s.startTime)).toEqual(["08:00", "10:00"]);
    expect(plan.every((s) => s.date === "2026-06-15")).toBe(true);
  });

  it("trả về mảng rỗng khi sessionCount<=0 hoặc không có khung", () => {
    expect(
      generateSessionPlan({ startDate: "2026-06-15", weeklySlots: [{ dayOfWeek: "MON", startTime: "18:00", endTime: "20:00" }], sessionCount: 0 }),
    ).toEqual([]);
    expect(generateSessionPlan({ startDate: "2026-06-15", weeklySlots: [], sessionCount: 4 })).toEqual([]);
  });
});

describe("suggestMakeupDate", () => {
  it("đề xuất ngày kế tiếp khớp khung tuần", () => {
    expect(
      suggestMakeupDate({
        afterDate: "2026-06-15", // Thứ Hai
        weeklySlots: [{ dayOfWeek: "WED", startTime: "18:00", endTime: "20:00" }],
      }),
    ).toEqual({ date: "2026-06-17", startTime: "18:00", endTime: "20:00" });
  });

  it("bỏ qua các ngày cần tránh", () => {
    expect(
      suggestMakeupDate({
        afterDate: "2026-06-15",
        weeklySlots: [{ dayOfWeek: "WED", startTime: "18:00", endTime: "20:00" }],
        avoidDates: ["2026-06-17"],
      }),
    ).toEqual({ date: "2026-06-24", startTime: "18:00", endTime: "20:00" });
  });

  it("trả về null khi không có khung tuần", () => {
    expect(suggestMakeupDate({ afterDate: "2026-06-15", weeklySlots: [] })).toBeNull();
  });
});
