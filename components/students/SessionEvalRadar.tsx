type Dims = { performance: number | null; diligence: number | null; comprehension: number | null };

const AXES = [
  { key: "performance", label: "Năng lực" },
  { key: "diligence", label: "Chuyên cần" },
  { key: "comprehension", label: "Tiếp thu" },
] as const;

const CX = 60;
const CY = 60;
const RADIUS = 38;
const MAXV = 5;

function axisAngle(i: number): number {
  return -Math.PI / 2 + (i * 2 * Math.PI) / 3;
}
function point(i: number, value: number): { x: number; y: number } {
  const r = (value / MAXV) * RADIUS;
  const a = axisAngle(i);
  return { x: CX + r * Math.cos(a), y: CY + r * Math.sin(a) };
}

/** Radar tam giác 3 chiều đánh giá-buổi (thang 1–5). Chiều null vẽ về tâm + ghi "—". */
export function SessionEvalRadar({ dims }: { dims: Dims }) {
  const values = AXES.map((ax) => dims[ax.key]);
  if (values.every((v) => v == null)) {
    return <p className="text-xs text-foreground/45">Chưa có đánh giá sau buổi học</p>;
  }
  const dataPts = AXES.map((_, i) => point(i, values[i] ?? 0));
  const polygon = dataPts.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <div className="flex flex-col items-center">
      <svg
        viewBox="0 0 120 120"
        className="h-36 w-36"
        role="img"
        aria-label={`Đánh giá buổi học: ${AXES.map((ax, i) => `${ax.label} ${values[i] ?? "—"}`).join(", ")}`}
      >
        {[1, 2, 3, 4, 5].map((lvl) => {
          const ring = AXES.map((_, i) => point(i, lvl)).map((p) => `${p.x},${p.y}`).join(" ");
          return <polygon key={lvl} points={ring} fill="none" stroke="currentColor" strokeWidth={0.4} opacity={0.3} className="text-foreground/40" />;
        })}

        {AXES.map((ax, i) => {
          const tip = point(i, MAXV);
          const lp = point(i, MAXV + 1.15);
          return (
            <g key={ax.key} className="text-foreground/60">
              <line x1={CX} y1={CY} x2={tip.x} y2={tip.y} stroke="currentColor" strokeWidth={0.4} opacity={0.4} />
              <text x={lp.x} y={lp.y} textAnchor="middle" dominantBaseline="middle" fontSize={7.5} fill="currentColor">{ax.label}</text>
            </g>
          );
        })}

        <polygon points={polygon} fill="#6366f1" fillOpacity={0.25} stroke="#6366f1" strokeWidth={1.2} />
        {dataPts.map((p, i) => (values[i] != null ? <circle key={i} cx={p.x} cy={p.y} r={2} fill="#6366f1" /> : null))}
      </svg>
      <div className="mt-1 flex gap-3 text-[11px] text-foreground/60">
        {AXES.map((ax, i) => (
          <span key={ax.key}>{ax.label}: <span className="font-medium text-foreground">{values[i] != null ? values[i]!.toFixed(1) : "—"}</span></span>
        ))}
      </div>
    </div>
  );
}
