"use client";

import { CheckCircle2, Eye, EyeOff, KeyRound } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";

import { Button } from "@/components/kit";
import { AuthField, AuthShell, authInputClass } from "@/components/site/auth-shell";
import { ApiError } from "@/lib/api";
import { authApi } from "@/lib/public-api";
import { cn } from "@/lib/utils";

function ResetPasswordInner() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const rules = useMemo(
    () => [
      { label: "Kamida 8 ta belgi", ok: password.length >= 8 },
      { label: "Faqat raqamlardan iborat emas", ok: password.length > 0 && !/^\d+$/.test(password) },
      { label: "Ikkala maydon bir xil", ok: password.length > 0 && password === confirm },
    ],
    [password, confirm],
  );
  const ready = rules.every((rule) => rule.ok);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!ready) {
      setError("Parol talablarga javob bermayapti.");
      return;
    }
    setSubmitting(true);
    try {
      await authApi.resetPassword(token, password);
      setDone(true);
      setTimeout(() => router.replace("/login?reset=1"), 2500);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Parolni tiklab bo'lmadi.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!token) {
    return (
      <AuthShell
        title="Havola topilmadi"
        subtitle="Tiklash havolasi to'liq emas."
        error="Havolada token yo'q. Emaildagi tugmani to'liq nusxalab oching."
        footer={
          <Link
            href="/forgot-password"
            className="focus-ring rounded-[var(--r-ctl)] font-medium text-[var(--brand)] hover:underline"
          >
            Yangi havola so&apos;rash
          </Link>
        }
      >
        <div />
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Yangi parol"
      subtitle={done ? "Parol yangilandi." : "Hisobingiz uchun yangi parol o'rnating."}
      error={error}
      footer={
        <Link
          href="/login"
          className="focus-ring rounded-[var(--r-ctl)] font-medium text-[var(--brand)] hover:underline"
        >
          Kirish sahifasi
        </Link>
      }
    >
      {done ? (
        <div className="enter mt-6 flex flex-col items-center gap-4 text-center">
          <span className="flex size-12 items-center justify-center rounded-full border border-[var(--ok)] bg-[var(--ok-wash)] text-[var(--ok)]">
            <CheckCircle2 className="size-7" />
          </span>
          <p className="t-body text-[var(--ink-3)]">
            Parolingiz muvaffaqiyatli yangilandi va barcha eski sessiyalar yopildi.
            Kirish sahifasiga o&apos;tmoqdasiz...
          </p>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
          <AuthField label="Yangi parol" htmlFor="password" required>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-[var(--ink-4)]" />
              <input
                id="password"
                type={show ? "text" : "password"}
                autoFocus
                autoComplete="new-password"
                className={`${authInputClass} pr-11 pl-11`}
                placeholder="••••••••"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShow((value) => !value)}
                aria-label={show ? "Parolni yashirish" : "Parolni ko'rsatish"}
                className="focus-ring absolute top-1/2 right-3 -translate-y-1/2 rounded-[var(--r-ctl)] text-[var(--ink-4)] transition-colors hover:text-[var(--ink-2)]"
              >
                {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </AuthField>

          <AuthField label="Parolni tasdiqlang" htmlFor="confirm" required>
            <input
              id="confirm"
              type={show ? "text" : "password"}
              autoComplete="new-password"
              className={authInputClass}
              placeholder="••••••••"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              required
            />
          </AuthField>

          <ul className="flex flex-col gap-1">
            {rules.map((rule) => (
              <li
                key={rule.label}
                className={cn(
                  "flex items-center gap-1.5 text-[12px]",
                  rule.ok ? "text-[var(--ok)]" : "text-[var(--ink-4)]",
                )}
              >
                <span
                  className={cn(
                    "size-1.5 rounded-full",
                    rule.ok ? "bg-[var(--ok)]" : "bg-[var(--brand-wash-strong)]",
                  )}
                />
                {rule.label}
              </li>
            ))}
          </ul>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={submitting}
            disabled={!ready}
            className="mt-2 w-full"
          >
            {submitting ? "Saqlanmoqda..." : "Parolni yangilash"}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="aurora-canvas min-h-screen" />}>
      <ResetPasswordInner />
    </Suspense>
  );
}
