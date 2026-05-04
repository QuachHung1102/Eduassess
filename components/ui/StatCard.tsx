import Link from "next/link";
import { FaIcon } from "@/components/ui/FaIcon";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";

type Props = {
  icon: IconDefinition;
  value: number | string;
  label: string;
  href: string;
  color?: string;
  stagger?: 1 | 2 | 3 | 4;
};

export function StatCard({ icon, value, label, href, stagger }: Props) {
  return (
    <Link
      href={href}
      className={`clay-card group p-5 animate-fade-in-up${stagger ? ` stagger-${stagger}` : ""}`}
    >
      <div
        className="w-10 h-10 clay-icon flex items-center justify-center mb-3 mx-auto text-white text-base"
        style={{ background: "linear-gradient(135deg, var(--primary), var(--primary-dark))" }}
      >
        <FaIcon icon={icon} />
      </div>
      <div className="text-2xl font-bold text-center text-gray-900 group-hover:scale-105 transition-transform">
        {typeof value === "number" ? value.toLocaleString("vi-VN") : value}
      </div>
      <div className="text-xs text-gray-500 mt-1 text-center">{label}</div>
    </Link>
  );
}

