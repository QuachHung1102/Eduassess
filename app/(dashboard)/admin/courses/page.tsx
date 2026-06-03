import { getCoursesForAdmin } from "@/lib/courses/queries";
import { AdminCoursesClient } from "./AdminCoursesClient";

export default async function AdminCoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const courses = await getCoursesForAdmin(
    status ? { status: status as never } : undefined,
  );

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>Quản lý khóa học</h1>
        <p className="text-sm mt-1" style={{ color: "color-mix(in srgb, var(--foreground) 60%, transparent)" }}>Duyệt và quản lý tất cả khóa học</p>
      </div>
      <AdminCoursesClient courses={courses} activeStatus={status ?? ""} />
    </div>
  );
}
