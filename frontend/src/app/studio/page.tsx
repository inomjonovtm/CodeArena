"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CalendarDays, CircleSlash, Plus, Puzzle, Terminal, Trophy } from "lucide-react";
import Link from "next/link";

import { useAuth } from "@/components/providers";
import { StNotice } from "@/components/studio/problem/shared";
import { Verdict, WorkBody, WorkEmpty, WorkError, WorkHeader, WorkPanel } from "@/components/studio/workbench";
import { studio } from "@/lib/studio-api";
import { cn } from "@/lib/utils";

/* ==========================================================================
   STUDIO — bosh sahifa
   --------------------------------------------------------------------------
   SODDALASHTIRISH. Ilgari bu ekranda beshta blok bor edi: to'rt qadamli
   yo'riqnoma, judge ogohlantirishi, to'rtta ko'rsatkich kartasi, «e'tibor
   talab qiladi» ro'yxati va «oxirgi amallar» jurnali. Ekran to'lib
   ketardi, lekin ularning ko'pchiligi HARAKATGA chaqirmasdi — shunchaki
   raqam ko'rsatardi.

   Endi sahifa uch savolga javob beradi, shu tartibda:

     1. «Bu yer nima?»        — qisqa xush kelibsiz matni (bir marta o'qiladi)
     2. «Nima buzilgan?»      — ogohlantirishlar (faqat muammo bo'lsa chiziladi)
     3. «Nima qilaman?»       — bo'limlar ro'yxati + tugallanmagan masalalar

   «Oxirgi amallar» jurnali olib tashlandi: u har bir masalaning o'z
   ichida, kerak bo'lgan joyda ko'rinadi. Bosh sahifada esa u faqat
   o'tmishni sanab, hech qanday ish taklif qilmasdi.
   ========================================================================== */

/** Bo'limlar — relsdagi menyu bilan AYNAN bir xil nomda. */
const SECTIONS = [
  {
    href: "/studio/problems",
    icon: Puzzle,
    label: "Masalalar",
    hint: "Shart, testlar, etalon yechim va chop etish",
  },
  {
    href: "/studio/contests",
    icon: Trophy,
    label: "Olimpiadalar",
    hint: "Musobaqa tuzish, masala biriktirish, natijalar",
  },
  {
    href: "/studio/daily",
    icon: CalendarDays,
    label: "Kunlik masala",
    hint: "Kalendar — har kunga bitta masala",
  },
  {
    href: "/studio/generator",
    icon: Terminal,
    label: "Test yasovchi",
    hint: "Ko'p testni kod bilan yaratish",
  },
];

export default function StudioHome() {
  const { user } = useAuth();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["studio", "overview"],
    queryFn: () => studio.overview(),
    refetchInterval: 60_000,
  });

  const firstName = (user?.full_name || user?.username || "").split(" ")[0];

  const COUNTS: Record<string, string> = {
    "/studio/problems": data
      ? `${data.problems.total} ta · ${data.problems.draft} qoralama`
      : "",
    "/studio/contests": data ? `${data.contests.total} ta` : "",
    "/studio/daily": "",
    "/studio/generator": "",
  };

  return (
    <>
      <WorkHeader
        title={firstName ? `Salom, ${firstName}` : "Studio"}
        actions={
          <Link
            href="/studio/problems/new"
            className="inline-flex h-9 items-center gap-2 rounded-[var(--radius-sm)] bg-[var(--green)] px-4 text-[15px] font-semibold text-[var(--text-on-green)] transition-colors hover:bg-[var(--green-hover)]"
          >
            <Plus className="size-4" />
            Yangi masala
          </Link>
        }
      />

      <WorkBody className="space-y-5">
        {/* ------------------------------------------------ 1. xush kelibsiz */}
        <section className="max-w-2xl py-2">
          <h2 className="ts-h2 text-[var(--text)]">
            CodeArena Studio&apos;ga xush kelibsiz
          </h2>
          <p className="mt-3 text-[16.5px] leading-relaxed text-[var(--text-3)]">
            Studio — kontent tayyorlash ishxonasi. Bu yerda dasturlash masalalari
            tuziladi, ularga testlar va etalon yechim biriktiriladi, olimpiadalar
            o&apos;tkaziladi va kunlik masala kalendari to&apos;ldiriladi.
          </p>
          <p className="mt-2.5 text-[16.5px] leading-relaxed text-[var(--text-3)]">
            Masala to&apos;rt qadamda tayyor bo&apos;ladi:{" "}
            <span className="font-medium text-[var(--text)]">shart → testlar → yechim → nashr</span>.
            Har bir qadamda nima yetishmayotgani masalaning o&apos;z ekranida
            ko&apos;rsatiladi.
          </p>
        </section>

        {/* --------------------------------------------- 2. ogohlantirishlar */}
        {data && !data.judge.available ? (
          <StNotice tone="danger" title="Kod bajarish xizmati ishlamayapti">
            Test yasash, yechimni tekshirish va stress-sinov hozir bajarilmaydi.
            Masalani chop etishdan oldin xizmat tiklanishini kuting — aks holda
            testlar javobsiz qolib ketadi.
          </StNotice>
        ) : null}

        {data && data.problems.draft > 0 ? (
          <StNotice tone="warn" title={`${data.problems.draft} ta masala qoralamada turibdi`}>
            Qoralama masalani faqat siz ko&apos;rasiz. Tayyor bo&apos;lsa, masalani
            ochib «Chop etish» tugmasini bosing.
          </StNotice>
        ) : null}

        {/* ------------------------------------------------- 3. bo'limlar */}
        <ul className="grid gap-3 sm:grid-cols-2">
          {SECTIONS.map((section) => {
            const Icon = section.icon;
            return (
              <li key={section.href}>
                <Link
                  href={section.href}
                  className={cn(
                    "st-panel group flex items-start gap-3.5 p-4 transition-colors",
                    "hover:border-[var(--green-line)] hover:bg-[var(--st-panel-hover)]",
                  )}
                >
                  <span className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-full bg-[var(--green-wash)] text-[var(--green-text)]">
                    <Icon className="size-[18px]" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="text-[16.5px] font-semibold text-[var(--text)]">
                        {section.label}
                      </span>
                      {COUNTS[section.href] ? (
                        <span className="st-num text-[13.5px] text-[var(--text-4)]">
                          {COUNTS[section.href]}
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-1 block text-[14.5px] leading-snug text-[var(--text-4)]">
                      {section.hint}
                    </span>
                  </span>
                  <ArrowRight className="mt-2.5 size-4 shrink-0 text-[var(--text-4)] transition-transform duration-[var(--dur-2)] group-hover:translate-x-1" />
                </Link>
              </li>
            );
          })}
        </ul>

        {/* --------------------------------- 4. tugallanmagan masalalar */}
        <WorkPanel
          title="E'tibor talab qiladi"
          hint="Testi yoki etalon yechimi yo'q masalalar chop etib bo'lmaydi — bu yerda eng eski 8 tasi"
          actions={
            <Link
              href="/studio/problems"
              className="text-[14px] font-medium text-[var(--green-text)] transition-colors hover:underline"
            >
              Barcha masalalar →
            </Link>
          }
          bodyClassName="p-0"
        >
          {isLoading ? (
            <SkeletonRows />
          ) : isError ? (
            <div className="p-4">
              <WorkError onRetry={() => void refetch()} />
            </div>
          ) : data?.needs_work.length ? (
            <ul className="divide-y divide-[var(--st-edge-soft)]">
              {data.needs_work.map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/studio/problems/${item.id}`}
                    className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-[var(--surface-hover)]"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15.5px] font-medium text-[var(--text)]">
                        {item.title}
                      </p>
                      <p className="mt-0.5 truncate text-[13.5px] text-[var(--text-4)]">
                        {item.tests} test · {item.solutions} yechim
                      </p>
                    </div>
                    <Verdict tone="fail">{item.reason}</Verdict>
                    <ArrowRight className="size-4 shrink-0 text-[var(--text-4)]" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-4">
              <WorkEmpty
                icon={<CircleSlash className="size-6" />}
                title="Hammasi joyida"
                hint="Barcha masalalaringizda test ham, etalon yechim ham bor."
              />
            </div>
          )}
        </WorkPanel>
      </WorkBody>
    </>
  );
}

function SkeletonRows() {
  return (
    <ul className="divide-y divide-[var(--st-edge-soft)]">
      {[0, 1, 2].map((row) => (
        <li key={row} className="flex items-center gap-3 px-4 py-3.5">
          <div className="h-4 w-full animate-pulse rounded bg-[var(--surface-hover)]" />
        </li>
      ))}
    </ul>
  );
}
