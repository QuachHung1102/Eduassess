"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateQuestionAction } from "@/lib/teacher/actions/question";
import { SymbolToolbar } from "@/components/ui/SymbolToolbar";
import { MathPreview } from "@/components/ui/MathPreview";

type Option = { label: string; text: string; isCorrect: boolean };

interface Props {
  questionId: string;
  initialData: {
    content: string;
    explanation: string | null;
    difficulty: string;
    options: Option[];
    topic: { name: string; grade: { id: string; gradeNumber: number } };
    subject: { id: string; name: string };
  };
}

export function EditQuestionForm({ questionId, initialData }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [contentPreview, setContentPreview] = useState(initialData.content);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess(false);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateQuestionAction(questionId, formData);
      if (result?.error) {
        setError(result.error);
      } else {
        setSuccess(true);
        setTimeout(() => router.push("/teacher/question-bank"), 1000);
      }
    });
  }

  return (
    <form className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start" onSubmit={handleSubmit}>
      {/* ── Left column: metadata + options + explanation ── */}
      <div className="space-y-5">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3">
            Đã lưu thành công! Đang chuyển hướng...
          </div>
        )}

        {/* Môn học (read-only) */}
        <div className="bg-gray-50 rounded-lg px-4 py-3 text-sm text-gray-600">
          <span className="font-medium">Môn học:</span> {initialData.subject.name}
          <span className="mx-2">·</span>
          <span className="font-medium">Chủ đề:</span> {initialData.topic.name}
          <span className="text-gray-400 ml-1 text-xs">(không thể thay đổi)</span>
        </div>

        {/* Độ khó */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Độ khó</label>
          <select
            name="difficulty"
            defaultValue={initialData.difficulty}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
          >
            <option value="EASY">Dễ</option>
            <option value="MEDIUM">Trung bình</option>
            <option value="HARD">Khó</option>
          </select>
        </div>

        {/* Đáp án */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Các đáp án{" "}
            <span className="text-gray-400 font-normal">(chọn radio đáp án đúng)</span>
          </label>
          <div className="space-y-2">
            {initialData.options.map((opt) => (
              <div key={opt.label} className="flex items-center gap-3">
                <input
                  type="radio"
                  name="correct-answer"
                  value={opt.label}
                  defaultChecked={opt.isCorrect}
                  required
                  className="accent-blue-600 w-4 h-4 shrink-0"
                />
                <span className="text-sm font-medium text-gray-600 w-5">{opt.label}.</span>
                <input
                  name={`option-${opt.label}`}
                  type="text"
                  required
                  defaultValue={opt.text}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Giải thích */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Giải thích đáp án{" "}
            <span className="text-gray-400 font-normal">(tuỳ chọn)</span>
          </label>
          <textarea
            name="explanation"
            rows={3}
            defaultValue={initialData.explanation ?? ""}
            placeholder="Giải thích tại sao đáp án này đúng..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-gray-900 placeholder:text-gray-400"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={isPending}
            className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isPending ? "Đang lưu..." : "Lưu thay đổi"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="border border-gray-300 text-gray-600 px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Hủy
          </button>
        </div>
      </div>

      {/* ── Right column: content + live preview (sticky) ── */}
      <div className="sticky top-4 space-y-4">
        <SymbolToolbar />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Nội dung câu hỏi</label>
          <textarea
            name="content"
            rows={10}
            required
            defaultValue={initialData.content}
            onChange={(e) => setContentPreview(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-gray-900"
          />
        </div>
        <MathPreview value={contentPreview} />
      </div>
    </form>
  );
}
