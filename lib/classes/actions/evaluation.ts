"use server";

import { prisma } from "@/lib/db/prisma";
import { can } from "@/lib/auth/permissions";
import { revalidatePath } from "next/cache";
import { requireSession } from "./_shared";
import { canEvaluateStudent } from "@/lib/classes/queries";
import { canOperateClassSession } from "@/lib/classes/access";
import { suggestProficiencyLevel, type LevelSuggestion } from "@/lib/ai";
import type { StudentLevel } from "@/lib/types";

// ── Năng lực học sinh ─────────────────────────────────────────

export async function evaluateStudentLevelAction(data: {
  studentId: string;
  subjectId: string;
  level: StudentLevel;
  note?: string;
}) {
  const session = await requireSession();
  const hasPermission = await can(session.user, "student.evaluate");
  if (!hasPermission) return { error: "Không có quyền đánh giá năng lực" };
  // CBĐT chỉ đánh giá học sinh được phân công cho mình.
  if (!(await canEvaluateStudent(session.user, data.studentId)))
    return { error: "Bạn chỉ được đánh giá học sinh được phân công cho mình" };

  // Ghi mức + AuditLog trong cùng transaction (hành động nhạy cảm — §2.3).
  await prisma.$transaction([
    prisma.studentSubjectLevel.create({
      data: {
        studentId: data.studentId,
        subjectId: data.subjectId,
        level: data.level,
        evaluatedById: session.user.id,
        note: data.note?.trim() || null,
      },
    }),
    prisma.auditLog.create({
      data: {
        actorId: session.user.id,
        action: "student.evaluate",
        entityType: "StudentSubjectLevel",
        entityId: data.studentId,
        payload: { subjectId: data.subjectId, level: data.level, note: data.note?.trim() || null },
      },
    }),
  ]);

  revalidatePath(`/staff/students/${data.studentId}`);
  return { success: true };
}

/**
 * Lưu đánh giá của GV cho các HS sau một buổi học (3 chiều 1–5 + ghi chú).
 * Mỗi record: ô để trống hoàn toàn ⇒ xóa đánh giá cũ; có ít nhất 1 giá trị ⇒ upsert.
 */
export async function saveSessionEvaluationsAction(
  sessionId: string,
  records: {
    studentId: string;
    performance: number | null;
    diligence: number | null;
    comprehension: number | null;
    note?: string;
  }[],
): Promise<{ error: string } | { success: true }> {
  const session = await requireSession();
  if (!(await can(session.user, "class.evaluate_session")))
    return { error: "Không có quyền đánh giá buổi học" };

  const sess = await prisma.classSession.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      classId: true,
      teacherId: true,
      class: { select: { advisorId: true, teachers: { select: { teacherId: true } } } },
    },
  });
  if (!sess) return { error: "Không tìm thấy buổi học" };

  // Chỉ người dạy buổi/GV của lớp/CBĐT phụ trách (hoặc OWNER/ADMIN/CBDTS) được đánh giá.
  if (
    !canOperateClassSession(session.user, {
      advisorId: sess.class.advisorId,
      teacherIds: sess.class.teachers.map((t) => t.teacherId),
      sessionTeacherId: sess.teacherId,
    })
  )
    return { error: "Bạn không phụ trách lớp này" };

  const clamp = (n: number | null) =>
    n === null ? null : Math.min(5, Math.max(1, Math.round(n)));

  await prisma.$transaction(
    records.map((r) => {
      const performance = clamp(r.performance);
      const diligence = clamp(r.diligence);
      const comprehension = clamp(r.comprehension);
      const note = r.note?.trim() || null;
      const empty = !performance && !diligence && !comprehension && !note;

      if (empty) {
        return prisma.sessionEvaluation.deleteMany({
          where: { sessionId, studentId: r.studentId },
        });
      }
      return prisma.sessionEvaluation.upsert({
        where: { sessionId_studentId: { sessionId, studentId: r.studentId } },
        update: { performance, diligence, comprehension, note, evaluatedById: session.user.id },
        create: {
          sessionId,
          studentId: r.studentId,
          performance,
          diligence,
          comprehension,
          note,
          evaluatedById: session.user.id,
        },
      });
    }),
  );

  revalidatePath(`/staff/classes/${sess.classId}/sessions/${sessionId}`);
  revalidatePath(`/teacher/classes/${sess.classId}/sessions/${sessionId}`);
  return { success: true };
}

export type StudentSubjectReference = {
  avgScore: number | null;
  attempts: { title: string; score: number | null; submittedAt: string }[];
  attendance: { present: number; total: number };
  /** Trung bình đánh giá-buổi của GV trên môn này (mỗi chiều 1–5; null nếu chưa có). */
  sessionEval: {
    performance: number | null;
    diligence: number | null;
    comprehension: number | null;
    count: number;
  };
  /** Mức đề xuất tự động (CBĐT xác nhận mới ghi); null nếu chưa đủ dữ liệu. */
  suggestedLevel: StudentLevel | null;
  suggestedReason: string | null;
};

/**
 * Dữ liệu tham chiếu giúp CBĐT đánh giá năng lực một HS trên một môn:
 * điểm các bài kiểm tra đã nộp (cùng môn) + tỉ lệ điểm danh các lớp môn đó.
 * Chỉ đọc — không thay StudentSubjectLevel; CBĐT vẫn tự quyết mức.
 */
export async function getStudentSubjectReferenceAction(
  studentId: string,
  subjectId: string,
): Promise<{ error: string } | StudentSubjectReference> {
  const session = await requireSession();
  if (!(await can(session.user, "student.evaluate"))) return { error: "Không có quyền" };
  if (!studentId || !subjectId) return { error: "Thiếu thông tin" };
  if (!(await canEvaluateStudent(session.user, studentId)))
    return { error: "Bạn chỉ được xem học sinh được phân công cho mình" };

  const [attempts, attendances, evals] = await Promise.all([
    prisma.examAttempt.findMany({
      where: { studentId, submittedAt: { not: null }, exam: { subjectId } },
      select: { score: true, submittedAt: true, exam: { select: { title: true } } },
      orderBy: { submittedAt: "desc" },
      take: 8,
    }),
    prisma.attendance.findMany({
      where: { studentId, session: { class: { subjectId } } },
      select: { status: true },
    }),
    prisma.sessionEvaluation.findMany({
      where: { studentId, session: { class: { subjectId } } },
      select: { performance: true, diligence: true, comprehension: true },
    }),
  ]);

  const scored = attempts.map((a) => a.score).filter((s): s is number => s !== null);
  const avgScore = scored.length ? scored.reduce((a, b) => a + b, 0) / scored.length : null;
  const present = attendances.filter((a) => a.status === "PRESENT" || a.status === "LATE").length;

  const avgOf = (vals: (number | null)[]) => {
    const xs = vals.filter((v): v is number => v !== null);
    return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
  };

  const sePerformance = avgOf(evals.map((e) => e.performance));
  const seDiligence = avgOf(evals.map((e) => e.diligence));
  const seComprehension = avgOf(evals.map((e) => e.comprehension));

  // ── Đề xuất mức (bán tự động): ưu tiên điểm Exam (ngưỡng tài liệu),
  // không có thì suy từ trung bình đánh giá-buổi (thang 5). CBĐT vẫn chốt.
  let suggestedLevel: StudentLevel | null = null;
  let suggestedReason: string | null = null;
  if (avgScore !== null) {
    suggestedLevel =
      avgScore < 50 ? "WEAK" : avgScore < 80 ? "AVERAGE" : avgScore < 90 ? "GOOD" : "EXCELLENT";
    suggestedReason = `điểm TB ${avgScore.toFixed(1)}`;
  } else {
    const seAvg = avgOf([sePerformance, seDiligence, seComprehension]);
    if (seAvg !== null) {
      suggestedLevel =
        seAvg < 2.5 ? "WEAK" : seAvg < 4 ? "AVERAGE" : seAvg < 4.5 ? "GOOD" : "EXCELLENT";
      suggestedReason = `đánh giá buổi ${seAvg.toFixed(1)}/5`;
    }
  }

  return {
    avgScore,
    attempts: attempts.slice(0, 5).map((a) => ({
      title: a.exam.title,
      score: a.score,
      submittedAt: a.submittedAt!.toISOString(),
    })),
    attendance: { present, total: attendances.length },
    sessionEval: {
      performance: sePerformance,
      diligence: seDiligence,
      comprehension: seComprehension,
      count: evals.length,
    },
    suggestedLevel,
    suggestedReason,
  };
}

/**
 * Đề xuất mức năng lực bằng AI (tổng hợp điểm Exam + điểm danh + đánh giá-buổi).
 * On-demand: chỉ chạy khi CBĐT bấm nút — kiểm soát chi phí. CBĐT vẫn tự chốt.
 */
export async function getAiLevelSuggestionAction(
  studentId: string,
  subjectId: string,
): Promise<{ error: string } | LevelSuggestion> {
  const ref = await getStudentSubjectReferenceAction(studentId, subjectId);
  if ("error" in ref) return ref; // đã kiểm quyền + canEvaluateStudent bên trong

  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
    select: { name: true },
  });
  if (!subject) return { error: "Không tìm thấy môn học" };

  const hasData =
    ref.avgScore !== null || ref.attendance.total > 0 || ref.sessionEval.count > 0;
  if (!hasData)
    return { error: "Chưa có dữ liệu (điểm/điểm danh/đánh giá buổi) để AI phân tích." };

  try {
    return await suggestProficiencyLevel({
      subject: subject.name,
      avgScore: ref.avgScore,
      examScores: ref.attempts
        .map((a) => a.score)
        .filter((s): s is number => s !== null),
      attendance: ref.attendance,
      sessionEval: ref.sessionEval,
    });
  } catch {
    return { error: "AI không phản hồi được lúc này. Vui lòng thử lại." };
  }
}

