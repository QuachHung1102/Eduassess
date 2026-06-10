"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AVAILABILITY_DIGITAL_SLOT_META,
  AVAILABILITY_DIGITAL_TIME_SLOTS,
  AVAILABILITY_TIME_GROUPS,
} from "@/lib/availability/time-slots";
import { DAY_ORDER } from "@/lib/classes/scheduling";
import type { WeeklySlotInput } from "@/lib/classes/scheduling";
import {
  createClassWithScheduleAction,
  getScheduleEligibilityAction,
  getTeacherCellsAction,
  getRoomBusyCellsAction,
} from "@/lib/classes/actions";
import type {
  EligibleRoom,
  EligibleStudent,
  EligibleTeacher,
} from "@/lib/classes/eligibility";
import { FaIcon } from "@/components/ui/FaIcon";
import {
  faSpinner,
  faTriangleExclamation,
  faMagnifyingGlass,
  faCircleInfo,
  faCheck,
} from "@fortawesome/free-solid-svg-icons";
import type { ClassMode, DayOfWeek, StudentLevel } from "@/lib/types";

interface Props {
  subjects: { id: string; name: string }[];
  teachers: { id: string; name: string | null; email: string }[];
  rooms: { id: string; name: string; capacity: number }[];
}

const MODES: { value: ClassMode; label: string }[] = [
  { value: "OFFLINE", label: "Offline (tại trung tâm)" },
  { value: "ONLINE", label: "Online (tại nhà)" },
];

const LEVELS: { value: StudentLevel; label: string }[] = [
  { value: "WEAK", label: "Yếu" },
  { value: "AVERAGE", label: "Trung bình" },
  { value: "GOOD", label: "Khá / Giỏi" },
];

const DAY_LABEL: Record<DayOfWeek, string> = {
  MON: "T.2", TUE: "T.3", WED: "T.4", THU: "T.5", FRI: "T.6", SAT: "T.7", SUN: "CN",
};

type Priority = "none" | "teacher" | "room";

const fieldClass = "w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2";
const fieldStyle = {
  borderColor: "var(--border-soft)",
  backgroundColor: "var(--surface)",
  color: "var(--foreground)",
} as const;
const labelClass = "mb-1 block text-sm font-medium";
const labelStyle = { color: "var(--foreground)" } as const;
const mutedStyle = {
  color: "color-mix(in srgb, var(--foreground) 55%, transparent)",
} as const;

function ck(day: DayOfWeek, slot: string): string {
  return `${day}_${slot}`;
}

/** Gom các ô đã tô thành khung lịch tuần (nhập liên tiếp cùng ngày → 1 block). */
function deriveWeeklySlots(painted: Set<string>): WeeklySlotInput[] {
  const slots: WeeklySlotInput[] = [];
  for (const day of DAY_ORDER) {
    const daySlots = AVAILABILITY_DIGITAL_TIME_SLOTS.filter((s) => painted.has(ck(day, s)));
    if (daySlots.length === 0) continue;
    let groupStart = 0;
    for (let i = 1; i <= daySlots.length; i++) {
      const curIdx = i < daySlots.length ? AVAILABILITY_DIGITAL_TIME_SLOTS.indexOf(daySlots[i]) : -99;
      const prevIdx = AVAILABILITY_DIGITAL_TIME_SLOTS.indexOf(daySlots[i - 1]);
      if (i === daySlots.length || curIdx !== prevIdx + 1) {
        slots.push({
          dayOfWeek: day,
          startTime: AVAILABILITY_DIGITAL_SLOT_META[daySlots[groupStart]].start,
          endTime: AVAILABILITY_DIGITAL_SLOT_META[daySlots[i - 1]].end,
        });
        groupStart = i;
      }
    }
  }
  return slots;
}

function summarizeSlots(slots: WeeklySlotInput[]): string {
  if (slots.length === 0) return "Chưa chọn khung lịch";
  return slots
    .map((s) => `${DAY_LABEL[s.dayOfWeek]} ${s.startTime}–${s.endTime}`)
    .join(" · ");
}

interface Eligibility {
  teachers: EligibleTeacher[];
  rooms: EligibleRoom[];
  students: EligibleStudent[];
  plannedCount: number;
}

export function ClassBuilder({ subjects, teachers, rooms }: Props) {
  const router = useRouter();
  const [isSaving, startSaving] = useTransition();
  const [isFinding, startFinding] = useTransition();
  const [isConstraining, startConstraining] = useTransition();
  const [error, setError] = useState("");

  // Thông tin lớp
  const [name, setName] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [mode, setMode] = useState<ClassMode>("OFFLINE");
  const [targetLevel, setTargetLevel] = useState<StudentLevel>("AVERAGE");
  const [startDate, setStartDate] = useState("");
  const [sessionCount, setSessionCount] = useState(8);
  const [note, setNote] = useState("");

  // Lưới lịch
  const [painted, setPainted] = useState<Set<string>>(new Set());
  const [priority, setPriority] = useState<Priority>("none");
  const [priorityTeacherId, setPriorityTeacherId] = useState("");
  const [priorityRoomId, setPriorityRoomId] = useState("");
  // blockedCells = không thể tô (GV bận hoặc phòng bận theo pre-constrain)
  const [blockedCells, setBlockedCells] = useState<Set<string>>(new Set());

  // Kết quả lọc + lựa chọn
  const [eligibility, setEligibility] = useState<Eligibility | null>(null);
  const [teacherId, setTeacherId] = useState("");
  const [roomId, setRoomId] = useState("");
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [studentSearch, setStudentSearch] = useState("");

  const weeklySlots = useMemo(() => deriveWeeklySlots(painted), [painted]);
  const needsRoom = mode !== "ONLINE";

  const scheduleReady =
    weeklySlots.length > 0 && !!startDate && sessionCount > 0 && !!subjectId;

  // Bất kỳ thay đổi nào về lịch/thông tin nền ⇒ phải tìm lại danh sách khả thi.
  function invalidateEligibility() {
    setEligibility(null);
    setTeacherId("");
    setRoomId("");
    setSelectedStudents(new Set());
  }

  function toggleCell(day: DayOfWeek, slot: string) {
    const key = ck(day, slot);
    if (blockedCells.has(key)) return;
    setPainted((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    invalidateEligibility();
  }

  // ── Pre-constrain: ưu tiên GV / phòng trước ──
  function applyPriority(next: Priority, value: string) {
    setPriority(next);
    if (next === "teacher") setPriorityTeacherId(value);
    if (next === "room") setPriorityRoomId(value);

    if (next === "none" || !value) {
      setBlockedCells(new Set());
      return;
    }
    if (next === "teacher") {
      startConstraining(async () => {
        const res = await getTeacherCellsAction(value, mode);
        if ("error" in res) {
          setError(res.error);
          return;
        }
        const free = new Set(res.cells);
        // Khóa các ô GV KHÔNG rảnh.
        const blocked = new Set<string>();
        for (const day of DAY_ORDER)
          for (const slot of AVAILABILITY_DIGITAL_TIME_SLOTS)
            if (!free.has(ck(day, slot))) blocked.add(ck(day, slot));
        setBlockedCells(blocked);
        // bỏ các ô đã tô nay bị khóa
        setPainted((prev) => new Set([...prev].filter((k) => !blocked.has(k))));
        invalidateEligibility();
      });
    }
    if (next === "room") {
      if (!startDate) {
        setError("Chọn ngày bắt đầu trước khi ưu tiên phòng");
        return;
      }
      startConstraining(async () => {
        const res = await getRoomBusyCellsAction(value, startDate, Math.max(1, sessionCount));
        if ("error" in res) {
          setError(res.error);
          return;
        }
        const blocked = new Set(res.cells);
        setBlockedCells(blocked);
        setPainted((prev) => new Set([...prev].filter((k) => !blocked.has(k))));
        invalidateEligibility();
      });
    }
  }

  // ── Tìm GV/phòng/HS khả thi ──
  function handleFind() {
    setError("");
    if (!scheduleReady) {
      setError("Cần điền môn học, ngày bắt đầu, số buổi và tô khung lịch tuần");
      return;
    }
    startFinding(async () => {
      const res = await getScheduleEligibilityAction({
        weeklySlots,
        startDate,
        sessionCount,
        mode,
        subjectId,
        targetLevel,
      });
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setEligibility(res);
      // tự chọn nếu pre-constrain còn khả thi
      setTeacherId(
        priorityTeacherId && res.teachers.some((t) => t.id === priorityTeacherId)
          ? priorityTeacherId
          : "",
      );
      setRoomId(
        priorityRoomId && res.rooms.some((r) => r.id === priorityRoomId)
          ? priorityRoomId
          : "",
      );
      setSelectedStudents(new Set());
    });
  }

  function toggleStudent(id: string) {
    setSelectedStudents((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const filteredStudents = useMemo(() => {
    if (!eligibility) return [];
    const q = studentSearch.trim().toLowerCase();
    if (!q) return eligibility.students;
    return eligibility.students.filter(
      (s) =>
        (s.name ?? "").toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q),
    );
  }, [eligibility, studentSearch]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim()) return setError("Nhập tên lớp");
    if (!eligibility) return setError("Bấm \"Tìm người & phòng khả thi\" trước");
    if (!teacherId) return setError("Chọn giáo viên");
    if (needsRoom && !roomId) return setError("Chọn phòng học");

    startSaving(async () => {
      const res = await createClassWithScheduleAction({
        name,
        subjectId,
        mode,
        targetLevel,
        startDate,
        weeklySlots,
        sessionCount,
        teacherId,
        roomId: needsRoom ? roomId : undefined,
        studentIds: [...selectedStudents],
        note,
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      router.push(`/staff/classes/${res.classId}`);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <FaIcon icon={faTriangleExclamation} className="mt-0.5 text-xs" />
          <span>{error}</span>
        </div>
      )}

      {/* ── 1. Thông tin lớp ── */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide" style={mutedStyle}>
          1 · Thông tin lớp
        </h2>
        <div>
          <label className={labelClass} style={labelStyle}>
            Tên lớp <span className="text-red-500">*</span>
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="VD: Toán 10 – Nhóm A"
            className={fieldClass}
            style={fieldStyle}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass} style={labelStyle}>
              Môn học <span className="text-red-500">*</span>
            </label>
            <select
              value={subjectId}
              onChange={(e) => { setSubjectId(e.target.value); invalidateEligibility(); }}
              className={fieldClass}
              style={fieldStyle}
            >
              <option value="">-- Chọn môn --</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass} style={labelStyle}>Năng lực mục tiêu</label>
            <select
              value={targetLevel}
              onChange={(e) => { setTargetLevel(e.target.value as StudentLevel); invalidateEligibility(); }}
              className={fieldClass}
              style={fieldStyle}
            >
              {LEVELS.map((l) => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass} style={labelStyle}>Hình thức</label>
            <select
              value={mode}
              onChange={(e) => {
                setMode(e.target.value as ClassMode);
                setBlockedCells(new Set());
                setPriority("none");
                setPriorityTeacherId("");
                setPriorityRoomId("");
                invalidateEligibility();
              }}
              className={fieldClass}
              style={fieldStyle}
            >
              {MODES.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} style={labelStyle}>
                Ngày bắt đầu <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); invalidateEligibility(); }}
                className={fieldClass}
                style={fieldStyle}
              />
            </div>
            <div>
              <label className={labelClass} style={labelStyle}>Số buổi</label>
              <input
                type="number"
                min={1}
                value={sessionCount}
                onChange={(e) => { setSessionCount(parseInt(e.target.value) || 1); invalidateEligibility(); }}
                className={fieldClass}
                style={fieldStyle}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. Khung lịch tuần ── */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide" style={mutedStyle}>
            2 · Khung lịch tuần
          </h2>
          <div className="flex items-center gap-2 text-xs">
            <span style={mutedStyle}>Ưu tiên trước:</span>
            <select
              value={priority === "teacher" ? `t:${priorityTeacherId}` : priority === "room" ? `r:${priorityRoomId}` : ""}
              onChange={(e) => {
                const v = e.target.value;
                if (!v) return applyPriority("none", "");
                if (v.startsWith("t:")) return applyPriority("teacher", v.slice(2));
                return applyPriority("room", v.slice(2));
              }}
              className="rounded-lg border px-2 py-1 text-xs"
              style={fieldStyle}
            >
              <option value="">Không (chọn lịch tự do)</option>
              <optgroup label="Giáo viên (chỉ hiện ô GV rảnh)">
                {teachers.map((t) => (
                  <option key={t.id} value={`t:${t.id}`}>{t.name ?? t.email}</option>
                ))}
              </optgroup>
              {needsRoom && (
                <optgroup label="Phòng (ẩn ô phòng bận)">
                  {rooms.map((r) => (
                    <option key={r.id} value={`r:${r.id}`}>{r.name}</option>
                  ))}
                </optgroup>
              )}
            </select>
            {isConstraining && (
              <span style={mutedStyle}>
                <FaIcon icon={faSpinner} className="animate-spin" />
              </span>
            )}
          </div>
        </div>

        <p className="flex items-center gap-1.5 text-xs" style={mutedStyle}>
          <FaIcon icon={faCircleInfo} className="text-[10px]" />
          Bấm các ô để chọn khung giờ học mỗi tuần. Ô xám là bị khóa theo ưu tiên đã chọn.
        </p>

        <div className="overflow-x-auto rounded-xl themed-scrollbar" style={{ border: "1px solid var(--border-soft)" }}>
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr>
                <th className="sticky left-0 z-1 px-2 py-1.5 text-left" style={{ background: "var(--surface-strong)", color: "var(--foreground)", minWidth: 48 }}>
                  Thứ
                </th>
                {AVAILABILITY_TIME_GROUPS.map((g) => (
                  <th
                    key={g.id}
                    colSpan={g.slots.length}
                    className="px-1 py-1.5 text-center font-medium"
                    style={{ background: "var(--surface-strong)", color: "var(--muted-foreground, #6b7280)", borderLeft: "1px solid var(--border-soft)" }}
                  >
                    {g.label}
                  </th>
                ))}
              </tr>
              <tr>
                <th className="sticky left-0 z-1 px-2 py-1" style={{ background: "var(--surface-strong)" }} />
                {AVAILABILITY_DIGITAL_TIME_SLOTS.map((s) => (
                  <th
                    key={s}
                    className="px-1 py-1 text-center font-normal"
                    style={{ background: "var(--surface-strong)", color: "var(--muted-foreground, #9ca3af)", minWidth: 30 }}
                    title={`${AVAILABILITY_DIGITAL_SLOT_META[s].start}–${AVAILABILITY_DIGITAL_SLOT_META[s].end}`}
                  >
                    {AVAILABILITY_DIGITAL_SLOT_META[s].start.slice(0, 2)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DAY_ORDER.map((day) => (
                <tr key={day} style={{ borderTop: "1px solid var(--border-soft)" }}>
                  <td className="sticky left-0 z-1 px-2 py-1 font-medium" style={{ background: "var(--surface)", color: "var(--foreground)" }}>
                    {DAY_LABEL[day]}
                  </td>
                  {AVAILABILITY_DIGITAL_TIME_SLOTS.map((slot) => {
                    const key = ck(day, slot);
                    const isPainted = painted.has(key);
                    const isBlocked = blockedCells.has(key);
                    let bg = "var(--surface)";
                    if (isPainted) bg = "var(--primary)";
                    else if (isBlocked) bg = "#e5e7eb";
                    return (
                      <td key={slot} className="p-0" style={{ borderLeft: "1px solid var(--border-soft)", height: 28 }}>
                        <button
                          type="button"
                          onClick={() => toggleCell(day, slot)}
                          disabled={isBlocked}
                          className="block h-full w-full transition-colors"
                          style={{ background: bg, cursor: isBlocked ? "not-allowed" : "pointer", minHeight: 28 }}
                          title={isBlocked ? "Bị khóa theo ưu tiên" : `${DAY_LABEL[day]} ${AVAILABILITY_DIGITAL_SLOT_META[slot].start}`}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-lg px-3 py-2 text-xs" style={{ background: "var(--surface-strong)", color: "var(--foreground)" }}>
          <strong>{summarizeSlots(weeklySlots)}</strong>
          {weeklySlots.length > 0 && startDate && (
            <span style={mutedStyle}> · {sessionCount} buổi từ {startDate}</span>
          )}
        </div>

        <button
          type="button"
          onClick={handleFind}
          disabled={isFinding || !scheduleReady}
          suppressHydrationWarning
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50"
          style={{ background: "var(--primary)" }}
        >
          {isFinding ? <FaIcon icon={faSpinner} className="animate-spin" /> : <FaIcon icon={faMagnifyingGlass} />}
          Tìm người &amp; phòng khả thi
        </button>
      </section>

      {/* ── 3. Phân công ── */}
      {eligibility && (
        <section className="space-y-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide" style={mutedStyle}>
            3 · Phân công ({eligibility.plannedCount} buổi)
          </h2>

          {/* Giáo viên */}
          <div>
            <label className={labelClass} style={labelStyle}>
              Giáo viên khả thi ({eligibility.teachers.length}) <span className="text-red-500">*</span>
            </label>
            {eligibility.teachers.length === 0 ? (
              <p className="text-xs text-red-500">Không có giáo viên nào rảnh toàn bộ khung lịch này.</p>
            ) : (
              <select value={teacherId} onChange={(e) => setTeacherId(e.target.value)} className={fieldClass} style={fieldStyle}>
                <option value="">-- Chọn giáo viên --</option>
                {eligibility.teachers.map((t) => (
                  <option key={t.id} value={t.id}>{t.name ?? t.email}</option>
                ))}
              </select>
            )}
          </div>

          {/* Phòng */}
          {needsRoom && (
            <div>
              <label className={labelClass} style={labelStyle}>
                Phòng khả thi ({eligibility.rooms.length}) <span className="text-red-500">*</span>
              </label>
              {eligibility.rooms.length === 0 ? (
                <p className="text-xs text-red-500">Không có phòng nào trống cho toàn bộ buổi.</p>
              ) : (
                <select value={roomId} onChange={(e) => setRoomId(e.target.value)} className={fieldClass} style={fieldStyle}>
                  <option value="">-- Chọn phòng --</option>
                  {eligibility.rooms.map((r) => (
                    <option key={r.id} value={r.id}>{r.name} (sức chứa {r.capacity})</option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Học sinh */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className={labelClass} style={labelStyle}>
                Học sinh khả thi ({eligibility.students.length}) · đã chọn {selectedStudents.size}
              </label>
            </div>
            {eligibility.students.length === 0 ? (
              <p className="text-xs" style={mutedStyle}>
                Không có học sinh nào đúng môn/năng lực và rảnh khung lịch này. Có thể thêm sau.
              </p>
            ) : (
              <div className="rounded-lg" style={{ border: "1px solid var(--border-soft)" }}>
                <div className="border-b p-2" style={{ borderColor: "var(--border-soft)" }}>
                  <div className="flex items-center gap-2 rounded-md px-2 py-1.5" style={{ background: "var(--surface-strong)" }}>
                    <span style={mutedStyle}>
                      <FaIcon icon={faMagnifyingGlass} className="text-xs" />
                    </span>
                    <input
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      placeholder="Tìm theo tên / email"
                      className="w-full bg-transparent text-sm focus:outline-none"
                      style={{ color: "var(--foreground)" }}
                    />
                  </div>
                </div>
                <ul className="max-h-64 overflow-auto themed-scrollbar">
                  {filteredStudents.map((s) => {
                    const checked = selectedStudents.has(s.id);
                    return (
                      <li key={s.id}>
                        <button
                          type="button"
                          onClick={() => toggleStudent(s.id)}
                          className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-black/5"
                        >
                          <span
                            className="flex h-4 w-4 shrink-0 items-center justify-center rounded border"
                            style={{
                              borderColor: checked ? "var(--primary)" : "var(--border-soft)",
                              background: checked ? "var(--primary)" : "transparent",
                            }}
                          >
                            {checked && <FaIcon icon={faCheck} className="text-[8px] text-white" />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm" style={{ color: "var(--foreground)" }}>
                              {s.name ?? s.email}
                              {s.level === targetLevel ? (
                                <span
                                  className="ml-2 rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                                  style={{
                                    background: "color-mix(in srgb, var(--primary) 14%, var(--surface))",
                                    color: "var(--primary)",
                                  }}
                                >
                                  Phù hợp
                                </span>
                              ) : (
                                <span
                                  className="ml-2 rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                                  style={{ background: "var(--surface-strong)", color: "var(--muted-foreground, #6b7280)" }}
                                >
                                  Chưa đánh giá
                                </span>
                              )}
                            </span>
                            <span className="block truncate text-xs" style={mutedStyle}>{s.email}</span>
                          </span>
                          {s.activeClassCount > 0 && (
                            <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px]" style={{ background: "var(--surface-strong)", color: "var(--muted-foreground, #6b7280)" }}>
                              {s.activeClassCount} lớp
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                  {filteredStudents.length === 0 && (
                    <li className="px-3 py-4 text-center text-xs" style={mutedStyle}>Không tìm thấy học sinh.</li>
                  )}
                </ul>
              </div>
            )}
          </div>

          <div>
            <label className={labelClass} style={labelStyle}>Ghi chú</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Ghi chú nội bộ về lớp…"
              className={`${fieldClass} resize-none`}
              style={fieldStyle}
            />
          </div>
        </section>
      )}

      {/* Hành động */}
      <div className="flex justify-end gap-3 border-t pt-5" style={{ borderColor: "var(--border-soft)" }}>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg border px-4 py-2 text-sm transition-colors hover:opacity-80"
          style={{ borderColor: "var(--border-soft)", color: "var(--foreground)" }}
        >
          Hủy
        </button>
        <button
          type="submit"
          disabled={isSaving || !eligibility}
          suppressHydrationWarning
          className="rounded-lg px-5 py-2 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50"
          style={{ background: "var(--primary)" }}
        >
          {isSaving ? "Đang tạo lớp…" : "Tạo lớp"}
        </button>
      </div>
    </form>
  );
}
