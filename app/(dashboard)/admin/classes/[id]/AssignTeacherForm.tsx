"use client";

import { useState, useTransition } from "react";
import { assignTeacherAction } from "@/lib/admin/actions";

interface Teacher {
  id: string;
  name: string;
  subjects: { id: string; name: string }[];
}

export function AssignTeacherForm({
  classId,
  teachers,
}: {
  classId: string;
  teachers: Teacher[];
  subjects?: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [teacherId, setTeacherId] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!teacherId) return;
    startTransition(async () => {
      await assignTeacherAction(teacherId, classId);
      setOpen(false);
      setTeacherId("");
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors"
      >
        + Phân công
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-semibold text-gray-900 mb-4">Phân công giáo viên</h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Giáo viên</label>
                <select
                  value={teacherId}
                  onChange={(e) => setTeacherId(e.target.value)}
                  required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">-- Chọn giáo viên --</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isPending || !teacherId}
                  className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                >
                  {isPending ? "Đang lưu..." : "Phân công"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
