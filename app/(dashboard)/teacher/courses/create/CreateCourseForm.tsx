"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createCourseAction } from "@/lib/courses/actions";
import { FaIcon } from "@/components/ui/FaIcon";
import {
  faImage, faTimes, faArrowRight, faBookOpen,
} from "@fortawesome/free-solid-svg-icons";

type Subject = { id: string; name: string };

const TITLE_MAX = 100;
const DESC_MAX = 500;

export function CreateCourseForm({ subjects }: { subjects: Subject[] }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [thumbnail, setThumbnail] = useState("");
  const [thumbPreview, setThumbPreview] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // ── Thumbnail upload ──────────────────────────────────────
  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) return;
    if (file.size > 10 * 1024 * 1024) { setError("Ảnh tối đa 10 MB"); return; }
    setThumbPreview(URL.createObjectURL(file));
    setUploading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/courses/upload", { method: "POST", body: fd });
      if (!res.ok) throw new Error("Upload thất bại");
      const { url } = await res.json() as { url: string };
      setThumbnail(url);
    } catch {
      setError("Không thể tải ảnh lên. Vui lòng thử lại.");
      setThumbPreview("");
    } finally {
      setUploading(false);
    }
  }

  function removeThumbnail() {
    setThumbnail("");
    setThumbPreview("");
    if (fileRef.current) fileRef.current.value = "";
  }

  // ── Submit ────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return setError("Tên khóa học không được để trống");
    if (!subjectId) return setError("Vui lòng chọn môn học");
    setSaving(true);
    setError("");
    try {
      const result = await createCourseAction({
        title,
        description,
        subjectId,
        thumbnail: thumbnail || undefined,
      });
      router.push(`/teacher/courses/${result.courseId}/edit`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Có lỗi xảy ra");
    } finally {
      setSaving(false);
    }
  }

  const selectedSubject = subjects.find((s) => s.id === subjectId);

  return (
    <form onSubmit={handleSubmit}>
      <div
        className="rounded-2xl overflow-hidden"
        style={{ border: "1.5px solid var(--border-soft)" }}
      >
        {/* ── Thumbnail zone ─────────────────────────────── */}
        <div
          className="relative h-44 sm:h-52 flex items-center justify-center cursor-pointer group overflow-hidden"
          style={{ backgroundColor: "color-mix(in srgb, var(--primary) 6%, var(--surface-strong))" }}
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files[0];
            if (file) handleFile(file);
          }}
        >
          {thumbPreview ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={thumbPreview} alt="thumbnail" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-white text-sm font-medium">Đổi ảnh bìa</span>
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); removeThumbnail(); }}
                className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors text-xs z-10"
              >
                <FaIcon icon={faTimes} />
              </button>
              {uploading && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <svg className="animate-spin w-7 h-7 text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center gap-3 pointer-events-none select-none">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110"
                style={{ backgroundColor: "color-mix(in srgb, var(--primary) 14%, transparent)" }}
              >
                <FaIcon icon={faImage} className="text-2xl text-[color:var(--primary)]" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold" style={{ color: "var(--primary)" }}>Thêm ảnh bìa</p>
                <p className="text-xs text-gray-400 mt-0.5">Kéo thả hoặc click · JPG PNG WebP · tối đa 10 MB</p>
              </div>
            </div>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />

        {/* ── Fields ───────────────────────────────────────── */}
        <div className="p-6 space-y-6" style={{ backgroundColor: "var(--surface-strong)" }}>

          {/* Title */}
          <div>
            <div className="flex items-baseline justify-between mb-1.5">
              <label className="text-sm font-semibold text-gray-800">
                Tên khóa học <span className="text-red-500">*</span>
              </label>
              <span className={`text-xs tabular-nums ${title.length > TITLE_MAX ? "text-red-500 font-medium" : "text-gray-400"}`}>
                {title.length}/{TITLE_MAX}
              </span>
            </div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, TITLE_MAX + 5))}
              className="w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 transition-shadow placeholder:text-gray-400"
              style={{ borderColor: title.length > TITLE_MAX ? "#f87171" : "var(--border-soft)" }}
              placeholder="Vd: Đại số tuyến tính cơ bản, Hóa hữu cơ lớp 12…"
            />
          </div>

          {/* Subject chips */}
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-2">
              Môn học <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {subjects.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSubjectId(s.id)}
                  className="px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all"
                  style={{
                    backgroundColor: subjectId === s.id ? "var(--primary)" : "white",
                    color: subjectId === s.id ? "white" : "var(--foreground)",
                    borderColor: subjectId === s.id ? "var(--primary)" : "var(--border-soft)",
                    boxShadow: subjectId === s.id ? "0 1px 4px color-mix(in srgb, var(--primary) 35%, transparent)" : "none",
                  }}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <div className="flex items-baseline justify-between mb-1.5">
              <label className="text-sm font-semibold text-gray-800">
                Mô tả khóa học
                <span className="text-gray-400 font-normal ml-1.5 text-xs">(tuỳ chọn)</span>
              </label>
              <span className={`text-xs tabular-nums ${description.length > DESC_MAX ? "text-red-500 font-medium" : "text-gray-400"}`}>
                {description.length}/{DESC_MAX}
              </span>
            </div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, DESC_MAX + 10))}
              rows={3}
              className="w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 resize-none leading-relaxed transition-shadow placeholder:text-gray-400"
              style={{ borderColor: "var(--border-soft)" }}
              placeholder="Mô tả ngắn về nội dung, đối tượng và mục tiêu của khóa học…"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
              <span className="text-red-400 mt-0.5 shrink-0">⚠</span>
              {error}
            </div>
          )}

          {/* Live preview hint */}
          {(title.trim() || selectedSubject) && (
            <div
              className="flex items-center gap-3 px-4 py-3 rounded-xl border"
              style={{
                backgroundColor: "color-mix(in srgb, var(--primary) 4%, white)",
                borderColor: "color-mix(in srgb, var(--primary) 20%, transparent)",
              }}
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: "color-mix(in srgb, var(--primary) 12%, transparent)" }}
              >
                {thumbPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={thumbPreview} alt="" className="w-9 h-9 rounded-xl object-cover" />
                ) : (
                  <FaIcon icon={faBookOpen} className="text-sm text-[color:var(--primary)]" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">
                  {title.trim() || "Tên khóa học"}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">{selectedSubject?.name ?? "Chưa chọn môn"}</p>
              </div>
              <span
                className="text-xs px-2.5 py-1 rounded-full font-medium shrink-0"
                style={{
                  backgroundColor: "color-mix(in srgb, var(--primary) 12%, transparent)",
                  color: "var(--primary)",
                }}
              >
                Miễn phí
              </span>
            </div>
          )}

          {/* Actions */}
          <div
            className="flex items-center justify-between pt-2 border-t"
            style={{ borderColor: "var(--border-soft)" }}
          >
            <button
              type="button"
              onClick={() => router.back()}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors px-1 py-1"
            >
              ← Quay lại
            </button>
            <button
              type="submit"
              disabled={saving || uploading || title.length > TITLE_MAX || description.length > DESC_MAX}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-60 disabled:cursor-not-allowed hover:brightness-110"
              style={{ backgroundColor: "var(--primary)" }}
            >
              {saving ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Đang tạo…
                </>
              ) : (
                <>
                  Tạo và thêm bài giảng
                  <FaIcon icon={faArrowRight} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
