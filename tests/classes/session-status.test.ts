import { describe, expect, it } from "vitest";
import {
  getSessionPhase,
  canTakeAttendance,
  attendanceGateMessage,
  SESSION_PHASE_LABEL,
} from "@/lib/classes/session-status";

// Buổi mẫu: 2026-06-21, 09:00–11:00.
const base = { date: "2026-06-21", startTime: "09:00", endTime: "11:00" } as const;
const before = new Date("2026-06-21T08:00:00");
const atStart = new Date("2026-06-21T09:00:00");
const during = new Date("2026-06-21T10:00:00");
const atEnd = new Date("2026-06-21T11:00:00");
const after = new Date("2026-06-21T12:00:00");

describe("getSessionPhase — pha thời gian dẫn xuất (status SCHEDULED)", () => {
  it("trước giờ bắt đầu → UPCOMING", () => {
    expect(getSessionPhase({ ...base, status: "SCHEDULED" }, before)).toBe("UPCOMING");
  });
  it("đúng giờ bắt đầu → ONGOING (bao gồm mốc start)", () => {
    expect(getSessionPhase({ ...base, status: "SCHEDULED" }, atStart)).toBe("ONGOING");
  });
  it("trong khung giờ → ONGOING", () => {
    expect(getSessionPhase({ ...base, status: "SCHEDULED" }, during)).toBe("ONGOING");
  });
  it("đúng giờ kết thúc → ONGOING (bao gồm mốc end)", () => {
    expect(getSessionPhase({ ...base, status: "SCHEDULED" }, atEnd)).toBe("ONGOING");
  });
  it("sau giờ kết thúc mà vẫn SCHEDULED → OVERDUE (chờ điểm danh)", () => {
    expect(getSessionPhase({ ...base, status: "SCHEDULED" }, after)).toBe("OVERDUE");
  });
});

describe("getSessionPhase — status đã chốt thắng pha thời gian", () => {
  it("CANCELLED luôn là CANCELLED, kể cả trong giờ", () => {
    expect(getSessionPhase({ ...base, status: "CANCELLED" }, during)).toBe("CANCELLED");
  });
  it("COMPLETED luôn là COMPLETED, kể cả trước giờ", () => {
    expect(getSessionPhase({ ...base, status: "COMPLETED" }, before)).toBe("COMPLETED");
  });
  it("POSTPONED luôn là POSTPONED", () => {
    expect(getSessionPhase({ ...base, status: "POSTPONED" }, during)).toBe("POSTPONED");
  });
});

describe("canTakeAttendance — chỉ mở khi buổi đã bắt đầu, chưa hủy/hoãn", () => {
  it("FALSE khi chưa tới giờ (UPCOMING) — chặn điểm danh buổi tương lai", () => {
    expect(canTakeAttendance({ ...base, status: "SCHEDULED" }, before)).toBe(false);
  });
  it("TRUE khi đang diễn ra", () => {
    expect(canTakeAttendance({ ...base, status: "SCHEDULED" }, during)).toBe(true);
  });
  it("TRUE khi đã qua giờ nhưng chưa chấm (OVERDUE)", () => {
    expect(canTakeAttendance({ ...base, status: "SCHEDULED" }, after)).toBe(true);
  });
  it("TRUE khi đã hoàn thành (cho sửa lại điểm danh)", () => {
    expect(canTakeAttendance({ ...base, status: "COMPLETED" }, after)).toBe(true);
  });
  it("FALSE khi buổi đã nghỉ", () => {
    expect(canTakeAttendance({ ...base, status: "CANCELLED" }, during)).toBe(false);
  });
  it("FALSE khi tạm hoãn", () => {
    expect(canTakeAttendance({ ...base, status: "POSTPONED" }, during)).toBe(false);
  });
  it("nhận date dạng Date object", () => {
    expect(canTakeAttendance({ date: new Date("2026-06-21T00:00:00"), startTime: "09:00", endTime: "11:00", status: "SCHEDULED" }, before)).toBe(false);
  });
});

describe("attendanceGateMessage — lý do không điểm danh được (pha không thao tác)", () => {
  it("UPCOMING → nhắc giờ điểm danh sẽ mở (kèm giờ bắt đầu)", () => {
    const msg = attendanceGateMessage("UPCOMING", "09:00");
    expect(msg).toContain("09:00");
    expect(msg).toContain("chưa diễn ra");
  });
  it("CANCELLED → đã nghỉ", () => {
    expect(attendanceGateMessage("CANCELLED", "09:00")).toBe("Buổi học đã nghỉ nên không điểm danh.");
  });
  it("POSTPONED → tạm hoãn", () => {
    expect(attendanceGateMessage("POSTPONED", "09:00")).toBe("Buổi học đang tạm hoãn.");
  });
});

describe("SESSION_PHASE_LABEL", () => {
  it("nhãn tiếng Việt cho từng pha", () => {
    expect(SESSION_PHASE_LABEL.UPCOMING).toBe("Sắp diễn ra");
    expect(SESSION_PHASE_LABEL.ONGOING).toBe("Đang diễn ra");
    expect(SESSION_PHASE_LABEL.OVERDUE).toBe("Chờ điểm danh");
    expect(SESSION_PHASE_LABEL.COMPLETED).toBe("Hoàn thành");
    expect(SESSION_PHASE_LABEL.CANCELLED).toBe("Nghỉ");
    expect(SESSION_PHASE_LABEL.POSTPONED).toBe("Tạm hoãn");
  });
});
