"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { assignStudentToClassAction } from "@/lib/admin/actions";

interface Student {
  id: string;
  name: string;
  email: string;
  sex: string | null;
  classEnrollments: { class: { name: string } }[];
}

export function AssignStudentForm({
  classId,
  existingStudentIds,
}: {
  classId: string;
  existingStudentIds: string[];
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/students-search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data.students ?? []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, [query]);

  function handleAdd(studentId: string) {
    startTransition(async () => {
      await assignStudentToClassAction(studentId, classId);
      setOpen(false);
      setQuery("");
      setResults([]);
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
      >
        + Thêm học sinh
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-semibold text-gray-900 mb-4">Thêm học sinh vào lớp</h2>
            <input
              type="text"
              placeholder="Tìm theo tên hoặc email..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
            />
            <div className="max-h-64 overflow-y-auto divide-y divide-gray-50 rounded-lg border border-gray-100">
              {loading && (
                <div className="text-center py-6 text-sm text-gray-400">Đang tìm...</div>
              )}
              {!loading && query && results.length === 0 && (
                <div className="text-center py-6 text-sm text-gray-400">Không tìm thấy</div>
              )}
              {!loading && !query && (
                <div className="text-center py-6 text-sm text-gray-400">Nhập tên hoặc email để tìm kiếm</div>
              )}
              {results.map((s) => {
                const alreadyIn = existingStudentIds.includes(s.id);
                const currentClass = s.classEnrollments[0]?.class?.name;
                return (
                  <div
                    key={s.id}
                    className="flex items-center justify-between px-3 py-2.5 hover:bg-gray-50"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {s.name}
                        {s.sex && (
                          <span className="ml-1 text-xs text-gray-400">
                            ({s.sex === "MALE" ? "Nam" : "Nữ"})
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-gray-400">
                        {s.email}
                        {currentClass && (
                          <span className="ml-2 text-amber-500">Đang ở lớp {currentClass}</span>
                        )}
                      </p>
                    </div>
                    <button
                      onClick={() => handleAdd(s.id)}
                      disabled={alreadyIn || isPending}
                      className="px-2.5 py-1 text-xs font-medium text-white bg-blue-600 rounded disabled:bg-gray-200 disabled:text-gray-400 hover:bg-blue-700 transition-colors"
                    >
                      {alreadyIn ? "Đã có" : isPending ? "..." : "Thêm"}
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-end mt-4">
              <button
                onClick={() => setOpen(false)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
