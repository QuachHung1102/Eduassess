import Link from "next/link";
import { FaIcon } from "@/components/ui/FaIcon";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";

type Props = {
  icon: IconDefinition;
  value: number | string;
  label: string;
  /** Có href → card điều hướng (hover/press). Bỏ trống → ô thống kê tĩnh. */
  href?: string;
  color?: string;
};

export function StatCard({ icon, value, label, href }: Props) {
  const inner = (
    <>
      <div
        className="w-10 h-10 clay-icon flex items-center justify-center mb-3 mx-auto text-white text-base"
        style={{ background: "linear-gradient(135deg, var(--primary), var(--primary-dark))" }}
      >
        <FaIcon icon={icon} />
      </div>
      <div
        className="text-2xl font-bold text-center group-hover:scale-[1.02] transition-transform"
        style={{ color: "var(--foreground)" }}
      >
        {typeof value === "number" ? value.toLocaleString("vi-VN") : value}
      </div>
      <div className="text-xs mt-1 text-center" style={{ color: "color-mix(in srgb, var(--foreground) 60%, transparent)" }}>
        {label}
      </div>
    </>
  );

  if (!href) {
    // Ô tĩnh: giữ bề mặt clay nhưng bỏ tương tác (hover/press/focus-ring).
    return <div className="clay-card group p-5">{inner}</div>;
  }

  return (
    <Link href={href} className="clay-card hover-card-soft focus-ring-soft press-feedback-soft group p-5">
      {inner}
    </Link>
  );
}

