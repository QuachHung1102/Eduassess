"use client";

import { useState, useMemo, useTransition } from "react";
import {
  updateRolePermissionsAction,
  updatePositionPermissionsAction,
} from "@/lib/admin/permission-actions";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import type { Role, StaffPosition } from "@/lib/types";

type PermissionDef = { key: string; domain: string; description: string };

type Props = {
  permissions: PermissionDef[];
  rolePerms: Record<string, string[]>;
  positionPerms: Record<string, string[]>;
};

const EDITABLE_ROLES: Role[] = ["ADMIN", "STAFF", "TEACHER", "STUDENT", "PARENT"];
const POSITIONS: StaffPosition[] = ["NVSALE", "NVLT", "CBNK", "CBDH", "CBDT", "CBDTS"];

export function PermissionMatrixClient({ permissions, rolePerms, positionPerms }: Props) {
  const { tr } = useLanguage();
  const t = tr.rolePermissions;

  const [tab, setTab] = useState<"role" | "position">("role");
  const [selectedRole, setSelectedRole] = useState<Role>("ADMIN");
  const [selectedPosition, setSelectedPosition] = useState<StaffPosition>("NVLT");

  // Lưu state đã chỉnh — keyed bởi role/position
  const [draftByRole, setDraftByRole] = useState<Record<string, Set<string>>>(
    () => Object.fromEntries(EDITABLE_ROLES.map((r) => [r, new Set(rolePerms[r] ?? [])])),
  );
  const [draftByPosition, setDraftByPosition] = useState<Record<string, Set<string>>>(
    () => Object.fromEntries(POSITIONS.map((p) => [p, new Set(positionPerms[p] ?? [])])),
  );

  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Nhóm permission theo domain
  const grouped = useMemo(() => {
    const map: Record<string, PermissionDef[]> = {};
    for (const p of permissions) {
      (map[p.domain] ??= []).push(p);
    }
    return map;
  }, [permissions]);

  const currentSet =
    tab === "role" ? draftByRole[selectedRole] : draftByPosition[selectedPosition];
  const originalSet = new Set(
    tab === "role" ? rolePerms[selectedRole] ?? [] : positionPerms[selectedPosition] ?? [],
  );
  const isDirty =
    currentSet.size !== originalSet.size ||
    [...currentSet].some((k) => !originalSet.has(k));

  function toggle(key: string) {
    if (tab === "role") {
      setDraftByRole((prev) => {
        const next = new Set(prev[selectedRole]);
        if (next.has(key)) {
          next.delete(key);
        } else {
          next.add(key);
        }
        return { ...prev, [selectedRole]: next };
      });
    } else {
      setDraftByPosition((prev) => {
        const next = new Set(prev[selectedPosition]);
        if (next.has(key)) {
          next.delete(key);
        } else {
          next.add(key);
        }
        return { ...prev, [selectedPosition]: next };
      });
    }
  }

  function selectAllInDomain(domain: string, value: boolean) {
    const keys = grouped[domain].map((p) => p.key);
    if (tab === "role") {
      setDraftByRole((prev) => {
        const next = new Set(prev[selectedRole]);
        keys.forEach((key) => {
          if (value) {
            next.add(key);
            return;
          }

          next.delete(key);
        });
        return { ...prev, [selectedRole]: next };
      });
    } else {
      setDraftByPosition((prev) => {
        const next = new Set(prev[selectedPosition]);
        keys.forEach((key) => {
          if (value) {
            next.add(key);
            return;
          }

          next.delete(key);
        });
        return { ...prev, [selectedPosition]: next };
      });
    }
  }

  function handleSave() {
    setMsg(null);
    const keys = [...currentSet];
    startTransition(async () => {
      const res =
        tab === "role"
          ? await updateRolePermissionsAction(selectedRole, keys)
          : await updatePositionPermissionsAction(selectedPosition, keys);
      if (res.error) setMsg({ type: "error", text: res.error });
      else setMsg({ type: "success", text: t.saved });
    });
  }

  function handleReset() {
    if (tab === "role") {
      setDraftByRole((prev) => ({ ...prev, [selectedRole]: new Set(rolePerms[selectedRole] ?? []) }));
    } else {
      setDraftByPosition((prev) => ({ ...prev, [selectedPosition]: new Set(positionPerms[selectedPosition] ?? []) }));
    }
    setMsg(null);
  }

  return (
    <div className="flex flex-col gap-4 flex-1 min-h-0">
      {/* Tabs */}
      <div className="shrink-0 flex gap-2 border-b border-gray-200">
        <button
          onClick={() => { setTab("role"); setMsg(null); }}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
            tab === "role"
              ? "border-blue-600 text-blue-700"
              : "border-transparent text-[var(--foreground)]/60 hover:text-[var(--foreground)]"
          }`}
        >
          {t.tabByRole}
        </button>
        <button
          onClick={() => { setTab("position"); setMsg(null); }}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
            tab === "position"
              ? "border-blue-600 text-blue-700"
              : "border-transparent text-[var(--foreground)]/60 hover:text-[var(--foreground)]"
          }`}
        >
          {t.tabByPosition}
        </button>
      </div>

      {/* Target picker */}
      <div className="shrink-0 flex flex-wrap items-center gap-2">
        <span className="text-sm text-[var(--foreground)]/70">{tab === "role" ? t.pickRole : t.pickPosition}:</span>
        {(tab === "role" ? EDITABLE_ROLES : POSITIONS).map((opt) => (
          <button
            key={opt}
            onClick={() => {
              if (tab === "role") setSelectedRole(opt as Role);
              else setSelectedPosition(opt as StaffPosition);
              setMsg(null);
            }}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              (tab === "role" ? selectedRole : selectedPosition) === opt
                ? "bg-blue-600 text-white border-blue-600"
                : "border-gray-200 text-gray-700 hover:bg-gray-50"
            }`}
          >
            {tab === "role" ? t.roleNames[opt as keyof typeof t.roleNames] : t.positionNames[opt as keyof typeof t.positionNames]}
          </button>
        ))}
      </div>

      {/* Permission groups */}
      <div className="flex-1 overflow-auto min-h-0 clay-card">
        <div className="divide-y divide-gray-100">
          {Object.entries(grouped).map(([domain, perms]) => {
            const allChecked = perms.every((p) => currentSet.has(p.key));
            const someChecked = perms.some((p) => currentSet.has(p.key));
            return (
              <section key={domain} className="p-4">
                <header className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-[var(--foreground)]">{domain}</h3>
                  <label className="flex items-center gap-2 text-xs text-[var(--foreground)]/60 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allChecked}
                      ref={(el) => {
                        if (el) el.indeterminate = !allChecked && someChecked;
                      }}
                      onChange={(e) => selectAllInDomain(domain, e.target.checked)}
                    />
                    {t.selectAll}
                  </label>
                </header>
                <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {perms.map((p) => (
                    <li key={p.key}>
                      <label className="flex items-start gap-2 px-3 py-2 rounded-lg border border-gray-100 hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={currentSet.has(p.key)}
                          onChange={() => toggle(p.key)}
                          className="mt-0.5"
                        />
                        <span className="text-sm">
                          <span className="block font-medium text-[var(--foreground)]">{p.description}</span>
                          <code className="text-xs text-[var(--foreground)]/40">{p.key}</code>
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      </div>

      {/* Action bar */}
      <div className="shrink-0 flex items-center justify-between clay-card px-4 py-3">
        <div className="text-sm">
          {msg && (
            <span className={msg.type === "success" ? "text-emerald-700" : "text-red-600"}>
              {msg.text}
            </span>
          )}
          {!msg && isDirty && <span className="text-amber-700">{t.unsaved}</span>}
          {!msg && !isDirty && <span className="text-[var(--foreground)]/40">{t.noChanges}</span>}
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleReset}
            disabled={!isDirty || pending}
            className="px-4 py-2 text-sm text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            {tr.common.cancel}
          </button>
          <button
            onClick={handleSave}
            disabled={!isDirty || pending}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {pending ? tr.common.loading : tr.common.save}
          </button>
        </div>
      </div>
    </div>
  );
}
