import type { Role, StaffPosition } from "@prisma/client";

export type SystemCategorySeed = {
  systemKey: string;
  label: string;
  prefix: string;
  includeYear: boolean;
  padWidth: number;
  role: Role;
  staffPosition: StaffPosition | null;
};

// 1 dòng / (role, position). Marketing KHÔNG ở đây — admin tự thêm (systemKey=null).
export const SYSTEM_CATEGORIES: SystemCategorySeed[] = [
  { systemKey: "STUDENT", label: "Học sinh",            prefix: "HS",  includeYear: true,  padWidth: 6, role: "STUDENT", staffPosition: null },
  { systemKey: "TEACHER", label: "Giáo viên",           prefix: "GV",  includeYear: false, padWidth: 3, role: "TEACHER", staffPosition: null },
  { systemKey: "PARENT",  label: "Phụ huynh",           prefix: "PH",  includeYear: false, padWidth: 4, role: "PARENT",  staffPosition: null },
  { systemKey: "ADMIN",   label: "Quản trị",            prefix: "QT",  includeYear: false, padWidth: 2, role: "ADMIN",   staffPosition: null },
  { systemKey: "OWNER",   label: "Nhân viên công nghệ", prefix: "CN",  includeYear: false, padWidth: 3, role: "OWNER",   staffPosition: null },
  { systemKey: "STAFF_NVSALE", label: "Tư vấn tuyển sinh", prefix: "TS",  includeYear: false, padWidth: 3, role: "STAFF", staffPosition: "NVSALE" },
  { systemKey: "STAFF_NVLT",   label: "Lễ tân",            prefix: "LT",  includeYear: false, padWidth: 3, role: "STAFF", staffPosition: "NVLT" },
  { systemKey: "STAFF_CBNK",   label: "Cán bộ ngoại khóa", prefix: "NK",  includeYear: false, padWidth: 3, role: "STAFF", staffPosition: "CBNK" },
  { systemKey: "STAFF_CBDH",   label: "Cán bộ du học",     prefix: "DH",  includeYear: false, padWidth: 3, role: "STAFF", staffPosition: "CBDH" },
  { systemKey: "STAFF_CBDT",   label: "Cán bộ đào tạo",    prefix: "DT",  includeYear: false, padWidth: 3, role: "STAFF", staffPosition: "CBDT" },
  { systemKey: "STAFF_CBDTS",  label: "CBĐT super",        prefix: "DTS", includeYear: false, padWidth: 3, role: "STAFF", staffPosition: "CBDTS" },
];

/** systemKey ứng với (role, position) — resolve category mặc định khi tạo user. */
export function systemKeyFor(role: Role, staffPosition: StaffPosition | null): string {
  if (role === "STAFF" && staffPosition) return `STAFF_${staffPosition}`;
  return role;
}
