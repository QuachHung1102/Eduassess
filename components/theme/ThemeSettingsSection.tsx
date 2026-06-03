"use client";

import { useTheme, THEMES } from "@/components/theme/ThemeProvider";

export function ThemeSettingsSection() {
  const { theme, setTheme, mode, setMode } = useTheme();
  const isDark = mode === "dark";

  return (
    <div className="primary-panel">
      <div className="px-6 py-4" style={{ borderBottom: "1px solid var(--border-soft)" }}>
        <h2 className="font-semibold" style={{ color: "var(--foreground)" }}>Giao diện — Ngũ Hành</h2>
      </div>
      <div className="px-6 py-5 space-y-6">
        {/* ── Light / Dark mode toggle ── */}
        <div>
          <p className="text-sm font-medium mb-3" style={{ color: "color-mix(in srgb, var(--foreground) 78%, transparent)" }}>Chế độ hiển thị</p>
          <div className="inline-flex rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <button
              onClick={() => setMode("light")}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium transition-all duration-200"
              style={{
                backgroundColor: !isDark ? "var(--primary)" : "transparent",
                color: !isDark ? "#ffffff" : "color-mix(in srgb, var(--foreground) 55%, transparent)",
              }}
            >
              <span className="text-base">☀️</span>
              Sáng
            </button>
            <button
              onClick={() => setMode("dark")}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium transition-all duration-200"
              style={{
                backgroundColor: isDark ? "var(--primary)" : "transparent",
                color: isDark ? "#ffffff" : "color-mix(in srgb, var(--foreground) 55%, transparent)",
              }}
            >
              <span className="text-base">🌙</span>
              Tối
            </button>
          </div>
        </div>

        {/* ── Ngũ Hành color theme ── */}
        <div>
          <p className="text-sm font-medium mb-3" style={{ color: "color-mix(in srgb, var(--foreground) 78%, transparent)" }}>
            Bảng màu Ngũ Hành
          </p>
          <p className="text-xs mb-4" style={{ color: "color-mix(in srgb, var(--foreground) 50%, transparent)" }}>
            Chọn hành phù hợp với bạn. Mỗi hành mang một bảng màu và năng lượng riêng.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {THEMES.map((t) => {
              const isActive = theme === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  aria-pressed={isActive}
                  className="relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 hover:shadow-md"
                  style={{
                    borderColor: isActive ? t.color : "transparent",
                    backgroundColor: isActive ? `${t.color}0d` : "transparent",
                    outline: isActive ? undefined : "1px solid var(--border-soft)",
                    transform: isActive ? "scale(1.04)" : undefined,
                    boxShadow: isActive ? `0 4px 16px ${t.color}30` : undefined,
                  }}
                >
                  {/* Gradient swatch circle */}
                  <div
                    className="w-12 h-12 rounded-full shadow-md flex items-center justify-center text-white font-bold text-lg"
                    style={{
                      background: t.gradient,
                      boxShadow: isActive ? `0 0 0 3px white, 0 0 0 5px ${t.color}` : undefined,
                    }}
                  >
                    {t.hanzi}
                  </div>

                  {/* Label */}
                  <span
                    className="text-sm font-semibold leading-tight"
                    style={{ color: isActive ? t.color : "var(--foreground)" }}
                  >
                    {t.label}
                  </span>
                  <span className="text-[11px] leading-tight" style={{ color: "color-mix(in srgb, var(--foreground) 50%, transparent)" }}>
                    {t.element}
                  </span>

                  {/* Color palette chips: nền · chính · accent */}
                  <div className="flex items-center gap-1 mt-0.5" title={`Nền · Chính · Điểm nhấn`}>
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-gray-200 shrink-0"
                      style={{ backgroundColor: t.bg }}
                      title="Màu nền"
                    />
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-gray-200 shrink-0"
                      style={{ backgroundColor: t.color }}
                      title="Màu chính"
                    />
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-gray-200 shrink-0"
                      style={{ backgroundColor: t.accent }}
                      title="Điểm nhấn"
                    />
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-gray-200 shrink-0"
                      style={{ backgroundColor: t.fg }}
                      title="Màu chữ"
                    />
                  </div>

                  {/* Active checkmark */}
                  {isActive && (
                    <span
                      className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full flex items-center justify-center text-white text-[9px] font-bold"
                      style={{ backgroundColor: t.color }}
                    >
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
        {/* End Ngũ Hành grid */}
      </div>
    </div>
  );
}

