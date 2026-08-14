"use client";

import { useQuery } from "@tanstack/react-query";
import { Eye, PenLine } from "lucide-react";
import { useState } from "react";

import {
  StButton,
  StField,
  StInput,
  StInputUnit,
  StNotice,
  StSelect,
  StTextarea,
  StToggle,
} from "@/components/studio/problem/shared";
import { WorkPanel } from "@/components/studio/workbench";
import { Markdown } from "@/components/ui/markdown";
import { api } from "@/lib/api";
import type { ProblemDetail, Tag } from "@/lib/types";
import { cn, slugify } from "@/lib/utils";

export type ProblemDraft = Partial<ProblemDetail> & { tag_ids?: string[] };

const DIFFICULTY_LABEL: Record<string, string> = {
  easy: "Oson",
  medium: "O'rta",
  hard: "Qiyin",
};

/**
 * «Masala» tabi — nomi, sozlamalari va sharti.
 *
 * TARTIB. Maydonlar Robocontest Judge muharriridagi kabi IXCHAM QATORLARDA
 * turadi va hammasi ko'rinib turadi — yig'ilgan bo'lim yo'q:
 *
 *     Ko'rinish        [faqat musobaqa] [premium]
 *     Vaqt · Xotira · Qiyinlik · Ball          (bitta qator, birliklari bilan)
 *     Toifasi (teglar)
 *     Masala nomi                              (+ manzil)
 *     Sharti                                   (katta maydon)
 *     Kirish va chiqish formati
 *     Yordam · Tahlil
 *
 * Sozlamalar YUQORIDA, matn PASTDA: sozlama bir marta qo'yiladi va
 * unutiladi, matn esa uzoq tahrirlanadi — shuning uchun uzun maydon
 * ekranning pastki, tinch qismida turadi va yozayotganda tepadagi
 * qatorlar xalaqit bermaydi.
 *
 * O'ngda JONLI KO'RINISH: muallif Markdown yozayotganda natijani darhol
 * ko'radi — «saqla → sahifani och → qayt» aylanasi yo'q.
 */
export function StatementTab({
  value,
  onChange,
}: {
  value: ProblemDraft;
  onChange: (patch: ProblemDraft) => void;
}) {
  const [mobileView, setMobileView] = useState<"edit" | "preview">("edit");

  const { data: tags } = useQuery({
    queryKey: ["tags"],
    queryFn: () => api.get<Tag[]>("/admin/tags/"),
    staleTime: 5 * 60_000,
  });

  const selectedTags = new Set(value.tag_ids ?? []);
  const isPublished = value.status === "published";

  const toggleTag = (id: string) => {
    const next = new Set(selectedTags);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange({ tag_ids: [...next] });
  };

  return (
    <div className="st-split">
      {/* --- muharrir */}
      <div
        className={cn(
          "space-y-4 bg-[var(--st-canvas)] p-4 sm:p-5",
          mobileView === "preview" && "hidden xl:block",
        )}
      >
        <div className="flex gap-2 xl:hidden">
          <StButton
            variant={mobileView === "edit" ? "brand" : "quiet"}
            onClick={() => setMobileView("edit")}
          >
            <PenLine className="size-3.5" />
            Tahrir
          </StButton>
          <StButton
            variant={mobileView === "preview" ? "brand" : "quiet"}
            onClick={() => setMobileView("preview")}
          >
            <Eye className="size-3.5" />
            Ko&apos;rinish
          </StButton>
        </div>

        {/* Chop etilgan masala TIRIK: uni o'zgartirish foydalanuvchilar
            ko'rayotgan sahifaga darhol ta'sir qiladi. */}
        {isPublished ? (
          <StNotice tone="warn" title="Bu masala chop etilgan">
            O&apos;zgarishlar saqlangan zahoti foydalanuvchilar ko&apos;radigan
            sahifada paydo bo&apos;ladi. Manzilni (slug) o&apos;zgartirmang — eski
            havolalar ishlamay qoladi.
          </StNotice>
        ) : null}

        {/* -------------------------------------------------- sozlamalar */}
        <WorkPanel title="Sozlamalar">
          <div className="space-y-4">
            {/* Ko'rinish — Robocontest'dagi «Maxfiylik» qatorining o'rni */}
            <div className="-mx-1">
              <StToggle
                checked={Boolean(value.is_contest_only)}
                onChange={(checked) => onChange({ is_contest_only: checked })}
                label="Faqat musobaqa uchun"
                hint="Ommaviy katalogda ko'rinmaydi. Olimpiadaga qo'shish uchun SHART."
              />
              <StToggle
                checked={Boolean(value.is_premium)}
                onChange={(checked) => onChange({ is_premium: checked })}
                label="Premium masala"
                hint="Faqat premium obunachilar yecha oladi."
              />
            </div>

            {value.is_contest_only ? (
              <StNotice tone="warn" title="Masala katalogda ko'rinmaydi">
                «Faqat musobaqa uchun» yoqilgan. Chop etilsa ham u ommaviy
                masalalar ro&apos;yxatiga chiqmaydi.
              </StNotice>
            ) : null}

            {/* Limitlar va baho — bitta qator, birliklari maydonga yopishgan */}
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StField label="Vaqt">
                <StInputUnit
                  unit="ms"
                  type="number"
                  min={100}
                  step={100}
                  value={value.time_limit_ms ?? 2000}
                  onChange={(event) => onChange({ time_limit_ms: Number(event.target.value) })}
                />
              </StField>
              <StField label="Xotira">
                <StInputUnit
                  unit="kb"
                  type="number"
                  min={16384}
                  step={1024}
                  value={value.memory_limit_kb ?? 262144}
                  onChange={(event) => onChange({ memory_limit_kb: Number(event.target.value) })}
                />
              </StField>
              <StField label="Qiyinlik">
                <StSelect
                  value={value.difficulty ?? "easy"}
                  onChange={(event) => {
                    const difficulty = event.target.value as ProblemDetail["difficulty"];
                    // Ball qiyinlikka ergashadi — ikkita maydonni qo'lda
                    // muvofiqlashtirib o'tirish shart emas.
                    const points = { easy: 10, medium: 30, hard: 50 }[difficulty] ?? 10;
                    onChange({ difficulty, points });
                  }}
                >
                  <option value="easy">Oson</option>
                  <option value="medium">O&apos;rta</option>
                  <option value="hard">Qiyin</option>
                </StSelect>
              </StField>
              <StField label="Ball">
                <StInputUnit
                  unit="ball"
                  type="number"
                  min={1}
                  value={value.points ?? 10}
                  onChange={(event) => onChange({ points: Number(event.target.value) })}
                />
              </StField>
            </div>

            {(value.time_limit_ms ?? 2000) < 500 ? (
              <StNotice tone="warn" title="Vaqt limiti juda kam">
                500 ms dan past limitda to&apos;g&apos;ri yozilgan Python yechimi ham
                ulgurmasligi mumkin. Oddiy masala uchun 1000–2000 ms tavsiya etiladi.
              </StNotice>
            ) : null}

            {/* Toifasi — teglar, tanlanganlari yashil chipga aylanadi */}
            <StField label="Toifasi" hint="Mavzu bo'yicha qidirish uchun">
              {tags?.length ? (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => {
                    const active = selectedTags.has(String(tag.id));
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => toggleTag(String(tag.id))}
                        data-active={active}
                        className="h-9 rounded-full border border-[var(--st-edge)] px-3.5 text-[15px] font-medium text-[var(--text-3)] transition-colors hover:text-[var(--text)] data-[active=true]:border-[var(--green)] data-[active=true]:bg-[var(--green)] data-[active=true]:text-[var(--text-on-green)]"
                      >
                        {tag.name_uz}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-[15px] text-[var(--text-4)]">Teglar hali yaratilmagan.</p>
              )}
            </StField>
          </div>
        </WorkPanel>

        {/* ------------------------------------------------------ matn */}
        <WorkPanel title="Masala matni" hint="Markdown qo'llanadi">
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
              <StField label="Masala nomi" required>
                <StInput
                  value={value.title_uz ?? ""}
                  onChange={(event) => {
                    const title = event.target.value;
                    // Manzil faqat YANGI masalada avtomatik to'ldiriladi: chop
                    // etilgan masalaning manzili o'zgarsa, eski havolalar
                    // buziladi va qidiruv natijalari yo'qoladi.
                    onChange(
                      value.id
                        ? { title_uz: title }
                        : { title_uz: title, slug: slugify(title) },
                    );
                  }}
                  placeholder="Masalan: Ikki sonning yig'indisi"
                />
              </StField>

              <StField
                label="Manzil"
                hint={
                  isPublished
                    ? "Chop etilgan — o'zgartirmang, havolalar buziladi."
                    : "Nomdan avtomatik yasaladi."
                }
              >
                <StInput
                  value={value.slug ?? ""}
                  onChange={(event) => onChange({ slug: event.target.value })}
                  className="font-mono"
                  placeholder="ikki-sonning-yigindisi"
                />
              </StField>
            </div>

            <StField label="Sharti" required>
              <StTextarea
                rows={14}
                value={value.description_uz ?? ""}
                onChange={(event) => onChange({ description_uz: event.target.value })}
                placeholder="Masalani tasvirlang. Kirish va chiqish formatini quyidagi alohida maydonda yozing."
              />
            </StField>

            <StField
              label="Kirish va chiqish formati"
              required
              hint="Masala sahifasida shartdan keyin alohida blok bo'lib ko'rinadi"
            >
              <StTextarea
                rows={6}
                value={value.constraints_uz ?? ""}
                onChange={(event) => onChange({ constraints_uz: event.target.value })}
                placeholder={
                  "**Kiruvchi ma'lumotlar:** birinchi qatorda n (1 ≤ n ≤ 10^5)\n\n**Chiquvchi ma'lumotlar:** yagona son"
                }
              />
            </StField>

            <div className="grid gap-3 xl:grid-cols-2">
              <StField label="Yordam (hint)" hint="Foydalanuvchi so'raganda ochiladi">
                <StTextarea
                  rows={4}
                  value={value.hint_uz ?? ""}
                  onChange={(event) => onChange({ hint_uz: event.target.value })}
                />
              </StField>
              <StField label="Tahlil (editorial)" hint="Masala yechilgandan keyin ochiladi">
                <StTextarea
                  rows={4}
                  value={value.editorial_uz ?? ""}
                  onChange={(event) => onChange({ editorial_uz: event.target.value })}
                />
              </StField>
            </div>
          </div>
        </WorkPanel>
      </div>

      {/* --- jonli ko'rinish */}
      <div
        className={cn(
          "bg-[var(--st-canvas)] p-4 sm:p-5",
          mobileView === "edit" && "hidden xl:block",
        )}
      >
        <div className="st-panel sticky top-[calc(var(--st-bar)+var(--st-tabs)+16px)] overflow-hidden">
          <div className="flex items-center gap-2 border-b border-[var(--st-edge-soft)] px-4 py-3">
            <Eye className="size-3.5 text-[var(--text-4)]" />
            <span className="st-label">Foydalanuvchi shunday ko&apos;radi</span>
          </div>
          <div className="max-h-[calc(100dvh-14rem)] overflow-y-auto p-5">
            <h1 className="text-[25px] leading-tight font-bold text-[var(--text)]">
              {value.title_uz || "Masala nomi"}
            </h1>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Meta>{DIFFICULTY_LABEL[value.difficulty ?? "easy"]}</Meta>
              <Meta>{value.points ?? 10} ball</Meta>
              <Meta>{value.time_limit_ms ?? 2000} ms</Meta>
              <Meta>{Math.round((value.memory_limit_kb ?? 262144) / 1024)} MB</Meta>
            </div>

            {value.description_uz ? (
              <Markdown source={value.description_uz} className="mt-5" />
            ) : (
              <p className="mt-5 text-[15.5px] text-[var(--text-4)]">
                Shart yozilmagan — chapdagi maydonni to&apos;ldiring.
              </p>
            )}

            {value.constraints_uz ? (
              <>
                <hr className="my-5 border-[var(--st-edge-soft)]" />
                <Markdown source={value.constraints_uz} />
              </>
            ) : null}

            {value.test_cases?.some((test) => test.is_sample) ? (
              <div className="mt-6">
                <p className="st-label mb-2">Namunaviy testlar</p>
                <div className="space-y-2">
                  {value.test_cases
                    .filter((test) => test.is_sample)
                    .slice(0, 3)
                    .map((test, index) => (
                      <div key={test.id ?? index} className="grid gap-2 sm:grid-cols-2">
                        <div>
                          <p className="mb-1 font-mono text-[12.5px] text-[var(--text-4)]">input</p>
                          <pre className="st-sunken st-code p-2.5">{test.input || "—"}</pre>
                        </div>
                        <div>
                          <p className="mb-1 font-mono text-[12.5px] text-[var(--text-4)]">output</p>
                          <pre className="st-sunken st-code p-2.5">
                            {test.expected_output || "—"}
                          </pre>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function Meta({ children }: { children: React.ReactNode }) {
  return (
    <span className="st-num rounded-full border border-[var(--st-edge)] px-2.5 py-0.5 text-[13.5px] text-[var(--text-3)]">
      {children}
    </span>
  );
}
