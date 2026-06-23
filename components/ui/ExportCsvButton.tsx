"use client";

import { toCsv } from "@/lib/export/csv";
import { FaIcon } from "@/components/ui/FaIcon";
import { faDownload } from "@fortawesome/free-solid-svg-icons";

type Cell = string | number | null | undefined;

/**
 * Nút xuất CSV phía client từ dữ liệu ĐÃ có trên trang (không cần API route).
 * Dựng CSV bằng `toCsv` rồi tải qua Blob; thêm BOM (﻿) để Excel nhận UTF-8
 * (tên tiếng Việt không lỗi font). Tự vô hiệu khi không có dòng nào.
 */
export function ExportCsvButton({
  filename,
  headers,
  rows,
  label = "Xuất CSV",
}: {
  filename: string;
  headers: string[];
  rows: Cell[][];
  label?: string;
}) {
  function handleExport() {
    const blob = new Blob(["﻿" + toCsv(headers, rows)], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={rows.length === 0}
      className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <FaIcon icon={faDownload} />
      {label}
    </button>
  );
}
