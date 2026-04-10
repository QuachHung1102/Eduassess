import type { Role } from "@/lib/types";

export type DashboardNavItem = {
  href: string;
  label: string;
  icon: string;
};

export const dashboardNavItems: Record<Role, DashboardNavItem[]> = {
  ADMIN: [
    { href: "/admin", label: "Tổng quan", icon: "📊" },
    { href: "/admin/users", label: "Tài khoản", icon: "👥" },
    { href: "/admin/classes", label: "Lớp học", icon: "🏫" },
    { href: "/admin/permissions", label: "Phân quyền", icon: "🔐" },
    { href: "/admin/subjects", label: "Môn học", icon: "📚" },
    { href: "/admin/exams", label: "Đề kiểm tra", icon: "📝" },
    { href: "/admin/flashcards", label: "Flashcard", icon: "🃏" },
    { href: "/admin/questions", label: "Ngân hàng câu hỏi", icon: "🏦" },
  ],
  TEACHER: [
    { href: "/teacher", label: "Tổng quan", icon: "📊" },
    { href: "/teacher/question-bank", label: "Ngân hàng câu hỏi", icon: "🏦" },
    { href: "/teacher/exams", label: "Đề kiểm tra", icon: "📝" },
    { href: "/teacher/flashcards", label: "Flashcard", icon: "🃏" },
    { href: "/teacher/classes", label: "Lớp học", icon: "🏫" },
  ],
  STUDENT: [
    { href: "/student", label: "Tổng quan", icon: "📊" },
    { href: "/student/exams", label: "Bài kiểm tra", icon: "📝" },
    { href: "/student/flashcards", label: "Flashcard", icon: "🃏" },
    { href: "/student/progress", label: "Tiến trình", icon: "📈" },
  ],
};