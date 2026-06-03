"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { Difficulty } from "@/lib/types";

export async function createQuestionAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Chưa đăng nhập" };

  const content = (formData.get("content") as string)?.trim();
  const explanation = (formData.get("explanation") as string | null)?.trim() || null;
  const subjectId = formData.get("subjectId") as string;
  const gradeId = formData.get("gradeId") as string;
  const topicName = (formData.get("topicName") as string)?.trim();
  const difficulty = formData.get("difficulty") as Difficulty;
  const correctAnswer = formData.get("correct-answer") as string;

  const optionTexts = ["A", "B", "C", "D"].map(
    (l) => (formData.get(`option-${l}`) as string)?.trim(),
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

  // Kiểm tra giáo viên có được phép tạo câu hỏi cho môn này không
  // và môn đó phải còn bật canAddQuestions
  const subjectRecord = await prisma.subject.findUnique({
    where: { id: subjectId },
    select: { canAddQuestions: true },
  });
  if (!subjectRecord?.canAddQuestions) {
    return { error: "Admin đã tắt quyền tạo câu hỏi cho môn này" };
  }
  const classTeacherRows = await prisma.classTeacher.findMany({
    where: { teacherId: session.user.id },
    select: { class: { select: { subjectId: true } } },
  });
  const allowedIds = [...new Set(classTeacherRows.map((r) => r.class.subjectId))];
  if (!allowedIds.includes(subjectId)) {
    return { error: "Bạn không có quyền tạo câu hỏi cho môn này" };
  }

  // Tìm topic theo tên + môn + khối; nếu chưa có thì tạo mới
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

  await prisma.question.create({
    data: {
      content,
      explanation,
      options,
      difficulty,
      status: "PENDING",
      topicId,
      subjectId,
      createdById: session.user.id,
    },
  });

  redirect("/teacher/question-bank");
}

export async function deleteQuestionAction(questionId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Chưa đăng nhập" };

  const question = await prisma.question.findUnique({ where: { id: questionId } });
  if (!question || question.createdById !== session.user.id) {
    return { error: "Không tìm thấy câu hỏi" };
  }

  await prisma.question.delete({ where: { id: questionId } });
  return { success: true };
}

export async function updateQuestionAction(questionId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Chưa đăng nhập" };

  const question = await prisma.question.findFirst({
    where: { id: questionId, createdById: session.user.id },
  });
  if (!question) return { error: "Không tìm thấy câu hỏi hoặc bạn không có quyền" };

  const content = (formData.get("content") as string)?.trim();
  const explanation = (formData.get("explanation") as string | null)?.trim() || null;
  const difficulty = formData.get("difficulty") as Difficulty;
  const correctAnswer = formData.get("correct-answer") as string;
  const optionTexts = ["A", "B", "C", "D"].map(
    (l) => (formData.get(`option-${l}`) as string)?.trim(),
  );

  if (!content || !difficulty || !correctAnswer)
    return { error: "Vui lòng điền đầy đủ thông tin" };
  if (optionTexts.some((t) => !t)) return { error: "Vui lòng nhập đủ 4 đáp án" };
  if (!["EASY", "MEDIUM", "HARD"].includes(difficulty))
    return { error: "Độ khó không hợp lệ" };
  if (!["A", "B", "C", "D"].includes(correctAnswer))
    return { error: "Chưa chọn đáp án đúng" };

  const options = ["A", "B", "C", "D"].map((l, i) => ({
    label: l,
    text: optionTexts[i],
    isCorrect: l === correctAnswer,
  }));

  await prisma.question.update({
    where: { id: questionId },
    data: { content, explanation, difficulty, options },
  });

  revalidatePath("/teacher/question-bank");
  return { success: true };
}

// Server action để lấy topics theo subject+grade (dùng trong client form)
export async function getTopicsAction(subjectId: string, gradeId: string) {
  if (!subjectId || !gradeId) return [];
  return prisma.topic.findMany({
    where: { subjectId, gradeId },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

// Server action lưu câu hỏi từ AI gợi ý (nhận plain object, không redirect)
export async function saveAiQuestionAction(params: {
  content: string;
  explanation: string;
  options: { A: string; B: string; C: string; D: string };
  correct: "A" | "B" | "C" | "D";
  subjectId: string;
  gradeId: string;
  topicName: string;
  difficulty: string;
}): Promise<{ success?: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Chưa đăng nhập" };
  if (session.user.role !== "TEACHER" && session.user.role !== "ADMIN")
    return { error: "Không có quyền" };

  const { content, explanation, options, correct, subjectId, gradeId, difficulty } = params;
  const topicName = params.topicName.trim();

  if (!content || !subjectId || !gradeId || !topicName || !correct)
    return { error: "Thiếu thông tin câu hỏi" };

  const subjectRecord = await prisma.subject.findUnique({ where: { id: subjectId }, select: { canAddQuestions: true } });
  if (!subjectRecord?.canAddQuestions) return { error: "Admin đã tắt quyền tạo câu hỏi cho môn này" };

  const allowedSubjects = await prisma.classTeacher.findMany({
    where: { teacherId: session.user.id },
    select: { class: { select: { subjectId: true } } },
  });
  if (![...new Set(allowedSubjects.map((r) => r.class.subjectId))].includes(subjectId))
    return { error: "Bạn không có quyền tạo câu hỏi cho môn này" };

  const existingTopic = await prisma.topic.findFirst({ where: { name: topicName, subjectId, gradeId } });
  const topicId = existingTopic
    ? existingTopic.id
    : (await prisma.topic.create({ data: { name: topicName, subjectId, gradeId } })).id;

  const optionRows = (["A", "B", "C", "D"] as const).map((l) => ({
    label: l,
    text: options[l],
    isCorrect: l === correct,
  }));

  await prisma.question.create({
    data: {
      content,
      explanation: explanation || null,
      options: optionRows,
      difficulty: difficulty as Difficulty,
      status: "PENDING",
      topicId,
      subjectId,
      createdById: session.user.id,
    },
  });

  revalidatePath("/teacher/question-bank");
  return { success: true };
}
