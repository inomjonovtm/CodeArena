"use client";

import { useQuery } from "@tanstack/react-query";
import { CalendarDays, ListChecks, MessagesSquare, Swords, Trophy, Zap } from "lucide-react";
import Link from "next/link";

import { Carousel } from "@/components/kit";
import { publicApi } from "@/lib/public-api";
import { formatNumber } from "@/lib/utils";

import { useCountUp, useInView } from "./count-up";

/* ==========================================================================
   «Sayt haqida» — karusel + jonli raqamlar
   --------------------------------------------------------------------------
   NEGA KARUSEL. Ilgari bosh sahifada oltita imkoniyat kartasi, uch qadamli
   yo'riqnoma, yasama kod demosi, rejalashtirgich va savol-javob bo'lgan —
   birgalikda yetti ekran balandlik. Kelgan odam mahsulot nima ekanini
   bilish uchun shuncha yo'l bosishi kerak emas: karusel o'sha ma'lumotni
   BITTA ekranga sig'diradi va o'quvchining o'zi kerakligicha varaqlaydi.

   NIMA YOZILMAYDI. Slaydlar mahsulot NIMA BERISHINI aytadi, u nima bilan
   QURILGANINI emas. Kutubxona, xizmat va texnologiya nomlari bosh sahifada
   foydalanuvchiga hech narsa qo'shmaydi.
   ========================================================================== */

interface Slide {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  body: string;
  points: string[];
  href: string;
  cta: string;
}

const SLIDES: Slide[] = [
  {
    icon: <ListChecks className="size-5" />,
    eyebrow: "Masalalar",
    title: "O'zbek tilidagi algoritmik masalalar to'plami.",
    body:
      "Shartlar ona tilida yozilgan, har biriga namunaviy testlar va tayyor boshlang'ich kod biriktirilgan. Osondan qiyinga qarab bosqichma-bosqich o'sasiz.",
    points: ["Uch daraja: oson, o'rta, qiyin", "Mavzu bo'yicha tanlash", "Yechimdan keyin tahlil"],
    href: "/problems",
    cta: "Masalalarni ko'rish",
  },
  {
    icon: <Zap className="size-5" />,
    eyebrow: "Tekshiruv",
    title: "Yechimingiz bir necha soniyada tekshiriladi.",
    body:
      "Kodni yozasiz va yuborasiz — natija darhol qaytadi: qaysi test o'tdi, qaysi biri yiqildi, qancha vaqt va xotira ketdi. Kutish yo'q, qo'lda tekshirish yo'q.",
    points: ["Namunaviy va yashirin testlar", "Vaqt va xotira o'lchovi", "Xatolik joyi ko'rsatiladi"],
    href: "/problems",
    cta: "Birinchi masalani yechish",
  },
  {
    icon: <Trophy className="size-5" />,
    eyebrow: "Musobaqalar",
    title: "Olimpiadalarda kuchingizni sinang.",
    body:
      "Belgilangan vaqtda boshlanadigan musobaqalar, jonli yangilanadigan natijalar taxtasi va yakunda reytingingizga ta'sir qiladigan o'rin.",
    points: ["Jonli natijalar taxtasi", "Reyting va daraja", "Kechikkanlar uchun virtual ishtirok"],
    href: "/contests",
    cta: "Musobaqalarni ko'rish",
  },
  {
    icon: <CalendarDays className="size-5" />,
    eyebrow: "Kunlik masala",
    title: "Har kuni bitta masala — odat shunday shakllanadi.",
    body:
      "Kalendarda har kunga bitta masala tayyor turadi. Ketma-ket yechgan kunlaringiz seriya bo'lib yig'iladi va uzilib qolmasligi uchun sizni ogohlantiradi.",
    points: ["Kunlik seriya hisobi", "Qo'shimcha ball", "Faollik kalendari"],
    href: "/daily",
    cta: "Bugungi masala",
  },
  {
    icon: <MessagesSquare className="size-5" />,
    eyebrow: "Hamjamiyat",
    title: "Tiqilib qolsangiz — yolg'iz emassiz.",
    body:
      "Masala ostidagi muhokamada g'oya so'rang, guruh tuzib do'stlaringiz bilan alohida reyting yuriting yoki umumiy reytingda o'z o'rningizni kuzating.",
    points: ["Masala muhokamalari", "Yopiq guruhlar", "Umumiy reyting"],
    href: "/discussions",
    cta: "Muhokamalarga o'tish",
  },
];

export function About() {
  return (
    <section className="section wrap">
      <p className="ts-label mb-3">Sayt haqida</p>
      <h2 className="ts-h2 max-w-[24ch] text-[var(--text)]">
        Mashqdan musobaqagacha — hammasi bitta joyda.
      </h2>

      <Carousel label="Sayt haqida" className="mt-8">
        {SLIDES.map((slide) => (
          <SlideCard key={slide.eyebrow} slide={slide} />
        ))}
      </Carousel>
    </section>
  );
}

function SlideCard({ slide }: { slide: Slide }) {
  return (
    <article className="card flex min-h-[268px] flex-col gap-5 p-6 sm:flex-row sm:items-start sm:gap-8 sm:p-8">
      <span className="grid size-11 shrink-0 place-items-center rounded-[var(--radius-md)] bg-[var(--green-wash)] text-[var(--green)]">
        {slide.icon}
      </span>

      <div className="min-w-0 flex-1">
        <p className="ts-label">{slide.eyebrow}</p>
        <h3 className="ts-h3 mt-2 max-w-[26ch] text-[var(--text)]">{slide.title}</h3>
        <p className="mt-3 max-w-[62ch] text-[16px] leading-[1.65] text-[var(--text-3)]">
          {slide.body}
        </p>

        <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2">
          {slide.points.map((point) => (
            <li key={point} className="ts-sm flex items-center gap-2 text-[var(--text-3)]">
              <span aria-hidden className="size-1.5 rounded-full bg-[var(--green)]" />
              {point}
            </li>
          ))}
        </ul>

        <Link
          href={slide.href}
          className="ring-focus mt-6 inline-flex h-10 items-center rounded-[var(--radius-md)] border border-[var(--line)] px-4 text-[15px] font-semibold text-[var(--text)] transition-colors duration-[var(--dur-1)] hover:border-[var(--green-line)] hover:text-[var(--green)]"
        >
          {slide.cta}
        </Link>
      </div>
    </article>
  );
}

/* --------------------------------------------------------------- raqamlar */

/** Jonli ko'rsatkichlar — uchta raqam, bir qator. */
export function SiteNumbers() {
  const { data } = useQuery({
    queryKey: ["site-stats"],
    queryFn: () => publicApi.site.stats(),
    staleTime: 5 * 60_000,
    retry: false,
  });

  const items = [
    { label: "Masala", value: data?.problems, icon: <ListChecks className="size-4" /> },
    { label: "Foydalanuvchi", value: data?.users, icon: <MessagesSquare className="size-4" /> },
    { label: "Yuborilgan yechim", value: data?.submissions, icon: <Swords className="size-4" /> },
  ];

  return (
    <section className="section-sm wrap">
      <div className="grid gap-px overflow-hidden rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--line)] sm:grid-cols-3">
        {items.map((item) => (
          <div key={item.label} className="flex flex-col gap-1 bg-[var(--surface)] p-6">
            <span className="flex items-center gap-2 text-[var(--text-4)]">
              {item.icon}
              <span className="ts-label">{item.label}</span>
            </span>
            <Metric value={item.value} />
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * Raqam ekranga kirganda sanaladi. Qiymat kelmaguncha joy bo'sh qoladi —
 * "0+" chizish yolg'on ma'lumot bo'lardi.
 */
function Metric({ value }: { value?: number }) {
  const { ref, inView } = useInView<HTMLParagraphElement>(0.4);
  const hasValue = typeof value === "number" && value > 0;
  const shown = useCountUp(value ?? 0, inView && hasValue);

  return (
    <p ref={ref} className="ts-metric ts-num min-h-[1em] text-[var(--text)]">
      {shown > 0 ? `${formatNumber(shown)}+` : ""}
    </p>
  );
}
