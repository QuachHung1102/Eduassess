"use client";

import { MathText } from "@/components/MathText";

interface MathPreviewProps {
  value: string;
  label?: string;
}

export function MathPreview({ value, label = "Xem trước" }: MathPreviewProps) {
  if (!value.trim()) return null;

  return (
    <div className="mt-2 rounded-lg border border-blue-100 bg-blue-50/50 px-3.5 py-2.5 text-sm text-gray-800 leading-relaxed overflow-x-auto whitespace-pre-wrap">
      <span className="block text-[10px] font-semibold text-blue-400 uppercase tracking-wide mb-1.5">
        {label}
      </span>
      <MathText text={value} />
    </div>
  );
}
