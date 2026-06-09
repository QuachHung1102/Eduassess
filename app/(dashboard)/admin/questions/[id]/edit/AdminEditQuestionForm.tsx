"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { adminUpdateQuestionAction } from "@/lib/admin/actions";
import { SymbolToolbar } from "@/components/ui/SymbolToolbar";
import {
  QuestionMetadataFields,
  QuestionContentField,
  QuestionOptionsField,
  QuestionExplanationField,
  QuestionFormActions,
  type QuestionSubject,
  type QuestionGrade,
  type QuestionOption,
} from "@/components/questions/QuestionFields";

interface Props {
  questionId: string;
  subjects: QuestionSubject[];
  grades: QuestionGrade[];
  initialData: {
    content: string;
    explanation: string | null;
    difficulty: string;
    subjectId: string;
    gradeId: string;
    topicName: string;
    options: QuestionOption[];
  };
}

export function AdminEditQuestionForm({ questionId, subjects, grades, initialData }: Props) {
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
      const result = await adminUpdateQuestionAction(questionId, formData);
      if (result && "error" in result) {
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

        <QuestionMetadataFields
          subjects={subjects}
          grades={grades}
          initialSubjectId={initialData.subjectId}
          initialGradeId={initialData.gradeId}
          initialTopicName={initialData.topicName}
          initialDifficulty={initialData.difficulty}
        />

        <QuestionOptionsField options={initialData.options} />

        <QuestionExplanationField defaultValue={initialData.explanation ?? ""} />

        <QuestionFormActions
          isPending={isPending}
          submitLabel="Lưu thay đổi"
          onCancel={() => router.push("/admin/questions")}
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
