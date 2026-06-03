import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { FaIcon } from "@/components/ui/FaIcon";
import {
  faChildren,
  faSchool,
  faFilePen,
  faChartLine,
  faCalendarAlt,
} from "@fortawesome/free-solid-svg-icons";

// ─── Labels ──────────────────────────────────────────────────────────────────

const RELATION_LABEL: Record<string, string> = {
  FATHER: "Bố",
  MOTHER: "Mẹ",
  GUARDIAN: "Người giám hộ",
  OTHER: "Khác",
};

const LEVEL_LABEL: Record<string, string> = {
  WEAK: "Yếu",
  AVERAGE: "Trung bình",
  GOOD: "Khá / Giỏi",
};

const LEVEL_COLOR: Record<string, string> = {
  WEAK: "bg-red-100 text-red-700",
  AVERAGE: "bg-yellow-100 text-yellow-700",
  GOOD: "bg-green-100 text-green-700",
};

const MODE_LABEL: Record<string, string> = {
  ONLINE: "Online",
  OFFLINE: "Offline",
  HYBRID: "Hybrid",
};

// ─── Data fetching ────────────────────────────────────────────────────────────

async function getChildrenData(parentId: string) {
  return prisma.parentStudent.findMany({
    where: { parentId },
    orderBy: { isPrimary: "desc" },
    include: {
      student: {
        select: {
          id: true,
          name: true,
          email: true,
          dateOfBirth: true,
          sex: true,
          phoneNumber: true,
          classEnrollments: {
            where: { status: "ACTIVE" },
            orderBy: { joinedAt: "desc" },
            include: {
              class: {
                select: {
                  id: true,
                  name: true,
                  mode: true,
                  status: true,
                  subject: { select: { name: true } },
                  advisor: { select: { name: true } },
                },
              },
            },
          },
          studentLevels: {
            orderBy: { evaluatedAt: "desc" },
            include: { subject: { select: { name: true } } },
          },
          examAttempts: {
            where: { submittedAt: { not: null } },
            orderBy: { submittedAt: "desc" },
            take: 5,
            include: {
              exam: { select: { title: true } },
            },
          },
        },
      },
    },
  });
}

type ChildrenData = Awaited<ReturnType<typeof getChildrenData>>;
type StudentData = ChildrenData[number]["student"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Lấy level mới nhất theo từng môn */
function latestLevelsBySubject(levels: StudentData["studentLevels"]) {
  const seen = new Set<string>();
  return levels.filter((l) => {
    if (seen.has(l.subjectId)) return false;
    seen.add(l.subjectId);
    return true;
  });
}

function formatDate(d: Date | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function scoreColor(score: number | null) {
  if (score === null) return "text-gray-400";
  if (score >= 80) return "text-green-600";
  if (score >= 50) return "text-yellow-600";
  return "text-red-600";
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ParentChildrenPage() {
  const session = await auth();
  if (!session?.user?.id) notFound();

  const links = await getChildrenData(session.user.id);

  if (links.length === 0) {
    return (
      <div className="flex flex-col h-full gap-4">
        <div className="shrink-0">
          <Link href="/parent" className="text-sm text-blue-600 hover:underline">
            ← Tổng quan
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">Con tôi</h1>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-sm text-amber-800 max-w-md text-center">
            Tài khoản của bạn chưa được liên kết với học sinh nào. Vui lòng liên hệ trung tâm.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Breadcrumb + header */}
      <div className="shrink-0">
        <Link href="/parent" className="text-sm text-blue-600 hover:underline">
          ← Tổng quan
        </Link>
        <div className="flex items-center gap-2 mt-2">
          <FaIcon icon={faChildren} className="text-teal-600 text-xl" />
          <h1 className="text-2xl font-bold text-gray-900">Con tôi</h1>
          <span className="text-sm text-gray-400">({links.length})</span>
        </div>
      </div>

      {/* Student cards */}
      <div className="flex-1 overflow-auto flex flex-col gap-6">
        {links.map(({ student, relation, isPrimary }) => {
          const latestLevels = latestLevelsBySubject(student.studentLevels);
          const avgScore =
            student.examAttempts.length > 0
              ? student.examAttempts.reduce((s, a) => s + (a.score ?? 0), 0) /
                student.examAttempts.length
              : null;

          return (
            <div
              key={student.id}
              className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
            >
              {/* Student header */}
              <div className="px-5 py-4 border-b border-gray-50 flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg font-bold text-gray-900">{student.name}</h2>
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-700">
                      {RELATION_LABEL[relation] ?? relation}
                      {isPrimary && " · Chính"}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 mt-0.5">{student.email}</p>
                </div>
                <div className="text-right text-xs text-gray-400 shrink-0">
                  <div>{student.sex === "MALE" ? "Nam" : student.sex === "FEMALE" ? "Nữ" : "—"}</div>
                  <div className="flex items-center gap-1 justify-end mt-0.5">
                    <FaIcon icon={faCalendarAlt} className="text-gray-300" />
                    {formatDate(student.dateOfBirth)}
                  </div>
                </div>
              </div>

              {/* Body — 3 columns on wide screens */}
              <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-50">

                {/* ① Lớp đang học */}
                <div className="p-4 flex flex-col gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                    <FaIcon icon={faSchool} />
                    Lớp đang học ({student.classEnrollments.length})
                  </div>
                  {student.classEnrollments.length === 0 ? (
                    <p className="text-xs text-gray-400">Chưa tham gia lớp nào</p>
                  ) : (
                    student.classEnrollments.map((e) => (
                      <div
                        key={e.id}
                        className="rounded-lg bg-blue-50 px-3 py-2 text-xs"
                      >
                        <div className="font-medium text-blue-800">{e.class.name}</div>
                        <div className="text-blue-600 mt-0.5">
                          {e.class.subject.name} · {MODE_LABEL[e.class.mode]}
                        </div>
                        <div className="text-gray-500 mt-0.5">
                          CBDT: {e.class.advisor.name}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* ② Năng lực theo môn */}
                <div className="p-4 flex flex-col gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                    <FaIcon icon={faChartLine} />
                    Năng lực
                  </div>
                  {latestLevels.length === 0 ? (
                    <p className="text-xs text-gray-400">Chưa có đánh giá</p>
                  ) : (
                    latestLevels.map((l) => (
                      <div key={l.id} className="flex items-center justify-between text-xs">
                        <span className="text-gray-700">{l.subject.name}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full font-medium ${
                            LEVEL_COLOR[l.level] ?? "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {LEVEL_LABEL[l.level] ?? l.level}
                        </span>
                      </div>
                    ))
                  )}
                </div>

                {/* ③ Bài kiểm tra gần đây */}
                <div className="p-4 flex flex-col gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                    <FaIcon icon={faFilePen} />
                    Bài kiểm tra gần đây
                    {avgScore !== null && (
                      <span className={`ml-auto font-bold ${scoreColor(avgScore)}`}>
                        TB: {avgScore.toFixed(1)}%
                      </span>
                    )}
                  </div>
                  {student.examAttempts.length === 0 ? (
                    <p className="text-xs text-gray-400">Chưa làm bài nào</p>
                  ) : (
                    student.examAttempts.map((a) => (
                      <div key={a.id} className="flex items-center justify-between text-xs">
                        <span className="text-gray-700 truncate flex-1 mr-2">
                          {a.exam.title}
                        </span>
                        <span className={`font-semibold shrink-0 ${scoreColor(a.score)}`}>
                          {a.score !== null ? `${a.score.toFixed(1)}%` : "—"}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
