import Link from "next/link";
import { getPublishedCourses } from "@/lib/courses/queries";
import { prisma } from "@/lib/prisma";
import { requirePageSession } from "@/lib/auth/page-guard";
import { CourseCard } from "@/components/courses/CourseCard";
import { FaIcon } from "@/components/ui/FaIcon";
import { faBookOpen } from "@fortawesome/free-solid-svg-icons";

export default async function StudentCoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ subjectId?: string }>;
}) {
  const { subjectId } = await searchParams;
  const user = await requirePageSession();

  const [courses, enrollments, subjects] = await Promise.all([
    getPublishedCourses(subjectId ? { subjectId } : undefined),
    prisma.enrollment.findMany({
      where: { studentId: user.id },
      select: { courseId: true },
    }),
    prisma.subject.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  const enrolledIds = new Set(enrollments.map((e) => e.courseId));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Khám phá khóa học</h1>
        <p className="text-gray-500 text-sm mt-1">
          {courses.length} khóa học miễn phí
        </p>
      </div>

      {/* Subject filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <Link
          href="/student/courses"
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            !subjectId
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Tất cả
        </Link>
        {subjects.map((s) => (
          <Link
            key={s.id}
            href={`/student/courses?subjectId=${s.id}`}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              subjectId === s.id
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {s.name}
          </Link>
        ))}
      </div>

      {/* Grid */}
      {courses.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-24 rounded-xl"
          style={{
            backgroundColor: "var(--surface-strong)",
            border: "1.5px dashed var(--border-soft)",
          }}
        >
          <FaIcon
            icon={faBookOpen}
            className="text-5xl mb-4 opacity-20"
          />
          <p className="text-gray-400 text-sm">Chưa có khóa học nào được xuất bản</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {courses.map((c) => (
            <CourseCard
              key={c.id}
              course={c}
              href={`/student/courses/${c.id}`}
              isEnrolled={enrolledIds.has(c.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
