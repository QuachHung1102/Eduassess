import { describe, expect, it } from "vitest";
import { makeRng } from "@/lib/seed/rng";
import { genStudent, genTeacher, genName } from "@/lib/seed/names";

describe("names", () => {
  it("genStudent email theo index, pad 4", () => {
    expect(genStudent(5, makeRng(1)).email).toBe("hs0005@eduassess.vn");
    expect(genStudent(123, makeRng(1)).email).toBe("hs0123@eduassess.vn");
  });

  it("email unique theo i", () => {
    const seen = new Set<string>();
    for (let i = 1; i <= 50; i++) seen.add(genStudent(i, makeRng(i)).email);
    expect(seen.size).toBe(50);
  });

  it("genName 3 phần, không rỗng", () => {
    const n = genName(makeRng(9));
    expect(n.split(" ").length).toBe(3);
    expect(n.trim().length).toBeGreaterThan(0);
  });

  it("genTeacher email gv pad 3", () => {
    expect(genTeacher(2, makeRng(1)).email).toBe("gv002@eduassess.vn");
  });
});
