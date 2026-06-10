"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { Difficulty } from "@/lib/types";
import {
  createQuestion,
  updateQuestion,
  deleteQuestion,
  assertTopicExists,
  type QuestionWriteInput,
} from "@/lib/questions/store";

/**
 * Chính sách riêng của giáo viên: chỉ được tạo câu hỏi cho môn mình đang dạy,
 * và môn đó phải còn bật canAddQuestions. Trả null nếu hợp lệ, hoặc thông báo lỗi.
 */
async function assertTeacherCanUseSubject(
  teacherId: string,
  subjectId: string
): Promise<string | null> {
  const subjectRecord = await prisma.subject.findUnique({
    where: { id: subjectId },
    select: { canAddQuestions: true },
  });
  if (!subjectRecord?.canAddQuestions) {
    return "Admin đã tắt quyền tạo câu hỏi cho môn này";
  }
  const classTeacherRows = await prisma.classTeacher.findMany({
    where: { teacherId },
    select: { class: { select: { subjectId: true } } },
  });
  const allowedIds = [...new Set(classTeacherRows.map((r) => r.class.subjectId))];
  if (!allowedIds.includes(subjectId)) {
    return "Bạn không có quyền tạo câu hỏi cho môn này";
  }
  return null;
}

export async function createQuestionAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Chưa đăng nhập" };

  const subjectId = formData.get("subjectId") as string;
  const gradeId = formData.get("gradeId") as string;
  const topicName = (formData.get("topicName") as string)?.trim();
  if (!subjectId || !gradeId || !topicName) return { error: "Vui lòng điền đầy đủ thông tin" };

  const subjectError = await assertTeacherCanUseSubject(session.user.id, subjectId);
  if (subjectError) return { error: subjectError };
  const topicError = await assertTopicExists(subjectId, gradeId, topicName);
  if (topicError) return { error: topicError };

  const input: QuestionWriteInput = {
    content: (formData.get("content") as string)?.trim(),
    explanation: (formData.get("explanation") as string | null)?.trim() || null,
    subjectId,
    gradeId,
    topicName,
    difficulty: formData.get("difficulty") as Difficulty,
    correctAnswer: formData.get("correct-answer") as string,
    optionTexts: ["A", "B", "C", "D"].map(
      (l) => (formData.get(`option-${l}`) as string)?.trim(),
    ),
  };

  const result = await createQuestion(input, {
    createdById: session.user.id,
    status: "PENDING",
  });
  if ("error" in result) return { error: result.error };

  redirect("/teacher/question-bank");
}

export async function deleteQuestionAction(questionId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Chưa đăng nhập" };

  const result = await deleteQuestion(questionId, session.user.id);
  if ("error" in result) return result;
  return { success: true };
}

export async function updateQuestionAction(
  questionId: string,
  formData: FormData,
): Promise<{ error: string } | { success: true }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Chưa đăng nhập" };

  const input: QuestionWriteInput = {
    content: (formData.get("content") as string)?.trim(),
    explanation: (formData.get("explanation") as string | null)?.trim() || null,
    difficulty: formData.get("difficulty") as Difficulty,
    correctAnswer: formData.get("correct-answer") as string,
    optionTexts: ["A", "B", "C", "D"].map(
      (l) => (formData.get(`option-${l}`) as string)?.trim(),
    ),
  };

  const result = await updateQuestion(questionId, input, {
    ownerId: session.user.id,
    updateMeta: false,
  });
  if ("error" in result) return result;

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

  if (!subjectId || !gradeId || !topicName) {
    return { error: "Vui lòng điền đầy đủ thông tin" };
  }

  const subjectError = await assertTeacherCanUseSubject(session.user.id, subjectId);
  if (subjectError) return { error: subjectError };
  const topicError = await assertTopicExists(subjectId, gradeId, topicName);
  if (topicError) return { error: topicError };

  const result = await createQuestion(
    {
      content,
      explanation: explanation || null,
      subjectId,
      gradeId,
      topicName,
      difficulty: difficulty as Difficulty,
      correctAnswer: correct,
      optionTexts: [options.A, options.B, options.C, options.D],
    },
    { createdById: session.user.id, status: "PENDING" }
  );
  if ("error" in result) return { error: result.error };

  revalidatePath("/teacher/question-bank");
  return { success: true };
}
