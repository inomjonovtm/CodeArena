"use client";

import { AlertTriangle } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";

export interface ConfirmOptions {
  title: string;
  message?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Qizil tugma — o'chirish kabi qaytarib bo'lmaydigan amallar uchun. */
  danger?: boolean;
  /**
   * Tasdiqlash uchun aynan shu matnni yozish talab qilinadi.
   * Ommaviy o'chirish kabi juda xavfli amallar uchun.
   */
  requireText?: string;
}

export interface PromptOptions {
  title: string;
  message?: React.ReactNode;
  /** Maydon sarlavhasi. */
  label: string;
  placeholder?: string;
  hint?: string;
  defaultValue?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  /** Bo'sh qiymatga ruxsat berilmaydi (standart: true). */
  required?: boolean;
  multiline?: boolean;
}

type Pending =
  | { kind: "confirm"; options: ConfirmOptions; resolve: (value: boolean) => void }
  | { kind: "prompt"; options: PromptOptions; resolve: (value: string | null) => void };

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  prompt: (options: PromptOptions) => Promise<string | null>;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

/**
 * Brauzerning `confirm()` / `prompt()` oynalari o'rniga panel dizayniga mos
 * modal. Native oynalar sayt uslubiga bo'ysunmaydi, tarjima qilinmaydi va
 * ba'zi brauzerlarda umuman bloklanadi — admin panel uchun yaramaydi.
 */
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);
  const [value, setValue] = useState("");
  const [checkText, setCheckText] = useState("");
  // Modal yopilishi bilan resolve qilinmay qolgan va'dani "bekor" deb yopamiz
  const pendingRef = useRef<Pending | null>(null);
  pendingRef.current = pending;

  useEffect(
    () => () => {
      const current = pendingRef.current;
      if (!current) return;
      if (current.kind === "confirm") current.resolve(false);
      else current.resolve(null);
    },
    [],
  );

  const confirm = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        setValue("");
        setCheckText("");
        setPending({ kind: "confirm", options, resolve });
      }),
    [],
  );

  const prompt = useCallback(
    (options: PromptOptions) =>
      new Promise<string | null>((resolve) => {
        setValue(options.defaultValue ?? "");
        setCheckText("");
        setPending({ kind: "prompt", options, resolve });
      }),
    [],
  );

  const close = useCallback(() => {
    setPending((current) => {
      if (current?.kind === "confirm") current.resolve(false);
      else if (current?.kind === "prompt") current.resolve(null);
      return null;
    });
  }, []);

  const accept = useCallback(() => {
    setPending((current) => {
      if (current?.kind === "confirm") current.resolve(true);
      else if (current?.kind === "prompt") current.resolve(value);
      return null;
    });
  }, [value]);

  const api = useMemo(() => ({ confirm, prompt }), [confirm, prompt]);

  const options = pending?.options;
  const isPrompt = pending?.kind === "prompt";
  const promptOptions = isPrompt ? (pending.options as PromptOptions) : null;
  const confirmOptions = pending?.kind === "confirm" ? (pending.options as ConfirmOptions) : null;

  const requireText = confirmOptions?.requireText;
  const canAccept = isPrompt
    ? promptOptions?.required === false || value.trim().length > 0
    : !requireText || checkText.trim() === requireText;

  return (
    <ConfirmContext.Provider value={api}>
      {children}

      <Modal
        open={Boolean(pending)}
        onClose={close}
        title={options?.title ?? ""}
        size="sm"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={close}>
              {options?.cancelLabel ?? "Bekor qilish"}
            </Button>
            <Button
              variant={options?.danger ? "danger" : "primary"}
              size="sm"
              disabled={!canAccept}
              onClick={accept}
            >
              {options?.confirmLabel ?? "Tasdiqlash"}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {options?.danger && !isPrompt ? (
            <div className="flex gap-3 rounded-[var(--r-field)] bg-[var(--bad-wash)] p-3.5">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[var(--bad)]" />
              <p className="text-[13px] leading-relaxed text-[var(--ink)]">{options.message}</p>
            </div>
          ) : options?.message ? (
            <p className="t-body text-[var(--ink-2)]">{options.message}</p>
          ) : null}

          {promptOptions ? (
            <Field label={promptOptions.label} hint={promptOptions.hint} required={promptOptions.required !== false}>
              {promptOptions.multiline ? (
                <Textarea
                  autoFocus
                  rows={3}
                  value={value}
                  placeholder={promptOptions.placeholder}
                  onChange={(event) => setValue(event.target.value)}
                />
              ) : (
                <Input
                  autoFocus
                  value={value}
                  placeholder={promptOptions.placeholder}
                  onChange={(event) => setValue(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && canAccept) accept();
                  }}
                />
              )}
            </Field>
          ) : null}

          {requireText ? (
            <Field
              label={`Tasdiqlash uchun «${requireText}» deb yozing`}
              required
            >
              <Input
                autoFocus
                value={checkText}
                placeholder={requireText}
                onChange={(event) => setCheckText(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && canAccept) accept();
                }}
              />
            </Field>
          ) : null}
        </div>
      </Modal>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) throw new Error("useConfirm faqat <ConfirmProvider> ichida ishlaydi");
  return context;
}
