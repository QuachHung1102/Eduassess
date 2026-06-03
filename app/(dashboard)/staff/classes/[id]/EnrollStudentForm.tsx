"use client";

import { useState, useTransition } from "react";
import { enrollStudentAction } from "@/lib/classes/actions";
import { FaIcon } from "@/components/ui/FaIcon";
import { faPlus } from "@fortawesome/free-solid-svg-icons";

interface Student {
  id: string;
  name: string | null;
  email: string;
}

export function EnrollStudentForm({
  classId,
  students,
}: {
  classId: string;
  students: Student[];
}) {
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setError("");
    startTransition(async () => {
      const res = await enrollStudentAction(classId, selected);
      if (res.error) { setError(res.error); return; }
      setSelected("");
    });
  }

  if (students.length === 0) {
    return (
      <p className="text-xs text-gray-400 text-center py-3">
        Tất cả học sinh đã được đăng ký
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 p-3 border-t border-gray-100">
      {error && <p className="text-xs text-red-600 w-full">{error}</p>}
      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        className="flex-1 text-xs border border-gray-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
      >
        <option value="">-- Chọn học sinh --</option>
        {students.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name ?? s.email}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={isPending || !selected}
        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700 disabled:opacity-50 transition-colors"
      >
        <FaIcon icon={faPlus} className="text-xs" />
        {isPending ? "..." : "Thêm"}
      </button>
    </form>
  );
}
