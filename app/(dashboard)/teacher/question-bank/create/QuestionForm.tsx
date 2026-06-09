"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createQuestionAction } from "@/lib/teacher/actions/question";
import type { SuggestedQuestion } from "@/lib/ai";
import { AiSuggestPanel } from "./AiSuggestPanel";
import { SymbolToolbar } from "@/components/ui/SymbolToolbar";
import {
  QuestionMetadataFields,
  QuestionContentField,
  QuestionOptionsField,
  QuestionExplanationField,
  QuestionFormActions,
  emptyOptions,
  type QuestionSubject,
  type QuestionGrade,
  type QuestionOption,
} from "@/components/questions/QuestionFields";

export function QuestionForm({
  subjects,
  grades,
}: {
  subjects: QuestionSubject[];
  grades: QuestionGrade[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const [meta, setMeta] = useState({
    subjectId: subjects[0]?.id ?? "",
    gradeId: grades[0]?.id ?? "",
    topicName: "",
    difficulty: "MEDIUM",
  });

  // Key trick: remount answer fields when an AI suggestion is applied
  const [formKey, setFormKey] = useState(0);
  const [content, setContent] = useState("");
  const [options, setOptions] = useState<QuestionOption[]>(emptyOptions());
  const [explanation, setExplanation] = useState("");

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
    setContent(q.content);
    setOptions(
      (["A", "B", "C", "D"] as const).map((l) => ({
        label: l,
        text: q.options[l],
        isCorrect: q.correct === l,
      })),
    );
    setExplanation(q.explanation);
    setFormKey((k) => k + 1); // remount inputs with new defaultValue
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      <QuestionMetadataFields subjects={subjects} grades={grades} onChange={setMeta} />

      {/* ── Bảng ký hiệu toán học ── */}
      <SymbolToolbar />

      {/* ── AI Suggest Panel ── */}
      <AiSuggestPanel
        subjectId={meta.subjectId}
        gradeId={meta.gradeId}
        topicName={meta.topicName}
        difficulty={meta.difficulty}
        onApply={applySuggestion}
      />

      {/* ── Nội dung câu hỏi (keyed for AI fill) ── */}
      <div key={`content-${formKey}`}>
        <QuestionContentField defaultValue={content} rows={4} />
      </div>

      {/* Đáp án (keyed for AI fill) */}
      <div key={`options-${formKey}`}>
        <QuestionOptionsField options={options} />
      </div>

      {/* Giải thích (keyed for AI fill) */}
      <div key={`expl-${formKey}`}>
        <QuestionExplanationField defaultValue={explanation} />
      </div>

      <QuestionFormActions
        isPending={isPending}
        submitLabel="Lưu câu hỏi"
        onCancel={() => router.push("/teacher/question-bank")}
      />
    </form>
  );
}
