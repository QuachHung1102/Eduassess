import type { Role, StaffPosition } from "@/lib/types";

export type Sender = { id: string; role: Role; staffPosition: StaffPosition | null };

export type SendTarget =
  | { kind: "groups"; roles: Role[] }
  | { kind: "my-students" }
  | { kind: "users"; userIds: string[] };

const ALL_GROUP_ROLES: Role[] = ["STUDENT", "TEACHER", "PARENT", "STAFF"];

/** Các nhóm role mà người gửi được phép gửi tới (gửi theo nhóm). */
export function allowedGroupRoles(sender: Sender): Role[] {
  if (sender.role === "OWNER" || sender.role === "ADMIN") return [...ALL_GROUP_ROLES];
  if (sender.role === "STAFF" && sender.staffPosition === "NVLT") return ["STAFF"];
  return [];
}

/** CBDT được gửi tới "học sinh mình phụ trách". */
export function canSendMyStudents(sender: Sender): boolean {
  return sender.role === "STAFF" && sender.staffPosition === "CBDT";
}

/** Validate target hợp lệ cho người gửi. null = OK, string = thông báo lỗi. */
export function validateTarget(sender: Sender, target: SendTarget): string | null {
  switch (target.kind) {
    case "groups": {
      if (target.roles.length === 0) return "Chọn ít nhất một nhóm người nhận";
      const allowed = allowedGroupRoles(sender);
      if (target.roles.some((r) => !allowed.includes(r))) return "Bạn không có quyền gửi tới nhóm đã chọn";
      return null;
    }
    case "my-students":
      return canSendMyStudents(sender) ? null : "Chỉ CBĐT mới gửi được tới học sinh phụ trách";
    case "users":
      return target.userIds.length === 0 ? "Chọn ít nhất một người nhận" : null;
    default:
      return "Kiểu người nhận không hợp lệ";
  }
}
