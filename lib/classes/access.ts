/**
 * Quyền sở hữu/thao tác trên một lớp — module THUẦN (đồng bộ hoá các check
 * trước đây nằm rải rác, mỗi action một kiểu, trong lib/classes/actions.ts).
 *
 * Hai mức tách bạch theo vai trò domain:
 *  - QUẢN TRỊ lớp (xếp/đổi/huỷ buổi, tuyển sinh, phân GV, sửa lớp) → chỉ CBĐT
 *    phụ trách (advisor) hoặc OWNER/ADMIN. GV chỉ dạy, không quản lịch lớp.
 *  - THAO TÁC buổi (điểm danh, đánh giá sau buổi) → thêm GV của lớp / GV dạy
 *    buổi đó và CBDTS, vì đây là việc giảng dạy.
 *
 * Đây là LỚP THỨ HAI sau permission `can(user, key)` ở seam: có quyền chưa đủ,
 * còn phải đúng lớp của mình.
 */

import type { SessionUserBase } from "@/lib/types";

type ClassActor = Pick<SessionUserBase, "id" | "role" | "staffPosition">;

/**
 * Được QUẢN TRỊ lớp: OWNER/ADMIN hoặc chính CBĐT phụ trách (advisor).
 * CBDTS không tự động quản lớp người khác (giữ nguyên hành vi cũ).
 */
export function canAdministerClass(user: ClassActor, cls: { advisorId: string }): boolean {
  if (user.role === "OWNER" || user.role === "ADMIN") return true;
  return user.role === "STAFF" && cls.advisorId === user.id;
}

/**
 * Được THAO TÁC buổi học: OWNER/ADMIN/CBDTS, CBĐT phụ trách lớp, GV của lớp,
 * hoặc GV dạy chính buổi đó (có thể khác GV lớp).
 */
export function canOperateClassSession(
  user: ClassActor,
  ctx: { advisorId: string; teacherIds: string[]; sessionTeacherId?: string | null },
): boolean {
  if (user.role === "OWNER" || user.role === "ADMIN") return true;
  if (user.role === "STAFF" && user.staffPosition === "CBDTS") return true;
  if (ctx.advisorId === user.id) return true;
  if (ctx.sessionTeacherId && ctx.sessionTeacherId === user.id) return true;
  return ctx.teacherIds.includes(user.id);
}
