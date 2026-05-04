"use client";

import { useTheme, THEMES } from "@/components/theme/ThemeProvider";

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="px-4 pb-3 shrink-0">
      <p
        className="text-[10px] uppercase tracking-widest mb-2 px-0.5"
        style={{ color: "var(--sidebar-text)", opacity: 0.5 }}
      >
        Giao diện
      </p>
      <div className="flex items-center gap-2">
        {THEMES.map((t) => (
          <button
            key={t.id}
            onClick={() => setTheme(t.id)}
            title={t.label}
            aria-label={t.label}
            aria-pressed={theme === t.id}
            className="w-5 h-5 rounded-full shrink-0 transition-all duration-200"
            style={{
              backgroundColor: t.color,
              outline:
                theme === t.id
                  ? "2px solid var(--sidebar-text)"
                  : "2px solid transparent",
              outlineOffset: "2px",
              transform: theme === t.id ? "scale(1.2)" : "scale(1)",
              boxShadow:
                theme === t.id
                  ? `0 0 8px ${t.color}88`
                  : "none",
            }}
          />
        ))}
      </div>
    </div>
  );
}
