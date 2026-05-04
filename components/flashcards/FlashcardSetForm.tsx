"use client";

import { useState, useTransition } from "react";
import { createFlashcardSetAction } from "@/lib/teacher/actions/flashcard";
import { adminCreateFlashcardSetAction } from "@/lib/admin/flashcard-actions";

type Subject = {
  id: string;
  name: string;
};

type Grade = {
  id: string;
  level: "PRIMARY" | "MIDDLE" | "HIGH";
  gradeNumber: number;
};

type Props = {
  role: "teacher" | "admin";
  subjects: Subject[];
  grades: Grade[];
};

const DIFFICULTY_OPTIONS = [
  { value: "EASY", label: "Dễ" },
  { value: "MEDIUM", label: "Trung bình" },
  { value: "HARD", label: "Khó" },
] as const;

import { LEVEL_LABEL } from "@/lib/constants/labels";

export function FlashcardSetForm({ role, subjects, grades }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result =
        role === "teacher"
          ? await createFlashcardSetAction(formData)
          : await adminCreateFlashcardSetAction(formData);

      if (result && "error" in result) {
        setError(result.error);
      }
    });
  }

  if (subjects.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        {role === "teacher"
          ? "Bạn chưa có môn học nào để tạo flashcard."
          : "Chưa có môn học nào trong hệ thống."}
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">Tên bộ flashcard</label>
        <input
          name="title"
          type="text"
          required
          placeholder="VD: Công thức lượng giác cơ bản"
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">Mô tả</label>
        <textarea
          name="description"
          rows={3}
          placeholder="Mô tả ngắn về nội dung bộ thẻ"
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Môn học</label>
          <select
            name="subjectId"
            required
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            defaultValue={subjects[0]?.id ?? ""}
          >
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Khối lớp</label>
          <select
            name="gradeId"
            required
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            defaultValue={grades[0]?.id ?? ""}
          >
            {grades.map((grade) => (
              <option key={grade.id} value={grade.id}>
                {LEVEL_LABEL[grade.level]} · Lớp {grade.gradeNumber}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Chủ đề</label>
          <input
            name="topicName"
            type="text"
            required
            placeholder="VD: Hàm số bậc hai"
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Độ khó</label>
          <select
            name="difficulty"
            required
            defaultValue="MEDIUM"
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {DIFFICULTY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Đang tạo..." : "Tạo bộ flashcard"}
      </button>
    </form>
  );
}
