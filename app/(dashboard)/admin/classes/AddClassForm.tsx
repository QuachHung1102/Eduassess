"use client";

import { useState, useTransition } from "react";
import { createClassAction } from "@/lib/admin/actions";
import { FaIcon } from "@/components/ui/FaIcon";
import { faPlus } from "@fortawesome/free-solid-svg-icons";

type Grade = { id: string; gradeNumber: number };

export function AddClassForm({ grades }: { grades: Grade[] }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [gradeId, setGradeId] = useState(grades[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await createClassAction(name, gradeId);
      if (res?.error) { setError(res.error); return; }
      setName("");
      setOpen(false);
    });
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors text-white"
        style={{ background: "linear-gradient(135deg, var(--primary), var(--primary-dark))" }}
      >
        <FaIcon icon={faPlus} className="mr-1.5" /> Thêm lớp
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="rounded-xl shadow-xl p-6 w-full max-w-sm" style={{ background: "var(--surface)" }}>
            <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--foreground)" }}>Thêm lớp học</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "color-mix(in srgb, var(--foreground) 78%, transparent)" }}>Khối</label>
                <select
                  value={gradeId}
                  onChange={(e) => setGradeId(e.target.value)}
                  className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 transition-colors"
                  style={{ border: "1px solid var(--border-soft)", background: "var(--surface)", color: "var(--foreground)", outlineColor: "var(--primary)" }}
                >
                  {grades.map((g) => (
                    <option key={g.id} value={g.id}>Lớp {g.gradeNumber}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "color-mix(in srgb, var(--foreground) 78%, transparent)" }}>Tên lớp</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="VD: 10A13"
                  className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 transition-colors"
                  style={{ border: "1px solid var(--border-soft)", background: "var(--surface)", color: "var(--foreground)", outlineColor: "var(--primary)" }}
                  required
                />
              </div>
              {error && <p className="text-red-600 text-sm">{error}</p>}
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 py-2 rounded-lg text-sm font-medium transition-colors text-white disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, var(--primary), var(--primary-dark))" }}
                >
                  {isPending ? "Đang thêm..." : "Thêm lớp"}
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex-1 py-2 rounded-lg text-sm transition-colors"
                  style={{ border: "1px solid var(--border-soft)", color: "color-mix(in srgb, var(--foreground) 70%, transparent)" }}
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
