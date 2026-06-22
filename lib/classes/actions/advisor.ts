"use server";

import { prisma } from "@/lib/db/prisma";
import { can } from "@/lib/auth/permissions";
import { revalidatePath } from "next/cache";
import { requireSession } from "./_shared";

// ── Phân học sinh cho CBDT (CBDTS thực hiện) ─────────────────

export async function assignStudentAdvisorAction(studentId: string, advisorId: string) {
  const session = await requireSession();
  const hasPermission = await can(session.user, "student.assign");
  if (!hasPermission) return { error: "Không có quyền phân học sinh" };

  await prisma.studentAdvisor.upsert({
    where: { studentId_advisorId: { studentId, advisorId } },
    update: { assignedById: session.user.id, assignedAt: new Date() },
    create: { studentId, advisorId, assignedById: session.user.id },
  });

  await prisma.auditLog.create({
    data: {
      actorId: session.user.id,
      action: "advisor.assign",
      entityType: "StudentAdvisor",
      entityId: studentId,
      payload: { advisorId },
    },
  });

  // Thông báo cho CBDT được phân
  await prisma.notification.create({
    data: {
      userId: advisorId,
      title: "Học sinh mới được phân cho bạn",
      message: "CBDTS vừa phân một học sinh mới để bạn quản lý và theo dõi.",
      type: "STUDENT_ASSIGNED",
      href: "/staff/students",
    },
  });

  revalidatePath("/staff/students/assign");
  revalidatePath(`/staff/students/${studentId}`);
  return { success: true };
}

export async function removeStudentAdvisorAction(studentId: string, advisorId: string) {
  const session = await requireSession();
  const hasPermission = await can(session.user, "student.assign");
  if (!hasPermission) return { error: "Không có quyền gỡ phân công" };

  await prisma.studentAdvisor.delete({
    where: { studentId_advisorId: { studentId, advisorId } },
  });

  await prisma.auditLog.create({
    data: {
      actorId: session.user.id,
      action: "advisor.unassign",
      entityType: "StudentAdvisor",
      entityId: studentId,
      payload: { advisorId },
    },
  });

  revalidatePath("/staff/students/assign");
  revalidatePath(`/staff/students/${studentId}`);
  return { success: true };
}

// ── Lazy-load cho trang phân công CBDT ───────────────────────

const PAGE_SIZE = 10;

/**
 * Lấy danh sách học sinh đã được phân cho một CBDT.
 * Dùng khi mở rộng card CBDT trên trang /staff/students/assign.
 */
export async function getAdvisorStudentsAction(advisorId: string): Promise<{
  students: { id: string; name: string | null; email: string | null; assignedAt: Date }[];
  error?: string;
}> {
  const session = await requireSession();
  const hasPermission = await can(session.user, "student.assign");
  if (!hasPermission) return { students: [], error: "Không có quyền" };

  const rows = await prisma.studentAdvisor.findMany({
    where: { advisorId },
    include: { student: { select: { id: true, name: true, email: true } } },
    orderBy: { assignedAt: "desc" },
  });

  return {
    students: rows.map((r) => ({
      id: r.student.id,
      name: r.student.name,
      email: r.student.email,
      assignedAt: r.assignedAt,
    })),
  };
}

/**
 * Tìm học sinh chưa được phân cho advisor này.
 * Hỗ trợ phân trang và tìm kiếm theo tên/email.
 */
export async function searchAssignableStudentsAction(
  advisorId: string,
  query: string,
  page: number
): Promise<{
  students: { id: string; name: string | null; email: string | null }[];
  total: number;
  hasMore: boolean;
  error?: string;
}> {
  const session = await requireSession();
  const hasPermission = await can(session.user, "student.assign");
  if (!hasPermission) return { students: [], total: 0, hasMore: false, error: "Không có quyền" };

  // IDs đã được phân cho advisor này
  const assigned = await prisma.studentAdvisor.findMany({
    where: { advisorId },
    select: { studentId: true },
  });
  const assignedIds = assigned.map((a) => a.studentId);

  const q = query.trim();
  const where = {
    role: "STUDENT" as const,
    id: { notIn: assignedIds },
    ...(q && {
      OR: [
        { name: { contains: q, mode: "insensitive" as const } },
        { email: { contains: q, mode: "insensitive" as const } },
      ],
    }),
  };

  const [total, students] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
    }),
  ]);

  return {
    students,
    total,
    hasMore: page * PAGE_SIZE < total,
  };
}
