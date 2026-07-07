"use client";

import { createContext, useCallback, useContext, useState, useRef, type ReactNode } from "react";
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from "lucide-react";

export type ToastVariant = "success" | "error" | "warning" | "info";

export interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
  createdAt: number;
}

export interface ToastContextValue {
  toasts: ToastItem[];
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const DEFAULT_DURATION = 4000;

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}

const iconMap: Record<ToastVariant, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const variantLabel: Record<ToastVariant, string> = {
  success: "Success",
  error: "Error",
  warning: "Warning",
  info: "Info",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const add = useCallback((message: string, variant: ToastVariant, duration = DEFAULT_DURATION) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const item: ToastItem = { id, message, variant, createdAt: Date.now() };
    setToasts(prev => [...prev, item]);
    const timer = setTimeout(() => dismiss(id), duration);
    timersRef.current.set(id, timer);
    return id;
  }, [dismiss]);

  const success = useCallback((message: string) => add(message, "success"), [add]);
  const error = useCallback((message: string) => add(message, "error", 6000), [add]);
  const warning = useCallback((message: string) => add(message, "warning"), [add]);
  const info = useCallback((message: string) => add(message, "info"), [add]);

  return (
    <ToastContext.Provider value={{ toasts, success, error, warning, info, dismiss }}>
      {children}
      <div className="toast-container" aria-live="polite" aria-relevant="additions removals">
        {toasts.map(toast => (
          <Toast key={toast.id} item={toast} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function Toast({ item, onDismiss }: { item: ToastItem; onDismiss: (id: string) => void }) {
  const [leaving, setLeaving] = useState(false);
  const Icon = iconMap[item.variant];

  const handleDismiss = () => {
    if (leaving) return;
    setLeaving(true);
    setTimeout(() => onDismiss(item.id), 200);
  };

  return (
    <div
      className={`toast toast-${item.variant}${leaving ? " leaving" : ""}`}
      role="status"
      aria-label={variantLabel[item.variant]}
      onClick={handleDismiss}
    >
      <Icon className="toast-icon" />
      <span className="toast-message">{item.message}</span>
      <button
        type="button"
        className="toast-dismiss"
        aria-label="Dismiss"
        onClick={(e) => { e.stopPropagation(); handleDismiss(); }}
      >
        <X />
      </button>
    </div>
  );
}
