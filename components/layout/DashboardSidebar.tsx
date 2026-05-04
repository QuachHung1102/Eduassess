"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FaIcon } from "@/components/ui/FaIcon";
import { faBars, faXmark, faBell, faGear } from "@fortawesome/free-solid-svg-icons";
import { signOutAction } from "@/lib/auth/actions/sign-out";
import type { DashboardNavItem } from "@/lib/navigation/dashboard";

type Props = {
  navItems: DashboardNavItem[];
  userName: string;
  userEmail: string;
  roleLabel: string;
  unreadCount: number;
};

function isNavActive(href: string, pathname: string): boolean {
  if (href === pathname) return true;
  // For top-level items like "/admin", "/student", only exact match
  const segments = href.split("/").filter(Boolean);
  if (segments.length <= 1) return false;
  // For deeper items, match if current path is inside this section
  return pathname.startsWith(href + "/");
}

export function DashboardSidebar({
  navItems,
  userName,
  userEmail,
  roleLabel,
  unreadCount,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // Close sidebar when navigating
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  return (
    <>
      {/* ─── Mobile top bar ─────────────────────────────────── */}
      <header
        className="lg:hidden fixed top-0 left-0 right-0 z-30 h-14 flex items-center justify-between px-4 shrink-0"
        style={{ backgroundColor: 'var(--sidebar-bg)', borderBottom: '1px solid var(--sidebar-border)' }}
      >
        <button
          onClick={() => setIsOpen(true)}
          className="p-2 -ml-2 rounded-lg hover:text-white"
          style={{ color: 'var(--sidebar-text)' }}
          aria-label="Mở menu"
        >
          <FaIcon icon={faBars} className="text-base" />
        </button>

        <Link href="/" className="text-white font-bold text-base">
          EduAssess
        </Link>

        <div className="flex items-center gap-0.5">
          <Link
            href="/notifications"
            className="relative text-slate-300 hover:text-white p-2 rounded-lg"
          >
            <FaIcon icon={faBell} className="text-base" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 h-3.5 min-w-3.5 flex items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-bold text-white leading-none">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Link>
          <Link
            href="/settings"
            className="text-slate-300 hover:text-white p-2 rounded-lg"
          >
            <FaIcon icon={faGear} className="text-base" />
          </Link>
        </div>
      </header>

      {/* ─── Backdrop ───────────────────────────────────────── */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ─── Sidebar ────────────────────────────────────────── */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 flex flex-col shrink-0 transition-transform duration-300 ease-in-out overflow-y-auto ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
        style={{ backgroundColor: 'var(--sidebar-bg)', color: 'var(--sidebar-text)' }}
      >
        {/* Logo */}
        <div className="px-5 py-4 flex items-center justify-between shrink-0" style={{ borderBottom: '1px solid var(--sidebar-border)' }}>
          <div className="flex items-center gap-2 min-w-0">
            <Link href="/" className="text-white font-bold text-base truncate">
              EduAssess
            </Link>
            <span className="shrink-0 text-[11px] bg-blue-600 text-white px-1.5 py-0.5 rounded-full font-medium">
              {roleLabel}
            </span>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="lg:hidden hover:text-white p-1 rounded"
            style={{ color: 'var(--sidebar-text)', opacity: 0.6 }}
            aria-label="Đóng menu"
          >
            <FaIcon icon={faXmark} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const active = isNavActive(item.href, pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`sidebar-nav-item ${active ? "is-active" : ""}`}
              >
                <FaIcon icon={item.icon} fixedWidth className="w-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="px-4 py-4 shrink-0" style={{ borderTop: '1px solid var(--sidebar-border)' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-semibold shrink-0">
              {userName?.[0]?.toUpperCase() ?? "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{userName}</p>
              <p className="text-slate-400 text-xs truncate">{userEmail}</p>
            </div>
          </div>

          {/* Desktop: notifications + settings links */}
          <div className="mt-3 hidden lg:flex items-center gap-2">
            <Link
              href="/notifications"
              className="relative flex items-center gap-2 flex-1 text-xs hover:text-white transition-colors px-2 py-1.5 rounded-lg"
              style={{ color: 'var(--sidebar-text)', opacity: 0.75 }}
            >
              <FaIcon icon={faBell} />
              <span>Thông báo</span>
              {unreadCount > 0 && (
                <span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Link>
            <Link
              href="/settings"
              className="flex items-center justify-center h-7 w-7 rounded-lg hover:text-white transition-colors"
              style={{ color: 'var(--sidebar-text)', opacity: 0.75 }}
              title="Cài đặt tài khoản"
            >
              <FaIcon icon={faGear} />
            </Link>
          </div>

          <form action={signOutAction}>
            <button
              type="submit"
              className="mt-2 w-full text-center text-xs hover:text-red-400 transition-colors py-1.5 rounded-lg"
              style={{ color: 'var(--sidebar-text)', opacity: 0.6 }}
            >
              Đăng xuất
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
