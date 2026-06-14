"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { FaIcon } from "@/components/ui/FaIcon";
import { faMagnifyingGlass, faCheck } from "@fortawesome/free-solid-svg-icons";

export interface PickItem {
  id: string;
  label: string;
  /** Dòng phụ nhỏ bên dưới (email, sức chứa…). */
  sublabel?: string;
  /** Nhãn phụ bên phải (số lớp đang học, trình độ…). */
  badge?: string;
  /** Tô nhãn "Phù hợp" làm nổi gợi ý. */
  highlighted?: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  items: PickItem[];
  /** Chọn nhiều (HS) hay một (GV / phòng). Mặc định nhiều. */
  multiSelect?: boolean;
  /** Lựa chọn hiện tại để khởi tạo — mở lại vẫn nhớ. */
  initialSelected?: string[];
  confirmLabel?: string;
  emptyText?: string;
  searchPlaceholder?: string;
  /** Áp lựa chọn về form cha (KHÔNG ghi DB — lớp chưa được tạo). */
  onApply: (ids: string[]) => void;
}

/**
 * Modal chọn thực thể (GV / phòng / HS) cho danh sách lớn trong luồng tạo lớp.
 * Khác `PeoplePickerModal` (ghi DB ngay): đây là chọn TẠM — chỉ trả lựa chọn
 * về form cha qua `onApply`, và nhớ lựa chọn cũ qua `initialSelected` khi mở lại.
 */
export function PickEntityModal({
  open,
  onClose,
  title,
  description,
  items,
  multiSelect = true,
  initialSelected = [],
  confirmLabel = "Xác nhận",
  emptyText = "Không có lựa chọn nào.",
  searchPlaceholder = "Tìm theo tên hoặc email...",
  onApply,
}: Props) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Mỗi lần mở: nạp lại lựa chọn hiện tại của form cha + xoá ô tìm kiếm.
  useEffect(() => {
    if (open) {
      setSelected(new Set(initialSelected));
      setSearch("");
    }
    // initialSelected là snapshot lúc mở; không phụ thuộc để tránh reset giữa chừng.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (p) =>
        p.label.toLowerCase().includes(q) ||
        (p.sublabel ?? "").toLowerCase().includes(q),
    );
  }, [items, search]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(multiSelect ? prev : []);
      if (prev.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleConfirm() {
    onApply([...selected]);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
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
              onClick={onClose}
              className="rounded-lg border px-4 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50"
              style={{ borderColor: "var(--border-soft)" }}
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors"
              style={{ background: "var(--primary)" }}
            >
              <FaIcon icon={faCheck} />
              {confirmLabel}
              {multiSelect && selected.size > 0 ? ` (${selected.size})` : ""}
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
                  borderColor: isSelected ? "var(--primary)" : "var(--border-soft)",
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
                    {p.label}
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
                  {p.sublabel && (
                    <span
                      className="block truncate text-xs"
                      style={{ color: "color-mix(in srgb, var(--foreground) 50%, transparent)" }}
                    >
                      {p.sublabel}
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
