import Link from "next/link";
import { getRoomUsageForDate } from "@/lib/classes/queries";
import type { RoomOccupancyBlock, RoomUsageForDate } from "@/lib/classes/queries";
import {
  AVAILABILITY_DIGITAL_SLOT_META,
  AVAILABILITY_DIGITAL_TIME_SLOTS,
} from "@/lib/availability/time-slots";
import { FaIcon } from "@/components/ui/FaIcon";
import { faDoorOpen } from "@fortawesome/free-solid-svg-icons";
import { DateNav } from "./DateNav";

const COLUMNS = AVAILABILITY_DIGITAL_TIME_SLOTS.map((slot) => AVAILABILITY_DIGITAL_SLOT_META[slot]);

function overlaps(block: RoomOccupancyBlock, start: string, end: string): boolean {
  return block.startTime < end && block.endTime > start;
}

function blockAt(room: RoomUsageForDate, start: string, end: string): RoomOccupancyBlock | null {
  return room.blocks.find((b) => overlaps(b, start, end)) ?? null;
}

function formatDateLabel(ymd: string): string {
  return new Date(`${ymd}T00:00:00`).toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default async function RoomScheduleOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date: dateParam } = await searchParams;
  const today = new Date().toISOString().split("T")[0];
  const date = dateParam || today;

  const rooms = await getRoomUsageForDate(date);

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="shrink-0 flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/staff/rooms" className="text-sm hover:underline" style={{ color: "var(--primary)" }}>
            ← Danh sách phòng
          </Link>
          <h1 className="mt-2 text-2xl font-bold" style={{ color: "var(--foreground)" }}>
            Lịch sử dụng phòng
          </h1>
          <p className="mt-1 text-sm capitalize" style={{ color: "var(--muted-foreground, #6b7280)" }}>
            {formatDateLabel(date)}
          </p>
        </div>
        <DateNav date={date} />
      </div>

      {rooms.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3" style={{ color: "var(--muted-foreground, #6b7280)" }}>
          <FaIcon icon={faDoorOpen} className="text-4xl" />
          <p className="text-sm">Chưa có phòng nào đang hoạt động</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4 flex-1 overflow-auto pb-4">
          {/* Legend */}
          <div className="flex flex-wrap items-center gap-3 text-[11px]" style={{ color: "var(--muted-foreground, #6b7280)" }}>
            <span className="flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded-sm" style={{ background: "var(--surface)", border: "1px solid var(--border-soft)" }} />
              Trống
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded-sm bg-red-100" style={{ border: "1px solid #fecaca" }} />
              Buổi học
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded-sm bg-blue-100" style={{ border: "1px solid #bfdbfe" }} />
              Đặt phòng
            </span>
          </div>

          {/* Grid */}
          <div className="relative overflow-x-auto rounded-xl themed-scrollbar" style={{ border: "1px solid var(--border-soft)" }}>
            <table className="w-full border-collapse text-[11px]">
              <thead>
                <tr>
                  <th
                    className="sticky left-0 z-1 px-2 py-1.5 text-left font-semibold"
                    style={{ background: "var(--surface-strong)", color: "var(--foreground)", minWidth: 140 }}
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
                      style={{ background: "var(--surface)", color: "var(--foreground)" }}
                    >
                      <span className="font-medium">{room.name}</span>
                      <span className="ml-1 text-[10px]" style={{ color: "var(--muted-foreground, #9ca3af)" }}>
                        ({room.capacity})
                      </span>
                    </td>
                    {COLUMNS.map((c) => {
                      const block = blockAt(room, c.start, c.end);
                      let style: React.CSSProperties;
                      if (!block) {
                        style = { background: "var(--surface)" };
                      } else if (block.source === "CLASS_SESSION") {
                        style = { background: "#fee2e2" };
                      } else {
                        style = { background: "#dbeafe" };
                      }
                      return (
                        <td
                          key={c.start}
                          className="p-0 text-center align-middle"
                          style={{ borderLeft: "1px solid var(--border-soft)" }}
                        >
                          <div
                            className="h-7 w-full"
                            style={style}
                            title={
                              block
                                ? `${block.label} (${block.startTime}–${block.endTime})`
                                : `${room.name} · ${c.start}–${c.end}: trống`
                            }
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Chi tiết theo phòng */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {rooms
              .filter((room) => room.blocks.length > 0)
              .map((room) => (
                <div
                  key={room.id}
                  className="rounded-xl p-3"
                  style={{ background: "var(--surface)", border: "1px solid var(--border-soft)" }}
                >
                  <p className="mb-2 text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                    {room.name}
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {[...room.blocks]
                      .sort((a, b) => a.startTime.localeCompare(b.startTime))
                      .map((b, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs"
                          style={{ background: b.source === "CLASS_SESSION" ? "#fef2f2" : "#eff6ff" }}
                        >
                          <span className="font-medium" style={{ color: b.source === "CLASS_SESSION" ? "#b91c1c" : "#1d4ed8" }}>
                            {b.startTime}–{b.endTime}
                          </span>
                          <span className="ml-2 truncate" style={{ color: "var(--muted-foreground, #6b7280)" }}>
                            {b.label}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
