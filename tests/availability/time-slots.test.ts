import { describe, expect, it } from "vitest";
import {
  expandAvailabilityTimeSlot,
  isAvailabilityDigitalTimeSlot,
  isLegacyTimeSlot,
  normalizeAvailabilitySlots,
} from "@/lib/availability/time-slots";
import type { TimeSlot } from "@/lib/types";

describe("isLegacyTimeSlot", () => {
  it("nhận biết các slot legacy", () => {
    expect(isLegacyTimeSlot("MORNING")).toBe(true);
    expect(isLegacyTimeSlot("AFTERNOON")).toBe(true);
    expect(isLegacyTimeSlot("EVENING")).toBe(true);
  });

  it("loại các slot digital", () => {
    expect(isLegacyTimeSlot("MORNING_07_08")).toBe(false);
    expect(isLegacyTimeSlot("EVENING_18_19")).toBe(false);
  });
});

describe("isAvailabilityDigitalTimeSlot", () => {
  it("nhận biết slot digital hợp lệ", () => {
    expect(isAvailabilityDigitalTimeSlot("MORNING_07_08")).toBe(true);
    expect(isAvailabilityDigitalTimeSlot("EVENING_21_22")).toBe(true);
  });

  it("loại slot legacy và slot không tồn tại", () => {
    expect(isAvailabilityDigitalTimeSlot("MORNING")).toBe(false);
    expect(isAvailabilityDigitalTimeSlot("BOGUS" as TimeSlot)).toBe(false);
  });
});

describe("expandAvailabilityTimeSlot", () => {
  it("mở rộng slot legacy thành các ô 1 tiếng", () => {
    expect(expandAvailabilityTimeSlot("MORNING")).toEqual([
      "MORNING_07_08",
      "MORNING_08_09",
      "MORNING_09_10",
      "MORNING_10_11",
      "MORNING_11_12",
    ]);
    expect(expandAvailabilityTimeSlot("EVENING")).toEqual([
      "EVENING_18_19",
      "EVENING_19_20",
      "EVENING_20_21",
      "EVENING_21_22",
    ]);
    expect(expandAvailabilityTimeSlot("AFTERNOON")).toHaveLength(6);
  });

  it("giữ nguyên slot digital", () => {
    expect(expandAvailabilityTimeSlot("AFTERNOON_14_15")).toEqual(["AFTERNOON_14_15"]);
  });

  it("trả về mảng rỗng cho slot không hợp lệ", () => {
    expect(expandAvailabilityTimeSlot("BOGUS" as TimeSlot)).toEqual([]);
  });
});

describe("normalizeAvailabilitySlots", () => {
  it("mở rộng slot legacy và gắn đúng thứ + mode", () => {
    const result = normalizeAvailabilitySlots([
      { dayOfWeek: "MON", slot: "MORNING", availabilityMode: "BOTH" },
    ]);
    expect(result).toHaveLength(5);
    expect(result.every((c) => c.dayOfWeek === "MON" && c.availabilityMode === "BOTH")).toBe(true);
    expect(result.map((c) => c.slot)).toEqual([
      "MORNING_07_08",
      "MORNING_08_09",
      "MORNING_09_10",
      "MORNING_10_11",
      "MORNING_11_12",
    ]);
  });

  it("bỏ qua các ô BUSY", () => {
    expect(
      normalizeAvailabilitySlots([
        { dayOfWeek: "MON", slot: "MORNING", availabilityMode: "BUSY" },
      ]),
    ).toEqual([]);
  });

  it("khử trùng lặp theo (thứ × slot) — bản ghi sau ghi đè trước", () => {
    const result = normalizeAvailabilitySlots([
      { dayOfWeek: "TUE", slot: "EVENING_18_19", availabilityMode: "BOTH" },
      { dayOfWeek: "TUE", slot: "EVENING_18_19", availabilityMode: "ONLINE_ONLY" },
    ]);
    expect(result).toEqual([
      { dayOfWeek: "TUE", slot: "EVENING_18_19", availabilityMode: "ONLINE_ONLY" },
    ]);
  });
});
