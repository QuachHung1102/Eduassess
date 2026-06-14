"use client";

import { useState, useTransition } from "react";
import { sendSystemNotificationAction } from "@/lib/admin/notification-actions";
import type { Role } from "@/lib/types";

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: "STUDENT", label: "Học sinh" },
  { value: "TEACHER", label: "Giáo viên" },
  { value: "PARENT", label: "Phụ huynh" },
  { value: "STAFF", label: "Nhân viên" },
];

export function SystemNotificationForm() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [href, setHref] = useState("");
  const [roles, setRoles] = useState<Set<Role>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  function toggleRole(r: Role) {
    setRoles((prev) => {
      const next = new Set(prev);
      if (next.has(r)) next.delete(r);
      else next.add(r);
      return next;
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    startTransition(async () => {
      const res = await sendSystemNotificationAction({
        title,
        message,
        href: href || undefined,
        roles: [...roles],
      });
      if ("error" in res) {
        setMsg({ type: "error", text: res.error });
        return;
      }
      setMsg({ type: "success", text: `Đã gửi thông báo tới ${res.count} người.` });
      setTitle("");
      setMessage("");
      setHref("");
      setRoles(new Set());
    });
  }

  const allSelected = roles.size === ROLE_OPTIONS.length;

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-xl">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Tiêu đề <span className="text-red-500">*</span>
        </label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Vd: Lịch nghỉ Tết, Bảo trì hệ thống…"
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Nội dung <span className="text-red-500">*</span>
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          placeholder="Nội dung thông báo gửi tới người nhận…"
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Liên kết <span className="text-gray-400 font-normal">(tuỳ chọn)</span>
        </label>
        <input
          value={href}
          onChange={(e) => setHref(e.target.value)}
          placeholder="Vd: /student/exams"
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="mt-1 text-xs text-gray-400">Đường dẫn nội bộ mở khi người nhận bấm vào thông báo.</p>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-sm font-medium text-gray-700">
            Nhóm người nhận <span className="text-red-500">*</span>
          </label>
          <button
            type="button"
            onClick={() => setRoles(allSelected ? new Set() : new Set(ROLE_OPTIONS.map((r) => r.value)))}
            className="text-xs text-blue-600 hover:underline"
          >
            {allSelected ? "Bỏ chọn tất cả" : "Chọn tất cả"}
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {ROLE_OPTIONS.map((r) => {
            const checked = roles.has(r.value);
            return (
              <button
                key={r.value}
                type="button"
                onClick={() => toggleRole(r.value)}
                className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                  checked
                    ? "border-blue-600 bg-blue-50 text-blue-700"
                    : "border-gray-200 text-gray-600 hover:border-gray-300"
                }`}
              >
                {r.label}
              </button>
            );
          })}
        </div>
      </div>

      {msg && (
        <p
          className={`text-sm px-3 py-2 rounded-lg ${
            msg.type === "success"
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-red-50 text-red-600 border border-red-200"
          }`}
        >
          {msg.text}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {isPending ? "Đang gửi…" : "Gửi thông báo"}
      </button>
    </form>
  );
}
