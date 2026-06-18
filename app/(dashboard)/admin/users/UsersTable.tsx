import Link from "next/link";
import type { ReactNode } from "react";
import { FaIcon } from "@/components/ui/FaIcon";
import { faUsers } from "@fortawesome/free-solid-svg-icons";
import { DeleteUserButton } from "./DeleteUserButton";
import { STUDENT_LEVEL_LABEL, STUDENT_LEVEL_COLOR } from "@/lib/constants/labels";
import type { getAdminUsers } from "@/lib/admin/queries";

// Kiểu một dòng suy ra trực tiếp từ query → không lệch khi select đổi.
type Row = Awaited<ReturnType<typeof getAdminUsers>>["users"][number];
type Col = { header: string; cell: (u: Row) => ReactNode };

const ROLE_LABEL: Record<string, string> = { ADMIN: "Admin", STAFF: "Nhân viên", TEACHER: "Giáo viên", STUDENT: "Học sinh", PARENT: "Phụ huynh", OWNER: "Owner" };
const ROLE_COLOR: Record<string, string> = { ADMIN: "bg-rose-100 text-rose-700", STAFF: "bg-amber-100 text-amber-800", TEACHER: "bg-purple-100 text-purple-700", STUDENT: "bg-blue-100 text-blue-700", PARENT: "bg-teal-100 text-teal-700", OWNER: "bg-slate-200 text-slate-700" };
const POSITION_LABEL: Record<string, string> = { NVSALE: "Tư vấn", NVLT: "Lễ tân", CBNK: "Ngoại khoá", CBDH: "Du học", CBDT: "Đào tạo", CBDTS: "Đào tạo (Super)" };

const dash = <span className="text-gray-400">—</span>;
const txt = (v: ReactNode) => <span className="text-xs text-gray-700">{v}</span>;
const subjectsOf = (u: Row) => [...new Set(u.classTeachers.map((ct) => ct.class.subject.name))].join(", ");
const dateVi = (d: Date) => new Date(d).toLocaleDateString("vi-VN");

function columnsFor(role: string | undefined): Col[] {
  const nameCol: Col = {
    header: "Họ tên",
    cell: (u) => (
      <Link href={`/admin/users/${u.id}`} className="font-medium text-gray-900 hover:text-blue-600 hover:underline">
        {u.name}
        {u.sex && <span className="ml-1.5 text-xs text-gray-400">({u.sex === "MALE" ? "Nam" : "Nữ"})</span>}
      </Link>
    ),
  };
  const codeCol: Col = { header: "Mã", cell: (u) => <span className="font-mono text-xs text-gray-700 whitespace-nowrap">{u.code ?? "—"}</span> };
  const emailCol: Col = { header: "Email", cell: (u) => <span className="text-xs text-gray-600">{u.email}</span> };
  const phoneCol: Col = { header: "SĐT", cell: (u) => <span className="text-xs text-gray-500 whitespace-nowrap">{u.phoneNumber ?? "—"}</span> };
  const dateCol = (header: string): Col => ({ header, cell: (u) => <span className="text-xs text-gray-500 whitespace-nowrap">{dateVi(u.createdAt)}</span> });

  let mid: Col[];
  switch (role) {
    case "STUDENT":
      mid = [
        { header: "Lớp đang học", cell: (u) => (u.classEnrollments.length ? txt(u.classEnrollments.map((e) => e.class.name).join(", ")) : <span className="text-xs text-gray-400">Chưa xếp lớp</span>) },
        {
          header: "Mức năng lực",
          cell: (u) =>
            u.studentLevels.length ? (
              <div className="flex flex-wrap gap-1">
                {u.studentLevels.map((l, i) => (
                  <span key={i} className={`px-1.5 py-0.5 rounded text-[11px] font-medium ${STUDENT_LEVEL_COLOR[l.level] ?? "bg-gray-100 text-gray-600"}`} title={l.subject.name}>
                    {l.subject.name}: {STUDENT_LEVEL_LABEL[l.level]}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-xs text-gray-400">Chưa đánh giá</span>
            ),
        },
        { header: "CBĐT phụ trách", cell: (u) => <span className="text-xs text-gray-600">{u.studentAdvisees[0]?.advisor.name ?? dash}</span> },
      ];
      break;
    case "TEACHER":
      mid = [
        { header: "Môn dạy", cell: (u) => (subjectsOf(u) ? txt(subjectsOf(u)) : <span className="text-xs text-gray-400">Chưa phân công</span>) },
        { header: "Số lớp", cell: (u) => <span className="text-xs text-gray-600">{u._count.classTeachers}</span> },
        { header: "Số câu hỏi", cell: (u) => <span className="text-xs text-gray-600">{u._count.questionsCreated}</span> },
      ];
      break;
    case "STAFF":
      mid = [
        { header: "Chức danh", cell: (u) => txt(u.staffPosition ? POSITION_LABEL[u.staffPosition] ?? u.staffPosition : "—") },
        { header: "Quản lý", cell: (u) => <span className="text-xs text-gray-600">{u.supervisor?.name ?? dash}</span> },
        dateCol("Ngày vào"),
      ];
      break;
    case "PARENT":
      mid = [{ header: "Con (học sinh)", cell: (u) => (u.parentLinks.length ? txt(u.parentLinks.map((p) => p.student.name).join(", ")) : <span className="text-xs text-gray-400">Chưa liên kết</span>) }];
      break;
    case "ADMIN":
      mid = [dateCol("Ngày tạo")];
      break;
    default:
      mid = [{ header: "Vai trò", cell: (u) => <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLOR[u.role] ?? "bg-gray-100 text-gray-700"}`}>{ROLE_LABEL[u.role] ?? u.role}</span> }];
  }

  const actionsCol: Col = {
    header: "",
    cell: (u) => (
      <div className="flex items-center justify-end gap-2">
        <Link href={`/admin/users/${u.id}`} className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
          Chi tiết
        </Link>
        <DeleteUserButton userId={u.id} userName={u.name} />
      </div>
    ),
  };

  return [nameCol, codeCol, emailCol, ...mid, phoneCol, actionsCol];
}

export function UsersTable({ users, role }: { users: Row[]; role?: string }) {
  const cols = columnsFor(role);
  return (
    <div className="flex-1 overflow-auto min-h-0">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-100 sticky top-0">
          <tr>
            {cols.map((c, i) => (
              <th key={i} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {users.length === 0 ? (
            <tr>
              <td colSpan={cols.length} className="text-center py-16 text-gray-400">
                <div className="text-3xl mb-2">
                  <FaIcon icon={faUsers} />
                </div>
                <p>Không tìm thấy người dùng nào</p>
              </td>
            </tr>
          ) : (
            users.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                {cols.map((c, i) => (
                  <td key={i} className="px-4 py-3">
                    {c.cell(u)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
