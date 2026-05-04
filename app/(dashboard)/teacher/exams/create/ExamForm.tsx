"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createExamAction } from "@/lib/teacher/actions/exam";

type Subject = { id: string; name: string };
type TeacherClass = { classId: string; className: string };

export function ExamForm({
  subjects,
  teacherClasses,
}: {
  subjects: Subject[];
  teacherClasses: TeacherClass[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const [easy, setEasy] = useState(10);
  const [medium, setMedium] = useState(8);
  const [hard, setHard] = useState(2);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createExamAction(formData);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {/* Tên đề */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Tên đề kiểm tra</label>
        <input
          name="title"
          type="text"
          required
          placeholder="VD: Kiểm tra 15 phút - Toán 10 - Chương 2"
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder:text-gray-400"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Môn học */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Môn học</label>
          <select
            name="subjectId"
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
          >
            <option value="">-- Chọn môn --</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        {/* Lớp */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Lớp</label>
          {teacherClasses.length === 0 ? (
            <p className="text-sm text-orange-600 py-2">
              Chưa được phân công lớp nào. Liên hệ Admin.
            </p>
          ) : (
            <select
              name="classId"
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
            >
              <option value="">-- Chọn lớp --</option>
              {teacherClasses.map((c) => (
                <option key={c.classId} value={c.classId}>
                  Lớp {c.className}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Số câu theo độ khó */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Số câu theo độ khó{" "}
          <span className="text-gray-400 font-normal">(AI tự chọn từ ngân hàng đã duyệt)</span>
        </label>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-green-700 mb-1">Dễ</label>
            <input
              name="easyCount"
              type="number"
              min={0}
              value={easy}
              onChange={(e) => setEasy(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder:text-gray-400"
            />
          </div>
          <div>
            <label className="block text-xs text-yellow-700 mb-1">Trung bình</label>
            <input
              name="mediumCount"
              type="number"
              min={0}
              value={medium}
              onChange={(e) => setMedium(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder:text-gray-400"
            />
          </div>
          <div>
            <label className="block text-xs text-red-700 mb-1">Khó</label>
            <input
              name="hardCount"
              type="number"
              min={0}
              value={hard}
              onChange={(e) => setHard(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder:text-gray-400"
            />
          </div>
        </div>
        <div className="mt-2 bg-blue-50 rounded-lg px-4 py-2.5 text-sm text-blue-700">
          Tổng: <strong>{easy + medium + hard} câu</strong> — Dễ: {easy} · TB: {medium} · Khó: {hard}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Thời gian */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Thời gian (phút)
          </label>
          <input
            name="duration"
            type="number"
            min={5}
            defaultValue={45}
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder:text-gray-400"
          />
        </div>

        {/* Hiển thị đáp án */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Hiển thị đáp án sau khi nộp
          </label>
          <select
            name="showAnswer"
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
          >
            <option value="true">Có — cho phép học sinh xem lại</option>
            <option value="false">Không — chỉ hiển thị điểm</option>
          </select>
        </div>

        {/* Cho phép làm lại */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Cho phép làm lại
          </label>
          <select
            name="allowRetake"
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
          >
            <option value="false">Không — mỗi học sinh chỉ làm 1 lần</option>
            <option value="true">Có — học sinh có thể làm lại nhiều lần</option>
          </select>
        </div>

        {/* Deadline */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Thời hạn nộp bài <span className="text-gray-400 font-normal">(để trống = không giới hạn)</span>
          </label>
          <input
            name="dueAt"
            type="datetime-local"
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
          />
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending || teacherClasses.length === 0}
          className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isPending ? "Đang tạo đề..." : "Tạo đề kiểm tra"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/teacher/exams")}
          className="border border-gray-300 text-gray-700 px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          Huỷ
        </button>
      </div>
    </form>
  );
}
