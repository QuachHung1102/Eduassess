"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import type { Difficulty } from "@/lib/types";

// ── Toggle canAddQuestions for a subject ─────────────────────
export async function toggleSubjectQuestionsAction(
  subjectId: string,
  enabled: boolean,
) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return { error: "Không có quyền thực hiện thao tác này" };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (prisma.subject as any).update({
    where: { id: subjectId },
    data: { canAddQuestions: enabled },
  });
  revalidatePath("/admin/subjects");
  return { success: true };
}

// ── Delete a question ────────────────────────────────────────
export async function adminDeleteQuestionAction(questionId: string) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return { error: "Không có quyền thực hiện thao tác này" };
  }

  await prisma.question.delete({ where: { id: questionId } });
  revalidatePath("/admin/questions");
  return { success: true };
}

// ── Delete an exam ────────────────────────────────────────────
export async function adminDeleteExamAction(examId: string) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return { error: "Không có quyền thực hiện thao tác này" };
  }

  await prisma.exam.delete({ where: { id: examId } });
  revalidatePath("/admin/exams");
  return { success: true };
}

// ── Approve / Reject a question ───────────────────────────────
export async function adminUpdateQuestionStatusAction(
  questionId: string,
  status: "APPROVED" | "PENDING",
) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return { error: "Không có quyền thực hiện thao tác này" };
  }

  await prisma.question.update({
    where: { id: questionId },
    data: { status },
  });
  revalidatePath("/admin/questions");
  return { success: true };
}

// ── Create a question (manual, admin only) ────────────────────
export async function adminCreateQuestionAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return { error: "Không có quyền thực hiện thao tác này" };
  }

  const content = (formData.get("content") as string)?.trim();
  const explanation =
    (formData.get("explanation") as string | null)?.trim() || null;
  const subjectId = formData.get("subjectId") as string;
  const gradeId = formData.get("gradeId") as string;
  const topicName = (formData.get("topicName") as string)?.trim();
  const difficulty = formData.get("difficulty") as Difficulty;
  const correctAnswer = formData.get("correct-answer") as string;

  const optionTexts = ["A", "B", "C", "D"].map((l) =>
    (formData.get(`option-${l}`) as string)?.trim(),
  );

  if (
    !content ||
    !subjectId ||
    !gradeId ||
    !difficulty ||
    !correctAnswer ||
    !topicName
  ) {
    return { error: "Vui lòng điền đầy đủ thông tin" };
  }
  if (optionTexts.some((t) => !t)) {
    return { error: "Vui lòng nhập đủ 4 đáp án" };
  }
  if (!["EASY", "MEDIUM", "HARD"].includes(difficulty)) {
    return { error: "Độ khó không hợp lệ" };
  }
  if (!["A", "B", "C", "D"].includes(correctAnswer)) {
    return { error: "Chưa chọn đáp án đúng" };
  }

  // Find or create topic
  const existingTopic = await prisma.topic.findFirst({
    where: { name: topicName, subjectId, gradeId },
  });
  const topicId = existingTopic
    ? existingTopic.id
    : (
        await prisma.topic.create({
          data: { name: topicName, subjectId, gradeId },
        })
      ).id;

  const options = ["A", "B", "C", "D"].map((l, i) => ({
    label: l,
    text: optionTexts[i],
    isCorrect: l === correctAnswer,
  }));

  await prisma.question.create({
    data: {
      content,
      explanation,
      options,
      difficulty,
      status: "APPROVED",
      topicId,
      subjectId,
      createdById: session.user.id,
    },
  });

  revalidatePath("/admin/questions");
}

// ── helper ───────────────────────────────────────────────────
async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN")
    throw new Error("Không có quyền");
  return session;
}

// ── Class CRUD ───────────────────────────────────────────────
export async function createClassAction(name: string, gradeId: string) {
  await requireAdmin();
  if (!name.trim() || !gradeId) return { error: "Thiếu tên lớp hoặc khối" };
  const existing = await prisma.class.findFirst({
    where: { name: name.trim(), gradeId },
  });
  if (existing) return { error: "Lớp này đã tồn tại" };
  await prisma.class.create({ data: { name: name.trim(), gradeId } });
  revalidatePath("/admin/classes");
  return { success: true };
}

export async function deleteClassAction(classId: string) {
  await requireAdmin();
  // Cascade: xóa luôn teacherClasses và studentClasses trước
  await prisma.$transaction([
    prisma.teacherClass.deleteMany({ where: { classId } }),
    prisma.studentClass.deleteMany({ where: { classId } }),
    prisma.class.delete({ where: { id: classId } }),
  ]);
  revalidatePath("/admin/classes");
  return { success: true };
}

// ── Student assignments ──────────────────────────────────────
export async function assignStudentToClassAction(
  studentId: string,
  classId: string,
) {
  await requireAdmin();
  await prisma.studentClass.upsert({
    where: { studentId_classId: { studentId, classId } },
    update: {},
    create: { studentId, classId },
  });
  revalidatePath("/admin/classes");
  return { success: true };
}

export async function removeStudentFromClassAction(
  studentId: string,
  classId: string,
) {
  await requireAdmin();
  await prisma.studentClass.delete({
    where: { studentId_classId: { studentId, classId } },
  });
  revalidatePath(`/admin/classes/${classId}`);
  return { success: true };
}

export async function transferStudentAction(
  studentId: string,
  fromClassId: string,
  toClassId: string,
) {
  await requireAdmin();
  if (fromClassId === toClassId)
    return { error: "Lớp đích phải khác lớp hiện tại" };
  await prisma.$transaction([
    prisma.studentClass.delete({
      where: { studentId_classId: { studentId, classId: fromClassId } },
    }),
    prisma.studentClass.upsert({
      where: { studentId_classId: { studentId, classId: toClassId } },
      update: {},
      create: { studentId, classId: toClassId },
    }),
  ]);
  revalidatePath(`/admin/classes/${fromClassId}`);
  revalidatePath(`/admin/classes/${toClassId}`);
  return { success: true };
}

// ── Teacher assignments ──────────────────────────────────────
export async function assignTeacherAction(
  teacherId: string,
  classId: string,
  subjectId: string,
) {
  await requireAdmin();
  await prisma.teacherClass.upsert({
    where: { teacherId_classId_subjectId: { teacherId, classId, subjectId } },
    update: {},
    create: { teacherId, classId, subjectId },
  });
  revalidatePath(`/admin/classes/${classId}`);
  revalidatePath("/admin/permissions");
  return { success: true };
}

export async function removeTeacherAction(
  teacherId: string,
  classId: string,
  subjectId: string,
) {
  await requireAdmin();
  await prisma.teacherClass.delete({
    where: { teacherId_classId_subjectId: { teacherId, classId, subjectId } },
  });
  revalidatePath(`/admin/classes/${classId}`);
  revalidatePath("/admin/permissions");
  return { success: true };
}

// ── User CRUD ────────────────────────────────────────────────
export async function createUserAction(formData: FormData) {
  await requireAdmin();

  const role = formData.get("role") as string;
  const name = (formData.get("name") as string)?.trim();
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const password = (formData.get("password") as string)?.trim();
  const sex = (formData.get("sex") as string) || null;
  const phoneNumber = (formData.get("phoneNumber") as string)?.trim() || null;
  const address = (formData.get("address") as string)?.trim() || null;
  const dobStr = (formData.get("dateOfBirth") as string)?.trim() || null;

  if (!name || !email || !password || !role)
    return { error: "Vui lòng điền đầy đủ thông tin bắt buộc" };
  if (!["TEACHER", "STUDENT"].includes(role))
    return { error: "Vai trò không hợp lệ" };
  if (password.length < 6)
    return { error: "Mật khẩu phải có ít nhất 6 ký tự" };

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { error: "Email này đã được sử dụng" };

  const hashed = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashed,
      role: role as "TEACHER" | "STUDENT",
      sex: sex || null,
      phoneNumber,
      address,
      dateOfBirth: dobStr ? new Date(dobStr) : null,
    },
  });

  revalidatePath("/admin/users");
  redirect(`/admin/users/${user.id}`);
}

export async function updateUserAction(userId: string, formData: FormData) {
  await requireAdmin();

  const name = (formData.get("name") as string)?.trim();
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const sex = (formData.get("sex") as string) || null;
  const phoneNumber = (formData.get("phoneNumber") as string)?.trim() || null;
  const address = (formData.get("address") as string)?.trim() || null;
  const dobStr = (formData.get("dateOfBirth") as string)?.trim() || null;

  if (!name || !email) return { error: "Tên và email không được để trống" };

  const conflict = await prisma.user.findFirst({
    where: { email, NOT: { id: userId } },
  });
  if (conflict) return { error: "Email này đã được dùng bởi tài khoản khác" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (prisma.user as any).update({
    where: { id: userId },
    data: {
      name,
      email,
      sex: sex || null,
      phoneNumber,
      address,
      dateOfBirth: dobStr ? new Date(dobStr) : null,
    },
  });

  revalidatePath(`/admin/users/${userId}`);
  revalidatePath("/admin/users");
  return { success: true };
}

export async function resetPasswordAction(userId: string, formData: FormData) {
  await requireAdmin();

  const newPassword = (formData.get("newPassword") as string)?.trim();
  if (!newPassword || newPassword.length < 6)
    return { error: "Mật khẩu phải có ít nhất 6 ký tự" };

  const hashed = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: userId },
    data: { password: hashed },
  });

  return { success: true };
}

export async function deleteUserAction(userId: string) {
  await requireAdmin();

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!user) return { error: "Không tìm thấy tài khoản" };
  if (user.role === "ADMIN") return { error: "Không thể xóa tài khoản Admin" };

  await prisma.user.delete({ where: { id: userId } });
  revalidatePath("/admin/users");
  redirect("/admin/users");
}

// ── Topic CRUD ───────────────────────────────────────────────
export async function createTopicAction(name: string, subjectId: string, gradeId: string) {
  await requireAdmin();
  const trimmed = name.trim();
  if (!trimmed) return { error: "Tên chủ đề không được trống" };

  const existing = await prisma.topic.findFirst({ where: { name: trimmed, subjectId, gradeId } });
  if (existing) return { error: "Chủ đề này đã tồn tại" };

  await prisma.topic.create({ data: { name: trimmed, subjectId, gradeId } });
  revalidatePath("/admin/subjects");
  return { success: true };
}

export async function deleteTopicAction(topicId: string) {
  await requireAdmin();
  const count = await prisma.question.count({ where: { topicId } });
  if (count > 0)
    return { error: `Không thể xóa: chủ đề đang có ${count} câu hỏi` };

  await prisma.topic.delete({ where: { id: topicId } });
  revalidatePath("/admin/subjects");
  return { success: true };
}
