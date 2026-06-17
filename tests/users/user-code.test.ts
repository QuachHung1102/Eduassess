import { describe, expect, it } from "vitest";
import { formatUserCode } from "@/lib/users/user-code";

describe("formatUserCode", () => {
  it("có năm: prefix-năm-seq(pad)", () => {
    expect(formatUserCode({ prefix: "HS", includeYear: true, padWidth: 6, year: 2026, seq: 1 }))
      .toBe("HS-2026-000001");
  });
  it("không năm: prefix-seq(pad)", () => {
    expect(formatUserCode({ prefix: "CN", includeYear: false, padWidth: 3, year: 0, seq: 7 }))
      .toBe("CN-007");
  });
  it("padWidth 0 ⇒ không pad", () => {
    expect(formatUserCode({ prefix: "MKT", includeYear: false, padWidth: 0, year: 0, seq: 712 }))
      .toBe("MKT-712");
  });
  it("seq vượt padWidth ⇒ giữ nguyên độ dài", () => {
    expect(formatUserCode({ prefix: "HS", includeYear: true, padWidth: 6, year: 2026, seq: 1234567 }))
      .toBe("HS-2026-1234567");
  });
});
