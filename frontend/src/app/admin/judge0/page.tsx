"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  PlugZap,
  RefreshCw,
  Save,
  Server,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";

import { PageHeader, StatCard } from "@/components/admin/page-header";
import { Alert } from "@/components/kit";
import { useCan, useI18n, useToast } from "@/components/providers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, Skeleton } from "@/components/ui/card";
import { Field, Input, Switch } from "@/components/ui/field";
import { StatRow } from "@/components/ui/misc";
import { api, ApiError, resource } from "@/lib/api";
import type { JudgeStatus, SiteSetting } from "@/lib/types";

const settings = resource<SiteSetting>("settings");

interface Judge0TestResult {
  ok: boolean;
  url: string;
  token_set: boolean;
  version?: string;
  homepage?: string;
  language_count?: number;
  languages?: { id: number; name: string }[];
  error?: string;
  health: JudgeStatus;
}

/**
 * Judge0 boshqaruvi.
 *
 * Ilgari Judge0 manzili `.env` da edi va uni o'zgartirish uchun serverni
 * qayta ishga tushirish kerak bo'lardi. Endi barcha parametrlar sozlamalar
 * jadvalida — bu sahifa ularni bir joyga yig'adi va «Ulanishni sinash»
 * tugmasi bilan natijani darhol ko'rsatadi.
 */
export default function Judge0Page() {
  const { t } = useI18n();
  const toast = useToast();
  const can = useCan();
  const queryClient = useQueryClient();
  const canEdit = can("judge.edit");

  const [values, setValues] = useState<Record<string, unknown>>({});
  const [test, setTest] = useState<Judge0TestResult | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["judge-config"],
    queryFn: () => api.get<SiteSetting[]>("/admin/settings/judge-config/"),
  });

  const { data: health, refetch: refetchHealth } = useQuery({
    queryKey: ["judge-health"],
    queryFn: () => api.get<JudgeStatus>("/admin/submissions/judge-health/"),
    refetchInterval: 60_000,
  });

  const rows = data ?? [];

  useEffect(() => {
    if (!rows.length) return;
    setValues(Object.fromEntries(rows.map((row) => [row.key, row.value])));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const changed = rows
    .filter((row) => JSON.stringify(values[row.key]) !== JSON.stringify(row.value))
    .map((row) => row.key);

  const saveMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      settings.collectionAction<{ detail: string }>("judge-config-save", { values: payload }),
    onSuccess: async () => {
      toast.success(t.settingsPage.savedSuccess);
      await queryClient.invalidateQueries({ queryKey: ["judge-config"] });
      await refetchHealth();
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : "Saqlab bo'lmadi"),
  });

  const testMutation = useMutation({
    mutationFn: () => settings.collectionAction<Judge0TestResult>("judge0-test", {}),
    onSuccess: (result) => {
      setTest(result);
      if (result.ok) toast.success(`Judge0 javob berdi (v${result.version || "?"})`);
      else toast.error(result.error || "Judge0 ga ulanib bo'lmadi");
      void refetchHealth();
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : "Sinov bajarilmadi"),
  });

  const syncMutation = useMutation({
    mutationFn: () => settings.collectionAction<{ created: number }>("sync-defaults", {}),
    onSuccess: async (result) => {
      toast.success(`${result.created} ta yangi sozlama qo'shildi`);
      await queryClient.invalidateQueries({ queryKey: ["judge-config"] });
      await queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
  });

  const labelOf = (row: SiteSetting) => row.label_uz || row.key;

  const control = (row: SiteSetting) => {
    const value = values[row.key];
    if (row.value_type === "boolean") {
      return (
        <Switch
          checked={Boolean(value)}
          onChange={(next) => setValues({ ...values, [row.key]: next })}
          label={labelOf(row)}
          description={row.description}
          disabled={!canEdit}
        />
      );
    }
    if (row.value_type === "number") {
      return (
        <Field label={labelOf(row)} hint={row.description}>
          <Input
            type="number"
            step="any"
            className="t-num"
            disabled={!canEdit}
            value={value === null || value === undefined ? "" : String(value)}
            onChange={(event) =>
              setValues({
                ...values,
                [row.key]: event.target.value === "" ? null : Number(event.target.value),
              })
            }
          />
        </Field>
      );
    }
    return (
      <Field label={labelOf(row)} hint={row.description}>
        <Input
          disabled={!canEdit}
          type={row.key === "judge0_token" ? "password" : "text"}
          value={String(value ?? "")}
          onChange={(event) => setValues({ ...values, [row.key]: event.target.value })}
        />
      </Field>
    );
  };

  // Ulanish, limitlar, xatti-harakat — parametrlar mazmuniga qarab guruhlanadi
  const section = (keys: string[]) =>
    keys.map((key) => rows.find((row) => row.key === key)).filter(Boolean) as SiteSetting[];

  const connection = section([
    "judge0_enabled", "judge0_url", "judge0_token",
    "judge0_timeout_sec", "judge0_health_cache_sec", "judge0_local_fallback",
  ]);
  const limits = section([
    "default_time_limit_ms", "default_memory_limit_kb",
    "judge0_cpu_extra_time_sec", "judge0_wall_time_extra_sec",
    "judge0_stack_limit_kb", "judge0_max_processes", "judge0_max_file_size_kb",
  ]);
  const behaviour = section([
    "judge0_batch_size", "judge0_poll_interval_ms", "judge0_max_poll_attempts",
    "judge0_enable_network", "judge0_redirect_stderr",
  ]);

  /** Parametrlar guruhi — oq kartada, ichida botiq maydonlar */
  const group = (
    title: string,
    hint: string,
    list: SiteSetting[],
    cols: string,
  ) => (
    <section className="pane rounded-[var(--r-pane)] p-5">
      <div className="mb-5 min-w-0">
        <h2 className="t-section text-[var(--ink)]">{title}</h2>
        <p className="t-meta mt-1 text-[var(--ink-3)]">{hint}</p>
      </div>
      {/* Parametrlar — oq karta ichida yupqa chiziqli kataklar. Maydonlarning
          o'zi botiq, shuning uchun katakka fon berilmaydi. */}
      <div className={`grid gap-3 ${cols}`}>
        {list.map((row) => (
          <div
            key={row.key}
            className={[
              "relative flex flex-col justify-between rounded-[var(--r-field)] border border-[var(--edge)] p-4",
              changed.includes(row.key) ? "edge-brand" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {control(row)}
            <p className="mt-3 font-mono text-[10.5px] text-[var(--ink-4)]">{row.key}</p>
          </div>
        ))}
      </div>
    </section>
  );

  // Skelet haqiqiy tartibni takrorlaydi: KPI qatori, keyin guruh bandlari
  if (isLoading) {
    return (
      <>
        <PageHeader
          title="Judge0"
          description="Kod bajarish xizmati — ulanish, limitlar va xatti-harakat"
        />
        <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28 rounded-[var(--r-pane)]" />
          ))}
        </div>
        <Skeleton className="h-72 rounded-[var(--r-pane)]" />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Judge0"
        description="Kod bajarish xizmati — ulanish, limitlar va xatti-harakat"
        actions={
          <>
            {can("settings.edit") ? (
              <Button
                size="sm"
                variant="ghost"
                icon={<RefreshCw className="size-4" />}
                loading={syncMutation.isPending}
                onClick={() => syncMutation.mutate()}
              >
                Yetishmayotgan sozlamalar
              </Button>
            ) : null}
            <Button
              size="sm"
              variant="outline"
              icon={<PlugZap className="size-4" />}
              loading={testMutation.isPending}
              onClick={() => testMutation.mutate()}
            >
              Ulanishni sinash
            </Button>
          </>
        }
      />

      {/* ------------------------------------------------------------ holat */}
      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Faol backend"
          value={
            health?.backend === "judge0"
              ? "Judge0"
              : health?.backend === "local"
                ? "Lokal runner"
                : "Yo'q"
          }
          tone={health?.backend === "judge0" ? "accent" : health?.available ? "warning" : "danger"}
          icon={<Server className="size-4" />}
        />
        <StatCard
          label="Judge0 javob beryapti"
          value={health?.judge0_available ? "Ha" : "Yo'q"}
          tone={health?.judge0_available ? "accent" : "danger"}
        />
        <StatCard
          label="Lokal runner"
          value={health?.local_enabled ? "Yoqilgan" : "O'chirilgan"}
          tone={health?.local_enabled ? "info" : "neutral"}
        />
        <StatCard
          label="Mavjud tillar"
          value={Object.keys(health?.languages ?? {}).length}
          tone="neutral"
        />
      </div>

      {test ? (
        <Card className="mb-5">
          <CardHeader
            title="Sinov natijasi"
            description={test.url}
            action={
              <Badge tone={test.ok ? "success" : "danger"}>
                {test.ok ? (
                  <CheckCircle2 className="size-3.5" />
                ) : (
                  <XCircle className="size-3.5" />
                )}
                {test.ok ? "Ulandi" : "Ulanmadi"}
              </Badge>
            }
          />
          <CardBody>
            {test.ok ? (
              <div className="space-y-1.5">
                <StatRow label="Versiya" value={test.version || "—"} />
                <StatRow label="Token" value={test.token_set ? "o'rnatilgan" : "yo'q"} />
                <StatRow label="Judge0 tillari" value={String(test.language_count ?? 0)} />
                {test.languages?.length ? (
                  <div className="mt-3 max-h-48 overflow-y-auto rounded-[var(--r-field)] bg-[var(--pane-sunken)] p-3">
                    <div className="flex flex-wrap gap-1.5">
                      {test.languages.map((row) => (
                        <span
                          key={row.id}
                          className="rounded-[var(--r-ctl)] bg-[var(--pane-solid)] px-2 py-1 font-mono text-[11px] text-[var(--ink-3)]"
                        >
                          <span className="t-num">#{row.id}</span> {row.name}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <Alert tone="bad" title="Ulanmadi">
                <span className="font-mono text-[12px]">{test.error}</span>
              </Alert>
            )}
          </CardBody>
        </Card>
      ) : null}

      {/* -------------------------------------------------------- sozlamalar */}
      <div className="flex flex-col gap-5">
        {group("Ulanish", "Manzil, token va zaxira rejimi", connection, "sm:grid-cols-2 xl:grid-cols-3")}
        {group("Limitlar", "Vaqt, xotira va jarayon cheklovlari", limits, "sm:grid-cols-2 xl:grid-cols-3")}
        {group("Xatti-harakat", "Batch hajmi, natijani kutish va xavfsizlik", behaviour, "sm:grid-cols-2 xl:grid-cols-3")}
      </div>

      {!canEdit ? (
        <Alert tone="info" className="mt-5">
          Sizda «judge.edit» huquqi yo&apos;q — qiymatlarni faqat ko&apos;rishingiz mumkin.
        </Alert>
      ) : null}

      {/* Yopishqoq saqlash paneli — o'zgarish bo'lgandagina ko'rinadi */}
      {canEdit && changed.length ? (
        <div className="pane-solid enter-pop sticky bottom-4 z-20 mt-6 flex flex-wrap items-center justify-between gap-3 rounded-[var(--r-pane)] px-4 py-3 shadow-[var(--lift-3)]">
          <p className="t-meta text-[var(--ink-2)]">
            <span className="t-num font-semibold text-[var(--ink)]">{changed.length}</span> ta
            parametr saqlanmagan
          </p>
          <Button
            size="sm"
            icon={<Save className="size-4" />}
            loading={saveMutation.isPending}
            onClick={() =>
              saveMutation.mutate(Object.fromEntries(changed.map((key) => [key, values[key]])))
            }
          >
            {t.common.save}
            {changed.length ? ` (${changed.length})` : ""}
          </Button>
        </div>
      ) : null}
    </>
  );
}
