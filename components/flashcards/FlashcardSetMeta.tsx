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
      <p className="text-sm text-gray-500">
        <FaIcon icon={faBookOpen} className="mr-1 text-gray-400" />
        {subject} · {LEVEL_LABEL[grade.level]} · Lớp {grade.gradeNumber}
      </p>
      <p className="text-sm text-gray-500">
        <FaIcon icon={faTag} className="mr-1 text-gray-400" />
        {topicName} · {DIFFICULTY_LABEL[difficulty]} · {cardCount} thẻ
      </p>
      {createdByRole != null ? (
        <p className="text-sm text-gray-500">
          <FaIcon icon={faUser} className="mr-1 text-gray-400" />
          {createdByName} · {ROLE_LABEL[createdByRole] ?? createdByRole}
        </p>
      ) : (
        <p className="text-sm text-gray-400">Người tạo: {createdByName}</p>
      )}
      {description ? <p className="text-sm text-gray-400">{description}</p> : null}
    </div>
  );
}
