import Link from "next/link";
import { getMyStudents } from "@/lib/classes/queries";
import { requirePageSession } from "@/lib/auth/page-guard";
import { can } from "@/lib/auth/permissions";
import { PageHeader } from "@/components/layout/PageHeader";
import { FaIcon } from "@/components/ui/FaIcon";
import { faUserGraduate } from "@fortawesome/free-solid-svg-icons";
import {
  STUDENT_LEVEL_LABEL as LEVEL_LABEL,
  STUDENT_LEVEL_COLOR as LEVEL_COLOR,
} from "@/lib/constants/labels";

export default async function StaffStudentsPage() {
  const me = await requirePageSession();
  const canCreate = await can(me, "student.create");
  const students = await getMyStudents();

  return (
    <div className="flex flex-col h-full gap-4 sm:gap-6">
      <PageHeader
        icon={faUserGraduate}
        title="Học sinh phụ trách"
        subtitle={`${students.length} học sinh`}
        actions={
          canCreate && (
            <Link href="/staff/students/new" className="clay-btn bg-primary px-4 py-2 text-sm font-medium text-white">
              + Thêm học sinh
            </Link>
          )
        }
      />

      {students.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-foreground/60">
          <FaIcon icon={faUserGraduate} className="text-4xl" />
          <p className="text-sm">Chưa có học sinh nào được giao cho bạn</p>
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pb-4">
            {students.map(({ student, latestLevels }) => {
              const activeCount = student.classEnrollments.length;
              return (
                <Link
                  key={student.id}
                  href={`/staff/students/${student.id}`}
                  className="clay-card hover-card-soft press-feedback-soft group p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/15 text-primary text-sm font-bold flex items-center justify-center shrink-0">
                      {student.name?.[0]?.toUpperCase() ?? "?"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold truncate text-foreground">{student.name}</p>
                      <p className="text-xs truncate text-foreground/60">{student.email}</p>
                    </div>
                  </div>

                  {latestLevels.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {latestLevels.map((l) => (
                        <span
                          key={l.subject.id}
                          className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                            LEVEL_COLOR[l.level] ?? "bg-gray-100 text-gray-600"
                          }`}
                          title={`${l.subject.name}: ${LEVEL_LABEL[l.level]}`}
                        >
                          {l.subject.name}: {LEVEL_LABEL[l.level]}
                        </span>
                      ))}
                    </div>
                  )}

                  <p className="text-xs mt-3 text-foreground/60">
                    {activeCount > 0 ? `Đang học ${activeCount} lớp` : "Chưa có lớp"}
                  </p>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
