"use client";

import { ArrowLeft, MailCheck, Send } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/kit";
import { AuthField, AuthShell, authInputClass } from "@/components/site/auth-shell";
import { ApiError } from "@/lib/api";
import { authApi } from "@/lib/public-api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await authApi.forgotPassword(email.trim());
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "So'rovni yuborib bo'lmadi.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Parolni tiklash"
      subtitle={
        sent
          ? "Xat yuborildi — pochtangizni tekshiring."
          : "Hisobingizga bog'langan emailni kiriting."
      }
      error={error}
      footer={
        <Link
          href="/login"
          className="focus-ring inline-flex items-center gap-1.5 rounded-[var(--r-ctl)] font-medium text-[var(--brand)] hover:underline"
        >
          <ArrowLeft className="size-3.5" />
          Kirish sahifasiga qaytish
        </Link>
      }
    >
      {sent ? (
        <div className="enter mt-6 flex flex-col items-center gap-4 text-center">
          <span className="flex size-12 items-center justify-center rounded-full border border-[var(--ok)] bg-[var(--ok-wash)] text-[var(--ok)]">
            <MailCheck className="size-7" />
          </span>
          <p className="t-body max-w-sm text-[var(--ink-3)]">
            Agar <span className="font-medium text-[var(--ink)]">{email}</span> manzili
            ro&apos;yxatdan o&apos;tgan bo&apos;lsa, tiklash havolasi yuborildi. Havola 2 soat
            amal qiladi.
          </p>
          <Button type="button" variant="ghost" size="sm" onClick={() => setSent(false)}>
            Boshqa email kiritish
          </Button>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
          <AuthField
            label="Email"
            htmlFor="email"
            required
            hint="Xavfsizlik uchun email mavjudligi oshkor qilinmaydi."
          >
            <input
              id="email"
              type="email"
              autoFocus
              autoComplete="email"
              className={authInputClass}
              placeholder="siz@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </AuthField>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={submitting}
            icon={submitting ? undefined : <Send className="size-4" />}
            className="mt-2 w-full"
          >
            {submitting ? "Yuborilmoqda..." : "Tiklash havolasini yuborish"}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
