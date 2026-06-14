export const DIFFICULTY_LABEL: Record<string, string> = {
  EASY: "Dễ",
  MEDIUM: "Trung bình",
  HARD: "Khó",
};

export const LEVEL_LABEL: Record<string, string> = {
  PRIMARY: "Tiểu học",
  MIDDLE: "THCS",
  HIGH: "THPT",
};

export const DIFFICULTY_COLOR: Record<string, string> = {
  EASY: "bg-green-100 text-green-700",
  MEDIUM: "bg-yellow-100 text-yellow-700",
  HARD: "bg-red-100 text-red-700",
};

// ── Mức năng lực học sinh (StudentLevel) — nguồn duy nhất cho nhãn/màu ──
/** Thứ tự tăng dần năng lực; dùng cho dropdown chọn mức. */
export const STUDENT_LEVELS = ["WEAK", "AVERAGE", "GOOD", "EXCELLENT"] as const;

export const STUDENT_LEVEL_LABEL: Record<string, string> = {
  WEAK: "Yếu",
  AVERAGE: "Trung bình",
  GOOD: "Khá / Giỏi",
  EXCELLENT: "Xuất sắc",
};

export const STUDENT_LEVEL_COLOR: Record<string, string> = {
  WEAK: "bg-red-100 text-red-700",
  AVERAGE: "bg-yellow-100 text-yellow-700",
  GOOD: "bg-green-100 text-green-700",
  EXCELLENT: "bg-indigo-100 text-indigo-700",
};

// ── Loại bài kiểm tra (ExamKind) ─────────────────────────────
export const EXAM_KIND_LABEL: Record<string, string> = {
  EXAM: "Bài kiểm tra",
  QUIZ: "Bài kiểm tra nhỏ",
};

export const EXAM_KIND_COLOR: Record<string, string> = {
  EXAM: "bg-blue-100 text-blue-700",
  QUIZ: "bg-purple-100 text-purple-700",
};
