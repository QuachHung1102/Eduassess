import Link from "next/link";
import { getAdminUsers } from "@/lib/admin/queries";
import { AddUserForm } from "./AddUserForm";
import { DeleteUserButton } from "./DeleteUserButton";
import { FaIcon } from "@/components/ui/FaIcon";
import { faUsers } from "@fortawesome/free-solid-svg-icons";

const PAGE_SIZE = 20;

const ROLE_LABEL: Record<string, string> = { TEACHER: "Giáo viên", STUDENT: "Học sinh" };
const ROLE_COLOR: Record<string, string> = {
  TEACHER: "bg-purple-100 text-purple-700",
  STUDENT: "bg-blue-100 text-blue-700",
};

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; search?: string; page?: string }>;
}) {
  const params = await searchParams;
  const role = (params.role === "TEACHER" || params.role === "STUDENT") ? params.role : undefined;
  const currentPage = Math.max(1, parseInt(params.page ?? "1", 10));

  const { users, total } = await getAdminUsers({
    role,
    search: params.search,
    page: currentPage,
    pageSize: PAGE_SIZE,
  });

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const buildUrl = (page: number, overrides?: Record<string, string>) => {
    const q = new URLSearchParams();
    if (params.role) q.set("role", params.role);
    if (params.search) q.set("search", params.search);
    if (page > 1) q.set("page", String(page));
    if (overrides) Object.entries(overrides).forEach(([k, v]) => v ? q.set(k, v) : q.delete(k));
    const qs = q.toString();
    return qs ? `/admin/users?${qs}` : "/admin/users";
  };

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tài khoản</h1>
          <p className="text-gray-500 text-sm mt-1">{total} người dùng</p>
        </div>
        <AddUserForm />
      </div>

      {/* Filters */}
      <form method="GET" className="shrink-0 bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-wrap gap-3 items-end">
          {/* Role tabs */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
            {[
              { value: "", label: "Tất cả" },
              { value: "TEACHER", label: "Giáo viên" },
              { value: "STUDENT", label: "Học sinh" },
            ].map((opt) => (
              <Link
                key={opt.value}
                href={buildUrl(1, { role: opt.value, page: "" })}
                className={`px-4 py-2 transition-colors ${
                  (params.role ?? "") === opt.value
                    ? "bg-blue-600 text-white"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                {opt.label}
              </Link>
            ))}
          </div>

          {/* Search */}
          <div className="flex gap-2 flex-1 min-w-50">
            <input
              name="search"
              defaultValue={params.search ?? ""}
              placeholder="Tìm theo tên hoặc email..."
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            />
            {params.role && <input type="hidden" name="role" value={params.role} />}
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Tìm
            </button>
            {params.search && (
              <Link
                href={buildUrl(1, { search: "" })}
                className="border border-gray-300 text-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors"
              >
                Xóa
              </Link>
            )}
          </div>
        </div>
      </form>

      {/* Table */}
      <div className="flex-1 flex flex-col min-h-0 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex-1 overflow-auto min-h-0">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100 sticky top-0">
              <tr>
                {["Họ tên", "Email", "Vai trò", "Điện thoại", "Lớp / Môn dạy", ""].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-gray-400">
                    <div className="text-3xl mb-2"><FaIcon icon={faUsers} /></div>
                    <p>Không tìm thấy người dùng nào</p>
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      <Link href={`/admin/users/${u.id}`} className="hover:text-blue-600 hover:underline">
                        {u.name}
                      </Link>
                      {u.sex && (
                        <span className="ml-1.5 text-xs text-gray-400">
                          ({u.sex === "MALE" ? "Nam" : "Nữ"})
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLOR[u.role]}`}>
                        {ROLE_LABEL[u.role]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {u.phoneNumber ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs max-w-50 truncate">
                      {u.role === "STUDENT"
                        ? (u.studentClasses[0]?.class.name ?? "Chưa xếp lớp")
                        : u.teacherClasses.map((tc) => tc.subject.name).join(", ") || "Chưa phân công"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/admin/users/${u.id}`}
                          className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          Chi tiết
                        </Link>
                        <DeleteUserButton userId={u.id} userName={u.name} />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="shrink-0 flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
          <p className="text-xs text-gray-500">
            Trang {currentPage}/{totalPages} — {total} người dùng
          </p>
          <div className="flex items-center gap-1">
            {currentPage > 1 ? (
              <Link href={buildUrl(currentPage - 1)} className="px-3 py-1.5 rounded-lg text-sm border border-gray-200 text-gray-600 hover:bg-gray-100">‹</Link>
            ) : (
              <span className="px-3 py-1.5 rounded-lg text-sm border border-gray-100 text-gray-300 cursor-not-allowed">‹</span>
            )}
            {currentPage < totalPages ? (
              <Link href={buildUrl(currentPage + 1)} className="px-3 py-1.5 rounded-lg text-sm border border-gray-200 text-gray-600 hover:bg-gray-100">›</Link>
            ) : (
              <span className="px-3 py-1.5 rounded-lg text-sm border border-gray-100 text-gray-300 cursor-not-allowed">›</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
