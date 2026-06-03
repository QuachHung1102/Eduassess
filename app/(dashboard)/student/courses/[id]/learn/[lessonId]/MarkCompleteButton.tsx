"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { markLessonCompleteAction } from "@/lib/courses/actions";
import { FaIcon } from "@/components/ui/FaIcon";
import { faCheckCircle, faCircle } from "@fortawesome/free-solid-svg-icons";

export function MarkCompleteButton({
  lessonId,
  courseId,
  nextLessonId,
  isCompleted,
}: {
  lessonId: string;
  courseId: string;
  nextLessonId?: string;
  isCompleted: boolean;
}) {
  const router = useRouter();
  const [done, setDone] = useState(isCompleted);
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (done) {
      // Navigate to next lesson if already complete
      if (nextLessonId) {
        router.push(`/student/courses/${courseId}/learn/${nextLessonId}`);
      }
      return;
    }
    setLoading(true);
    const r = await markLessonCompleteAction(lessonId);
    setLoading(false);
    if (!('error' in r)) {
      setDone(true);
      if (nextLessonId) {
        router.push(`/student/courses/${courseId}/learn/${nextLessonId}`);
      } else {
        router.push(`/student/courses/${courseId}`);
      }
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-60 ${
        done
          ? "bg-green-100 text-green-700 hover:bg-green-200"
          : "bg-blue-600 text-white hover:bg-blue-700"
      }`}
    >
      <FaIcon icon={done ? faCheckCircle : faCircle} />
      {loading ? "Đang lưu…" : done ? (nextLessonId ? "Bài tiếp →" : "Hoàn thành ✓") : "Đánh dấu đã học"}
    </button>
  );
}
