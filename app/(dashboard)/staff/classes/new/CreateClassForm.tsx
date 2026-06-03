"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClassAction, getSuggestedStudentsAction } from "@/lib/classes/actions";
import { FaIcon } from "@/components/ui/FaIcon";
import { faUserCheck, faSpinner } from "@fortawesome/free-solid-svg-icons";
import type { ClassMode, StudentLevel } from "@/lib/types";

interface Props {
  subjects: { id: string; name: string }[];
}

const MODES: { value: ClassMode; label: string }[] = [
  { value: "OFFLINE", label: "Offline (táº¡i trung tÃ¢m)" },
  { value: "ONLINE", label: "Online" },
  { value: "HYBRID", label: "Hybrid (káº¿t há»£p)" },
];

const LEVELS: { value: StudentLevel; label: string }[] = [
  { value: "WEAK", label: "Yáº¿u" },
  { value: "AVERAGE", label: "Trung bÃ¬nh" },
  { value: "GOOD", label: "KhÃ¡ / Giá»i" },
];

interface SuggestedStudent {
  id: string;
  name: string | null;
  email: string | null;
  level: string;
  activeClassCount: number;
}

export function CreateClassForm({ subjects }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [mode, setMode] = useState<ClassMode>("OFFLINE");
  const [targetLevel, setTargetLevel] = useState<StudentLevel>("AVERAGE");
  const [sessionCount, setSessionCount] = useState(0);
  const [note, setNote] = useState("");

  // Suggested students state
  const [suggested, setSuggested] = useState<SuggestedStudent[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const loadSuggestions = useCallback(async (sid: string, lvl: string) => {
    if (!sid || !lvl) { setSuggested([]); return; }
    setLoadingSuggestions(true);
    try {
      const res = await getSuggestedStudentsAction(sid, lvl);
      setSuggested(res.students);
    } finally {
      setLoadingSuggestions(false);
    }
  }, []);

  useEffect(() => {
    loadSuggestions(subjectId, targetLevel);
  }, [subjectId, targetLevel, loadSuggestions]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const res = await createClassAction({ name, subjectId, mode, targetLevel, sessionCount, note });
      if (res.error) {
        setError(res.error);
        return;
      }
      router.push(`/staff/classes/${res.classId}`);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          TÃªn lá»›p <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="VD: ToÃ¡n 10 â€“ NhÃ³m A"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          MÃ´n há»c <span className="text-red-500">*</span>
        </label>
        <select
          value={subjectId}
          onChange={(e) => setSubjectId(e.target.value)}
          required
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">-- Chá»n mÃ´n há»c --</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">HÃ¬nh thá»©c</label>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as ClassMode)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {MODES.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">NÄƒng lá»±c má»¥c tiÃªu</label>
          <select
            value={targetLevel}
            onChange={(e) => setTargetLevel(e.target.value as StudentLevel)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {LEVELS.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Suggested students */}
      {subjectId && (
        <div className="primary-panel p-4">
          <div className="flex items-center gap-2 mb-2">
            <span style={{ color: "var(--primary)" }}><FaIcon icon={faUserCheck} /></span>
            <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
              Há»c sinh phÃ¹ há»£p
            </span>
            {loadingSuggestions && (
              <span className="text-xs" style={{ color: "color-mix(in srgb, var(--foreground) 45%, transparent)" }}>
                <FaIcon icon={faSpinner} className="animate-spin" />
              </span>
            )}
            {!loadingSuggestions && (
              <span className="text-xs ml-auto" style={{ color: "color-mix(in srgb, var(--foreground) 45%, transparent)" }}>
                {suggested.length} há»c sinh Ä‘Ã£ Ä‘Æ°á»£c Ä‘Ã¡nh giÃ¡ trÃ¬nh Ä‘á»™ &quot;{LEVELS.find((l) => l.value === targetLevel)?.label}&quot;
              </span>
            )}
          </div>
          {!loadingSuggestions && suggested.length === 0 ? (
            <p className="text-xs" style={{ color: "color-mix(in srgb, var(--foreground) 45%, transparent)" }}>
              ChÆ°a cÃ³ há»c sinh nÃ o Ä‘Æ°á»£c Ä‘Ã¡nh giÃ¡ trÃ¬nh Ä‘á»™ nÃ y cho mÃ´n Ä‘Ã£ chá»n.
            </p>
          ) : (
            <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
              {suggested.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between text-xs px-2 py-1.5 rounded-md"
                  style={{ background: "color-mix(in srgb, var(--primary) 5%, var(--surface))" }}
                >
                  <span style={{ color: "var(--foreground)" }}>{s.name ?? s.email}</span>
                  {s.activeClassCount > 0 && (
                    <span
                      className="ml-2 px-1.5 py-0.5 rounded-full text-xs"
                      style={{
                        background: "color-mix(in srgb, var(--primary) 12%, var(--surface))",
                        color: "var(--primary)",
                      }}
                    >
                      {s.activeClassCount} lá»›p
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Sá»‘ buá»•i dá»± kiáº¿n
          <span className="ml-1 text-xs text-gray-400">(0 = chÆ°a xÃ¡c Ä‘á»‹nh)</span>
        </label>
        <input
          type="number"
          min={0}
          value={sessionCount}
          onChange={(e) => setSessionCount(parseInt(e.target.value) || 0)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chÃº</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="Má»¥c tiÃªu lá»›p, yÃªu cáº§u Ä‘áº§u vÃ o, ..."
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
        />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Há»§y
        </button>
        <button
          type="submit"
          disabled={isPending || !name.trim() || !subjectId}
          className="px-5 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
        >
          {isPending ? "Äang táº¡o..." : "Táº¡o lá»›p"}
        </button>
      </div>
    </form>
  );
}
