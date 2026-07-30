"use client";

import { BookOpenCheck, Lock, MessagesSquare, Pin, ShieldCheck } from "lucide-react";

import { PageHead, Pane, PaneHead, SplitLayout } from "@/components/kit";
import { DiscussionList } from "@/components/site/discussions";

/** Hamjamiyat qoidalari — yon ustunda doim ko'rinib turadi. */
const RULES = [
  "Hurmat bilan yozing — haqorat va kamsitish taqiqlanadi.",
  "Tayyor yechim kodini tarqatmang, yondashuvni tushuntiring.",
  "Savol berishdan oldin mavjud mavzularni qidirib ko'ring.",
  "Masalaga oid savolni masala sahifasidan oching — kontekst saqlanadi.",
];

export default function DiscussionsPage() {
  return (
    <>
      <PageHead
        eyebrow="Hamjamiyat"
        title="Muhokamalar"
        lead="Savol bering, yondashuvlarni muhokama qiling, boshqalarga yordam bering."
      />

      <div className="mt-8">
        <SplitLayout
          aside={
            <div className="flex flex-col gap-4">
              <Pane className="enter">
                <PaneHead
                  eyebrow="Qoidalar"
                  title="Hamjamiyat tartibi"
                  hint="Moderatorlar buzilishlarni ko'rib chiqadi."
                />
                <ul className="mt-4 flex flex-col gap-2.5">
                  {RULES.map((rule) => (
                    <li key={rule} className="flex items-start gap-2.5">
                      <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-[var(--ok)]" />
                      <span className="t-meta text-[var(--ink-2)]">{rule}</span>
                    </li>
                  ))}
                </ul>
              </Pane>

              <Pane tone="sunken" inset="sm" className="enter">
                <p className="t-eyebrow">Belgilar</p>
                <ul className="mt-3 flex flex-col gap-2.5">
                  <li className="flex items-center gap-2.5">
                    <Pin className="size-3.5 shrink-0 text-[var(--brand)]" />
                    <span className="t-meta text-[var(--ink-3)]">
                      Qadalgan — moderatorlar tavsiya qilgan mavzu
                    </span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Lock className="size-3.5 shrink-0 text-[var(--ink-4)]" />
                    <span className="t-meta text-[var(--ink-3)]">
                      Yopilgan — yangi izoh qabul qilinmaydi
                    </span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <BookOpenCheck className="size-3.5 shrink-0 text-[var(--ink-4)]" />
                    <span className="t-meta text-[var(--ink-3)]">
                      Matnlarda Markdown qo&apos;llab-quvvatlanadi
                    </span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <MessagesSquare className="size-3.5 shrink-0 text-[var(--ink-4)]" />
                    <span className="t-meta text-[var(--ink-3)]">
                      Javoblar daraxt ko&apos;rinishida joylanadi
                    </span>
                  </li>
                </ul>
              </Pane>
            </div>
          }
        >
          <DiscussionList emptyHint="Birinchi mavzuni siz oching — savol berish uyat emas." />
        </SplitLayout>
      </div>
    </>
  );
}
