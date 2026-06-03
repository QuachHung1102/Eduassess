"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { enrollCourseAction } from "@/lib/courses/actions";

export function EnrollButton({ courseId }: { courseId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleEnroll() {
    setLoading(true);
    const r = await enrollCourseAction(courseId);
    setLoading(false);
    if (!('error' in r)) {
      router.refresh();
    } else {
      alert((r as { error: string }).error);
    }
  }

  return (
    <button
      type="button"
      onClick={handleEnroll}
      disabled={loading}
      className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60"
    >
      {loading ? "Đang ghi danh…" : "Ghi danh miễn phí"}
    </button>
  );
}
