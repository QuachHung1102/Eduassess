import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { can } from "@/lib/auth/permissions";
import { getAllStudentsFiltered, getSubjectsList } from "@/lib/classes/queries";
import {
  STUDENT_LEVELS,
  STUDENT_LEVEL_LABEL,
  STUDENT_LEVEL_COLOR,
} from "@/lib/constants/labels";
import { FaIcon } from "@/components/ui/FaIcon";
import { faUserGraduate } from "@fortawesome/free-solid-svg-icons";

export const dynamic = "force-dynamic";

const inputCls =
  "px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

export default async function AllStudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; subjectId?: string; level?: string }>;
}) {
  const user = (await auth())?.user;
  if (!user || !(await can(user, "student.view_all"))) redirect("/staff");

  const { q = "", subjectId = "", level = "" } = await searchParams;
  const [students, subjects] = await Promise.all([
    getAllStudentsFiltered({ q, subjectId, level }),
    getSubjectsList(),
  ]);

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="shrink-0">
        <div className="mb-1 flex items-center gap-2">
          <span className="text-xl text-blue-600">
            <FaIcon icon={faUserGraduate} />
          </span>
          <h1 className="text-2xl font-bold text-gray-900">Tất cả học sinh</h1>
        </div>
        <p className="text-sm text-gray-500">
          Tìm và lọc toàn bộ học sinh để mở hồ sơ và đánh giá năng lực.
        </p>
      </div>

      {/* Filter bar (GET) */}
      <form method="get" className="shrink-0 flex flex-wrap items-end gap-2">
        <div className="flex flex-col">
          <label className="mb-1 text-xs font-medium text-gray-600">Tìm theo tên / email</label>
          <input name="q" defaultValue={q} placeholder="Nhập tên, email hoặc mã…" className={`${inputCls} w-64`} />
        </div>
        <div className="flex flex-col">
          <label className="mb-1 text-xs font-medium text-gray-600">Môn</label>
          <select name="subjectId" defaultValue={subjectId} className={inputCls}>
            <option value="">-- Mọi môn --</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col">
          <label className="mb-1 text-xs font-medium text-gray-600">Mức (theo môn đã chọn)</label>
          <select name="level" defaultValue={level} className={inputCls}>
            <option value="">-- Mọi mức --</option>
            {STUDENT_LEVELS.map((lv) => (
              <option key={lv} value={lv}>{STUDENT_LEVEL_LABEL[lv]}</option>
            ))}
            <option value="UNASSESSED">Chưa đánh giá</option>
          </select>
        </div>
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Lọc
        </button>
        {(q || subjectId || level) && (
          <Link href="/staff/students/all" className="px-3 py-2 text-sm text-gray-500 hover:underline">
            Xóa lọc
          </Link>
        )}
      </form>

      <p className="shrink-0 text-xs text-gray-400">{students.length} học sinh</p>

      <div className="flex-1 min-h-0 overflow-auto">
        {students.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-gray-400">
            <FaIcon icon={faUserGraduate} className="text-4xl" />
            <p className="text-sm">Không có học sinh nào khớp bộ lọc.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100 sticky top-0">
                <tr>
                  {["Học sinh", "Mã", "Năng lực theo môn", "CBĐT phụ trách", ""].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {students.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{s.name ?? s.email}</p>
                      <p className="text-xs text-gray-400">{s.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-gray-600">{s.code ?? "—"}</span>
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
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {s.advisors.length > 0 ? s.advisors.join(", ") : <span className="text-gray-300">Chưa phân</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/staff/students/${s.id}`}
                        className="px-3 py-1.5 text-xs font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
                      >
                        Mở &amp; đánh giá
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
