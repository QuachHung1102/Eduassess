import {
  STUDENT_LEVELS,
  STUDENT_LEVEL_LABEL,
  STUDENT_LEVEL_HEX,
} from "@/lib/constants/labels";

/**
 * Biểu đồ quỹ đạo năng lực theo môn (C2). Dữ liệu `StudentSubjectLevel` đã lưu
 * lịch sử (`evaluatedAt`); component gom theo môn, sắp tăng dần thời gian rồi vẽ
 * line-chart nhỏ (SVG thuần, không lib) cho thấy HS đi WEAK→AVERAGE→GOOD→EXCELLENT.
 * Component thuần render (không state) → dùng được cả phía CBĐT lẫn Phụ huynh.
 */
type LevelPoint = {
  level: string;
  evaluatedAt: Date | string;
  subject: { id: string; name: string };
};

const SHORT_LABEL: Record<string, string> = {
  WEAK: "Yếu",
  AVERAGE: "TB",
  GOOD: "Khá",
  EXCELLENT: "XS",
};

// Hệ toạ độ viewBox — co giãn theo bề rộng container, giữ tỉ lệ (meet).
const W = 320;
const H = 96;
const M = { left: 30, right: 12, top: 10, bottom: 20 };
const PLOT_W = W - M.left - M.right;
const PLOT_H = H - M.top - M.bottom;
const LAST = STUDENT_LEVELS.length - 1;

/** y theo chỉ số mức (0 = WEAK dưới cùng … 3 = EXCELLENT trên cùng). */
function levelY(levelIdx: number): number {
  return M.top + ((LAST - levelIdx) / LAST) * PLOT_H;
}

function levelIndex(level: string): number {
  const i = STUDENT_LEVELS.indexOf(level as (typeof STUDENT_LEVELS)[number]);
  return i < 0 ? 0 : i;
}

function fmtDate(d: Date | string): string {
  return new Date(d).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

export function ProficiencyTrend({ levelHistory }: { levelHistory: LevelPoint[] }) {
  // Gom theo môn; sắp các mốc TĂNG dần theo thời gian đánh giá.
  const bySubject = new Map<string, { name: string; points: { level: string; at: Date }[] }>();
  for (const lv of levelHistory) {
    const g = bySubject.get(lv.subject.id) ?? { name: lv.subject.name, points: [] };
    g.points.push({ level: lv.level, at: new Date(lv.evaluatedAt) });
    bySubject.set(lv.subject.id, g);
  }
  for (const g of bySubject.values()) {
    g.points.sort((a, b) => a.at.getTime() - b.at.getTime());
  }
  const subjects = [...bySubject.values()].sort((a, b) => a.name.localeCompare(b.name, "vi"));

  if (subjects.length === 0) {
    return <p className="text-xs text-foreground/45">Chưa có dữ liệu năng lực</p>;
  }

  return (
    <div className="space-y-5">
      {subjects.map((s) => {
        const pts = s.points;
        const n = pts.length;
        const latest = pts[n - 1];
        const xOf = (i: number) => (n > 1 ? M.left + (i / (n - 1)) * PLOT_W : M.left + PLOT_W / 2);
        const coords = pts.map((p, i) => ({
          x: xOf(i),
          y: levelY(levelIndex(p.level)),
          level: p.level,
          at: p.at,
        }));
        const polyline = coords.map((c) => `${c.x},${c.y}`).join(" ");

        return (
          <div key={s.name}>
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="truncate text-sm font-medium text-foreground">{s.name}</span>
              <span
                className="shrink-0 text-xs font-semibold"
                style={{ color: STUDENT_LEVEL_HEX[latest.level] ?? "#64748b" }}
              >
                {STUDENT_LEVEL_LABEL[latest.level] ?? latest.level}
              </span>
            </div>
            <svg
              viewBox={`0 0 ${W} ${H}`}
              preserveAspectRatio="xMidYMid meet"
              className="h-auto w-full"
              role="img"
              aria-label={`Quỹ đạo năng lực môn ${s.name}: ${pts
                .map((p) => STUDENT_LEVEL_LABEL[p.level] ?? p.level)
                .join(" → ")}`}
            >
              {/* Lưới + nhãn 4 mức */}
              {STUDENT_LEVELS.map((lvl, idx) => {
                const y = levelY(idx);
                return (
                  <g key={lvl} className="text-foreground/40">
                    <line
                      x1={M.left}
                      y1={y}
                      x2={W - M.right}
                      y2={y}
                      stroke="currentColor"
                      strokeWidth={0.5}
                      opacity={0.35}
                    />
                    <text x={M.left - 5} y={y + 3} textAnchor="end" fill="currentColor" fontSize={9}>
                      {SHORT_LABEL[lvl] ?? lvl}
                    </text>
                  </g>
                );
              })}

              {/* Đường nối quỹ đạo (chỉ khi ≥2 mốc) */}
              {n > 1 && (
                <polyline
                  points={polyline}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  className="text-primary"
                />
              )}

              {/* Điểm từng lần đánh giá (màu theo mức) */}
              {coords.map((c, i) => (
                <circle key={i} cx={c.x} cy={c.y} r={3.5} fill={STUDENT_LEVEL_HEX[c.level] ?? "#64748b"}>
                  <title>{`${STUDENT_LEVEL_LABEL[c.level] ?? c.level} · ${fmtDate(c.at)}`}</title>
                </circle>
              ))}

              {/* Nhãn ngày */}
              <g className="text-foreground/40" fill="currentColor" fontSize={9}>
                {n > 1 ? (
                  <>
                    <text x={M.left} y={H - 5} textAnchor="start">
                      {fmtDate(pts[0].at)}
                    </text>
                    <text x={W - M.right} y={H - 5} textAnchor="end">
                      {fmtDate(latest.at)}
                    </text>
                  </>
                ) : (
                  <text x={M.left + PLOT_W / 2} y={H - 5} textAnchor="middle">
                    {fmtDate(latest.at)}
                  </text>
                )}
              </g>
            </svg>
          </div>
        );
      })}
    </div>
  );
}
