import {
  AVAILABILITY_DIGITAL_SLOT_META,
  AVAILABILITY_DIGITAL_TIME_SLOTS,
  type AvailabilityDigitalTimeSlot,
} from "@/lib/availability/time-slots";
import type { AvailabilityMode, ClassMode, DayOfWeek } from "@/lib/types";

// ─── Khung lịch tuần & sinh buổi học ──────────────────────────
// Toàn bộ module này là hàm thuần (không chạm DB) để dễ kiểm thử.
// Quy ước thời gian: chuỗi "HH:mm"; ngày: chuỗi "YYYY-MM-DD".

export const DAY_ORDER: DayOfWeek[] = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

const DAY_INDEX: Record<DayOfWeek, number> = {
  MON: 0, TUE: 1, WED: 2, THU: 3, FRI: 4, SAT: 5, SUN: 6,
};

// JS getDay(): 0 = Chủ nhật … 6 = Thứ 7.
const JS_DAY_TO_DOW: DayOfWeek[] = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

/** Một khung giờ tuần (mẫu lặp): thứ + giờ bắt đầu/kết thúc. */
export interface WeeklySlotInput {
  dayOfWeek: DayOfWeek;
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
}

/** Một ô (thứ × khung giờ digital) cần người học/dạy phải rảnh. */
export interface WeeklyCell {
  dayOfWeek: DayOfWeek;
  slot: AvailabilityDigitalTimeSlot;
}

/** Một buổi học cụ thể được sinh ra từ khung tuần. */
export interface PlannedSession {
  sessionNumber: number;
  date: string; // "YYYY-MM-DD"
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
}

// ─── Ngày (date-only, tránh lệch timezone) ────────────────────

export function dayOfWeekFromYmd(ymd: string): DayOfWeek {
  const [y, m, d] = ymd.split("-").map(Number);
  return JS_DAY_TO_DOW[new Date(y, m - 1, d).getDay()];
}

export function addDays(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(y, m - 1, d + days);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

// ─── Khung giờ "HH:mm" ↔ ô digital ────────────────────────────

/**
 * Trả về danh sách ô digital 1 tiếng mà một khoảng "HH:mm"–"HH:mm" CHẠM tới.
 * Dùng overlap (giao nhau), không phải bao trọn: buổi 08:15–09:45 cần rảnh cả
 * ô 08–09 lẫn 09–10. Buổi 18:00–20:00 → [EVENING_18_19, EVENING_19_20].
 */
export function timeRangeToDigitalSlots(
  startTime: string,
  endTime: string,
): AvailabilityDigitalTimeSlot[] {
  const result: AvailabilityDigitalTimeSlot[] = [];
  for (const slot of AVAILABILITY_DIGITAL_TIME_SLOTS) {
    const meta = AVAILABILITY_DIGITAL_SLOT_META[slot];
    if (meta.start < endTime && meta.end > startTime) {
      result.push(slot);
    }
  }
  return result;
}

/** Gom toàn bộ ô (thứ × khung giờ) mà một khung lịch tuần yêu cầu. */
export function weeklyPatternToCells(slots: WeeklySlotInput[]): WeeklyCell[] {
  const seen = new Map<string, WeeklyCell>();
  for (const s of slots) {
    for (const digital of timeRangeToDigitalSlots(s.startTime, s.endTime)) {
      seen.set(`${s.dayOfWeek}_${digital}`, { dayOfWeek: s.dayOfWeek, slot: digital });
    }
  }
  return [...seen.values()];
}

export function cellKey(dayOfWeek: DayOfWeek, slot: AvailabilityDigitalTimeSlot): string {
  return `${dayOfWeek}_${slot}`;
}

// ─── Quy tắc khớp hình thức lớp với lịch rảnh ─────────────────
// OFFLINE: học tại trung tâm → chỉ nhận BOTH.
// ONLINE : học tại nhà       → nhận BOTH hoặc ONLINE_ONLY.
// (HYBRID không dùng trong luồng tạo lớp; coi như OFFLINE để an toàn.)

export function allowedAvailabilityModes(mode: ClassMode): AvailabilityMode[] {
  return mode === "ONLINE" ? ["BOTH", "ONLINE_ONLY"] : ["BOTH"];
}

/**
 * Một người (GV/HS) có đủ rảnh cho toàn bộ ô yêu cầu hay không.
 * `availabilityByCell`: map cellKey → AvailabilityMode đã chuẩn hoá (đã bỏ BUSY).
 * Thiếu một ô bất kỳ (chưa khai báo = BUSY) ⇒ KHÔNG đủ điều kiện.
 */
export function coversAllCells(
  cells: WeeklyCell[],
  availabilityByCell: Map<string, AvailabilityMode>,
  mode: ClassMode,
): boolean {
  if (cells.length === 0) return false;
  const allowed = new Set(allowedAvailabilityModes(mode));
  for (const cell of cells) {
    const have = availabilityByCell.get(cellKey(cell.dayOfWeek, cell.slot));
    if (!have || !allowed.has(have)) return false;
  }
  return true;
}

// ─── Sinh danh sách buổi học từ khung tuần ────────────────────

/**
 * Sinh `sessionCount` buổi học từ ngày bắt đầu, lặp theo khung tuần.
 * Duyệt từng ngày kể từ startDate; ngày nào khớp thứ trong khung thì tạo buổi
 * (nhiều khung cùng ngày ⇒ sắp theo giờ bắt đầu). Đánh số tuần tự 1..n.
 */
export function generateSessionPlan(opts: {
  startDate: string; // "YYYY-MM-DD"
  weeklySlots: WeeklySlotInput[];
  sessionCount: number;
}): PlannedSession[] {
  const { startDate, weeklySlots, sessionCount } = opts;
  if (sessionCount <= 0 || weeklySlots.length === 0) return [];

  const sorted = [...weeklySlots].sort(
    (a, b) =>
      DAY_INDEX[a.dayOfWeek] - DAY_INDEX[b.dayOfWeek] ||
      a.startTime.localeCompare(b.startTime),
  );

  const result: PlannedSession[] = [];
  let cursor = startDate;
  const maxDays = sessionCount * 7 + 14; // chặn vòng lặp vô hạn
  let guard = 0;

  while (result.length < sessionCount && guard < maxDays) {
    const dow = dayOfWeekFromYmd(cursor);
    for (const s of sorted) {
      if (s.dayOfWeek !== dow) continue;
      result.push({
        sessionNumber: result.length + 1,
        date: cursor,
        dayOfWeek: dow,
        startTime: s.startTime,
        endTime: s.endTime,
      });
      if (result.length >= sessionCount) break;
    }
    cursor = addDays(cursor, 1);
    guard++;
  }

  return result;
}

/**
 * Đề xuất ngày cho một buổi bù: tiếp tục khung tuần kể từ ngày sau buổi cuối
 * hiện có, bỏ qua các ngày cần tránh (VD ngày đã hủy / đã có buổi).
 */
export function suggestMakeupDate(opts: {
  afterDate: string; // "YYYY-MM-DD" — bắt đầu dò từ ngày kế tiếp
  weeklySlots: WeeklySlotInput[];
  avoidDates?: string[];
}): { date: string; startTime: string; endTime: string } | null {
  const { afterDate, weeklySlots, avoidDates = [] } = opts;
  if (weeklySlots.length === 0) return null;

  const avoid = new Set(avoidDates);
  const sorted = [...weeklySlots].sort(
    (a, b) =>
      DAY_INDEX[a.dayOfWeek] - DAY_INDEX[b.dayOfWeek] ||
      a.startTime.localeCompare(b.startTime),
  );

  let cursor = addDays(afterDate, 1);
  let guard = 0;
  while (guard < 60) {
    if (!avoid.has(cursor)) {
      const dow = dayOfWeekFromYmd(cursor);
      const match = sorted.find((s) => s.dayOfWeek === dow);
      if (match) {
        return { date: cursor, startTime: match.startTime, endTime: match.endTime };
      }
    }
    cursor = addDays(cursor, 1);
    guard++;
  }
  return null;
}
