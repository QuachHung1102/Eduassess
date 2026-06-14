"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AVAILABILITY_DIGITAL_SLOT_META,
  AVAILABILITY_DIGITAL_TIME_SLOTS,
  AVAILABILITY_TIME_GROUPS,
} from "@/lib/availability/time-slots";
import { DAY_ORDER, weeklySlotKey } from "@/lib/classes/scheduling";
import type { WeeklySlotInput } from "@/lib/classes/scheduling";
import {
  createClassWithScheduleAction,
  getScheduleEligibilityAction,
  getTeacherCellsAction,
} from "@/lib/classes/actions";
import type {
  EligibleRoom,
  EligibleStudent,
  EligibleTeacher,
  SlotEligibleRooms,
} from "@/lib/classes/eligibility";
import { PickEntityModal, type PickItem } from "@/components/staff/PickEntityModal";
import { FaIcon } from "@/components/ui/FaIcon";
import {
  faSpinner,
  faTriangleExclamation,
  faMagnifyingGlass,
  faCircleInfo,
  faChalkboardUser,
  faDoorClosed,
  faUserGroup,
  faChevronRight,
} from "@fortawesome/free-solid-svg-icons";
import type { ClassMode, DayOfWeek, StudentLevel } from "@/lib/types";

interface Props {
  subjects: { id: string; name: string }[];
  teachers: { id: string; name: string | null; email: string }[];
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

type Priority = "none" | "teacher";

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
const pickerBtnClass =
  "flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors hover:opacity-90";

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
  roomsBySlot: SlotEligibleRooms[];
  students: EligibleStudent[];
  plannedCount: number;
}

export function ClassBuilder({ subjects, teachers }: Props) {
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
  // blockedCells = ô không thể tô (GV bận theo pre-constrain)
  const [blockedCells, setBlockedCells] = useState<Set<string>>(new Set());

  // Kết quả lọc + lựa chọn
  const [eligibility, setEligibility] = useState<Eligibility | null>(null);
  const [teacherId, setTeacherId] = useState("");
  // Phòng theo từng khung tuần: slotKey → roomId
  const [roomBySlot, setRoomBySlot] = useState<Map<string, string>>(new Map());
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());

  // Modal phân công
  const [teacherModalOpen, setTeacherModalOpen] = useState(false);
  const [studentModalOpen, setStudentModalOpen] = useState(false);
  const [roomModalSlotKey, setRoomModalSlotKey] = useState<string | null>(null);

  const weeklySlots = useMemo(() => deriveWeeklySlots(painted), [painted]);
  const needsRoom = mode !== "ONLINE";

  const scheduleReady =
    weeklySlots.length > 0 && !!startDate && sessionCount > 0 && !!subjectId;

  // slotKey → danh sách phòng khả thi cho khung đó.
  const roomsBySlotMap = useMemo(() => {
    const m = new Map<string, EligibleRoom[]>();
    if (eligibility) for (const e of eligibility.roomsBySlot) m.set(e.slotKey, e.rooms);
    return m;
  }, [eligibility]);

  const selectedTeacher = eligibility?.teachers.find((t) => t.id === teacherId) ?? null;

  // Bất kỳ thay đổi nào về lịch/thông tin nền ⇒ phải tìm lại danh sách khả thi.
  function invalidateEligibility() {
    setEligibility(null);
    setTeacherId("");
    setRoomBySlot(new Map());
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

  // ── Pre-constrain: ưu tiên giáo viên trước (xám ô GV bận) ──
  function applyPriority(next: Priority, value: string) {
    setPriority(next);
    setPriorityTeacherId(next === "teacher" ? value : "");

    if (next === "none" || !value) {
      setBlockedCells(new Set());
      return;
    }
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
      // tự chọn GV nếu pre-constrain còn khả thi; phòng & HS chọn lại từ đầu.
      setTeacherId(
        priorityTeacherId && res.teachers.some((t) => t.id === priorityTeacherId)
          ? priorityTeacherId
          : "",
      );
      setRoomBySlot(new Map());
      setSelectedStudents(new Set());
    });
  }

  // ── Items cho các modal ──
  const teacherItems: PickItem[] = useMemo(
    () =>
      (eligibility?.teachers ?? []).map((t) => ({
        id: t.id,
        label: t.name ?? t.email,
        sublabel: t.email,
      })),
    [eligibility],
  );

  const studentItems: PickItem[] = useMemo(
    () =>
      (eligibility?.students ?? []).map((s) => {
        const parts: string[] = [];
        if (s.level !== targetLevel) parts.push("Chưa đánh giá");
        if (s.activeClassCount > 0) parts.push(`${s.activeClassCount} lớp`);
        return {
          id: s.id,
          label: s.name ?? s.email,
          sublabel: s.email,
          badge: parts.join(" · ") || undefined,
          highlighted: s.level === targetLevel,
        };
      }),
    [eligibility, targetLevel],
  );

  const roomModalItems: PickItem[] = roomModalSlotKey
    ? (roomsBySlotMap.get(roomModalSlotKey) ?? []).map((r) => ({
        id: r.id,
        label: r.name,
        sublabel: `Sức chứa ${r.capacity} người`,
      }))
    : [];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim()) return setError("Nhập tên lớp");
    if (!eligibility) return setError("Bấm \"Tìm người & phòng khả thi\" trước");
    if (!teacherId) return setError("Chọn giáo viên");
    if (needsRoom) {
      const missing = weeklySlots.find(
        (s) => !roomBySlot.get(weeklySlotKey(s.dayOfWeek, s.startTime, s.endTime)),
      );
      if (missing)
        return setError(
          `Chọn phòng cho khung ${DAY_LABEL[missing.dayOfWeek]} ${missing.startTime}–${missing.endTime}`,
        );
    }

    startSaving(async () => {
      const res = await createClassWithScheduleAction({
        name,
        subjectId,
        mode,
        targetLevel,
        startDate,
        weeklySlots: weeklySlots.map((s) => ({
          ...s,
          roomId: needsRoom
            ? roomBySlot.get(weeklySlotKey(s.dayOfWeek, s.startTime, s.endTime))
            : undefined,
        })),
        sessionCount,
        teacherId,
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
            <span style={mutedStyle}>Ưu tiên giáo viên:</span>
            <select
              value={priority === "teacher" ? priorityTeacherId : ""}
              onChange={(e) => applyPriority(e.target.value ? "teacher" : "none", e.target.value)}
              className="rounded-lg border px-2 py-1 text-xs"
              style={fieldStyle}
            >
              <option value="">Không (chọn lịch tự do)</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>{t.name ?? t.email}</option>
              ))}
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
              Giáo viên <span className="text-red-500">*</span>
            </label>
            {eligibility.teachers.length === 0 ? (
              <p className="text-xs text-red-500">Không có giáo viên nào rảnh toàn bộ khung lịch này.</p>
            ) : (
              <button
                type="button"
                onClick={() => setTeacherModalOpen(true)}
                className={pickerBtnClass}
                style={fieldStyle}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <span style={mutedStyle}><FaIcon icon={faChalkboardUser} /></span>
                  <span className="truncate" style={{ color: selectedTeacher ? "var(--foreground)" : "var(--muted-foreground, #9ca3af)" }}>
                    {selectedTeacher ? selectedTeacher.name ?? selectedTeacher.email : "Chọn giáo viên"}
                  </span>
                </span>
                <span className="flex items-center gap-2 shrink-0 text-xs" style={mutedStyle}>
                  {eligibility.teachers.length} khả thi
                  <FaIcon icon={faChevronRight} className="text-[10px]" />
                </span>
              </button>
            )}
          </div>

          {/* Phòng theo từng khung tuần */}
          {needsRoom && (
            <div>
              <label className={labelClass} style={labelStyle}>
                Phòng theo khung lịch <span className="text-red-500">*</span>
              </label>
              <p className="mb-2 text-xs" style={mutedStyle}>
                Mỗi khung lịch trong tuần chọn một phòng riêng — các buổi của khung đó dùng chung phòng này.
              </p>
              <div className="space-y-2">
                {weeklySlots.map((slot) => {
                  const key = weeklySlotKey(slot.dayOfWeek, slot.startTime, slot.endTime);
                  const slotRooms = roomsBySlotMap.get(key) ?? [];
                  const chosen = slotRooms.find((r) => r.id === roomBySlot.get(key)) ?? null;
                  return (
                    <div
                      key={key}
                      className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2"
                      style={{ borderColor: "var(--border-soft)", background: "var(--surface)" }}
                    >
                      <span className="flex items-center gap-2 text-sm" style={{ color: "var(--foreground)" }}>
                        <span style={mutedStyle}><FaIcon icon={faDoorClosed} /></span>
                        {DAY_LABEL[slot.dayOfWeek]} · {slot.startTime}–{slot.endTime}
                      </span>
                      {slotRooms.length === 0 ? (
                        <span className="text-xs text-red-500">Không có phòng trống</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setRoomModalSlotKey(key)}
                          className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-colors hover:opacity-90"
                          style={fieldStyle}
                        >
                          <span style={{ color: chosen ? "var(--foreground)" : "var(--muted-foreground, #9ca3af)" }}>
                            {chosen ? `${chosen.name} (${chosen.capacity})` : "Chọn phòng"}
                          </span>
                          <span style={mutedStyle}><FaIcon icon={faChevronRight} className="text-[10px]" /></span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Học sinh */}
          <div>
            <label className={labelClass} style={labelStyle}>
              Học sinh · đã chọn {selectedStudents.size}
            </label>
            {eligibility.students.length === 0 ? (
              <p className="text-xs" style={mutedStyle}>
                Không có học sinh nào đúng môn/năng lực và rảnh khung lịch này. Có thể thêm sau.
              </p>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setStudentModalOpen(true)}
                  className={pickerBtnClass}
                  style={fieldStyle}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <span style={mutedStyle}><FaIcon icon={faUserGroup} /></span>
                    <span style={{ color: selectedStudents.size > 0 ? "var(--foreground)" : "var(--muted-foreground, #9ca3af)" }}>
                      {selectedStudents.size > 0 ? `Đã chọn ${selectedStudents.size} học sinh` : "Chọn học sinh"}
                    </span>
                  </span>
                  <span className="flex items-center gap-2 shrink-0 text-xs" style={mutedStyle}>
                    {eligibility.students.length} khả thi
                    <FaIcon icon={faChevronRight} className="text-[10px]" />
                  </span>
                </button>
                {selectedStudents.size > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {[...selectedStudents].map((id) => {
                      const s = eligibility.students.find((x) => x.id === id);
                      if (!s) return null;
                      return (
                        <span
                          key={id}
                          className="rounded-full px-2.5 py-1 text-xs"
                          style={{ background: "var(--surface-strong)", color: "var(--foreground)" }}
                        >
                          {s.name ?? s.email}
                        </span>
                      );
                    })}
                  </div>
                )}
              </>
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

      {/* Modal chọn giáo viên */}
      <PickEntityModal
        open={teacherModalOpen}
        onClose={() => setTeacherModalOpen(false)}
        title="Chọn giáo viên"
        description="Chỉ hiện giáo viên rảnh toàn bộ khung lịch."
        items={teacherItems}
        multiSelect={false}
        initialSelected={teacherId ? [teacherId] : []}
        confirmLabel="Chọn"
        emptyText="Không có giáo viên khả thi."
        onApply={(ids) => setTeacherId(ids[0] ?? "")}
      />

      {/* Modal chọn học sinh */}
      <PickEntityModal
        open={studentModalOpen}
        onClose={() => setStudentModalOpen(false)}
        title="Chọn học sinh"
        description='Học sinh đúng môn + đúng năng lực mục tiêu gắn nhãn "Phù hợp".'
        items={studentItems}
        multiSelect
        initialSelected={[...selectedStudents]}
        confirmLabel="Thêm"
        emptyText="Không có học sinh khả thi."
        onApply={(ids) => setSelectedStudents(new Set(ids))}
      />

      {/* Modal chọn phòng cho một khung */}
      <PickEntityModal
        open={roomModalSlotKey !== null}
        onClose={() => setRoomModalSlotKey(null)}
        title="Chọn phòng cho khung lịch"
        description="Chỉ hiện phòng trống cho mọi buổi của khung này."
        items={roomModalItems}
        multiSelect={false}
        initialSelected={
          roomModalSlotKey && roomBySlot.get(roomModalSlotKey)
            ? [roomBySlot.get(roomModalSlotKey)!]
            : []
        }
        confirmLabel="Chọn"
        emptyText="Không có phòng trống cho khung này."
        searchPlaceholder="Tìm theo tên phòng..."
        onApply={(ids) => {
          if (!roomModalSlotKey) return;
          setRoomBySlot((prev) => {
            const next = new Map(prev);
            if (ids[0]) next.set(roomModalSlotKey, ids[0]);
            else next.delete(roomModalSlotKey);
            return next;
          });
        }}
      />
    </form>
  );
}
