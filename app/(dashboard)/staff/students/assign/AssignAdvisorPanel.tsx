"use client";

import { useState, useTransition, useMemo } from "react";
import { assignStudentAdvisorAction, removeStudentAdvisorAction } from "@/lib/classes/actions";
import { FaIcon } from "@/components/ui/FaIcon";
import {
  faSearch,
  faUserPlus,
  faUserMinus,
  faChevronDown,
  faChevronUp,
} from "@fortawesome/free-solid-svg-icons";

interface Advisor {
  id: string;
  name: string | null;
  email: string | null;
  staffPosition: string | null;
  _count: { advisorStudents: number };
}

interface Student {
  id: string;
  name: string | null;
  email: string | null;
  studentAdvisees: { advisorId: string; advisor: { id: string; name: string | null } }[];
}

interface Props {
  students: Student[];
  advisors: Advisor[];
}

export function AssignAdvisorPanel({ students, advisors }: Props) {
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [filterAdvisor, setFilterAdvisor] = useState("");
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ id: string; message: string; ok: boolean } | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return students.filter((s) => {
      const matchSearch = !q || s.name?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q);
      const matchAdvisor =
        !filterAdvisor ||
        (filterAdvisor === "__none__"
          ? s.studentAdvisees.length === 0
          : s.studentAdvisees.some((a) => a.advisorId === filterAdvisor));
      return matchSearch && matchAdvisor;
    });
  }, [students, search, filterAdvisor]);

  function showFeedback(id: string, message: string, ok: boolean) {
    setFeedback({ id, message, ok });
    setTimeout(() => setFeedback(null), 2500);
  }

  function assign(studentId: string, advisorId: string) {
    startTransition(async () => {
      const res = await assignStudentAdvisorAction(studentId, advisorId);
      showFeedback(studentId, res.error ?? "Đã phân công", !res.error);
    });
  }

  function remove(studentId: string, advisorId: string) {
    startTransition(async () => {
      const res = await removeStudentAdvisorAction(studentId, advisorId);
      showFeedback(studentId, res.error ?? "Đã gỡ phân công", !res.error);
    });
  }

  const unassigned = students.filter((s) => s.studentAdvisees.length === 0).length;

  return (
    <div className="flex flex-col gap-4">
      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-3">
        <div className="primary-panel p-3 text-center">
          <div className="text-xl font-bold" style={{ color: "var(--foreground)" }}>{students.length}</div>
          <div className="text-xs mt-0.5" style={{ color: "color-mix(in srgb, var(--foreground) 55%, transparent)" }}>Tổng học sinh</div>
        </div>
        <div className="primary-panel p-3 text-center">
          <div className="text-xl font-bold text-green-600">{students.length - unassigned}</div>
          <div className="text-xs mt-0.5" style={{ color: "color-mix(in srgb, var(--foreground) 55%, transparent)" }}>Đã phân công</div>
        </div>
        <div className="primary-panel p-3 text-center">
          <div className="text-xl font-bold text-amber-600">{unassigned}</div>
          <div className="text-xs mt-0.5" style={{ color: "color-mix(in srgb, var(--foreground) 55%, transparent)" }}>Chưa phân</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: "color-mix(in srgb, var(--foreground) 40%, transparent)" }}>
            <FaIcon icon={faSearch} />
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm học sinh..."
            className="w-full pl-8 pr-3 py-2 text-sm rounded-lg focus-ring-soft"
            style={{
              border: "1px solid var(--border-soft)",
              background: "var(--surface)",
              color: "var(--foreground)",
            }}
          />
        </div>
        <select
          value={filterAdvisor}
          onChange={(e) => setFilterAdvisor(e.target.value)}
          className="px-3 py-2 text-sm rounded-lg focus-ring-soft"
          style={{
            border: "1px solid var(--border-soft)",
            background: "var(--surface)",
            color: "var(--foreground)",
          }}
        >
          <option value="">Tất cả CBDT</option>
          <option value="__none__">Chưa có CBDT</option>
          {advisors.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name ?? a.email} ({a._count.advisorStudents})
            </option>
          ))}
        </select>
      </div>

      {/* Student list */}
      <div className="primary-panel overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-sm" style={{ color: "color-mix(in srgb, var(--foreground) 45%, transparent)" }}>
            Không tìm thấy học sinh nào
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--border-soft)" }}>
            {filtered.map((student) => {
              const isExpanded = expandedStudent === student.id;
              const fb = feedback?.id === student.id ? feedback : null;
              const currentAdvisors = student.studentAdvisees;
              const availableAdvisors = advisors.filter(
                (a) => !currentAdvisors.some((ca) => ca.advisorId === a.id)
              );

              return (
                <div key={student.id}>
                  <button
                    type="button"
                    className="w-full flex items-center justify-between px-4 py-3 text-left hover-action-subtle focus-ring-soft transition-colors"
                    onClick={() => setExpandedStudent(isExpanded ? null : student.id)}
                    disabled={isPending}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm" style={{ color: "var(--foreground)" }}>
                          {student.name ?? student.email}
                        </span>
                        {currentAdvisors.length === 0 ? (
                          <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
                            Chưa phân
                          </span>
                        ) : (
                          <span className="text-xs px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
                            {currentAdvisors.map((a) => a.advisor.name).join(", ")}
                          </span>
                        )}
                        {fb && (
                          <span className={`text-xs font-medium ${fb.ok ? "text-green-600" : "text-red-600"}`}>
                            {fb.ok ? "✓" : "✗"} {fb.message}
                          </span>
                        )}
                      </div>
                      <p className="text-xs mt-0.5" style={{ color: "color-mix(in srgb, var(--foreground) 50%, transparent)" }}>
                        {student.email}
                      </p>
                    </div>
                    <span style={{ color: "color-mix(in srgb, var(--foreground) 40%, transparent)" }}>
                      <FaIcon icon={isExpanded ? faChevronUp : faChevronDown} className="text-xs" />
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 pt-1" style={{ background: "color-mix(in srgb, var(--primary) 3%, var(--surface))" }}>
                      {/* Current advisors */}
                      {currentAdvisors.length > 0 && (
                        <div className="mb-3">
                          <p className="text-xs font-medium mb-1.5" style={{ color: "color-mix(in srgb, var(--foreground) 55%, transparent)" }}>
                            CBDT đang phụ trách:
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {currentAdvisors.map((ca) => (
                              <div
                                key={ca.advisorId}
                                className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg"
                                style={{
                                  background: "color-mix(in srgb, var(--primary) 10%, var(--surface))",
                                  border: "1px solid color-mix(in srgb, var(--primary) 20%, var(--border-soft))",
                                  color: "var(--foreground)",
                                }}
                              >
                                <span className="font-medium">{ca.advisor.name}</span>
                                <button
                                  type="button"
                                  title="Gỡ phân công"
                                  onClick={() => remove(student.id, ca.advisorId)}
                                  disabled={isPending}
                                  className="text-red-500 hover:text-red-700 ml-1 focus-ring-soft"
                                >
                                  <FaIcon icon={faUserMinus} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Add advisor */}
                      {availableAdvisors.length > 0 ? (
                        <div>
                          <p className="text-xs font-medium mb-1.5" style={{ color: "color-mix(in srgb, var(--foreground) 55%, transparent)" }}>
                            Thêm CBDT:
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {availableAdvisors.map((a) => (
                              <button
                                key={a.id}
                                type="button"
                                onClick={() => assign(student.id, a.id)}
                                disabled={isPending}
                                className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border hover-action-subtle focus-ring-soft press-feedback-soft state-disabled transition-colors"
                                style={{
                                  border: "1px solid var(--border-soft)",
                                  color: "var(--foreground)",
                                }}
                              >
                                <FaIcon icon={faUserPlus} className="text-green-600" />
                                {a.name ?? a.email}
                                <span className="text-gray-400">({a._count.advisorStudents})</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs" style={{ color: "color-mix(in srgb, var(--foreground) 45%, transparent)" }}>
                          Tất cả CBDT đã được phân cho học sinh này.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
