"use client";

import { useState, useTransition } from "react";
import {
  AVAILABILITY_DIGITAL_TIME_SLOTS,
  AVAILABILITY_TIME_GROUPS,
  normalizeAvailabilitySlots,
  type AvailabilityDigitalTimeSlot,
} from "@/lib/availability/time-slots";
import { saveStudentAvailabilityAction } from "@/lib/classes/actions";
import type { AvailabilityMode, DayOfWeek, TimeSlot } from "@/lib/types";

const DAYS: DayOfWeek[] = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const DAY_LABEL: Record<DayOfWeek, string> = {
  MON: "T.2", TUE: "T.3", WED: "T.4",
  THU: "T.5", FRI: "T.6", SAT: "T.7", SUN: "CN",
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
type PaintMode = "CLEAR" | Exclude<AvailabilityMode, "BUSY">;

const PAINT_MODES: PaintMode[] = ["CLEAR", "ONLINE_ONLY", "BOTH"];
const PAINT_LABEL: Record<PaintMode, string> = {
  CLEAR: "Để trống",
  ONLINE_ONLY: "Online",
  BOTH: "Được",
};

type SlotKey = `${DayOfWeek}_${AvailabilityDigitalTimeSlot}`;
type CellMap = Map<SlotKey, AvailabilityMode>;

interface Props {
  studentId: string;
  initial: { dayOfWeek: DayOfWeek; slot: TimeSlot; mode: AvailabilityMode }[];
}

function toMap(
  data: { dayOfWeek: DayOfWeek; slot: TimeSlot; mode: AvailabilityMode }[]
): CellMap {
  const m = new Map<SlotKey, AvailabilityMode>();

  for (const entry of normalizeAvailabilitySlots(
    data.map((item) => ({
      dayOfWeek: item.dayOfWeek,
      slot: item.slot,
      availabilityMode: item.mode,
    })),
  )) {
    m.set(`${entry.dayOfWeek}_${entry.slot}`, entry.availabilityMode);
  }

  return m;
}

function cloneCells(cells: CellMap): CellMap {
  return new Map(cells);
}

function areCellsEqual(left: CellMap, right: CellMap): boolean {
  if (left.size !== right.size) return false;

  for (const [key, value] of left.entries()) {
    if (right.get(key) !== value) {
      return false;
    }
  }

  return true;
}

function applyPaintMode(cells: CellMap, key: SlotKey, mode: PaintMode): CellMap {
  const next = cloneCells(cells);

  if (mode === "CLEAR") {
    next.delete(key);
    return next;
  }

  next.set(key, mode);
  return next;
}

function serializeSlots(cells: CellMap) {
  const slots: {
    dayOfWeek: DayOfWeek;
    slot: AvailabilityDigitalTimeSlot;
    availabilityMode: AvailabilityMode;
  }[] = [];

  for (const [key, mode] of cells.entries()) {
    const [day, slot] = key.split("_") as [DayOfWeek, AvailabilityDigitalTimeSlot];
    slots.push({ dayOfWeek: day, slot, availabilityMode: mode });
  }

  return slots;
}

export function AvailabilityMatrix({ studentId, initial }: Props) {
  const [cells, setCells] = useState<CellMap>(() => toMap(initial));
  const [savedCells, setSavedCells] = useState<CellMap>(() => toMap(initial));
  const [isPending, startTransition] = useTransition();
  const [paintMode, setPaintMode] = useState<PaintMode>("BOTH");
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const isDirty = !areCellsEqual(cells, savedCells);

  function updateCells(recipe: (current: CellMap) => CellMap) {
    setCells((prev) => recipe(prev));
    setFeedback(null);
  }

  function applyModeToSlots(slots: AvailabilityDigitalTimeSlot[], mode: PaintMode) {
    updateCells((prev) => {
      let next = cloneCells(prev);

      for (const slot of slots) {
        for (const day of DAYS) {
          next = applyPaintMode(next, `${day}_${slot}`, mode);
        }
      }

      return next;
    });
  }

  function paintCell(day: DayOfWeek, slot: AvailabilityDigitalTimeSlot) {
    updateCells((prev) => applyPaintMode(prev, `${day}_${slot}`, paintMode));
  }

  function fillRow(slot: AvailabilityDigitalTimeSlot, mode: PaintMode) {
    applyModeToSlots([slot], mode);
  }

  function fillGroup(slots: AvailabilityDigitalTimeSlot[], mode: PaintMode) {
    applyModeToSlots(slots, mode);
  }

  function fillAll(mode: PaintMode) {
    applyModeToSlots(AVAILABILITY_DIGITAL_TIME_SLOTS, mode);
  }

  function handleReset() {
    setCells(cloneCells(savedCells));
    setFeedback(null);
  }

  function handleSave() {
    const nextCells = cloneCells(cells);
    const slots = serializeSlots(nextCells);
    setFeedback(null);

    startTransition(async () => {
      try {
        await saveStudentAvailabilityAction(studentId, slots);
        setSavedCells(nextCells);
        setFeedback({ type: "success", text: "Đã lưu lịch rảnh cho học sinh." });
      } catch {
        setFeedback({ type: "error", text: "Không thể lưu lịch rảnh. Vui lòng thử lại." });
      }
    });
  }

  return (
    <div>
      <p className="mb-3 text-sm text-gray-500">
        Bảng lịch được chia theo khung giờ digital của 3 buổi sáng, chiều, tối. Để trống nghĩa là học sinh bận ở khung giờ đó.
      </p>

      <div className="mb-4 flex flex-col gap-3 rounded-xl border border-gray-200 bg-gray-50/80 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-[0.18em] text-gray-500">
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
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${active ? "border-emerald-500" : ""} ${mode === "BOTH" ? MODE_COLOR.BOTH : mode === "ONLINE_ONLY" ? MODE_COLOR.ONLINE_ONLY : EMPTY_COLOR}`}
                aria-pressed={active}
              >
                {PAINT_LABEL[mode]}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => fillAll("BOTH")}
            disabled={isPending}
            className="rounded-lg border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 transition-colors hover:opacity-80"
          >
            Đặt cả tuần là Được
          </button>
          <button
            type="button"
            onClick={() => fillAll("ONLINE_ONLY")}
            disabled={isPending}
            className="rounded-lg border border-yellow-200 bg-yellow-50 px-3 py-1.5 text-xs font-medium text-yellow-700 transition-colors hover:opacity-80"
          >
            Đặt cả tuần là Online
          </button>
          <button
            type="button"
            onClick={() => fillAll("CLEAR")}
            disabled={isPending}
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:opacity-80"
          >
            Xóa toàn bộ
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-230 text-xs text-center border-separate border-spacing-1.5">
          <thead>
            <tr>
              <th className="w-24 pb-1 text-left font-medium text-gray-500">Buổi</th>
              <th className="w-28 pb-1 text-left font-medium text-gray-500">Giờ</th>
              {DAYS.map((d) => (
                <th key={d} className="w-19.5 pb-1 font-medium text-gray-600">
                  {DAY_LABEL[d]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {AVAILABILITY_TIME_GROUPS.map((group) => (
              group.slots.map((slotMeta, slotIndex) => (
                <tr key={slotMeta.slot}>
                  {slotIndex === 0 && (
                    <td rowSpan={group.slots.length} className="min-w-28 px-1 py-1 align-top">
                      <div className="flex h-full min-h-41 flex-col items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-left">
                        <div>
                          <div className="text-sm font-semibold text-gray-800">{group.label}</div>
                          <div className="font-mono text-[11px] text-gray-500">{group.summary}</div>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          <button
                            type="button"
                            onClick={() => fillGroup(group.slots.map((item) => item.slot), "BOTH")}
                            disabled={isPending}
                            className="rounded-md border border-green-200 bg-green-50 px-2 py-1 text-[10px] font-medium text-green-700 transition-colors hover:opacity-80"
                          >
                            Được
                          </button>
                          <button
                            type="button"
                            onClick={() => fillGroup(group.slots.map((item) => item.slot), "ONLINE_ONLY")}
                            disabled={isPending}
                            className="rounded-md border border-yellow-200 bg-yellow-50 px-2 py-1 text-[10px] font-medium text-yellow-700 transition-colors hover:opacity-80"
                          >
                            Online
                          </button>
                          <button
                            type="button"
                            onClick={() => fillGroup(group.slots.map((item) => item.slot), "CLEAR")}
                            disabled={isPending}
                            className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-[10px] font-medium text-red-700 transition-colors hover:opacity-80"
                          >
                            Xóa
                          </button>
                        </div>
                      </div>
                    </td>
                  )}
                  <td className="min-w-28 px-1 py-1.5 align-top">
                    <div className="flex h-full min-h-10 flex-col items-start justify-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-left">
                      <span className="font-mono text-xs font-semibold text-gray-800">{slotMeta.label}</span>
                      <button
                        type="button"
                        onClick={() => fillRow(slotMeta.slot, paintMode)}
                        disabled={isPending}
                        className="text-[10px] font-medium text-gray-500 transition-colors hover:opacity-80"
                      >
                        Tô cả hàng theo chế độ đang chọn
                      </button>
                    </div>
                  </td>
                  {DAYS.map((day) => {
                    const key: SlotKey = `${day}_${slotMeta.slot}`;
                    const mode = cells.get(key);

                    return (
                      <td key={day}>
                        <button
                          type="button"
                          onClick={() => paintCell(day, slotMeta.slot)}
                          disabled={isPending}
                          aria-label={`${DAY_LABEL[day]} ${slotMeta.label} - ${mode ? MODE_LABEL[mode] : "Bận"}`}
                          className={`h-10 w-19.5 rounded-md border text-xs font-medium transition-all hover:opacity-80 ${
                            mode ? MODE_COLOR[mode] : EMPTY_COLOR
                          }`}
                        >
                          {mode ? MODE_LABEL[mode] : "—"}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={handleReset}
          disabled={isPending || !isDirty}
          className="rounded-lg border border-gray-200 bg-white px-4 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Khôi phục
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending || !isDirty}
          className="rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? "Đang lưu..." : "Lưu lịch rảnh"}
        </button>
        <span
          className={`text-xs font-medium ${
            feedback?.type === "error"
              ? "text-red-600"
              : feedback?.type === "success"
                ? "text-green-600"
                : isDirty
                  ? "text-amber-600"
                  : "text-gray-500"
          }`}
        >
          {feedback?.text ?? (isDirty ? "Có thay đổi chưa lưu" : "Đang dùng dữ liệu đã lưu")}
        </span>
      </div>
    </div>
  );
}
