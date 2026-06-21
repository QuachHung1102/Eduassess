/**
 * Pha thời gian dẫn xuất của một buổi học (ClassSession) — module THUẦN.
 *
 * `ClassSession.status` lưu KẾT QUẢ do người chốt (SCHEDULED/COMPLETED/CANCELLED/
 * POSTPONED). Pha thời gian (so `now` với khung giờ buổi) được TÍNH KHI ĐỌC, không
 * ghi DB, không cần cron. Dùng cho: nhãn trạng thái hiển thị + gate điểm danh.
 *
 * Quy ước thời gian: ghép `date` + "HH:mm" thành timestamp local
 * (`new Date("YYYY-MM-DDTHH:mm:00")`) — cùng quy ước xuyên codebase.
 */

export type SessionPhase =
  | "UPCOMING" // SCHEDULED, chưa tới giờ bắt đầu
  | "ONGOING" // SCHEDULED, đang trong khung giờ
  | "OVERDUE" // SCHEDULED, đã qua giờ mà chưa điểm danh → chờ chốt
  | "COMPLETED"
  | "CANCELLED"
  | "POSTPONED";

export type SessionTimeInput = {
  date: Date | string;
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
  status: string; // SessionStatus
};

export const SESSION_PHASE_LABEL: Record<SessionPhase, string> = {
  UPCOMING: "Sắp diễn ra",
  ONGOING: "Đang diễn ra",
  OVERDUE: "Chờ điểm danh",
  COMPLETED: "Hoàn thành",
  CANCELLED: "Nghỉ",
  POSTPONED: "Tạm hoãn",
};

/** Lớp màu badge cho từng pha (semantic, không đổi theo theme). */
export const SESSION_PHASE_COLOR: Record<SessionPhase, string> = {
  UPCOMING: "bg-blue-100 text-blue-700",
  ONGOING: "bg-emerald-100 text-emerald-700",
  OVERDUE: "bg-amber-100 text-amber-700",
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
  POSTPONED: "bg-yellow-100 text-yellow-700",
};

function ymd(d: Date | string): string {
  if (typeof d === "string") return d.slice(0, 10);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function combine(date: Date | string, hhmm: string): Date {
  return new Date(`${ymd(date)}T${hhmm}:00`);
}

/** Pha hiện tại của buổi: status đã chốt thắng pha thời gian; còn lại suy từ `now`. */
export function getSessionPhase(s: SessionTimeInput, now: Date): SessionPhase {
  if (s.status === "CANCELLED") return "CANCELLED";
  if (s.status === "COMPLETED") return "COMPLETED";
  if (s.status === "POSTPONED") return "POSTPONED";

  const start = combine(s.date, s.startTime);
  const end = combine(s.date, s.endTime);
  if (now < start) return "UPCOMING";
  if (now <= end) return "ONGOING";
  return "OVERDUE";
}

/**
 * Chỉ cho điểm danh khi buổi ĐÃ bắt đầu và chưa hủy/hoãn:
 * đang diễn ra, đã qua giờ chờ chốt, hoặc đã hoàn thành (cho sửa lại).
 * Buổi tương lai (UPCOMING) → KHÔNG cho điểm danh.
 */
export function canTakeAttendance(s: SessionTimeInput, now: Date): boolean {
  const phase = getSessionPhase(s, now);
  return phase === "ONGOING" || phase === "OVERDUE" || phase === "COMPLETED";
}

/**
 * Câu giải thích vì sao buổi KHÔNG điểm danh được — dùng chung cho cả trang
 * điểm danh của CBĐT lẫn GV (chỉ gọi khi `canTakeAttendance` = false).
 */
export function attendanceGateMessage(phase: SessionPhase, startTime: string): string {
  switch (phase) {
    case "UPCOMING":
      return `Buổi học chưa diễn ra. Điểm danh sẽ mở khi tới giờ học (${startTime}).`;
    case "CANCELLED":
      return "Buổi học đã nghỉ nên không điểm danh.";
    case "POSTPONED":
      return "Buổi học đang tạm hoãn.";
    default:
      return "Buổi học này không thể điểm danh.";
  }
}
