import { notFound } from "next/navigation";
import { can } from "@/lib/auth/permissions";
import { requirePageSession } from "@/lib/auth/page-guard";
import { prisma } from "@/lib/db/prisma";
import { FaIcon } from "@/components/ui/FaIcon";
import { faUserTie, faUsers, faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";
import { AssignStudentsClient } from "./AssignStudentsClient";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ advisorId: string }>;
}

export default async function AdvisorAssignPage({ params }: Props) {
  const { advisorId } = await params;

  const user = await requirePageSession();

  const hasPermission = await can(user, "student.assign");
  if (!hasPermission) notFound();

  // Load advisor info
  const advisor = await prisma.user.findUnique({
    where: { id: advisorId, role: "STAFF", staffPosition: "CBDT" },
    select: {
      id: true,
      name: true,
      email: true,
      _count: { select: { advisorStudents: true } },
    },
  });

  if (!advisor) notFound();

  // Load học sinh đang được phân + tổng học sinh
  const [assignedRows, totalStudents] = await Promise.all([
    prisma.studentAdvisor.findMany({
      where: { advisorId },
      include: { student: { select: { id: true, name: true, email: true } } },
      orderBy: { assignedAt: "desc" },
    }),
    prisma.user.count({ where: { role: "STUDENT" } }),
  ]);

  const assignedStudents = assignedRows.map((r) => ({
    id: r.student.id,
    name: r.student.name,
    email: r.student.email,
    assignedAt: r.assignedAt,
  }));

  return (
    <div className="flex flex-col gap-5 max-w-3xl mx-auto w-full">
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
        <Link href="/staff/students/assign" className="hover:underline" style={{ color: "var(--primary)" }}>
          Phân công CBDT
        </Link>
        <span style={{ color: "color-mix(in srgb, var(--foreground) 35%, transparent)" }}>›</span>
        <span style={{ color: "var(--foreground)" }}>{advisor.name ?? advisor.email}</span>
      </div>

      {/* Back link */}
      <Link
        href="/staff/students/assign"
        className="self-start flex items-center gap-2 text-sm hover:underline focus-ring-soft"
        style={{ color: "var(--primary)" }}
      >
        <FaIcon icon={faArrowLeft} />
        Quay lại danh sách CBDT
      </Link>

      {/* Advisor header card */}
      <div className="primary-panel px-6 py-5 flex items-center gap-5">
        {/* Avatar */}
        <div
          className="flex-shrink-0 w-14 h-14 rounded-full flex items-center justify-center text-base font-bold"
          style={{
            background: "color-mix(in srgb, var(--primary) 15%, var(--surface))",
            color: "var(--primary)",
            border: "2px solid color-mix(in srgb, var(--primary) 30%, transparent)",
          }}
        >
          {advisor.name ? (
            advisor.name.split(" ").slice(-2).map((w) => w[0]).join("").toUpperCase()
          ) : (
            <FaIcon icon={faUserTie} />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>
            {advisor.name ?? advisor.email}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "color-mix(in srgb, var(--foreground) 55%, transparent)" }}>
            {advisor.email} · Cán bộ đào tạo (CBDT)
          </p>
        </div>

        {/* Stats */}
        <div className="flex-shrink-0 text-right">
          <div className="flex items-center gap-1.5 justify-end" style={{ color: "var(--primary)" }}>
            <FaIcon icon={faUsers} />
            <span className="text-2xl font-bold">{advisor._count.advisorStudents}</span>
          </div>
          <p className="text-xs mt-0.5" style={{ color: "color-mix(in srgb, var(--foreground) 50%, transparent)" }}>
            / {totalStudents} học sinh
          </p>
        </div>
      </div>

      {/* Interactive assignment panel */}
      <AssignStudentsClient
        advisorId={advisorId}
        advisorName={advisor.name ?? advisor.email ?? "CBDT"}
        initialAssigned={assignedStudents}
      />
    </div>
  );
}
