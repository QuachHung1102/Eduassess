import Link from "next/link";
import { getMyClasses } from "@/lib/classes/queries";
import { PageHeader } from "@/components/layout/PageHeader";
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
    <div className="flex flex-col h-full gap-4 sm:gap-6">
      <PageHeader
        icon={faSchool}
        title="Lớp học"
        subtitle={`${classes.length} lớp · ${sortedSubjects.length} môn${session?.user?.role === "STAFF" ? " · lớp bạn phụ trách" : ""}`}
        actions={
          <Link href="/staff/classes/new" className="clay-btn bg-primary flex items-center gap-2 px-4 py-2 text-sm font-medium text-white">
            <FaIcon icon={faPlus} className="text-xs" />
            Tạo lớp mới
          </Link>
        }
      />

      {classes.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-foreground/60">
          <FaIcon icon={faSchool} className="text-4xl" />
          <p className="text-sm">Chưa có lớp học nào</p>
          <Link href="/staff/classes/new" className="text-sm text-primary hover:underline">
            Tạo lớp đầu tiên
          </Link>
        </div>
      ) : (
        <div className="flex-1 overflow-auto space-y-5 pb-4">
          {sortedSubjects.map((subjectName) => {
            const subjectClasses = grouped.get(subjectName)!;
            return (
              <div key={subjectName} className="clay-card overflow-hidden p-0">
                <div className="px-4 py-3 flex items-center justify-between bg-surface-tint border-b border-soft">
                  <h2 className="font-semibold text-foreground">{subjectName}</h2>
                  <span className="text-xs text-foreground/60">{subjectClasses.length} lớp</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[680px] text-sm">
                    <thead>
                      <tr className="border-b border-soft">
                        {["Tên lớp", "Hình thức", "Buổi học", "Học sinh", "Trạng thái", ""].map((h) => (
                          <th key={h} className="text-left px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-foreground/60">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="text-foreground">
                      {subjectClasses.map((cls) => (
                        <tr key={cls.id} className="border-t border-soft transition-colors hover:bg-foreground/5">
                          <td className="px-4 py-3">
                            <Link href={`/staff/classes/${cls.id}`} className="font-medium text-primary hover:underline">
                              {cls.name}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-xs text-foreground/60">
                            {MODE_LABEL[cls.mode] ?? cls.mode}
                          </td>
                          <td className="px-4 py-3 text-xs text-foreground/60">
                            {cls._count.sessions}
                            {cls.sessionCount > 0 && <span> / {cls.sessionCount}</span>}
                          </td>
                          <td className="px-4 py-3 text-xs text-foreground/60">
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
                            <Link href={`/staff/classes/${cls.id}`} className="text-xs text-foreground/60 hover:underline">
                              Chi tiết →
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
