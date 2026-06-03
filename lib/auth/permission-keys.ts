/**
 * Source of truth cho mọi permission key trong hệ thống.
 * Khi thêm tính năng mới có phân quyền, thêm key ở đây + cập nhật seed.
 *
 * Quy ước key: `<domain>.<action>`
 *   - domain viết thường, không có khoảng trắng
 *   - action mô tả hành vi cụ thể
 */

export const PERMISSIONS = {
  // ── USER & ROLE ──────────────────────────────────────
  USER_VIEW:           { key: "user.view",           domain: "USER",       description: "Xem danh sách tài khoản" },
  USER_CREATE:         { key: "user.create",         domain: "USER",       description: "Tạo tài khoản mới" },
  USER_UPDATE:         { key: "user.update",         domain: "USER",       description: "Sửa thông tin tài khoản" },
  USER_DELETE:         { key: "user.delete",         domain: "USER",       description: "Xóa tài khoản" },
  USER_ASSIGN_ROLE:    { key: "user.assign_role",    domain: "USER",       description: "Gán vai trò / chức danh cho tài khoản" },

  // ── PERMISSION FRAMEWORK ─────────────────────────────
  PERMISSION_MANAGE:   { key: "permission.manage",   domain: "PERMISSION", description: "Bật/tắt quyền cho vai trò và chức danh" },

  // ── ROOM & BOOKING ───────────────────────────────────
  ROOM_VIEW:                 { key: "room.view",                 domain: "ROOM", description: "Xem danh sách & lịch phòng" },
  ROOM_CREATE:               { key: "room.create",               domain: "ROOM", description: "Tạo phòng" },
  ROOM_UPDATE:               { key: "room.update",               domain: "ROOM", description: "Sửa phòng" },
  ROOM_DELETE:               { key: "room.delete",               domain: "ROOM", description: "Xóa phòng" },
  BOOKING_CREATE:            { key: "booking.create",            domain: "ROOM", description: "Gửi yêu cầu đặt phòng cho mình" },
  BOOKING_CREATE_FOR_OTHER:  { key: "booking.create_for_other",  domain: "ROOM", description: "Đặt phòng hộ người khác" },
  BOOKING_APPROVE:           { key: "booking.approve",           domain: "ROOM", description: "Duyệt / từ chối yêu cầu đặt phòng" },
  BOOKING_VIEW_ALL:          { key: "booking.view_all",          domain: "ROOM", description: "Xem mọi booking trong hệ thống" },

  // ── CLASS (Phase 3) ──────────────────────────────────
  CLASS_VIEW_OWN:      { key: "class.view_own",      domain: "CLASS",   description: "Xem các lớp mình tham gia" },
  CLASS_VIEW_ALL:      { key: "class.view_all",      domain: "CLASS",   description: "Xem mọi lớp" },
  CLASS_CREATE:        { key: "class.create",        domain: "CLASS",   description: "Tạo lớp mới" },
  CLASS_UPDATE:        { key: "class.update",        domain: "CLASS",   description: "Sửa thông tin lớp" },
  CLASS_DELETE:        { key: "class.delete",        domain: "CLASS",   description: "Xóa / huỷ lớp" },
  CLASS_MANAGE_SESSION:{ key: "class.manage_session",domain: "CLASS",   description: "Tạo / sửa lịch buổi học của lớp" },
  CLASS_TAKE_ATTENDANCE:{ key: "class.take_attendance", domain: "CLASS",description: "Điểm danh buổi học" },

  // ── STUDENT MANAGEMENT (Phase 3) ─────────────────────
  STUDENT_VIEW_ASSIGNED:{ key: "student.view_assigned", domain: "STUDENT", description: "Xem học sinh được phân cho mình" },
  STUDENT_VIEW_ALL:    { key: "student.view_all",    domain: "STUDENT", description: "Xem mọi học sinh" },
  STUDENT_CREATE:      { key: "student.create",      domain: "STUDENT", description: "Thêm học sinh mới" },
  STUDENT_UPDATE:      { key: "student.update",      domain: "STUDENT", description: "Sửa thông tin học sinh" },
  STUDENT_DELETE:      { key: "student.delete",      domain: "STUDENT", description: "Xóa học sinh" },
  STUDENT_ASSIGN:      { key: "student.assign",      domain: "STUDENT", description: "Phân học sinh cho cán bộ" },
  STUDENT_EVALUATE:    { key: "student.evaluate",    domain: "STUDENT", description: "Đánh giá năng lực học sinh" },

  // ── SUBJECT & TOPIC ──────────────────────────────────
  SUBJECT_VIEW:        { key: "subject.view",        domain: "SUBJECT", description: "Xem môn học / chủ đề" },
  SUBJECT_MANAGE:      { key: "subject.manage",      domain: "SUBJECT", description: "Quản lý môn học / chủ đề" },

  // ── COURSE (online video) ────────────────────────────
  COURSE_VIEW:         { key: "course.view",         domain: "COURSE",  description: "Xem khoá học online" },
  COURSE_CREATE:       { key: "course.create",       domain: "COURSE",  description: "Tạo khoá học online" },
  COURSE_APPROVE:      { key: "course.approve",      domain: "COURSE",  description: "Duyệt khoá học chờ xuất bản" },
  COURSE_DELETE:       { key: "course.delete",       domain: "COURSE",  description: "Xóa khoá học" },

  // ── EXAM & QUESTION ──────────────────────────────────
  EXAM_VIEW:           { key: "exam.view",           domain: "EXAM",     description: "Xem đề kiểm tra" },
  EXAM_CREATE:         { key: "exam.create",         domain: "EXAM",     description: "Tạo đề kiểm tra" },
  EXAM_GRADE:          { key: "exam.grade",          domain: "EXAM",     description: "Chấm bài kiểm tra" },
  QUESTION_VIEW:       { key: "question.view",       domain: "QUESTION", description: "Xem ngân hàng câu hỏi" },
  QUESTION_CREATE:     { key: "question.create",     domain: "QUESTION", description: "Tạo câu hỏi" },
  QUESTION_APPROVE:    { key: "question.approve",    domain: "QUESTION", description: "Duyệt câu hỏi" },

  // ── FLASHCARD ────────────────────────────────────────
  FLASHCARD_VIEW:      { key: "flashcard.view",      domain: "FLASHCARD", description: "Xem flashcard" },
  FLASHCARD_MANAGE:    { key: "flashcard.manage",    domain: "FLASHCARD", description: "Tạo / sửa flashcard" },

  // ── AUDIT & SYSTEM (OWNER zone) ──────────────────────
  AUDIT_VIEW:          { key: "audit.view",          domain: "AUDIT",  description: "Xem nhật ký kiểm tra" },
  SYSTEM_DEBUG:        { key: "system.debug",        domain: "SYSTEM", description: "Truy cập công cụ debug hệ thống" },
  SYSTEM_MANAGE:       { key: "system.manage",       domain: "SYSTEM", description: "Quản lý cấu hình hệ thống" },
} as const;

export type PermissionDef = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
export type PermissionKey = PermissionDef["key"];

/** Mảng phẳng các key — dùng cho seed và UI matrix. */
export const ALL_PERMISSION_DEFS: PermissionDef[] = Object.values(PERMISSIONS);
