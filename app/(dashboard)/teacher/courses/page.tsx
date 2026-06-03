import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getCoursesForAuthor } from "@/lib/courses/queries";
import { CourseCard } from "@/components/courses/CourseCard";
import { FaIcon } from "@/components/ui/FaIcon";
import { faPlus, faBookOpen } from "@fortawesome/free-solid-svg-icons";

export default async function TeacherCoursesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const courses = await getCoursesForAuthor(session.user.id!);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Khóa học của tôi</h1>
          <p className="text-gray-500 text-sm mt-1">{courses.length} khóa học</p>
        </div>
        <Link
          href="/teacher/courses/create"
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <FaIcon icon={faPlus} className="mr-1" /> Tạo khóa học
        </Link>
      </div>

      {/* Grid */}
      {courses.length === 0 ? (
        <div
          className="flex-1 flex flex-col items-center justify-center py-24 rounded-xl"
          style={{
            backgroundColor: "var(--surface-strong)",
            border: "1.5px dashed var(--border-soft)",
          }}
        >
          <FaIcon
            icon={faBookOpen}
            className="text-5xl mb-4 opacity-20"
          />
          <p className="text-gray-500 text-sm mb-4">Bạn chưa có khóa học nào</p>
          <Link
            href="/teacher/courses/create"
            className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Tạo khóa học đầu tiên
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {courses.map((c) => (
            <CourseCard
              key={c.id}
              course={c}
              href={`/teacher/courses/${c.id}/edit`}
              showStatus
            />
          ))}
        </div>
      )}
    </div>
  );
}
