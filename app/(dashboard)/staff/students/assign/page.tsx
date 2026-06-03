import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { can } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db/prisma";
import { AdvisorsGrid } from "./AdvisorsGrid";
import { FaIcon } from "@/components/ui/FaIcon";
import { faUserGroup } from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AssignStudentAdvisorPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const hasPermission = await can(session.user, "student.assign");
  if (!hasPermission) notFound();

  // Chỉ load advisors (số ít) — học sinh được lazy-load khi mở từng card
  const [advisors, totalStudents] = await Promise.all([
    prisma.user.findMany({
      where: { role: "STAFF", staffPosition: "CBDT" },
      select: {
        id: true,
        name: true,
        email: true,
        _count: { select: { advisorStudents: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.user.count({ where: { role: "STUDENT" } }),
  ]);

  const serializedAdvisors = advisors.map((a) => ({
    id: a.id,
    name: a.name,
    email: a.email,
    studentCount: a._count.advisorStudents,
  }));

  const assignedStudentCount = await prisma.studentAdvisor
    .findMany({ select: { studentId: true }, distinct: ["studentId"] })
    .then((rows) => rows.length);
  const unassignedCount = totalStudents - assignedStudentCount;

  return (
    <div className="flex flex-col gap-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm flex-wrap">
        <Link href="/staff" className="hover:underline" style={{ color: "var(--primary)" }}>
          Tổng quan
        </Link>
        <span style={{ color: "color-mix(in srgb, var(--foreground) 35%, transparent)" }}>›</span>
        <Link href="/staff/students" className="hover:underline" style={{ color: "var(--primary)" }}>
          Học sinh
        </Link>
        <span style={{ color: "color-mix(in srgb, var(--foreground) 35%, transparent)" }}>›</span>
        <span style={{ color: "var(--foreground)" }}>Phân công CBDT</span>
      </div>

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-0.5">
          <span style={{ color: "var(--primary)" }}><FaIcon icon={faUserGroup} /></span>
          <h1 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>
            Phân công học sinh cho CBDT
          </h1>
        </div>
        <p className="text-sm" style={{ color: "color-mix(in srgb, var(--foreground) 60%, transparent)" }}>
          Chọn một Cán bộ đào tạo để xem hoặc điều chỉnh học sinh do họ phụ trách
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="primary-panel p-4 text-center">
          <div className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>{totalStudents}</div>
          <div className="text-xs mt-0.5" style={{ color: "color-mix(in srgb, var(--foreground) 55%, transparent)" }}>Tổng học sinh</div>
        </div>
        <div className="primary-panel p-4 text-center">
          <div className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>{advisors.length}</div>
          <div className="text-xs mt-0.5" style={{ color: "color-mix(in srgb, var(--foreground) 55%, transparent)" }}>Cán bộ đào tạo</div>
        </div>
        <div className="primary-panel p-4 text-center">
          <div className="text-2xl font-bold text-amber-600">{unassignedCount}</div>
          <div className="text-xs mt-0.5" style={{ color: "color-mix(in srgb, var(--foreground) 55%, transparent)" }}>Chưa có CBDT</div>
        </div>
      </div>

      {advisors.length === 0 ? (
        <div
          className="primary-panel flex flex-col items-center justify-center py-20 text-center"
          style={{ color: "color-mix(in srgb, var(--foreground) 45%, transparent)" }}
        >
          <div className="text-3xl mb-2"><FaIcon icon={faUserGroup} /></div>
          <p>Chưa có Cán bộ đào tạo (CBDT) nào trong hệ thống.</p>
          <p className="text-xs mt-1">Vào trang quản lý tài khoản để tạo tài khoản CBDT trước.</p>
        </div>
      ) : (
        <AdvisorsGrid advisors={serializedAdvisors} totalStudents={totalStudents} />
      )}
    </div>
  );
}
