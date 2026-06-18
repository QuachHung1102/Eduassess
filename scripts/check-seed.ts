/**
 * Đếm bản ghi mỗi domain sau seed để kiểm "đầy đủ".
 * Chạy: npm run db:check-seed
 */
import "dotenv/config";
import { prisma } from "../lib/db/prisma";

async function main() {
  const counts: Record<string, number> = {
    "users (total)": await prisma.user.count(),
    "  students": await prisma.user.count({ where: { role: "STUDENT" } }),
    "  teachers": await prisma.user.count({ where: { role: "TEACHER" } }),
    "  staff": await prisma.user.count({ where: { role: "STAFF" } }),
    "  parents": await prisma.user.count({ where: { role: "PARENT" } }),
    "users WITHOUT code": await prisma.user.count({ where: { code: null } }),
    "user categories": await prisma.userCategory.count(),
    classes: await prisma.class.count(),
    "  classes OFFLINE": await prisma.class.count({ where: { mode: "OFFLINE" } }),
    sessions: await prisma.classSession.count(),
    occupancies: await prisma.roomOccupancy.count(),
    attendances: await prisma.attendance.count(),
    sessionEvaluations: await prisma.sessionEvaluation.count(),
    bookings: await prisma.roomBooking.count(),
    "  bookings APPROVED": await prisma.roomBooking.count({ where: { status: "APPROVED" } }),
    roomLayoutImages: await prisma.roomLayoutImage.count(),
    notifications: await prisma.notification.count(),
    flashcardSets: await prisma.flashcardSet.count(),
    flashcardSessions: await prisma.flashcardSession.count(),
    examAttempts: await prisma.examAttempt.count(),
    "  attempts w/ aiFeedback": await prisma.examAttempt.count({ where: { aiFeedback: { not: null } } }),
    studentSubjectLevels: await prisma.studentSubjectLevel.count(),
    securityAnswers: await prisma.securityAnswer.count(),
    auditLogs: await prisma.auditLog.count(),
  };

  console.log("─".repeat(50));
  for (const [k, v] of Object.entries(counts)) console.log(`${k.padEnd(28)} ${v}`);
  console.log("─".repeat(50));

  if (counts["users WITHOUT code"] > 0) console.warn(`⚠️  ${counts["users WITHOUT code"]} user CHƯA có mã!`);
  const empties = Object.entries(counts).filter(([k, v]) => v === 0 && !k.startsWith("  ") && k !== "users WITHOUT code");
  if (empties.length) console.warn(`⚠️  Domain rỗng: ${empties.map(([k]) => k).join(", ")}`);
  else console.log("✅ Mọi domain đều có dữ liệu");

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
