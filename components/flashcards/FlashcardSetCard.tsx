"use client";

import type { ReactNode } from "react";
import { CldImage } from "@/components/ui/CloudinaryImage";
import { FaIcon } from "@/components/ui/FaIcon";
import { faBookOpen, faTag, faLayerGroup } from "@fortawesome/free-solid-svg-icons";
import { useLanguage } from "@/lib/i18n/LanguageContext";

type Props = {
  title: string;
  previewImageUrl?: string | null;
  cardCount: number;
  sessionCount: number;
  subject: string;
  grade: { level: string; gradeNumber: number };
  topicName: string;
  badge: ReactNode;
  actions: ReactNode;
  priority?: boolean;
};

export function FlashcardSetCard({
  title,
  previewImageUrl,
  cardCount,
  sessionCount,
  subject,
  grade,
  topicName,
  badge,
  actions,
  priority = false,
}: Props) {
  const { tr } = useLanguage();

  return (
    <div
      className="flex flex-col h-full rounded-2xl overflow-hidden transition-shadow hover:shadow-md"
      style={{
        backgroundColor: "var(--surface-strong)",
        border: "1.5px solid var(--border-soft)",
      }}
    >
      {/* Image */}
      <div
        className="aspect-video w-full shrink-0 overflow-hidden"
        style={{ backgroundColor: "color-mix(in srgb, var(--foreground) 5%, var(--surface-strong))" }}
      >
        {previewImageUrl ? (
          <CldImage
            src={previewImageUrl}
            alt={title}
            width={800}
            height={450}
            crop="fill"
            className="h-full w-full object-cover"
            loading={priority ? "eager" : "lazy"}
            priority={priority}
          />
        ) : (
          <div
            className="flex h-full items-center justify-center gap-2 text-xs"
            style={{ color: "color-mix(in srgb, var(--foreground) 30%, transparent)" }}
          >
            <FaIcon icon={faLayerGroup} className="text-lg opacity-40" />
            <span>{tr.flashcards.noPreview}</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-4 gap-2.5">
        {/* Title row */}
        <div className="flex items-start justify-between gap-2">
          <h3
            className="font-semibold text-sm leading-snug line-clamp-2 flex-1"
            style={{ color: "var(--foreground)" }}
          >
            {title}
          </h3>
          <div className="shrink-0 mt-0.5">{badge}</div>
        </div>

        {/* Meta */}
        <div className="flex flex-col gap-1">
          <p
            className="text-xs truncate flex items-center gap-1.5"
            style={{ color: "color-mix(in srgb, var(--foreground) 55%, transparent)" }}
          >
            <FaIcon icon={faBookOpen} className="shrink-0 opacity-60" />
            {subject} · {tr.level[grade.level as keyof typeof tr.level]} · {tr.gradePrefix} {grade.gradeNumber}
          </p>
          <p
            className="text-xs truncate flex items-center gap-1.5"
            style={{ color: "color-mix(in srgb, var(--foreground) 55%, transparent)" }}
          >
            <FaIcon icon={faTag} className="shrink-0 opacity-60" />
            {topicName}
          </p>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3 text-xs mt-auto pt-1">
          <span
            className="font-medium"
            style={{ color: "var(--primary)" }}
          >
            {tr.flashcards.cards(cardCount)}
          </span>
          <span style={{ color: "color-mix(in srgb, var(--foreground) 35%, transparent)" }}>
            {tr.flashcards.sessions(sessionCount)}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div
        className="px-4 py-3 flex items-center gap-3 shrink-0"
        style={{ borderTop: "1px solid var(--border-soft)" }}
      >
        {actions}
      </div>
    </div>
  );
}

