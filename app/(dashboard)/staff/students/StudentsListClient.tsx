"use client";

import { useState } from "react";
import Link from "next/link";
import { STUDENT_LEVEL_LABEL as LEVEL_LABEL, STUDENT_LEVEL_COLOR as LEVEL_COLOR } from "@/lib/constants/labels";

type StudentCard = {
  id: string;
  name: string;
  email: string;
  code: string | null;
  activeCount: number;
  levels: { subjectId: string; subjectName: string; level: string }[];
};

export function StudentsListClient({ students }: { students: StudentCard[] }) {
  const [q, setQ] = useState("");
  const query = q.toLowerCase().trim();
  const filtered = query
    ? students.filter(
        (s) =>
          s.name.toLowerCase().includes(query) ||
          s.email.toLowerCase().includes(query) ||
          (s.code ? s.code.toLowerCase().includes(query) : false),
      )
    : students;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Tìm theo tên, email hoặc mã…"
        className="w-full rounded-lg border border-soft bg-surface-strong px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary sm:w-80"
      />
      {query && <p className="text-xs text-foreground/45">{filtered.length} / {students.length} học sinh khớp</p>}
      {filtered.length === 0 ? (
        <p className="py-10 text-center text-sm text-foreground/45">Không có học sinh nào khớp.</p>
      ) : (
        <div className="flex-1 overflow-auto">
          <div className="grid grid-cols-1 gap-4 pb-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((s) => (
              <Link key={s.id} href={`/staff/students/${s.id}`} className="clay-card hover-card-soft press-feedback-soft group p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary">{s.name?.[0]?.toUpperCase() ?? "?"}</div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-foreground">{s.name}</p>
                    <p className="truncate text-xs text-foreground/60">{s.email}</p>
                    {s.code && <p className="truncate font-mono text-[11px] text-foreground/45">{s.code}</p>}
                  </div>
                </div>
                {s.levels.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {s.levels.map((l) => (
                      <span
                        key={l.subjectId}
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${LEVEL_COLOR[l.level] ?? "bg-gray-100 text-gray-600"}`}
                        title={`${l.subjectName}: ${LEVEL_LABEL[l.level]}`}
                      >
                        {l.subjectName}: {LEVEL_LABEL[l.level]}
                      </span>
                    ))}
                  </div>
                )}
                <p className="mt-3 text-xs text-foreground/60">{s.activeCount > 0 ? `Đang học ${s.activeCount} lớp` : "Chưa có lớp"}</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
