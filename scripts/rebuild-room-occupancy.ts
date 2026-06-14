/**
 * Dựng lại toàn bộ room_occupancies từ ClassSession + RoomBooking (ADR-0001).
 * Dùng khi nghi ngờ bảng denormalized bị drift so với nguồn.
 * Chạy: npm run db:rebuild-occupancy
 */
import "dotenv/config";
import { prisma } from "../lib/db/prisma";
import { rebuildRoomOccupancies } from "../lib/rooms/store";

rebuildRoomOccupancies()
  .then(({ sessions, bookings }) => {
    console.log(`Đã dựng lại room_occupancies: ${sessions} block buổi học, ${bookings} block đặt phòng.`);
  })
  .finally(() => prisma.$disconnect());
