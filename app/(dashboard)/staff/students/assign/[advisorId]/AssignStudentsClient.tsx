"use client";

import { useState, useEffect, useTransition, useRef } from "react";
import gsap from "gsap";
import { FaIcon } from "@/components/ui/FaIcon";
import {
  faSearch,
  faUserMinus,
  faUserPlus,
  faInbox,
  faChevronLeft,
  faChevronRight,
} from "@fortawesome/free-solid-svg-icons";
import {
  searchAssignableStudentsAction,
  assignStudentAdvisorAction,
  removeStudentAdvisorAction,
} from "@/lib/classes/actions";

interface StudentRow {
  id: string;
  name: string | null;
  email: string | null;
  assignedAt?: Date;
}

interface AssignableRow {
  id: string;
  name: string | null;
  email: string | null;
}

interface Props {
  advisorId: string;
  advisorName: string;
  initialAssigned: StudentRow[];
}

export function AssignStudentsClient({ advisorId, advisorName, initialAssigned }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Assigned students ─────────────────────────────────────────
  const [students, setStudents] = useState<StudentRow[]>(initialAssigned);

  // ── Search / assignable ───────────────────────────────────────
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [assignable, setAssignable] = useState<AssignableRow[]>([]);
  const [assignableTotal, setAssignableTotal] = useState(0);
  const [assignableHasMore, setAssignableHasMore] = useState(false);
  const [isLoadingAssignable, setIsLoadingAssignable] = useState(true);

  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ id: string; message: string; ok: boolean } | null>(null);

  // ── Entrance animations (useEffect = async, avoids hydration mismatch) ──────
  useEffect(() => {
    if (!containerRef.current) return;
    const ctx = gsap.context(() => {
      gsap.from(".assign-section", {
        opacity: 0,
        y: 20,
        duration: 0.4,
        stagger: 0.12,
        ease: "power2.out",
        clearProps: "transform,opacity",
      });
    }, containerRef.current);
    return () => ctx.revert();
  }, []);

  // ── Debounce search ───────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      setDebouncedSearch(search);
      setIsLoadingAssignable(true);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  // ── Load assignable students ──────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function loadAssignable() {
      const res = await searchAssignableStudentsAction(advisorId, debouncedSearch, page);
      if (cancelled) {
        return;
      }

      setAssignable(res.students);
      setAssignableTotal(res.total);
      setAssignableHasMore(res.hasMore);
      setIsLoadingAssignable(false);
    }

    void loadAssignable();

    return () => {
      cancelled = true;
    };
  }, [advisorId, debouncedSearch, page]);

  // ── Feedback ──────────────────────────────────────────────────
  function showFeedback(id: string, message: string, ok: boolean) {
    setFeedback({ id, message, ok });
    setTimeout(() => setFeedback(null), 2500);
  }

  // ── Assign ────────────────────────────────────────────────────
  function handleAssign(student: AssignableRow) {
    startTransition(async () => {
      const res = await assignStudentAdvisorAction(student.id, advisorId);
      if (res.error) { showFeedback(student.id, res.error, false); return; }

      // Optimistic: move assignable → assigned
      setStudents((prev) => [
        { id: student.id, name: student.name, email: student.email, assignedAt: new Date() },
        ...prev,
      ]);
      setAssignable((prev) => prev.filter((s) => s.id !== student.id));
      setAssignableTotal((t) => t - 1);
      showFeedback(student.id, `Đã phân ${student.name ?? student.email} cho ${advisorName}`, true);
    });
  }

  // ── Remove ────────────────────────────────────────────────────
  function handleRemove(student: StudentRow) {
    startTransition(async () => {
      const res = await removeStudentAdvisorAction(student.id, advisorId);
      if (res.error) { showFeedback(student.id, res.error, false); return; }

      // Optimistic: move assigned → assignable
      setStudents((prev) => prev.filter((s) => s.id !== student.id));
      setAssignable((prev) => [
        { id: student.id, name: student.name, email: student.email },
        ...prev,
      ]);
      setAssignableTotal((t) => t + 1);
      showFeedback(student.id, `Đã gỡ ${student.name ?? student.email}`, true);
    });
  }

  // ── Render ────────────────────────────────────────────────────
  return (
    <div ref={containerRef} className="flex flex-col gap-4">

      {/* Global feedback toast */}
      {feedback && (
        <div
          className={`text-sm px-4 py-3 rounded-xl font-medium transition-all ${
            feedback.ok ? "text-green-700" : "text-red-700"
          }`}
          style={{
            background: feedback.ok
              ? "color-mix(in srgb, #16a34a 10%, var(--surface))"
              : "color-mix(in srgb, #dc2626 10%, var(--surface))",
            border: `1px solid ${feedback.ok ? "color-mix(in srgb, #16a34a 25%, transparent)" : "color-mix(in srgb, #dc2626 25%, transparent)"}`,
          }}
        >
          {feedback.ok ? "✓" : "✗"} {feedback.message}
        </div>
      )}

      {/* ── Section A: Học sinh đang phụ trách ── */}
      <div className="assign-section primary-panel overflow-hidden">
        <div
          className="px-5 py-3 flex items-center justify-between"
          style={{ borderBottom: "1px solid var(--border-soft)" }}
        >
          <h2 className="font-semibold text-sm" style={{ color: "var(--foreground)" }}>
            Học sinh đang phụ trách
          </h2>
          <span
            className="text-xs font-bold px-2 py-0.5 rounded-full"
            style={{
              background: "color-mix(in srgb, var(--primary) 12%, var(--surface))",
              color: "var(--primary)",
            }}
          >
            {students.length}
          </span>
        </div>

        {students.length === 0 ? (
          <EmptyState message={`${advisorName} chưa phụ trách học sinh nào`} />
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--border-soft)" }}>
            {students.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between px-5 py-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                    {s.name ?? s.email}
                  </div>
                  <div className="text-xs mt-0.5 truncate" style={{ color: "color-mix(in srgb, var(--foreground) 50%, transparent)" }}>
                    {s.email}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemove(s)}
                  disabled={isPending}
                  title={`Gỡ ${s.name ?? s.email} khỏi ${advisorName}`}
                  className="flex-shrink-0 ml-4 flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors focus-ring-soft state-disabled"
                  style={{
                    color: "#dc2626",
                    border: "1px solid color-mix(in srgb, #dc2626 22%, transparent)",
                    background: "color-mix(in srgb, #dc2626 5%, transparent)",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "color-mix(in srgb, #dc2626 12%, transparent)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "color-mix(in srgb, #dc2626 5%, transparent)")}
                >
                  <FaIcon icon={faUserMinus} />
                  Gỡ
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Section B: Thêm học sinh ── */}
      <div className="assign-section primary-panel overflow-hidden">
        <div
          className="px-5 py-3 flex items-center justify-between"
          style={{ borderBottom: "1px solid var(--border-soft)" }}
        >
          <h2 className="font-semibold text-sm" style={{ color: "var(--foreground)" }}>
            Thêm học sinh cho {advisorName}
          </h2>
          <span
            className="text-xs font-bold px-2 py-0.5 rounded-full"
            style={{
              background: "color-mix(in srgb, var(--foreground) 8%, var(--surface))",
              color: "color-mix(in srgb, var(--foreground) 60%, transparent)",
            }}
          >
            {assignableTotal} chưa được phân
          </span>
        </div>

        {/* Search bar */}
        <div className="px-5 py-3" style={{ borderBottom: "1px solid var(--border-soft)" }}>
          <div className="relative">
            <span
              className="absolute left-3 top-1/2 -translate-y-1/2 text-xs pointer-events-none"
              style={{ color: "color-mix(in srgb, var(--foreground) 40%, transparent)" }}
            >
              <FaIcon icon={faSearch} />
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên hoặc email học sinh..."
              className="w-full pl-8 pr-3 py-2 text-sm rounded-lg focus-ring-soft"
              style={{
                border: "1px solid var(--border-soft)",
                background: "var(--surface)",
                color: "var(--foreground)",
              }}
            />
          </div>
        </div>

        {/* Assignable list */}
        {isLoadingAssignable ? (
          <LoadingRows count={5} />
        ) : assignable.length === 0 ? (
          <EmptyState
            message={
              debouncedSearch
                ? `Không tìm thấy học sinh phù hợp với "${debouncedSearch}"`
                : "Tất cả học sinh đã được phân cho CBDT này rồi"
            }
          />
        ) : (
          <>
            <div className="divide-y" style={{ borderColor: "var(--border-soft)" }}>
              {assignable.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between px-5 py-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                      {s.name ?? s.email}
                    </div>
                    <div className="text-xs mt-0.5 truncate" style={{ color: "color-mix(in srgb, var(--foreground) 50%, transparent)" }}>
                      {s.email}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAssign(s)}
                    disabled={isPending}
                    title={`Phân ${s.name ?? s.email} cho ${advisorName}`}
                    className="flex-shrink-0 ml-4 flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors focus-ring-soft state-disabled"
                    style={{
                      color: "var(--primary)",
                      border: "1px solid color-mix(in srgb, var(--primary) 30%, transparent)",
                      background: "color-mix(in srgb, var(--primary) 6%, transparent)",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "color-mix(in srgb, var(--primary) 14%, transparent)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "color-mix(in srgb, var(--primary) 6%, transparent)")}
                  >
                    <FaIcon icon={faUserPlus} />
                    Phân công
                  </button>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {(page > 1 || assignableHasMore) && (
              <div
                className="flex items-center justify-between px-5 py-3"
                style={{ borderTop: "1px solid var(--border-soft)" }}
              >
                <span className="text-xs" style={{ color: "color-mix(in srgb, var(--foreground) 45%, transparent)" }}>
                  Trang {page} · {assignableTotal} học sinh chưa được phân
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsLoadingAssignable(true);
                      setPage((p) => Math.max(1, p - 1));
                    }}
                    disabled={page <= 1 || isLoadingAssignable}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg focus-ring-soft state-disabled transition-colors"
                    style={{
                      border: "1px solid var(--border-soft)",
                      background: "var(--surface)",
                      color: "var(--foreground)",
                    }}
                  >
                    <FaIcon icon={faChevronLeft} />
                    Trước
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsLoadingAssignable(true);
                      setPage((p) => p + 1);
                    }}
                    disabled={!assignableHasMore || isLoadingAssignable}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg focus-ring-soft state-disabled transition-colors"
                    style={{
                      border: "1px solid var(--border-soft)",
                      background: "var(--surface)",
                      color: "var(--foreground)",
                    }}
                  >
                    Sau
                    <FaIcon icon={faChevronRight} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────

function LoadingRows({ count }: { count: number }) {
  return (
    <div className="divide-y" style={{ borderColor: "var(--border-soft)" }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center justify-between px-5 py-3">
          <div className="flex-1 space-y-2">
            <div
              className="h-3.5 rounded animate-pulse"
              style={{
                background: "color-mix(in srgb, var(--foreground) 10%, transparent)",
                width: `${45 + (i * 13) % 35}%`,
              }}
            />
            <div
              className="h-2.5 rounded animate-pulse"
              style={{
                background: "color-mix(in srgb, var(--foreground) 7%, transparent)",
                width: `${30 + (i * 17) % 25}%`,
              }}
            />
          </div>
          <div
            className="h-7 w-20 rounded-lg animate-pulse ml-4"
            style={{ background: "color-mix(in srgb, var(--foreground) 8%, transparent)" }}
          />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center py-10 gap-2"
      style={{ color: "color-mix(in srgb, var(--foreground) 40%, transparent)" }}
    >
      <span className="text-3xl opacity-40">
        <FaIcon icon={faInbox} />
      </span>
      <p className="text-sm text-center px-6">{message}</p>
    </div>
  );
}
