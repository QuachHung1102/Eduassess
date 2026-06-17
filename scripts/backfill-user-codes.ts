/**
 * Backfill mã định danh cho user đang có trong DB (code=null).
 * Tạo loại hệ thống nếu thiếu, rồi cấp mã theo (role, staffPosition).
 * Idempotent — chạy lại chỉ xử lý user chưa có mã.
 * Chạy: npm run db:backfill-codes
 */
import "dotenv/config";
import { prisma } from "../lib/db/prisma";
import { seedSystemCategories, assignCodesToUsersWithoutCode } from "../lib/users/seed-categories";

async function main() {
  await seedSystemCategories();
  const coded = await assignCodesToUsersWithoutCode();
  console.log(`✅ Đã cấp mã cho ${coded} user.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
