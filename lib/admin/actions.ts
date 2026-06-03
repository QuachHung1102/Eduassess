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

  await prisma.subject.update({
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

  const question = await prisma.question.update({
    where: { id: questionId },
    data: { status },
    select: { content: true, createdById: true },
  });

  // Notify teacher when question is approved
  if (status === "APPROVED" && question.createdById) {
    const preview = question.content.slice(0, 60) + (question.content.length > 60 ? "..." : "");
    await prisma.notification.create({
      data: {
        userId: question.createdById,
        title: "Câu hỏi đã được duyệt",
        message: `Câu hỏi của bạn đã được admin phê duyệt: "${preview}"`,
        type: "QUESTION_APPROVED",
        href: "/teacher/question-bank",
      },
    });
  }

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

// ── Update a question (admin only) ───────────────────────────
export async function adminUpdateQuestionAction(
  questionId: string,
  formData: FormData,
) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return { error: "Không có quyền thực hiện thao tác này" };
  }

  const content = (formData.get("content") as string)?.trim();
  const explanation = (formData.get("explanation") as string | null)?.trim() || null;
  const subjectId = formData.get("subjectId") as string;
  const gradeId = formData.get("gradeId") as string;
  const topicName = (formData.get("topicName") as string)?.trim();
  const difficulty = formData.get("difficulty") as Difficulty;
  const correctAnswer = formData.get("correct-answer") as string;

  const optionTexts = ["A", "B", "C", "D"].map((l) =>
    (formData.get(`option-${l}`) as string)?.trim(),
  );

  if (!content || !subjectId || !gradeId || !difficulty || !correctAnswer || !topicName) {
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

  const existingTopic = await prisma.topic.findFirst({
    where: { name: topicName, subjectId, gradeId },
  });
  const topicId = existingTopic
    ? existingTopic.id
    : (await prisma.topic.create({ data: { name: topicName, subjectId, gradeId } })).id;

  const options = ["A", "B", "C", "D"].map((l, i) => ({
    label: l,
    text: optionTexts[i],
    isCorrect: l === correctAnswer,
  }));

  await prisma.question.update({
    where: { id: questionId },
    data: { content, explanation, options, difficulty, topicId, subjectId },
  });

  revalidatePath("/admin/questions");
  revalidatePath(`/admin/questions/${questionId}/edit`);
  return { success: true };
}

// ── Update exam metadata (admin only) ────────────────────────
export async function adminUpdateExamAction(examId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return { error: "Không có quyền thực hiện thao tác này" };
  }

  const title = (formData.get("title") as string)?.trim();
  const duration = parseInt(formData.get("duration") as string, 10);
  const showAnswer = formData.get("showAnswer") === "true";
  const allowRetake = formData.get("allowRetake") === "true";
  const dueAtRaw = formData.get("dueAt") as string | null;
  const dueAt = dueAtRaw ? new Date(dueAtRaw) : null;

  if (!title || !duration || duration <= 0) {
    return { error: "Vui lòng điền đầy đủ thông tin hợp lệ" };
  }

  await prisma.exam.update({
    where: { id: examId },
    data: { title, duration, showAnswer, allowRetake, dueAt },
  });

  revalidatePath("/admin/exams");
  revalidatePath(`/admin/exams/${examId}`);
  return { success: true };
}

// ── helper ───────────────────────────────────────────────────
async function requireAdmin() {
  const session = await auth();
  const role = session?.user?.role;
  if (!session?.user?.id || (role !== "ADMIN" && role !== "OWNER"))
    throw new Error("Không có quyền");
  return session;
}

// ── Class CRUD ───────────────────────────────────────────────
export async function createClassAction(name: string, gradeId?: string) {
  void gradeId;
  await requireAdmin();
  if (!name.trim()) return { error: "Thiếu tên lớp" };
  return { error: "Tạo lớp đào tạo qua trang quản lý lớp học mới." };
}

export async function deleteClassAction(classId: string) {
  await requireAdmin();
  await prisma.class.delete({ where: { id: classId } });
  revalidatePath("/admin/classes");
  return { success: true };
}

// ── Student assignments ──────────────────────────────────────
export async function assignStudentToClassAction(
  studentId: string,
  classId: string,
) {
  await requireAdmin();
  await prisma.classEnrollment.upsert({
    where: { classId_studentId: { classId, studentId } },
    update: {},
    create: { classId, studentId },
  });
  revalidatePath("/admin/classes");
  return { success: true };
}

export async function removeStudentFromClassAction(
  studentId: string,
  classId: string,
) {
  await requireAdmin();
  await prisma.classEnrollment.delete({
    where: { classId_studentId: { classId, studentId } },
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
    prisma.classEnrollment.delete({
      where: { classId_studentId: { classId: fromClassId, studentId } },
    }),
    prisma.classEnrollment.upsert({
      where: { classId_studentId: { classId: toClassId, studentId } },
      update: {},
      create: { classId: toClassId, studentId },
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
  subjectId?: string,
) {
  void subjectId;
  await requireAdmin();
  await prisma.classTeacher.upsert({
    where: { classId_teacherId: { classId, teacherId } },
    update: {},
    create: { classId, teacherId },
  });
  revalidatePath(`/admin/classes/${classId}`);
  revalidatePath("/admin/permissions");
  return { success: true };
}

export async function removeTeacherAction(
  teacherId: string,
  classId: string,
  subjectId?: string,
) {
  void subjectId;
  await requireAdmin();
  await prisma.classTeacher.delete({
    where: { classId_teacherId: { classId, teacherId } },
  });
  revalidatePath(`/admin/classes/${classId}`);
  revalidatePath("/admin/permissions");
  return { success: true };
}

// ── User CRUD ────────────────────────────────────────────────
const ALLOWED_NEW_ROLES = ["TEACHER", "STUDENT", "STAFF", "PARENT", "ADMIN"] as const;
const ALLOWED_POSITIONS = ["NVSALE", "NVLT", "CBNK", "CBDH", "CBDT", "CBDTS"] as const;
type AllowedRole = (typeof ALLOWED_NEW_ROLES)[number];
type AllowedPosition = (typeof ALLOWED_POSITIONS)[number];

export async function createUserAction(formData: FormData) {
  await requireAdmin();

  const role = formData.get("role") as string;
  const staffPositionRaw = (formData.get("staffPosition") as string | null) || null;
  const supervisorIdRaw = (formData.get("supervisorId") as string | null)?.trim() || null;
  const name = (formData.get("name") as string)?.trim();
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const password = (formData.get("password") as string)?.trim();
  const sex = (formData.get("sex") as string) || null;
  const phoneNumber = (formData.get("phoneNumber") as string)?.trim() || null;
  const address = (formData.get("address") as string)?.trim() || null;
  const dobStr = (formData.get("dateOfBirth") as string)?.trim() || null;

  if (!name || !email || !password || !role)
    return { error: "Vui lòng điền đầy đủ thông tin bắt buộc" };
  if (!(ALLOWED_NEW_ROLES as readonly string[]).includes(role))
    return { error: "Vai trò không hợp lệ" };
  if (password.length < 8)
    return { error: "Mật khẩu phải có ít nhất 8 ký tự" };

  let staffPosition: AllowedPosition | null = null;
  if (role === "STAFF") {
    if (!staffPositionRaw || !(ALLOWED_POSITIONS as readonly string[]).includes(staffPositionRaw))
      return { error: "Vui lòng chọn chức danh nhân viên" };
    staffPosition = staffPositionRaw as AllowedPosition;
  }

  // Supervisor chỉ áp dụng khi role=STAFF + position=CBDT
  let supervisorId: string | null = null;
  if (role === "STAFF" && staffPosition === "CBDT" && supervisorIdRaw) {
    const sup = await prisma.user.findUnique({
      where: { id: supervisorIdRaw },
      select: { role: true, staffPosition: true },
    });
    if (!sup || sup.role !== "STAFF" || sup.staffPosition !== "CBDTS")
      return { error: "Người phụ trách phải là CBDTS" };
    supervisorId = supervisorIdRaw;
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { error: "Email này đã được sử dụng" };

  const hashed = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashed,
      role: role as AllowedRole,
      staffPosition,
      supervisorId,
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

  await prisma.user.update({
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
  if (!newPassword || newPassword.length < 8)
    return { error: "Mật khẩu phải có ít nhất 8 ký tự" };

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
  if (user.role === "ADMIN" || user.role === "OWNER")
    return { error: "Không thể xóa tài khoản Admin / Owner" };

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
