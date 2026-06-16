"use client";

import { useState } from "react";
import { submitReviewAction } from "@/lib/courses/actions";
import { faStar } from "@fortawesome/free-solid-svg-icons";
import { FaIcon } from "@/components/ui/FaIcon";

export function CourseReviewSection({
  courseId,
}: {
  courseId: string;
}) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0) return setMsg("Vui lòng chọn số sao");
    setSaving(true);
    setMsg("");
    const r = await submitReviewAction({ courseId, rating, comment });
    setSaving(false);
    if ("error" in r) {
      setMsg(r.error);
    } else {
      setMsg("Đã gửi đánh giá ✓");
    }
  }

  return (
    <div
      className="rounded-xl p-5"
      style={{
        backgroundColor: "var(--surface-strong)",
        border: "1.5px solid var(--border-soft)",
      }}
    >
      <h2 className="font-semibold text-gray-800 mb-4">Đánh giá khóa học</h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Star picker */}
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              onMouseEnter={() => setHovered(n)}
              onMouseLeave={() => setHovered(0)}
              className={`text-2xl transition-colors ${
                (hovered || rating) >= n ? "text-yellow-400" : "text-gray-200"
              }`}
            >
              <FaIcon icon={faStar} />
            </button>
          ))}
          {rating > 0 && (
            <span className="text-xs text-gray-500 ml-2">{rating}/5</span>
          )}
        </div>

        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={2}
          placeholder="Nhận xét (tuỳ chọn)…"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-60"
          >
            {saving ? "Đang gửi…" : "Gửi đánh giá"}
          </button>
          {msg && <span className="text-xs text-green-600">{msg}</span>}
        </div>
      </form>
    </div>
  );
}
