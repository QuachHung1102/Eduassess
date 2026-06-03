import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getCourseForStudent } from "@/lib/courses/queries";
import { FaIcon } from "@/components/ui/FaIcon";
import {
  faPlayCircle, faLock, faCheckCircle, faBookOpen,
  faUsers, faArrowRight,
} from "@fortawesome/free-solid-svg-icons";
import { CourseQASection } from "./CourseQASection";
import { CourseReviewSection } from "./CourseReviewSection";
import { EnrollButton } from "./EnrollButton";

export default async function StudentCourseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const data = await getCourseForStudent(id, session.user.id!);
  if (!data || !data.course) notFound();

  const { course, isEnrolled, completedLessonIds } = data as {
    course: NonNullable<typeof data.course>;
    isEnrolled: boolean;
    completedLessonIds: string[];
  };
  const progress = course.lessons.length
    ? Math.round((completedLessonIds.length / course.lessons.length) * 100)
    : 0;

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-8">
      {/* Hero */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ border: "1.5px solid var(--border-soft)" }}
      >
        {course.thumbnail && (
          <div className="relative h-48 sm:h-64 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={course.thumbnail}
              alt={course.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <div className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex-1">
              <p className="text-xs font-medium mb-1" style={{ color: "var(--primary)" }}>
                {course.subject?.name}
              </p>
              <h1 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>{course.title}</h1>
              {course.description && (
                <p className="text-sm mt-2 leading-relaxed" style={{ color: "color-mix(in srgb, var(--foreground) 65%, transparent)" }}>{course.description}</p>
              )}
              <div className="flex items-center gap-4 mt-3 text-xs" style={{ color: "color-mix(in srgb, var(--foreground) 55%, transparent)" }}>
                <span className="flex items-center gap-1">
                  <FaIcon icon={faBookOpen} /> {course.lessons.length} bài giảng
                </span>
                <span className="flex items-center gap-1">
                  <FaIcon icon={faUsers} /> {course._count.enrollments} học viên
                </span>
                <span style={{ color: "color-mix(in srgb, var(--foreground) 45%, transparent)" }}>
                  GV: {course.author?.name ?? course.author?.email ?? "Ẩn danh"}
                </span>
              </div>
            </div>

            <div className="shrink-0">
              {isEnrolled ? (
                <div className="flex flex-col items-end gap-2">
                  <span className="text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full flex items-center gap-1">
                    <FaIcon icon={faCheckCircle} /> Đã ghi danh
                  </span>
                  {course.lessons.length > 0 && (
                    <Link
                      href={`/student/courses/${course.id}/learn/${course.lessons[0].id}`}
                    className="px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 text-white"
                    style={{ background: "linear-gradient(135deg, var(--primary), var(--primary-dark))" }}
                    >
                      {completedLessonIds.length > 0 ? "Tiếp tục học" : "Bắt đầu học"}
                      <FaIcon icon={faArrowRight} />
                    </Link>
                  )}
                </div>
              ) : (
                <EnrollButton courseId={course.id} />
              )}
            </div>
          </div>

          {/* Progress bar (only when enrolled) */}
          {isEnrolled && course.lessons.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs mb-1" style={{ color: "color-mix(in srgb, var(--foreground) 55%, transparent)" }}>
                <span>Tiến độ</span>
                <span>{completedLessonIds.length}/{course.lessons.length} bài ({progress}%)</span>
              </div>
              <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "var(--surface-muted)" }}>
                <div
                  className="h-full transition-all duration-500"
                  style={{ width: `${progress}%`, background: "linear-gradient(90deg, var(--primary), var(--primary-dark))" }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lessons list */}
        <div className="lg:col-span-1">
          <div
            className="rounded-xl overflow-hidden"
            style={{
              backgroundColor: "var(--surface-strong)",
              border: "1.5px solid var(--border-soft)",
            }}
          >
            <div
              className="px-4 py-3 border-b font-semibold text-sm"
              style={{ borderColor: "var(--border-soft)", color: "color-mix(in srgb, var(--foreground) 78%, transparent)" }}
            >
              Danh sách bài giảng
            </div>
            {course.lessons.length === 0 ? (
              <p className="text-xs text-center py-6" style={{ color: "color-mix(in srgb, var(--foreground) 45%, transparent)" }}>Chưa có bài giảng</p>
            ) : (
              <ul className="divide-y" style={{ borderColor: "var(--border-soft)" }}>
                {course.lessons.map((l) => {
                  const done = completedLessonIds.includes(l.id);
                  return (
                    <li key={l.id}>
                      {isEnrolled ? (
                        <Link
                          href={`/student/courses/${course.id}/learn/${l.id}`}
                          className="flex items-center gap-3 px-4 py-3 transition-colors"
                        >
                          <FaIcon
                            icon={done ? faCheckCircle : faPlayCircle}
                            className={`text-sm ${done ? "text-green-500" : "text-blue-400"}`}
                          />
                          <span className={`text-sm flex-1 ${done ? "text-gray-400 line-through" : "text-gray-700"}`}>
                            {l.order}. {l.title}
                          </span>
                        </Link>
                      ) : (
                        <div className="flex items-center gap-3 px-4 py-3">
                          <FaIcon icon={faLock} className="text-sm text-gray-300" />
                          <span className="text-sm text-gray-400 flex-1">
                            {l.order}. {l.title}
                          </span>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Reviews + Q&A */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {isEnrolled && (
            <CourseReviewSection
              courseId={course.id}
            />
          )}
          <CourseQASection
            courseId={course.id}
            userName={session.user.name ?? "Ẩn danh"}
          />
        </div>
      </div>
    </div>
  );
}
