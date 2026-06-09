"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { FaIcon } from "@/components/ui/FaIcon";
import { faXmark } from "@fortawesome/free-solid-svg-icons";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  /** Tailwind max-width class cho panel, vd "sm:max-w-xl". */
  maxWidthClassName?: string;
  children: React.ReactNode;
  /** Nội dung cố định dưới đáy (thanh hành động), không cuộn theo body. */
  footer?: React.ReactNode;
}

/**
 * Modal dùng chung: portal ra body, đóng bằng Escape / click nền,
 * khoá scroll nền, dùng animation booking-modal sẵn có.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  maxWidthClassName = "sm:max-w-lg",
  children,
  footer,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <button
        type="button"
        aria-label="Đóng"
        onClick={onClose}
        className="booking-modal-backdrop absolute inset-0 bg-black/40 backdrop-blur-[2px]"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        className={`booking-modal-panel relative flex max-h-[92vh] w-full ${maxWidthClassName} flex-col overflow-hidden rounded-t-2xl border shadow-2xl sm:rounded-2xl`}
        style={{
          backgroundColor: "var(--surface-strong)",
          borderColor: "var(--border-soft)",
        }}
      >
        {(title || description) && (
          <div
            className="flex items-start justify-between gap-3 border-b px-5 py-4"
            style={{ borderColor: "var(--border-soft)" }}
          >
            <div className="min-w-0">
              {title && (
                <h2 className="text-lg font-semibold" style={{ color: "var(--foreground)" }}>
                  {title}
                </h2>
              )}
              {description && (
                <p className="mt-1 text-xs" style={{ color: "color-mix(in srgb, var(--foreground) 60%, transparent)" }}>
                  {description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng modal"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-gray-500 transition-colors hover:bg-gray-50"
              style={{ borderColor: "var(--border-soft)" }}
            >
              <FaIcon icon={faXmark} />
            </button>
          </div>
        )}

        <div className="themed-scrollbar flex-1 overflow-y-auto px-5 py-4">{children}</div>

        {footer && (
          <div
            className="border-t px-5 py-3"
            style={{ borderColor: "var(--border-soft)" }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
