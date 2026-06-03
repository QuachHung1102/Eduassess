"use client";

import { useLanguage } from "@/lib/i18n/LanguageContext";

export function LanguageSwitcher({ className }: { className?: string }) {
  const { lang, setLang } = useLanguage();
  const isVi = lang === "vi";

  return (
    <button
      type="button"
      onClick={() => setLang(isVi ? "en" : "vi")}
      className={className}
      title={isVi ? "Switch to English" : "Chuyển sang Tiếng Việt"}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.35rem",
        borderRadius: "0.5rem",
        padding: "0.25rem 0.6rem",
        fontSize: "0.72rem",
        fontWeight: 700,
        letterSpacing: "0.04em",
        border: "1px solid var(--sidebar-border)",
        color: "var(--sidebar-text)",
        backgroundColor: "transparent",
        cursor: "pointer",
        transition: "all 180ms ease",
        lineHeight: 1.4,
      }}
    >
      {isVi ? (
        <>
          <span aria-hidden="true">EN</span>
          <span style={{ opacity: 0.5, fontWeight: 400 }}>/ VI</span>
        </>
      ) : (
        <>
          <span aria-hidden="true">VI</span>
          <span style={{ opacity: 0.5, fontWeight: 400 }}>/ EN</span>
        </>
      )}
    </button>
  );
}
