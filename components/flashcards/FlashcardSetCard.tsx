import type { ReactNode } from "react";
import { CldImage } from "@/components/ui/CloudinaryImage";
import { FaIcon } from "@/components/ui/FaIcon";
import { faLayerGroup, faBookOpen, faTag } from "@fortawesome/free-solid-svg-icons";
import { DIFFICULTY_LABEL, LEVEL_LABEL } from "@/lib/constants/labels";

type Props = {
  title: string;
  previewImageUrl?: string | null;
  cardCount: number;
  sessionCount: number;
  subject: string;
  grade: { level: string; gradeNumber: number };
  topicName: string;
  difficulty: string;
  badge: ReactNode;
  actions: ReactNode;
  /** Set to true for the first card on the page to avoid the LCP lazy-load warning */
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
  difficulty,
  badge,
  actions,
  priority = false,
}: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-col h-full">
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="text-xl shrink-0">
          <FaIcon icon={faLayerGroup} />
        </span>
        <div className="flex items-center gap-2 min-w-0">
          <span className="shrink-0 text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full whitespace-nowrap">
            {cardCount} thẻ
          </span>
          {badge}
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border border-slate-100 bg-slate-50 aspect-4/3 shrink-0">
        {previewImageUrl ? (
          <CldImage
            src={previewImageUrl}
            alt={title}
            width={800}
            height={600}
            crop="fill"
            className="h-full w-full object-cover"
            loading={priority ? "eager" : "lazy"}
            priority={priority}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm font-medium text-slate-400">
            Chưa có ảnh preview
          </div>
        )}
      </div>
      <div className="mt-3 flex flex-col gap-1 flex-1 min-w-0">
        <h3 className="font-semibold text-gray-900 truncate">{title}</h3>
        <p className="text-xs text-gray-500 truncate">
          <FaIcon icon={faBookOpen} className="mr-1 text-gray-400" />
          {subject} · {LEVEL_LABEL[grade.level]} · Lớp {grade.gradeNumber}
        </p>
        <p className="text-xs text-gray-500 truncate">
          <FaIcon icon={faTag} className="mr-1 text-gray-400" />
          {topicName} · {DIFFICULTY_LABEL[difficulty]}
        </p>
        <p className="text-xs text-gray-400">{sessionCount} lượt ôn</p>
      </div>
      <div className="flex items-center gap-3 pt-3 mt-3 border-t border-gray-100">
        {actions}
      </div>
    </div>
  );
}
