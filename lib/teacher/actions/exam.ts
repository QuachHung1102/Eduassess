"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { redirect } from "next/navigation";

export async function createExamAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Chưa đăng nhập" };

  const title = (formData.get("title") as string)?.trim();
  const subjectId = formData.get("subjectId") as string;
  const classId = formData.get("classId") as string;
  const duration = parseInt(formData.get("duration") as string, 10);
  const showAnswer = formData.get("showAnswer") === "true";
  const allowRetake = formData.get("allowRetake") === "true";
  const easyCount = parseInt(formData.get("easyCount") as string, 10) || 0;
  const mediumCount = parseInt(formData.get("mediumCount") as string, 10) || 0;
  const hardCount = parseInt(formData.get("hardCount") as string, 10) || 0;

  if (!title || !subjectId || !classId || !duration) {
    return { error: "Vui lòng điền đầy đủ thông tin" };
  }

  const totalCount = easyCount + mediumCount + hardCount;
  if (totalCount === 0) {
    return { error: "Đề kiểm tra phải có ít nhất 1 câu hỏi" };
  }

  // Lấy câu hỏi ngẫu nhiên theo độ khó từ ngân hàng (APPROVED)
  const [easy, medium, hard] = await Promise.all([
    easyCount > 0
      ? prisma.$queryRaw<{ id: string }[]>`
          SELECT id FROM questions
          WHERE "subjectId" = ${subjectId} AND difficulty = 'EASY' AND status = 'APPROVED'
          ORDER BY RANDOM() LIMIT ${easyCount}`
      : [],
    mediumCount > 0
      ? prisma.$queryRaw<{ id: string }[]>`
          SELECT id FROM questions
          WHERE "subjectId" = ${subjectId} AND difficulty = 'MEDIUM' AND status = 'APPROVED'
          ORDER BY RANDOM() LIMIT ${mediumCount}`
      : [],
    hardCount > 0
      ? prisma.$queryRaw<{ id: string }[]>`
          SELECT id FROM questions
          WHERE "subjectId" = ${subjectId} AND difficulty = 'HARD' AND status = 'APPROVED'
          ORDER BY RANDOM() LIMIT ${hardCount}`
      : [],
  ]);

  const allQuestions = [...easy, ...medium, ...hard];
  if (allQuestions.length < totalCount) {
    return {
      error: `Ngân hàng câu hỏi không đủ (cần ${totalCount}, có ${allQuestions.length} câu APPROVED). Hãy thêm câu hỏi hoặc giảm số lượng.`,
    };
  }

  const exam = await prisma.exam.create({
    data: {
      title,
      subjectId,
      classId,
      duration,
      showAnswer,
      allowRetake,
      createdById: session.user.id,
      examQuestions: {
        create: allQuestions.map((q, i) => ({
          questionId: q.id,
          order: i + 1,
        })),
      },
    },
  });

  redirect(`/teacher/exams/${exam.id}`);
}

export async function deleteExamAction(examId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Chưa đăng nhập" };

  const exam = await prisma.exam.findUnique({ where: { id: examId } });
  if (!exam || exam.createdById !== session.user.id) {
    return { error: "Không tìm thấy đề kiểm tra" };
  }

  await prisma.exam.delete({ where: { id: examId } });
  return { success: true };
}
