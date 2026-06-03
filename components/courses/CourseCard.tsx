import Link from "next/link";
import { FaIcon } from "@/components/ui/FaIcon";
import { faBookOpen, faUsers, faPlay } from "@fortawesome/free-solid-svg-icons";

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Nháp",
  PENDING: "Chờ duyệt",
  PUBLISHED: "Đã xuất bản",
  ARCHIVED: "Đã ẩn",
};

const STATUS_COLOR: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-600",
  PENDING: "bg-yellow-100 text-yellow-700",
  PUBLISHED: "bg-green-100 text-green-700",
  ARCHIVED: "bg-red-100 text-red-600",
};

type Props = {
  course: {
    id: string;
    title: string;
    description?: string | null;
    thumbnail?: string | null;
    status: string;
    isFree: boolean;
    subject: { name: string };
    author?: { name: string };
    _count: { lessons: number; enrollments: number };
  };
  href: string;
  showStatus?: boolean;
  showAuthor?: boolean;
  isEnrolled?: boolean;
};

export function CourseCard({
  course,
  href,
  showStatus = false,
  showAuthor = false,
  isEnrolled = false,
}: Props) {
  return (
    <Link
      href={href}
      className="group block rounded-xl overflow-hidden transition-all hover:-translate-y-0.5"
      style={{
        backgroundColor: "var(--surface-strong)",
        border: "1.5px solid var(--border-soft)",
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
      }}
    >
      {/* Thumbnail */}
      <div
        className="h-36 flex items-center justify-center relative"
        style={{
          background: course.thumbnail
            ? `url(${course.thumbnail}) center/cover`
            : "linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)",
        }}
      >
        {!course.thumbnail && (
          <FaIcon icon={faBookOpen} className="text-white text-4xl opacity-60" />
        )}
        {/* Free/Paid badge */}
        <span className="absolute top-2 right-2 text-xs font-bold px-2 py-0.5 rounded-full bg-black/40 text-white backdrop-blur-sm">
          {course.isFree ? "Miễn phí" : "Tính phí"}
        </span>
        {isEnrolled && (
          <span className="absolute top-2 left-2 text-xs font-bold px-2 py-0.5 rounded-full bg-green-500/90 text-white">
            Đã ghi danh
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3
            className="font-semibold text-sm leading-snug line-clamp-2 flex-1 group-hover:opacity-80 transition-opacity"
            style={{ color: "var(--foreground)" }}
          >
            {course.title}
          </h3>
          {showStatus && (
            <span
              className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[course.status]}`}
            >
              {STATUS_LABEL[course.status]}
            </span>
          )}
        </div>

        {course.description && (
          <p
            className="text-xs line-clamp-2"
            style={{ color: "color-mix(in srgb, var(--foreground) 60%, transparent)" }}
          >
            {course.description}
          </p>
        )}

        <div
          className="flex items-center justify-between text-xs pt-1"
          style={{ color: "color-mix(in srgb, var(--foreground) 55%, transparent)" }}
        >
          <span className="flex items-center gap-1">
            <FaIcon icon={faPlay} />
            {course._count.lessons} bài
          </span>
          <span className="flex items-center gap-1">
            <FaIcon icon={faUsers} />
            {course._count.enrollments}
          </span>
          <span
            className="px-2 py-0.5 rounded-full text-xs"
            style={{
              backgroundColor: "color-mix(in srgb, var(--primary) 12%, transparent)",
              color: "var(--primary)",
            }}
          >
            {course.subject.name}
          </span>
        </div>

        {showAuthor && course.author && (
          <p
            className="text-xs"
            style={{ color: "color-mix(in srgb, var(--foreground) 50%, transparent)" }}
          >
            GV: {course.author.name}
          </p>
        )}
      </div>
    </Link>
  );
}
