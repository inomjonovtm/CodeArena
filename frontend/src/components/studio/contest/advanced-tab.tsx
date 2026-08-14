"use client";

import { StField, StInput, StToggle } from "@/components/studio/problem/shared";
import { WorkPanel } from "@/components/studio/workbench";

import type { ContestDraft } from "./about-tab";

/**
 * «Kengaytirilgan sozlamalar» tabi.
 *
 * Bu yerdagi bayroqlar musobaqa DAVOMIDA nima ko'rinishini belgilaydi.
 * Ular tugagandan keyin emas, boshlanishdan oldin to'g'ri qo'yilishi kerak:
 * musobaqa o'rtasida natijalar jadvalini yashirish ishtirokchilar uchun
 * qoidalarni o'yin davomida o'zgartirish bilan barobar.
 */
export function ContestAdvancedTab({
  value,
  onChange,
}: {
  value: ContestDraft;
  onChange: (patch: ContestDraft) => void;
}) {
  return (
    <div className="space-y-4">
      <WorkPanel
        title="Qatnashish sharti"
        hint="Reyting chegarasi — divizionlarga bo'lingan musobaqalar uchun"
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <StField label="Eng kam reyting" hint="bo'sh — cheklanmagan">
            <StInput
              type="number"
              value={value.min_rating ?? ""}
              onChange={(event) =>
                onChange({ min_rating: event.target.value ? Number(event.target.value) : null })
              }
              placeholder="—"
            />
          </StField>
          <StField label="Eng ko'p reyting" hint="bo'sh — cheklanmagan">
            <StInput
              type="number"
              value={value.max_rating ?? ""}
              onChange={(event) =>
                onChange({ max_rating: event.target.value ? Number(event.target.value) : null })
              }
              placeholder="—"
            />
          </StField>
          <StField label="Ishtirokchilar chegarasi" hint="bo'sh — cheklanmagan">
            <StInput
              type="number"
              min={1}
              value={value.max_participants ?? ""}
              onChange={(event) =>
                onChange({
                  max_participants: event.target.value ? Number(event.target.value) : null,
                })
              }
              placeholder="—"
            />
          </StField>
        </div>

        <div className="mt-4 max-w-lg">
          <StField label="Qoidalar sahifasi (URL)">
            <StInput
              type="url"
              value={value.rules_url ?? ""}
              onChange={(event) => onChange({ rules_url: event.target.value })}
              placeholder="https://..."
            />
          </StField>
        </div>
      </WorkPanel>

      <WorkPanel title="Musobaqa davomida ko'rinish">
        <div className="-mx-3 space-y-0.5">
          <StToggle
            checked={Boolean(value.hide_authors)}
            onChange={(checked) => onChange({ hide_authors: checked })}
            label="Masala mualliflarini yashirish"
            hint="Muallif ismi masala qiyinligi haqida ishora berishi mumkin."
          />
          <StToggle
            checked={Boolean(value.hide_results)}
            onChange={(checked) => onChange({ hide_results: checked })}
            label="Natijalar jadvalini yashirish"
            hint="«Muzlatilgan» jadval — oxirgi soatda kim yutayotgani ko'rinmaydi."
          />
          <StToggle
            checked={Boolean(value.hide_submissions)}
            onChange={(checked) => onChange({ hide_submissions: checked })}
            label="Urinishlar ro'yxatini yashirish"
          />
          <StToggle
            checked={value.public_scoreboard ?? true}
            onChange={(checked) => onChange({ public_scoreboard: checked })}
            label="Natijalar jadvali ochiq"
            hint="Ishtirok etmayotganlar ham jadvalni ko'ra oladi."
          />
        </div>
      </WorkPanel>

      <WorkPanel title="Ro'yxatdan o'tish va tugagandan keyin">
        <div className="-mx-3 space-y-0.5">
          <StToggle
            checked={value.open_registration ?? true}
            onChange={(checked) => onChange({ open_registration: checked })}
            label="Ochiq ro'yxatdan o'tish"
            hint="O'chirilsa, ishtirokchilarni faqat mas'ullar qo'shadi."
          />
          <StToggle
            checked={value.keep_problems_public ?? true}
            onChange={(checked) => onChange({ keep_problems_public: checked })}
            label="Tugagach masalalar ochiq qolsin"
            hint="Ishtirokchilar keyin ham yechib ko'rishi mumkin (upsolve)."
          />
          <StToggle
            checked={Boolean(value.is_virtual_allowed)}
            onChange={(checked) => onChange({ is_virtual_allowed: checked })}
            label="Virtual ishtirokka ruxsat"
            hint="Musobaqani keyinroq o'z vaqtida takrorlash imkoni."
          />
          <StToggle
            checked={Boolean(value.is_rated)}
            onChange={(checked) => onChange({ is_rated: checked })}
            label="Reytingli musobaqa"
            hint="Natijaga qarab ishtirokchilarning reytingi o'zgaradi."
          />
        </div>
      </WorkPanel>

      {value.is_rated ? (
        <WorkPanel
          title="Reyting koeffitsientlari"
          hint="K qanchalik katta bo'lsa, bitta musobaqa reytingni shuncha kuchli o'zgartiradi"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <StField label="Yangi ishtirokchilar uchun K">
              <StInput
                type="number"
                min={1}
                value={value.rating_k_new ?? 40}
                onChange={(event) => onChange({ rating_k_new: Number(event.target.value) })}
              />
            </StField>
            <StField label="Tajribalilar uchun K">
              <StInput
                type="number"
                min={1}
                value={value.rating_k_experienced ?? 20}
                onChange={(event) =>
                  onChange({ rating_k_experienced: Number(event.target.value) })
                }
              />
            </StField>
          </div>
        </WorkPanel>
      ) : null}
    </div>
  );
}
