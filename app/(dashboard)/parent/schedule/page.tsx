import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { FaIcon } from "@/components/ui/FaIcon";
import {
  faCalendarAlt,
  faSchool,
  faDoorOpen,
  faChalkboardUser,
  faCircleCheck,
  faCircleXmark,
  faClock,
  faCircleExclamation,
} from "@fortawesome/free-solid-svg-icons";

// ─── Labels & helpers ─────────────────────────────────────────────────────────

const MODE_LABEL: Record<string, string> = {
  ONLINE: "Online",
  OFFLINE: "Offline",
  HYBRID: "Hybrid",
};

const SESSION_STATUS_LABEL: Record<string, string> = {
  SCHEDULED: "Sắp diễn ra",
  COMPLETED: "Đã xong",
  CANCELLED: "Đã hủy",
  POSTPONED: "Tạm hoãn",
};

const ATTEND_CONFIG = {
  PRESENT: { label: "Có mặt",    color: "bg-green-100 text-green-700", icon: faCircleCheck },
  LATE:    { label: "Đến muộn",  color: "bg-yellow-100 text-yellow-700", icon: faClock },
  EXCUSED: { label: "Vắng phép", color: "bg-blue-100 text-blue-700",   icon: faCircleExclamation },
  ABSENT:  { label: "Vắng",      color: "bg-red-100 text-red-700",     icon: faCircleXmark },
} as const;

type AttendKey = keyof typeof ATTEND_CONFIG;

function formatDateHeader(d: Date) {
  return d.toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function isToday(d: Date) {
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function isPast(d: Date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d < today;
}

// ─── Data ─────────────────────────────────────────────────────────────────────

async function getScheduleData(parentId: string) {
  const now = new Date();
  const rangeStart = new Date(now);
  rangeStart.setDate(rangeStart.getDate() - 7);
  rangeStart.setHours(0, 0, 0, 0);

  const rangeEnd = new Date(now);
  rangeEnd.setDate(rangeEnd.getDate() + 14);
  rangeEnd.setHours(23, 59, 59, 999);

  return prisma.parentStudent.findMany({
    where: { parentId },
    orderBy: { isPrimary: "desc" },
    select: {
      student: {
        select: {
          id: true,
          name: true,
          classEnrollments: {
            where: { status: "ACTIVE" },
            select: {
              class: {
                select: {
                  id: true,
                  name: true,
                  subject: { select: { name: true } },
                  sessions: {
                    where: {
                      date: { gte: rangeStart, lte: rangeEnd },
                      status: { not: "CANCELLED" },
                    },
                    orderBy: [{ date: "asc" }, { startTime: "asc" }],
                    select: {
                      id: true,
                      sessionNumber: true,
                      date: true,
                      startTime: true,
                      endTime: true,
                      mode: true,
                      status: true,
                      note: true,
                      room: { select: { name: true } },
                      teacher: { select: { name: true } },
                      attendances: {
                        select: { studentId: true, status: true },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
}

type ScheduleData = Awaited<ReturnType<typeof getScheduleData>>;

// ─── Flatten sessions into a unified timeline ─────────────────────────────────

type SessionEntry = {
  sessionId: string;
  sessionNumber: number;
  date: Date;
  startTime: string;
  endTime: string;
  mode: string;
  status: string;
  note: string | null;
  roomName: string | null;
  teacherName: string | null;
  className: string;
  classId: string;
  subjectName: string;
  studentId: string;
  studentName: string;
  attendanceStatus: string | null;
};

function buildTimeline(data: ScheduleData): Map<string, SessionEntry[]> {
  const timeline = new Map<string, SessionEntry[]>();

  for (const { student } of data) {
    for (const enrollment of student.classEnrollments) {
      const { class: cls } = enrollment;
      for (const session of cls.sessions) {
        const dateObj = new Date(session.date);
        const dateKey = dateObj.toISOString().slice(0, 10); // "YYYY-MM-DD"

        const attendance = session.attendances.find(
          (a) => a.studentId === student.id,
        );

        const entry: SessionEntry = {
          sessionId: session.id,
          sessionNumber: session.sessionNumber,
          date: dateObj,
          startTime: session.startTime,
          endTime: session.endTime,
          mode: session.mode,
          status: session.status,
          note: session.note,
          roomName: session.room?.name ?? null,
          teacherName: session.teacher.name,
          className: cls.name,
          classId: cls.id,
          subjectName: cls.subject.name,
          studentId: student.id,
          studentName: student.name,
          attendanceStatus: attendance?.status ?? null,
        };

        const list = timeline.get(dateKey) ?? [];
        list.push(entry);
        timeline.set(dateKey, list);
      }
    }
  }

  // Sort entries within each day by startTime
  for (const [key, entries] of timeline) {
    entries.sort((a, b) => a.startTime.localeCompare(b.startTime));
    timeline.set(key, entries);
  }

  // Return sorted by date
  return new Map([...timeline.entries()].sort(([a], [b]) => a.localeCompare(b)));
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ParentSchedulePage() {
  const session = await auth();
  if (!session?.user?.id) notFound();

  const data = await getScheduleData(session.user.id);

  if (data.length === 0) {
    return (
      <div className="flex flex-col h-full gap-4">
        <div className="shrink-0">
          <Link href="/parent" className="text-sm text-blue-600 hover:underline">
            ← Tổng quan
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">Lịch học của con</h1>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-sm text-amber-800 max-w-md text-center">
            Tài khoản chưa được liên kết với học sinh nào. Vui lòng liên hệ trung tâm.
          </div>
        </div>
      </div>
    );
  }

  const timeline = buildTimeline(data);
  const hasMultipleChildren = data.length > 1;

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <div className="shrink-0">
        <Link href="/parent" className="text-sm text-blue-600 hover:underline">
          ← Tổng quan
        </Link>
        <div className="flex items-center gap-2 mt-2">
          <FaIcon icon={faCalendarAlt} className="text-blue-600 text-xl" />
          <h1 className="text-2xl font-bold text-gray-900">Lịch học của con</h1>
        </div>
        <p className="text-sm text-gray-400 mt-1">7 ngày trước – 14 ngày tới</p>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-auto">
        {timeline.size === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3 text-gray-400">
            <FaIcon icon={faSchool} className="text-4xl" />
            <p className="text-sm">Không có buổi học nào trong khoảng thời gian này</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {[...timeline.entries()].map(([dateKey, entries]) => {
              const dateObj = new Date(dateKey + "T00:00:00");
              const today = isToday(dateObj);
              const past = isPast(dateObj);

              return (
                <div key={dateKey}>
                  {/* Date header */}
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className={`text-sm font-semibold capitalize ${
                        today
                          ? "text-blue-600"
                          : past
                          ? "text-gray-400"
                          : "text-gray-700"
                      }`}
                    >
                      {today ? "Hôm nay — " : ""}
                      {formatDateHeader(dateObj)}
                    </div>
                    {today && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                        Hôm nay
                      </span>
                    )}
                    <div className="flex-1 h-px bg-gray-100" />
                  </div>

                  {/* Sessions */}
                  <div className="flex flex-col gap-2 pl-4 border-l-2 border-gray-100">
                    {entries.map((entry) => (
                      <SessionCard
                        key={`${entry.sessionId}-${entry.studentId}`}
                        entry={entry}
                        showStudent={hasMultipleChildren}
                        isPast={past}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Session card ─────────────────────────────────────────────────────────────

function SessionCard({
  entry,
  showStudent,
  isPast,
}: {
  entry: SessionEntry;
  showStudent: boolean;
  isPast: boolean;
}) {
  const attend =
    entry.attendanceStatus && entry.attendanceStatus in ATTEND_CONFIG
      ? ATTEND_CONFIG[entry.attendanceStatus as AttendKey]
      : null;

  const isPostponed = entry.status === "POSTPONED";
  const isCompleted = entry.status === "COMPLETED";

  return (
    <div
      className={`bg-white rounded-xl border shadow-sm p-4 flex gap-4 transition-opacity ${
        isPast && !isCompleted ? "opacity-70" : ""
      } ${isPostponed ? "border-yellow-200 bg-yellow-50" : "border-gray-100"}`}
    >
      {/* Time column */}
      <div className="shrink-0 text-center w-16">
        <div className="text-sm font-bold text-gray-800">{entry.startTime}</div>
        <div className="text-xs text-gray-400">{entry.endTime}</div>
        <div className="text-xs text-gray-400 mt-1">{MODE_LABEL[entry.mode] ?? entry.mode}</div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div>
            <div className="font-semibold text-gray-900 text-sm">
              {entry.subjectName} — Buổi {entry.sessionNumber}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">{entry.className}</div>
          </div>

          {/* Attendance badge (chỉ hiện sau khi session COMPLETED) */}
          {isCompleted && attend && (
            <span
              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${attend.color}`}
            >
              <FaIcon icon={attend.icon} className="text-xs" />
              {attend.label}
            </span>
          )}
          {isCompleted && !attend && (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 shrink-0">
              Chưa điểm danh
            </span>
          )}
          {isPostponed && (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 shrink-0">
              {SESSION_STATUS_LABEL.POSTPONED}
            </span>
          )}
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-3 mt-2 flex-wrap text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <FaIcon icon={faChalkboardUser} />
            {entry.teacherName}
          </span>
          {entry.roomName && (
            <span className="flex items-center gap-1">
              <FaIcon icon={faDoorOpen} />
              {entry.roomName}
            </span>
          )}
          {showStudent && (
            <span className="text-teal-600 font-medium">{entry.studentName}</span>
          )}
        </div>

        {entry.note && (
          <p className="text-xs text-gray-400 italic mt-1.5">{entry.note}</p>
        )}
      </div>
    </div>
  );
}
