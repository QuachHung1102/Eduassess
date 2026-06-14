"use client";

import { useRouter } from "next/navigation";
import { FaIcon } from "@/components/ui/FaIcon";
import { faChevronLeft, faChevronRight } from "@fortawesome/free-solid-svg-icons";

function shiftYmd(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function DateNav({ date }: { date: string }) {
  const router = useRouter();

  function go(value: string) {
    router.push(`/staff/rooms/schedule?date=${value}`);
  }

  const buttonStyle: React.CSSProperties = {
    border: "1px solid var(--border-soft)",
    color: "var(--foreground)",
    background: "var(--surface)",
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => go(shiftYmd(date, -1))}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-sm transition-colors hover:opacity-80"
        style={buttonStyle}
        aria-label="Ngày trước"
      >
        <FaIcon icon={faChevronLeft} />
      </button>
      <input
        type="date"
        value={date}
        onChange={(e) => e.target.value && go(e.target.value)}
        className="rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 transition"
        style={{ background: "var(--surface)", border: "1px solid var(--border-soft)", color: "var(--foreground)" }}
      />
      <button
        type="button"
        onClick={() => go(shiftYmd(date, 1))}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-sm transition-colors hover:opacity-80"
        style={buttonStyle}
        aria-label="Ngày sau"
      >
        <FaIcon icon={faChevronRight} />
      </button>
    </div>
  );
}
