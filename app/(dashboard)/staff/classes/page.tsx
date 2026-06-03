import Link from "next/link";
import { getMyClasses } from "@/lib/classes/queries";
import { FaIcon } from "@/components/ui/FaIcon";
import { faPlus, faSchool } from "@fortawesome/free-solid-svg-icons";
import { auth } from "@/auth";

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Soạn thảo",
  RECRUITING: "Tuyển sinh",
  ONGOING: "Đang học",
  FINISHED: "Hoàn thành",
  CANCELLED: "Đã hủy",
};

const STATUS_COLOR: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-600",
  RECRUITING: "bg-blue-100 text-blue-700",
  ONGOING: "bg-green-100 text-green-700",
  FINISHED: "bg-purple-100 text-purple-700",
  CANCELLED: "bg-red-100 text-red-700",
};

const MODE_LABEL: Record<string, string> = {
  ONLINE: "Online",
  OFFLINE: "Offline",
  HYBRID: "Hybrid",
};

export default async function StaffClassesPage() {
  const session = await auth();
  const classes = await getMyClasses();

  const grouped = new Map<string, typeof classes>();
  for (const cls of classes) {
    const s = cls.subject.name;
    if (!grouped.has(s)) grouped.set(s, []);
    grouped.get(s)!.push(cls);
  }
  const sortedSubjects = [...grouped.keys()].sort();

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lớp học</h1>
          <p className="text-gray-500 text-sm mt-1">
            {classes.length} lớp · {sortedSubjects.length} môn
            {session?.user?.role === "STAFF" && " · lớp bạn phụ trách"}
          </p>
        </div>
        <Link
          href="/staff/classes/new"
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors"
        >
          <FaIcon icon={faPlus} className="text-xs" />
          Tạo lớp mới
        </Link>
      </div>

      {/* Empty state */}
      {classes.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-400">
          <FaIcon icon={faSchool} className="text-4xl" />
          <p className="text-sm">Chưa có lớp học nào</p>
          <Link
            href="/staff/classes/new"
            className="text-sm text-emerald-600 hover:underline"
          >
            Tạo lớp đầu tiên
          </Link>
        </div>
      )}

      {/* Classes grouped by subject */}
      <div className="flex-1 overflow-auto space-y-5 pb-4">
        {sortedSubjects.map((subjectName) => {
          const subjectClasses = grouped.get(subjectName)!;
          return (
            <div
              key={subjectName}
              className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
            >
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-semibold text-gray-800">{subjectName}</h2>
                <span className="text-xs text-gray-500">{subjectClasses.length} lớp</span>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-50">
                    {["Tên lớp", "Hình thức", "Buổi học", "Học sinh", "Trạng thái", ""].map((h) => (
                      <th
                        key={h}
                        className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {subjectClasses.map((cls) => (
                    <tr key={cls.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <Link
                          href={`/staff/classes/${cls.id}`}
                          className="font-medium text-blue-600 hover:underline"
                        >
                          {cls.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {MODE_LABEL[cls.mode] ?? cls.mode}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {cls._count.sessions}
                        {cls.sessionCount > 0 && (
                          <span className="text-gray-400"> / {cls.sessionCount}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {cls._count.enrollments}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            STATUS_COLOR[cls.status] ?? "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {STATUS_LABEL[cls.status] ?? cls.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/staff/classes/${cls.id}`}
                          className="text-xs text-gray-400 hover:text-blue-600 transition-colors"
                        >
                          Chi tiết →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    </div>
  );
}
