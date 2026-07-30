"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Check, ChevronDown, Eye, EyeOff, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/kit";
import { useAuth } from "@/components/providers";
import { AuthField, AuthShell, authInputClass } from "@/components/site/auth-shell";
import { GoogleButton } from "@/components/site/google-button";
import { ApiError } from "@/lib/api";
import { authApi, publicApi } from "@/lib/public-api";
import { cn } from "@/lib/utils";

const USERNAME_RE = /^[a-zA-Z0-9_]{3,32}$/;

/** Parol talablari — backenddagi validatorlar bilan bir xil. */
function passwordRules(password: string, username: string) {
  return [
    { label: "Kamida 8 ta belgi", ok: password.length >= 8 },
    { label: "Faqat raqamlardan iborat emas", ok: password.length > 0 && !/^\d+$/.test(password) },
    {
      label: "Login bilan bir xil emas",
      ok: password.length > 0 && password.toLowerCase() !== username.toLowerCase(),
    },
  ];
}

/** Tizim uslubidagi native select — auth maydonlari bilan bir xil. */
function AuthSelect({
  id,
  value,
  onChange,
  options,
  disabled,
  placeholder = "Tanlang...",
}: {
  id?: string;
  value: string;
  onChange: (next: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          authInputClass,
          "appearance-none pr-9",
          !value && "text-[var(--ink-4)]",
          disabled && "cursor-not-allowed",
        )}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-[var(--ink-4)]" />
    </div>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const { user, loading, refresh } = useAuth();

  const [form, setForm] = useState({
    username: "",
    email: "",
    full_name: "",
    region: "",
    district: "",
    education_place: "",
    password: "",
    password_confirm: "",
    accept_terms: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Viloyat/tuman ro'yxati backenddan keladi — bitta manba, ikki joyda
  // takrorlanmaydi va tekshiruv ham shu ro'yxatga qarab bo'ladi.
  const { data: geo } = useQuery({
    queryKey: ["geo-regions"],
    queryFn: () => publicApi.regions(),
    staleTime: 60 * 60 * 1000,
  });
  const regions = geo?.regions ?? [];
  const districts = regions.find((row) => row.name === form.region)?.districts ?? [];

  // Allaqachon kirgan bo'lsa — masalalarga
  useEffect(() => {
    if (!loading && user) router.replace("/problems");
  }, [loading, user, router]);

  const set = (key: keyof typeof form, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const rules = useMemo(
    () => passwordRules(form.password, form.username),
    [form.password, form.username],
  );
  const strength = rules.filter((rule) => rule.ok).length;

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setFieldErrors({});

    const nextErrors: Record<string, string> = {};
    if (!USERNAME_RE.test(form.username.trim())) {
      nextErrors.username = "3–32 ta belgi: harf, raqam va pastki chiziq (_).";
    }
    if (!form.region) nextErrors.region = "Viloyatni tanlang.";
    if (!form.district) nextErrors.district = "Tumanni tanlang.";
    if (form.education_place.trim().length < 3) {
      nextErrors.education_place = "Ta'lim maskani nomini yozing.";
    }
    if (form.password !== form.password_confirm) {
      nextErrors.password_confirm = "Parollar mos kelmadi.";
    }
    if (rules.some((rule) => !rule.ok)) {
      nextErrors.password = "Parol talablarga javob bermayapti.";
    }
    if (Object.keys(nextErrors).length) {
      setFieldErrors(nextErrors);
      return;
    }
    if (!form.accept_terms) {
      setError("Davom etish uchun foydalanish shartlariga rozilik bildiring.");
      return;
    }

    setSubmitting(true);
    try {
      await authApi.register({
        username: form.username.trim(),
        email: form.email.trim(),
        full_name: form.full_name.trim(),
        region: form.region,
        district: form.district,
        education_place: form.education_place.trim(),
        password: form.password,
        password_confirm: form.password_confirm,
        accept_terms: form.accept_terms,
        locale: "uz",
      });
      // Backend cookie o'rnatadi — auth kontekstini yangilaymiz
      await refresh();
      router.replace("/problems?welcome=1");
    } catch (err) {
      if (err instanceof ApiError) {
        const next: Record<string, string> = {};
        for (const key of [
          "username", "email", "region", "district", "education_place",
          "password", "password_confirm", "accept_terms",
        ]) {
          const message = err.fieldError(key);
          if (message) next[key] = message;
        }
        setFieldErrors(next);
        // Maydonga bog'lanmagan xatolikni tepada ko'rsatamiz
        if (Object.keys(next).length === 0) setError(err.message);
      } else {
        setError("Ro'yxatdan o'tishda xatolik yuz berdi. Keyinroq urinib ko'ring.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      wide
      title="Ro'yxatdan o'tish"
      subtitle="Bir daqiqa — va birinchi masalangizni yechishingiz mumkin."
      error={error}
      footer={
        <>
          Hisobingiz bormi?{" "}
          <Link
            href="/login"
            className="focus-ring rounded-[var(--r-ctl)] font-medium text-[var(--brand)] hover:underline"
          >
            Kirish
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-3.5">
        <div className="grid gap-3.5 sm:grid-cols-2">
          <AuthField
            label="Foydalanuvchi nomi"
            htmlFor="username"
            required
            error={fieldErrors.username}
          >
            <input
              id="username"
              autoFocus
              autoComplete="username"
              className={authInputClass}
              placeholder="aziz_dev"
              value={form.username}
              onChange={(event) => set("username", event.target.value)}
              required
            />
          </AuthField>

          <AuthField label="To'liq ism" htmlFor="full_name">
            <input
              id="full_name"
              autoComplete="name"
              className={authInputClass}
              placeholder="Aziz Karimov"
              value={form.full_name}
              onChange={(event) => set("full_name", event.target.value)}
            />
          </AuthField>
        </div>

        <AuthField label="Email" htmlFor="email" required error={fieldErrors.email}>
          <input
            id="email"
            type="email"
            autoComplete="email"
            className={authInputClass}
            placeholder="siz@example.com"
            value={form.email}
            onChange={(event) => set("email", event.target.value)}
            required
          />
        </AuthField>

        <div className="grid gap-3.5 sm:grid-cols-2">
          <AuthField label="Viloyat" htmlFor="region" required error={fieldErrors.region}>
            <AuthSelect
              id="region"
              value={form.region}
              // Viloyat almashsa eski tuman yaroqsiz bo'lib qoladi
              onChange={(next) => setForm((prev) => ({ ...prev, region: next, district: "" }))}
              options={regions.map((row) => ({ value: row.name, label: row.name }))}
            />
          </AuthField>

          <AuthField label="Tuman / shahar" htmlFor="district" required error={fieldErrors.district}>
            <AuthSelect
              id="district"
              value={form.district}
              disabled={!form.region}
              placeholder={form.region ? "Tanlang..." : "Avval viloyat"}
              onChange={(next) => set("district", next)}
              options={districts.map((name) => ({ value: name, label: name }))}
            />
          </AuthField>
        </div>

        <AuthField
          label="Ta'lim maskani"
          htmlFor="education_place"
          required
          error={fieldErrors.education_place}
          hint="Maktab, litsey, kollej yoki universitet nomini yozing"
        >
          <input
            id="education_place"
            className={authInputClass}
            placeholder="masalan: 42-son umumta'lim maktabi"
            value={form.education_place}
            onChange={(event) => set("education_place", event.target.value)}
            required
          />
        </AuthField>

        <div className="grid gap-3.5 sm:grid-cols-2">
          <AuthField label="Parol" htmlFor="password" required error={fieldErrors.password}>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                className={`${authInputClass} pr-10`}
                placeholder="••••••••"
                value={form.password}
                onChange={(event) => set("password", event.target.value)}
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

          <AuthField
            label="Parolni tasdiqlang"
            htmlFor="password_confirm"
            required
            error={fieldErrors.password_confirm}
          >
            <input
              id="password_confirm"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              className={authInputClass}
              placeholder="••••••••"
              value={form.password_confirm}
              onChange={(event) => set("password_confirm", event.target.value)}
              required
            />
          </AuthField>
        </div>

        {form.password ? (
          <div className="enter-pop">
            {/* Kuch ko'rsatkichi — uch bo'lakli ingichka chiziq */}
            <div className="flex gap-1.5" aria-hidden>
              {[0, 1, 2].map((index) => (
                <span
                  key={index}
                  className={cn(
                    "h-1.5 flex-1 rounded-full transition-colors duration-[var(--t-base)]",
                    index < strength
                      ? strength === 3
                        ? "bg-[var(--ok)]"
                        : "bg-[var(--warn)]"
                      : "bg-[var(--brand-wash-strong)]",
                  )}
                />
              ))}
            </div>
            <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
              {rules.map((rule) => (
                <li
                  key={rule.label}
                  className={cn(
                    "flex items-center gap-1.5 text-[11.5px]",
                    rule.ok ? "text-[var(--ok)]" : "text-[var(--ink-4)]",
                  )}
                >
                  {rule.ok ? <Check className="size-3" /> : <X className="size-3" />}
                  {rule.label}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <label className="flex cursor-pointer items-start gap-2.5">
          <input
            type="checkbox"
            className="focus-ring mt-0.5 size-4 shrink-0 cursor-pointer rounded accent-[var(--brand)]"
            checked={form.accept_terms}
            onChange={(event) => set("accept_terms", event.target.checked)}
          />
          <span className="text-[12.5px] leading-relaxed text-[var(--ink-3)]">
            <Link
              href="/terms"
              target="_blank"
              className="text-[var(--brand)] hover:underline"
            >
              Foydalanish shartlari
            </Link>{" "}
            va{" "}
            <Link
              href="/privacy"
              target="_blank"
              className="text-[var(--brand)] hover:underline"
            >
              maxfiylik siyosati
            </Link>
            ga roziman
          </span>
        </label>
        {fieldErrors.accept_terms ? (
          <p className="-mt-2 text-[11.5px] text-[var(--bad)]">{fieldErrors.accept_terms}</p>
        ) : null}

        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={submitting}
          iconAfter={submitting ? undefined : <ArrowRight className="size-4" />}
          className="mt-1 w-full"
        >
          {submitting ? "Yaratilmoqda..." : "Hisob yaratish"}
        </Button>
      </form>

      <GoogleButton text="signup_with" />
    </AuthShell>
  );
}
