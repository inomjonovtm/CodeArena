"use client";

import { Copy, ExternalLink } from "lucide-react";

import { useToast } from "@/components/providers";
import { StButton, StField, StInput, StSelect, StTextarea } from "@/components/studio/problem/shared";
import { WorkPanel } from "@/components/studio/workbench";
import { LANGUAGE_LABEL, type CodeLanguage } from "@/lib/studio-types";
import type { ContestDetail } from "@/lib/types";

export type ContestDraft = Partial<ContestDetail>;

const LANGUAGES = Object.keys(LANGUAGE_LABEL) as CodeLanguage[];

/** `datetime-local` maydoni ISO qiymat bilan ishlashi uchun. */
function toLocalInput(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromLocalInput(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/**
 * «Olimpiada haqida» tabi — format va vaqt.
 *
 * Boshlanish vaqti, davomiylik va tugash vaqti bir-biriga bog'liq: ikkitasi
 * berilsa uchinchisi o'zi hisoblanadi. Uchalasini qo'lda kiritish eng ko'p
 * xatoga olib keladigan joy — musobaqa e'lon qilingandan keyin vaqt mos
 * kelmasligi aniqlansa, uni tuzatish allaqachon kech bo'ladi.
 */
export function ContestAboutTab({
  value,
  onChange,
  joinUrl,
}: {
  value: ContestDraft;
  onChange: (patch: ContestDraft) => void;
  joinUrl?: string;
}) {
  const toast = useToast();
  const allowed = value.allowed_languages ?? [];

  const toggleLanguage = (key: string) => {
    const next = allowed.includes(key)
      ? allowed.filter((item) => item !== key)
      : [...allowed, key];
    onChange({ allowed_languages: next });
  };

  /** Boshlanish yoki davomiylik o'zgarsa tugash vaqtini qayta hisoblaydi. */
  const syncEnd = (startIso: string | null, minutes: number) => {
    if (!startIso || !minutes) return {};
    const end = new Date(new Date(startIso).getTime() + minutes * 60_000);
    return { end_time: end.toISOString() };
  };

  return (
    <div className="space-y-4">
      {joinUrl ? (
        <div className="st-panel flex flex-wrap items-center gap-2 p-3">
          <span className="st-label">Qo&apos;shilish manzili</span>
          <code className="min-w-0 flex-1 truncate font-mono text-[14px] text-[var(--text-3)]">
            {joinUrl}
          </code>
          <StButton
            variant="quiet"
            onClick={async () => {
              await navigator.clipboard.writeText(joinUrl);
              toast.success("Manzil nusxalandi");
            }}
          >
            <Copy className="size-3.5" />
            Nusxalash
          </StButton>
          <StButton variant="ghost" onClick={() => window.open(joinUrl, "_blank")}>
            <ExternalLink className="size-3.5" />
            Ko&apos;rish
          </StButton>
        </div>
      ) : null}

      <WorkPanel title="Asosiy">
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <StField label="Olimpiada nomi" required>
              <StInput
                value={value.title_uz ?? ""}
                onChange={(event) => onChange({ title_uz: event.target.value })}
                placeholder="Masalan: Bahorgi olimpiada 2026"
              />
            </StField>
            <StField label="Manzil (slug)" hint="Bo'sh qoldirilsa nomdan yasaladi">
              <StInput
                value={value.slug ?? ""}
                onChange={(event) => onChange({ slug: event.target.value })}
                className="font-mono"
              />
            </StField>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <StField label="Turi">
              <StSelect
                value={value.visibility ?? "public"}
                onChange={(event) =>
                  onChange({ visibility: event.target.value as ContestDetail["visibility"] })
                }
              >
                <option value="public">Ochiq olimpiada</option>
                <option value="private">Yopiq (parol bilan)</option>
              </StSelect>
            </StField>

            <StField label="Qoidalar">
              <StSelect
                value={value.scoring ?? "icpc"}
                onChange={(event) =>
                  onChange({ scoring: event.target.value as ContestDetail["scoring"] })
                }
              >
                <option value="icpc">ICPC — yechilgan soni va jarima</option>
                <option value="ioi">IOI — qisman ball</option>
              </StSelect>
            </StField>

            <StField label="Ishtirok turi">
              <StSelect
                value={value.team_mode ?? "solo"}
                onChange={(event) =>
                  onChange({ team_mode: event.target.value as ContestDetail["team_mode"] })
                }
              >
                <option value="solo">Yakka</option>
                <option value="team">Jamoa</option>
              </StSelect>
            </StField>
          </div>

          {value.visibility === "private" ? (
            <div className="max-w-sm">
              <StField label="Kirish paroli" hint="Ishtirokchilarga alohida yuboriladi">
                <StInput
                  value={value.access_password ?? ""}
                  onChange={(event) => onChange({ access_password: event.target.value })}
                  className="font-mono"
                />
              </StField>
            </div>
          ) : null}

          <StField label="Ishtirok etish tartibi">
            <StSelect
              value={value.participation ?? "normal"}
              onChange={(event) =>
                onChange({
                  participation: event.target.value as ContestDetail["participation"],
                })
              }
            >
              <option value="normal">Hamma uchun bir vaqtda boshlanadi</option>
              <option value="window">Har kim o&apos;zi tanlagan vaqtda boshlaydi</option>
            </StSelect>
          </StField>
        </div>
      </WorkPanel>

      <WorkPanel title="Vaqt" hint="Tugash vaqti boshlanish va davomiylikdan avtomatik hisoblanadi">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StField label="Boshlanish" required>
            <StInput
              type="datetime-local"
              value={toLocalInput(value.start_time)}
              onChange={(event) => {
                const start = fromLocalInput(event.target.value);
                onChange({
                  start_time: start ?? undefined,
                  ...syncEnd(start, value.duration_minutes ?? 120),
                });
              }}
            />
          </StField>

          <StField label="Davomiyligi" hint="daqiqa">
            <StInput
              type="number"
              min={5}
              step={5}
              value={value.duration_minutes ?? 120}
              onChange={(event) => {
                const minutes = Number(event.target.value);
                onChange({
                  duration_minutes: minutes,
                  ...syncEnd(value.start_time ?? null, minutes),
                });
              }}
            />
          </StField>

          <StField label="Tugash">
            <StInput
              type="datetime-local"
              value={toLocalInput(value.end_time)}
              onChange={(event) =>
                onChange({ end_time: fromLocalInput(event.target.value) ?? undefined })
              }
            />
          </StField>

          <StField label="Ro'yxatdan o'tish tugashi" hint="bo'sh — cheklanmagan">
            <StInput
              type="datetime-local"
              value={toLocalInput(value.registration_ends_at)}
              onChange={(event) =>
                onChange({ registration_ends_at: fromLocalInput(event.target.value) })
              }
            />
          </StField>
        </div>
      </WorkPanel>

      <WorkPanel
        title="Ruxsat etilgan tillar"
        hint="Hech biri tanlanmasa — barcha tillar ruxsat etiladi"
        actions={
          <>
            <StButton variant="ghost" onClick={() => onChange({ allowed_languages: [] })}>
              Barchasi
            </StButton>
            <StButton
              variant="ghost"
              onClick={() => onChange({ allowed_languages: [...LANGUAGES] })}
            >
              Hammasini belgilash
            </StButton>
          </>
        }
      >
        <div className="flex flex-wrap gap-1.5">
          {LANGUAGES.map((key) => {
            const active = allowed.includes(key);
            return (
              <button
                key={key}
                type="button"
                onClick={() => toggleLanguage(key)}
                data-active={active}
                className="h-8 rounded-full border border-[var(--st-edge)] px-3.5 text-[15px] font-medium text-[var(--text-3)] transition-colors hover:text-[var(--text)] data-[active=true]:border-[var(--green-line)] data-[active=true]:bg-[var(--green-wash)] data-[active=true]:text-[var(--text)]"
              >
                {LANGUAGE_LABEL[key]}
              </button>
            );
          })}
        </div>
      </WorkPanel>

      <WorkPanel title="Matnlar" hint="Markdown qo'llanadi">
        <div className="space-y-4">
          <StField label="Olimpiada haqida" required>
            <StTextarea
              rows={8}
              value={value.description_uz ?? ""}
              onChange={(event) => onChange({ description_uz: event.target.value })}
              placeholder="Kim uchun, qanday mavzular, qanday qoidalar."
            />
          </StField>
          <StField label="Tahlil (editorial)" hint="Olimpiada tugagach ochiladi">
            <StTextarea
              rows={5}
              value={value.editorial_uz ?? ""}
              onChange={(event) => onChange({ editorial_uz: event.target.value })}
            />
          </StField>
        </div>
      </WorkPanel>
    </div>
  );
}
