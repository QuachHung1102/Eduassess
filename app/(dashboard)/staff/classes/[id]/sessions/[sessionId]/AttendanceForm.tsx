"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveAttendanceAction } from "@/lib/classes/actions";
import type { AttendanceStatus } from "@/lib/types";

const STATUS_OPTIONS: { value: AttendanceStatus; label: string; color: string }[] = [
  { value: "PRESENT",  label: "Có mặt",    color: "text-green-700 bg-green-100" },
  { value: "LATE",     label: "Đến muộn",  color: "text-yellow-700 bg-yellow-100" },
  { value: "EXCUSED",  label: "Vắng phép", color: "text-blue-700 bg-blue-100" },
  { value: "ABSENT",   label: "Vắng mặt",  color: "text-red-700 bg-red-100" },
];

interface StudentRow {
  studentId: string;
  studentName: string | null;
  email: string;
  status: AttendanceStatus;
  note: string;
}

interface Props {
  sessionId: string;
  classId: string;
  students: StudentRow[];
}

export function AttendanceForm({ sessionId, classId, students: initial }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [rows, setRows] = useState<StudentRow[]>(initial);

  function setRowStatus(studentId: string, status: AttendanceStatus) {
    setRows((prev) =>
      prev.map((r) => (r.studentId === studentId ? { ...r, status } : r))
    );
  }
  function setRowNote(studentId: string, note: string) {
    setRows((prev) =>
      prev.map((r) => (r.studentId === studentId ? { ...r, note } : r))
    );
  }

  function markAll(status: AttendanceStatus) {
    setRows((prev) => prev.map((r) => ({ ...r, status })));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const records = rows.map((r) => ({
        studentId: r.studentId,
        status: r.status,
        note: r.note,
      }));
      const res = await saveAttendanceAction(sessionId, records);
      if (res.error) {
        setError(res.error);
        return;
      }
      router.push(`/staff/classes/${classId}`);
    });
  }

  const presentCount = rows.filter((r) => r.status === "PRESENT" || r.status === "LATE").length;

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {/* Quick mark all */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs text-gray-500 mr-1">Điểm danh tất cả:</span>
        {STATUS_OPTIONS.map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => markAll(s.value)}
            className={`px-3 py-1 text-xs rounded-full font-medium ${s.color} transition-opacity hover:opacity-80`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">
                Học sinh
              </th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">
                Trạng thái
              </th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">
                Ghi chú
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.map((row) => (
              <tr key={row.studentId} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-800">{row.studentName ?? row.email}</p>
                  <p className="text-xs text-gray-400">{row.email}</p>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1.5 flex-wrap">
                    {STATUS_OPTIONS.map((s) => (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => setRowStatus(row.studentId, s.value)}
                        className={`px-3 py-1 text-xs rounded-full font-medium border transition-all ${
                          row.status === s.value
                            ? `${s.color} border-current opacity-100 ring-1 ring-current`
                            : "border-gray-200 text-gray-400 hover:border-gray-300"
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <input
                    type="text"
                    value={row.note}
                    onChange={(e) => setRowNote(row.studentId, e.target.value)}
                    placeholder="Lý do, ghi chú..."
                    className="w-full border border-gray-200 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-4 gap-4">
        <p className="text-sm text-gray-500">
          Có mặt: <strong className="text-green-700">{presentCount}</strong> / {rows.length}
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="px-5 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            {isPending ? "Đang lưu..." : "Lưu điểm danh"}
          </button>
        </div>
      </div>
    </form>
  );
}
