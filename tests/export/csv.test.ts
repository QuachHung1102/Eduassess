import { describe, expect, it } from "vitest";

import { toCsv } from "@/lib/export/csv";

describe("toCsv", () => {
  it("ô thường — nối bằng dấu phẩy, dòng bằng CRLF", () => {
    expect(toCsv(["A", "B"], [["1", "2"], ["3", "4"]])).toBe("A,B\r\n1,2\r\n3,4");
  });

  it("bọc nháy ô chứa dấu phẩy / xuống dòng", () => {
    expect(toCsv(["x"], [["a,b"], ["c\nd"]])).toBe('x\r\n"a,b"\r\n"c\nd"');
  });

  it("nhân đôi nháy kép trong ô", () => {
    expect(toCsv(["x"], [['he said "hi"']])).toBe('x\r\n"he said ""hi"""');
  });

  it("null/undefined → ô rỗng; số → chuỗi", () => {
    expect(toCsv(["a", "b", "c"], [[null, undefined, 12.5]])).toBe("a,b,c\r\n,,12.5");
  });

  it("chỉ có tiêu đề khi không có dòng", () => {
    expect(toCsv(["A", "B"], [])).toBe("A,B");
  });
});
