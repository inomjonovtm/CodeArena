"use client";

import { AlertTriangle, CheckCircle2, Download, FileJson, Loader2, Upload } from "lucide-react";
import { useRef, useState } from "react";

import { Alert, Chip } from "@/components/kit";
import { useToast } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { api } from "@/lib/api";
import type { ImportResult } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Tashlash maydoni — botiq fon, punktir chegara. Gradient yo'q. */
const DROP_BASE = [
  "focus-ring flex w-full flex-col items-center justify-center gap-2",
  "rounded-[var(--r-pane)] border-2 border-dashed",
  "transition-[background-color,border-color] duration-[var(--t-fast)]",
].join(" ");

/** Qadam yorlig'i — jimgina, raqam bilan. */
function Step({ index, label, done }: { index: number; label: string; done?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <span
        className={cn(
          "t-num flex size-5 shrink-0 items-center justify-center rounded-[var(--r-chip)] text-[10.5px] font-semibold",
          done
            ? "bg-[var(--brand)] text-[var(--ink-on-brand)]"
            : "bg-[var(--brand-wash)] text-[var(--brand-ink)]",
        )}
      >
        {index}
      </span>
      <span
        className={cn(
          "text-[12.5px] font-medium",
          done ? "text-[var(--ink)]" : "text-[var(--ink-3)]",
        )}
      >
        {label}
      </span>
    </span>
  );
}

/** Masalalarni JSON fayldan ommaviy import qilish. */
export function ProblemImportDialog({
  open,
  onClose,
  onImported,
}: {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
}) {
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [items, setItems] = useState<unknown[] | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);

  const reset = () => {
    setFile(null);
    setItems(null);
    setResult(null);
  };

  const readFile = async (next: File) => {
    setFile(next);
    setResult(null);
    try {
      const parsed = JSON.parse(await next.text());
      setItems(Array.isArray(parsed) ? parsed : [parsed]);
    } catch (error) {
      toast.error("JSON o'qib bo'lmadi", String(error));
      setItems(null);
    }
  };

  const run = async (dryRun: boolean) => {
    if (!items) return;
    setBusy(true);
    try {
      const response = await api.post<ImportResult>("/admin/problems/import/", {
        items,
        dry_run: dryRun,
      });
      setResult(response);
      if (!dryRun) {
        toast.success(response.detail ?? "Import tugadi");
        onImported();
      }
    } catch (error) {
      toast.error("Import bajarilmadi", error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };

  const downloadTemplate = async () => {
    const template = await api.get<{ sample: unknown[] }>("/admin/problems/import/template/");
    const blob = new Blob([JSON.stringify(template.sample, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "codearena-masala-namuna.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  const errorCount = result?.invalid ?? result?.errors?.length ?? 0;

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Masalalarni import qilish"
      description="JSON fayldan bir vaqtda 500 tagacha masala"
      size="lg"
      footer={
        <>
          <Button
            variant="ghost"
            size="sm"
            className="focus-ring"
            icon={<Download className="size-4" />}
            onClick={downloadTemplate}
          >
            Namuna yuklab olish
          </Button>
          <div className="flex-1" />
          <Button
            variant="outline"
            size="sm"
            className="focus-ring"
            disabled={!items || busy}
            loading={busy && !result?.created}
            onClick={() => run(true)}
          >
            Tekshirish
          </Button>
          <Button
            size="sm"
            className="focus-ring"
            disabled={!items || busy || !result?.valid}
            onClick={() => run(false)}
            icon={<Upload className="size-4" />}
          >
            Import qilish
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {/* Qadamlar — bosqichni bir qarashda ko'rsatadi */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <Step index={1} label="Fayl" done={Boolean(items)} />
          <Step index={2} label="Tekshirish" done={Boolean(result)} />
          <Step index={3} label="Import" done={Boolean(result && !result.dry_run)} />
        </div>

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            const dropped = event.dataTransfer.files?.[0];
            if (dropped) void readFile(dropped);
          }}
          className={cn(
            DROP_BASE,
            "px-6 py-8",
            dragging
              ? "border-[var(--brand)] bg-[var(--brand-wash)]"
              : "border-[var(--edge-strong)] bg-[var(--pane-sunken)] hover:bg-[var(--brand-wash)]",
          )}
        >
          <span className="flex size-11 items-center justify-center rounded-full border border-[var(--edge-strong)] bg-[var(--pane)] text-[var(--ink-4)]">
            <FileJson className="size-5" />
          </span>
          {file ? (
            <>
              <span className="text-[13px] font-medium text-[var(--ink)]">{file.name}</span>
              <span className="t-num text-[11px] text-[var(--ink-4)]">
                {items ? `${items.length} ta yozuv topildi` : "O'qib bo'lmadi"}
              </span>
            </>
          ) : (
            <>
              <span className="text-[13px] font-medium text-[var(--ink)]">
                JSON faylni tashlang
              </span>
              <span className="text-[11px] text-[var(--ink-4)]">
                Massiv ko&apos;rinishida — har element bitta masala
              </span>
            </>
          )}
        </button>

        <input
          ref={inputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(event) => {
            const next = event.target.files?.[0];
            if (next) void readFile(next);
            event.target.value = "";
          }}
        />

        {result ? (
          /* Natija — oq karta emas, botiq maydon: modal fonining o'zi oq */
          <div className="space-y-3 rounded-[var(--r-pane)] bg-[var(--pane-sunken)] p-4">
            <div className="flex flex-wrap items-center gap-2">
              {result.dry_run ? <Chip tone="note">Tekshiruv natijasi</Chip> : null}
              <Chip tone="ok" icon={<CheckCircle2 className="size-3" />}>
                <span className="t-num">{result.valid ?? result.created?.length ?? 0}</span> yaroqli
              </Chip>
              {errorCount > 0 ? (
                <Chip tone="bad" icon={<AlertTriangle className="size-3" />}>
                  <span className="t-num">{errorCount}</span> xato
                </Chip>
              ) : null}
            </div>

            {result.preview?.length ? (
              <div className="rounded-[var(--r-field)] bg-[var(--pane-solid)] p-3">
                <p className="t-eyebrow mb-1.5">Import qilinadi</p>
                <ul className="space-y-0.5 text-[12.5px] text-[var(--ink-2)]">
                  {result.preview.slice(0, 10).map((title, index) => (
                    <li key={index} className="truncate">
                      · {title}
                    </li>
                  ))}
                  {result.preview.length > 10 ? (
                    <li className="text-[var(--ink-4)]">
                      … va yana <span className="t-num">{result.preview.length - 10}</span> ta
                    </li>
                  ) : null}
                </ul>
              </div>
            ) : null}

            {result.errors?.length ? (
              <Alert tone="bad" title="Xatolar">
                <ul className="space-y-1">
                  {result.errors.slice(0, 8).map((row) => (
                    <li key={row.index}>
                      <span className="t-num">#{row.index + 1}</span>{" "}
                      {row.title ? `(${row.title})` : ""} — {row.error}
                    </li>
                  ))}
                </ul>
              </Alert>
            ) : null}
          </div>
        ) : null}
      </div>
    </Modal>
  );
}

/** Test-case'larni ZIP yoki TXT dan yuklash. */
export function TestCaseImportDialog({
  open,
  onClose,
  problemId,
  onImported,
}: {
  open: boolean;
  onClose: () => void;
  problemId: string;
  onImported: () => void;
}) {
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [replace, setReplace] = useState(false);
  const [sampleCount, setSampleCount] = useState(2);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("replace", String(replace));
      form.append("sample_count", String(sampleCount));

      const response = await fetch(`/api/admin/problems/${problemId}/test-cases/import`, {
        method: "POST",
        body: form,
        credentials: "include",
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.detail ?? `Xatolik (${response.status})`);

      toast.success(payload.detail);
      onImported();
      onClose();
      setFile(null);
    } catch (error) {
      toast.error("Import bajarilmadi", error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Test-case'larni fayldan yuklash"
      size="md"
      footer={
        <>
          <Button variant="outline" size="sm" className="focus-ring" onClick={onClose}>
            Bekor qilish
          </Button>
          <Button size="sm" className="focus-ring" disabled={!file} loading={busy} onClick={run}>
            Yuklash
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="rounded-[var(--r-field)] bg-[var(--pane-sunken)] p-3 text-[12.5px] leading-relaxed text-[var(--ink-3)]">
          <p className="mb-1 font-semibold text-[var(--ink)]">
            Qo&apos;llab-quvvatlanadigan formatlar
          </p>
          <p>
            <strong>ZIP</strong> — ichida <code className="font-mono">1.in</code> /{" "}
            <code className="font-mono">1.out</code>, <code className="font-mono">2.in</code> /{" "}
            <code className="font-mono">2.out</code> juftliklari
          </p>
          <p className="mt-1">
            <strong>TXT</strong> — testlar <code className="font-mono">---</code> bilan,
            kirish/chiqish esa <code className="font-mono">===</code> bilan ajratiladi
          </p>
        </div>

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={cn(
            DROP_BASE,
            "border-[var(--edge-strong)] bg-[var(--pane-sunken)] px-6 py-6 hover:bg-[var(--brand-wash)]",
          )}
        >
          {busy ? (
            <Loader2 className="size-5 animate-spin text-[var(--brand)]" />
          ) : (
            <Upload className="size-5 text-[var(--brand)]" />
          )}
          <span className="text-[13px] font-medium text-[var(--ink)]">
            {file ? file.name : "Fayl tanlang (.zip yoki .txt)"}
          </span>
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".zip,.txt"
          className="hidden"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />

        <Field label="Nechta test namuna (ochiq) bo'lsin" hint="Birinchi N ta test namuna deb belgilanadi">
          <Input
            type="number"
            min={0}
            className="t-num"
            value={sampleCount}
            onChange={(event) => setSampleCount(Number(event.target.value))}
          />
        </Field>

        <Checkbox
          checked={replace}
          onChange={(event) => setReplace(event.target.checked)}
          label="Mavjud test-case'larni almashtirish"
          description="Belgilanmasa — yangi testlar oxiriga qo'shiladi"
        />
      </div>
    </Modal>
  );
}
