"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Code2, Plus, Star, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { useConfirm, useToast } from "@/components/providers";
import { StButton, StField, StInput, StSelect } from "@/components/studio/problem/shared";
import { Verdict, WorkEmpty, WorkPanel, verdictTone } from "@/components/studio/workbench";
import { CodeEditor } from "@/components/ui/code-editor";
import { studio } from "@/lib/studio-api";
import {
  LANGUAGE_LABEL,
  SOLUTION_KIND_HINT,
  SOLUTION_KIND_LABEL,
  type CodeLanguage,
  type ReferenceSolution,
  type SolutionKind,
} from "@/lib/studio-types";
import { formatRelative } from "@/lib/utils";

const KINDS: SolutionKind[] = ["model", "brute", "slow", "wrong"];

const STARTER: Record<CodeLanguage, string> = {
  python: "import sys\n\ndata = sys.stdin.read().split()\n# yechimni shu yerga yozing\n",
  cpp: "#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    // yechimni shu yerga yozing\n    return 0;\n}\n",
  javascript:
    'const data = require("fs").readFileSync(0, "utf8").split(/\\s+/);\n// yechimni shu yerga yozing\n',
};

/**
 * «Yechimlar» tabi — tekshiruv tizimining asosi.
 *
 * Etalon yechim shunchaki hujjat emas: test-case'larning kutilgan chiqishini
 * AYNAN SHU dastur hisoblaydi. Foydalanuvchi kod yuborganda ikkalasi bir xil
 * testlarni oladi va natijalar checker orqali solishtiriladi.
 *
 * Qolgan uch tur sifat nazorati uchun — ular «testlar yetarlicha kuchlimi»
 * degan savolga javob beradi.
 */
export function SolutionsTab({
  problemId,
  onValidate,
  validating,
}: {
  problemId: string | null;
  onValidate: () => void;
  validating?: boolean;
}) {
  const toast = useToast();
  const { confirm } = useConfirm();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<ReferenceSolution> | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["studio", "solutions", problemId],
    queryFn: () => studio.solutions.list(problemId as string),
    enabled: Boolean(problemId),
  });

  const solutions = data?.results ?? [];
  const current = solutions.find((solution) => solution.id === selected) ?? null;

  // Tanlangan yechim o'zgarganda tahrir nusxasi yangilanadi. Saqlanmagan
  // o'zgarish yo'qolmasligi uchun `draft` faqat ID almashganda almashadi.
  useEffect(() => {
    if (current) setDraft({ ...current });
    else if (!selected) setDraft(null);
  }, [current?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["studio", "solutions", problemId] });

  const save = useMutation({
    mutationFn: async (body: Partial<ReferenceSolution>) => {
      if (body.id) return studio.solutions.update(body.id, body);
      return studio.solutions.create({ ...body, problem: problemId as string });
    },
    onSuccess: async (saved) => {
      await invalidate();
      setSelected(saved.id);
      toast.success("Yechim saqlandi");
    },
    onError: (error: unknown) =>
      toast.error("Saqlab bo'lmadi", error instanceof Error ? error.message : String(error)),
  });

  const remove = useMutation({
    mutationFn: (id: string) => studio.solutions.remove(id),
    onSuccess: async () => {
      await invalidate();
      setSelected(null);
      setDraft(null);
      toast.success("Yechim o'chirildi");
    },
  });

  const startNew = (kind: SolutionKind) => {
    setSelected(null);
    setDraft({
      name: SOLUTION_KIND_LABEL[kind],
      kind,
      language: "python",
      code: STARTER.python,
      is_primary: kind === "model" && !solutions.some((s) => s.kind === "model"),
      note: "",
    });
  };

  if (!problemId) {
    return (
      <WorkPanel>
        <p className="text-[15px] text-[var(--text-4)]">
          Yechim qo&apos;shish uchun avval masalani saqlang.
        </p>
      </WorkPanel>
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
      {/* --- ro'yxat */}
      <div className="space-y-3">
        <WorkPanel
          title="Yechimlar"
          hint={`${solutions.length} ta`}
          actions={
            <StButton
              variant="brand"
              onClick={onValidate}
              disabled={validating || !solutions.length}
            >
              <Check className="size-3.5" />
              {validating ? "Tekshirilmoqda…" : "Tekshirish"}
            </StButton>
          }
          bodyClassName={solutions.length ? "p-0" : "p-4"}
        >
          {isLoading ? (
            <div className="space-y-2 p-4">
              {[0, 1].map((row) => (
                <div key={row} className="h-12 animate-pulse rounded bg-[var(--surface-hover)]" />
              ))}
            </div>
          ) : solutions.length ? (
            <ul className="divide-y divide-[var(--st-edge-soft)]">
              {solutions.map((solution) => (
                <li key={solution.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(solution.id)}
                    data-active={selected === solution.id}
                    className="flex w-full items-start gap-2.5 px-4 py-3 text-left transition-colors hover:bg-[var(--surface-hover)] data-[active=true]:bg-[var(--green-wash)]"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        {solution.is_primary ? (
                          <Star className="size-3 shrink-0 fill-[var(--green)] text-[var(--green)]" />
                        ) : null}
                        <span className="truncate text-[15.5px] font-medium text-[var(--text)]">
                          {solution.name}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-[13px] text-[var(--text-4)]">
                        {SOLUTION_KIND_LABEL[solution.kind]} ·{" "}
                        {LANGUAGE_LABEL[solution.language]}
                        {solution.last_checked_at
                          ? ` · ${formatRelative(solution.last_checked_at)}`
                          : ""}
                      </p>
                    </div>
                    <Verdict tone={verdictTone(solution.last_verdict)}>
                      {solution.last_verdict
                        ? solution.last_verdict === "ACCEPTED"
                          ? "o'tdi"
                          : solution.last_verdict.toLowerCase().replace(/_/g, " ")
                        : "sinalmagan"}
                    </Verdict>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <WorkEmpty
              icon={<Code2 className="size-5" />}
              title="Yechim yo'q"
              hint="Etalon yechimsiz test javoblarini hisoblab bo'lmaydi."
            />
          )}
        </WorkPanel>

        <WorkPanel title="Yangi yechim">
          <div className="space-y-1.5">
            {KINDS.map((kind) => (
              <button
                key={kind}
                type="button"
                onClick={() => startNew(kind)}
                className="w-full rounded-[9px] border border-[var(--st-edge)] px-3 py-2.5 text-left transition-colors hover:border-[var(--green-line)] hover:bg-[var(--surface-hover)]"
              >
                <span className="flex items-center gap-1.5 text-[15px] font-semibold text-[var(--text)]">
                  <Plus className="size-3" />
                  {SOLUTION_KIND_LABEL[kind]}
                </span>
                <span className="mt-0.5 block text-[13px] leading-snug text-[var(--text-4)]">
                  {SOLUTION_KIND_HINT[kind]}
                </span>
              </button>
            ))}
          </div>
        </WorkPanel>
      </div>

      {/* --- muharrir */}
      {draft ? (
        <WorkPanel
          title={draft.id ? "Yechimni tahrirlash" : "Yangi yechim"}
          hint={SOLUTION_KIND_HINT[(draft.kind ?? "model") as SolutionKind]}
          actions={
            <>
              {draft.id ? (
                <StButton
                  variant="ghost"
                  onClick={async () => {
                    const ok = await confirm({
                      title: "Yechim o'chirilsinmi?",
                      message: `«${draft.name}» butunlay o'chiriladi.`,
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
                variant="brand"
                onClick={() => save.mutate(draft)}
                disabled={save.isPending || !(draft.code ?? "").trim()}
              >
                {save.isPending ? "Saqlanmoqda…" : "Saqlash"}
              </StButton>
            </>
          }
          bodyClassName="p-0"
        >
          <div className="grid gap-3 border-b border-[var(--st-edge-soft)] p-4 sm:grid-cols-3">
            <StField label="Nomi">
              <StInput
                value={draft.name ?? ""}
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              />
            </StField>
            <StField label="Turi">
              <StSelect
                value={draft.kind ?? "model"}
                onChange={(event) =>
                  setDraft({ ...draft, kind: event.target.value as SolutionKind })
                }
              >
                {KINDS.map((kind) => (
                  <option key={kind} value={kind}>
                    {SOLUTION_KIND_LABEL[kind]}
                  </option>
                ))}
              </StSelect>
            </StField>
            <StField label="Til">
              <StSelect
                value={draft.language ?? "python"}
                onChange={(event) => {
                  const language = event.target.value as CodeLanguage;
                  setDraft({
                    ...draft,
                    language,
                    // Bo'sh yoki tegilmagan kodda tilga mos zagotovka qo'yamiz.
                    code:
                      !draft.code || Object.values(STARTER).includes(draft.code)
                        ? STARTER[language]
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
          </div>

          {draft.kind === "model" ? (
            <label className="flex items-center gap-2.5 border-b border-[var(--st-edge-soft)] px-4 py-3">
              <input
                type="checkbox"
                checked={Boolean(draft.is_primary)}
                onChange={(event) => setDraft({ ...draft, is_primary: event.target.checked })}
                className="size-4 accent-[var(--green)]"
              />
              <span className="text-[15px] text-[var(--text-2)]">
                Asosiy etalon — <strong>kutilgan javoblarni shu yechim hisoblaydi</strong>
              </span>
            </label>
          ) : null}

          {current?.last_message ? (
            <p className="border-b border-[var(--st-edge-soft)] bg-[var(--green-wash)] px-4 py-2.5 text-[14px] text-[var(--text-2)]">
              {current.last_message}
            </p>
          ) : null}

          <CodeEditor
            value={draft.code ?? ""}
            onChange={(code) => setDraft({ ...draft, code })}
            language={draft.language ?? "python"}
            height="30rem"
            forceTheme="dark"
            expandable
          />
        </WorkPanel>
      ) : (
        <WorkPanel>
          <WorkEmpty
            icon={<Code2 className="size-6" />}
            title="Yechim tanlanmagan"
            hint="Chapdagi ro'yxatdan yechimni tanlang yoki yangisini qo'shing."
          />
        </WorkPanel>
      )}
    </div>
  );
}
