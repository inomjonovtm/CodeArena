"use client";

import { ChevronDown, ChevronUp, Download, FlaskConical, Plus, Trash2, Upload, Wand2 } from "lucide-react";
import { useMemo, useRef, useState } from "react";

import { useConfirm, useToast } from "@/components/providers";
import { StButton, StField, StInput, StNotice, StTextarea } from "@/components/studio/problem/shared";
import { Verdict, WorkEmpty, WorkPanel } from "@/components/studio/workbench";
import type { TestCase } from "@/lib/types";
import { cn } from "@/lib/utils";

import type { ProblemDraft } from "./statement-tab";
import { downloadTestsZip, readTestsZip } from "./test-zip";

/**
 * «Testlar» tabi.
 *
 * Ikkita manba aralashadi: qo'lda yozilgan testlar va generator yasaganlari.
 * Ular vizual ajratiladi — generator yasagan testni qo'lda tuzatish ma'nosiz,
 * chunki keyingi generatsiya uni qayta yozadi.
 *
 * Kutilgan chiqishni QO'LDA yozish ham mumkin, lekin tavsiya etilmaydi:
 * «Javoblarni qayta hisoblash» tugmasi uni etalon yechimdan oladi — shunda
 * shart o'zgarganda barcha javoblar bir bosishda yangilanadi.
 */
export function TestsTab({
  value,
  onChange,
  onGenerate,
  onFillExpected,
  busy,
}: {
  value: ProblemDraft;
  onChange: (patch: ProblemDraft) => void;
  /** «Generator» tabiga o'tish. */
  onGenerate: () => void;
  /** Javoblarni etalon yechimdan qayta hisoblash. */
  onFillExpected: (onlyEmpty: boolean) => void;
  busy?: boolean;
}) {
  const [open, setOpen] = useState<number | null>(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const { confirm } = useConfirm();
  const toast = useToast();
  const [busyZip, setBusyZip] = useState(false);

  // `?? []` har renderda YANGI massiv yasaydi — uni to'g'ridan-to'g'ri
  // `useMemo` bog'lanishiga qo'ysak, memo hech qachon ishlamaydi.
  const tests = useMemo(() => value.test_cases ?? [], [value.test_cases]);

  const stats = useMemo(() => {
    const samples = tests.filter((test) => test.is_sample).length;
    const generated = tests.filter((test) => test.source === "generated").length;
    const empty = tests.filter((test) => !(test.expected_output ?? "").trim()).length;
    return { samples, generated, empty, hidden: tests.length - samples };
  }, [tests]);

  const setTests = (next: TestCase[]) =>
    onChange({ test_cases: next.map((test, index) => ({ ...test, order: index + 1 })) });

  const addTest = (isSample: boolean) => {
    setTests([
      ...tests,
      {
        order: tests.length + 1,
        input: "",
        expected_output: "",
        is_sample: isSample,
        explanation_uz: "",
        time_limit_ms: null,
        memory_limit_kb: null,
        source: "manual",
      },
    ]);
    setOpen(tests.length);
  };

  const patchTest = (index: number, patch: Partial<TestCase>) =>
    setTests(tests.map((test, i) => (i === index ? { ...test, ...patch } : test)));

  /* Test o'chirish — QAYTARIB BO'LMAYDI (saqlangandan keyin).
     Bo'sh testni so'ramasdan o'chiramiz: u yerda yo'qotadigan narsa yo'q.
     Ichida ma'lumot bo'lsa esa tasdiq so'raladi — ayniqsa generator
     yasagan uzun testlarni tasodifan bosib o'chirish oson edi. */
  const removeTest = async (index: number) => {
    const test = tests[index];
    const hasContent = Boolean((test?.input ?? "").trim() || (test?.expected_output ?? "").trim());

    if (hasContent) {
      const ok = await confirm({
        title: `${index + 1}-testni o'chiramizmi?`,
        message:
          "Test kirish va javob matni bilan birga o'chadi. Qaytarib bo'lmaydi — masalani saqlagandan keyin bu ma'lumot yo'qoladi.",
        confirmLabel: "O'chirish",
        danger: true,
      });
      if (!ok) return;
    }

    setTests(tests.filter((_, i) => i !== index));
    setOpen(null);
  };

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= tests.length) return;
    const next = [...tests];
    [next[index], next[target]] = [next[target], next[index]];
    setTests(next);
    setOpen(target);
  };

  /**
   * ZIP arxividan testlarni yuklaydi (`1in.txt` / `1out.txt` juftliklari).
   *
   * Arxivda testlar allaqachon bo'lsa, ALMASHTIRISH yoki QO'SHISH tanlanadi:
   * ikkalasi ham kerak bo'ladi — bir muallif testlarni butunlay yangilaydi,
   * ikkinchisi esa qo'lda yozganiga qo'shimcha yuklaydi. Tanlovsiz
   * almashtirish esa yozilgan ishni sassiz yo'q qilardi.
   */
  const importZip = async (file: File) => {
    setBusyZip(true);
    try {
      const parsed = await readTestsZip(file);

      if (!parsed.length) {
        toast.error(
          "Arxivda test topilmadi",
          "Fayllar 1in.txt / 1out.txt ko'rinishida nomlangan bo'lishi kerak.",
        );
        return;
      }

      let replace = true;
      if (tests.length) {
        replace = await confirm({
          title: `Arxivda ${parsed.length} ta test bor`,
          message: `Hozir masalada ${tests.length} ta test bor. «Almashtirish» — eskilari o'chib, arxivdagilar qoladi. «Bekor qilish» — arxivdagilar mavjudlariga QO'SHILADI.`,
          confirmLabel: "Almashtirish",
          cancelLabel: "Qo'shish",
          danger: true,
        });
      }

      const next = replace ? parsed : [...tests, ...parsed];
      setTests(next);
      setOpen(null);
      toast.success(
        replace ? `${parsed.length} ta test yuklandi` : `${parsed.length} ta test qo'shildi`,
        "Saqlashni unutmang.",
      );
    } catch (error) {
      toast.error(
        "Arxivni o'qib bo'lmadi",
        error instanceof Error ? error.message : "Fayl ZIP formatida ekanini tekshiring.",
      );
    } finally {
      setBusyZip(false);
    }
  };

  /** Testlarni ZIP qilib beradi — arxiv ichida `1in.txt`, `1out.txt`, ... */
  const exportTests = async () => {
    setBusyZip(true);
    try {
      await downloadTestsZip(tests, value.slug ?? "");
    } catch (error) {
      toast.error(
        "Arxiv yasab bo'lmadi",
        error instanceof Error ? error.message : String(error),
      );
    } finally {
      setBusyZip(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* OGOHLANTIRISHLAR — raqamlardan OLDIN turadi.
          Ilgari muammo faqat plitkadagi kichik "warn" belgisi bilan
          bildirilardi va muallif uni umuman sezmasdi: masala javobsiz
          testlar bilan chop etilib, foydalanuvchida noto'g'ri natija
          berardi. Endi har bir muammo o'z jumlasi bilan aytiladi. */}
      {tests.length === 0 ? (
        <StNotice tone="warn" title="Test yo'q">
          Masalani chop etish uchun kamida bitta NAMUNA va bir nechta
          yashirin test kerak. Pastdagi «Test» tugmasi bilan qo&apos;lda
          qo&apos;shing yoki «Generator» bilan ko&apos;p test yasang.
        </StNotice>
      ) : (
        <>
          {stats.samples === 0 ? (
            <StNotice tone="warn" title="Namuna test yo'q">
              Namuna testlar masala sahifasida foydalanuvchiga KO&apos;RINADI
              va u shart to&apos;g&apos;ri tushunilganini shu yerdan tekshiradi.
              Kamida bittasini «namuna» deb belgilang.
            </StNotice>
          ) : null}
          {stats.empty > 0 ? (
            <StNotice tone="danger" title={`${stats.empty} ta testda javob yo'q`}>
              Javobsiz test har qanday yechimni XATO deb baholaydi.
              «Javoblarni hisoblash» tugmasini bosing — javoblar etalon
              yechimdan olinadi.
            </StNotice>
          ) : null}
        </>
      )}

      {/* Yig'ma holat — masala testlari yetarlimi degan savolga javob */}
      <div className="grid gap-3 sm:grid-cols-4">
        <Tile label="Jami" value={tests.length} />
        <Tile label="Namuna" value={stats.samples} warn={stats.samples === 0} />
        <Tile label="Yashirin" value={stats.hidden} warn={stats.hidden < 5} />
        <Tile label="Javobsiz" value={stats.empty} warn={stats.empty > 0} />
      </div>

      <WorkPanel
        title="Testlar"
        hint={
          stats.generated
            ? `${stats.generated} tasi generator yasagan — ular qayta generatsiyada almashadi`
            : "Namuna testlar foydalanuvchiga ko'rinadi, qolganlari yashirin"
        }
        actions={
          <>
            <input
              ref={fileRef}
              type="file"
              accept=".zip,application/zip"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void importZip(file);
                event.target.value = "";
              }}
            />
            <StButton
              variant="ghost"
              onClick={() => fileRef.current?.click()}
              disabled={busyZip}
              title="Testlarni ZIP arxividan yuklash"
            >
              <Upload className="size-3.5" />
              Yuklash
            </StButton>
            <StButton
              variant="ghost"
              onClick={() => void exportTests()}
              disabled={!tests.length || busyZip}
              title="Testlarni ZIP qilib saqlash"
            >
              <Download className="size-3.5" />
              Yuklab olish
            </StButton>
            <StButton variant="quiet" onClick={onGenerate}>
              <Wand2 className="size-3.5" />
              Generator
            </StButton>
            <StButton variant="brand" onClick={() => addTest(tests.length === 0)}>
              <Plus className="size-3.5" />
              Test
            </StButton>
          </>
        }
        bodyClassName={tests.length ? "p-0" : "p-4"}
      >
        {tests.length ? (
          <ul className="divide-y divide-[var(--st-edge-soft)]">
            {tests.map((test, index) => {
              const expanded = open === index;
              const generated = test.source === "generated";
              return (
                <li key={test.id ?? `new-${index}`}>
                  <div className="flex items-center gap-3 px-4 py-2.5">
                    <button
                      type="button"
                      onClick={() => setOpen(expanded ? null : index)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <span className="st-num w-6 shrink-0 text-[14px] text-[var(--text-4)]">
                        {index + 1}
                      </span>
                      <span className="min-w-0 flex-1 truncate font-mono text-[14px] text-[var(--text-3)]">
                        {test.input.trim().split("\n")[0] || "(bo'sh kirish)"}
                      </span>
                      {test.is_sample ? <Verdict tone="warn">namuna</Verdict> : null}
                      {generated ? (
                        <Verdict tone="idle">
                          seed {test.seed ?? "—"}
                        </Verdict>
                      ) : null}
                      {!(test.expected_output ?? "").trim() ? (
                        <Verdict tone="fail">javobsiz</Verdict>
                      ) : null}
                    </button>

                    <div className="flex shrink-0 items-center gap-0.5">
                      <IconAction
                        label="Yuqoriga"
                        onClick={() => move(index, -1)}
                        disabled={index === 0}
                      >
                        <ChevronUp className="size-3.5" />
                      </IconAction>
                      <IconAction
                        label="Pastga"
                        onClick={() => move(index, 1)}
                        disabled={index === tests.length - 1}
                      >
                        <ChevronDown className="size-3.5" />
                      </IconAction>
                      <IconAction label="O'chirish" onClick={() => void removeTest(index)}>
                        <Trash2 className="size-3.5" />
                      </IconAction>
                    </div>
                  </div>

                  {expanded ? (
                    <div className="space-y-3 border-t border-[var(--st-edge-soft)] bg-[var(--st-sunken)] px-4 py-4">
                      {generated ? (
                        <p className="text-[13.5px] text-[var(--text-4)]">
                          Bu testni generator yasagan. Qo&apos;lda kiritilgan o&apos;zgarish
                          keyingi generatsiyada yo&apos;qoladi.
                        </p>
                      ) : null}

                      <div className="grid gap-3 lg:grid-cols-2">
                        <StField label="Kirish">
                          <StTextarea
                            rows={6}
                            className="font-mono text-[14px]"
                            value={test.input}
                            onChange={(event) => patchTest(index, { input: event.target.value })}
                          />
                        </StField>
                        <StField
                          label="Kutilgan chiqish"
                          hint="Etalon yechimdan avtomatik hisoblanishi mumkin"
                        >
                          <StTextarea
                            rows={6}
                            className="font-mono text-[14px]"
                            value={test.expected_output}
                            onChange={(event) =>
                              patchTest(index, { expected_output: event.target.value })
                            }
                          />
                        </StField>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-3">
                        <StField label="Vaqt limiti" hint="bo'sh — masala limiti">
                          <StInput
                            type="number"
                            value={test.time_limit_ms ?? ""}
                            onChange={(event) =>
                              patchTest(index, {
                                time_limit_ms: event.target.value
                                  ? Number(event.target.value)
                                  : null,
                              })
                            }
                          />
                        </StField>
                        <StField label="Xotira limiti" hint="bo'sh — masala limiti">
                          <StInput
                            type="number"
                            value={test.memory_limit_kb ?? ""}
                            onChange={(event) =>
                              patchTest(index, {
                                memory_limit_kb: event.target.value
                                  ? Number(event.target.value)
                                  : null,
                              })
                            }
                          />
                        </StField>
                        <StField label="Turi">
                          <label className="flex h-9 items-center gap-2 text-[15.5px] text-[var(--text-2)]">
                            <input
                              type="checkbox"
                              checked={test.is_sample}
                              onChange={(event) =>
                                patchTest(index, { is_sample: event.target.checked })
                              }
                              className="size-4 accent-[var(--green)]"
                            />
                            Namuna (foydalanuvchiga ko&apos;rinadi)
                          </label>
                        </StField>
                      </div>

                      {test.is_sample ? (
                        <StField label="Namuna izohi" hint="Masala sahifasida test ostida chiqadi">
                          <StTextarea
                            rows={2}
                            value={test.explanation_uz}
                            onChange={(event) =>
                              patchTest(index, { explanation_uz: event.target.value })
                            }
                          />
                        </StField>
                      ) : null}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <WorkEmpty
            icon={<FlaskConical className="size-6" />}
            title="Test yo'q"
            hint="Namuna testni qo'lda yozing, qolganini generator yasaydi. Testsiz masala chop etilmaydi."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <StButton variant="brand" onClick={() => addTest(true)}>
                  <Plus className="size-3.5" />
                  Namuna test
                </StButton>
                <StButton variant="quiet" onClick={onGenerate}>
                  <Wand2 className="size-3.5" />
                  Generator bilan yasash
                </StButton>
              </div>
            }
          />
        )}
      </WorkPanel>

      {/* Javoblarni etalondan hisoblash — mavzuning yuragi */}
      <WorkPanel
        title="Javoblarni etalon yechimdan hisoblash"
        hint="Kirishlar etalon yechimga beriladi va uning chiqishi kutilgan javob bo'lib yoziladi"
      >
        <div className="flex flex-wrap items-center gap-2">
          <StButton
            variant="brand"
            disabled={busy || !tests.length}
            onClick={() => onFillExpected(false)}
          >
            Barchasini qayta hisoblash
          </StButton>
          <StButton
            variant="quiet"
            disabled={busy || !stats.empty}
            onClick={() => onFillExpected(true)}
          >
            Faqat javobsizlarini ({stats.empty})
          </StButton>
          <p className="text-[14px] text-[var(--text-4)]">
            Avval «Yechimlar» tabida etalon yechim qo&apos;shilgan bo&apos;lishi kerak.
          </p>
        </div>
      </WorkPanel>
    </div>
  );
}

function Tile({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  return (
    <div className="st-panel px-4 py-3">
      <p className="st-label">{label}</p>
      <p
        className={cn(
          "st-num mt-1.5 text-[25px] font-bold leading-none",
          warn ? "text-[var(--green-text)]" : "text-[var(--text)]",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function IconAction({
  label,
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className="grid size-8 place-items-center rounded-lg text-[var(--text-4)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text)] disabled:pointer-events-none disabled:opacity-30"
      {...rest}
    >
      {children}
    </button>
  );
}
