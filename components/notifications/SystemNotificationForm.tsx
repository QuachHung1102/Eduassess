"use client";

import { useState, useTransition } from "react";
import { FaIcon } from "@/components/ui/FaIcon";
import { faBell, faXmark, faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";
import { sendNotificationAction, searchUsersForNotificationAction } from "@/lib/notifications/actions";
import type { SendTarget } from "@/lib/notifications/targeting";
import type { Role } from "@/lib/types";

type GroupOpt = { role: Role; label: string; count: number };
type UserHit = { id: string; name: string; email: string; role: string; code: string | null };
type Mode = "groups" | "my-students" | "users";

const ROLE_VI: Record<string, string> = { STUDENT: "Học sinh", TEACHER: "Giáo viên", PARENT: "Phụ huynh", STAFF: "Nhân viên", ADMIN: "Admin", OWNER: "Owner" };

export function SystemNotificationForm({ groups, myStudents }: { groups: GroupOpt[]; myStudents: { enabled: boolean; count: number } }) {
  const modes: { key: Mode; label: string }[] = [
    ...(groups.length ? [{ key: "groups" as const, label: "Theo nhóm" }] : []),
    ...(myStudents.enabled ? [{ key: "my-students" as const, label: "Học sinh phụ trách" }] : []),
    { key: "users" as const, label: "Cá nhân" },
  ];

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [href, setHref] = useState("");
  const [mode, setMode] = useState<Mode>(modes[0].key);
  const [selectedRoles, setSelectedRoles] = useState<Set<Role>>(new Set());
  const [selectedUsers, setSelectedUsers] = useState<UserHit[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserHit[]>([]);
  const [searching, startSearch] = useTransition();
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  function toggleRole(r: Role) {
    setSelectedRoles((prev) => {
      const next = new Set(prev);
      if (next.has(r)) next.delete(r);
      else next.add(r);
      return next;
    });
  }

  function onSearch(q: string) {
    setQuery(q);
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    startSearch(async () => setResults(await searchUsersForNotificationAction(q)));
  }

  function addUser(u: UserHit) {
    setSelectedUsers((prev) => (prev.some((x) => x.id === u.id) ? prev : [...prev, u]));
    setQuery("");
    setResults([]);
  }

  const recipientCount =
    mode === "groups"
      ? [...selectedRoles].reduce((s, r) => s + (groups.find((g) => g.role === r)?.count ?? 0), 0)
      : mode === "my-students"
        ? myStudents.count
        : selectedUsers.length;

  function buildTarget(): SendTarget {
    if (mode === "groups") return { kind: "groups", roles: [...selectedRoles] };
    if (mode === "my-students") return { kind: "my-students" };
    return { kind: "users", userIds: selectedUsers.map((u) => u.id) };
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    startTransition(async () => {
      const res = await sendNotificationAction({ title, message, href: href || undefined, target: buildTarget() });
      if ("error" in res) {
        setMsg({ type: "error", text: res.error });
        return;
      }
      setMsg({ type: "success", text: `Đã gửi thông báo tới ${res.count} người.` });
      setTitle("");
      setMessage("");
      setHref("");
      setSelectedRoles(new Set());
      setSelectedUsers([]);
    });
  }

  const inputCls = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
      {/* ── Compose ─────────────────────────────── */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tiêu đề <span className="text-red-500">*</span></label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Vd: Lịch nghỉ Tết, Phụ huynh đang chờ…" className={inputCls} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nội dung <span className="text-red-500">*</span></label>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} placeholder="Nội dung thông báo…" className={`${inputCls} resize-none`} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Liên kết <span className="text-gray-400 font-normal">(tuỳ chọn)</span></label>
          <input value={href} onChange={(e) => setHref(e.target.value)} placeholder="Vd: /student/exams" className={inputCls} />
        </div>

        {/* Recipient mode */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Người nhận <span className="text-red-500">*</span></label>
          {modes.length > 1 && (
            <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm mb-3 w-fit">
              {modes.map((m) => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => setMode(m.key)}
                  className={`px-3 py-1.5 transition-colors ${mode === m.key ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-50"}`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          )}

          {mode === "groups" && (
            <div className="flex flex-wrap gap-2">
              {groups.map((g) => {
                const checked = selectedRoles.has(g.role);
                return (
                  <button
                    key={g.role}
                    type="button"
                    onClick={() => toggleRole(g.role)}
                    className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${checked ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}
                  >
                    {g.label} <span className="text-xs opacity-70">({g.count})</span>
                  </button>
                );
              })}
            </div>
          )}

          {mode === "my-students" && (
            <p className="text-sm text-gray-600 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
              Gửi tới <strong>{myStudents.count}</strong> học sinh bạn phụ trách.
            </p>
          )}

          {mode === "users" && (
            <div className="space-y-2">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"><FaIcon icon={faMagnifyingGlass} /></span>
                <input value={query} onChange={(e) => onSearch(e.target.value)} placeholder="Tìm theo tên, email, mã…" className={`${inputCls} pl-8`} />
                {(results.length > 0 || searching) && (
                  <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-auto">
                    {searching && <p className="px-3 py-2 text-xs text-gray-400">Đang tìm…</p>}
                    {results.map((u) => (
                      <button key={u.id} type="button" onClick={() => addUser(u)} className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center justify-between">
                        <span className="text-sm text-gray-800">{u.name} <span className="text-xs text-gray-400">· {ROLE_VI[u.role] ?? u.role}</span></span>
                        <span className="font-mono text-[11px] text-gray-400">{u.code ?? u.email}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {selectedUsers.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedUsers.map((u) => (
                    <span key={u.id} className="inline-flex items-center gap-1.5 px-2 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs">
                      {u.name}
                      <button type="button" onClick={() => setSelectedUsers((prev) => prev.filter((x) => x.id !== u.id))} className="hover:text-blue-900"><FaIcon icon={faXmark} /></button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {msg && (
          <p className={`text-sm px-3 py-2 rounded-lg ${msg.type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-600 border border-red-200"}`}>{msg.text}</p>
        )}

        <button type="submit" disabled={isPending || recipientCount === 0} className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
          {isPending ? "Đang gửi…" : `Gửi thông báo${recipientCount ? ` (${recipientCount})` : ""}`}
        </button>
      </div>

      {/* ── Preview ─────────────────────────────── */}
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Xem trước</p>
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <div className="flex gap-3">
            <span className="shrink-0 w-9 h-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center"><FaIcon icon={faBell} /></span>
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 text-sm break-words">{title || "Tiêu đề thông báo"}</p>
              <p className="text-sm text-gray-600 mt-0.5 break-words whitespace-pre-wrap">{message || "Nội dung thông báo sẽ hiện ở đây…"}</p>
              <p className="text-[11px] text-gray-400 mt-2">vừa xong</p>
            </div>
          </div>
        </div>
        <div className="text-sm text-gray-500 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
          Ước tính gửi tới <strong className="text-gray-800">{recipientCount}</strong> người.
        </div>
      </div>
    </form>
  );
}
