"use client";

import { ArrowLeft, ArrowRight, Eye, EyeOff, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

import { Button } from "@/components/kit";
import { useAuth } from "@/components/providers";
import { AuthField, AuthShell, authInputClass } from "@/components/site/auth-shell";
import { GoogleButton } from "@/components/site/google-button";
import { ApiError } from "@/lib/api";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { login, user, loading } = useAuth();

  const [loginValue, setLoginValue] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [needsTotp, setNeedsTotp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const totpRef = useRef<HTMLInputElement>(null);

  const nextPath = params.get("next");
  // Admin marshrutiga qaytish so'ralgan bo'lsagina rol tekshiriladi
  const wantsAdmin = Boolean(nextPath?.startsWith("/admin"));
  const destination = nextPath || "/problems";

  useEffect(() => {
    if (params.get("error") === "forbidden") {
      setError("Bu bo'limga kirish huquqingiz yo'q.");
    }
    if (params.get("reset") === "1") {
      setError(null);
    }
  }, [params]);

  // Allaqachon kirgan bo'lsa — to'g'ridan-to'g'ri manzilga
  useEffect(() => {
    if (loading || !user) return;
    if (wantsAdmin && !user.permissions.can_access_admin) return;
    router.replace(destination);
  }, [loading, user, wantsAdmin, destination, router]);

  useEffect(() => {
    if (needsTotp) totpRef.current?.focus();
  }, [needsTotp]);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const me = await login(loginValue.trim(), password, needsTotp ? totpCode.trim() : undefined);
      if (wantsAdmin && !me.permissions.can_access_admin) {
        setError("Bu hisobda admin panelga kirish huquqi yo'q.");
        return;
      }
      router.replace(destination);
    } catch (err) {
      if (err instanceof ApiError && err.code === "totp_required") {
        setNeedsTotp(true);
        setError("Hisobingizda ikki bosqichli tasdiqlash yoqilgan. Authenticator kodini kiriting.");
        return;
      }
      if (err instanceof ApiError && err.code === "totp_invalid") {
        setError("Tasdiqlash kodi noto'g'ri yoki muddati o'tgan.");
        return;
      }
      setError(err instanceof ApiError ? err.message : "Login yoki parol noto'g'ri.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title={needsTotp ? "Ikki bosqichli tasdiqlash" : "Xush kelibsiz"}
      subtitle={
        needsTotp
          ? "Authenticator ilovasidagi 6 xonali kodni kiriting."
          : "Davom etish uchun hisobingizga kiring."
      }
      error={error}
      footer={
        <>
          Hisobingiz yo&apos;qmi?{" "}
          <Link
            href="/register"
            className="focus-ring rounded-[var(--r-ctl)] font-medium text-[var(--brand)] hover:underline"
          >
            Ro&apos;yxatdan o&apos;tish
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-3.5">
        {needsTotp ? (
          <>
            <AuthField label="Tasdiqlash kodi" htmlFor="totp" required>
              <div className="relative">
                <ShieldCheck className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-[var(--brand)]" />
                <input
                  id="totp"
                  ref={totpRef}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  className={`${authInputClass} pl-11 text-center font-mono text-[18px] tracking-[0.4em]`}
                  placeholder="000000"
                  value={totpCode}
                  onChange={(event) => setTotpCode(event.target.value.replace(/\D/g, ""))}
                  required
                />
              </div>
            </AuthField>

            <button
              type="button"
              onClick={() => {
                setNeedsTotp(false);
                setTotpCode("");
                setError(null);
              }}
              className="focus-ring inline-flex items-center gap-1.5 self-start rounded-[var(--r-ctl)] text-[13px] text-[var(--ink-3)] transition-colors hover:text-[var(--ink)]"
            >
              <ArrowLeft className="size-3.5" />
              Boshqa hisob bilan kirish
            </button>
          </>
        ) : (
          <>
            <AuthField label="Login yoki email" htmlFor="login" required>
              <input
                id="login"
                autoFocus
                autoComplete="username"
                className={authInputClass}
                placeholder="username yoki email"
                value={loginValue}
                onChange={(event) => setLoginValue(event.target.value)}
                required
              />
            </AuthField>

            <AuthField label="Parol" htmlFor="password" required>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  className={`${authInputClass} pr-11`}
                  placeholder="••••••••"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "Parolni yashirish" : "Parolni ko'rsatish"}
                  className="focus-ring absolute top-1/2 right-3 -translate-y-1/2 rounded-[var(--r-ctl)] text-[var(--ink-4)] transition-colors hover:text-[var(--ink-2)]"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </AuthField>

            <Link
              href="/forgot-password"
              className="focus-ring -mt-1 self-end rounded-[var(--r-ctl)] text-[13px] text-[var(--ink-3)] transition-colors hover:text-[var(--brand)]"
            >
              Parolni unutdingizmi?
            </Link>
          </>
        )}

        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={submitting}
          iconAfter={submitting ? undefined : <ArrowRight className="size-4" />}
          className="mt-1.5 w-full"
        >
          {submitting ? "Kirilmoqda..." : needsTotp ? "Tasdiqlash" : "Kirish"}
        </Button>
      </form>

      {!needsTotp ? <GoogleButton text="signin_with" /> : null}
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="aurora-canvas min-h-screen" />}>
      <LoginForm />
    </Suspense>
  );
}
