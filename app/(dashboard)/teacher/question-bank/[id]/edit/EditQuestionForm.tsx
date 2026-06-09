"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateQuestionAction } from "@/lib/teacher/actions/question";
import { SymbolToolbar } from "@/components/ui/SymbolToolbar";
import {
  QuestionContentField,
  QuestionOptionsField,
  QuestionExplanationField,
  QuestionDifficultyField,
  QuestionFormActions,
  type QuestionOption,
} from "@/components/questions/QuestionFields";

interface Props {
  questionId: string;
  initialData: {
    content: string;
    explanation: string | null;
    difficulty: string;
    options: QuestionOption[];
    topic: { name: string; grade: { id: string; gradeNumber: number } };
    subject: { id: string; name: string };
  };
}

export function EditQuestionForm({ questionId, initialData }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess(false);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateQuestionAction(questionId, formData);
      if (result && "error" in result) {
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

        <QuestionDifficultyField defaultValue={initialData.difficulty} />

        <QuestionOptionsField options={initialData.options} />

        <QuestionExplanationField defaultValue={initialData.explanation ?? ""} />

        <QuestionFormActions
          isPending={isPending}
          submitLabel="Lưu thay đổi"
          onCancel={() => router.back()}
        />
      </div>

      {/* ── Right column: content + live preview (sticky) ── */}
      <div className="sticky top-4 space-y-4">
        <SymbolToolbar />
        <QuestionContentField defaultValue={initialData.content} rows={10} />
      </div>
    </form>
  );
}
