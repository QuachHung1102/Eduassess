"use client";

import { useMemo, useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { FaIcon } from "@/components/ui/FaIcon";
import {
  faMagnifyingGlass,
  faCheck,
  faUserPlus,
  faSpinner,
} from "@fortawesome/free-solid-svg-icons";

export interface PickablePerson {
  id: string;
  name: string | null;
  email: string | null;
  /** Nhãn phụ hiển thị bên phải (vd "2 lớp", trình độ). */
  badge?: string;
  /** Làm nổi gợi ý phù hợp. */
  highlighted?: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  people: PickablePerson[];
  /** Cho phép chọn nhiều người cùng lúc (mặc định true). */
  multiSelect?: boolean;
  confirmLabel?: string;
  emptyText?: string;
  searchPlaceholder?: string;
  /** Trả về lỗi (string) nếu thất bại, hoặc null nếu thành công. */
  onConfirm: (ids: string[]) => Promise<string | null>;
}

/**
 * Modal chọn người (giáo viên / học sinh) cho danh sách lớn:
 * có ô tìm kiếm theo tên/email và chọn nhiều bằng checkbox.
 */
export function PeoplePickerModal({
  open,
  onClose,
  title,
  description,
  people,
  multiSelect = true,
  confirmLabel = "Thêm",
  emptyText = "Không còn ai để thêm.",
  searchPlaceholder = "Tìm theo tên hoặc email...",
  onConfirm,
}: Props) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return people;
    return people.filter(
      (p) =>
        (p.name ?? "").toLowerCase().includes(q) ||
        (p.email ?? "").toLowerCase().includes(q),
    );
  }, [people, search]);

  function toggle(id: string) {
    setError("");
    setSelected((prev) => {
      const next = new Set(multiSelect ? prev : []);
      if (prev.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function reset() {
    setSearch("");
    setSelected(new Set());
    setError("");
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleConfirm() {
    if (selected.size === 0) return;
    setError("");
    startTransition(async () => {
      const err = await onConfirm([...selected]);
      if (err) {
        setError(err);
        return;
      }
      reset();
      onClose();
    });
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={title}
      description={description}
      maxWidthClassName="sm:max-w-lg"
      footer={
        <div className="flex items-center justify-between gap-3">
          <span
            className="text-xs"
            style={{ color: "color-mix(in srgb, var(--foreground) 55%, transparent)" }}
          >
            Đã chọn {selected.size}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg border px-4 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50"
              style={{ borderColor: "var(--border-soft)" }}
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isPending || selected.size === 0}
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50"
              style={{ background: "var(--primary)" }}
            >
              <FaIcon icon={isPending ? faSpinner : faUserPlus} className={isPending ? "animate-spin" : ""} />
              {confirmLabel}
              {selected.size > 0 ? ` (${selected.size})` : ""}
            </button>
          </div>
        </div>
      }
    >
      {/* Search */}
      <div className="relative mb-3">
        <span
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm"
          style={{ color: "color-mix(in srgb, var(--foreground) 45%, transparent)" }}
        >
          <FaIcon icon={faMagnifyingGlass} />
        </span>
        <input
          type="text"
          autoFocus
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-full rounded-lg border py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2"
          style={{
            borderColor: "var(--border-soft)",
            backgroundColor: "var(--surface)",
            color: "var(--foreground)",
          }}
        />
      </div>

      {error && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}

      {/* List */}
      <div className="flex flex-col gap-1">
        {filtered.length === 0 ? (
          <p
            className="py-8 text-center text-sm"
            style={{ color: "color-mix(in srgb, var(--foreground) 50%, transparent)" }}
          >
            {search.trim() ? "Không tìm thấy kết quả phù hợp." : emptyText}
          </p>
        ) : (
          filtered.map((p) => {
            const isSelected = selected.has(p.id);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => toggle(p.id)}
                className="flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors"
                style={{
                  borderColor: isSelected
                    ? "var(--primary)"
                    : "var(--border-soft)",
                  background: isSelected
                    ? "color-mix(in srgb, var(--primary) 8%, var(--surface))"
                    : "var(--surface)",
                }}
              >
                <span
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-xs text-white"
                  style={{
                    borderColor: isSelected ? "var(--primary)" : "var(--border-soft)",
                    background: isSelected ? "var(--primary)" : "transparent",
                  }}
                >
                  {isSelected && <FaIcon icon={faCheck} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className="block truncate text-sm font-medium"
                    style={{ color: "var(--foreground)" }}
                  >
                    {p.name ?? p.email ?? "—"}
                    {p.highlighted && (
                      <span
                        className="ml-2 rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                        style={{
                          background: "color-mix(in srgb, var(--primary) 14%, var(--surface))",
                          color: "var(--primary)",
                        }}
                      >
                        Phù hợp
                      </span>
                    )}
                  </span>
                  {p.email && (
                    <span
                      className="block truncate text-xs"
                      style={{ color: "color-mix(in srgb, var(--foreground) 50%, transparent)" }}
                    >
                      {p.email}
                    </span>
                  )}
                </span>
                {p.badge && (
                  <span
                    className="shrink-0 rounded-full px-2 py-0.5 text-xs"
                    style={{
                      background: "color-mix(in srgb, var(--foreground) 6%, var(--surface))",
                      color: "color-mix(in srgb, var(--foreground) 65%, transparent)",
                    }}
                  >
                    {p.badge}
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>
    </Modal>
  );
}
