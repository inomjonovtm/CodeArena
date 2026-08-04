"use client";

import { RefreshCw, TriangleAlert } from "lucide-react";
import { useEffect } from "react";

import { Button, LinkButton } from "@/components/kit";
import { reportError } from "@/lib/report-error";

/* ==========================================================================
   Xatolik chegarasi
   --------------------------------------------------------------------------
   Kutilmagan xatoda Next standart (ingliz tilidagi, uslubsiz) sahifani
   ko'rsatardi va foydalanuvchida faqat bitta yo'l qolardi — brauzerni qayta
   yuklash. Bu ekran sabab bilan birga "qayta urinish" tugmasini beradi:
   `reset()` sahifani qaytadan render qiladi, to'liq yuklash shart emas.
   ========================================================================== */

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Konsolda to'liq izi qolsin — ishlab chiqishda diagnostika uchun
    console.error("[CodeArena]", error);
    // Serverga ham yuboriladi, aks holda bu xato faqat foydalanuvchining
    // brauzerida qolib ketardi va biz undan bexabar bo'lardik.
    reportError(error, { boundary: "app", digest: error.digest ?? "" });
  }, [error]);

  return (
    <div className="aurora-canvas flex min-h-dvh items-center justify-center px-5 py-16">
      <div className="w-full max-w-md">
        <span className="flex size-10 items-center justify-center rounded-full border border-[var(--bad)] text-[var(--bad)]">
          <TriangleAlert className="size-5" />
        </span>

        <h1 className="t-title mt-6 text-[var(--ink)]">Nimadir noto&apos;g&apos;ri ketdi</h1>
        <p className="t-body mt-3 text-[var(--ink-3)]">
          Sahifani ko&apos;rsatishda kutilmagan xatolik yuz berdi. Qayta urinib ko&apos;ring —
          takrorlansa, biroz keyinroq qayting.
        </p>

        {error.digest ? (
          <p className="t-meta mt-4 text-[var(--ink-4)]">
            Xato kodi: <span className="t-num text-[var(--ink-2)]">{error.digest}</span>
          </p>
        ) : null}

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Button variant="primary" icon={<RefreshCw className="size-4" />} onClick={reset}>
            Qayta urinish
          </Button>
          <LinkButton href="/">Bosh sahifa</LinkButton>
        </div>
      </div>
    </div>
  );
}
