import { prisma } from "../db/prisma";
import { SYSTEM_CATEGORIES, systemKeyFor } from "./categories";
import { generateUserCode } from "./user-code-store";

/** Tạo/đồng bộ các UserCategory hệ thống (idempotent theo systemKey). */
export async function seedSystemCategories() {
  for (const [i, c] of SYSTEM_CATEGORIES.entries()) {
    await prisma.userCategory.upsert({
      where: { systemKey: c.systemKey },
      update: {},
      create: {
        label: c.label,
        prefix: c.prefix,
        systemKey: c.systemKey,
        includeYear: c.includeYear,
        padWidth: c.padWidth,
        sortOrder: i,
      },
    });
  }
}

/**
 * Gán category + code cho mọi user chưa có code (idempotent — chỉ xử lý code=null).
 * HS sắp theo createdAt để số thứ tự ổn định trong từng năm. Trả về số user được cấp.
 */
export async function assignCodesToUsersWithoutCode(): Promise<number> {
  const users = await prisma.user.findMany({
    where: { code: null },
    orderBy: { createdAt: "asc" },
    select: { id: true, role: true, staffPosition: true },
  });
  let done = 0;
  for (const u of users) {
    const systemKey = systemKeyFor(u.role, u.staffPosition);
    const category = await prisma.userCategory.findFirst({ where: { systemKey } });
    if (!category) {
      console.warn(`Bỏ qua user ${u.id}: thiếu category ${systemKey}`);
      continue;
    }
    await prisma.$transaction(async (tx) => {
      const code = await generateUserCode(tx, category);
      await tx.user.update({ where: { id: u.id }, data: { categoryId: category.id, code } });
    });
    done++;
  }
  return done;
}
