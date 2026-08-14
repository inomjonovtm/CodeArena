"use client";

import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import { CheckCircle2, CircleDot, History, Play, ShieldAlert, Swords } from "lucide-react";
import { useState } from "react";

import { useToast } from "@/components/providers";
import { StButton, StCode, StField, StInput, StSelect, StToggle } from "@/components/studio/problem/shared";
import { Verdict, WorkEmpty, WorkPanel, verdictTone } from "@/components/studio/workbench";
import { Pagination } from "@/components/ui/pagination";
import { studio } from "@/lib/studio-api";
import type { AuthoringRun, ProblemHealth } from "@/lib/studio-types";
import { cn, formatRelative } from "@/lib/utils";

const RUN_LABEL: Record<string, string> = {
  generate: "Generatsiya",
  validate: "Tekshiruv",
  stress: "Stress-test",
  checker: "Checker sinovi",
};

/**
 * «Tekshiruv» tabi — masalani chop etishdan oldingi oxirgi bosqich.
 *
 * Uch qism:
 *   1. TAYYORLIK RO'YXATI — nima yetishmayotgani va nima qilish kerakligi;
 *   2. YECHIMLAR TEKSHIRUVI — etalon o'tadimi, ataylab noto'g'ri yiqiladimi;
 *   3. STRESS-TEST — etalonni sodda yechimga qarshi qo'yib, farq izlash.
 *
 * Uchinchisi eng qimmatli: u masaladagi xatoni foydalanuvchilar topishidan
 * OLDIN topadi. Sodda yechim sekin, lekin aniq to'g'ri deb qabul qilinadi;
 * agar etalon undan farq qilsa — kamchilik etalonda yoki shartda.
 */
export function VerifyTab({
  problemId,
  health,
  onRefresh,
}: {
  problemId: string | null;
  health?: ProblemHealth;
  onRefresh: () => void;
}) {
  const toast = useToast();
  const [validateRun, setValidateRun] = useState<AuthoringRun | null>(null);
  const [stressRun, setStressRun] = useState<AuthoringRun | null>(null);
  const [stress, setStress] = useState({
    generator: "",
    model: "",
    brute: "",
    iterations: 20,
    seed_start: 1000,
    save_counterexample: true,
  });

  const { data: solutions } = useQuery({
    queryKey: ["studio", "solutions", problemId],
    queryFn: () => studio.solutions.list(problemId as string),
    enabled: Boolean(problemId),
  });

  const { data: generators } = useQuery({
    queryKey: ["studio", "generators", problemId],
    queryFn: () => studio.generators.list(problemId as string),
    enabled: Boolean(problemId),
  });

  const [runsPage, setRunsPage] = useState(1);
  const { data: runs, refetch: refetchRuns } = useQuery({
    queryKey: ["studio", "runs", problemId, runsPage],
    queryFn: () => studio.runs(problemId as string, { page: runsPage }),
    enabled: Boolean(problemId),
    placeholderData: keepPreviousData,
  });

  const validate = useMutation({
    mutationFn: () => studio.tools.validate(problemId as string),
    onSuccess: async (run) => {
      setValidateRun(run);
      onRefresh();
      await refetchRuns();
      if (run.status === "ok") toast.success(run.summary);
      else toast.error("Kutilmagan natija", run.summary);
    },
    onError: (error: unknown) =>
      toast.error("Tekshiruv bajarilmadi", error instanceof Error ? error.message : String(error)),
  });

  const runStress = useMutation({
    mutationFn: () => studio.tools.stress(problemId as string, stress),
    onSuccess: async (run) => {
      setStressRun(run);
      onRefresh();
      await refetchRuns();
      if (run.status === "ok") toast.success(run.summary);
      else toast.error("Farq topildi", run.summary);
    },
    onError: (error: unknown) =>
      toast.error("Stress-test bajarilmadi", error instanceof Error ? error.message : String(error)),
  });

  const solutionList = solutions?.results ?? [];
  const generatorList = generators?.results ?? [];
  const models = solutionList.filter((s) => s.kind === "model");
  const brutes = solutionList.filter((s) => s.kind !== "model");

  const stressReady =
    Boolean(problemId) && stress.generator && stress.model && stress.brute;

  if (!problemId) {
    return (
      <WorkPanel>
        <p className="text-[15px] text-[var(--text-4)]">
          Tekshiruv uchun avval masalani saqlang.
        </p>
      </WorkPanel>
    );
  }

  return (
    <div className="space-y-4">
      {/* --- 1. tayyorlik ro'yxati */}
      <WorkPanel
        title="Chop etishga tayyorlik"
        hint={
          health
            ? health.ready
              ? "Barcha majburiy shartlar bajarilgan"
              : "Majburiy bandlar to'liq bo'lmaguncha masala chop etilmaydi"
            : undefined
        }
        actions={
          health ? (
            <Verdict tone={health.ready ? "pass" : "fail"}>{health.score}%</Verdict>
          ) : null
        }
      >
        {health ? (
          <ul className="space-y-1">
            {health.checks.map((check) => (
              <li
                key={check.key}
                className="flex items-start gap-3 rounded-[9px] px-3 py-2.5 transition-colors hover:bg-[var(--surface-hover)]"
              >
                {check.ok ? (
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[var(--text)]" />
                ) : (
                  <CircleDot className="mt-0.5 size-4 shrink-0 text-[var(--text-4)]" />
                )}
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "text-[15.5px]",
                      check.ok ? "text-[var(--text-3)]" : "font-medium text-[var(--text)]",
                    )}
                  >
                    {check.label}
                    {typeof check.value === "number" ? (
                      <span className="st-num ml-1.5 text-[var(--text-4)]">({check.value})</span>
                    ) : null}
                    {check.optional ? (
                      <span className="ml-1.5 text-[13px] text-[var(--text-4)]">ixtiyoriy</span>
                    ) : null}
                  </p>
                  {!check.ok ? (
                    <p className="mt-0.5 text-[13.5px] text-[var(--text-4)]">{check.hint}</p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="space-y-2">
            {[0, 1, 2].map((row) => (
              <div key={row} className="h-9 animate-pulse rounded bg-[var(--surface-hover)]" />
            ))}
          </div>
        )}
      </WorkPanel>

      {/* --- 2. yechimlar tekshiruvi */}
      <WorkPanel
        title="Yechimlarni tekshirish"
        hint="Har bir yechim barcha testlarda ishlatiladi va kutilgan natija bilan solishtiriladi"
        actions={
          <StButton
            variant="brand"
            onClick={() => validate.mutate()}
            disabled={validate.isPending || !solutionList.length}
          >
            <Play className="size-3.5" />
            {validate.isPending ? "Bajarilmoqda…" : "Ishga tushirish"}
          </StButton>
        }
        bodyClassName={validateRun?.detail.solutions?.length ? "p-0" : "p-4"}
      >
        {validateRun?.detail.solutions?.length ? (
          <div className="overflow-x-auto">
            <table className="st-table">
              <thead>
                <tr>
                  <th>Yechim</th>
                  <th>Natija</th>
                  <th>Testlar</th>
                  <th>Eng uzun</th>
                  <th>Xulosa</th>
                </tr>
              </thead>
              <tbody>
                {validateRun.detail.solutions.map((report) => (
                  <tr key={report.id}>
                    <td>
                      <p className="font-medium text-[var(--text)]">{report.name}</p>
                      <p className="text-[13px] text-[var(--text-4)]">{report.expectation}</p>
                    </td>
                    <td>
                      <Verdict tone={verdictTone(report.verdict)}>
                        {report.verdict === "ACCEPTED"
                          ? "o'tdi"
                          : report.verdict.toLowerCase().replace(/_/g, " ")}
                      </Verdict>
                    </td>
                    <td className="st-num text-[var(--text-2)]">
                      {report.passed}/{report.total}
                      {report.failed_test ? (
                        <span className="ml-1.5 text-[13px] text-[var(--text-4)]">
                          #{report.failed_test} da
                        </span>
                      ) : null}
                    </td>
                    <td className="st-num text-[var(--text-3)]">{report.max_runtime_ms} ms</td>
                    <td>
                      <Verdict tone={report.as_expected ? "pass" : "fail"}>
                        {report.as_expected ? "kutilgandek" : "kutilmagan"}
                      </Verdict>
                      {report.note ? (
                        <p className="mt-1 max-w-[280px] truncate text-[13px] text-[var(--text-4)]">
                          {report.note}
                        </p>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <WorkEmpty
            icon={<ShieldAlert className="size-5" />}
            title="Hali tekshirilmagan"
            hint="Etalon barcha testlardan o'tishi, ataylab noto'g'ri yechim esa yiqilishi kerak. Ikkinchisi testlar to'plami kuchli ekanini isbotlaydi."
          />
        )}
      </WorkPanel>

      {/* --- 3. stress-test */}
      <WorkPanel
        title="Stress-test"
        hint="Etalonni sodda yechimga qarshi qo'yib, farq qiladigan testni izlaydi"
      >
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <StField label="Generator">
              <StSelect
                value={stress.generator}
                onChange={(event) => setStress({ ...stress, generator: event.target.value })}
              >
                <option value="">Tanlang…</option>
                {generatorList.map((generator) => (
                  <option key={generator.id} value={generator.id}>
                    {generator.name}
                  </option>
                ))}
              </StSelect>
            </StField>
            <StField label="Etalon yechim">
              <StSelect
                value={stress.model}
                onChange={(event) => setStress({ ...stress, model: event.target.value })}
              >
                <option value="">Tanlang…</option>
                {models.map((solution) => (
                  <option key={solution.id} value={solution.id}>
                    {solution.name}
                  </option>
                ))}
              </StSelect>
            </StField>
            <StField label="Sodda yechim" hint="sekin, lekin ishonchli">
              <StSelect
                value={stress.brute}
                onChange={(event) => setStress({ ...stress, brute: event.target.value })}
              >
                <option value="">Tanlang…</option>
                {brutes.map((solution) => (
                  <option key={solution.id} value={solution.id}>
                    {solution.name}
                  </option>
                ))}
              </StSelect>
            </StField>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <StField label="Nechta urinish">
              <StInput
                type="number"
                min={1}
                max={100}
                value={stress.iterations}
                onChange={(event) =>
                  setStress({
                    ...stress,
                    iterations: Math.min(100, Math.max(1, Number(event.target.value))),
                  })
                }
              />
            </StField>
            <StField label="Boshlang'ich urug'">
              <StInput
                type="number"
                min={0}
                value={stress.seed_start}
                onChange={(event) =>
                  setStress({ ...stress, seed_start: Number(event.target.value) })
                }
              />
            </StField>
          </div>

          <div className="-mx-3">
            <StToggle
              checked={stress.save_counterexample}
              onChange={(checked) => setStress({ ...stress, save_counterexample: checked })}
              label="Topilgan qarshi misolni test sifatida saqlash"
              hint="Javob sifatida SODDA yechimning chiqishi yoziladi — u ishonchli deb qabul qilinadi."
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <StButton
              variant="brand"
              onClick={() => runStress.mutate()}
              disabled={!stressReady || runStress.isPending}
            >
              <Swords className="size-3.5" />
              {runStress.isPending ? "Izlanmoqda…" : "Stress-testni boshlash"}
            </StButton>
            {!brutes.length ? (
              <span className="text-[14px] text-[var(--text-4)]">
                Avval «Yechimlar» tabida sodda yechim qo&apos;shing.
              </span>
            ) : null}
          </div>

          {stressRun ? (
            <div className="st-sunken space-y-3 p-4">
              <div className="flex items-center gap-2">
                <Verdict tone={stressRun.status === "ok" ? "pass" : "fail"}>
                  {stressRun.status === "ok" ? "farq topilmadi" : "farq topildi"}
                </Verdict>
                <span className="text-[14px] text-[var(--text-3)]">{stressRun.summary}</span>
              </div>

              {stressRun.detail.counterexample ? (
                <div className="space-y-2">
                  <p className="st-label">Qarshi misol</p>
                  <div>
                    <p className="mb-1 font-mono text-[12.5px] text-[var(--text-4)]">kirish</p>
                    <StCode max="10rem">{stressRun.detail.counterexample.input}</StCode>
                  </div>
                  <div className="grid gap-2 lg:grid-cols-2">
                    <div>
                      <p className="mb-1 font-mono text-[12.5px] text-[var(--text-4)]">
                        etalon chiqishi
                      </p>
                      <StCode max="8rem">{stressRun.detail.counterexample.model_output}</StCode>
                    </div>
                    <div>
                      <p className="mb-1 font-mono text-[12.5px] text-[var(--text-4)]">
                        sodda yechim chiqishi
                      </p>
                      <StCode max="8rem">{stressRun.detail.counterexample.brute_output}</StCode>
                    </div>
                  </div>
                  {stressRun.detail.saved_as_test ? (
                    <p className="text-[13.5px] text-[var(--text-3)]">
                      Bu holat test sifatida saqlandi.
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </WorkPanel>

      {/* --- tarix */}
      <WorkPanel
        title="Amallar tarixi"
        hint={runs ? `${runs.count} ta` : undefined}
        bodyClassName="p-0"
      >
        {runs?.results.length ? (
          <ul className="divide-y divide-[var(--st-edge-soft)]">
            {runs.results.map((run) => (
              <li key={run.id} className="flex items-start gap-3 px-4 py-3">
                <Verdict tone={run.status === "ok" ? "pass" : "fail"}>
                  {RUN_LABEL[run.kind] ?? run.kind}
                </Verdict>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] text-[var(--text-2)]">{run.summary}</p>
                  <p className="mt-0.5 text-[13px] text-[var(--text-4)]">
                    {formatRelative(run.created_at)}
                    {run.created_by_username ? ` · @${run.created_by_username}` : ""}
                    {run.duration_ms ? ` · ${(run.duration_ms / 1000).toFixed(1)}s` : ""}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="p-4">
            <WorkEmpty
              icon={<History className="size-5" />}
              title="Tarix bo'sh"
              hint="Generatsiya va tekshiruv natijalari shu yerda saqlanadi."
            />
          </div>
        )}
        {runs && runs.count > 20 ? (
          <div className="flex justify-center border-t border-[var(--st-edge-soft)] p-2">
            <Pagination
              page={runsPage}
              totalPages={Math.ceil(runs.count / 20)}
              onChange={setRunsPage}
            />
          </div>
        ) : null}
      </WorkPanel>
    </div>
  );
}
