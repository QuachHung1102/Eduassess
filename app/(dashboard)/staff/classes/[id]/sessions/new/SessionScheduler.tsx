"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AVAILABILITY_DIGITAL_SLOT_META,
  AVAILABILITY_DIGITAL_TIME_SLOTS,
} from "@/lib/availability/time-slots";
import {
  createSessionAction,
  getRoomUsageAction,
} from "@/lib/classes/actions";
import type { RoomUsageForDate, RoomOccupancyBlock } from "@/lib/classes/queries";
import type { ClassMode } from "@/lib/types";
import { FaIcon } from "@/components/ui/FaIcon";
import {
  faCircleInfo,
  faSpinner,
  faTriangleExclamation,
} from "@fortawesome/free-solid-svg-icons";

interface Teacher {
  id: string;
  name: string | null;
  email: string;
}

interface Props {
  classId: string;
  classMode: ClassMode;
  nextSessionNumber: number;
  teachers: Teacher[];
  initialDate: string; // "YYYY-MM-DD" (hôm nay)
  initialRooms: RoomUsageForDate[];
}

const MODES: { value: ClassMode; label: string }[] = [
  { value: "OFFLINE", label: "Offline" },
  { value: "ONLINE", label: "Online" },
  { value: "HYBRID", label: "Hybrid" },
];

// Cột giờ: 15 khung 1 tiếng từ 07:00 đến 22:00 (tái dùng meta của lịch rảnh).
const COLUMNS = AVAILABILITY_DIGITAL_TIME_SLOTS.map(
  (slot) => AVAILABILITY_DIGITAL_SLOT_META[slot],
);

/** Block (bận) có giao với cột giờ [start, end) hay không. */
function overlaps(block: RoomOccupancyBlock, start: string, end: string): boolean {
  return block.startTime < end && block.endTime > start;
}

function blockAt(room: RoomUsageForDate, start: string, end: string): RoomOccupancyBlock | null {
  return room.blocks.find((b) => overlaps(b, start, end)) ?? null;
}

const labelClass = "block text-xs font-medium mb-1";
const labelStyle = { color: "var(--foreground)" } as const;
const fieldClass =
  "w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 transition";
const fieldStyle = {
  background: "var(--surface)",
  border: "1px solid var(--border-soft)",
  color: "var(--foreground)",
} as const;

export function SessionScheduler({
  classId,
  classMode,
  nextSessionNumber,
  teachers,
  initialDate,
  initialRooms,
}: Props) {
  const router = useRouter();
  const [isSaving, startSaving] = useTransition();
  const [isLoadingRooms, startLoadingRooms] = useTransition();
  const [error, setError] = useState("");

  const [sessionNumber, setSessionNumber] = useState(nextSessionNumber);
  const [date, setDate] = useState(initialDate);
  const [mode, setMode] = useState<ClassMode>(classMode);
  const [teacherId, setTeacherId] = useState(teachers[0]?.id ?? "");
  const [note, setNote] = useState("");

  const [rooms, setRooms] = useState<RoomUsageForDate[]>(initialRooms);

  // Lựa chọn phòng + khung giờ trên lưới (offline/hybrid).
  const [selRoomId, setSelRoomId] = useState<string>("");
  const [selStart, setSelStart] = useState<number>(-1); // chỉ số cột bắt đầu (inclusive)
  const [selEnd, setSelEnd] = useState<number>(-1); // chỉ số cột kết thúc (inclusive)

  // Khung giờ cho hình thức ONLINE (không cần phòng).
  const [onlineStart, setOnlineStart] = useState("18:00");
  const [onlineEnd, setOnlineEnd] = useState("20:00");

  const needsRoom = mode !== "ONLINE";

  // Tải lại lịch phòng khi đổi ngày.
  useEffect(() => {
    if (!date) return;
    startLoadingRooms(async () => {
      const res = await getRoomUsageAction(date);
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setRooms(res.rooms);
      // reset lựa chọn vì lịch đã đổi
      setSelRoomId("");
      setSelStart(-1);
      setSelEnd(-1);
    });
  }, [date]);

  const selectedRoom = rooms.find((r) => r.id === selRoomId) ?? null;

  // Khoảng giờ đã chọn → startTime / endTime.
  const selStartTime = selStart >= 0 ? COLUMNS[selStart].start : "";
  const selEndTime = selEnd >= 0 ? COLUMNS[selEnd].end : "";

  const summary = useMemo(() => {
    if (!needsRoom) return `Online · ${onlineStart}–${onlineEnd}`;
    if (!selectedRoom || selStart < 0) return "Chưa chọn phòng & giờ";
    return `${selectedRoom.name} · ${selStartTime}–${selEndTime}`;
  }, [needsRoom, onlineStart, onlineEnd, selectedRoom, selStart, selStartTime, selEndTime]);

  function pickCell(roomId: string, colIdx: number) {
    const room = rooms.find((r) => r.id === roomId);
    if (!room) return;
    const col = COLUMNS[colIdx];
    if (blockAt(room, col.start, col.end)) return; // ô bận

    // Đổi phòng hoặc chưa chọn → bắt đầu vùng chọn mới.
    if (roomId !== selRoomId || selStart < 0) {
      setSelRoomId(roomId);
      setSelStart(colIdx);
      setSelEnd(colIdx);
      return;
    }

    // Cùng phòng → mở rộng vùng chọn nếu toàn bộ khoảng đều trống.
    const lo = Math.min(selStart, colIdx);
    const hi = Math.max(selStart, colIdx);
    let allFree = true;
    for (let i = lo; i <= hi; i++) {
      if (blockAt(room, COLUMNS[i].start, COLUMNS[i].end)) {
        allFree = false;
        break;
      }
    }
    if (allFree) {
      setSelStart(lo);
      setSelEnd(hi);
    } else {
      // có ô bận xen giữa → bắt đầu lại tại ô vừa bấm
      setSelStart(colIdx);
      setSelEnd(colIdx);
    }
  }

  function isSelected(roomId: string, colIdx: number): boolean {
    return roomId === selRoomId && colIdx >= selStart && colIdx <= selEnd && selStart >= 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const startTime = needsRoom ? selStartTime : onlineStart;
    const endTime = needsRoom ? selEndTime : onlineEnd;
    const roomId = needsRoom ? selRoomId : undefined;

    if (!teacherId) {
      setError("Vui lòng chọn giáo viên");
      return;
    }
    if (needsRoom && (!roomId || !startTime)) {
      setError("Vui lòng chọn phòng và khung giờ trên lưới");
      return;
    }
    if (!startTime || !endTime) {
      setError("Vui lòng chọn khung giờ");
      return;
    }
    if (startTime >= endTime) {
      setError("Giờ bắt đầu phải trước giờ kết thúc");
      return;
    }

    startSaving(async () => {
      const res = await createSessionAction(classId, {
        sessionNumber,
        date,
        startTime,
        endTime,
        mode,
        teacherId,
        roomId,
        note,
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      router.push(`/staff/classes/${classId}`);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <FaIcon icon={faTriangleExclamation} className="mt-0.5 text-xs" />
          <span>{error}</span>
        </div>
      )}

      {/* Thông tin buổi */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div>
          <label className={labelClass} style={labelStyle}>
            Số buổi
          </label>
          <input
            type="number"
            min={1}
            value={sessionNumber}
            onChange={(e) => setSessionNumber(parseInt(e.target.value) || 1)}
            className={fieldClass}
            style={fieldStyle}
          />
        </div>
        <div>
          <label className={labelClass} style={labelStyle}>
            Ngày học <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className={fieldClass}
            style={fieldStyle}
          />
        </div>
        <div>
          <label className={labelClass} style={labelStyle}>
            Hình thức
          </label>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as ClassMode)}
            className={fieldClass}
            style={fieldStyle}
          >
            {MODES.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass} style={labelStyle}>
            Giáo viên <span className="text-red-500">*</span>
          </label>
          <select
            value={teacherId}
            onChange={(e) => setTeacherId(e.target.value)}
            required
            className={fieldClass}
            style={fieldStyle}
          >
            <option value="">-- Chọn --</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name ?? t.email}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Khung giờ + phòng */}
      {needsRoom ? (
        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <label className={labelClass} style={labelStyle}>
              Chọn phòng &amp; khung giờ <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-3 text-[11px]" style={{ color: "var(--muted-foreground, #6b7280)" }}>
              <span className="flex items-center gap-1">
                <span className="inline-block h-3 w-3 rounded-sm" style={{ background: "var(--surface)", border: "1px solid var(--border-soft)" }} />
                Trống
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-3 w-3 rounded-sm bg-red-100" style={{ border: "1px solid #fecaca" }} />
                Đã dùng
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-3 w-3 rounded-sm" style={{ background: "var(--primary)" }} />
                Đang chọn
              </span>
            </div>
          </div>

          <div
            className="relative overflow-x-auto rounded-xl themed-scrollbar"
            style={{ border: "1px solid var(--border-soft)" }}
          >
            {isLoadingRooms && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 text-sm" style={{ color: "var(--foreground)" }}>
                <FaIcon icon={faSpinner} className="mr-2 animate-spin" /> Đang tải lịch phòng…
              </div>
            )}

            {rooms.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm" style={{ color: "var(--muted-foreground, #6b7280)" }}>
                Không có phòng khả dụng.
              </p>
            ) : (
              <table className="w-full border-collapse text-[11px]">
                <thead>
                  <tr>
                    <th
                      className="sticky left-0 z-1 px-2 py-1.5 text-left font-semibold"
                      style={{ background: "var(--surface-strong)", color: "var(--foreground)", minWidth: 120 }}
                    >
                      Phòng
                    </th>
                    {COLUMNS.map((c) => (
                      <th
                        key={c.start}
                        className="px-1 py-1.5 text-center font-medium"
                        style={{ background: "var(--surface-strong)", color: "var(--muted-foreground, #6b7280)", minWidth: 38 }}
                        title={`${c.start}–${c.end}`}
                      >
                        {c.start.slice(0, 2)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rooms.map((room) => (
                    <tr key={room.id} style={{ borderTop: "1px solid var(--border-soft)" }}>
                      <td
                        className="sticky left-0 z-1 px-2 py-1.5"
                        style={{
                          background: selRoomId === room.id ? "var(--surface-strong)" : "var(--surface)",
                          color: "var(--foreground)",
                        }}
                      >
                        <span className="font-medium">{room.name}</span>
                        <span className="ml-1 text-[10px]" style={{ color: "var(--muted-foreground, #9ca3af)" }}>
                          ({room.capacity})
                        </span>
                      </td>
                      {COLUMNS.map((c, colIdx) => {
                        const block = blockAt(room, c.start, c.end);
                        const selected = isSelected(room.id, colIdx);
                        const base =
                          "h-7 w-full cursor-pointer transition-colors";
                        let style: React.CSSProperties;
                        if (selected) {
                          style = { background: "var(--primary)" };
                        } else if (block) {
                          style = { background: "#fee2e2", cursor: "not-allowed" };
                        } else {
                          style = { background: "var(--surface)" };
                        }
                        return (
                          <td
                            key={c.start}
                            className="p-0 text-center align-middle"
                            style={{ borderLeft: "1px solid var(--border-soft)" }}
                          >
                            <button
                              type="button"
                              onClick={() => pickCell(room.id, colIdx)}
                              disabled={!!block || isLoadingRooms}
                              className={base}
                              style={style}
                              title={
                                block
                                  ? `${block.label} (${block.startTime}–${block.endTime})`
                                  : `${room.name} · ${c.start}–${c.end}`
                              }
                              aria-label={
                                block
                                  ? `${room.name} bận ${c.start} đến ${c.end}: ${block.label}`
                                  : `Chọn ${room.name} lúc ${c.start}`
                              }
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <p className="mt-2 flex items-center gap-1.5 text-[11px]" style={{ color: "var(--muted-foreground, #6b7280)" }}>
            <FaIcon icon={faCircleInfo} className="text-[10px]" />
            Bấm các ô trống trên cùng một phòng để chọn khung giờ liên tiếp.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass} style={labelStyle}>
              Giờ bắt đầu
            </label>
            <input
              type="time"
              value={onlineStart}
              onChange={(e) => setOnlineStart(e.target.value)}
              required
              className={fieldClass}
              style={fieldStyle}
            />
          </div>
          <div>
            <label className={labelClass} style={labelStyle}>
              Giờ kết thúc
            </label>
            <input
              type="time"
              value={onlineEnd}
              onChange={(e) => setOnlineEnd(e.target.value)}
              required
              className={fieldClass}
              style={fieldStyle}
            />
          </div>
        </div>
      )}

      {/* Ghi chú */}
      <div>
        <label className={labelClass} style={labelStyle}>
          Ghi chú
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="Nội dung buổi học, chuẩn bị, …"
          className={`${fieldClass} resize-none`}
          style={fieldStyle}
        />
      </div>

      {/* Tóm tắt + hành động */}
      <div
        className="flex flex-wrap items-center justify-between gap-3 rounded-lg px-4 py-3"
        style={{ background: "var(--surface-strong)", border: "1px solid var(--border-soft)" }}
      >
        <div className="text-sm">
          <span style={{ color: "var(--muted-foreground, #6b7280)" }}>Buổi #{sessionNumber} · </span>
          <span className="font-medium" style={{ color: "var(--foreground)" }}>{summary}</span>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-lg px-4 py-2 text-sm transition-colors hover:opacity-80"
            style={{ border: "1px solid var(--border-soft)", color: "var(--foreground)" }}
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-lg px-5 py-2 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50"
            style={{ background: "var(--primary)" }}
          >
            {isSaving ? "Đang lưu…" : "Thêm buổi học"}
          </button>
        </div>
      </div>
    </form>
  );
}
