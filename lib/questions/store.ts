/**
 * Question store — module thuần đọc/ghi Question (ngân hàng câu hỏi).
 *
 * Đây là source-of-truth cho nghiệp vụ soạn câu hỏi: validate 4 đáp án A/B/C/D,
 * tìm-hoặc-tạo Topic, dựng mảng options, ghi DB. Module KHÔNG biết về phiên
 * đăng nhập, role, revalidate hay redirect — những việc đó nằm ở seam.
 *
 * Chính sách (policy) được truyền vào qua tham số, không hard-code trong module:
 *   - status: PENDING (giáo viên tạo) hoặc APPROVED (admin tạo)
 *   - ownerId: id người tạo (giới hạn câu của mình) hoặc undefined (mọi câu)
 *   - updateMeta: true thì cho phép đổi môn/chủ đề khi sửa (admin), false thì
 *     chỉ sửa nội dung/đáp án/độ khó (giáo viên)
 *
 * Việc kiểm tra "giáo viên có dạy môn này / môn có cho phép thêm câu" là chính
 * sách riêng của giáo viên — nằm ở seam, không thuộc module này.
 */

import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";
import type { Difficulty, QuestionStatus } from "@/lib/types";

const OPTION_LABELS = ["A", "B", "C", "D"] as const;

export type QuestionWriteInput = {
  content: string;
  explanation: string | null;
  difficulty: Difficulty;
  correctAnswer: string;
  /** Văn bản 4 đáp án theo thứ tự A, B, C, D. */
  optionTexts: (string | null | undefined)[];
  // Metadata — bắt buộc khi tạo, tuỳ chọn khi sửa (chỉ admin sửa).
  subjectId?: string;
  gradeId?: string;
  topicName?: string;
};

export type CreateQuestionContext = {
  createdById: string;
  status: QuestionStatus;
};

export type UpdateQuestionContext = {
  /** id người tạo để giới hạn quyền sửa; undefined = sửa mọi câu (admin). */
  ownerId: string | undefined;
  /** true: cho phép đổi môn/chủ đề; false: chỉ sửa nội dung/đáp án. */
  updateMeta: boolean;
};

/** Kiểm tra nội dung lõi (content, độ khó, đáp án). Trả null nếu hợp lệ. */
function validateCore(input: QuestionWriteInput): string | null {
  if (!input.content || !input.difficulty || !input.correctAnswer) {
    return "Vui lòng điền đầy đủ thông tin";
  }
  if (input.optionTexts.some((t) => !t)) {
    return "Vui lòng nhập đủ 4 đáp án";
  }
  if (!["EASY", "MEDIUM", "HARD"].includes(input.difficulty)) {
    return "Độ khó không hợp lệ";
  }
  if (!OPTION_LABELS.includes(input.correctAnswer as (typeof OPTION_LABELS)[number])) {
    return "Chưa chọn đáp án đúng";
  }
  return null;
}

/** Kiểm tra metadata (môn, khối, chủ đề). Trả null nếu hợp lệ. */
function validateMeta(input: QuestionWriteInput): string | null {
  if (!input.subjectId || !input.gradeId || !input.topicName) {
    return "Vui lòng điền đầy đủ thông tin";
  }
  return null;
}

/**
 * Kiểm tra topicName thuộc đúng (subjectId, gradeId) — Topic là option-list,
 * client chỉ được chọn trong danh sách có sẵn. Trả null nếu hợp lệ.
 */
export async function assertTopicExists(
  subjectId: string,
  gradeId: string,
  topicName: string,
): Promise<string | null> {
  const topic = await prisma.topic.findFirst({
    where: { subjectId, gradeId, name: topicName },
    select: { id: true },
  });
  if (!topic) {
    return "Chủ đề không hợp lệ. Vui lòng chọn một chủ đề trong danh sách.";
  }
  return null;
}

/** Tìm topic theo tên + môn + khối; nếu chưa có thì tạo mới. */
async function findOrCreateTopic(subjectId: string, gradeId: string, topicName: string) {
  const existing = await prisma.topic.findFirst({
    where: { name: topicName, subjectId, gradeId },
  });
  if (existing) return existing.id;
  const created = await prisma.topic.create({
    data: { name: topicName, subjectId, gradeId },
  });
  return created.id;
}

/** Dựng mảng đáp án [{ label, text, isCorrect }]. */
function buildOptions(input: QuestionWriteInput) {
  return OPTION_LABELS.map((label, index) => ({
    label,
    text: input.optionTexts[index] as string,
    isCorrect: label === input.correctAnswer,
  }));
}

// ── Tạo câu hỏi ───────────────────────────────────────────────
export async function createQuestion(
  input: QuestionWriteInput,
  ctx: CreateQuestionContext
): Promise<{ error: string } | { id: string }> {
  const invalidCore = validateCore(input);
  if (invalidCore) return { error: invalidCore };
  const invalidMeta = validateMeta(input);
  if (invalidMeta) return { error: invalidMeta };

  const topicId = await findOrCreateTopic(
    input.subjectId as string,
    input.gradeId as string,
    input.topicName as string
  );

  const question = await prisma.question.create({
    data: {
      content: input.content,
      explanation: input.explanation,
      options: buildOptions(input),
      difficulty: input.difficulty,
      status: ctx.status,
      topicId,
      subjectId: input.subjectId as string,
      createdById: ctx.createdById,
    },
  });

  return { id: question.id };
}

// ── Sửa câu hỏi ───────────────────────────────────────────────
export async function updateQuestion(
  questionId: string,
  input: QuestionWriteInput,
  ctx: UpdateQuestionContext
): Promise<{ error: string } | { success: true }> {
  const where = ctx.ownerId
    ? { id: questionId, createdById: ctx.ownerId }
    : { id: questionId };
  const existing = await prisma.question.findFirst({ where });
  if (!existing) return { error: "Không tìm thấy câu hỏi hoặc bạn không có quyền" };

  const invalidCore = validateCore(input);
  if (invalidCore) return { error: invalidCore };

  const data: {
    content: string;
    explanation: string | null;
    difficulty: Difficulty;
    options: ReturnType<typeof buildOptions>;
    topicId?: string;
    subjectId?: string;
  } = {
    content: input.content,
    explanation: input.explanation,
    difficulty: input.difficulty,
    options: buildOptions(input),
  };

  if (ctx.updateMeta) {
    const invalidMeta = validateMeta(input);
    if (invalidMeta) return { error: invalidMeta };
    data.topicId = await findOrCreateTopic(
      input.subjectId as string,
      input.gradeId as string,
      input.topicName as string
    );
    data.subjectId = input.subjectId as string;
  }

  await prisma.question.update({ where: { id: questionId }, data });
  return { success: true };
}

// ── Xóa câu hỏi ───────────────────────────────────────────────
export async function deleteQuestion(
  questionId: string,
  ownerId: string | undefined
): Promise<{ error: string } | { success: true }> {
  const where = ownerId ? { id: questionId, createdById: ownerId } : { id: questionId };
  const existing = await prisma.question.findFirst({ where });
  if (!existing) return { error: "Không tìm thấy câu hỏi" };

  await prisma.question.delete({ where: { id: questionId } });
  return { success: true };
}

// ── Liệt kê câu hỏi (có lọc + phân trang) ─────────────────────
export type QuestionListFilter = {
  subjectId?: string;
  gradeId?: string;
  /** "ALL" hoặc rỗng = không lọc. */
  difficulty?: string;
  /** "ALL" hoặc rỗng = không lọc. */
  status?: string;
  creator?: string;
  isUnivExam?: "YES" | "NO";
  hasExplanation?: "YES" | "NO";
  search?: string;
};

export type ListQuestionsContext<I extends Prisma.QuestionInclude> = {
  /** undefined = mọi câu (admin); id = chỉ câu của người đó (teacher). */
  ownerId?: string;
  page?: number;
  pageSize?: number;
  /** Quan hệ cần nạp — quyết định hình dạng dữ liệu trả về cho từng role. */
  include: I;
};

/** Dựng điều kiện lọc câu hỏi dùng chung cho mọi role. */
function buildQuestionWhere(
  filter: QuestionListFilter,
  ownerId: string | undefined
): Prisma.QuestionWhereInput {
  const difficulty =
    filter.difficulty && filter.difficulty !== "ALL"
      ? (filter.difficulty as Difficulty)
      : undefined;
  const status =
    filter.status && filter.status !== "ALL"
      ? (filter.status as QuestionStatus)
      : undefined;

  return {
    ...(ownerId ? { createdById: ownerId } : {}),
    ...(filter.subjectId ? { subjectId: filter.subjectId } : {}),
    ...(filter.gradeId ? { topic: { gradeId: filter.gradeId } } : {}),
    ...(difficulty ? { difficulty } : {}),
    ...(status ? { status } : {}),
    ...(filter.creator
      ? { createdBy: { name: { contains: filter.creator, mode: "insensitive" as const } } }
      : {}),
    ...(filter.isUnivExam === "YES"
      ? { isUnivExam: true }
      : filter.isUnivExam === "NO"
        ? { isUnivExam: false }
        : {}),
    ...(filter.hasExplanation === "YES"
      ? { explanation: { not: null } }
      : filter.hasExplanation === "NO"
        ? { OR: [{ explanation: null }, { explanation: "" }] }
        : {}),
    ...(filter.search
      ? { content: { contains: filter.search, mode: "insensitive" as const } }
      : {}),
  };
}

export async function listQuestions<I extends Prisma.QuestionInclude>(
  filter: QuestionListFilter,
  ctx: ListQuestionsContext<I>
): Promise<{ questions: Prisma.QuestionGetPayload<{ include: I }>[]; total: number }> {
  const page = ctx.page ?? 1;
  const pageSize = ctx.pageSize ?? 15;
  const where = buildQuestionWhere(filter, ctx.ownerId);

  const [questions, total] = await Promise.all([
    prisma.question.findMany({
      where,
      include: ctx.include,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.question.count({ where }),
  ]);

  return {
    questions: questions as Prisma.QuestionGetPayload<{ include: I }>[],
    total,
  };
}
