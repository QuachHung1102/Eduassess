import { FaIcon } from "@/components/ui/FaIcon";
import { faDatabase } from "@fortawesome/free-solid-svg-icons";

type Props = {
  headers: string[];
  isEmpty?: boolean;
  emptyText?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
};

export function QuestionTable({
  headers,
  isEmpty,
  emptyText = "Không tìm thấy câu hỏi nào.",
  footer,
  children,
}: Props) {
  return (
    <div
      className="flex-1 flex flex-col min-h-0 rounded-xl overflow-hidden"
      style={{ backgroundColor: "var(--surface-strong)", border: "1.5px solid var(--border-soft)" }}
    >
      <div className="flex-1 overflow-auto min-h-0">
        <table className="w-full text-sm themed-table">
          <thead>
            <tr>
              {headers.map((h) => (
                <th
                  key={h}
                  className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wide"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isEmpty ? (
              <tr>
                <td colSpan={headers.length} className="text-center py-16">
                  <div
                    className="text-3xl mb-2"
                    style={{ color: "color-mix(in srgb, var(--foreground) 25%, transparent)" }}
                  >
                    <FaIcon icon={faDatabase} />
                  </div>
                  <p
                    className="text-sm"
                    style={{ color: "color-mix(in srgb, var(--foreground) 45%, transparent)" }}
                  >
                    {emptyText}
                  </p>
                </td>
              </tr>
            ) : (
              children
            )}
          </tbody>
        </table>
      </div>
      {footer && (
        <div
          className="shrink-0 flex items-center justify-between px-4 py-3"
          style={{
            borderTop: "1px solid var(--border-soft)",
            backgroundColor: "var(--surface-strong)",
          }}
        >
          {footer}
        </div>
      )}
    </div>
  );
}
