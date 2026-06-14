/** Kiểm tra nhanh sau migrate: số block theo nguồn + constraint chống overlap. */
import "dotenv/config";
import { prisma } from "../lib/db/prisma";

async function main() {
  const rows = await prisma.roomOccupancy.groupBy({ by: ["source"], _count: true });
  console.log("Blocks theo nguồn:", JSON.stringify(rows));

  const constraint = await prisma.$queryRaw<
    { conname: string }[]
  >`SELECT conname FROM pg_constraint WHERE conname = 'room_occupancies_no_overlap'`;
  console.log("Constraint:", constraint.length > 0 ? "room_occupancies_no_overlap OK" : "THIẾU!");

  const sessions = await prisma.classSession.count({
    where: { roomId: { not: null }, status: { in: ["SCHEDULED", "COMPLETED"] } },
  });
  const bookings = await prisma.roomBooking.count({ where: { status: "APPROVED" } });
  console.log(`Nguồn gốc: ${sessions} buổi học chiếm phòng, ${bookings} booking đã duyệt`);
}

main().finally(() => prisma.$disconnect());
