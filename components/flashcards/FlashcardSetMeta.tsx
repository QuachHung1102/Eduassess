import { FaIcon } from "@/components/ui/FaIcon";
import { faBookOpen, faTag, faUser } from "@fortawesome/free-solid-svg-icons";
import { DIFFICULTY_LABEL, LEVEL_LABEL } from "@/lib/constants/labels";

type Props = {
  subject: string;
  grade: { level: string; gradeNumber: number };
  topicName: string;
  difficulty: string;
  cardCount: number;
  createdByName: string;
  /** When provided, shows a role-labelled creator row instead of "Người tạo: X" */
  createdByRole?: string | null;
  description?: string | null;
};

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Thư viện admin",
  TEACHER: "Bộ của giáo viên",
};

export function FlashcardSetMeta({
  subject,
  grade,
  topicName,
  difficulty,
  cardCount,
  createdByName,
  createdByRole,
  description,
}: Props) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-sm" style={{ color: "color-mix(in srgb, var(--foreground) 60%, transparent)" }}>
        <span className="mr-1" style={{ color: "color-mix(in srgb, var(--foreground) 45%, transparent)" }}><FaIcon icon={faBookOpen} /></span>
        {subject} · {LEVEL_LABEL[grade.level]} · Lớp {grade.gradeNumber}
      </p>
      <p className="text-sm" style={{ color: "color-mix(in srgb, var(--foreground) 60%, transparent)" }}>
        <span className="mr-1" style={{ color: "color-mix(in srgb, var(--foreground) 45%, transparent)" }}><FaIcon icon={faTag} /></span>
        {topicName} · {DIFFICULTY_LABEL[difficulty]} · {cardCount} thẻ
      </p>
      {createdByRole != null ? (
        <p className="text-sm" style={{ color: "color-mix(in srgb, var(--foreground) 60%, transparent)" }}>
          <span className="mr-1" style={{ color: "color-mix(in srgb, var(--foreground) 45%, transparent)" }}><FaIcon icon={faUser} /></span>
          {createdByName} · {ROLE_LABEL[createdByRole] ?? createdByRole}
        </p>
      ) : (
        <p className="text-sm" style={{ color: "color-mix(in srgb, var(--foreground) 50%, transparent)" }}>Người tạo: {createdByName}</p>
      )}
      {description ? <p className="text-sm" style={{ color: "color-mix(in srgb, var(--foreground) 50%, transparent)" }}>{description}</p> : null}
    </div>
  );
}
