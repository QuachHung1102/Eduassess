import { FaIcon } from "@/components/ui/FaIcon";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";

/**
 * Header trang dùng chung cho khu dashboard — thống nhất tiêu đề/mô tả/hành động
 * thay vì mỗi trang tự dựng icon+h1+p lệch nhau. Responsive: tiêu đề co theo
 * breakpoint, vùng hành động xuống dòng gọn trên mobile.
 */
export function PageHeader({
  icon,
  title,
  subtitle,
  actions,
}: {
  icon?: IconDefinition;
  title: string;
  subtitle?: React.ReactNode;
  /** Nút/điều khiển bên phải (vd "Thêm mới"). Tự xuống dòng trên màn nhỏ. */
  actions?: React.ReactNode;
}) {
  return (
    <div className="shrink-0 flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          {icon && (
            <span className="text-lg sm:text-xl shrink-0" style={{ color: "var(--primary)" }}>
              <FaIcon icon={icon} />
            </span>
          )}
          <h1 className="text-xl sm:text-2xl font-bold truncate" style={{ color: "var(--foreground)" }}>
            {title}
          </h1>
        </div>
        {subtitle && (
          <p className="mt-1 text-sm" style={{ color: "color-mix(in srgb, var(--foreground) 60%, transparent)" }}>
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
