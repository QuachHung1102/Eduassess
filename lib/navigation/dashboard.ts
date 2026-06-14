import type { Role, SessionUserBase } from "@/lib/types";
import { getUserPermissionKeys } from "@/lib/auth/permissions";
import { PERMISSIONS } from "@/lib/auth/permission-keys";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
  faChartBar,
  faUsers,
  faSchool,
  faUserShield,
  faBookOpen,
  faFilePen,
  faLayerGroup,
  faDatabase,
  faChartLine,
  faDoorOpen,
  faCalendarCheck,
  faClipboardList,
  faChildren,
  faShieldHalved,
  faToolbox,
  faUserGroup,
  faClock,
  faBell,
  faChalkboardUser,
  faUserGraduate,
} from "@fortawesome/free-solid-svg-icons";

export type DashboardNavItem = {
  href: string;
  label: string;
  icon: IconDefinition;
  /** Nếu set, chỉ hiện khi user có permission này. */
  permission?: string;
  /** Hoặc chỉ hiện cho 1 trong các role này. */
  roles?: Role[];
};

const P = PERMISSIONS;

/**
 * Định nghĩa toàn bộ menu item cho mỗi gốc route.
 * `dashboardNavItemsFor()` sẽ lọc theo role + permission của user.
 */
const NAV_BY_HOME: Record<string, DashboardNavItem[]> = {
  "/owner": [
    { href: "/owner",             label: "Tổng quan",       icon: faChartBar },
    { href: "/owner/audit",       label: "Nhật ký",         icon: faClipboardList, permission: P.AUDIT_VIEW.key },
    { href: "/owner/system",      label: "Hệ thống",        icon: faToolbox,       permission: P.SYSTEM_DEBUG.key },
    { href: "/admin",             label: "Khu Admin",       icon: faShieldHalved,  roles: ["OWNER"] },
  ],

  "/admin": [
    { href: "/admin",             label: "Tổng quan",          icon: faChartBar },
    { href: "/admin/users",       label: "Tài khoản",          icon: faUsers,        permission: P.USER_VIEW.key },
    { href: "/admin/role-permissions", label: "Phân quyền vai trò", icon: faUserShield, permission: P.PERMISSION_MANAGE.key },
    { href: "/admin/rooms",       label: "Phòng",              icon: faDoorOpen,     permission: P.ROOM_VIEW.key },
    { href: "/admin/classes",     label: "Lớp học",            icon: faSchool,       permission: P.CLASS_VIEW_ALL.key },
    { href: "/admin/subjects",    label: "Môn học",            icon: faBookOpen,     permission: P.SUBJECT_VIEW.key },
    { href: "/admin/exams",       label: "Đề kiểm tra",        icon: faFilePen,      permission: P.EXAM_VIEW.key },
    { href: "/admin/flashcards",  label: "Flashcard",          icon: faLayerGroup,   permission: P.FLASHCARD_VIEW.key },
    { href: "/admin/questions",   label: "Ngân hàng câu hỏi",  icon: faDatabase,     permission: P.QUESTION_VIEW.key },
    { href: "/admin/courses",     label: "Khóa học online",    icon: faBookOpen,     permission: P.COURSE_VIEW.key },
    { href: "/admin/notifications", label: "Gửi thông báo",     icon: faBell,         permission: P.NOTIFICATION_SEND.key },
  ],

  "/staff": [
    { href: "/staff",                  label: "Tổng quan",       icon: faChartBar },
    { href: "/booking",                label: "Đặt phòng",       icon: faCalendarCheck, permission: P.BOOKING_CREATE.key },
    { href: "/staff/rooms",            label: "Phòng",           icon: faDoorOpen,      permission: P.ROOM_VIEW.key },
    { href: "/booking/approve",        label: "Duyệt đặt phòng", icon: faClipboardList, permission: P.BOOKING_APPROVE.key },
    { href: "/staff/overview",         label: "Tiến độ học sinh",icon: faChartLine,     permission: P.STUDENT_VIEW_ASSIGNED.key },
    { href: "/staff/students",         label: "Học sinh",        icon: faChildren,      permission: P.STUDENT_VIEW_ASSIGNED.key },
    { href: "/staff/students/all",     label: "Tất cả học sinh", icon: faUserGraduate,  permission: P.STUDENT_VIEW_ALL.key },
    { href: "/staff/teachers",         label: "Giáo viên",       icon: faChalkboardUser, permission: P.CLASS_CREATE.key },
    { href: "/staff/students/assign",  label: "Phân công CBDT",  icon: faUserGroup,     permission: P.STUDENT_ASSIGN.key },
    { href: "/staff/classes",          label: "Lớp học",         icon: faSchool,        permission: P.CLASS_VIEW_ALL.key },
  ],

  "/teacher": [
    { href: "/teacher",                label: "Tổng quan",         icon: faChartBar },
    { href: "/teacher/question-bank",  label: "Ngân hàng câu hỏi", icon: faDatabase,      permission: P.QUESTION_VIEW.key },
    { href: "/teacher/exams",          label: "Đề kiểm tra",       icon: faFilePen,       permission: P.EXAM_VIEW.key },
    { href: "/teacher/classes",        label: "Lớp học",           icon: faSchool,        permission: P.CLASS_VIEW_OWN.key },
    { href: "/teacher/courses",        label: "Khóa học online",   icon: faBookOpen,      permission: P.COURSE_VIEW.key },
    { href: "/teacher/schedule",       label: "Lịch rảnh",         icon: faClock },
    { href: "/booking",                label: "Đặt phòng",         icon: faCalendarCheck, permission: P.BOOKING_CREATE.key },
  ],

  "/student": [
    { href: "/student",            label: "Tổng quan",     icon: faChartBar },
    { href: "/student/exams",      label: "Bài kiểm tra",  icon: faFilePen,    permission: P.EXAM_VIEW.key },
    { href: "/student/flashcards", label: "Flashcard",     icon: faLayerGroup, permission: P.FLASHCARD_VIEW.key },
    { href: "/student/progress",   label: "Tiến trình",    icon: faChartLine },
    { href: "/student/courses",    label: "Khóa học",      icon: faBookOpen,   permission: P.COURSE_VIEW.key },
    { href: "/student/classes",    label: "Lịch học",      icon: faSchool },
    { href: "/student/schedule",   label: "Lịch rảnh",     icon: faCalendarCheck },
  ],

  "/parent": [
    { href: "/parent",          label: "Tổng quan",       icon: faChartBar },
    { href: "/parent/children", label: "Con tôi",         icon: faChildren },
    { href: "/parent/schedule", label: "Lịch học của con", icon: faSchool },
  ],
};

/**
 * Trả về navItems cho user, đã lọc theo role + permission.
 */
export async function dashboardNavItemsFor(
  user: Pick<SessionUserBase, "role" | "staffPosition">,
): Promise<DashboardNavItem[]> {
  const home = ROLE_TO_HOME[user.role];
  const items = NAV_BY_HOME[home] ?? [];
  const keys = await getUserPermissionKeys(user);
  const isOwner = keys.has("*");

  return items.filter((item) => {
    if (item.roles && !item.roles.includes(user.role)) return false;
    if (!item.permission) return true;
    if (isOwner) return true;
    return keys.has(item.permission);
  });
}

const ROLE_TO_HOME: Record<Role, string> = {
  OWNER:   "/owner",
  ADMIN:   "/admin",
  STAFF:   "/staff",
  TEACHER: "/teacher",
  STUDENT: "/student",
  PARENT:  "/parent",
};
