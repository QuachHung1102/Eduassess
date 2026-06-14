import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { can } from "@/lib/auth/permissions";
import { getTeachersWithAvailabilityCount } from "@/lib/classes/queries";
import { FaIcon } from "@/components/ui/FaIcon";
import { faChalkboardUser } from "@fortawesome/free-solid-svg-icons";

export const dynamic = "force-dynamic";

export default async function StaffTeachersPage() {
  const user = (await auth())?.user;
  if (!user || !(await can(user, "class.create"))) redirect("/staff");

  const teachers = await getTeachersWithAvailabilityCount();

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="shrink-0">
        <div className="mb-1 flex items-center gap-2">
          <span className="text-xl text-blue-600">
            <FaIcon icon={faChalkboardUser} />
          </span>
          <h1 className="text-2xl font-bold text-gray-900">Giáo viên</h1>
        </div>
        <p className="text-sm text-gray-500">
          Xem và khai lịch rảnh hộ giáo viên để hỗ trợ xếp lớp.
        </p>
      </div>

      {teachers.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-gray-400">
          <FaIcon icon={faChalkboardUser} className="text-4xl" />
          <p className="text-sm">Chưa có giáo viên nào.</p>
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-auto">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100 sticky top-0">
                <tr>
                  {["Giáo viên", "Lịch rảnh đã khai", ""].map((h) => (
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
                {teachers.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{t.name ?? t.email}</p>
                      <p className="text-xs text-gray-400">{t.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      {t.declaredSlots > 0 ? (
                        <span className="text-gray-700">{t.declaredSlots} khung giờ</span>
                      ) : (
                        <span className="text-xs text-amber-500">Chưa khai lịch</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/staff/teachers/${t.id}`}
                        className="px-3 py-1.5 text-xs font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
                      >
                        Xem / sửa lịch
                      </Link>
                    </td>
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
