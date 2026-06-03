"use client";

import { useState, useRef, useCallback } from "react";
import { LessonViewer } from "./LessonViewer";
import { FaIcon } from "@/components/ui/FaIcon";
import { SymbolToolbar } from "@/components/ui/SymbolToolbar";
import {
  faBold, faItalic, faHeading, faListUl, faListOl,
  faQuoteLeft, faCode, faSquareRootVariable, faImage,
  faVideo, faLink, faEye, faEdit, faColumns,
  faStrikethrough, faMinus, faTable,
} from "@fortawesome/free-solid-svg-icons";

type Mode = "edit" | "preview" | "split";

type Props = {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
};

export function LessonEditor({ value, onChange, placeholder }: Props) {
  const [mode, setMode] = useState<Mode>("split");
  const [uploading, setUploading] = useState(false);
  const [symbolOpen, setSymbolOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Insert at cursor ────────────────────────────────────────
  const insert = useCallback(
    (before: string, after = "", placeholder = "") => {
      const el = textareaRef.current;
      if (!el) return;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const selected = value.slice(start, end) || placeholder;
      const newVal =
        value.slice(0, start) + before + selected + after + value.slice(end);
      onChange(newVal);
      requestAnimationFrame(() => {
        el.focus();
        el.selectionStart = start + before.length;
        el.selectionEnd = start + before.length + selected.length;
      });
    },
    [value, onChange],
  );

  // ── Toolbar actions ─────────────────────────────────────────
  const toolbar: {
    icon: typeof faBold;
    title: string;
    action: () => void;
  }[] = [
    { icon: faBold, title: "In đậm", action: () => insert("**", "**", "văn bản") },
    { icon: faItalic, title: "In nghiêng", action: () => insert("*", "*", "văn bản") },
    { icon: faHeading, title: "Tiêu đề", action: () => insert("\n## ", "", "Tiêu đề") },
    { icon: faListUl, title: "Danh sách", action: () => insert("\n- ", "", "Mục") },
    { icon: faListOl, title: "Danh sách số", action: () => insert("\n1. ", "", "Mục") },
    { icon: faQuoteLeft, title: "Trích dẫn", action: () => insert("\n> ", "", "Trích dẫn") },
    { icon: faCode, title: "Code", action: () => insert("`", "`", "code") },
    {
      icon: faSquareRootVariable,
      title: "Công thức (inline)",
      action: () => insert("$", "$", "E = mc^2"),
    },
    { icon: faLink, title: "Liên kết", action: () => insert("[", "](url)", "tiêu đề") },
    { icon: faStrikethrough, title: "Gạch ngang", action: () => insert("~~", "~~", "văn bản") },
    { icon: faMinus, title: "Đường kẻ ngang", action: () => insert("\n\n---\n\n") },
    { icon: faTable, title: "Bảng", action: () => insert("\n| Cột 1 | Cột 2 | Cột 3 |\n|-------|-------|-------|\n| A     | B     | C     |\n") },
  ];

  // ── Upload image ─────────────────────────────────────────────
  async function handleImageUpload(file: File) {
    if (!file.type.startsWith("image/")) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("type", "image");
      const res = await fetch("/api/courses/upload", { method: "POST", body: fd });
      if (!res.ok) throw new Error("Upload thất bại");
      const { url } = await res.json();
      insert(`\n![`, `](${url})\n`, "mô tả ảnh");
    } finally {
      setUploading(false);
    }
  }

  // ── Insert math block ────────────────────────────────────────
  function insertMathBlock() {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const snippet = "\n$$\n\\frac{a}{b} = c\n$$\n";
    onChange(value.slice(0, start) + snippet + value.slice(start));
  }

  // ── Insert video embed ───────────────────────────────────────
  function insertVideoEmbed() {
    const url = prompt("Nhập URL video (YouTube hoặc Cloudinary):");
    if (!url) return;
    // YouTube embed
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?\s]+)/);
    if (ytMatch) {
      insert(
        `\n<iframe width="100%" style="aspect-ratio:16/9;border-radius:12px" src="https://www.youtube.com/embed/${ytMatch[1]}" frameborder="0" allowfullscreen></iframe>\n`,
      );
    } else {
      insert(`\n<video controls style="width:100%;border-radius:12px"><source src="${url}" /></video>\n`);
    }
  }

  // ── Handle paste (image paste) ───────────────────────────────
  async function handlePaste(e: React.ClipboardEvent) {
    const file = e.clipboardData.files[0];
    if (file?.type.startsWith("image/")) {
      e.preventDefault();
      await handleImageUpload(file);
    }
  }

  return (
    <div
      className="flex flex-col rounded-xl overflow-hidden"
      style={{ border: "1.5px solid var(--border-soft)" }}
    >
      {/* Toolbar */}
      <div
        className="flex items-center gap-0.5 px-2 py-1.5 flex-wrap"
        style={{
          backgroundColor: "var(--surface-strong)",
          borderBottom: "1px solid var(--border-soft)",
        }}
      >
        {toolbar.map((t) => (
          <button
            key={t.title}
            type="button"
            title={t.title}
            onClick={t.action}
            className="w-7 h-7 rounded flex items-center justify-center text-xs transition-colors hover:opacity-80"
            style={{
              color: "color-mix(in srgb, var(--foreground) 70%, transparent)",
              backgroundColor: "transparent",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = "color-mix(in srgb, var(--primary) 12%, transparent)")
            }
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
          >
            <FaIcon icon={t.icon} />
          </button>
        ))}

        <div
          className="w-px h-5 mx-1"
          style={{ backgroundColor: "var(--border-soft)" }}
        />

        {/* Code block */}
        <button
          type="button"
          title="Khối code"
          onClick={() => insert("\n```\n", "\n```\n", "code")}
          className="h-7 px-2 rounded text-xs font-mono transition-colors"
          style={{ color: "color-mix(in srgb, var(--foreground) 70%, transparent)" }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.backgroundColor = "color-mix(in srgb, var(--primary) 12%, transparent)")
          }
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
        >
          ```
        </button>

        {/* Math block */}
        <button
          type="button"
          title="Công thức khối"
          onClick={insertMathBlock}
          className="h-7 px-2 rounded text-xs font-mono transition-colors"
          style={{ color: "var(--primary)" }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.backgroundColor = "color-mix(in srgb, var(--primary) 12%, transparent)")
          }
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
        >
          $$
        </button>

        {/* Image upload */}
        <button
          type="button"
          title="Chèn ảnh"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
          className="w-7 h-7 rounded flex items-center justify-center text-xs transition-colors disabled:opacity-40"
          style={{ color: "color-mix(in srgb, var(--foreground) 70%, transparent)" }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.backgroundColor = "color-mix(in srgb, var(--primary) 12%, transparent)")
          }
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
        >
          {uploading ? (
            <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          ) : (
            <FaIcon icon={faImage} />
          )}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
        />

        {/* Video embed */}
        <button
          type="button"
          title="Chèn video"
          onClick={insertVideoEmbed}
          className="w-7 h-7 rounded flex items-center justify-center text-xs transition-colors"
          style={{ color: "color-mix(in srgb, var(--foreground) 70%, transparent)" }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.backgroundColor = "color-mix(in srgb, var(--primary) 12%, transparent)")
          }
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
        >
          <FaIcon icon={faVideo} />
        </button>

        {/* Symbol toolbar modal trigger */}
        <button
          type="button"
          title="Công cụ ký hiệu"
          onClick={() => setSymbolOpen(true)}
          className="h-7 px-2 rounded text-xs font-bold transition-colors"
          style={{ color: "var(--primary)" }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.backgroundColor = "color-mix(in srgb, var(--primary) 12%, transparent)")
          }
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
        >
          Σ
        </button>

        {/* Spacer */}
        <div className="flex-1" />

        {/* View mode toggle */}
        <div
          className="flex rounded-lg overflow-hidden text-xs"
          style={{ border: "1px solid var(--border-soft)" }}
        >
          {(["edit", "split", "preview"] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className="px-2 py-1 transition-colors"
              style={{
                backgroundColor:
                  mode === m
                    ? "var(--primary)"
                    : "transparent",
                color: mode === m ? "#fff" : "color-mix(in srgb, var(--foreground) 60%, transparent)",
              }}
            >
              {m === "edit" ? <FaIcon icon={faEdit} /> : m === "preview" ? <FaIcon icon={faEye} /> : <FaIcon icon={faColumns} />}
            </button>
          ))}
        </div>
      </div>

      {/* Panes */}
      <div className="flex min-h-[420px]">
        {/* Editor pane */}
        {(mode === "edit" || mode === "split") && (
          <div className={mode === "split" ? "w-1/2 flex flex-col" : "flex-1 flex flex-col"}>
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onPaste={handlePaste}
              placeholder={placeholder ?? "Nhập nội dung bài giảng (Markdown)…\n\nHỗ trợ:\n- **in đậm**, *in nghiêng*\n- ## Tiêu đề\n- $công thức$ hoặc $$khối công thức$$\n- ![ảnh](url)\n- Paste ảnh trực tiếp"}
              className="flex-1 resize-none p-4 font-mono text-sm outline-none leading-relaxed"
              style={{
                backgroundColor: "var(--surface-strong)",
                color: "var(--foreground)",
                borderRight: mode === "split" ? "1px solid var(--border-soft)" : "none",
                minHeight: 420,
              }}
              spellCheck={false}
            />
          </div>
        )}

        {/* Preview pane */}
        {(mode === "preview" || mode === "split") && (
          <div
            className={`${mode === "split" ? "w-1/2" : "flex-1"} overflow-auto p-4`}
            style={{ backgroundColor: "var(--surface-strong)" }}
          >
            {value ? (
              <LessonViewer content={value} />
            ) : (
              <p
                className="text-sm italic"
                style={{ color: "color-mix(in srgb, var(--foreground) 35%, transparent)" }}
              >
                Xem trước nội dung sẽ hiển thị ở đây…
              </p>
            )}
          </div>
        )}
      </div>

      {/* Symbol toolbar modal */}
      {symbolOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          onClick={() => setSymbolOpen(false)}
        >
          <div
            className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl shadow-2xl p-5"
            style={{ backgroundColor: "var(--surface-strong)", border: "1.5px solid var(--border-soft)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <SymbolToolbar modalMode onClose={() => setSymbolOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
