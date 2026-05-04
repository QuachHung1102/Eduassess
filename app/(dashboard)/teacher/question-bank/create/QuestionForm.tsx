"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createQuestionAction, getTopicsAction } from "@/lib/teacher/actions/question";
import type { SuggestedQuestion } from "@/lib/ai";
import { AiSuggestPanel } from "./AiSuggestPanel";

type Subject = { id: string; name: string };
type Grade = { id: string; level: string; gradeNumber: number };
type Topic = { id: string; name: string };

import { LEVEL_LABEL } from "@/lib/constants/labels";
import { SymbolToolbar } from "@/components/ui/SymbolToolbar";
import { MathPreview } from "@/components/ui/MathPreview";

export function QuestionForm({
  subjects,
  grades,
}: {
  subjects: Subject[];
  grades: Grade[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? "");
  const [gradeId, setGradeId] = useState(grades[0]?.id ?? "");
  const [topicName, setTopicName] = useState("");
  const [difficulty, setDifficulty] = useState("MEDIUM");
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loadingTopics, setLoadingTopics] = useState(false);

  const [contentPreview, setContentPreview] = useState("");

  // Key trick: remount form fields when AI suggestion is applied
  const [formKey, setFormKey] = useState(0);
  const [defaults, setDefaults] = useState({
    content: "",
    optionA: "",
    optionB: "",
    optionC: "",
    optionD: "",
    correct: "",
    explanation: "",
  });

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
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createQuestionAction(formData);
      if (result?.error) setError(result.error);
    });
  }

  function applySuggestion(q: SuggestedQuestion) {
    setDefaults({
      content: q.content,
      optionA: q.options.A,
      optionB: q.options.B,
      optionC: q.options.C,
      optionD: q.options.D,
      correct: q.correct,
      explanation: q.explanation,
    });
    setContentPreview(q.content);
    setFormKey((k) => k + 1); // remount inputs with new defaultValue
    // Scroll to top of form
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {/* Metadata */}
      <div className="grid grid-cols-2 gap-4">
        {/* Môn học */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Môn học</label>
          <select
            name="subjectId"
            value={subjectId}
            onChange={handleSubjectChange}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
          >
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        {/* Khối lớp */}
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

        {/* Chủ đề */}
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
            value={topicName}
            onChange={(e) => setTopicName(e.target.value)}
            placeholder="Nhập hoặc chọn chủ đề có sẵn..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder:text-gray-400"
          />
          <datalist id="topics-list">
            {topics.map((t) => (
              <option key={t.id} value={t.name} />
            ))}
          </datalist>
        </div>

        {/* Độ khó */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Độ khó</label>
          <select
            name="difficulty"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
          >
            <option value="EASY">Dễ</option>
            <option value="MEDIUM">Trung bình</option>
            <option value="HARD">Khó</option>
          </select>
        </div>
      </div>

      {/* ── Bảng ký hiệu toán học ── */}
      <SymbolToolbar />

      {/* ── AI Suggest Panel ── */}
      <AiSuggestPanel
        subjectId={subjectId}
        gradeId={gradeId}
        topicName={topicName}
        difficulty={difficulty}
        onApply={applySuggestion}
      />

      {/* ── Nội dung câu hỏi (keyed for AI fill) ── */}
      <div key={`content-${formKey}`}>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Nội dung câu hỏi</label>
        <textarea
          name="content"
          rows={4}
          required
          defaultValue={defaults.content}
          placeholder="Nhập câu hỏi tại đây..."
          onChange={(e) => setContentPreview(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-gray-900 placeholder:text-gray-400"
        />
        <MathPreview value={contentPreview} />
      </div>

      {/* Đáp án (keyed for AI fill) */}
      <div key={`options-${formKey}`}>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Các đáp án{" "}
          <span className="text-gray-400 font-normal">(chọn radio để đánh dấu đáp án đúng)</span>
        </label>
        <div className="space-y-2">
          {(["A", "B", "C", "D"] as const).map((opt) => (
            <div key={opt} className="flex items-center gap-3">
              <input
                type="radio"
                name="correct-answer"
                value={opt}
                required
                defaultChecked={defaults.correct === opt}
                className="accent-blue-600 w-4 h-4 shrink-0"
              />
              <span className="text-sm font-medium text-gray-600 w-5">{opt}.</span>
              <input
                name={`option-${opt}`}
                type="text"
                required
                defaultValue={defaults[`option${opt}` as keyof typeof defaults]}
                placeholder={`Nội dung đáp án ${opt}`}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder:text-gray-400"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Giải thích (keyed for AI fill) */}
      <div key={`expl-${formKey}`}>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Giải thích đáp án{" "}
          <span className="text-gray-400 font-normal">(tuỳ chọn)</span>
        </label>
        <textarea
          name="explanation"
          rows={3}
          defaultValue={defaults.explanation}
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
          {isPending ? "Đang lưu..." : "Lưu câu hỏi"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/teacher/question-bank")}
          className="border border-gray-300 text-gray-700 px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          Huỷ
        </button>
      </div>
    </form>
  );
}
