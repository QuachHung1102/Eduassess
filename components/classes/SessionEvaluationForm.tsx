"use client";

import { useState, useTransition } from "react";
import { saveSessionEvaluationsAction } from "@/lib/classes/actions/evaluation";

export interface EvalRow {
  studentId: string;
  studentName: string | null;
  email: string;
  performance: number | null;
  diligence: number | null;
  comprehension: number | null;
  note: string;
}

const DIMENSIONS = [
  { key: "performance", label: "Năng lực" },
  { key: "diligence", label: "Chuyên cần" },
  { key: "comprehension", label: "Tiếp thu" },
] as const;

type DimKey = (typeof DIMENSIONS)[number]["key"];

function ScalePicker({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => {
        const active = value === n;
        return (
          <button
            key={n}
            type="button"
            // Bấm lại giá trị đang chọn để bỏ chọn (về null).
            onClick={() => onChange(active ? null : n)}
            className={`h-6 w-6 rounded-md border text-xs font-medium transition-colors ${
              active
                ? "border-emerald-600 bg-emerald-600 text-white"
                : "border-gray-200 text-gray-400 hover:border-emerald-300"
            }`}
          >
            {n}
          </button>
        );
      })}
    </div>
  );
}

export function SessionEvaluationForm({
  sessionId,
  students,
}: {
  sessionId: string;
  students: EvalRow[];
}) {
  const [rows, setRows] = useState<EvalRow[]>(students);
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  function setDim(studentId: string, dim: DimKey, v: number | null) {
    setRows((prev) => prev.map((r) => (r.studentId === studentId ? { ...r, [dim]: v } : r)));
  }
  function setNote(studentId: string, note: string) {
    setRows((prev) => prev.map((r) => (r.studentId === studentId ? { ...r, note } : r)));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    startTransition(async () => {
      const res = await saveSessionEvaluationsAction(
        sessionId,
        rows.map((r) => ({
          studentId: r.studentId,
          performance: r.performance,
          diligence: r.diligence,
          comprehension: r.comprehension,
          note: r.note,
        })),
      );
      if ("error" in res) setMsg({ type: "error", text: res.error });
      else setMsg({ type: "success", text: "Đã lưu đánh giá buổi học." });
    });
  }

  const ratedCount = rows.filter(
    (r) => r.performance || r.diligence || r.comprehension || r.note.trim(),
  ).length;

  return (
    <form onSubmit={handleSubmit}>
      <p className="mb-3 text-xs text-gray-500">
        Thang 1–5 (1 = thấp, 5 = cao) cho mỗi chiều. Bỏ trống nếu không đánh giá; bấm lại số đang
        chọn để xóa. Dữ liệu này hỗ trợ CBĐT đánh giá năng lực môn chính xác hơn.
      </p>

      <div className="rounded-xl border border-gray-100 bg-white shadow-sm divide-y divide-gray-50">
        {rows.map((row) => (
          <div key={row.studentId} className="px-4 py-3">
            <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
              <div className="min-w-40">
                <p className="text-sm font-medium text-gray-800">{row.studentName ?? row.email}</p>
                <p className="text-xs text-gray-400">{row.email}</p>
              </div>
              <div className="flex flex-col gap-1.5">
                {DIMENSIONS.map((d) => (
                  <div key={d.key} className="flex items-center gap-2">
                    <span className="w-20 text-xs text-gray-500">{d.label}</span>
                    <ScalePicker
                      value={row[d.key]}
                      onChange={(v) => setDim(row.studentId, d.key, v)}
                    />
                  </div>
                ))}
              </div>
            </div>
            <input
              type="text"
              value={row.note}
              onChange={(e) => setNote(row.studentId, e.target.value)}
              placeholder="Ghi chú (tuỳ chọn)…"
              className="mt-2 w-full rounded-md border border-gray-200 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between gap-4">
        <div className="text-sm">
          {msg ? (
            <span className={msg.type === "success" ? "text-emerald-700" : "text-red-600"}>
              {msg.text}
            </span>
          ) : (
            <span className="text-gray-500">Đã đánh giá {ratedCount}/{rows.length}</span>
          )}
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
        >
          {isPending ? "Đang lưu…" : "Lưu đánh giá"}
        </button>
      </div>
    </form>
  );
}
