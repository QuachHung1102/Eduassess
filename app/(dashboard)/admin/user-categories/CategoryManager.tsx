"use client";

import { useState, useTransition } from "react";
import {
  createCategoryAction,
  updateCategoryAction,
  deleteCategoryAction,
} from "@/lib/admin/user-category-actions";

type Category = {
  id: string;
  label: string;
  prefix: string;
  systemKey: string | null;
  includeYear: boolean;
  padWidth: number;
  isActive: boolean;
  _count: { users: number };
};

const inputCls = "border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500";

export function CategoryManager({ categories }: { categories: Category[] }) {
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    const form = e.currentTarget;
    startTransition(async () => {
      const r = await createCategoryAction(fd);
      if (r?.error) setError(r.error);
      else form.reset();
    });
  }

  function handleUpdate(id: string, e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const r = await updateCategoryAction(id, fd);
      if (r?.error) setError(r.error);
      else setEditing(null);
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Xoá loại này?")) return;
    setError("");
    startTransition(async () => {
      const r = await deleteCategoryAction(id);
      if (r?.error) setError(r.error);
    });
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 gap-4">
      {error && <p className="shrink-0 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

      <form onSubmit={handleCreate} className="shrink-0 bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Nhãn</label>
          <input name="label" required placeholder="Marketing" className={inputCls} />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Prefix</label>
          <input name="prefix" required placeholder="MKT" className={`w-24 uppercase ${inputCls}`} />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Số chữ số</label>
          <input name="padWidth" type="number" min={0} defaultValue={3} className={`w-24 ${inputCls}`} />
        </div>
        <label className="flex items-center gap-1.5 text-sm text-gray-700 pb-2">
          <input name="includeYear" type="checkbox" /> Có năm
        </label>
        <button type="submit" disabled={isPending} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
          + Thêm loại
        </button>
      </form>

      <div className="flex-1 min-h-0 overflow-auto bg-white rounded-xl border border-gray-100 shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100 sticky top-0">
            <tr>
              {["Nhãn", "Prefix", "Định dạng mẫu", "User", "Trạng thái", ""].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {categories.map((c) =>
              editing === c.id ? (
                <tr key={c.id} className="bg-blue-50/40">
                  <td colSpan={6} className="px-4 py-3">
                    <form onSubmit={(e) => handleUpdate(c.id, e)} className="flex flex-wrap items-end gap-3">
                      <input name="label" defaultValue={c.label} required className={inputCls} />
                      <input name="prefix" defaultValue={c.prefix} required className={`w-24 uppercase ${inputCls}`} />
                      <input name="padWidth" type="number" min={0} defaultValue={c.padWidth} className={`w-24 ${inputCls}`} />
                      <label className="flex items-center gap-1.5 text-sm text-gray-700 pb-2"><input name="includeYear" type="checkbox" defaultChecked={c.includeYear} /> Có năm</label>
                      <label className="flex items-center gap-1.5 text-sm text-gray-700 pb-2"><input name="isActive" type="checkbox" defaultChecked={c.isActive} /> Bật</label>
                      <button type="submit" disabled={isPending} className="bg-blue-600 text-white px-3 py-2 rounded-lg text-xs font-medium">Lưu</button>
                      <button type="button" onClick={() => setEditing(null)} className="border border-gray-200 text-gray-600 px-3 py-2 rounded-lg text-xs">Huỷ</button>
                    </form>
                  </td>
                </tr>
              ) : (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {c.label}
                    {c.systemKey && <span className="ml-1.5 text-[10px] text-gray-400 uppercase tracking-wide">hệ thống</span>}
                  </td>
                  <td className="px-4 py-3 font-mono text-gray-700">{c.prefix}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs font-mono">
                    {c.prefix}-{c.includeYear ? "2026-" : ""}{"0".repeat(Math.max(c.padWidth, 1) - 1)}1
                  </td>
                  <td className="px-4 py-3 text-gray-500">{c._count.users}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${c.isActive ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                      {c.isActive ? "Bật" : "Tắt"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => setEditing(c.id)} className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Sửa</button>
                      {!c.systemKey && (
                        <button onClick={() => handleDelete(c.id)} disabled={isPending} className="px-3 py-1.5 text-xs font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50">Xoá</button>
                      )}
                    </div>
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
