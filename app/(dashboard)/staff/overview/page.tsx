import Link from "next/link";
import { getMyStudentsOverview } from "@/lib/classes/queries";
import { requirePageSession } from "@/lib/auth/page-guard";
import { STUDENT_LEVEL_LABEL, STUDENT_LEVEL_COLOR } from "@/lib/constants/labels";
import { FaIcon } from "@/components/ui/FaIcon";
import { faChartLine, faUserGraduate } from "@fortawesome/free-solid-svg-icons";

export const dynamic = "force-dynamic";

function attendancePct(a: { present: number; total: number }): string {
  if (a.total === 0) return "—";
  return `${Math.round((a.present / a.total) * 100)}%`;
}

export default async function StaffOverviewPage() {
  await requirePageSession();
  const students = await getMyStudentsOverview();

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="shrink-0">
        <div className="mb-1 flex items-center gap-2">
          <span className="text-xl" style={{ color: "var(--primary)" }}>
            <FaIcon icon={faChartLine} />
          </span>
          <h1 className="text-2xl font-bold text-gray-900">Tiến độ học sinh</h1>
        </div>
        <p className="text-sm text-gray-500">
          {students.length} học sinh được phân cho bạn · mức năng lực, điểm danh và đánh giá theo buổi.
        </p>
      </div>

      {students.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-gray-400">
          <FaIcon icon={faUserGraduate} className="text-4xl" />
          <p className="text-sm">Chưa có học sinh nào được phân cho bạn.</p>
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-auto">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100 sticky top-0">
                <tr>
                  {["Học sinh", "Năng lực theo môn", "Điểm danh", "TB đánh giá buổi", "Lớp đang học"].map((h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {students.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <Link
                        href={`/staff/students/${s.id}`}
                        className="font-medium text-gray-900 hover:text-blue-600"
                      >
                        {s.name ?? s.email}
                      </Link>
                      <p className="text-xs text-gray-400">{s.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      {s.levels.length === 0 ? (
                        <span className="text-xs text-amber-500">Chưa đánh giá</span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {s.levels.map((lv) => (
                            <span
                              key={lv.subject}
                              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                STUDENT_LEVEL_COLOR[lv.level] ?? "bg-gray-100 text-gray-600"
                              }`}
                            >
                              {lv.subject}: {STUDENT_LEVEL_LABEL[lv.level] ?? lv.level}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {attendancePct(s.attendance)}
                      {s.attendance.total > 0 && (
                        <span className="ml-1 text-xs text-gray-400">
                          ({s.attendance.present}/{s.attendance.total})
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {s.evalAvg !== null ? (
                        <span>
                          {s.evalAvg.toFixed(1)}
                          <span className="text-xs text-gray-400">/5</span>
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{s.activeClassCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
