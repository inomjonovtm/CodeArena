"use client";

import { useQuery } from "@tanstack/react-query";
import { FileCode2, Info, Play, ShieldCheck, Sparkles } from "lucide-react";
import { useState } from "react";

import {
  StButton,
  StCode,
  StField,
  StInput,
  StNotice,
  StSelect,
  StTextarea,
} from "@/components/studio/problem/shared";
import { Verdict, WorkPanel } from "@/components/studio/workbench";
import { CodeEditor } from "@/components/ui/code-editor";
import { studio } from "@/lib/studio-api";
import {
  CHECKER_OPTIONS,
  LANGUAGE_LABEL,
  type AuthoringRun,
  type CheckerType,
  type CodeLanguage,
} from "@/lib/studio-types";
import { cn } from "@/lib/utils";

import type { ProblemDraft } from "./statement-tab";

/**
 * «Checker» tabi — javob QANDAY tekshirilishini belgilaydi.
 *
 * Bu masaladagi eng ko'p e'tibordan chetda qoladigan va eng ko'p shikoyat
 * keltiradigan qism. «Istalgan juftlikni chiqaring» turidagi masala aynan
 * mos solishtirish bilan tekshirilsa, to'g'ri yechimlarning ko'pchiligi
 * «Wrong Answer» oladi va muallif buni faqat foydalanuvchilar yozgandan
 * keyin bilib qoladi.
 *
 * Shuning uchun bu yerda usul tanlashning O'ZIGINA yetarli emas: pastda
 * sinov maydoni bor — muallif «bu javob qabul qilinadimi?» degan savolni
 * masalani chop etmasdan tekshira oladi.
 */
export function CheckerTab({
  problemId,
  value,
  onChange,
}: {
  problemId: string | null;
  value: ProblemDraft;
  onChange: (patch: ProblemDraft) => void;
}) {
  const [trial, setTrial] = useState({ input: "", user_output: "", jury_output: "" });
  const [result, setResult] = useState<AuthoringRun | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: templates } = useQuery({
    queryKey: ["studio", "templates"],
    queryFn: () => studio.templates(),
    staleTime: 30 * 60_000,
  });

  const checkerType = (value.checker_type ?? "exact") as CheckerType;
  const checkerLanguage = (value.checker_language ?? "python") as CodeLanguage;
  const validatorLanguage = (value.validator_language ?? "python") as CodeLanguage;

  const runTrial = async () => {
    if (!problemId) return;
    setRunning(true);
    setError(null);
    try {
      // Ekrandagi (hali saqlanmagan) checker sozlamalari ham yuboriladi —
      // aks holda sinov bazadagi ESKI kodni tekshirib, muallifni chalg'itardi.
      setResult(
        await studio.tools.checkerTest(problemId, {
          ...trial,
          checker_type: checkerType,
          checker_language: checkerLanguage,
          checker_code: value.checker_code ?? "",
          float_epsilon: value.float_epsilon,
        }),
      );
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : String(exception));
      setResult(null);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Bu tab ko'pchilik masalaga umuman kerak emas — buni BIRINCHI
          qatorda aytish kerak. Aks holda muallif «yana bir to'ldiriladigan
          bo'lim» deb o'ylab, keraksiz kod yozishga urinadi. */}
      <StNotice title="Bu bo'limni to'ldirish shart emas">
        Ko&apos;pchilik masalada javob bitta bo&apos;ladi va aynan mos
        solishtirish yetarli. Checker faqat javob BIR NECHTA bo&apos;lishi
        mumkin bo&apos;lgan masalalarda kerak: masalan «istalgan to&apos;g&apos;ri
        juftlikni chiqaring» yoki kasrli javob.
      </StNotice>

      {/* --- usul tanlash */}
      <WorkPanel
        title="Tekshirish usuli"
        hint="Foydalanuvchi chiqishi etalon javob bilan qanday solishtiriladi"
      >
        <div className="grid gap-2 lg:grid-cols-2">
          {CHECKER_OPTIONS.map((option) => {
            const active = checkerType === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onChange({ checker_type: option.value })}
                data-active={active}
                className={cn(
                  "rounded-[10px] border border-[var(--st-edge)] p-3.5 text-left transition-colors",
                  "hover:border-[var(--green-line)]",
                  "data-[active=true]:border-[var(--green)] data-[active=true]:bg-[var(--green-wash)]",
                )}
              >
                <div className="flex items-center gap-2">
                  <span
                    data-active={active}
                    className="grid size-4 shrink-0 place-items-center rounded-full border border-[var(--text-4)] data-[active=true]:border-[var(--green)]"
                  >
                    {active ? <span className="size-2 rounded-full bg-[var(--green)]" /> : null}
                  </span>
                  <span className="text-[15.5px] font-semibold text-[var(--text)]">
                    {option.label}
                  </span>
                </div>
                <p className="mt-1.5 pl-6 text-[14px] leading-relaxed text-[var(--text-4)]">
                  {option.hint}
                </p>
              </button>
            );
          })}
        </div>

        {checkerType === "float" ? (
          <div className="mt-4 max-w-xs">
            <StField
              label="Ruxsat etilgan xatolik"
              hint="Absolyut yoki nisbiy — qaysi biri o'tsa yetarli"
            >
              <StInput
                type="number"
                step="0.000001"
                min="0"
                value={value.float_epsilon ?? 0.000001}
                onChange={(event) => onChange({ float_epsilon: Number(event.target.value) })}
                className="font-mono"
              />
            </StField>
          </div>
        ) : null}
      </WorkPanel>

      {/* --- maxsus checker kodi */}
      {checkerType === "custom" ? (
        <WorkPanel
          title="Tekshirgich kodi"
          hint="Dastur qaror qabul qiladi: OK — javob to'g'ri, boshqa har qanday so'z — rad etildi"
          actions={
            <>
              <StSelect
                value={checkerLanguage}
                onChange={(event) =>
                  onChange({ checker_language: event.target.value as CodeLanguage })
                }
                className="w-36"
              >
                {(Object.keys(LANGUAGE_LABEL) as CodeLanguage[]).map((key) => (
                  <option key={key} value={key}>
                    {LANGUAGE_LABEL[key]}
                  </option>
                ))}
              </StSelect>
              <StButton
                variant="quiet"
                onClick={() =>
                  onChange({ checker_code: templates?.checker[checkerLanguage] ?? "" })
                }
                disabled={!templates}
              >
                <Sparkles className="size-3.5" />
                Namuna
              </StButton>
            </>
          }
          bodyClassName="p-0"
        >
          <div className="border-b border-[var(--st-edge-soft)] bg-[var(--green-wash)] px-4 py-3">
            <div className="flex gap-2.5">
              <Info className="mt-0.5 size-3.5 shrink-0 text-[var(--green-text)]" />
              <div className="min-w-0 text-[14px] leading-relaxed text-[var(--text-2)]">
                <p>
                  Checker <strong>stdin</strong> dan uch bo&apos;limni shu tartibda oladi:
                  masalaning <strong>kirishi</strong>, <strong>ishtirokchi javobi</strong>,
                  <strong> etalon javob</strong>. Har bir bo&apos;lim avval qatorlar sonini,
                  keyin qatorlarni beradi.
                </p>
                <p className="mt-1.5">
                  Chiqishning birinchi so&apos;zi <code className="font-mono">OK</code> bo&apos;lsa
                  javob qabul qilinadi. Qolgan matn foydalanuvchiga izoh bo&apos;lib
                  ko&apos;rsatiladi — <code className="font-mono">WA 3-sonda xatolik</code> kabi.
                </p>
              </div>
            </div>
          </div>
          <CodeEditor
            value={value.checker_code ?? ""}
            onChange={(code) => onChange({ checker_code: code })}
            language={checkerLanguage}
            height="24rem"
            forceTheme="dark"
            expandable
          />
        </WorkPanel>
      ) : null}

      {/* --- sinov maydoni */}
      <WorkPanel
        title="Sinab ko'rish"
        hint="Bitta holatni qo'lda kiritib, checker qanday qaror qilishini tekshiring"
      >
        {!problemId ? (
          <p className="text-[15px] text-[var(--text-4)]">
            Sinov uchun avval masalani saqlang.
          </p>
        ) : (
          <div className="space-y-3">
            <div className="grid gap-3 lg:grid-cols-3">
              <StField label="Test kirishi">
                <StTextarea
                  rows={5}
                  className="font-mono text-[14px]"
                  value={trial.input}
                  onChange={(event) => setTrial({ ...trial, input: event.target.value })}
                  placeholder="10"
                />
              </StField>
              <StField label="Ishtirokchi javobi" hint="tekshiriladigan javob">
                <StTextarea
                  rows={5}
                  className="font-mono text-[14px]"
                  value={trial.user_output}
                  onChange={(event) => setTrial({ ...trial, user_output: event.target.value })}
                  placeholder="4 6"
                />
              </StField>
              <StField label="Etalon javob" hint="etalon yechim chiqargani">
                <StTextarea
                  rows={5}
                  className="font-mono text-[14px]"
                  value={trial.jury_output}
                  onChange={(event) => setTrial({ ...trial, jury_output: event.target.value })}
                  placeholder="1 9"
                />
              </StField>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <StButton variant="brand" onClick={runTrial} disabled={running}>
                <Play className="size-3.5" />
                {running ? "Tekshirilmoqda…" : "Tekshirish"}
              </StButton>

              {error ? (
                <span className="text-[14px] text-[var(--text-2)]">{error}</span>
              ) : result ? (
                <>
                  <Verdict tone={result.detail.accepted ? "pass" : result.detail.system_error ? "warn" : "fail"}>
                    {result.detail.accepted ? "qabul qilindi" : "rad etildi"}
                  </Verdict>
                  {result.detail.message ? (
                    <span className="min-w-0 text-[14px] text-[var(--text-3)]">
                      {result.detail.message}
                    </span>
                  ) : null}
                </>
              ) : null}
            </div>

            {result?.detail.system_error ? (
              <StCode wrap max="10rem">
                {result.detail.message || "Tekshirgich ishga tushmadi."}
              </StCode>
            ) : null}
          </div>
        )}
      </WorkPanel>

      {/* --- validator */}
      <WorkPanel
        title="Kirish validatori"
        hint="Test KIRISHINI tekshiradi — generator chegaradan chiqib ketgan test yasasa, buni chop etishdan oldin topadi"
        actions={
          <>
            <StSelect
              value={validatorLanguage}
              onChange={(event) =>
                onChange({ validator_language: event.target.value as CodeLanguage })
              }
              className="w-36"
            >
              {(Object.keys(LANGUAGE_LABEL) as CodeLanguage[]).map((key) => (
                <option key={key} value={key}>
                  {LANGUAGE_LABEL[key]}
                </option>
              ))}
            </StSelect>
            <StButton
              variant="ghost"
              onClick={() => onChange({ validator_code: "" })}
              disabled={!(value.validator_code ?? "").trim()}
            >
              Tozalash
            </StButton>
          </>
        }
        bodyClassName="p-0"
      >
        <div className="border-b border-[var(--st-edge-soft)] px-4 py-3">
          <div className="flex gap-2.5">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-[var(--text-4)]" />
            <p className="min-w-0 text-[14px] leading-relaxed text-[var(--text-4)]">
              Ixtiyoriy. Validator kirishni <strong>stdin</strong> dan oladi. Hammasi
              joyida bo&apos;lsa hech narsa chiqarmasdan tugaydi; xato bo&apos;lsa sababni
              chiqaradi va nol bo&apos;lmagan kod bilan yiqiladi
              (<code className="font-mono">raise</code>,{" "}
              <code className="font-mono">assert</code>,{" "}
              <code className="font-mono">return 1</code>).
            </p>
          </div>
        </div>
        <CodeEditor
          value={value.validator_code ?? ""}
          onChange={(code) => onChange({ validator_code: code })}
          language={validatorLanguage}
          height="18rem"
          forceTheme="dark"
          expandable
        />
      </WorkPanel>

      {checkerType !== "custom" ? (
        <div className="st-panel flex gap-3 p-4">
          <FileCode2 className="mt-0.5 size-4 shrink-0 text-[var(--text-4)]" />
          <p className="min-w-0 text-[14px] leading-relaxed text-[var(--text-4)]">
            Masalangizda bir nechta to&apos;g&apos;ri javob bo&apos;lishi mumkinmi? («istalgan
            juftlikni chiqaring», «istalgan eng qisqa yo&apos;l», «istalgan tartibda»)
            Unda <strong>Maxsus checker</strong> ni tanlang — aks holda to&apos;g&apos;ri
            yechimlar ham rad etiladi.
          </p>
        </div>
      ) : null}
    </div>
  );
}
