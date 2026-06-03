"use client";

import { useState, useTransition } from "react";
import { assignTeacherAction, removeTeacherAction } from "@/lib/admin/actions";
import Link from "next/link";

interface Subject { id: string; name: string }
interface TeacherClass { class: { id: string; name: string; subject: Subject } }
interface ClassItem { id: string; name: string; grade?: { gradeNumber: number } }

interface Props {
  teacher: {
    id: string;
    name: string;
    email: string;
    subjects: Subject[];
    classTeachers: TeacherClass[];
  };
  classes: ClassItem[];
  subjects: Subject[];
}

export function TeacherAssignmentCard({ teacher, classes, subjects }: Props) {
  const [open, setOpen] = useState(false);
  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleOpen() {
    setClassId("");
    setSubjectId("");
    setError(null);
    setOpen(true);
  }

  function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    if (!classId || !subjectId) return;
    setError(null);
    startTransition(async () => {
      try {
        await assignTeacherAction(teacher.id, classId, subjectId);
        setOpen(false);
      } catch {
        setError("Có lỗi xảy ra, vui lòng thử lại");
      }
    });
  }

  function handleRemove(tcClassId: string, label: string) {
    if (!confirm(`Xóa phân công "${label}"?`)) return;
    startTransition(async () => {
      try {
        await removeTeacherAction(teacher.id, tcClassId);
      } catch {
        // silently ignore; page will revalidate
      }
    });
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-gray-900 truncate">{teacher.name}</p>
            {teacher.classTeachers.length > 0 && (
              <span className="shrink-0 text-xs text-gray-400 font-normal">
                {teacher.classTeachers.length} lớp
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-0.5 truncate">{teacher.email}</p>
          {teacher.subjects.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {teacher.subjects.map((s) => (
                <span key={s.id} className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">
                  {s.name}
                </span>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={handleOpen}
          className="shrink-0 px-2.5 py-1 text-xs font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors"
        >
          + Phân công
        </button>
      </div>

      {/* Assignment rows */}
      <div className="divide-y divide-gray-50 max-h-52 overflow-y-auto">
        {teacher.classTeachers.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-5">Chưa có lớp nào được phân công</p>
        ) : (
          teacher.classTeachers.map((tc) => (
            <div
              key={tc.class.id}
              className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 group"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Link
                  href={`/admin/classes/${tc.class.id}`}
                  className="text-sm font-medium text-gray-800 group-hover:text-blue-600 truncate w-15"
                >
                  {tc.class.name}
                </Link>
                <span className="text-xs text-gray-400 shrink-0">{tc.class.subject.name}</span>
              </div>
              <button
                onClick={() =>
                  handleRemove(
                    tc.class.id,
                    `${tc.class.name} – ${tc.class.subject.name}`,
                  )
                }
                disabled={isPending}
                className="shrink-0 ml-2 text-xs text-red-400 hover:text-red-600 disabled:opacity-40 transition-colors opacity-0 group-hover:opacity-100"
              >
                Xóa
              </button>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-semibold text-gray-900">Phân công cho {teacher.name}</h2>
            <p className="text-xs text-gray-400 mt-0.5 mb-4">Chọn lớp và môn học để tạo phân công mới</p>

            <form onSubmit={handleAssign} className="flex flex-col gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lớp học</label>
                <select
                  value={classId}
                  onChange={(e) => setClassId(e.target.value)}
                  required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">-- Chọn lớp --</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Môn học</label>
                <select
                  value={subjectId}
                  onChange={(e) => setSubjectId(e.target.value)}
                  required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">-- Chọn môn --</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {error && <p className="text-xs text-red-500">{error}</p>}

              <div className="flex justify-end gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 text-sm text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                >
                  {isPending ? "Đang lưu..." : "Phân công"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
