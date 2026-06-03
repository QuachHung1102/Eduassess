/**
 * Local mirror of Prisma enums — used for TypeScript type-checking in auth,
 * middleware, and UI code without going through the @prisma/client re-export chain.
 * Values must stay in sync with prisma/schema/enums.prisma.
 */

export type Role = "OWNER" | "ADMIN" | "STAFF" | "TEACHER" | "STUDENT" | "PARENT";

export type StaffPosition = "NVSALE" | "NVLT" | "CBNK" | "CBDH" | "CBDT" | "CBDTS";

export type ParentRelation = "FATHER" | "MOTHER" | "GUARDIAN" | "OTHER";

export type SchoolLevel = "PRIMARY" | "MIDDLE" | "HIGH";
export type Difficulty = "EASY" | "MEDIUM" | "HARD";
export type QuestionStatus = "PENDING" | "APPROVED";
export type CourseStatus = "DRAFT" | "PENDING" | "PUBLISHED" | "ARCHIVED";

// ── Phase 3: Class & Session ──────────────────────────────────
export type ClassMode = "ONLINE" | "OFFLINE" | "HYBRID";
export type ClassStatus = "DRAFT" | "RECRUITING" | "ONGOING" | "FINISHED" | "CANCELLED";
export type EnrollmentStatus = "ACTIVE" | "DROPPED";
export type SessionStatus = "SCHEDULED" | "COMPLETED" | "CANCELLED" | "POSTPONED";
export type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
export type StudentLevel = "WEAK" | "AVERAGE" | "GOOD";
export type DayOfWeek = "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN";
export type LegacyTimeSlot = "MORNING" | "AFTERNOON" | "EVENING";
export type TimeSlot =
  | LegacyTimeSlot
  | "MORNING_07_08"
  | "MORNING_08_09"
  | "MORNING_09_10"
  | "MORNING_10_11"
  | "MORNING_11_12"
  | "AFTERNOON_12_13"
  | "AFTERNOON_13_14"
  | "AFTERNOON_14_15"
  | "AFTERNOON_15_16"
  | "AFTERNOON_16_17"
  | "AFTERNOON_17_18"
  | "EVENING_18_19"
  | "EVENING_19_20"
  | "EVENING_20_21"
  | "EVENING_21_22";
export type AvailabilityMode = "BUSY" | "BOTH" | "ONLINE_ONLY";

/**
 * Tóm tắt thông tin user trong JWT/session.
 * Dùng cho auth callbacks và các helper `requireSession`, `can`.
 */
export type SessionUserBase = {
  id: string;
  role: Role;
  staffPosition: StaffPosition | null;
  name?: string | null;
  email?: string | null;
};
