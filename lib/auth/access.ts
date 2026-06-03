import type { Role } from "@/lib/types";

export const PUBLIC_ROUTES = ["/", "/login", "/register", "/forgot-password", "/reset-password"];

/**
 * Trang chủ mặc định sau khi đăng nhập theo Role.
 * STAFF dùng /staff chung — sub-tabs hiển thị/ẩn theo permission.
 */
export const ROLE_HOME: Record<Role, string> = {
  OWNER:   "/owner",
  ADMIN:   "/admin",
  STAFF:   "/staff",
  TEACHER: "/teacher",
  STUDENT: "/student",
  PARENT:  "/parent",
};

export const ROLE_LABELS: Record<Role, string> = {
  OWNER:   "Nhân viên công nghệ",
  ADMIN:   "Quản trị",
  STAFF:   "Nhân viên",
  TEACHER: "Giáo viên",
  STUDENT: "Học sinh",
  PARENT:  "Phụ huynh",
};

/**
 * Ánh xạ prefix URL → các role được phép truy cập.
 * Permission chi tiết được kiểm tra ở page/action (qua lib/auth/permissions).
 *
 * OWNER/ADMIN có thể truy cập phần lớn prefix để giám sát / quản lý.
 */
export const ROUTE_ROLES: Record<string, Role[]> = {
  "/owner":   ["OWNER"],
  "/admin":   ["OWNER", "ADMIN"],
  "/staff":   ["OWNER", "ADMIN", "STAFF"],
  "/teacher": ["OWNER", "ADMIN", "TEACHER"],
  "/student": ["OWNER", "ADMIN", "STUDENT"],
  "/parent":  ["OWNER", "ADMIN", "PARENT"],
  "/booking": ["OWNER", "STAFF", "TEACHER"],
};

/** Trả về role[] được phép cho prefix, hoặc null nếu prefix không nằm trong bảng. */
export function getAllowedRolesFor(pathname: string): Role[] | null {
  for (const [prefix, roles] of Object.entries(ROUTE_ROLES)) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      return roles;
    }
  }
  return null;
}
