type Tally = { present: number; late: number; absent: number; excused: number; total: number };

const SEG = [
  { key: "present", label: "Có mặt", color: "#22c55e" },
  { key: "late", label: "Đi muộn", color: "#eab308" },
  { key: "absent", label: "Vắng", color: "#ef4444" },
  { key: "excused", label: "Có phép", color: "#94a3b8" },
] as const;

const R = 42;
const C = 50;
const STROKE = 16;
const CIRC = 2 * Math.PI * R;

/** Donut tỉ lệ điểm danh 4 trạng thái; tâm hiển thị % có mặt (PRESENT+LATE). */
export function AttendanceDonut({ tally }: { tally: Tally }) {
  if (tally.total === 0) {
    return <p className="text-xs text-foreground/45">Chưa có dữ liệu điểm danh</p>;
  }
  const rate = Math.round(((tally.present + tally.late) / tally.total) * 100);
  const arcs = SEG.map((s, i) => {
    const dash = (tally[s.key] / tally.total) * CIRC;
    // offset = tổng các cung đứng trước (tính thuần, không mutate biến ngoài render).
    const offset = SEG.slice(0, i).reduce((sum, prev) => sum + (tally[prev.key] / tally.total) * CIRC, 0);
    return (
      <circle
        key={s.key}
        cx={C}
        cy={C}
        r={R}
        fill="none"
        stroke={s.color}
        strokeWidth={STROKE}
        strokeDasharray={`${dash} ${CIRC - dash}`}
        strokeDashoffset={-offset}
        transform={`rotate(-90 ${C} ${C})`}
      />
    );
  });

  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 100 100" className="h-28 w-28 shrink-0" role="img" aria-label={`Tỉ lệ có mặt ${rate}%`}>
        {arcs}
        <text x={C} y={C - 2} textAnchor="middle" fontSize={18} fontWeight={700} fill="currentColor" className="text-foreground">{rate}%</text>
        <text x={C} y={C + 12} textAnchor="middle" fontSize={8} fill="currentColor" className="text-foreground/50">có mặt</text>
      </svg>
      <ul className="space-y-1 text-xs">
        {SEG.map((s) => (
          <li key={s.key} className="flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
            <span className="text-foreground/70">{s.label}</span>
            <span className="font-medium text-foreground">{tally[s.key]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
