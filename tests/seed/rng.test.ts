import { describe, expect, it } from "vitest";
import { makeRng } from "@/lib/seed/rng";

describe("makeRng", () => {
  it("tất định theo seed", () => {
    const a = makeRng(42);
    const b = makeRng(42);
    expect([a.next(), a.next(), a.next()]).toEqual([b.next(), b.next(), b.next()]);
  });

  it("int trong [min,max] (inclusive)", () => {
    const r = makeRng(1);
    for (let i = 0; i < 200; i++) {
      const n = r.int(3, 7);
      expect(n).toBeGreaterThanOrEqual(3);
      expect(n).toBeLessThanOrEqual(7);
      expect(Number.isInteger(n)).toBe(true);
    }
  });

  it("pick lấy phần tử trong mảng; shuffle giữ nguyên multiset", () => {
    const r = makeRng(7);
    const arr = [1, 2, 3, 4, 5];
    expect(arr).toContain(r.pick(arr));
    expect([...r.shuffle(arr)].sort((x, y) => x - y)).toEqual([1, 2, 3, 4, 5]);
  });

  it("seed khác ⇒ dãy khác", () => {
    expect(makeRng(1).next()).not.toBe(makeRng(2).next());
  });
});
