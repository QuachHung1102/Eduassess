import type { Prisma, UserCategory } from "@prisma/client";
import { formatUserCode } from "./user-code";

type Tx = Prisma.TransactionClient;

/** Cấp số kế tiếp cho category (atomic trong transaction) rồi format mã. */
export async function generateUserCode(tx: Tx, category: UserCategory): Promise<string> {
  const year = category.includeYear ? new Date().getFullYear() : 0;
  const counter = await tx.userCodeCounter.upsert({
    where: { categoryId_year: { categoryId: category.id, year } },
    create: { categoryId: category.id, year, nextSeq: 2 },
    update: { nextSeq: { increment: 1 } },
  });
  const seq = counter.nextSeq - 1;
  return formatUserCode({
    prefix: category.prefix,
    includeYear: category.includeYear,
    padWidth: category.padWidth,
    year,
    seq,
  });
}

/** Tìm category theo systemKey (resolve mặc định khi tạo user). */
export async function findCategoryBySystemKey(tx: Tx, systemKey: string): Promise<UserCategory | null> {
  return tx.userCategory.findFirst({ where: { systemKey, isActive: true } });
}
