"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import katex from "katex";
import MATH_CATS from "@/lib/constants/math-symbols.json";
import MATH_EXTRA from "@/lib/constants/math-symbols-extra.json";
import PHYSICS_CATS from "@/lib/constants/physics-symbols.json";
import CHEMISTRY_CATS from "@/lib/constants/chemistry-symbols.json";
import BIOLOGY_CATS from "@/lib/constants/biology-symbols.json";

type Sym = { display: string; insert: string; hint?: string };
type Category = { name: string; items: Sym[] };

const SUBJECTS = [
  { id: "all",  label: "Tất cả"   },
  { id: "toan", label: "Toán"     },
  { id: "ly",   label: "Vật lý"   },
  { id: "hoa",  label: "Hóa học"  },
  { id: "sinh", label: "Sinh học" },
] as const;

type SubjectId = (typeof SUBJECTS)[number]["id"];

const SUBJECT_CATEGORIES: Record<SubjectId, Category[]> = {
  toan: [...(MATH_CATS as Category[]), ...(MATH_EXTRA as Category[])],
  ly:   PHYSICS_CATS    as Category[],
  hoa:  CHEMISTRY_CATS  as Category[],
  sinh: BIOLOGY_CATS    as Category[],
  all: [
    ...(MATH_CATS      as Category[]),
    ...(MATH_EXTRA     as Category[]),
    ...(PHYSICS_CATS   as Category[]),
    ...(CHEMISTRY_CATS as Category[]),
    ...(BIOLOGY_CATS   as Category[]),
  ],
};

/** Render LaTeX safely - never throws, falls back to text on error */
function SafeMath({ math }: { math: string }) {
  let html = "";
  try {
    html = katex.renderToString(math, {
      throwOnError: false,
      displayMode: false,
      output: "html",
    });
  } catch {
    // katex with throwOnError:false should never throw, but just in case
  }

  if (html) {
    return <span dangerouslySetInnerHTML={{ __html: html }} />;
  }
  return (
    <code className="text-[11px] font-mono text-gray-500 leading-tight">
      {math.replace(/\\/g, "").slice(0, 8)}
    </code>
  );
}

export function SymbolToolbar() {
  const [isOpen,       setIsOpen]       = useState(false);
  const [subject,      setSubject]      = useState<SubjectId>("all");
  const [activeTab,    setActiveTab]    = useState(0);
  const [search,       setSearch]       = useState("");
  const [lastInserted, setLastInserted] = useState<string | null>(null);

  const savedRef = useRef<{
    el: HTMLInputElement | HTMLTextAreaElement;
    start: number;
    end: number;
  } | null>(null);

  useEffect(() => {
    function save(e: Event) {
      const el = e.target as Element;
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
        savedRef.current = {
          el,
          start: el.selectionStart ?? el.value.length,
          end: el.selectionEnd ?? el.value.length,
        };
      }
    }
    document.addEventListener("focus", save, true);
    document.addEventListener("keyup", save);
    document.addEventListener("mouseup", save);
    return () => {
      document.removeEventListener("focus", save, true);
      document.removeEventListener("keyup", save);
      document.removeEventListener("mouseup", save);
    };
  }, []);

  function insertText(el: HTMLInputElement | HTMLTextAreaElement, start: number, end: number, snippet: string) {
    // Use native setter so React's synthetic onChange fires correctly
    const nativeDescriptor =
      el instanceof HTMLTextAreaElement
        ? Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")
        : Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
    nativeDescriptor?.set?.call(el, el.value.slice(0, start) + snippet + el.value.slice(end));
    const newPos = start + snippet.length;
    el.setSelectionRange(newPos, newPos);
    el.focus();
    savedRef.current = { el, start: newPos, end: newPos };
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }

  /** Returns true if the cursor position is inside an unclosed $...$ block */
  function isInsideMath(text: string, cursorPos: number): boolean {
    const before = text.slice(0, cursorPos);
    // Remove $$ pairs so they don't interfere with single-$ counting
    const withoutBlock = before.replace(/\$\$/g, "");
    const count = (withoutBlock.match(/\$/g) || []).length;
    return count % 2 === 1;
  }

  function handleInsert(sym: Sym) {
    const saved = savedRef.current;
    if (!saved) return;
    const inside = isInsideMath(saved.el.value, saved.start);
    const snippet = inside ? sym.insert : `$${sym.insert}$`;
    insertText(saved.el, saved.start, saved.end, snippet);
    setLastInserted(sym.insert);
  }

  function handleInsertNewline() {
    const saved = savedRef.current;
    if (!saved) return;
    insertText(saved.el, saved.start, saved.end, "\n");
  }

  // Categories for current subject
  const categories = SUBJECT_CATEGORIES[subject];
  const safeTab = Math.min(activeTab, categories.length - 1);

  // Search: flat list across all categories of current subject
  const searchResults = useMemo<Sym[]>(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return categories
      .flatMap((c) => c.items)
      .filter(
        (s) =>
          s.hint?.toLowerCase().includes(q) ||
          s.display.toLowerCase().includes(q) ||
          s.insert.toLowerCase().includes(q),
      );
  }, [search, categories]);

  const isSearching = search.trim().length > 0;

  function handleSubjectChange(id: SubjectId) {
    setSubject(id);
    setActiveTab(0);
    setSearch("");
  }

  return (
    <div className="border border-blue-200 rounded-xl bg-blue-50/40 overflow-hidden">
      {/* Header toggle */}
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setIsOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium text-blue-700 hover:bg-blue-50/80 transition-colors"
      >
        <span className="flex items-center gap-2">
          <span className="font-bold text-base leading-none">&#x3A3;</span>
          <span>Công cụ ký hiệu</span>
        </span>
        <span className="text-xs text-blue-400 font-normal">
          {isOpen ? "▲ Thu gọn" : "▼ Mở bảng ký hiệu"}
        </span>
      </button>

      {isOpen && (
        <div className="border-t border-blue-200 px-4 py-3 space-y-3 bg-white/60">
          <p className="text-xs text-gray-500">
            Click vào ô nhập liệu, đặt con trỏ tại vị trí cần chèn, rồi bấm ký hiệu.
            Thay các chữ mẫu (<code className="bg-gray-100 px-1 rounded">x</code>,{" "}
            <code className="bg-gray-100 px-1 rounded">a</code>,{" "}
            <code className="bg-gray-100 px-1 rounded">b</code>...) bằng giá trị thực.
          </p>

          {/* Subject selector */}
          <div className="flex gap-1.5 flex-wrap">
            {SUBJECTS.map((s) => (
              <button
                key={s.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSubjectChange(s.id)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                  subject === s.id
                    ? "bg-blue-700 text-white shadow-sm"
                    : "bg-white border border-gray-200 text-gray-600 hover:border-blue-400 hover:text-blue-700"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Search input */}
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm select-none pointer-events-none">
              🔍
            </span>
            <input
              type="text"
              value={search}
              onMouseDown={(e) => e.stopPropagation()}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm ký hiệu (vd: phân số, sin, lực...)"
              className="w-full pl-8 pr-8 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white text-gray-700 placeholder:text-gray-400"
            />
            {search && (
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs leading-none"
              >
                ✕
              </button>
            )}
          </div>

          {/* Category tabs + newline button (hidden while searching) */}
          {!isSearching && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {categories.map((cat, i) => (
                <button
                  key={i}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setActiveTab(i)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    safeTab === i
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-white border border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
              <div className="ml-auto shrink-0">
                <button
                  type="button"
                  title="Xuống dòng (newline)"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={handleInsertNewline}
                  className="flex items-center gap-1 px-2.5 py-1 bg-white border border-gray-200 rounded-full hover:border-blue-400 hover:bg-blue-50 transition-colors text-xs text-gray-600 font-medium"
                >
                  <span className="leading-none">↵</span>
                  <span>Xuống dòng</span>
                </button>
              </div>
            </div>
          )}

          {/* Symbol grid */}
          <div className="flex flex-wrap gap-1.5 max-h-52 overflow-y-auto">
            {isSearching ? (
              searchResults.length > 0 ? (
                searchResults.map((sym, i) => (
                  <button
                    key={i}
                    type="button"
                    title={sym.hint}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleInsert(sym)}
                    className="flex items-center justify-center min-w-10 px-2 py-1.5 bg-white border border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors overflow-hidden"
                  >
                    <SafeMath math={sym.display} />
                  </button>
                ))
              ) : (
                <p className="text-xs text-gray-400 py-6 w-full text-center">
                  Không tìm thấy ký hiệu phù hợp.
                </p>
              )
            ) : (
              categories[safeTab]?.items.map((sym, i) => (
                <button
                  key={i}
                  type="button"
                  title={sym.hint}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleInsert(sym)}
                  className="flex items-center justify-center min-w-10 px-2 py-1.5 bg-white border border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors overflow-hidden"
                >
                  <SafeMath math={sym.display} />
                </button>
              ))
            )}
          </div>

          {/* Last inserted preview */}
          {lastInserted && (
            <div className="flex items-center gap-2 text-xs text-gray-500 border-t border-blue-100 pt-2 overflow-x-auto">
              <span className="text-gray-400 shrink-0">Vừa chèn:</span>
              <code className="bg-gray-100 px-1.5 py-0.5 rounded font-mono text-gray-700 shrink-0">
                ${lastInserted}$
              </code>
              <span className="text-gray-300 shrink-0">→</span>
              <SafeMath math={lastInserted} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
