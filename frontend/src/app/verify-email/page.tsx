"use client";

import { CheckCircle2, Loader2, MailWarning, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

import { Button, LinkButton } from "@/components/kit";
import { useAuth } from "@/components/providers";
import { AuthShell } from "@/components/site/auth-shell";
import { ApiError } from "@/lib/api";
import { authApi } from "@/lib/public-api";

type State = "idle" | "loading" | "success" | "error";

function VerifyEmailInner() {
  const params = useSearchParams();
  const router = useRouter();
  const { user, refresh } = useAuth();

  const token = params.get("token") ?? "";
  const [state, setState] = useState<State>(token ? "loading" : "idle");
  const [message, setMessage] = useState<string>("");
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState<string | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!token || startedRef.current) return;
    startedRef.current = true;

    authApi
      .verifyEmail(token)
      .then(async (response) => {
        setState("success");
        setMessage(response.detail);
        await refresh();
      })
      .catch((error) => {
        setState("error");
        setMessage(
          error instanceof ApiError
            ? error.message
            : "Havolani tekshirib bo'lmadi. Keyinroq urinib ko'ring.",
        );
      });
  }, [token, refresh]);

  // Muvaffaqiyatdan so'ng 4 soniyada masalalarga o'tkazamiz
  useEffect(() => {
    if (state !== "success") return;
    const timer = setTimeout(() => router.replace("/problems"), 4000);
    return () => clearTimeout(timer);
  }, [state, router]);

  const resend = async () => {
    setResending(true);
    setResent(null);
    try {
      const response = await authApi.resendVerification();
      setResent(response.detail);
    } catch (error) {
      setResent(
        error instanceof ApiError ? error.message : "Xatni qayta yuborib bo'lmadi.",
      );
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthShell
      title="Emailni tasdiqlash"
      subtitle={
        state === "success"
          ? "Hisobingiz to'liq faollashtirildi."
          : "Xatdagi havola orqali hisobingizni tasdiqlang."
      }
      error={state === "error" ? message : null}
      footer={
        <Link
          href="/problems"
          className="focus-ring rounded-[var(--r-ctl)] font-medium text-[var(--brand)] hover:underline"
        >
          Masalalarga o&apos;tish
        </Link>
      }
    >
      <div className="enter mt-6 flex flex-col items-center gap-4 text-center">
        {state === "loading" ? (
          <>
            <Loader2 className="size-8 animate-spin text-[var(--brand)]" />
            <p className="t-body text-[var(--ink-3)]">Havola tekshirilmoqda...</p>
          </>
        ) : null}

        {state === "success" ? (
          <>
            <span className="flex size-12 items-center justify-center rounded-full border border-[var(--ok)] bg-[var(--ok-wash)] text-[var(--ok)]">
              <CheckCircle2 className="size-7" />
            </span>
            <p className="text-[15px] font-medium text-[var(--ink)]">{message}</p>
            <p className="t-meta text-[var(--ink-4)]">
              Bir necha soniyada masalalar sahifasiga o&apos;tasiz.
            </p>
          </>
        ) : null}

        {state === "idle" ? (
          <>
            <span className="flex size-12 items-center justify-center rounded-full border border-[var(--edge-strong)] bg-[var(--pane-sunken)] text-[var(--ink-4)]">
              <MailWarning className="size-7" />
            </span>
            <p className="t-body max-w-sm text-[var(--ink-3)]">
              {user?.is_email_verified
                ? "Emailingiz allaqachon tasdiqlangan."
                : "Emailingizga yuborilgan xatdagi tugmani bosing. Xat kelmagan bo'lsa — spam papkasini ham tekshiring."}
            </p>
          </>
        ) : null}

        {state === "error" ? (
          <p className="t-meta text-[var(--ink-3)]">
            Havola muddati 48 soat. Muddat tugagan bo&apos;lsa, yangi xat so&apos;rang.
          </p>
        ) : null}

        {user && !user.is_email_verified && state !== "success" ? (
          <>
            <Button
              type="button"
              variant="quiet"
              size="lg"
              onClick={resend}
              loading={resending}
              icon={resending ? undefined : <RefreshCw className="size-4" />}
              className="mt-1"
            >
              Tasdiqlash xatini qayta yuborish
            </Button>
            {resent ? <p className="t-meta text-[var(--ink-3)]">{resent}</p> : null}
          </>
        ) : null}

        {!user && state !== "success" ? (
          <LinkButton href="/login" variant="primary" size="lg" className="mt-1">
            Hisobga kirish
          </LinkButton>
        ) : null}
      </div>
    </AuthShell>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="aurora-canvas min-h-screen" />}>
      <VerifyEmailInner />
    </Suspense>
  );
}
