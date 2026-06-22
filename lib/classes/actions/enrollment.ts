"use server";

import { prisma } from "@/lib/db/prisma";
import { can } from "@/lib/auth/permissions";
import { revalidatePath } from "next/cache";
import { requireSession } from "./_shared";
import { canAdministerClass } from "@/lib/classes/access";

// ── Thành viên lớp (CBDT) ─────────────────────────────────────

/** Thêm học sinh vào lớp (hoặc kích hoạt lại nếu DROPPED). */
export async function enrollStudentAction(classId: string, studentId: string) {
  const session = await requireSession();
  const hasPermission = await can(session.user, "class.update");
  if (!hasPermission) return { error: "Không có quyền thêm học sinh" };

  const cls = await prisma.class.findUnique({ where: { id: classId } });
  if (!cls) return { error: "Không tìm thấy lớp" };
  if (!canAdministerClass(session.user, cls))
    return { error: "Bạn không phải cố vấn của lớp này" };

  await prisma.classEnrollment.upsert({
    where: { classId_studentId: { classId, studentId } },
    update: { status: "ACTIVE" },
    create: { classId, studentId, status: "ACTIVE" },
  });

  // Thông báo cho học sinh
  await prisma.notification.create({
    data: {
      userId: studentId,
      title: "Bạn đã được thêm vào lớp học",
      message: `Bạn đã được thêm vào lớp "${cls.name}". Kiểm tra lịch học của bạn để biết thêm chi tiết.`,
      type: "CLASS_ASSIGNED",
      href: `/student/classes`,
    },
  });

  revalidatePath(`/staff/classes/${classId}`);
  return { success: true };
}

/** Thêm nhiều học sinh vào lớp cùng lúc. */
export async function enrollStudentsAction(classId: string, studentIds: string[]) {
  const session = await requireSession();
  const hasPermission = await can(session.user, "class.update");
  if (!hasPermission) return { error: "Không có quyền thêm học sinh" };
  if (studentIds.length === 0) return { error: "Chưa chọn học sinh nào" };

  const cls = await prisma.class.findUnique({ where: { id: classId } });
  if (!cls) return { error: "Không tìm thấy lớp" };
  if (!canAdministerClass(session.user, cls))
    return { error: "Bạn không phải cố vấn của lớp này" };

  await prisma.$transaction([
    ...studentIds.map((studentId) =>
      prisma.classEnrollment.upsert({
        where: { classId_studentId: { classId, studentId } },
        update: { status: "ACTIVE" },
        create: { classId, studentId, status: "ACTIVE" },
      }),
    ),
    prisma.notification.createMany({
      data: studentIds.map((studentId) => ({
        userId: studentId,
        title: "Bạn đã được thêm vào lớp học",
        message: `Bạn đã được thêm vào lớp "${cls.name}". Kiểm tra lịch học của bạn để biết thêm chi tiết.`,
        type: "CLASS_ASSIGNED" as const,
        href: `/student/classes`,
      })),
    }),
  ]);

  revalidatePath(`/staff/classes/${classId}`);
  revalidatePath(`/admin/classes/${classId}`);
  return { success: true };
}

/** Xóa học sinh khỏi lớp (đặt DROPPED). */
export async function dropStudentAction(classId: string, studentId: string) {
  const session = await requireSession();
  const hasPermission = await can(session.user, "class.update");
  if (!hasPermission) return { error: "Không có quyền xóa học sinh" };

  const cls = await prisma.class.findUnique({ where: { id: classId } });
  if (!cls) return { error: "Không tìm thấy lớp" };
  if (!canAdministerClass(session.user, cls))
    return { error: "Bạn không phải cố vấn của lớp này" };

  await prisma.classEnrollment.update({
    where: { classId_studentId: { classId, studentId } },
    data: { status: "DROPPED" },
  });

  revalidatePath(`/staff/classes/${classId}`);
  return { success: true };
}

/** Phân giáo viên vào lớp. */
export async function assignClassTeacherAction(classId: string, teacherId: string) {
  const session = await requireSession();
  const hasPermission = await can(session.user, "class.update");
  if (!hasPermission) return { error: "Không có quyền phân giáo viên" };

  const cls = await prisma.class.findUnique({ where: { id: classId } });
  if (!cls) return { error: "Không tìm thấy lớp" };
  if (!canAdministerClass(session.user, cls))
    return { error: "Bạn không phải cố vấn của lớp này" };

  await prisma.classTeacher.upsert({
    where: { classId_teacherId: { classId, teacherId } },
    update: {},
    create: { classId, teacherId },
  });

  revalidatePath(`/staff/classes/${classId}`);
  return { success: true };
}

/** Phân nhiều giáo viên vào lớp cùng lúc. */
export async function assignClassTeachersAction(classId: string, teacherIds: string[]) {
  const session = await requireSession();
  const hasPermission = await can(session.user, "class.update");
  if (!hasPermission) return { error: "Không có quyền phân giáo viên" };
  if (teacherIds.length === 0) return { error: "Chưa chọn giáo viên nào" };

  const cls = await prisma.class.findUnique({ where: { id: classId } });
  if (!cls) return { error: "Không tìm thấy lớp" };
  if (!canAdministerClass(session.user, cls))
    return { error: "Bạn không phải cố vấn của lớp này" };

  await prisma.$transaction(
    teacherIds.map((teacherId) =>
      prisma.classTeacher.upsert({
        where: { classId_teacherId: { classId, teacherId } },
        update: {},
        create: { classId, teacherId },
      }),
    ),
  );

  revalidatePath(`/staff/classes/${classId}`);
  revalidatePath(`/admin/classes/${classId}`);
  return { success: true };
}

/** Gỡ giáo viên khỏi lớp. */
export async function removeClassTeacherAction(classId: string, teacherId: string) {
  const session = await requireSession();
  const hasPermission = await can(session.user, "class.update");
  if (!hasPermission) return { error: "Không có quyền gỡ giáo viên" };

  const cls = await prisma.class.findUnique({ where: { id: classId } });
  if (!cls) return { error: "Không tìm thấy lớp" };
  if (!canAdministerClass(session.user, cls))
    return { error: "Bạn không phải cố vấn của lớp này" };

  await prisma.classTeacher.delete({
    where: { classId_teacherId: { classId, teacherId } },
  });

  revalidatePath(`/staff/classes/${classId}`);
  return { success: true };
}

