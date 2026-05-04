"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { adminUpdateQuestionAction } from "@/lib/admin/actions";
import { getTopicsAction } from "@/lib/teacher/actions/question";
import { LEVEL_LABEL } from "@/lib/constants/labels";
import { SymbolToolbar } from "@/components/ui/SymbolToolbar";
import { MathPreview } from "@/components/ui/MathPreview";

type Subject = { id: string; name: string };
type Grade = { id: string; level: string; gradeNumber: number };
type Topic = { id: string; name: string };

interface Props {
  questionId: string;
  subjects: Subject[];
  grades: Grade[];
  initialData: {
    content: string;
    explanation: string | null;
    difficulty: string;
    subjectId: string;
    gradeId: string;
    topicName: string;
    options: { label: string; text: string; isCorrect: boolean }[];
  };
}

export function AdminEditQuestionForm({ questionId, subjects, grades, initialData }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [contentPreview, setContentPreview] = useState(initialData.content);

  const [subjectId, setSubjectId] = useState(initialData.subjectId);
  const [gradeId, setGradeId] = useState(initialData.gradeId);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loadingTopics, setLoadingTopics] = useState(false);

  async function loadTopics(sId: string, gId: string) {
    if (!sId || !gId) return;
    setLoadingTopics(true);
    const result = await getTopicsAction(sId, gId);
    setTopics(result);
    setLoadingTopics(false);
  }

  function handleSubjectChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setSubjectId(e.target.value);
    loadTopics(e.target.value, gradeId);
  }

  function handleGradeChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setGradeId(e.target.value);
    loadTopics(subjectId, e.target.value);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess(false);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await adminUpdateQuestionAction(questionId, formData);
      if (result?.error) {
        setError(result.error);
      } else {
        setSuccess(true);
        setTimeout(() => router.push("/admin/questions"), 1000);
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

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Môn học</label>
            <select
              name="subjectId"
              value={subjectId}
              onChange={handleSubjectChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Khối lớp</label>
            <select
              name="gradeId"
              value={gradeId}
              onChange={handleGradeChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
            >
              {grades.map((g) => (
                <option key={g.id} value={g.id}>
                  {LEVEL_LABEL[g.level]} — Lớp {g.gradeNumber}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Chủ đề{" "}
              <span className="text-gray-400 font-normal">
                ({loadingTopics ? "đang tải..." : `${topics.length} chủ đề hiện có`})
              </span>
            </label>
            <input
              name="topicName"
              type="text"
              required
              list="topics-list"
              defaultValue={initialData.topicName}
              placeholder="Nhập hoặc chọn chủ đề..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder:text-gray-400"
            />
            <datalist id="topics-list">
              {topics.map((t) => (
                <option key={t.id} value={t.name} />
              ))}
            </datalist>
          </div>

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
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Các đáp án{" "}
            <span className="text-gray-400 font-normal">(chọn radio để đánh dấu đáp án đúng)</span>
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

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Giải thích đáp án <span className="text-gray-400 font-normal">(tuỳ chọn)</span>
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
            className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isPending ? "Đang lưu..." : "Lưu thay đổi"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/admin/questions")}
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
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-gray-900 placeholder:text-gray-400"
          />
        </div>
        <MathPreview value={contentPreview} />
      </div>
    </form>
  );
}
