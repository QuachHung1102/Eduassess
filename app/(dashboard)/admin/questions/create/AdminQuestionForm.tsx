"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { adminCreateQuestionAction } from "@/lib/admin/actions";
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
} from "@/components/questions/QuestionFields";

export function AdminQuestionForm({
  subjects,
  grades,
}: {
  subjects: QuestionSubject[];
  grades: QuestionGrade[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await adminCreateQuestionAction(formData);
      if (result && "error" in result) setError(result.error);
    });
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      <QuestionMetadataFields subjects={subjects} grades={grades} />

      <SymbolToolbar />

      <QuestionContentField rows={4} />

      <QuestionOptionsField options={emptyOptions()} />

      <QuestionExplanationField />

      <QuestionFormActions
        isPending={isPending}
        submitLabel="Lưu câu hỏi"
        onCancel={() => router.push("/admin/questions")}
      />
    </form>
  );
}
