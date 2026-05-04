"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { suggestQuestions, generateExamFeedback } from "@/lib/ai";
import type { SuggestedQuestion } from "@/lib/ai";

// ── Teacher: Gợi ý câu hỏi ──────────────────────────────────
export async function suggestQuestionsAction(params: {
  subjectId: string;
  gradeId: string;
  topicName: string;
  difficulty: string;
  count?: number;
}): Promise<{
  questions?: SuggestedQuestion[];
  error?: string;
}> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Chưa đăng nhập" };
  if (session.user.role !== "TEACHER" && session.user.role !== "ADMIN")
    return { error: "Không có quyền" };

  const { subjectId, gradeId, difficulty } = params;
  const count = Math.min(params.count ?? 3, 5);
  const topicName = params.topicName.trim();

  if (!topicName) return { error: "Vui lòng nhập tên chủ đề trước khi gợi ý" };

  // Lấy tên môn và khối lớp từ DB
  const [subject, grade] = await Promise.all([
    prisma.subject.findUnique({
      where: { id: subjectId },
      select: { name: true },
    }),
    prisma.grade.findUnique({
      where: { id: gradeId },
      select: { gradeNumber: true, level: true },
    }),
  ]);

  if (!subject || !grade) return { error: "Không tìm thấy môn hoặc khối lớp" };

  const levelLabel =
    { PRIMARY: "Tiểu học", MIDDLE: "THCS", HIGH: "THPT" }[grade.level] ?? "";
  const gradeLabel = `${levelLabel} lớp ${grade.gradeNumber}`;

  try {
    const questions = await suggestQuestions({
      subject: subject.name,
      topic: topicName,
      difficulty: difficulty as "EASY" | "MEDIUM" | "HARD",
      grade: gradeLabel,
      count,
    });
    return { questions };
  } catch (err) {
    console.error("[suggestQuestionsAction] caught:", String(err));
    return { error: "AI không thể xử lý yêu cầu này. Vui lòng thử lại." };
  }
}

// ── Student: Nhận xét bài làm ────────────────────────────────
export async function getExamFeedbackAction(attemptId: string): Promise<{
  feedback?: string;
  error?: string;
}> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Chưa đăng nhập" };

  const attempt = await prisma.examAttempt.findUnique({
    where: { id: attemptId },
    include: {
      student: { select: { name: true } },
      exam: {
        include: {
          subject: { select: { name: true } },
          examQuestions: {
            include: {
              question: {
                select: { id: true, topic: { select: { name: true } } },
              },
            },
          },
        },
      },
      answers: { select: { questionId: true, isCorrect: true } },
    },
  });

  if (!attempt || attempt.studentId !== session.user.id)
    return { error: "Không tìm thấy bài làm" };
  if (!attempt.submittedAt) return { error: "Bài chưa được nộp" };

  // ── Cache hit ────────────────────────────────────────────────
  if (attempt.aiFeedback) {
    return { feedback: attempt.aiFeedback };
  }

  // ── Cache miss: tổng hợp theo chủ đề ────────────────────────
  const answerMap = new Map(
    attempt.answers.map((a) => [a.questionId, a.isCorrect]),
  );
  const topicMap = new Map<string, { correct: number; total: number }>();

  for (const eq of attempt.exam.examQuestions) {
    const topicName = eq.question.topic.name;
    const t = topicMap.get(topicName) ?? { correct: 0, total: 0 };
    t.total++;
    if (answerMap.get(eq.question.id)) t.correct++;
    topicMap.set(topicName, t);
  }

  const topicBreakdown = Array.from(topicMap.entries()).map(([topic, v]) => ({
    topic,
    ...v,
  }));

  const total = attempt.exam.examQuestions.length;
  const correct = attempt.answers.filter((a) => a.isCorrect).length;

  let feedback: string;
  try {
    feedback = await generateExamFeedback({
      studentName: attempt.student.name ?? "Học sinh",
      examTitle: attempt.exam.title,
      subject: attempt.exam.subject.name,
      score: attempt.score ?? 0,
      correct,
      total,
      topicBreakdown,
    });
  } catch (err) {
    console.error("[getExamFeedbackAction]", err);
    return { error: "AI không thể xử lý yêu cầu này. Vui lòng thử lại." };
  }

  // Lưu vào DB để hiện lại khi xem lại bài (không generate lại)
  try {
    await prisma.examAttempt.update({
      where: { id: attemptId },
      data: { aiFeedback: feedback },
    });
  } catch (err) {
    console.error("[getExamFeedbackAction] DB save error:", err);
    // Không block — vẫn trả feedback
  }

  return { feedback };
}
