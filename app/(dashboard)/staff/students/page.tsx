import Link from "next/link";
import { getMyStudents } from "@/lib/classes/queries";
import { requirePageSession } from "@/lib/auth/page-guard";
import { can } from "@/lib/auth/permissions";
import { PageHeader } from "@/components/layout/PageHeader";
import { FaIcon } from "@/components/ui/FaIcon";
import { faUserGraduate } from "@fortawesome/free-solid-svg-icons";
import { StudentsListClient } from "./StudentsListClient";

export default async function StaffStudentsPage() {
  const me = await requirePageSession();
  const canCreate = await can(me, "student.create");
  const students = await getMyStudents();

  const cards = students.map(({ student, latestLevels }) => ({
    id: student.id,
    name: student.name,
    email: student.email,
    code: student.code,
    activeCount: student.classEnrollments.length,
    levels: latestLevels.map((l) => ({ subjectId: l.subject.id, subjectName: l.subject.name, level: l.level })),
  }));

  return (
    <div className="flex h-full flex-col gap-4 sm:gap-6">
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
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-foreground/60">
          <FaIcon icon={faUserGraduate} className="text-4xl" />
          <p className="text-sm">Chưa có học sinh nào được giao cho bạn</p>
        </div>
      ) : (
        <StudentsListClient students={cards} />
      )}
    </div>
  );
}
