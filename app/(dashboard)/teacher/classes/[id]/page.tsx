import Link from "next/link";
import { notFound } from "next/navigation";
import { getTeacherClassDetail } from "@/lib/teacher/queries";
import { FaIcon } from "@/components/ui/FaIcon";
import { faPlus, faCalendarAlt } from "@fortawesome/free-solid-svg-icons";

export default async function TeacherClassDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cls = await getTeacherClassDetail(id);

  if (!cls) notFound();

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <div className="shrink-0">
        <Link href="/teacher/classes" className="text-sm hover:underline" style={{ color: "var(--primary)" }}>
          ← Quáy lại danh sách lớp
        </Link>
        <div className="flex items-start justify-between mt-2">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>Lớp {cls.name}</h1>
            <p className="text-sm mt-1" style={{ color: "color-mix(in srgb, var(--foreground) 60%, transparent)" }}>
              {cls.subject.name}
            </p>
          </div>
          <Link
            href="/teacher/exams/create"
            className="flex items-center rounded-lg px-4 py-2 text-sm font-medium transition-colors text-white"
            style={{ background: "linear-gradient(135deg, var(--primary), var(--primary-dark))" }}
          >
            <FaIcon icon={faPlus} className="mr-1.5" /> Tạo đề cho lớp này
          </Link>
        </div>
      </div>

      {/* Stat strip */}
      <div className="shrink-0 grid grid-cols-3 gap-3">
        <div className="primary-panel p-4">
          <div className="text-xs mb-1" style={{ color: "color-mix(in srgb, var(--foreground) 55%, transparent)" }}>Học sinh</div>
          <div className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>{cls.enrollments.length}</div>
        </div>
        <div className="primary-panel p-4">
          <div className="text-xs mb-1" style={{ color: "color-mix(in srgb, var(--foreground) 55%, transparent)" }}>Đề kiểm tra</div>
          <div className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>{cls.exams.length}</div>
        </div>
        <Link
          href={`/teacher/classes/${id}/sessions`}
          className="primary-panel p-4 hover-card-soft focus-ring-soft press-feedback-soft block"
        >
          <div className="text-xs mb-1" style={{ color: "color-mix(in srgb, var(--foreground) 55%, transparent)" }}>Buổi học</div>
          <div className="flex items-center gap-1.5">
            <span style={{ color: "var(--primary)" }}><FaIcon icon={faCalendarAlt} className="text-sm" /></span>
            <span className="text-sm font-semibold" style={{ color: "var(--primary)" }}>Xem lịch</span>
          </div>
        </Link>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0">
        {/* Students list */}
        <div className="flex-1 flex flex-col min-h-0 primary-panel overflow-hidden">
          <div className="px-4 py-3 shrink-0" style={{ borderBottom: "1px solid var(--border-soft)" }}>
            <h2 className="font-semibold text-sm" style={{ color: "var(--foreground)" }}>
              Danh sách học sinh ({cls.enrollments.length})
            </h2>
          </div>
          <div className="flex-1 overflow-auto">
            {cls.enrollments.length === 0 ? (
              <div className="flex items-center justify-center h-full text-sm py-12" style={{ color: "color-mix(in srgb, var(--foreground) 45%, transparent)" }}>
                Lớp chưa có học sinh nào
              </div>
            ) : (
              <table className="themed-table w-full text-sm">
                <thead className="sticky top-0">
                  <tr>
                    {["#", "Họ tên", "Email"].map((h) => (
                      <th
                        key={h}
                        className="text-left px-4 py-2.5 text-xs font-medium uppercase tracking-wide"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: "var(--border-soft)" }}>
                  {cls.enrollments.map((e, idx) => (
                    <tr key={e.student.id}>
                      <td className="px-4 py-2.5 text-xs w-8" style={{ color: "color-mix(in srgb, var(--foreground) 40%, transparent)" }}>{idx + 1}</td>
                      <td className="px-4 py-2.5 font-medium" style={{ color: "var(--foreground)" }}>{e.student.name}</td>
                      <td className="px-4 py-2.5 text-xs" style={{ color: "color-mix(in srgb, var(--foreground) 55%, transparent)" }}>{e.student.email}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Exams list */}
        <div className="lg:w-80 flex flex-col min-h-0 primary-panel overflow-hidden">
          <div className="px-4 py-3 shrink-0" style={{ borderBottom: "1px solid var(--border-soft)" }}>
            <h2 className="font-semibold text-sm" style={{ color: "var(--foreground)" }}>
              Đề kiểm tra ({cls.exams.length})
            </h2>
          </div>
          <div className="flex-1 overflow-auto">
            {cls.exams.length === 0 ? (
              <div className="flex items-center justify-center h-full text-sm py-12 text-center px-4" style={{ color: "color-mix(in srgb, var(--foreground) 45%, transparent)" }}>
                Chưa có đề nào cho lớp này
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: "var(--border-soft)" }}>
                {cls.exams.map((exam) => (
                  <Link
                    key={exam.id}
                    href={`/teacher/exams/${exam.id}`}
                    className="block px-4 py-3 transition-colors group"
                  >
                    <p className="text-sm font-medium line-clamp-1" style={{ color: "var(--foreground)" }}>
                      {exam.title}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "color-mix(in srgb, var(--foreground) 50%, transparent)" }}>
                      {exam.subject.name} · {exam._count.examQuestions} câu · {exam._count.examAttempts} lượt làm
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
