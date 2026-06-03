"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LessonEditor } from "@/components/courses/LessonEditor";
import { FaIcon } from "@/components/ui/FaIcon";
import { faArrowLeft, faSave } from "@fortawesome/free-solid-svg-icons";
import { createLessonAction } from "@/lib/courses/actions";

export function CreateLessonClient({
  courseId,
  courseTitle,
}: {
  courseId: string;
  courseTitle: string;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    if (!title.trim()) { setError("Tiêu đề bài giảng không được để trống."); return; }
    setSaving(true);
    setError("");
    const r = await createLessonAction({ courseId, title, content, videoUrl: videoUrl || undefined });
    setSaving(false);
    if ("error" in r && r.error) {
      setError(r.error);
    } else {
      router.push(`/teacher/courses/${courseId}/edit`);
    }
  }

  return (
    <div className="flex flex-col gap-5 flex-1 min-h-0">
      {/* Breadcrumb + actions */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 text-sm min-w-0">
          <Link
            href="/teacher/courses"
            className="flex items-center gap-1 hover:opacity-80 transition-opacity shrink-0"
            style={{ color: "color-mix(in srgb, var(--foreground) 50%, transparent)" }}
          >
            <FaIcon icon={faArrowLeft} /> Khóa học
          </Link>
          <span style={{ color: "color-mix(in srgb, var(--foreground) 25%, transparent)" }}>/</span>
          <Link
            href={`/teacher/courses/${courseId}/edit`}
            className="truncate max-w-[160px] hover:opacity-80 transition-opacity"
            style={{ color: "color-mix(in srgb, var(--foreground) 50%, transparent)" }}
          >
            {courseTitle}
          </Link>
          <span style={{ color: "color-mix(in srgb, var(--foreground) 25%, transparent)" }}>/</span>
          <span className="font-medium shrink-0" style={{ color: "var(--foreground)" }}>
            Bài giảng mới
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href={`/teacher/courses/${courseId}/edit`}
            className="px-3 py-1.5 rounded-lg text-sm transition-colors"
            style={{
              border: "1px solid var(--border-soft)",
              color: "color-mix(in srgb, var(--foreground) 65%, transparent)",
            }}
          >
            Hủy
          </Link>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !title.trim()}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50"
            style={{ backgroundColor: "var(--primary)" }}
          >
            <FaIcon icon={faSave} />
            {saving ? "Đang lưu…" : "Lưu bài giảng"}
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div
          className="px-4 py-3 rounded-xl text-sm"
          style={{
            backgroundColor: "color-mix(in srgb, #ef4444 10%, var(--surface-strong))",
            border: "1px solid color-mix(in srgb, #ef4444 30%, transparent)",
            color: "#b91c1c",
          }}
        >
          {error}
        </div>
      )}

      {/* Form */}
      <div
        className="flex flex-col gap-5 rounded-xl p-5 flex-1 min-h-0 overflow-y-auto"
        style={{ backgroundColor: "var(--surface-strong)", border: "1.5px solid var(--border-soft)" }}
      >
        {/* Title */}
        <div>
          <label
            className="block text-sm font-medium mb-1.5"
            style={{ color: "var(--foreground)" }}
          >
            Tiêu đề bài giảng <span className="text-red-500">*</span>
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Vd: Bài 1 – Giới thiệu chương trình"
            className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 transition-colors"
            style={{
              border: "1px solid var(--border-soft)",
              backgroundColor: "var(--surface-strong)",
              color: "var(--foreground)",
            }}
            autoFocus
          />
        </div>

        {/* Video URL */}
        <div>
          <label
            className="block text-sm font-medium mb-1.5"
            style={{ color: "var(--foreground)" }}
          >
            URL video{" "}
            <span
              className="text-xs font-normal"
              style={{ color: "color-mix(in srgb, var(--foreground) 45%, transparent)" }}
            >
              (YouTube / Cloudinary — tuỳ chọn)
            </span>
          </label>
          <input
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="https://youtube.com/watch?v=..."
            className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 transition-colors"
            style={{
              border: "1px solid var(--border-soft)",
              backgroundColor: "var(--surface-strong)",
              color: "var(--foreground)",
            }}
          />
        </div>

        {/* Content editor */}
        <div>
          <label
            className="block text-sm font-medium mb-1.5"
            style={{ color: "var(--foreground)" }}
          >
            Nội dung bài giảng
          </label>
          <LessonEditor value={content} onChange={setContent} />
        </div>
      </div>
    </div>
  );
}
