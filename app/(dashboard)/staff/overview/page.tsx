import Link from "next/link";
import { getMyStudentsOverview } from "@/lib/classes/queries";
import { requirePageSession } from "@/lib/auth/page-guard";
import { STUDENT_LEVEL_LABEL, STUDENT_LEVEL_COLOR } from "@/lib/constants/labels";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { FaIcon } from "@/components/ui/FaIcon";
import {
  faChartLine,
  faUserGraduate,
  faClipboardCheck,
  faCalendarCheck,
  faStar,
} from "@fortawesome/free-solid-svg-icons";

export const dynamic = "force-dynamic";

function pct(present: number, total: number): string {
  if (total === 0) return "—";
  return `${Math.round((present / total) * 100)}%`;
}

const mutedText = "color-mix(in srgb, var(--foreground) 60%, transparent)";

export default async function StaffOverviewPage() {
  await requirePageSession();
  const students = await getMyStudentsOverview();

  // Thống kê tổng quan cho dải đầu trang (tận dụng chiều rộng màn lớn).
  const evaluated = students.filter((s) => s.levels.length > 0).length;
  const att = students.reduce(
    (acc, s) => ({ present: acc.present + s.attendance.present, total: acc.total + s.attendance.total }),
    { present: 0, total: 0 },
  );
  const evalScores = students.map((s) => s.evalAvg).filter((v): v is number => v !== null);
  const evalAvg = evalScores.length
    ? (evalScores.reduce((a, b) => a + b, 0) / evalScores.length).toFixed(1)
    : "—";

  return (
    <div className="flex flex-col gap-4 sm:gap-6 h-full">
      <PageHeader
        icon={faChartLine}
        title="Tiến độ học sinh"
        subtitle={`${students.length} học sinh được phân cho bạn · mức năng lực, điểm danh và đánh giá theo buổi.`}
      />

      {students.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3" style={{ color: mutedText }}>
          <FaIcon icon={faUserGraduate} className="text-4xl" />
          <p className="text-sm">Chưa có học sinh nào được phân cho bạn.</p>
        </div>
      ) : (
        <>
          {/* Dải thống kê — 2 cột mobile → 4 cột từ md, lấp khoảng trống màn lớn */}
          <div className="shrink-0 grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard icon={faUserGraduate} value={students.length} label="Tổng học sinh" />
            <StatCard icon={faClipboardCheck} value={`${evaluated}/${students.length}`} label="Đã đánh giá năng lực" />
            <StatCard icon={faCalendarCheck} value={pct(att.present, att.total)} label="Điểm danh chung" />
            <StatCard icon={faStar} value={evalAvg === "—" ? "—" : `${evalAvg}/5`} label="TB đánh giá buổi" />
          </div>

          <div className="flex-1 min-h-0 overflow-auto">
            {/* ── md+ : bảng ───────────────────────────────── */}
            <div className="clay-card hidden overflow-hidden p-0 md:block">
              <table className="w-full text-sm">
                <thead
                  className="sticky top-0"
                  style={{ background: "color-mix(in srgb, var(--foreground) 5%, var(--surface-strong))" }}
                >
                  <tr>
                    {["Học sinh", "Năng lực theo môn", "Điểm danh", "TB đánh giá buổi", "Lớp đang học"].map((h) => (
                      <th
                        key={h}
                        className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wide"
                        style={{ color: mutedText }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody style={{ color: "var(--foreground)" }}>
                  {students.map((s) => (
                    <tr
                      key={s.id}
                      className="transition-colors hover:bg-[color-mix(in_srgb,var(--foreground)_4%,transparent)]"
                      style={{ borderTop: "1px solid var(--border-soft)" }}
                    >
                      <td className="px-4 py-3">
                        <Link href={`/staff/students/${s.id}`} className="font-medium hover:underline" style={{ color: "var(--primary)" }}>
                          {s.name ?? s.email}
                        </Link>
                        <p className="text-xs" style={{ color: mutedText }}>{s.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <SubjectLevels levels={s.levels} />
                      </td>
                      <td className="px-4 py-3">
                        {pct(s.attendance.present, s.attendance.total)}
                        {s.attendance.total > 0 && (
                          <span className="ml-1 text-xs" style={{ color: mutedText }}>
                            ({s.attendance.present}/{s.attendance.total})
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {s.evalAvg !== null ? (
                          <span>
                            {s.evalAvg.toFixed(1)}
                            <span className="text-xs" style={{ color: mutedText }}>/5</span>
                          </span>
                        ) : (
                          <span style={{ color: mutedText }}>—</span>
                        )}
                      </td>
                      <td className="px-4 py-3" style={{ color: mutedText }}>{s.activeClassCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ── mobile : danh sách thẻ ───────────────────── */}
            <div className="space-y-2 md:hidden">
              {students.map((s) => (
                <Link
                  key={s.id}
                  href={`/staff/students/${s.id}`}
                  className="clay-card hover-card-soft press-feedback-soft block p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium truncate" style={{ color: "var(--foreground)" }}>{s.name ?? s.email}</p>
                      <p className="text-xs truncate" style={{ color: mutedText }}>{s.email}</p>
                    </div>
                    <span className="shrink-0 text-xs" style={{ color: mutedText }}>{s.activeClassCount} lớp</span>
                  </div>
                  <div className="mt-2">
                    <SubjectLevels levels={s.levels} />
                  </div>
                  <div className="mt-2 flex gap-4 text-xs" style={{ color: mutedText }}>
                    <span>
                      Điểm danh: <strong style={{ color: "var(--foreground)" }}>{pct(s.attendance.present, s.attendance.total)}</strong>
                    </span>
                    <span>
                      Đánh giá: <strong style={{ color: "var(--foreground)" }}>{s.evalAvg !== null ? `${s.evalAvg.toFixed(1)}/5` : "—"}</strong>
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function SubjectLevels({ levels }: { levels: { subject: string; level: string }[] }) {
  if (levels.length === 0) {
    return <span className="text-xs" style={{ color: "color-mix(in srgb, #f59e0b 90%, transparent)" }}>Chưa đánh giá</span>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {levels.map((lv) => {
        const color = STUDENT_LEVEL_COLOR[lv.level as keyof typeof STUDENT_LEVEL_COLOR];
        const label = STUDENT_LEVEL_LABEL[lv.level as keyof typeof STUDENT_LEVEL_LABEL];
        return (
          <span
            key={lv.subject}
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${color ?? "bg-gray-100 text-gray-600"}`}
          >
            {lv.subject}: {label ?? lv.level}
          </span>
        );
      })}
    </div>
  );
}
