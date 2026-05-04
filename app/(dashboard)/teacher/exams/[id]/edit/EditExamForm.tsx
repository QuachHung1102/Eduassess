"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateExamAction } from "@/lib/teacher/actions/exam";

type Props = {
  exam: {
    id: string;
    title: string;
    duration: number;
    showAnswer: boolean;
    allowRetake: boolean;
    dueAt: Date | null;
  };
};

export function EditExamForm({ exam }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const dueAtValue = exam.dueAt
    ? new Date(exam.dueAt.getTime() - exam.dueAt.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16)
    : "";

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess("");
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateExamAction(exam.id, fd);
      if (result?.error) setError(result.error);
      else {
        setSuccess("Đã lưu thay đổi");
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3">
          {success}
        </div>
      )}

      {/* Tên đề */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Tên đề kiểm tra</label>
        <input
          name="title"
          type="text"
          required
          defaultValue={exam.title}
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Thời gian */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Thời gian (phút)</label>
          <input
            name="duration"
            type="number"
            min={5}
            required
            defaultValue={exam.duration}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
          />
        </div>

        {/* Deadline */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Thời hạn nộp <span className="text-gray-400 font-normal">(để trống = không giới hạn)</span>
          </label>
          <input
            name="dueAt"
            type="datetime-local"
            defaultValue={dueAtValue}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
          />
        </div>

        {/* Hiển thị đáp án */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Hiển thị đáp án</label>
          <select
            name="showAnswer"
            defaultValue={exam.showAnswer ? "true" : "false"}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
          >
            <option value="true">Có</option>
            <option value="false">Không</option>
          </select>
        </div>

        {/* Cho phép làm lại */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Cho phép làm lại</label>
          <select
            name="allowRetake"
            defaultValue={exam.allowRetake ? "true" : "false"}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
          >
            <option value="false">Không</option>
            <option value="true">Có</option>
          </select>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-60"
        >
          {isPending ? "Đang lưu..." : "Lưu thay đổi"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="border border-gray-300 text-gray-700 px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          Hủy
        </button>
      </div>
    </form>
  );
}
