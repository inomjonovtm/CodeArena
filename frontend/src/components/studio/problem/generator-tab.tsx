"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Play, Plus, Sparkles, Terminal, Trash2, Wand2 } from "lucide-react";
import { useEffect, useState } from "react";

import { useConfirm, useToast } from "@/components/providers";
import { StButton, StCode, StField, StInput, StSelect, StToggle } from "@/components/studio/problem/shared";
import { Verdict, WorkEmpty, WorkPanel } from "@/components/studio/workbench";
import { CodeEditor } from "@/components/ui/code-editor";
import { studio } from "@/lib/studio-api";
import {
  LANGUAGE_LABEL,
  type AuthoringRun,
  type CodeLanguage,
  type TestGenerator,
} from "@/lib/studio-types";
import { formatRelative } from "@/lib/utils";

/**
 * «Generator» tabi.
 *
 * Generator SHARTNOMASI ataylab sodda: `stdin` dan bitta butun son — urug'
 * (seed) keladi, `stdout` ga test kirishi chiqadi. Argument, fayl, kutubxona
 * yo'q — shu sababli u Python, C++ va JavaScript'da bir xil ishlaydi va
 * Judge0 ham, lokal runner ham uni bir xil bajaradi.
 *
 * Urug' takrorlanuvchan bo'lishi shart: bir xil urug' → bir xil kirish.
 * Aks holda testlarni qayta yasash masalaning javoblarini o'zgartirib
 * yuboradi va allaqachon yechgan foydalanuvchilar yiqiladi.
 */
export function GeneratorTab({
  problemId,
  onGenerated,
}: {
  problemId: string | null;
  onGenerated: () => void;
}) {
  const toast = useToast();
  const { confirm } = useConfirm();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<TestGenerator> | null>(null);
  const [replace, setReplace] = useState(true);
  const [lastRun, setLastRun] = useState<AuthoringRun | null>(null);

  const { data: templates } = useQuery({
    queryKey: ["studio", "templates"],
    queryFn: () => studio.templates(),
    staleTime: 30 * 60_000,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["studio", "generators", problemId],
    queryFn: () => studio.generators.list(problemId as string),
    enabled: Boolean(problemId),
  });

  const generators = data?.results ?? [];
  const current = generators.find((item) => item.id === selected) ?? null;

  useEffect(() => {
    if (current) setDraft({ ...current });
    else if (!selected) setDraft(null);
  }, [current?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["studio", "generators", problemId] });

  const save = useMutation({
    mutationFn: async (body: Partial<TestGenerator>) =>
      body.id
        ? studio.generators.update(body.id, body)
        : studio.generators.create({ ...body, problem: problemId as string }),
    onSuccess: async (saved) => {
      await invalidate();
      setSelected(saved.id);
      toast.success("Test yasovchi saqlandi");
    },
    onError: (error: unknown) =>
      toast.error("Saqlab bo'lmadi", error instanceof Error ? error.message : String(error)),
  });

  const remove = useMutation({
    mutationFn: (id: string) => studio.generators.remove(id),
    onSuccess: async () => {
      await invalidate();
      setSelected(null);
      setDraft(null);
    },
  });

  const generate = useMutation({
    mutationFn: (generator: TestGenerator) =>
      studio.tools.generateTests(problemId as string, {
        generator: generator.id,
        count: generator.count,
        seed_start: generator.seed_start,
        replace,
      }),
    onSuccess: async (run) => {
      setLastRun(run);
      await invalidate();
      onGenerated();
      toast.success(run.summary);
    },
    onError: (error: unknown) => {
      setLastRun(null);
      toast.error(
        "Test yasash bajarilmadi",
        error instanceof Error ? error.message : String(error),
      );
    },
  });

  const startNew = () => {
    setSelected(null);
    setDraft({
      name: "Test yasovchi",
      language: "python",
      code: templates?.generator.python ?? "",
      count: 10,
      seed_start: 1,
      make_sample: false,
      is_active: true,
      order: generators.length,
    });
  };

  if (!problemId) {
    return (
      <WorkPanel>
        <p className="text-[15px] text-[var(--text-4)]">
          Test yasovchi qo&apos;shish uchun avval masalani saqlang.
        </p>
      </WorkPanel>
    );
  }

  const maxGenerate = templates?.limits.max_generate ?? 200;

  return (
    <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
      <div className="space-y-3">
        <WorkPanel
          title="Test yasovchilar"
          hint={`${generators.length} ta`}
          actions={
            <StButton variant="brand" onClick={startNew}>
              <Plus className="size-3.5" />
              Yangi
            </StButton>
          }
          bodyClassName={generators.length ? "p-0" : "p-4"}
        >
          {isLoading ? (
            <div className="space-y-2 p-4">
              {[0, 1].map((row) => (
                <div key={row} className="h-12 animate-pulse rounded bg-[var(--surface-hover)]" />
              ))}
            </div>
          ) : generators.length ? (
            <ul className="divide-y divide-[var(--st-edge-soft)]">
              {generators.map((generator) => (
                <li key={generator.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(generator.id)}
                    data-active={selected === generator.id}
                    className="flex w-full items-start gap-2.5 px-4 py-3 text-left transition-colors hover:bg-[var(--surface-hover)] data-[active=true]:bg-[var(--green-wash)]"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15.5px] font-medium text-[var(--text)]">
                        {generator.name}
                      </p>
                      <p className="mt-0.5 truncate text-[13px] text-[var(--text-4)]">
                        {LANGUAGE_LABEL[generator.language]} · {generator.count} test
                        {generator.last_run_at
                          ? ` · ${formatRelative(generator.last_run_at)}`
                          : ""}
                      </p>
                    </div>
                    {generator.generated_count ? (
                      <Verdict tone="pass">{generator.generated_count}</Verdict>
                    ) : (
                      <Verdict tone="idle">yasalmagan</Verdict>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <WorkEmpty
              icon={<Terminal className="size-5" />}
              title="Test yasovchi yo'q"
              hint="Yuzlab testni qo'lda yozish o'rniga, ularni yasaydigan dastur yozing."
            />
          )}
        </WorkPanel>

        {/* Oxirgi generatsiya natijasi */}
        {lastRun ? (
          <WorkPanel title="Oxirgi yasash">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Verdict tone={lastRun.status === "ok" ? "pass" : "fail"}>
                  {lastRun.status === "ok" ? "bajarildi" : "xato"}
                </Verdict>
                <span className="text-[14px] text-[var(--text-3)]">{lastRun.summary}</span>
              </div>
              {lastRun.detail.preview?.length ? (
                <div className="space-y-2">
                  <p className="st-label">Namuna</p>
                  {lastRun.detail.preview.map((row) => (
                    <div key={row.seed} className="space-y-1">
                      <p className="font-mono text-[12.5px] text-[var(--text-4)]">seed {row.seed}</p>
                      <StCode max="6rem">{row.input}</StCode>
                      <StCode max="4rem">→ {row.output}</StCode>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </WorkPanel>
        ) : null}
      </div>

      {draft ? (
        <WorkPanel
          title={draft.id ? "Test yasovchini tahrirlash" : "Yangi test yasovchi"}
          hint="stdin dan urug' keladi · stdout ga test kirishi chiqadi"
          actions={
            <>
              {draft.id ? (
                <StButton
                  variant="ghost"
                  onClick={async () => {
                    const ok = await confirm({
                      title: "Test yasovchi o'chirilsinmi?",
                      message:
                        "U yasagan testlar o'chmaydi, lekin ularni qayta yasab bo'lmaydi.",
                      confirmLabel: "O'chirish",
                      danger: true,
                    });
                    if (ok && draft.id) remove.mutate(draft.id);
                  }}
                >
                  <Trash2 className="size-3.5" />
                </StButton>
              ) : null}
              <StButton
                variant="quiet"
                onClick={() => save.mutate(draft)}
                disabled={save.isPending || !(draft.code ?? "").trim()}
              >
                {save.isPending ? "Saqlanmoqda…" : "Saqlash"}
              </StButton>
              <StButton
                variant="brand"
                onClick={() => current && generate.mutate(current)}
                disabled={!current || generate.isPending}
              >
                <Play className="size-3.5" />
                {generate.isPending ? "Yasalmoqda…" : "Testlarni yasash"}
              </StButton>
            </>
          }
          bodyClassName="p-0"
        >
          <div className="grid gap-3 border-b border-[var(--st-edge-soft)] p-4 sm:grid-cols-4">
            <StField label="Nomi">
              <StInput
                value={draft.name ?? ""}
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              />
            </StField>
            <StField label="Til">
              <StSelect
                value={draft.language ?? "python"}
                onChange={(event) => {
                  const language = event.target.value as CodeLanguage;
                  const isTemplate = Object.values(templates?.generator ?? {}).includes(
                    draft.code ?? "",
                  );
                  setDraft({
                    ...draft,
                    language,
                    code:
                      !draft.code || isTemplate
                        ? (templates?.generator[language] ?? draft.code ?? "")
                        : draft.code,
                  });
                }}
              >
                {(Object.keys(LANGUAGE_LABEL) as CodeLanguage[]).map((key) => (
                  <option key={key} value={key}>
                    {LANGUAGE_LABEL[key]}
                  </option>
                ))}
              </StSelect>
            </StField>
            <StField label="Nechta test" hint={`ko'pi bilan ${maxGenerate}`}>
              <StInput
                type="number"
                min={1}
                max={maxGenerate}
                value={draft.count ?? 10}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    count: Math.min(maxGenerate, Math.max(1, Number(event.target.value))),
                  })
                }
              />
            </StField>
            <StField label="Boshlang'ich urug'" hint="takrorlanuvchanlik uchun">
              <StInput
                type="number"
                min={0}
                value={draft.seed_start ?? 1}
                onChange={(event) => setDraft({ ...draft, seed_start: Number(event.target.value) })}
              />
            </StField>
          </div>

          <div className="border-b border-[var(--st-edge-soft)] px-3 py-1.5">
            <StToggle
              checked={Boolean(draft.make_sample)}
              onChange={(checked) => setDraft({ ...draft, make_sample: checked })}
              label="Yasalgan testlar namuna bo'lsin"
              hint="Odatda yo'q: generator yasagan testlar yashirin bo'ladi."
            />
            <StToggle
              checked={replace}
              onChange={setReplace}
              label="Eski testlarni almashtirish"
              hint="Faqat SHU generator yasagan testlar o'chadi — qo'lda yozilganlarga tegilmaydi."
            />
          </div>

          <div className="flex items-center justify-between gap-2 border-b border-[var(--st-edge-soft)] px-4 py-2.5">
            <p className="text-[13.5px] text-[var(--text-4)]">
              Kutilgan javoblarni asosiy etalon yechim hisoblaydi.
            </p>
            <StButton
              variant="ghost"
              onClick={() =>
                setDraft({
                  ...draft,
                  code: templates?.generator[(draft.language ?? "python") as CodeLanguage] ?? "",
                })
              }
              disabled={!templates}
            >
              <Sparkles className="size-3.5" />
              Namuna kod
            </StButton>
          </div>

          <CodeEditor
            value={draft.code ?? ""}
            onChange={(code) => setDraft({ ...draft, code })}
            language={draft.language ?? "python"}
            height="28rem"
            forceTheme="dark"
            expandable
          />

          {!current && draft.id === undefined ? (
            <p className="border-t border-[var(--st-edge-soft)] px-4 py-3 text-[14px] text-[var(--text-4)]">
              Testlarni yasash uchun avval generatorni saqlang.
            </p>
          ) : null}
        </WorkPanel>
      ) : (
        <WorkPanel>
          <WorkEmpty
            icon={<Wand2 className="size-6" />}
            title="Test yasovchi tanlanmagan"
            hint="Chapdan generatorni tanlang yoki yangisini yarating. Generator kirishlarni yasaydi, javoblarni esa etalon yechim hisoblaydi."
            action={
              <StButton variant="brand" onClick={startNew}>
                <Plus className="size-3.5" />
                Yangi generator
              </StButton>
            }
          />
        </WorkPanel>
      )}
    </div>
  );
}
