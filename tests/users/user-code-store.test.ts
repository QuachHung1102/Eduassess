import { describe, expect, it, vi } from "vitest";
import { generateUserCode } from "@/lib/users/user-code-store";
import type { UserCategory } from "@prisma/client";

function cat(over: Partial<UserCategory>): UserCategory {
  return {
    id: "c1", label: "Học sinh", prefix: "HS", systemKey: "STUDENT",
    includeYear: true, padWidth: 6, sortOrder: 0, isActive: true,
    createdAt: new Date(), updatedAt: new Date(), ...over,
  } as UserCategory;
}

describe("generateUserCode", () => {
  it("HS: dùng năm hiện tại, seq = nextSeq-1 sau increment", async () => {
    const upsert = vi.fn().mockResolvedValue({ nextSeq: 2 }); // lần đầu → seq 1
    const tx = { userCodeCounter: { upsert } } as never;
    const year = new Date().getFullYear();

    const code = await generateUserCode(tx, cat({}));

    expect(code).toBe(`HS-${year}-000001`);
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { categoryId_year: { categoryId: "c1", year } } }),
    );
  });

  it("loại không-năm: year=0, không có phần năm trong mã", async () => {
    const upsert = vi.fn().mockResolvedValue({ nextSeq: 8 }); // seq 7
    const tx = { userCodeCounter: { upsert } } as never;

    const code = await generateUserCode(
      tx,
      cat({ prefix: "CN", systemKey: "OWNER", includeYear: false, padWidth: 3 }),
    );

    expect(code).toBe("CN-007");
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { categoryId_year: { categoryId: "c1", year: 0 } } }),
    );
  });
});
