import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { FaIcon } from "@/components/ui/FaIcon";
import {
  faToolbox,
  faUsers,
  faSchool,
  faDatabase,
  faBookOpen,
  faDoorOpen,
  faClipboardList,
  faBell,
} from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";

// ─── Data ─────────────────────────────────────────────────────────────────────

async function getSystemStats() {
  const [
    usersByRole,
    classCount,
    sessionCount,
    sessionCompleted,
    enrollmentCount,
    questionCount,
    questionPending,
    examCount,
    attemptCount,
    courseCount,
    lessonCount,
    flashcardSetCount,
    roomCount,
    bookingPending,
    bookingApproved,
    notifCount,
    auditLogCount,
    recentAudit,
  ] = await Promise.all([
    prisma.user.groupBy({ by: ["role"], _count: { _all: true } }),
    prisma.class.count(),
    prisma.classSession.count(),
    prisma.classSession.count({ where: { status: "COMPLETED" } }),
    prisma.classEnrollment.count({ where: { status: "ACTIVE" } }),
    prisma.question.count(),
    prisma.question.count({ where: { status: "PENDING" } }),
    prisma.exam.count(),
    prisma.examAttempt.count({ where: { submittedAt: { not: null } } }),
    prisma.course.count(),
    prisma.lesson.count(),
    prisma.flashcardSet.count(),
    prisma.room.count({ where: { isActive: true } }),
    prisma.roomBooking.count({ where: { status: "PENDING" } }),
    prisma.roomBooking.count({ where: { status: "APPROVED" } }),
    prisma.notification.count(),
    prisma.auditLog.count(),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        action: true,
        entityType: true,
        createdAt: true,
        actor: { select: { name: true, role: true } },
      },
    }),
  ]);

  const roleMap = Object.fromEntries(
    usersByRole.map((r) => [r.role, r._count._all]),
  );

  return {
    roleMap,
    classCount,
    sessionCount,
    sessionCompleted,
    enrollmentCount,
    questionCount,
    questionPending,
    examCount,
    attemptCount,
    courseCount,
    lessonCount,
    flashcardSetCount,
    roomCount,
    bookingPending,
    bookingApproved,
    notifCount,
    auditLogCount,
    recentAudit,
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function OwnerSystemPage() {
  const s = await getSystemStats();

  const totalUsers = Object.values(s.roleMap).reduce((a, b) => a + b, 0);

  return (
    <div className="flex flex-col h-full gap-6">
      {/* Header */}
      <div className="shrink-0">
        <Link href="/owner" className="text-sm text-blue-600 hover:underline">
          ← Tổng quan
        </Link>
        <div className="flex items-center gap-2 mt-2">
          <FaIcon icon={faToolbox} className="text-indigo-600 text-xl" />
          <h1 className="text-2xl font-bold text-gray-900">Hệ thống</h1>
        </div>
        <p className="text-sm text-gray-400 mt-1">Tổng quan toàn bộ dữ liệu hệ thống</p>
      </div>

      <div className="flex-1 overflow-auto flex flex-col gap-6">

        {/* ① Người dùng */}
        <Section title="Người dùng" icon={faUsers} count={totalUsers}>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {(
              [
                { role: "OWNER",   label: "Owner",    color: "text-rose-600"   },
                { role: "ADMIN",   label: "Admin",    color: "text-purple-600" },
                { role: "STAFF",   label: "Nhân viên",color: "text-orange-600" },
                { role: "TEACHER", label: "Giáo viên",color: "text-blue-600"   },
                { role: "STUDENT", label: "Học sinh", color: "text-emerald-600"},
                { role: "PARENT",  label: "Phụ huynh",color: "text-teal-600"   },
              ] as const
            ).map(({ role, label, color }) => (
              <StatTile key={role} label={label} value={s.roleMap[role] ?? 0} color={color} />
            ))}
          </div>
        </Section>

        {/* ② Lớp học */}
        <Section title="Lớp học & Buổi học" icon={faSchool} count={s.classCount}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatTile label="Lớp học"          value={s.classCount}       color="text-indigo-600" />
            <StatTile label="Buổi học"         value={s.sessionCount}     color="text-blue-600" />
            <StatTile label="Buổi đã hoàn thành" value={s.sessionCompleted} color="text-green-600" />
            <StatTile label="Đăng ký ACTIVE"   value={s.enrollmentCount}  color="text-teal-600" />
          </div>
        </Section>

        {/* ③ Câu hỏi & Đề kiểm tra */}
        <Section title="Ngân hàng câu hỏi & Kiểm tra" icon={faDatabase} count={s.questionCount}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatTile label="Câu hỏi"         value={s.questionCount}  color="text-amber-600" />
            <StatTile label="Chờ duyệt"       value={s.questionPending} color="text-orange-600"
              highlight={s.questionPending > 0}
            />
            <StatTile label="Đề kiểm tra"     value={s.examCount}      color="text-red-600" />
            <StatTile label="Lượt làm bài"    value={s.attemptCount}   color="text-pink-600" />
          </div>
        </Section>

        {/* ④ Khoá học & Flashcard */}
        <Section title="Khoá học & Flashcard" icon={faBookOpen} count={s.courseCount + s.flashcardSetCount}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatTile label="Khoá học"       value={s.courseCount}       color="text-violet-600" />
            <StatTile label="Bài giảng"      value={s.lessonCount}       color="text-purple-600" />
            <StatTile label="Bộ flashcard"   value={s.flashcardSetCount} color="text-cyan-600" />
          </div>
        </Section>

        {/* ⑤ Phòng & Đặt phòng */}
        <Section title="Phòng học & Đặt phòng" icon={faDoorOpen} count={s.roomCount}>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <StatTile label="Phòng hoạt động"    value={s.roomCount}         color="text-slate-600" />
            <StatTile label="Đặt phòng chờ duyệt" value={s.bookingPending}   color="text-orange-600"
              highlight={s.bookingPending > 0}
            />
            <StatTile label="Đặt phòng đã duyệt" value={s.bookingApproved}   color="text-green-600" />
          </div>
        </Section>

        {/* ⑥ Thông báo & Audit */}
        <Section title="Thông báo & Nhật ký" icon={faBell} count={s.notifCount + s.auditLogCount}>
          <div className="grid grid-cols-2 sm:grid-cols-2 gap-3">
            <StatTile label="Thông báo"      value={s.notifCount}    color="text-sky-600" />
            <StatTile label="Bản ghi audit"  value={s.auditLogCount} color="text-amber-600" />
          </div>
        </Section>

        {/* ⑦ Audit log gần nhất */}
        <Section title="Hoạt động gần nhất" icon={faClipboardList}>
          <div className="bg-gray-50 rounded-xl border border-gray-100 overflow-hidden">
            {s.recentAudit.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-6">Chưa có nhật ký</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    {["Thời gian", "Người thực hiện", "Action", "Entity"].map((h) => (
                      <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {s.recentAudit.map((log) => (
                    <tr key={log.id} className="hover:bg-white transition-colors">
                      <td className="px-4 py-2.5 text-xs text-gray-400 whitespace-nowrap">
                        {log.createdAt.toLocaleString("vi-VN", {
                          day: "2-digit", month: "2-digit",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-gray-700">
                        {log.actor?.name ?? <span className="text-gray-400 italic">Hệ thống</span>}
                      </td>
                      <td className="px-4 py-2.5 text-xs font-mono text-gray-600">{log.action}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-500">{log.entityType}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div className="mt-2 text-right">
            <Link href="/owner/audit" className="text-xs text-amber-600 hover:underline">
              Xem tất cả nhật ký →
            </Link>
          </div>
        </Section>

      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Section({
  title,
  icon,
  count,
  children,
}: {
  title: string;
  icon: IconDefinition;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <FaIcon icon={icon} className="text-gray-400" />
        <h2 className="font-semibold text-gray-800 text-sm">{title}</h2>
        {count !== undefined && (
          <span className="ml-1 text-xs text-gray-400">({count.toLocaleString("vi-VN")})</span>
        )}
      </div>
      {children}
    </div>
  );
}

function StatTile({
  label,
  value,
  color,
  highlight,
}: {
  label: string;
  value: number;
  color: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`bg-white rounded-xl border shadow-sm px-4 py-3 text-center ${
        highlight ? "border-orange-200 bg-orange-50" : "border-gray-100"
      }`}
    >
      <div className={`text-2xl font-bold ${highlight ? "text-orange-600" : color}`}>
        {value.toLocaleString("vi-VN")}
      </div>
      <div className="text-xs text-gray-400 mt-0.5">{label}</div>
    </div>
  );
}
