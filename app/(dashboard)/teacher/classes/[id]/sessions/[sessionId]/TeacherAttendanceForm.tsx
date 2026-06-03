"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveAttendanceAction } from "@/lib/classes/actions";
import type { AttendanceStatus } from "@/lib/types";

const STATUS_OPTIONS: { value: AttendanceStatus; label: string; color: string }[] = [
  { value: "PRESENT",  label: "Có mặt",    color: "text-green-700 bg-green-100 border-green-200" },
  { value: "LATE",     label: "Đến muộn",  color: "text-yellow-700 bg-yellow-100 border-yellow-200" },
  { value: "EXCUSED",  label: "Vắng phép", color: "text-blue-700 bg-blue-100 border-blue-200" },
  { value: "ABSENT",   label: "Vắng mặt",  color: "text-red-700 bg-red-100 border-red-200" },
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
  students: StudentRow[];
  redirectPath: string;
}

export function TeacherAttendanceForm({ sessionId, students: initial, redirectPath }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [rows, setRows] = useState<StudentRow[]>(initial);

  function setRowStatus(studentId: string, status: AttendanceStatus) {
    setRows((prev) => prev.map((r) => (r.studentId === studentId ? { ...r, status } : r)));
  }
  function setRowNote(studentId: string, note: string) {
    setRows((prev) => prev.map((r) => (r.studentId === studentId ? { ...r, note } : r)));
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
      router.push(redirectPath);
    });
  }

  const presentCount = rows.filter((r) => r.status === "PRESENT" || r.status === "LATE").length;

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl mb-4">
          {error}
        </div>
      )}

      {/* Quick mark all */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <span className="text-xs" style={{ color: "color-mix(in srgb, var(--foreground) 55%, transparent)" }}>
          Điểm danh tất cả:
        </span>
        {STATUS_OPTIONS.map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => markAll(s.value)}
            className={`px-3 py-1 text-xs rounded-full font-medium border transition-opacity hover:opacity-80 ${s.color}`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="primary-panel overflow-hidden">
        {/* Desktop */}
        <div className="hidden md:block overflow-x-auto">
          <table className="themed-table w-full text-sm">
            <thead>
              <tr>
                {["#", "Học sinh", "Trạng thái", "Ghi chú"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: "var(--border-soft)" }}>
              {rows.map((row, idx) => (
                <tr key={row.studentId}>
                  <td className="px-4 py-3 text-xs w-8" style={{ color: "color-mix(in srgb, var(--foreground) 40%, transparent)" }}>
                    {idx + 1}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium" style={{ color: "var(--foreground)" }}>{row.studentName ?? row.email}</p>
                    <p className="text-xs" style={{ color: "color-mix(in srgb, var(--foreground) 50%, transparent)" }}>{row.email}</p>
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
                              ? `${s.color} ring-1 ring-current`
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
                      placeholder="Ghi chú (tuỳ chọn)"
                      className="w-full rounded-lg px-2.5 py-1.5 text-xs focus-ring-soft"
                      style={{
                        border: "1px solid var(--border-soft)",
                        background: "var(--surface)",
                        color: "var(--foreground)",
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile */}
        <div className="md:hidden divide-y" style={{ borderColor: "var(--border-soft)" }}>
          {rows.map((row) => (
            <div key={row.studentId} className="px-4 py-3">
              <p className="font-medium text-sm mb-2" style={{ color: "var(--foreground)" }}>
                {row.studentName ?? row.email}
              </p>
              <div className="flex gap-1.5 flex-wrap mb-2">
                {STATUS_OPTIONS.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setRowStatus(row.studentId, s.value)}
                    className={`px-2.5 py-1 text-xs rounded-full font-medium border transition-all ${
                      row.status === s.value
                        ? `${s.color} ring-1 ring-current`
                        : "border-gray-200 text-gray-400 hover:border-gray-300"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={row.note}
                onChange={(e) => setRowNote(row.studentId, e.target.value)}
                placeholder="Ghi chú (tuỳ chọn)"
                className="w-full rounded-lg px-2.5 py-1.5 text-xs focus-ring-soft"
                style={{
                  border: "1px solid var(--border-soft)",
                  background: "var(--surface)",
                  color: "var(--foreground)",
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-5 gap-4 flex-wrap">
        <p className="text-sm" style={{ color: "color-mix(in srgb, var(--foreground) 60%, transparent)" }}>
          Có mặt:{" "}
          <strong className="text-green-700">{presentCount}</strong>
          {" "}/ {rows.length}
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 text-sm rounded-lg hover-action-subtle focus-ring-soft press-feedback-soft"
            style={{ border: "1px solid var(--border-soft)", color: "var(--foreground)" }}
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={isPending}
            aria-busy={isPending}
            className="primary-button focus-ring-strong press-feedback-inset state-disabled px-5 py-2 text-sm"
          >
            {isPending ? "Đang lưu…" : "Lưu điểm danh"}
          </button>
        </div>
      </div>
    </form>
  );
}
