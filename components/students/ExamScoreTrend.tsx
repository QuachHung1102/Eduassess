import { STUDENT_LEVEL_HEX } from "@/lib/constants/labels";
import { scoreToLevel } from "@/lib/students/analytics";

type Point = { score: number; submittedAt: Date | string; title: string; kind: "EXAM" | "QUIZ" };

const W = 320;
const H = 120;
const M = { left: 30, right: 12, top: 10, bottom: 22 };
const PW = W - M.left - M.right;
const PH = H - M.top - M.bottom;
const Y_TICKS = [0, 25, 50, 75, 100];

function fmt(d: Date | string): string {
  return new Date(d).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

/** Đường điểm bài kiểm tra (0–100) theo thời gian nộp; điểm tô màu theo mức năng lực. */
export function ExamScoreTrend({ points }: { points: Point[] }) {
  if (points.length === 0) {
    return <p className="text-xs text-foreground/45">Chưa có bài kiểm tra đã chấm</p>;
  }
  const pts = [...points].sort((a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime());
  const n = pts.length;
  const xOf = (i: number) => (n > 1 ? M.left + (i / (n - 1)) * PW : M.left + PW / 2);
  const yOf = (score: number) => M.top + (1 - score / 100) * PH;
  const coords = pts.map((p, i) => ({ x: xOf(i), y: yOf(p.score), p }));
  const polyline = coords.map((c) => `${c.x},${c.y}`).join(" ");

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid meet"
      className="h-auto w-full"
      role="img"
      aria-label={`Điểm bài kiểm tra: ${pts.map((p) => `${p.title} ${p.score}`).join(", ")}`}
    >
      {Y_TICKS.map((t) => {
        const y = yOf(t);
        return (
          <g key={t} className="text-foreground/40">
            <line x1={M.left} y1={y} x2={W - M.right} y2={y} stroke="currentColor" strokeWidth={0.5} opacity={0.35} />
            <text x={M.left - 5} y={y + 3} textAnchor="end" fill="currentColor" fontSize={9}>{t}</text>
          </g>
        );
      })}

      {n > 1 && (
        <polyline points={polyline} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" className="text-primary" />
      )}

      {coords.map((c, i) => (
        <circle key={i} cx={c.x} cy={c.y} r={3.5} fill={STUDENT_LEVEL_HEX[scoreToLevel(c.p.score)]}>
          <title>{`${c.p.title} · ${c.p.score} điểm · ${fmt(c.p.submittedAt)}`}</title>
        </circle>
      ))}

      <g className="text-foreground/40" fill="currentColor" fontSize={9}>
        {n > 1 ? (
          <>
            <text x={M.left} y={H - 6} textAnchor="start">{fmt(pts[0].submittedAt)}</text>
            <text x={W - M.right} y={H - 6} textAnchor="end">{fmt(pts[n - 1].submittedAt)}</text>
          </>
        ) : (
          <text x={M.left + PW / 2} y={H - 6} textAnchor="middle">{fmt(pts[0].submittedAt)}</text>
        )}
      </g>
    </svg>
  );
}
