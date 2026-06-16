"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { FaIcon } from "@/components/ui/FaIcon";
import { faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";

export type ConfirmOptions = {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** "danger" = đỏ (hành động phá huỷ), "primary" = theo theme. */
  variant?: "danger" | "primary";
};

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

type DialogState = ConfirmOptions & { open: boolean };

/**
 * Provider cho hộp xác nhận dùng chung (thay `window.confirm` thô).
 * Mount một lần ở layout dashboard; mọi client component gọi `useConfirm()`
 * để lấy hàm `confirm(opts): Promise<boolean>` — resolve true khi đồng ý.
 */
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DialogState | null>(null);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((opts) => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setState({ ...opts, open: true });
    });
  }, []);

  const settle = useCallback((value: boolean) => {
    resolverRef.current?.(value);
    resolverRef.current = null;
    setState((s) => (s ? { ...s, open: false } : s));
  }, []);

  const danger = state?.variant === "danger";
  const accent = danger ? "#dc2626" : "var(--primary)";

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal
        open={!!state?.open}
        onClose={() => settle(false)}
        maxWidthClassName="sm:max-w-md"
        title={state?.title}
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => settle(false)}
              className="rounded-lg border px-4 py-1.5 text-sm transition-colors hover:bg-black/5"
              style={{
                borderColor: "var(--border-soft)",
                color: "color-mix(in srgb, var(--foreground) 70%, transparent)",
              }}
            >
              {state?.cancelLabel ?? "Hủy"}
            </button>
            <button
              type="button"
              autoFocus
              onClick={() => settle(true)}
              className="rounded-lg px-4 py-1.5 text-sm font-medium text-white transition-colors hover:opacity-90"
              style={{ backgroundColor: accent }}
            >
              {state?.confirmLabel ?? "Xác nhận"}
            </button>
          </div>
        }
      >
        <div className="flex gap-3">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
            style={{
              backgroundColor: `color-mix(in srgb, ${accent} 14%, transparent)`,
              color: accent,
            }}
          >
            <FaIcon icon={faTriangleExclamation} />
          </div>
          <p
            className="text-sm leading-relaxed"
            style={{ color: "color-mix(in srgb, var(--foreground) 82%, transparent)" }}
          >
            {state?.message ?? "Bạn có chắc muốn tiếp tục?"}
          </p>
        </div>
      </Modal>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm phải được dùng bên trong <ConfirmProvider>");
  return ctx;
}
