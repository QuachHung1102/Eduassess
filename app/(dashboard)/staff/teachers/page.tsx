import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { can } from "@/lib/auth/permissions";
import { getTeachersWithAvailabilityCount } from "@/lib/classes/queries";
import { PageHeader } from "@/components/layout/PageHeader";
import { FaIcon } from "@/components/ui/FaIcon";
import { faChalkboardUser } from "@fortawesome/free-solid-svg-icons";

export const dynamic = "force-dynamic";

const mutedText = "color-mix(in srgb, var(--foreground) 60%, transparent)";

export default async function StaffTeachersPage() {
  const user = (await auth())?.user;
  if (!user || !(await can(user, "class.create"))) redirect("/staff");

  const teachers = await getTeachersWithAvailabilityCount();

  return (
    <div className="flex flex-col gap-4 sm:gap-6 h-full">
      <PageHeader
        icon={faChalkboardUser}
        title="Giáo viên"
        subtitle="Xem và khai lịch rảnh hộ giáo viên để hỗ trợ xếp lớp."
      />

      {teachers.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3" style={{ color: mutedText }}>
          <FaIcon icon={faChalkboardUser} className="text-4xl" />
          <p className="text-sm">Chưa có giáo viên nào.</p>
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-auto">
          {/* md+ : bảng */}
          <div className="clay-card hidden overflow-hidden p-0 md:block">
            <table className="w-full text-sm">
              <thead
                className="sticky top-0"
                style={{ background: "color-mix(in srgb, var(--foreground) 5%, var(--surface-strong))" }}
              >
                <tr>
                  {["Giáo viên", "Lịch rảnh đã khai", ""].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wide" style={{ color: mutedText }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody style={{ color: "var(--foreground)" }}>
                {teachers.map((t) => (
                  <tr
                    key={t.id}
                    className="transition-colors hover:bg-[color-mix(in_srgb,var(--foreground)_4%,transparent)]"
                    style={{ borderTop: "1px solid var(--border-soft)" }}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium">{t.name ?? t.email}</p>
                      <p className="text-xs" style={{ color: mutedText }}>{t.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      {t.declaredSlots > 0 ? (
                        <span>{t.declaredSlots} khung giờ</span>
                      ) : (
                        <span className="text-xs" style={{ color: "color-mix(in srgb, #f59e0b 90%, transparent)" }}>Chưa khai lịch</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/staff/teachers/${t.id}`}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors hover:bg-[color-mix(in_srgb,var(--primary)_12%,transparent)]"
                        style={{ color: "var(--primary)", border: "1px solid color-mix(in srgb, var(--primary) 35%, transparent)" }}
                      >
                        Xem / sửa lịch
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* mobile : thẻ */}
          <div className="space-y-2 md:hidden">
            {teachers.map((t) => (
              <Link key={t.id} href={`/staff/teachers/${t.id}`} className="clay-card hover-card-soft press-feedback-soft block p-4">
                <p className="font-medium" style={{ color: "var(--foreground)" }}>{t.name ?? t.email}</p>
                <p className="text-xs" style={{ color: mutedText }}>{t.email}</p>
                <p className="mt-2 text-xs" style={{ color: mutedText }}>
                  {t.declaredSlots > 0 ? `${t.declaredSlots} khung giờ đã khai` : "Chưa khai lịch"}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
