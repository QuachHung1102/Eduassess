"use client";

import { createContext, useContext, useEffect, useSyncExternalStore, type ReactNode } from "react";
import { usePathname } from "next/navigation";

export type Theme = "kim" | "moc" | "thuy" | "hoa" | "tho";

const VALID_THEMES: Theme[] = ["kim", "moc", "thuy", "hoa", "tho"];

export const THEMES: {
  id: Theme;
  label: string;
  hanzi: string;
  element: string;
  color: string;
  gradient: string;
  bg: string;
  accent: string;
  fg: string;
}[] = [
  {
    id: "kim",
    label: "Kim",
    hanzi: "金",
    element: "Kim loại",
    color: "#ca8a04",
    gradient: "linear-gradient(135deg, #fef9c3 0%, #fcd34d 40%, #ca8a04 75%, #92400e 100%)",
    bg: "#fffbf0",
    accent: "#fcd34d",
    fg: "#1c1206",
  },
  {
    id: "moc",
    label: "Mộc",
    hanzi: "木",
    element: "Cây cối",
    color: "#16a34a",
    gradient: "linear-gradient(135deg, #dcfce7 0%, #4ade80 40%, #16a34a 75%, #166534 100%)",
    bg: "#f0fdf4",
    accent: "#4ade80",
    fg: "#052e16",
  },
  {
    id: "thuy",
    label: "Thủy",
    hanzi: "水",
    element: "Nước",
    color: "#0284c7",
    gradient: "linear-gradient(135deg, #e0f2fe 0%, #38bdf8 40%, #0284c7 75%, #082f49 100%)",
    bg: "#f0f9ff",
    accent: "#38bdf8",
    fg: "#0a1628",
  },
  {
    id: "hoa",
    label: "Hỏa",
    hanzi: "火",
    element: "Lửa",
    color: "#f43f5e",
    gradient: "linear-gradient(135deg, #fff1f2 0%, #fb923c 35%, #f43f5e 65%, #9f1239 100%)",
    bg: "#fff1f2",
    accent: "#fb923c",
    fg: "#4c0519",
  },
  {
    id: "tho",
    label: "Thổ",
    hanzi: "土",
    element: "Đất",
    color: "#ea580c",
    gradient: "linear-gradient(135deg, #fff7ed 0%, #fed7aa 30%, #fb923c 55%, #ea580c 80%, #7c2d12 100%)",
    bg: "#fff7ed",
    accent: "#fb923c",
    fg: "#431407",
  },
];

export type Mode = "light" | "dark";

const VALID_MODES: Mode[] = ["light", "dark"];

type ThemeContextValue = {
  theme: Theme;
  setTheme: (t: Theme) => void;
  mode: Mode;
  setMode: (m: Mode) => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  theme: "thuy",
  setTheme: () => {},
  mode: "light",
  setMode: () => {},
});

const DASHBOARD_PREFIX = /^\/(teacher|student|admin|notifications|settings|dashboard)(\/|$)/;
const THEME_STORAGE_KEY = "edu-theme";
const MODE_STORAGE_KEY = "edu-mode";
const THEME_STORE_EVENT = "edu-theme-store-change";

function isValidTheme(value: string | null): value is Theme {
  return value !== null && (VALID_THEMES as string[]).includes(value);
}

function isValidMode(value: string | null): value is Mode {
  return value !== null && (VALID_MODES as string[]).includes(value);
}

function subscribeThemeStore(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleChange = () => onStoreChange();
  window.addEventListener("storage", handleChange);
  window.addEventListener(THEME_STORE_EVENT, handleChange);

  return () => {
    window.removeEventListener("storage", handleChange);
    window.removeEventListener(THEME_STORE_EVENT, handleChange);
  };
}

function readThemeSnapshot(onDashboard: boolean): Theme {
  if (typeof window === "undefined" || !onDashboard) {
    return "thuy";
  }

  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (isValidTheme(stored)) {
    return stored;
  }

  const rootTheme = document.documentElement.getAttribute("data-theme");
  return isValidTheme(rootTheme) ? rootTheme : "thuy";
}

function readModeSnapshot(onDashboard: boolean): Mode {
  if (typeof window === "undefined" || !onDashboard) {
    return "light";
  }

  const stored = localStorage.getItem(MODE_STORAGE_KEY);
  if (isValidMode(stored)) {
    return stored;
  }

  const rootMode = document.documentElement.getAttribute("data-mode");
  return rootMode === "dark" ? "dark" : "light";
}

function notifyThemeStoreChange() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(THEME_STORE_EVENT));
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const onDashboard = pathname !== null && DASHBOARD_PREFIX.test(pathname);
  const theme = useSyncExternalStore<Theme>(
    subscribeThemeStore,
    () => readThemeSnapshot(onDashboard),
    () => "thuy",
  );
  const mode = useSyncExternalStore<Mode>(
    subscribeThemeStore,
    () => readModeSnapshot(onDashboard),
    () => "light",
  );

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    if (mode === "dark") {
      document.documentElement.setAttribute("data-mode", "dark");
    } else {
      document.documentElement.removeAttribute("data-mode");
    }
  }, [theme, mode]);

  function setTheme(t: Theme) {
    if (!onDashboard) {
      return;
    }

    localStorage.setItem(THEME_STORAGE_KEY, t);
    document.documentElement.setAttribute("data-theme", t);
    notifyThemeStoreChange();
  }

  function setMode(m: Mode) {
    if (!onDashboard) {
      return;
    }

    localStorage.setItem(MODE_STORAGE_KEY, m);
    if (m === "dark") {
      document.documentElement.setAttribute("data-mode", "dark");
    } else {
      document.documentElement.removeAttribute("data-mode");
    }
    notifyThemeStoreChange();
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, mode, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

