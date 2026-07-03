"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from "react";

export type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel: string;
  danger?: boolean;
};

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

/**
 * In-app replacement for window.confirm(): accessible dialog, styled like the
 * rest of the product, promise-based so call sites read almost identically:
 *   if (!(await confirm({...}))) return;
 */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<{ options: ConfirmOptions; resolve: (ok: boolean) => void } | null>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  const confirm = useCallback<ConfirmFn>((options) => {
    return new Promise<boolean>((resolve) => {
      setPending({ options, resolve });
    });
  }, []);

  const settle = useCallback((ok: boolean) => {
    setPending((current) => {
      current?.resolve(ok);
      return null;
    });
  }, []);

  useEffect(() => {
    if (!pending) return;
    confirmButtonRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") settle(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [pending, settle]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {pending && (
        <div className="backdrop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && settle(false)}>
          <div className="dialog confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby={pending.options.description ? "confirm-description" : undefined}>
            <div className="dialog-head">
              <div>
                <h2 id="confirm-title">{pending.options.title}</h2>
                {pending.options.description && <p id="confirm-description">{pending.options.description}</p>}
              </div>
            </div>
            <div className="dialog-actions">
              <button type="button" className="button" onClick={() => settle(false)}>{pending.options.cancelLabel}</button>
              <button
                type="button"
                ref={confirmButtonRef}
                className={`button ${pending.options.danger ? "danger" : "primary"}`}
                onClick={() => settle(true)}
              >
                {pending.options.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within ConfirmProvider");
  return ctx;
}
