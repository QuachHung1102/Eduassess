import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import Link from "next/link";
import { FaIcon } from "@/components/ui/FaIcon";
import { faChildren, faCalendarDay, faGraduationCap } from "@fortawesome/free-solid-svg-icons";

const RELATION_LABEL: Record<string, string> = {
  FATHER:   "Bố",
  MOTHER:   "Mẹ",
  GUARDIAN: "Người giám hộ",
  OTHER:    "Khác",
};

export default async function ParentDashboard() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const links = await prisma.parentStudent.findMany({
    where: { parentId: session.user.id },
    select: {
      relation: true,
      isPrimary: true,
      student: { select: { id: true, name: true, email: true, dateOfBirth: true } },
    },
  });

  return (
    <div className="flex flex-col h-full gap-6">
      <div className="shrink-0">
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Xin chào, {session.user.name}</h1>
        <p className="text-sm text-[var(--foreground)]/60 mt-1">Theo dõi lịch học và tiến trình của con bạn.</p>
      </div>

      <div className="flex-1 overflow-auto">
        {links.length === 0 ? (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-sm text-amber-800">
            Tài khoản của bạn chưa được liên kết với học sinh nào. Vui lòng liên hệ trung tâm.
          </div>
        ) : (
          <div className="space-y-6">
            <section>
              <h2 className="font-semibold text-[var(--foreground)] mb-2 flex items-center gap-2">
                <FaIcon icon={faChildren} className="text-teal-600" />
                Con tôi
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {links.map((l) => (
                  <div
                    key={l.student.id}
                  className="clay-card p-4"
                >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-[var(--foreground)]">{l.student.name}</div>
                        <div className="text-xs text-[var(--foreground)]/60">{l.student.email}</div>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-teal-100 text-teal-700">
                        {RELATION_LABEL[l.relation] ?? l.relation}
                        {l.isPrimary && " · Chính"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="font-semibold text-[var(--foreground)] mb-2 flex items-center gap-2">
                <FaIcon icon={faCalendarDay} className="text-blue-600" />
                Truy cập nhanh
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Link
                  href="/parent/schedule"
                  className="clay-card hover-card-soft focus-ring-soft press-feedback-soft p-4"
                >
                  <div className="text-xl text-blue-600 mb-1"><FaIcon icon={faCalendarDay} /></div>
                  <div className="font-medium text-[var(--foreground)]">Lịch học của con</div>
                </Link>
                <Link
                  href="/parent/children"
                  className="clay-card hover-card-soft focus-ring-soft press-feedback-soft p-4"
                >
                  <div className="text-xl text-emerald-600 mb-1"><FaIcon icon={faGraduationCap} /></div>
                  <div className="font-medium text-[var(--foreground)]">Tiến trình học tập</div>
                </Link>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
