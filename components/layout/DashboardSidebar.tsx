"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FaIcon } from "@/components/ui/FaIcon";
import {
  faBars, faXmark, faBell, faGear,
  faChevronLeft, faChevronRight,
} from "@fortawesome/free-solid-svg-icons";
import { signOutAction } from "@/lib/auth/actions/sign-out";
import type { DashboardNavItem } from "@/lib/navigation/dashboard";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { useLanguage } from "@/lib/i18n/LanguageContext";

type Props = {
  navItems: DashboardNavItem[];
  userName: string;
  userEmail: string;
  roleLabel: string;
  unreadCount: number;
};

const SIDEBAR_STORAGE_KEY = "sidebar-collapsed";
const SIDEBAR_STORE_EVENT = "edu-sidebar-store-change";

function isNavActive(href: string, pathname: string): boolean {
  if (href === pathname) return true;
  const segments = href.split("/").filter(Boolean);
  if (segments.length <= 1) return false;
  return pathname.startsWith(href + "/");
}

function subscribeSidebarStore(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleChange = () => onStoreChange();
  window.addEventListener("storage", handleChange);
  window.addEventListener(SIDEBAR_STORE_EVENT, handleChange);

  return () => {
    window.removeEventListener("storage", handleChange);
    window.removeEventListener(SIDEBAR_STORE_EVENT, handleChange);
  };
}

function readSidebarCollapsedSnapshot() {
  if (typeof window === "undefined") {
    return false;
  }

  return localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true";
}

function notifySidebarStoreChange() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(SIDEBAR_STORE_EVENT));
}

export function DashboardSidebar({
  navItems,
  userName,
  userEmail,
  roleLabel,
  unreadCount,
}: Props) {
  const pathname = usePathname();
  const { tr } = useLanguage();
  const [openRoute, setOpenRoute] = useState<string | null>(null);
  const isOpen = openRoute === pathname;
  const isCollapsed = useSyncExternalStore(
    subscribeSidebarStore,
    readSidebarCollapsedSnapshot,
    () => false,
  );

  function closeSidebar() {
    setOpenRoute(null);
  }

  function toggleCollapsed() {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, String(!isCollapsed));
    notifySidebarStoreChange();
  }

  return (
    <>
      {/* Mobile top bar */}
      <header
        className="lg:hidden fixed top-0 left-0 right-0 z-30 h-14 flex items-center justify-between px-4 shrink-0"
        style={{ backgroundColor: "var(--sidebar-bg)", borderBottom: "1px solid var(--sidebar-border)" }}
      >
        <button
          onClick={() => setOpenRoute(pathname)}
          className="p-2 -ml-2 rounded-lg hover:text-white"
          style={{ color: "var(--sidebar-text)" }}
          aria-label="Mở menu"
        >
          <FaIcon icon={faBars} className="text-base" />
        </button>
        <Link href="/" className="text-white font-bold text-base">EduAssess</Link>
        <div className="flex items-center gap-0.5">
          <Link href="/notifications" className="relative text-slate-300 hover:text-white p-2 rounded-lg">
            <FaIcon icon={faBell} className="text-base" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 h-3.5 min-w-3.5 flex items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-bold text-white leading-none">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Link>
          <Link href="/settings" className="text-slate-300 hover:text-white p-2 rounded-lg">
            <FaIcon icon={faGear} className="text-base" />
          </Link>
        </div>
      </header>

      {/* Backdrop */}
      <div
        className={[
          "sidebar-backdrop lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        ].join(" ")}
        onClick={closeSidebar}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <aside
        data-collapsed={isCollapsed ? "true" : "false"}
        className={[
          "sidebar-shell fixed lg:static inset-y-0 left-0 z-50 flex flex-col shrink-0",
          "overflow-y-auto overflow-x-hidden",
          "transform-gpu transition-[width,transform,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          isCollapsed ? "lg:w-16" : "lg:w-64",
          "w-64",
        ].join(" ")}
        style={{
          backgroundColor: "var(--sidebar-bg)",
          color: "var(--sidebar-text)",
          boxShadow: isOpen ? "0 18px 42px rgba(0,0,0,0.35)" : "none",
        }}
      >
        {/* Logo row */}
        <div
          className="px-3 py-4 flex items-center shrink-0"
          style={{ borderBottom: "1px solid var(--sidebar-border)" }}
        >
          {!isCollapsed && (
            <>
              <div className="flex items-center gap-2 flex-1 min-w-0 mr-2">
                <Link href="/" className="text-white font-bold text-base truncate">EduAssess</Link>
                <span className="shrink-0 text-[11px] bg-blue-600 text-white px-1.5 py-0.5 rounded-full font-medium">
                  {roleLabel}
                </span>
              </div>
              {/* Desktop collapse toggle — expanded state */}
              <button
                onClick={toggleCollapsed}
                className="hidden lg:flex items-center justify-center w-7 h-7 rounded-lg hover:text-white transition-colors shrink-0"
                style={{ color: "var(--sidebar-text)", opacity: 0.6 }}
                aria-label="Thu gọn thanh bên"
                title="Thu gọn"
              >
                <FaIcon icon={faChevronLeft} className="text-xs" />
              </button>
            </>
          )}
          {/* Collapsed: full-width expand button replaces logo row */}
          {isCollapsed && (
            <button
              onClick={toggleCollapsed}
              className="hidden lg:flex items-center justify-center w-full h-8 rounded-lg hover:text-white transition-colors"
              style={{ color: "var(--sidebar-text)", opacity: 0.7 }}
              aria-label="Mở rộng thanh bên"
              title="Mở rộng"
            >
              <FaIcon icon={faChevronRight} className="text-sm" />
            </button>
          )}
          {/* Mobile close */}
          <button
            onClick={closeSidebar}
            className="lg:hidden hover:text-white p-1 rounded shrink-0"
            style={{ color: "var(--sidebar-text)", opacity: 0.6 }}
            aria-label="Đóng menu"
          >
            <FaIcon icon={faXmark} />
          </button>
        </div>

        {/* Nav */}
        <nav className={`flex-1 py-3 space-y-0.5 overflow-y-auto themed-scrollbar ${isCollapsed ? "px-2" : "px-3"}`}>
          {navItems.map((item) => {
            const active = isNavActive(item.href, pathname);
            if (isCollapsed) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeSidebar}
                  title={item.label}
                  className={`flex items-center justify-center h-9 w-full rounded-lg transition-colors ${active ? "is-active" : ""}`}
                  style={{
                    backgroundColor: active
                      ? "color-mix(in srgb, var(--primary) 25%, transparent)"
                      : "transparent",
                    color: active ? "#fff" : "var(--sidebar-text)",
                  }}
                >
                  <FaIcon icon={item.icon} fixedWidth className="w-4" />
                </Link>
              );
            }
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeSidebar}
                className={`sidebar-nav-item ${active ? "is-active" : ""}`}
              >
                <FaIcon icon={item.icon} fixedWidth className="w-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div
          className={`shrink-0 ${isCollapsed ? "px-2 py-3" : "px-4 py-4"}`}
          style={{ borderTop: "1px solid var(--sidebar-border)" }}
        >
          {isCollapsed ? (
            <div className="flex flex-col items-center gap-2">
              <div className="relative">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-semibold">
                  {userName?.[0]?.toUpperCase() ?? "U"}
                </div>
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-(--sidebar-bg) bg-red-500" />
                )}
              </div>
              <Link
                href="/notifications"
                className="relative w-8 h-8 flex items-center justify-center rounded-lg hover:text-white transition-colors"
                style={{ color: "var(--sidebar-text)", opacity: 0.75 }}
                title={tr.nav.notifications}
              >
                <FaIcon icon={faBell} className="text-xs" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-(--sidebar-bg) bg-red-500" />
                )}
              </Link>
              <Link
                href="/settings"
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:text-white transition-colors"
                style={{ color: "var(--sidebar-text)", opacity: 0.75 }}
                title={tr.nav.settings}
              >
                <FaIcon icon={faGear} className="text-xs" />
              </Link>
              <form action={signOutAction}>
                <button
                  type="submit"
                  title={tr.nav.signOut}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-500/20 hover:text-red-400 transition-colors text-sm"
                  style={{ color: "var(--sidebar-text)", opacity: 0.6 }}
                >
                  ⏻
                </button>
              </form>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-semibold shrink-0">
                  {userName?.[0]?.toUpperCase() ?? "U"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{userName}</p>
                  <p className="text-slate-400 text-xs truncate">{userEmail}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Link
                  href="/notifications"
                  className="relative flex items-center gap-2 flex-1 text-xs hover:text-white transition-colors px-2 py-1.5 rounded-lg"
                  style={{ color: "var(--sidebar-text)", opacity: 0.75 }}
                >
                  <FaIcon icon={faBell} />
                  <span>{tr.nav.notifications}</span>
                  {unreadCount > 0 && (
                    <span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </Link>
                <Link
                  href="/settings"
                  className="flex items-center justify-center h-7 w-7 rounded-lg hover:text-white transition-colors"
                  style={{ color: "var(--sidebar-text)", opacity: 0.75 }}
                  title={tr.nav.settings}
                >
                  <FaIcon icon={faGear} />
                </Link>
              </div>
              <div className="mt-2.5 flex items-center justify-between gap-2">
                <LanguageSwitcher />
                <form action={signOutAction}>
                  <button
                    type="submit"
                    className="text-xs hover:text-red-400 transition-colors py-1 px-2 rounded-lg"
                    style={{ color: "var(--sidebar-text)", opacity: 0.6 }}
                  >
                    {tr.nav.signOut}
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </aside>
    </>
  );
}
