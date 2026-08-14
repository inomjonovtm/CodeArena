"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Download, Info, Play, Sparkles, Terminal } from "lucide-react";
import { useState } from "react";

import { useToast } from "@/components/providers";
import { StButton, StField, StInput, StSelect } from "@/components/studio/problem/shared";
import { Verdict, WorkBody, WorkEmpty, WorkHeader, WorkPanel } from "@/components/studio/workbench";
import { CodeEditor } from "@/components/ui/code-editor";
import { api } from "@/lib/api";
import { studio } from "@/lib/studio-api";
import { LANGUAGE_LABEL, type CodeLanguage } from "@/lib/studio-types";

interface RunCase {
  seed: number;
  input: string;
  output: string;
  status: string;
}

/**
 * Mustaqil Testcase Generator.
 *
 * Masalaga bog'lanmagan qumloq (sandbox): generator va yechim kodini shu
 * yerda yozib, natijani darhol ko'rish mumkin. Masala tuzishdan OLDIN
 * generator to'g'ri ishlashiga ishonch hosil qilish uchun.
 *
 * Masala ichidagi generatordan farqi: bu yerda hech narsa saqlanmaydi.
 * Tayyor bo'lgach kodni masala «Generator» tabiga ko'chirasiz.
 */
export default function StudioGeneratorPage() {
  const toast = useToast();
  const [language, setLanguage] = useState<CodeLanguage>("python");
  const [generatorCode, setGeneratorCode] = useState("");
  const [solutionCode, setSolutionCode] = useState("");
  const [count, setCount] = useState(5);
  const [seedStart, setSeedStart] = useState(1);
  const [rows, setRows] = useState<RunCase[]>([]);

  const { data: templates } = useQuery({
    queryKey: ["studio", "templates"],
    queryFn: () => studio.templates(),
    staleTime: 30 * 60_000,
  });

  const { data: judge } = useQuery({
    queryKey: ["judge", "status"],
    queryFn: () => api.get<{ available: boolean; backend: string }>("/judge/status/"),
  });

  /**
   * Generator va yechimni ketma-ket bajaradi.
   *
   * Bu yerda `/run` public endpointi ishlatilmaydi — u masala talab qiladi.
   * O'rniga har bir bosqich alohida `POST` bilan yuboriladi va natija
   * to'g'ridan-to'g'ri ekranda ko'rsatiladi.
   */
  const run = useMutation({
    mutationFn: async () => {
      const seeds = Array.from({ length: count }, (_, index) => seedStart + index);
      const produced: RunCase[] = [];

      for (const seed of seeds) {
        const generated = await api.post<{
          results: { status: string; stdout: string; stderr: string; compile_output: string }[];
        }>("/studio/sandbox/", {
          language,
          code: generatorCode,
          stdin: `${seed}\n`,
        });
        const genRow = generated.results[0];
        if (!genRow || genRow.status !== "EXECUTED") {
          throw new Error(
            `Generator ${seed} urug'ida ishlamadi: ${
              genRow?.compile_output || genRow?.stderr || genRow?.status || "noma'lum xato"
            }`,
          );
        }

        const input = genRow.stdout;
        let output = "";
        let status = "EXECUTED";

        if (solutionCode.trim()) {
          const solved = await api.post<{
            results: { status: string; stdout: string; stderr: string; compile_output: string }[];
          }>("/studio/sandbox/", { language, code: solutionCode, stdin: input });
          const solRow = solved.results[0];
          output = solRow?.stdout ?? "";
          status = solRow?.status ?? "SYSTEM_ERROR";
          if (status !== "EXECUTED") {
            output = solRow?.compile_output || solRow?.stderr || "";
          }
        }

        produced.push({ seed, input, output, status });
      }
      return produced;
    },
    onSuccess: (produced) => {
      setRows(produced);
      toast.success(`${produced.length} ta test yasaldi`);
    },
    onError: (error: unknown) => {
      setRows([]);
      toast.error("Bajarilmadi", error instanceof Error ? error.message : String(error));
    },
  });

  const download = () => {
    // Masala «Testlar» tabidagi import formati bilan bir xil: `===` kirish va
    // javobni, `---` testlarni ajratadi.
    const text = rows
      .map((row) => `${row.input.trimEnd()}\n===\n${row.output.trimEnd()}`)
      .join("\n---\n");
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "testlar.txt";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <WorkHeader
        breadcrumbs={[{ href: "/studio", label: "Studio" }]}
        title="Testcase Generator"
        meta={
          judge ? (
            <Verdict tone={judge.available ? "pass" : "fail"}>
              {judge.available ? judge.backend : "judge ishlamayapti"}
            </Verdict>
          ) : null
        }
        actions={
          <>
            <StButton variant="quiet" onClick={download} disabled={!rows.length}>
              <Download className="size-3.5" />
              Yuklab olish
            </StButton>
            <StButton
              variant="brand"
              onClick={() => run.mutate()}
              disabled={run.isPending || !generatorCode.trim()}
            >
              <Play className="size-3.5" />
              {run.isPending ? "Bajarilmoqda…" : "Ishga tushirish"}
            </StButton>
          </>
        }
      />

      <WorkBody wide className="space-y-4">
        <div className="st-panel flex gap-2.5 p-4">
          <Info className="mt-0.5 size-4 shrink-0 text-[var(--text-4)]" />
          <p className="min-w-0 text-[14px] leading-relaxed text-[var(--text-4)]">
            Bu qumloq — hech narsa saqlanmaydi. Generator <strong>stdin</strong> dan
            urug&apos; (seed) o&apos;qiydi va <strong>stdout</strong> ga test kirishini chiqaradi.
            Yechim kodi berilsa, u har bir kirishda ishlatiladi va chiqishi kutilgan
            javob bo&apos;ladi. Tayyor bo&apos;lgach kodni masalaning «Generator» va «Yechimlar»
            tablariga ko&apos;chiring.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-4">
          <StField label="Til">
            <StSelect
              value={language}
              onChange={(event) => setLanguage(event.target.value as CodeLanguage)}
            >
              {(Object.keys(LANGUAGE_LABEL) as CodeLanguage[]).map((key) => (
                <option key={key} value={key}>
                  {LANGUAGE_LABEL[key]}
                </option>
              ))}
            </StSelect>
          </StField>
          <StField label="Nechta test" hint="ko'pi bilan 30">
            <StInput
              type="number"
              min={1}
              max={30}
              value={count}
              onChange={(event) =>
                setCount(Math.min(30, Math.max(1, Number(event.target.value))))
              }
            />
          </StField>
          <StField label="Boshlang'ich urug'">
            <StInput
              type="number"
              min={0}
              value={seedStart}
              onChange={(event) => setSeedStart(Number(event.target.value))}
            />
          </StField>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <WorkPanel
            title="Generator"
            hint="stdin: urug' → stdout: test kirishi"
            actions={
              <StButton
                variant="ghost"
                onClick={() => setGeneratorCode(templates?.generator[language] ?? "")}
                disabled={!templates}
              >
                <Sparkles className="size-3.5" />
                Namuna
              </StButton>
            }
            bodyClassName="p-0"
          >
            <CodeEditor
              value={generatorCode}
              onChange={setGeneratorCode}
              language={language}
              height="24rem"
              forceTheme="dark"
              expandable
            />
          </WorkPanel>

          <WorkPanel
            title="Yechim"
            hint="ixtiyoriy — kutilgan javobni hisoblaydi"
            bodyClassName="p-0"
          >
            <CodeEditor
              value={solutionCode}
              onChange={setSolutionCode}
              language={language}
              height="24rem"
              forceTheme="dark"
              expandable
            />
          </WorkPanel>
        </div>

        <WorkPanel
          title="Natija"
          hint={rows.length ? `${rows.length} ta test` : undefined}
          bodyClassName={rows.length ? "p-0" : "p-4"}
        >
          {rows.length ? (
            <ul className="divide-y divide-[var(--st-edge-soft)]">
              {rows.map((row) => (
                <li key={row.seed} className="p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="st-label">Test #{row.seed}</span>
                    {row.status !== "EXECUTED" ? (
                      <Verdict tone="fail">{row.status.toLowerCase().replace(/_/g, " ")}</Verdict>
                    ) : null}
                  </div>
                  <div className="grid gap-2 lg:grid-cols-2">
                    <div>
                      <p className="mb-1 font-mono text-[12.5px] text-[var(--text-4)]">
                        {String(row.seed).padStart(4, "0")}.in
                      </p>
                      <pre className="st-sunken st-code max-h-40 p-3">{row.input || "—"}</pre>
                    </div>
                    <div>
                      <p className="mb-1 font-mono text-[12.5px] text-[var(--text-4)]">
                        {String(row.seed).padStart(4, "0")}.out
                      </p>
                      <pre className="st-sunken st-code max-h-40 p-3">{row.output || "—"}</pre>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <WorkEmpty
              icon={<Terminal className="size-6" />}
              title="Hali ishga tushirilmagan"
              hint="Generator kodini yozing va «Ishga tushirish» tugmasini bosing."
            />
          )}
        </WorkPanel>
      </WorkBody>
    </>
  );
}
