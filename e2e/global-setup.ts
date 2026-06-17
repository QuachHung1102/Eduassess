import "dotenv/config";
import { prisma } from "../lib/db/prisma";

// Reset trạng thái cho e2e "làm bài": xóa lượt làm của HS test trên đề luyện tập
// để mỗi lần chạy đều bắt đầu "sạch" (UI chỉ hiện "Bắt đầu" khi chưa có lượt nộp).
const PRACTICE_TITLE = "Luyện tập Đại số 10 (demo)";
const STUDENT_EMAIL = "hs0005@eduassess.vn";

export default async function globalSetup() {
  const exam = await prisma.exam.findFirst({
    where: { title: PRACTICE_TITLE },
    select: { id: true },
  });
  const student = await prisma.user.findUnique({
    where: { email: STUDENT_EMAIL },
    select: { id: true },
  });

  if (exam && student) {
    const attempts = await prisma.examAttempt.findMany({
      where: { examId: exam.id, studentId: student.id },
      select: { id: true },
    });
    const ids = attempts.map((a) => a.id);
    if (ids.length > 0) {
      await prisma.examAnswer.deleteMany({ where: { attemptId: { in: ids } } });
      await prisma.examAttempt.deleteMany({ where: { id: { in: ids } } });
    }
  }

  await prisma.$disconnect();
}
