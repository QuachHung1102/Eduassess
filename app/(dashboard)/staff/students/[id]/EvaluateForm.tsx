"use client";

import { useState, useTransition } from "react";
import { evaluateStudentLevelAction } from "@/lib/classes/actions";
import type { StudentLevel } from "@/lib/types";

interface Subject {
  id: string;
  name: string;
}

const LEVELS: { value: StudentLevel; label: string }[] = [
  { value: "WEAK", label: "Yếu" },
  { value: "AVERAGE", label: "Trung bình" },
  { value: "GOOD", label: "Khá / Giỏi" },
];

export function EvaluateForm({ studentId, subjects }: { studentId: string; subjects: Subject[] }) {
  const [isPending, startTransition] = useTransition();
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? "");
  const [level, setLevel] = useState<StudentLevel>("AVERAGE");
  const [note, setNote] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setDone(false);
    startTransition(async () => {
      const res = await evaluateStudentLevelAction({ studentId, subjectId, level, note });
      if (res.error) {
        setError(res.error);
        return;
      }
      setNote("");
      setDone(true);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
          {error}
        </p>
      )}
      {done && (
        <p className="text-xs text-green-700 bg-green-50 border border-green-200 px-3 py-2 rounded-lg">
          ✓ Đã lưu đánh giá
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Môn học</label>
          <select
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Năng lực</label>
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value as StudentLevel)}
            className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {LEVELS.map((l) => (
              <option key={l.value} value={l.value}>{l.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Ghi chú</label>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Nhận xét, điểm mạnh/yếu..."
          className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      <button
        type="submit"
        disabled={isPending || !subjectId}
        className="w-full py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
      >
        {isPending ? "Đang lưu..." : "Lưu đánh giá"}
      </button>
    </form>
  );
}
