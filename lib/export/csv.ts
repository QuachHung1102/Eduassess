/**
 * Tuần tự hoá CSV — hàm thuần, không phụ thuộc DOM/Node (test được, dùng được
 * cả ở client lẫn server). Seam tải file (Blob + BOM) nằm ở component.
 */

type Cell = string | number | null | undefined;

/** Bọc nháy kép nếu ô chứa dấu phẩy / nháy kép / xuống dòng; nhân đôi nháy kép. */
function escapeCell(value: Cell): string {
  const s = value == null ? "" : String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * Dựng chuỗi CSV từ tiêu đề + các dòng. Phân cách dòng bằng CRLF (chuẩn CSV,
 * Excel/Sheets đọc tốt). Không tự thêm BOM — để seam tải quyết định.
 */
export function toCsv(headers: string[], rows: Cell[][]): string {
  return [headers, ...rows]
    .map((row) => row.map(escapeCell).join(","))
    .join("\r\n");
}
