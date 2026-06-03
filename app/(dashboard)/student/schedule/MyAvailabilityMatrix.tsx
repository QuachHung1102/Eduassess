"use client";

import { useState, useTransition, useEffect, useRef, Fragment } from "react";
import {
  AVAILABILITY_DIGITAL_TIME_SLOTS,
  AVAILABILITY_TIME_GROUPS,
  normalizeAvailabilitySlots,
  type AvailabilityDigitalTimeSlot,
} from "@/lib/availability/time-slots";
import { saveMyAvailabilityAction } from "@/lib/student/actions";
import type { AvailabilityMode, DayOfWeek, TimeSlot } from "@/lib/types";
import { FaIcon } from "@/components/ui/FaIcon";
import { faXmark, faChevronRight } from "@fortawesome/free-solid-svg-icons";

const DAYS: DayOfWeek[] = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const DAY_LABEL: Record<DayOfWeek, string> = {
  MON: "T.2", TUE: "T.3", WED: "T.4",
  THU: "T.5", FRI: "T.6", SAT: "T.7", SUN: "CN",
};
const DAY_FULL_LABEL: Record<DayOfWeek, string> = {
  MON: "Thứ Hai", TUE: "Thứ Ba", WED: "Thứ Tư",
  THU: "Thứ Năm", FRI: "Thứ Sáu", SAT: "Thứ Bảy", SUN: "Chủ Nhật",
};
const MODE_LABEL: Record<AvailabilityMode, string> = {
  BUSY: "Bận", ONLINE_ONLY: "Online", BOTH: "Được",
};
const MODE_COLOR: Record<AvailabilityMode, string> = {
  BUSY: "bg-red-100 text-red-700 border-red-200",
  ONLINE_ONLY: "bg-yellow-100 text-yellow-700 border-yellow-200",
  BOTH: "bg-green-100 text-green-700 border-green-200",
};
const EMPTY_COLOR = "bg-red-50 text-red-400 border-red-200";
const CELL_COUNT = DAYS.length * AVAILABILITY_DIGITAL_TIME_SLOTS.length;

type PaintMode = AvailabilityMode;
const PAINT_MODES: PaintMode[] = ["BUSY", "ONLINE_ONLY", "BOTH"];
const PAINT_LABEL: Record<PaintMode, string> = {
  BUSY: "Bận", ONLINE_ONLY: "Online", BOTH: "Được",
};
const PAINT_HINT: Record<PaintMode, string> = {
  BUSY: "Không thể học hoặc bận trong khung giờ này",
  ONLINE_ONLY: "Chỉ có thể học trực tuyến",
  BOTH: "Có thể học online hoặc offline",
};
const PAINT_COLOR: Record<PaintMode, string> = {
  BUSY: MODE_COLOR.BUSY,
  ONLINE_ONLY: MODE_COLOR.ONLINE_ONLY,
  BOTH: MODE_COLOR.BOTH,
};

type SlotKey = `${DayOfWeek}_${AvailabilityDigitalTimeSlot}`;
type CellMap = Map<SlotKey, AvailabilityMode>;

interface Props {
  initial: { dayOfWeek: DayOfWeek; slot: TimeSlot; availabilityMode: AvailabilityMode }[];
}

function toMap(data: { dayOfWeek: DayOfWeek; slot: TimeSlot; availabilityMode: AvailabilityMode }[]): CellMap {
  const m = new Map<SlotKey, AvailabilityMode>();
  for (const entry of normalizeAvailabilitySlots(data)) {
    m.set(`${entry.dayOfWeek}_${entry.slot}`, entry.availabilityMode);
  }
  return m;
}
function cloneCells(cells: CellMap): CellMap { return new Map(cells); }
function areCellsEqual(left: CellMap, right: CellMap): boolean {
  if (left.size !== right.size) return false;
  for (const [key, value] of left.entries()) {
    if (right.get(key) !== value) return false;
  }
  return true;
}
function applyPaintMode(cells: CellMap, key: SlotKey, mode: PaintMode): CellMap {
  const next = cloneCells(cells);
  if (mode === "BUSY") { next.delete(key); return next; }
  next.set(key, mode);
  return next;
}
function serializeSlots(cells: CellMap) {
  const slots: { dayOfWeek: DayOfWeek; slot: AvailabilityDigitalTimeSlot; availabilityMode: AvailabilityMode }[] = [];
  for (const [key, mode] of cells.entries()) {
    const [day, slot] = key.split("_") as [DayOfWeek, AvailabilityDigitalTimeSlot];
    slots.push({ dayOfWeek: day, slot, availabilityMode: mode });
  }
  return slots;
}
function getDayGroupSummary(cells: CellMap, day: DayOfWeek, groupSlots: AvailabilityDigitalTimeSlot[]) {
  let both = 0, online = 0;
  for (const slot of groupSlots) {
    const mode = cells.get(`${day}_${slot}`);
    if (mode === "BOTH") both++;
    else if (mode === "ONLINE_ONLY") online++;
  }
  return { both, online, total: groupSlots.length, empty: groupSlots.length - both - online };
}

function PeriodDot({ both, online, total }: { both: number; online: number; total: number }) {
  const set = both + online;
  if (set === 0) return <span className="inline-block w-2 h-2 rounded-full bg-red-200" />;
  if (set === total && both === total) return <span className="inline-block w-2 h-2 rounded-full bg-green-400" />;
  if (set === total && online === total) return <span className="inline-block w-2 h-2 rounded-full bg-yellow-400" />;
  return <span className="inline-block w-2 h-2 rounded-full bg-blue-300" />;
}

interface MobileWeekGridProps { cells: CellMap; isPending: boolean; onDayClick: (day: DayOfWeek) => void; }
function MobileWeekGrid({ cells, isPending, onDayClick }: MobileWeekGridProps) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {DAYS.map((day) => {
        const groups = AVAILABILITY_TIME_GROUPS.map((group) =>
          getDayGroupSummary(cells, day, group.slots.map((s) => s.slot)),
        );
        const totalSet = groups.reduce((acc, g) => acc + g.both + g.online, 0);
        const totalAll = AVAILABILITY_DIGITAL_TIME_SLOTS.length;
        const allEmpty = totalSet === 0;
        return (
          <button
            key={day}
            type="button"
            disabled={isPending}
            onClick={() => onDayClick(day)}
            className="flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-all hover:opacity-80 active:scale-[0.99] hover-card-soft focus-ring-soft"
            style={{
              borderColor: "var(--border-soft)",
              backgroundColor: allEmpty
                ? "color-mix(in srgb, var(--foreground) 2%, var(--surface-strong))"
                : "var(--surface-strong)",
            }}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm" style={{ color: "var(--foreground)" }}>{DAY_FULL_LABEL[day]}</span>
                <span
                  className="text-[10px] font-medium px-1.5 py-0.5 rounded-full border"
                  style={{
                    borderColor: "var(--border-soft)",
                    color: "color-mix(in srgb, var(--foreground) 55%, transparent)",
                    backgroundColor: "color-mix(in srgb, var(--foreground) 4%, transparent)",
                  }}
                >
                  {DAY_LABEL[day]}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-1.5">
                {AVAILABILITY_TIME_GROUPS.map((group, i) => (
                  <div key={group.id} className="flex items-center gap-1">
                    <PeriodDot {...groups[i]} />
                    <span className="text-[11px]" style={{ color: "color-mix(in srgb, var(--foreground) 60%, transparent)" }}>
                      {group.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={`text-[11px] font-semibold tabular-nums ${allEmpty ? "text-red-500" : "text-green-700"}`}>
                {totalSet}/{totalAll}
              </span>
              <span style={{ color: "color-mix(in srgb, var(--foreground) 35%, transparent)" }}>
                <FaIcon icon={faChevronRight} className="text-xs" />
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

interface DayModalProps {
  day: DayOfWeek; cells: CellMap; paintMode: PaintMode; isPending: boolean;
  onClose: () => void;
  onPaintCell: (day: DayOfWeek, slot: AvailabilityDigitalTimeSlot) => void;
  onFillDay: (day: DayOfWeek, mode: PaintMode) => void;
  onPaintModeChange: (mode: PaintMode) => void;
}
function DayModal({ day, cells, paintMode, isPending, onClose, onPaintCell, onFillDay, onPaintModeChange }: DayModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  useEffect(() => { panelRef.current?.focus(); }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="booking-modal-backdrop absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        tabIndex={-1}
        className="booking-modal-panel relative w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[92vh] overflow-y-auto themed-scrollbar outline-none"
        style={{ backgroundColor: "var(--surface-strong)", border: "1px solid var(--border-soft)" }}
        role="dialog"
        aria-modal="true"
        aria-label={`Lịch rảnh ${DAY_FULL_LABEL[day]}`}
      >
        <div
          className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b"
          style={{ backgroundColor: "var(--surface-strong)", borderColor: "var(--border-soft)" }}
        >
          <div>
            <div className="font-bold text-base" style={{ color: "var(--foreground)" }}>{DAY_FULL_LABEL[day]}</div>
            <div className="text-[11px] mt-0.5 flex items-center gap-1.5" style={{ color: "color-mix(in srgb, var(--foreground) 55%, transparent)" }}>
              Chế độ tô:
              <span className={`font-semibold px-1.5 py-0.5 rounded-full border text-[10px] ${PAINT_COLOR[paintMode]}`}>
                {PAINT_LABEL[paintMode]}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors hover:opacity-80"
            style={{ backgroundColor: "color-mix(in srgb, var(--foreground) 8%, transparent)", color: "var(--foreground)" }}
            aria-label="Đóng"
          >
            <FaIcon icon={faXmark} className="text-sm" />
          </button>
        </div>
        <div className="flex gap-2 px-4 pt-3 pb-2 flex-wrap items-center">
          <span className="text-[11px] font-medium uppercase tracking-wide shrink-0" style={{ color: "color-mix(in srgb, var(--foreground) 45%, transparent)" }}>Tô:</span>
          {PAINT_MODES.map((mode) => {
            const active = paintMode === mode;
            return (
              <button
                key={mode}
                type="button"
                onClick={() => onPaintModeChange(mode)}
                disabled={isPending}
                className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${PAINT_COLOR[mode]} ${active ? "ring-2 ring-offset-1" : ""}`}
                style={active ? { borderColor: "var(--primary)" } : undefined}
                aria-pressed={active}
              >
                {PAINT_LABEL[mode]}
              </button>
            );
          })}
        </div>
        <div className="flex gap-2 px-4 pb-3 pt-1 flex-wrap border-b" style={{ borderColor: "var(--border-soft)" }}>
          <button type="button" disabled={isPending} onClick={() => onFillDay(day, "BOTH")}
            className="rounded-lg border border-green-200 bg-green-50 px-3 py-1.5 text-[11px] font-medium text-green-700 transition-colors hover:opacity-80">
            Được cả ngày
          </button>
          <button type="button" disabled={isPending} onClick={() => onFillDay(day, "ONLINE_ONLY")}
            className="rounded-lg border border-yellow-200 bg-yellow-50 px-3 py-1.5 text-[11px] font-medium text-yellow-700 transition-colors hover:opacity-80">
            Online cả ngày
          </button>
          <button type="button" disabled={isPending} onClick={() => onFillDay(day, "BUSY")}
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-[11px] font-medium text-red-700 transition-colors hover:opacity-80">
            Bận cả ngày
          </button>
        </div>
        {AVAILABILITY_TIME_GROUPS.map((group) => (
          <div key={group.id} className="px-4 pt-3 pb-2">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold" style={{ color: "var(--foreground)" }}>{group.label}</span>
              <span className="font-mono text-[11px]" style={{ color: "color-mix(in srgb, var(--foreground) 50%, transparent)" }}>{group.summary}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {group.slots.map((slotMeta) => {
                const key: SlotKey = `${day}_${slotMeta.slot}`;
                const mode = cells.get(key);
                return (
                  <button
                    key={slotMeta.slot}
                    type="button"
                    disabled={isPending}
                    onClick={() => onPaintCell(day, slotMeta.slot)}
                    aria-label={`${slotMeta.label} - ${mode ? MODE_LABEL[mode] : "Bận"}`}
                    className={`flex flex-col items-start gap-0.5 rounded-xl border px-3 py-2.5 text-left transition-all hover:opacity-80 active:scale-95 press-feedback-soft focus-ring-soft ${mode ? MODE_COLOR[mode] : EMPTY_COLOR}`}
                  >
                    <span className="font-mono text-[11px] font-semibold">{slotMeta.label}</span>
                    <span className="text-[11px] font-medium">{mode ? MODE_LABEL[mode] : "Bận"}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        <div className="h-4" />
      </div>
    </div>
  );
}

export function MyAvailabilityMatrix({ initial }: Props) {
  const [cells, setCells] = useState<CellMap>(() => toMap(initial));
  const [savedCells, setSavedCells] = useState<CellMap>(() => toMap(initial));
  const [paintMode, setPaintMode] = useState<PaintMode>("BOTH");
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [dayModalOpen, setDayModalOpen] = useState<DayOfWeek | null>(null);

  const isDirty = !areCellsEqual(cells, savedCells);
  const onlineOnlyCount = [...cells.values()].filter((m) => m === "ONLINE_ONLY").length;
  const bothCount = [...cells.values()].filter((m) => m === "BOTH").length;

  function markDirty() { setFeedback(null); }
  function updateCells(recipe: (current: CellMap) => CellMap) {
    setCells((prev) => recipe(prev));
    markDirty();
  }
  function applyModeToSlots(slots: AvailabilityDigitalTimeSlot[], mode: PaintMode) {
    updateCells((prev) => {
      let next = cloneCells(prev);
      for (const slot of slots) {
        for (const day of DAYS) { next = applyPaintMode(next, `${day}_${slot}`, mode); }
      }
      return next;
    });
  }
  function paintCell(day: DayOfWeek, slot: AvailabilityDigitalTimeSlot) {
    updateCells((prev) => applyPaintMode(prev, `${day}_${slot}`, paintMode));
  }
  function fillRow(slot: AvailabilityDigitalTimeSlot, mode: PaintMode) { applyModeToSlots([slot], mode); }
  function fillAll(mode: PaintMode) { applyModeToSlots(AVAILABILITY_DIGITAL_TIME_SLOTS, mode); }
  function fillGroup(slots: AvailabilityDigitalTimeSlot[], mode: PaintMode) { applyModeToSlots(slots, mode); }
  function fillDay(day: DayOfWeek, mode: PaintMode) {
    updateCells((prev) => {
      let next = cloneCells(prev);
      for (const slot of AVAILABILITY_DIGITAL_TIME_SLOTS) { next = applyPaintMode(next, `${day}_${slot}`, mode); }
      return next;
    });
  }
  function handleReset() { setCells(cloneCells(savedCells)); setFeedback(null); }
  function handleSave() {
    const nextCells = cloneCells(cells);
    const slots = serializeSlots(nextCells);
    setFeedback(null);
    startTransition(async () => {
      try {
        await saveMyAvailabilityAction(slots);
        setSavedCells(nextCells);
        setFeedback({ type: "success", text: "Đã lưu lịch rảnh thành công." });
      } catch {
        setFeedback({ type: "error", text: "Không thể lưu lịch rảnh. Vui lòng thử lại." });
      }
    });
  }

  return (
    <div>
      {/* Paint mode selector */}
      <div
        className="mb-4 flex flex-col gap-3 rounded-xl border p-4"
        style={{ borderColor: "var(--border-soft)", backgroundColor: "color-mix(in srgb, var(--foreground) 2%, var(--surface-strong))" }}
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-[0.18em]" style={{ color: "color-mix(in srgb, var(--foreground) 45%, transparent)" }}>
            Chế độ tô
          </span>
          {PAINT_MODES.map((mode) => {
            const active = paintMode === mode;
            return (
              <button
                key={mode}
                type="button"
                onClick={() => setPaintMode(mode)}
                disabled={isPending}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${PAINT_COLOR[mode]} ${active ? "ring-2 ring-offset-1" : ""}`}
                style={active ? { borderColor: "var(--primary)" } : undefined}
                aria-pressed={active}
              >
                {PAINT_LABEL[mode]}
              </button>
            );
          })}
        </div>
        <p className="text-xs" style={{ color: "color-mix(in srgb, var(--foreground) 55%, transparent)" }}>
          {PAINT_HINT[paintMode]}
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => fillAll("BOTH")} disabled={isPending}
            className="rounded-lg border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 transition-colors hover:opacity-80">
            Đặt cả tuần là Được
          </button>
          <button type="button" onClick={() => fillAll("ONLINE_ONLY")} disabled={isPending}
            className="rounded-lg border border-yellow-200 bg-yellow-50 px-3 py-1.5 text-xs font-medium text-yellow-700 transition-colors hover:opacity-80">
            Đặt cả tuần là Online
          </button>
          <button type="button" onClick={() => fillAll("BUSY")} disabled={isPending}
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:opacity-80">
            Đặt cả tuần là Bận
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="mb-4 grid grid-cols-3 gap-2">
        <div className="rounded-xl border px-3 py-2.5" style={{ borderColor: "var(--border-soft)", backgroundColor: "var(--surface-strong)" }}>
          <div className="font-semibold text-sm text-red-600">{CELL_COUNT - cells.size}</div>
          <div className="text-xs mt-0.5" style={{ color: "color-mix(in srgb, var(--foreground) 55%, transparent)" }}>Bận / chưa khai báo</div>
        </div>
        <div className="rounded-xl border px-3 py-2.5" style={{ borderColor: "var(--border-soft)", backgroundColor: "var(--surface-strong)" }}>
          <div className="font-semibold text-sm text-yellow-700">{onlineOnlyCount}</div>
          <div className="text-xs mt-0.5" style={{ color: "color-mix(in srgb, var(--foreground) 55%, transparent)" }}>Chỉ học online</div>
        </div>
        <div className="rounded-xl border px-3 py-2.5" style={{ borderColor: "var(--border-soft)", backgroundColor: "var(--surface-strong)" }}>
          <div className="font-semibold text-sm text-green-700">{bothCount}</div>
          <div className="text-xs mt-0.5" style={{ color: "color-mix(in srgb, var(--foreground) 55%, transparent)" }}>Online hoặc offline</div>
        </div>
      </div>

      {/* Mobile: day card grid */}
      <div className="md:hidden mb-4">
        <p className="text-xs mb-3" style={{ color: "color-mix(in srgb, var(--foreground) 60%, transparent)" }}>
          Nhấn vào ngày để khai báo lịch rảnh cho ngày đó.
        </p>
        <MobileWeekGrid cells={cells} isPending={isPending} onDayClick={setDayModalOpen} />
      </div>

      {/* Desktop: Excel-style matrix table */}
      <div className="hidden md:block">
        <div
          className="overflow-x-auto themed-scrollbar rounded-xl overflow-hidden border"
          style={{ borderColor: "var(--border-soft)" }}
        >
          <table className="min-w-[820px] w-full border-collapse text-xs">
            <thead>
              {/* Row 1 — day headers + per-day fill buttons */}
              <tr style={{ backgroundColor: "color-mix(in srgb, var(--foreground) 5%, var(--surface-strong))" }}>
                <th
                  className="sticky left-0 z-20 w-[148px] min-w-[148px] px-3 py-2.5 text-left border-b border-r"
                  style={{
                    borderColor: "var(--border-soft)",
                    backgroundColor: "color-mix(in srgb, var(--foreground) 5%, var(--surface-strong))",
                  }}
                >
                  <span
                    className="font-semibold text-[11px]"
                    style={{ color: "color-mix(in srgb, var(--foreground) 55%, transparent)" }}
                  >
                    Khung giờ
                  </span>
                </th>
                {DAYS.map((day) => (
                  <th
                    key={day}
                    className="min-w-[90px] py-2 px-1 text-center border-b border-r last:border-r-0"
                    style={{ borderColor: "var(--border-soft)" }}
                  >
                    <div className="font-bold text-[13px]" style={{ color: "var(--foreground)" }}>
                      {DAY_LABEL[day]}
                    </div>
                    <div
                      className="text-[10px] font-normal mt-0.5"
                      style={{ color: "color-mix(in srgb, var(--foreground) 50%, transparent)" }}
                    >
                      {DAY_FULL_LABEL[day]}
                    </div>
                    <div className="flex justify-center gap-1 mt-2">
                      <button
                        type="button"
                        onClick={() => fillDay(day, "BOTH")}
                        disabled={isPending}
                        title="Được cả ngày"
                        className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-green-700 bg-green-50 border border-green-200 hover:opacity-75 transition-opacity"
                      >
                        Được
                      </button>
                      <button
                        type="button"
                        onClick={() => fillDay(day, "ONLINE_ONLY")}
                        disabled={isPending}
                        title="Online cả ngày"
                        className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-yellow-700 bg-yellow-50 border border-yellow-200 hover:opacity-75 transition-opacity"
                      >
                        Online
                      </button>
                      <button
                        type="button"
                        onClick={() => fillDay(day, "BUSY")}
                        disabled={isPending}
                        title="Bận cả ngày"
                        className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-red-600 bg-red-50 border border-red-200 hover:opacity-75 transition-opacity"
                      >
                        Bận
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {AVAILABILITY_TIME_GROUPS.map((group) => (
                <Fragment key={group.id}>
                  {/* ── Period group separator row ── */}
                  <tr style={{ backgroundColor: "color-mix(in srgb, var(--primary) 7%, var(--surface-strong))" }}>
                    <td
                      className="sticky left-0 z-10 px-3 py-2 border-b border-r"
                      style={{
                        borderColor: "var(--border-soft)",
                        backgroundColor: "color-mix(in srgb, var(--primary) 7%, var(--surface-strong))",
                      }}
                    >
                      <span className="font-bold text-[11px]" style={{ color: "var(--foreground)" }}>
                        {group.label}
                      </span>
                      <span
                        className="ml-2 font-mono text-[10px]"
                        style={{ color: "color-mix(in srgb, var(--foreground) 45%, transparent)" }}
                      >
                        {group.summary}
                      </span>
                    </td>
                    <td
                      colSpan={DAYS.length}
                      className="px-3 py-2 border-b"
                      style={{ borderColor: "var(--border-soft)" }}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="text-[10px]"
                          style={{ color: "color-mix(in srgb, var(--foreground) 45%, transparent)" }}
                        >
                          Cả buổi:
                        </span>
                        <button
                          type="button"
                          onClick={() => fillGroup(group.slots.map((s) => s.slot), "BOTH")}
                          disabled={isPending}
                          className="rounded px-2 py-0.5 text-[10px] font-semibold text-green-700 bg-green-50 border border-green-200 hover:opacity-75 transition-opacity"
                        >
                          Được
                        </button>
                        <button
                          type="button"
                          onClick={() => fillGroup(group.slots.map((s) => s.slot), "ONLINE_ONLY")}
                          disabled={isPending}
                          className="rounded px-2 py-0.5 text-[10px] font-semibold text-yellow-700 bg-yellow-50 border border-yellow-200 hover:opacity-75 transition-opacity"
                        >
                          Online
                        </button>
                        <button
                          type="button"
                          onClick={() => fillGroup(group.slots.map((s) => s.slot), "BUSY")}
                          disabled={isPending}
                          className="rounded px-2 py-0.5 text-[10px] font-semibold text-red-600 bg-red-50 border border-red-200 hover:opacity-75 transition-opacity"
                        >
                          Bận buổi
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* ── Slot rows ── */}
                  {group.slots.map((slotMeta) => (
                    <tr key={slotMeta.slot} className="group/row">
                      {/* Sticky time label + fill-row button */}
                      <td
                        className="sticky left-0 z-10 px-3 border-b border-r"
                        style={{
                          borderColor: "var(--border-soft)",
                          backgroundColor: "color-mix(in srgb, var(--foreground) 2%, var(--surface-strong))",
                        }}
                      >
                        <div className="flex items-center justify-between gap-2 h-9">
                          <span
                            className="font-mono text-[11px] font-semibold tabular-nums"
                            style={{ color: "var(--foreground)" }}
                          >
                            {slotMeta.label}
                          </span>
                          <button
                            type="button"
                            onClick={() => fillRow(slotMeta.slot, paintMode)}
                            disabled={isPending}
                            title="Tô cả hàng theo chế độ hiện tại"
                            className="opacity-0 group-hover/row:opacity-100 shrink-0 rounded px-1.5 py-0.5 text-[9px] font-medium border transition-all hover:opacity-75"
                            style={{
                              borderColor: "var(--border-soft)",
                              color: "color-mix(in srgb, var(--foreground) 55%, transparent)",
                              backgroundColor: "color-mix(in srgb, var(--foreground) 5%, transparent)",
                            }}
                          >
                            → hàng
                          </button>
                        </div>
                      </td>

                      {/* Day cells */}
                      {DAYS.map((day) => {
                        const key: SlotKey = `${day}_${slotMeta.slot}`;
                        const mode = cells.get(key);
                        return (
                          <td
                            key={day}
                            className="p-0 border-b border-r last:border-r-0"
                            style={{ borderColor: "var(--border-soft)" }}
                          >
                            <button
                              type="button"
                              onClick={() => paintCell(day, slotMeta.slot)}
                              disabled={isPending}
                              aria-label={`${DAY_LABEL[day]} ${slotMeta.label} – ${mode ? MODE_LABEL[mode] : "Bận"}`}
                              className={`h-9 w-full text-[11px] font-medium transition-colors focus-ring-soft ${
                                mode === "BOTH"
                                  ? "bg-green-100 text-green-800 hover:bg-green-200"
                                  : mode === "ONLINE_ONLY"
                                  ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                                  : "bg-red-50 text-red-400 hover:bg-red-100"
                              }`}
                            >
                              {mode === "BOTH" ? "Được" : mode === "ONLINE_ONLY" ? "Online" : "Bận"}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Day modal */}
      {dayModalOpen && (
        <DayModal
          day={dayModalOpen}
          cells={cells}
          paintMode={paintMode}
          isPending={isPending}
          onClose={() => setDayModalOpen(null)}
          onPaintCell={paintCell}
          onFillDay={fillDay}
          onPaintModeChange={setPaintMode}
        />
      )}

      {/* Save / reset */}
      <div className="flex items-center gap-3 mt-4 flex-wrap">
        <button
          type="button"
          onClick={handleReset}
          disabled={isPending || !isDirty}
          className="rounded-lg border px-4 py-2 text-sm font-medium transition-colors hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
          style={{ borderColor: "var(--border-soft)", backgroundColor: "var(--surface-strong)", color: "var(--foreground)" }}
        >
          Khôi phục đã lưu
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending || !isDirty}
          aria-busy={isPending}
          className="primary-button focus-ring-strong press-feedback-inset state-disabled px-5 py-2 text-sm"
        >
          {isPending ? "Đang lưu…" : "Lưu lịch rảnh"}
        </button>
        <span
          className={`text-xs font-medium ${
            feedback?.type === "error" ? "text-red-600"
            : feedback?.type === "success" ? "text-green-600"
            : isDirty ? "text-amber-600"
            : "text-slate-500"
          }`}
        >
          {feedback?.text ?? (isDirty ? "Có thay đổi chưa lưu" : "Đang dùng dữ liệu đã lưu")}
        </span>
      </div>
    </div>
  );
}
