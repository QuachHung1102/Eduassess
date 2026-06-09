"use server";

import { saveAvailability } from "@/lib/availability/store";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { AvailabilityMode, DayOfWeek, TimeSlot } from "@/lib/types";

// ── Bắt đầu làm bài (tạo ExamAttempt) ───────────────────────
export async function startExamAction(examId: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const studentId = session.user.id;

  // Kiểm tra học sinh có trong lớp được giao đề
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    select: { id: true, classId: true, allowRetake: true },
  });
  if (!exam) redirect("/student/exams");

  const inClass = await prisma.classEnrollment.findFirst({
    where: { studentId, classId: exam.classId },
  });
  if (!inClass) redirect("/student/exams");

  // Nếu đã có attempt chưa submit → tiếp tục
  const existing = await prisma.examAttempt.findFirst({
    where: { studentId, examId, submittedAt: null },
  });
  if (existing) {
    redirect(`/student/exams/${examId}/take?attemptId=${existing.id}`);
  }

  // Không cho thi lại nếu đã submit (trừ khi allowRetake = true)
  const submitted = await prisma.examAttempt.findFirst({
    where: { studentId, examId, submittedAt: { not: null } },
  });
  if (submitted && !exam.allowRetake) {
    redirect(`/student/exams/${examId}/results/${submitted.id}`);
  }

  const attempt = await prisma.examAttempt.create({
    data: { examId, studentId },
  });

  redirect(`/student/exams/${examId}/take?attemptId=${attempt.id}`);
}

// ── Nộp bài ─────────────────────────────────────────────────
export async function submitExamAction(
  attemptId: string,
  answers: { questionId: string; selectedOption: number | null }[],
) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Chưa đăng nhập" };

  const studentId = session.user.id;

  const attempt = await prisma.examAttempt.findUnique({
    where: { id: attemptId },
    include: {
      exam: {
        include: {
          examQuestions: {
            include: {
              question: { select: { id: true, options: true } },
            },
          },
        },
      },
    },
  });

  if (!attempt || attempt.studentId !== studentId)
    return { error: "Không tìm thấy bài làm" };
  if (attempt.submittedAt)
    return { error: "Bài đã được nộp trước đó" };

  // Map questionId → correct option index (0-3)
  const correctMap = new Map<string, number>();
  for (const eq of attempt.exam.examQuestions) {
    const opts = eq.question.options as { label: string; text: string; isCorrect: boolean }[];
    const correctIdx = opts.findIndex((o) => o.isCorrect);
    correctMap.set(eq.question.id, correctIdx);
  }

  const total = attempt.exam.examQuestions.length;
  let correctCount = 0;

  // Tính trước dữ liệu đáp án và điểm (không gọi DB)
  const answerData = answers.map((a) => {
    const correctIdx = correctMap.get(a.questionId) ?? -1;
    const isCorrect = a.selectedOption !== null && a.selectedOption === correctIdx;
    if (isCorrect) correctCount++;
    return {
      attemptId,
      questionId: a.questionId,
      selectedOption: a.selectedOption,
      isCorrect,
    };
  });

  const score = total > 0 ? (correctCount / total) * 100 : 0;

  // Lưu đáp án + cập nhật attempt trong một transaction
  // → nếu một trong hai thất bại thì cả hai bị rollback, tránh mất dữ liệu
  await prisma.$transaction([
    prisma.examAnswer.createMany({ data: answerData, skipDuplicates: true }),
    prisma.examAttempt.update({
      where: { id: attemptId },
      data: { submittedAt: new Date(), score },
    }),
  ]);

  // Thông báo kết quả cho học sinh
  await prisma.notification.create({
    data: {
      userId: studentId,
      title: "Bài kiểm tra đã được chấm điểm",
      message: `Bài thi "${attempt.exam.title}" của bạn đã được chấm. Điểm số: ${score.toFixed(1)}/100.`,
      type: "EXAM_GRADED",
      href: `/student/exams/${attempt.examId}/results/${attemptId}`,
    },
  });

  redirect(`/student/exams/${attempt.examId}/results/${attemptId}`);
}

// ── Bắt đầu / hoàn thành phiên flashcard ─────────────────────
export async function startFlashcardSessionAction(
  setId: string,
): Promise<{ sessionId: string }> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const studentId = session.user.id;

  // Nếu đang có session chưa hoàn thành → dùng lại
  const existing = await prisma.flashcardSession.findFirst({
    where: { setId, studentId, completedAt: null },
    orderBy: { startedAt: "desc" },
  });
  if (existing) return { sessionId: existing.id };

  const created = await prisma.flashcardSession.create({
    data: { setId, studentId },
  });
  return { sessionId: created.id };
}

export async function completeFlashcardSessionAction(
  sessionId: string,
): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  await prisma.flashcardSession.updateMany({
    where: { id: sessionId, studentId: session.user.id },
    data: { completedAt: new Date() },
  });
}

// ── Lịch rảnh của học sinh đang đăng nhập ────────────────────
export async function saveMyAvailabilityAction(
  slots: { dayOfWeek: DayOfWeek; slot: TimeSlot; availabilityMode: AvailabilityMode }[],
) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  await saveAvailability({ kind: "student", id: session.user.id }, slots);

  revalidatePath("/student/schedule");
  return { success: true };
}
