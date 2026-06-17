"use client";

import { useState, useTransition, useRef } from "react";
import { createUserAction } from "@/lib/admin/actions";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { FaIcon } from "@/components/ui/FaIcon";
import {
  faUserGraduate,
  faChalkboardUser,
  faUserTie,
  faPeopleRoof,
  faUserShield,
} from "@fortawesome/free-solid-svg-icons";

type Role = "STUDENT" | "TEACHER" | "STAFF" | "PARENT" | "ADMIN";
type StaffPosition = "NVSALE" | "NVLT" | "CBNK" | "CBDH" | "CBDT" | "CBDTS";

type CBDTSOption = { id: string; name: string; email: string };
type CategoryOption = { id: string; label: string; prefix: string };

const ROLE_TABS: Array<{ key: Role; icon: typeof faUserGraduate }> = [
  { key: "STUDENT", icon: faUserGraduate },
  { key: "TEACHER", icon: faChalkboardUser },
  { key: "STAFF",   icon: faUserTie },
  { key: "PARENT",  icon: faPeopleRoof },
  { key: "ADMIN",   icon: faUserShield },
];

const POSITIONS: StaffPosition[] = ["NVSALE", "NVLT", "CBNK", "CBDH", "CBDT", "CBDTS"];

export function AddUserForm({ cbdtsCandidates, categories }: { cbdtsCandidates: CBDTSOption[]; categories: CategoryOption[] }) {
  const { tr } = useLanguage();
  const t = tr.rolePermissions; // tái dùng roleNames / positionNames

  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<Role>("STUDENT");
  const [position, setPosition] = useState<StaffPosition>("NVLT");
  const [supervisorId, setSupervisorId] = useState<string>("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createUserAction(fd);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
      >
        + Thêm tài khoản
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 text-lg">Thêm tài khoản mới</h2>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>

            <form ref={formRef} onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
              {/* Role tabs */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Vai trò <span className="text-red-500">*</span></label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {ROLE_TABS.map(({ key, icon }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setRole(key)}
                      className={`py-2 text-sm rounded-lg border transition-colors flex items-center justify-center gap-1.5 ${
                        role === key
                          ? "bg-blue-600 text-white border-blue-600"
                          : "border-gray-200 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      <FaIcon icon={icon} />
                      {t.roleNames[key as keyof typeof t.roleNames] ?? key}
                    </button>
                  ))}
                </div>
                <input type="hidden" name="role" value={role} />
              </div>

              {/* Staff position */}
              {role === "STAFF" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Chức danh <span className="text-red-500">*</span></label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {POSITIONS.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPosition(p)}
                        className={`py-2 text-sm rounded-lg border transition-colors ${
                          position === p
                            ? "bg-emerald-600 text-white border-emerald-600"
                            : "border-gray-200 text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        {t.positionNames[p]}
                      </button>
                    ))}
                  </div>
                  <input type="hidden" name="staffPosition" value={position} />
                </div>
              )}

              {/* Supervisor picker — chỉ CBDT */}
              {role === "STAFF" && position === "CBDT" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CBDTS phụ trách</label>
                  <select
                    name="supervisorId"
                    value={supervisorId}
                    onChange={(e) => setSupervisorId(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">— Không có —</option>
                    {cbdtsCandidates.map((c) => (
                      <option key={c.id} value={c.id}>{c.name} ({c.email})</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Họ và tên <span className="text-red-500">*</span></label>
                <input
                  name="name"
                  type="text"
                  required
                  placeholder="Nguyễn Văn A"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Email + Password */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email <span className="text-red-500">*</span></label>
                  <input
                    name="email"
                    type="email"
                    required
                    placeholder="email@example.com"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu <span className="text-red-500">*</span></label>
                  <input
                    name="password"
                    type="password"
                    required
                    minLength={6}
                    placeholder="Tối thiểu 6 ký tự"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Loại tài khoản + Mã */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Loại tài khoản</label>
                  <select
                    name="categoryId"
                    defaultValue=""
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">— Tự động theo vai trò —</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.label} ({c.prefix})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mã (tùy chọn)</label>
                  <input
                    name="code"
                    type="text"
                    placeholder="Để trống = tự sinh"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Sex + DOB */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Giới tính</label>
                  <select
                    name="sex"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Không chọn --</option>
                    <option value="MALE">Nam</option>
                    <option value="FEMALE">Nữ</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ngày sinh</label>
                  <input
                    name="dateOfBirth"
                    type="date"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
                <input
                  name="phoneNumber"
                  type="tel"
                  placeholder="0900000000"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Địa chỉ</label>
                <input
                  name="address"
                  type="text"
                  placeholder="123 Đường ABC, Quận 1, TP.HCM"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  {tr.common.cancel}
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {isPending ? "Đang tạo..." : "Tạo tài khoản"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
