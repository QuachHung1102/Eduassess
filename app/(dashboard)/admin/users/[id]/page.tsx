import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminUserDetail } from "@/lib/admin/queries";
import { EditUserForm, ResetPasswordForm } from "./UserForms";
import { DeleteUserButton } from "../DeleteUserButton";

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Quản trị viên",
  TEACHER: "Giáo viên",
  STUDENT: "Học sinh",
};
const ROLE_COLOR: Record<string, string> = {
  ADMIN: "bg-red-100 text-red-700",
  TEACHER: "bg-purple-100 text-purple-700",
  STUDENT: "bg-blue-100 text-blue-700",
};

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getAdminUserDetail(id);
  if (!user) notFound();

  const isTeacher = user.role === "TEACHER";
  const isStudent = user.role === "STUDENT";

  // Deduplicate subjects for teacher
  const subjects = isTeacher
    ? [...new Set(user.classTeachers.map((ct) => ct.class.subject.name))]
    : [];

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <div className="shrink-0">
        <Link href="/admin/users" className="text-sm text-blue-600 hover:underline mb-2 inline-block">
          ← Danh sách tài khoản
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{user.name}</h1>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${ROLE_COLOR[user.role]}`}>
                {ROLE_LABEL[user.role]}
              </span>
            </div>
            <p className="text-gray-500 text-sm mt-0.5">
              {user.email} · Tham gia {new Date(user.createdAt).toLocaleDateString("vi-VN")}
            </p>
          </div>
          {user.role !== "ADMIN" && (
            <DeleteUserButton userId={user.id} userName={user.name} />
          )}
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 xl:grid-cols-3 gap-4 min-h-0 overflow-auto pb-4">
        {/* Left: Edit form (2/3) */}
        <div className="xl:col-span-2 flex flex-col gap-4">
          {/* Profile edit */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50">
              <h2 className="font-semibold text-gray-800">Thông tin cá nhân</h2>
            </div>
            <div className="p-5">
              <EditUserForm user={user} />
            </div>
          </div>

          {/* Password reset */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="px-5 py-3.5 border-b border-gray-100 bg-amber-50">
              <h2 className="font-semibold text-amber-800">Đặt lại mật khẩu</h2>
            </div>
            <div className="p-5">
              <ResetPasswordForm userId={user.id} />
            </div>
          </div>
        </div>

        {/* Right: Info summary (1/3) */}
        <div className="flex flex-col gap-4">
          {/* Quick info */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50">
              <h2 className="font-semibold text-gray-800">Thông tin nhanh</h2>
            </div>
            <div className="p-5 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Giới tính</span>
                <span className="font-medium text-gray-800">
                  {user.sex === "MALE" ? "Nam" : user.sex === "FEMALE" ? "Nữ" : "—"}
                </span>
              </div>
              {user.dateOfBirth && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Ngày sinh</span>
                  <span className="font-medium text-gray-800">
                    {new Date(user.dateOfBirth).toLocaleDateString("vi-VN")}
                  </span>
                </div>
              )}
              {user.phoneNumber && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Điện thoại</span>
                  <span className="font-medium text-gray-800">{user.phoneNumber}</span>
                </div>
              )}
              {user.address && (
                <div>
                  <p className="text-gray-500 mb-1">Địa chỉ</p>
                  <p className="text-gray-800">{user.address}</p>
                </div>
              )}
            </div>
          </div>

          {/* Student: class info */}
          {isStudent && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
              <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50">
                <h2 className="font-semibold text-gray-800">Lớp học</h2>
              </div>
              <div className="p-5">
                {user.classEnrollments.length === 0 ? (
                  <p className="text-sm text-gray-400">Chưa xếp lớp</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {user.classEnrollments.map((sc) => (
                      <Link
                        key={sc.class.id}
                        href={`/admin/classes/${sc.class.id}`}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors"
                      >
                        <span className="font-medium text-blue-800 text-sm">{sc.class.name}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Teacher: subjects + classes */}
          {isTeacher && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
              <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50">
                <h2 className="font-semibold text-gray-800">Phân công dạy học</h2>
              </div>
              <div className="p-5 space-y-3">
                {subjects.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1.5">Môn dạy</p>
                    <div className="flex flex-wrap gap-1.5">
                      {subjects.map((s) => (
                        <span key={s} className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded-full">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {user.classTeachers.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1.5">Lớp phân công</p>
                    <div className="flex flex-col gap-1">
                      {user.classTeachers.map((ct) => (
                        <Link
                          key={ct.class.id}
                          href={`/admin/classes/${ct.class.id}`}
                          className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                        >
                          <span className="font-medium text-gray-800">{ct.class.name}</span>
                          <span className="text-xs text-gray-400">{ct.class.subject.name}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
                {user.classTeachers.length === 0 && (
                  <p className="text-sm text-gray-400">Chưa có phân công nào</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
