"use client";

import { X } from "lucide-react";
import { useEffect } from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";

import { Button } from "./button";

type ModalSize = "sm" | "md" | "lg" | "xl" | "full";

const SIZES: Record<ModalSize, string> = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
  full: "max-w-[min(96rem,95vw)]",
};

/* Modal — suzuvchi qatlam (pane-float fizikasi), pop kirish. */
export function Modal({
  open,
  onClose,
  title,
  description,
  size = "md",
  footer,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  size?: ModalSize;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:items-center">
      <div
        className="enter-veil fixed inset-0 bg-[rgb(26_25_23/0.44)]"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "enter-pop relative z-10 my-auto flex w-full flex-col overflow-hidden rounded-[var(--r-pane-lg)] pane-float",
          SIZES[size],
          className,
        )}
      >
        {title || description ? (
          <div className="flex items-start justify-between gap-4 px-6 pb-4 pt-5">
            <div className="min-w-0">
              {title ? <h2 className="t-section text-[var(--ink)]">{title}</h2> : null}
              {description ? (
                <p className="t-meta mt-1 text-[var(--ink-3)]">{description}</p>
              ) : null}
            </div>
            <Button variant="ghost" size="iconSm" onClick={onClose} aria-label="Yopish" className="-mr-2 -mt-1">
              <X className="size-4" />
            </Button>
          </div>
        ) : null}
        <div className="max-h-[calc(100vh-14rem)] overflow-y-auto px-6 pb-6">{children}</div>
        {footer ? (
          <div className="flex items-center justify-end gap-2 border-t border-[var(--edge)] bg-[var(--pane-sunken)] px-6 py-4">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}

/* Yon panel — tafsilotlar uchun. O'ng qirradan suzuvchi qatlam. */
export function Drawer({
  open,
  onClose,
  title,
  description,
  width = "max-w-2xl",
  footer,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  width?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="enter-veil absolute inset-0 bg-[rgb(26_25_23/0.44)]"
        onClick={onClose}
        aria-hidden
      />
      <aside
        role="dialog"
        aria-modal="true"
        className={cn(
          "enter relative flex h-full w-full flex-col border-l border-[var(--edge)] bg-[var(--pane-solid)] shadow-[var(--lift-pop)]",
          width,
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--edge)] px-6 py-4">
          <div className="min-w-0">
            {title ? <h2 className="t-section truncate text-[var(--ink)]">{title}</h2> : null}
            {description ? (
              <p className="t-meta mt-1 text-[var(--ink-3)]">{description}</p>
            ) : null}
          </div>
          <Button variant="ghost" size="iconSm" onClick={onClose} aria-label="Yopish" className="-mr-2">
            <X className="size-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>
        {footer ? (
          <div className="flex items-center justify-end gap-2 border-t border-[var(--edge)] bg-[var(--pane-sunken)] px-6 py-4">
            {footer}
          </div>
        ) : null}
      </aside>
    </div>,
    document.body,
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Tasdiqlash",
  cancelLabel = "Bekor qilish",
  danger = true,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  loading?: boolean;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={danger ? "danger" : "primary"}
            size="sm"
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm leading-relaxed text-[var(--ink-3)]">{message}</p>
    </Modal>
  );
}
