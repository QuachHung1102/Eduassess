import type { Role } from "@/lib/types";
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
} from "@fortawesome/free-solid-svg-icons";

export type DashboardNavItem = {
  href: string;
  label: string;
  icon: IconDefinition;
};

export const dashboardNavItems: Record<Role, DashboardNavItem[]> = {
  ADMIN: [
    { href: "/admin", label: "Tổng quan", icon: faChartBar },
    { href: "/admin/users", label: "Tài khoản", icon: faUsers },
    { href: "/admin/classes", label: "Lớp học", icon: faSchool },
    { href: "/admin/permissions", label: "Phân quyền", icon: faUserShield },
    { href: "/admin/subjects", label: "Môn học", icon: faBookOpen },
    { href: "/admin/exams", label: "Đề kiểm tra", icon: faFilePen },
    { href: "/admin/flashcards", label: "Flashcard", icon: faLayerGroup },
    { href: "/admin/questions", label: "Ngân hàng câu hỏi", icon: faDatabase },
  ],
  TEACHER: [
    { href: "/teacher", label: "Tổng quan", icon: faChartBar },
    { href: "/teacher/question-bank", label: "Ngân hàng câu hỏi", icon: faDatabase },
    { href: "/teacher/exams", label: "Đề kiểm tra", icon: faFilePen },
    { href: "/teacher/classes", label: "Lớp học", icon: faSchool },
  ],
  STUDENT: [
    { href: "/student", label: "Tổng quan", icon: faChartBar },
    { href: "/student/exams", label: "Bài kiểm tra", icon: faFilePen },
    { href: "/student/flashcards", label: "Flashcard", icon: faLayerGroup },
    { href: "/student/progress", label: "Tiến trình", icon: faChartLine },
  ],
};