"use client";

import { AlertTriangle, CheckCircle2, Info, Undo2, X, XCircle } from "lucide-react";
import { createContext, useCallback, useContext, useMemo, useState } from "react";

import { cn } from "@/lib/utils";

type ToastVariant = "success" | "error" | "warning" | "info";

interface ToastAction {
  label: string;
  onRun: () => void | Promise<void>;
}

interface Toast {
  id: number;
  title: string;
  description?: string;
  variant: ToastVariant;
  action?: ToastAction;
  /** Bekor qilish uchun qolgan soniyalar. */
  expiresAt?: number;
}

interface ToastOptions {
  title: string;
  description?: string;
  variant?: ToastVariant;
  action?: ToastAction;
  duration?: number;
}

interface ToastContextValue {
  toast: (options: ToastOptions) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  warning: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
  /** Bekor qilish tugmasi bilan xabar — bulk amallardan keyin. */
  undo: (title: string, onUndo: () => void | Promise<void>, description?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
} as const;

/* Har bir ohang: ikonka rangi + orqa yuvindi. Butun toast bo'yalmaydi —
   oq suzuvchi panelda faqat chap belgi rangli. */
const STYLES: Record<ToastVariant, { color: string; wash: string }> = {
  success: { color: "var(--ok)", wash: "var(--ok-wash)" },
  error: { color: "var(--danger)", wash: "var(--danger-wash)" },
  warning: { color: "var(--warn)", wash: "var(--warn-wash)" },
  info: { color: "var(--info)", wash: "var(--info-wash)" },
};

const UNDO_MS = 7000;
let counter = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((rows) => rows.filter((row) => row.id !== id));
  }, []);

  const toast = useCallback(
    ({ title, description, variant = "info", action, duration }: ToastOptions) => {
      const id = ++counter;
      const ttl = duration ?? (action ? UNDO_MS : variant === "error" ? 7000 : 4200);
      setToasts((rows) => [
        ...rows.slice(-4),
        { id, title, description, variant, action, expiresAt: Date.now() + ttl },
      ]);
      setTimeout(() => dismiss(id), ttl);
    },
    [dismiss],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      toast,
      success: (title, description) => toast({ title, description, variant: "success" }),
      error: (title, description) => toast({ title, description, variant: "error" }),
      warning: (title, description) => toast({ title, description, variant: "warning" }),
      info: (title, description) => toast({ title, description, variant: "info" }),
      undo: (title, onUndo, description) =>
        toast({
          title,
          description,
          variant: "success",
          action: { label: "Bekor qilish", onRun: onUndo },
        }),
    }),
    [toast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 bottom-[calc(var(--tabbar-h)+1rem)] z-[100] flex w-full max-w-sm flex-col gap-2.5 sm:bottom-5">
        {toasts.map((row) => {
          const Icon = ICONS[row.variant];
          const style = STYLES[row.variant];
          return (
            <div
              key={row.id}
              role="status"
              className={cn(
                "enter-pop pointer-events-auto overflow-hidden",
                "rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--surface)]",
                "shadow-[var(--shadow-lg)]",
              )}
            >
              <div className="flex items-start gap-3 px-4 py-3.5">
                <span
                  className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)]"
                  style={{ backgroundColor: style.wash, color: style.color }}
                >
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[14.5px] font-semibold text-[var(--text)]">{row.title}</p>
                  {row.description ? (
                    <p className="ts-sm mt-0.5 text-[var(--text-3)]">{row.description}</p>
                  ) : null}
                  {row.action ? (
                    <button
                      type="button"
                      onClick={async () => {
                        dismiss(row.id);
                        await row.action?.onRun();
                      }}
                      className={cn(
                        "ring-focus mt-2.5 inline-flex items-center gap-1.5 rounded-[var(--radius-sm)]",
                        "border border-[var(--line)] bg-[var(--surface-sunk)] px-2.5 py-1",
                        "text-[12.5px] font-semibold text-[var(--text)]",
                        "transition-colors duration-[var(--dur-1)] hover:bg-[var(--surface-hover)] hover:border-[var(--line-strong)]",
                      )}
                    >
                      <Undo2 className="size-3" />
                      {row.action.label}
                    </button>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => dismiss(row.id)}
                  className={cn(
                    "ring-focus shrink-0 rounded-[var(--radius-sm)] p-1 text-[var(--text-4)]",
                    "transition-colors duration-[var(--dur-1)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]",
                  )}
                  aria-label="Yopish"
                >
                  <X className="size-3.5" />
                </button>
              </div>
              {row.action ? (
                <div className="h-0.5 w-full bg-[var(--surface-sunk)]">
                  <div
                    className="h-full"
                    style={{
                      backgroundColor: style.color,
                      animation: `ca-countdown ${UNDO_MS}ms linear forwards`,
                    }}
                  />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast ToastProvider ichida ishlatilishi kerak");
  return context;
}
