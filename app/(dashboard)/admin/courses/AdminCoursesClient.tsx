"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  approveCourseAction,
  rejectCourseAction,
  archiveCourseAction,
} from "@/lib/courses/actions";
import { FaIcon } from "@/components/ui/FaIcon";
import {
  faCheck, faTimes, faArchive, faEye, faFilter,
} from "@fortawesome/free-solid-svg-icons";

type CourseRow = {
  id: string;
  title: string;
  status: string;
  isFree: boolean;
  createdAt: Date;
  subject: { name: string } | null;
  author: { name: string | null; email: string | null };
  _count: { lessons: number; enrollments: number };
};

const STATUS_TABS = [
  { label: "Tất cả", value: "" },
  { label: "Chờ duyệt", value: "PENDING" },
  { label: "Đã duyệt", value: "PUBLISHED" },
  { label: "Nháp", value: "DRAFT" },
  { label: "Đã ẩn", value: "ARCHIVED" },
];

const STATUS_BADGE: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  PENDING: "bg-yellow-100 text-yellow-700",
  PUBLISHED: "bg-green-100 text-green-700",
  ARCHIVED: "bg-red-100 text-red-600",
};
const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Nháp",
  PENDING: "Chờ duyệt",
  PUBLISHED: "Đã duyệt",
  ARCHIVED: "Đã ẩn",
};

export function AdminCoursesClient({
  courses,
  activeStatus,
}: {
  courses: CourseRow[];
  activeStatus: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [rows, setRows] = useState(courses);

  function updateStatus(id: string, newStatus: string) {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r)),
    );
  }

  async function approve(id: string) {
    const r = await approveCourseAction(id);
    if (!('error' in r)) updateStatus(id, "PUBLISHED");
  }
  async function reject(id: string) {
    const r = await rejectCourseAction(id);
    if (!('error' in r)) updateStatus(id, "DRAFT");
  }
  async function archive(id: string) {
    if (!confirm("\u1EA8n kh\u00F3a h\u1ECDc n\u00E0y?")) return;
    const r = await archiveCourseAction(id);
    if (!('error' in r)) updateStatus(id, "ARCHIVED");
  }

  const filtered = activeStatus
    ? rows.filter((r) => r.status === activeStatus)
    : rows;

  return (
    <div className="flex flex-col gap-4">
      {/* Status filter tabs */}
      <div className="flex items-center gap-1 flex-wrap">
        <FaIcon icon={faFilter} className="text-gray-400 mr-1 text-xs" />
        {STATUS_TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() =>
              startTransition(() => {
                const url = t.value
                  ? `/admin/courses?status=${t.value}`
                  : "/admin/courses";
                router.push(url);
              })
            }
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              activeStatus === t.value
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {t.label}
            {t.value === "PENDING" && (
              <span className="ml-1.5 bg-yellow-400 text-yellow-900 text-xs rounded-full px-1.5">
                {rows.filter((r) => r.status === "PENDING").length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ border: "1.5px solid var(--border-soft)" }}
      >
        <div className="overflow-x-auto">
          <table className="themed-table w-full text-sm">
            <thead>
              <tr>
                <th className="text-left px-4 py-3 font-medium w-64">Tên khóa học</th>
                <th className="text-left px-4 py-3 font-medium">Môn học</th>
                <th className="text-left px-4 py-3 font-medium">Giáo viên</th>
                <th className="text-center px-4 py-3 font-medium">Bài</th>
                <th className="text-center px-4 py-3 font-medium">Ghi danh</th>
                <th className="text-center px-4 py-3 font-medium">Trạng thái</th>
                <th className="text-center px-4 py-3 font-medium">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-gray-400 text-sm">
                    Không có khóa học nào
                  </td>
                </tr>
              )}
              {filtered.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900 truncate max-w-xs">{c.title}</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {new Date(c.createdAt).toLocaleDateString("vi-VN")}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{c.subject?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">
                    {c.author.name ?? c.author.email}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-700">{c._count.lessons}</td>
                  <td className="px-4 py-3 text-center text-gray-700">{c._count.enrollments}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_BADGE[c.status] ?? "bg-gray-100 text-gray-600"}`}>
                      {STATUS_LABEL[c.status] ?? c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1.5 flex-wrap">
                      <Link
                        href={`/teacher/courses/${c.id}/edit`}
                        className="w-7 h-7 flex items-center justify-center rounded text-blue-600 hover:bg-blue-50 transition-colors text-xs"
                        title="Xem / chỉnh sửa"
                      >
                        <FaIcon icon={faEye} />
                      </Link>
                      {c.status === "PENDING" && (
                        <>
                          <button
                            type="button"
                            onClick={() => approve(c.id)}
                            title="Duyệt"
                            className="w-7 h-7 flex items-center justify-center rounded text-green-600 hover:bg-green-50 transition-colors text-xs"
                          >
                            <FaIcon icon={faCheck} />
                          </button>
                          <button
                            type="button"
                            onClick={() => reject(c.id)}
                            title="Từ chối"
                            className="w-7 h-7 flex items-center justify-center rounded text-red-500 hover:bg-red-50 transition-colors text-xs"
                          >
                            <FaIcon icon={faTimes} />
                          </button>
                        </>
                      )}
                      {c.status === "PUBLISHED" && (
                        <button
                          type="button"
                          onClick={() => archive(c.id)}
                          title="Ẩn khóa học"
                          className="w-7 h-7 flex items-center justify-center rounded text-gray-500 hover:bg-gray-100 transition-colors text-xs"
                        >
                          <FaIcon icon={faArchive} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
