import Link from "next/link";
import { getAdminUsers, getCBDTSCandidates, getUserCategoryOptions } from "@/lib/admin/queries";
import { AddUserForm } from "./AddUserForm";
import { UsersTable } from "./UsersTable";

const PAGE_SIZE = 20;

type AdminRoleFilter = "TEACHER" | "STUDENT" | "STAFF" | "PARENT" | "ADMIN";
type AdminStaffPositionFilter = "NVSALE" | "NVLT" | "CBNK" | "CBDH" | "CBDT" | "CBDTS";
type AdminSexFilter = "MALE" | "FEMALE";
type HasPhoneFilter = "YES" | "NO";
const VALID_ROLES: AdminRoleFilter[] = ["TEACHER", "STUDENT", "STAFF", "PARENT", "ADMIN"];
const VALID_POSITIONS: AdminStaffPositionFilter[] = ["NVSALE", "NVLT", "CBNK", "CBDH", "CBDT", "CBDTS"];
const VALID_SEX: AdminSexFilter[] = ["MALE", "FEMALE"];
const VALID_HAS_PHONE: HasPhoneFilter[] = ["YES", "NO"];

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{
    role?: string;
    staffPosition?: string;
    sex?: string;
    hasPhone?: string;
    search?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;
  const role: AdminRoleFilter | undefined = VALID_ROLES.includes(params.role as AdminRoleFilter)
    ? (params.role as AdminRoleFilter)
    : undefined;
  const staffPosition: AdminStaffPositionFilter | undefined = VALID_POSITIONS.includes(params.staffPosition as AdminStaffPositionFilter)
    ? (params.staffPosition as AdminStaffPositionFilter)
    : undefined;
  const sex: AdminSexFilter | undefined = VALID_SEX.includes(params.sex as AdminSexFilter)
    ? (params.sex as AdminSexFilter)
    : undefined;
  const hasPhone: HasPhoneFilter | undefined = VALID_HAS_PHONE.includes(params.hasPhone as HasPhoneFilter)
    ? (params.hasPhone as HasPhoneFilter)
    : undefined;
  const currentPage = Math.max(1, parseInt(params.page ?? "1", 10));

  const [{ users, total }, cbdtsCandidates, categories] = await Promise.all([
    getAdminUsers({
      role,
      staffPosition,
      sex,
      hasPhone,
      search: params.search,
      page: currentPage,
      pageSize: PAGE_SIZE,
    }),
    getCBDTSCandidates(),
    getUserCategoryOptions(),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const buildUrl = (page: number, overrides?: Record<string, string>) => {
    const q = new URLSearchParams();
    if (params.role) q.set("role", params.role);
    if (params.staffPosition) q.set("staffPosition", params.staffPosition);
    if (params.sex) q.set("sex", params.sex);
    if (params.hasPhone) q.set("hasPhone", params.hasPhone);
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
        <AddUserForm cbdtsCandidates={cbdtsCandidates} categories={categories} />
      </div>

      {/* Filters */}
      <form method="GET" className="shrink-0 bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-wrap gap-3 items-end">
          {/* Role tabs */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
            {[
              { value: "", label: "Tất cả" },
              { value: "ADMIN",   label: "Admin" },
              { value: "STAFF",   label: "Nhân viên" },
              { value: "TEACHER", label: "Giáo viên" },
              { value: "STUDENT", label: "Học sinh" },
              { value: "PARENT",  label: "Phụ huynh" },
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
              placeholder="Tìm theo tên, email, mã..."
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            />
            {params.role && <input type="hidden" name="role" value={params.role} />}
            {params.staffPosition && <input type="hidden" name="staffPosition" value={params.staffPosition} />}
            {params.sex && <input type="hidden" name="sex" value={params.sex} />}
            {params.hasPhone && <input type="hidden" name="hasPhone" value={params.hasPhone} />}
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

          <div className="flex items-end gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Chức danh</label>
              <select
                name="staffPosition"
                defaultValue={params.staffPosition ?? ""}
                className="h-10 border border-gray-200 rounded-lg px-3 text-sm bg-white text-gray-900"
              >
                <option value="">Tất cả</option>
                <option value="NVSALE">Tư vấn</option>
                <option value="NVLT">Lễ tân</option>
                <option value="CBNK">Ngoại khoá</option>
                <option value="CBDH">Du học</option>
                <option value="CBDT">Đào tạo</option>
                <option value="CBDTS">Đào tạo (Super)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Giới tính</label>
              <select
                name="sex"
                defaultValue={params.sex ?? ""}
                className="h-10 border border-gray-200 rounded-lg px-3 text-sm bg-white text-gray-900"
              >
                <option value="">Tất cả</option>
                <option value="MALE">Nam</option>
                <option value="FEMALE">Nữ</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">SĐT</label>
              <select
                name="hasPhone"
                defaultValue={params.hasPhone ?? ""}
                className="h-10 border border-gray-200 rounded-lg px-3 text-sm bg-white text-gray-900"
              >
                <option value="">Tất cả</option>
                <option value="YES">Có SĐT</option>
                <option value="NO">Chưa có SĐT</option>
              </select>
            </div>

            <button
              type="submit"
              className="h-10 bg-gray-900 text-white px-4 rounded-lg text-sm font-medium hover:bg-black transition-colors"
            >
              Áp dụng
            </button>

            {(params.staffPosition || params.sex || params.hasPhone) && (
              <Link
                href={buildUrl(1, { staffPosition: "", sex: "", hasPhone: "" })}
                className="h-10 inline-flex items-center border border-gray-300 text-gray-600 px-3 rounded-lg text-sm hover:bg-gray-50 transition-colors"
              >
                Xóa chi tiết
              </Link>
            )}
          </div>
        </div>
      </form>

      {/* Table */}
      <div className="flex-1 flex flex-col min-h-0 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <UsersTable users={users} role={role} />

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
