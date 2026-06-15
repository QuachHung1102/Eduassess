"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  evaluateStudentLevelAction,
  getStudentSubjectReferenceAction,
  getAiLevelSuggestionAction,
  type StudentSubjectReference,
} from "@/lib/classes/actions";
import { STUDENT_LEVELS, STUDENT_LEVEL_LABEL as LEVEL_LABEL } from "@/lib/constants/labels";
import type { StudentLevel } from "@/lib/types";

type AiSuggestion = { level: StudentLevel; rationale: string };

interface Subject {
  id: string;
  name: string;
}

const LEVELS = STUDENT_LEVELS.map((value) => ({ value, label: LEVEL_LABEL[value] }));

export function EvaluateForm({ studentId, subjects }: { studentId: string; subjects: Subject[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? "");
  const [level, setLevel] = useState<StudentLevel>("AVERAGE");
  const [note, setNote] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  // Dữ liệu tham chiếu theo môn đang chọn — lưu kèm subjectId để suy ra trạng thái tải.
  const [loaded, setLoaded] = useState<{ subjectId: string; data: StudentSubjectReference | null } | null>(null);

  useEffect(() => {
    if (!subjectId) return;
    let cancelled = false;
    getStudentSubjectReferenceAction(studentId, subjectId).then((res) => {
      if (cancelled) return;
      if ("error" in res) {
        setLoaded({ subjectId, data: null });
        return;
      }
      setLoaded({ subjectId, data: res });
      // Bán tự động: điền sẵn mức theo đề xuất; CBĐT chỉnh nếu cần.
      if (res.suggestedLevel) setLevel(res.suggestedLevel);
    });
    return () => {
      cancelled = true;
    };
  }, [studentId, subjectId]);

  const refLoading = !loaded || loaded.subjectId !== subjectId;
  const ref = refLoading ? null : loaded.data;

  // Đề xuất AI (on-demand) — gắn theo subjectId để không hiện nhầm khi đổi môn.
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<
    { subjectId: string; suggestion: AiSuggestion | null; error: string } | null
  >(null);
  const aiForCurrent = aiResult && aiResult.subjectId === subjectId ? aiResult : null;

  async function handleAiSuggest() {
    if (!subjectId) return;
    setAiLoading(true);
    const res = await getAiLevelSuggestionAction(studentId, subjectId);
    setAiLoading(false);
    setAiResult(
      "error" in res
        ? { subjectId, suggestion: null, error: res.error }
        : { subjectId, suggestion: res, error: "" },
    );
  }

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
      router.refresh(); // cập nhật "Lịch sử đánh giá" bên dưới
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

      {/* Dữ liệu tham chiếu để CBĐT quyết định mức */}
      <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5 text-xs">
        {refLoading ? (
          <p className="text-gray-400">Đang tải dữ liệu tham chiếu…</p>
        ) : !ref ? (
          <p className="text-gray-400">Chưa có dữ liệu tham chiếu cho môn này.</p>
        ) : (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="text-gray-600">
                Điểm TB:{" "}
                {ref.avgScore !== null ? (
                  <strong className="text-gray-900">{ref.avgScore.toFixed(1)}</strong>
                ) : (
                  <span className="text-gray-400">chưa có</span>
                )}
              </span>
              <span className="text-gray-600">
                Điểm danh:{" "}
                {ref.attendance.total > 0 ? (
                  <strong className="text-gray-900">
                    {ref.attendance.present}/{ref.attendance.total} (
                    {Math.round((ref.attendance.present / ref.attendance.total) * 100)}%)
                  </strong>
                ) : (
                  <span className="text-gray-400">chưa có</span>
                )}
              </span>
              {ref.suggestedLevel && (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-medium text-emerald-700">
                  Gợi ý: {LEVEL_LABEL[ref.suggestedLevel]}
                  {ref.suggestedReason ? ` (${ref.suggestedReason})` : ""} · đã điền sẵn
                </span>
              )}
            </div>
            {ref.sessionEval.count > 0 && (
              <p className="text-gray-600">
                Đánh giá buổi ({ref.sessionEval.count}):{" "}
                <span className="text-gray-900">
                  NL {ref.sessionEval.performance?.toFixed(1) ?? "—"} · CC{" "}
                  {ref.sessionEval.diligence?.toFixed(1) ?? "—"} · TT{" "}
                  {ref.sessionEval.comprehension?.toFixed(1) ?? "—"}
                </span>{" "}
                <span className="text-gray-400">(thang 5)</span>
              </p>
            )}
            {ref.attempts.length > 0 && (
              <div>
                <p className="mb-1 text-gray-500">Bài kiểm tra gần đây:</p>
                <ul className="space-y-0.5">
                  {ref.attempts.map((a, i) => (
                    <li key={i} className="flex items-center justify-between gap-2">
                      <span className="truncate text-gray-600">{a.title}</span>
                      <span className="shrink-0 font-medium text-gray-900">
                        {a.score !== null ? a.score.toFixed(0) : "—"}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Đề xuất bằng AI (on-demand) */}
      <div>
        <button
          type="button"
          onClick={handleAiSuggest}
          disabled={aiLoading || !subjectId}
          className="rounded-lg border border-indigo-200 px-3 py-1.5 text-xs font-medium text-indigo-700 transition-colors hover:bg-indigo-50 disabled:opacity-50"
        >
          {aiLoading ? "Đang phân tích…" : "✨ Phân tích bằng AI"}
        </button>
        {aiForCurrent?.error && (
          <p className="mt-1 text-xs text-red-600">{aiForCurrent.error}</p>
        )}
        {aiForCurrent?.suggestion && (
          <div className="mt-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs">
            <p className="text-gray-800">
              AI đề xuất: <strong>{LEVEL_LABEL[aiForCurrent.suggestion.level]}</strong>
            </p>
            <p className="mt-0.5 text-gray-600">{aiForCurrent.suggestion.rationale}</p>
            <button
              type="button"
              onClick={() => setLevel(aiForCurrent.suggestion!.level)}
              className="mt-1 font-medium text-indigo-700 underline"
            >
              Dùng mức này
            </button>
          </div>
        )}
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Ghi chú</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="Nhận xét, điểm mạnh/yếu..."
          className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
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
