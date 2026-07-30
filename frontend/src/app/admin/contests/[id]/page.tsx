"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Calculator,
  Save,
  ShieldAlert,
  Trash2,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  ContestForm,
  contestFromDetail,
  contestToPayload,
  type ContestFormValue,
} from "@/components/admin/contest-form";
import { ContestMonitorPanel } from "@/components/admin/contest-monitor";
import { PageHeader, StatCard } from "@/components/admin/page-header";
import { Block, Button as KitButton } from "@/components/kit";
import { useI18n } from "@/components/providers";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/misc";
import { ConfirmDialog } from "@/components/ui/modal";
import { useCrudMutation } from "@/hooks/use-crud";
import { resource } from "@/lib/api";
import type { ContestDetail, ContestState } from "@/lib/types";
import { formatDate, formatNumber } from "@/lib/utils";

const contests = resource<ContestDetail>("contests");

const STATE: Record<ContestState, { tone: BadgeTone; uz: string }> = {
  draft: { tone: "neutral", uz: "Qoralama" },
  scheduled: { tone: "info", uz: "Rejalashtirilgan" },
  running: { tone: "success", uz: "Davom etmoqda" },
  finished: { tone: "outline", uz: "Tugagan" },
  cancelled: { tone: "danger", uz: "Bekor qilingan" },
};

export default function ContestDetailPage() {
  const { t } = useI18n();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [tab, setTab] = useState("edit");
  const [value, setValue] = useState<ContestFormValue | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["contests", id],
    queryFn: () => contests.retrieve(id),
  });


  useEffect(() => {
    if (data) setValue(contestFromDetail(data));
  }, [data]);

  const saveMutation = useCrudMutation(
    (payload: ContestFormValue) => contests.update(id, contestToPayload(payload)),
    { invalidate: [["contests"]], successMessage: "Saqlandi" },
  );

  const recalcMutation = useCrudMutation(() => contests.action(id, "recalculate"), {
    invalidate: [["contests"]],
    successMessage: "Natijalar qayta hisoblanmoqda",
  });

  const ratingsMutation = useCrudMutation(() => contests.action(id, "apply-ratings"), {
    invalidate: [["contests"]],
    successMessage: "Reyting hisoblanmoqda",
  });

  const plagiarismMutation = useCrudMutation(() => contests.action(id, "scan-plagiarism"), {
    successMessage: "Anti-plagiat tekshiruvi boshlandi",
  });



  const deleteMutation = useCrudMutation(() => contests.remove(id), {
    invalidate: [["contests"]],
    successMessage: "Contest o'chirildi",
    onSuccess: () => router.replace("/admin/contests"),
  });

  // Skelet sahifaning haqiqiy tartibini takrorlaydi
  if (isLoading || !data || !value) {
    return (
      <div className="enter">
        <Block className="h-8 w-72 rounded-[var(--r-ctl)]" />
        <Block className="mt-3 h-3.5 w-96" />
        <Block className="mt-5 h-10 w-72 rounded-[var(--r-field)]" />
        <Block className="mt-6 h-96 rounded-[var(--r-pane-lg)]" />
      </div>
    );
  }

  const state = STATE[data.computed_status] ?? STATE.draft;

  return (
    <>
      <PageHeader
        backHref="/admin/contests"
        title={
          <span className="flex items-center gap-2.5">
            <span className="truncate">{data.title_uz}</span>
            <Badge tone={state.tone} dot>
              {state.uz}
            </Badge>
          </span>
        }
        description={`${formatDate(data.start_time)} — ${formatDate(data.end_time)} · ${data.duration_minutes} daqiqa`}
        actions={
          <>
            <KitButton
              variant="ghost"
              size="sm"
              className="text-[var(--bad)] hover:bg-[var(--bad-wash)]"
              icon={<Trash2 className="size-4" />}
              onClick={() => setDeleteOpen(true)}
            >
              {t.common.delete}
            </KitButton>
            <KitButton
              variant="quiet"
              size="sm"
              icon={<Calculator className="size-4" />}
              loading={recalcMutation.isPending}
              onClick={() => recalcMutation.mutate(undefined as never)}
            >
              {t.contests.recalculate}
            </KitButton>
          </>
        }
        tabs={
          <Tabs
            active={tab}
            onChange={setTab}
            items={[
              { key: "edit", label: t.common.edit },
              {
                // Ishtirokchilar, natijalar va jonli nazorat bitta jadvalga
                // birlashtirildi — uchtasi ham ayni bir ma'lumotni ko'rsatardi.
                key: "monitor",
                label: t.contests.participants,
                badge: data.participant_count,
              },
              { key: "tools", label: "Amallar" },
            ]}
          />
        }
      />

      {tab === "edit" ? <ContestForm value={value} onChange={setValue} /> : null}

      {tab === "monitor" ? <ContestMonitorPanel contestId={id} /> : null}

      {tab === "tools" ? (
        <div className="flex flex-col gap-6">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <StatCard
              label={t.contests.participants}
              value={formatNumber(data.participant_count)}
              icon={<Trophy className="size-[17px]" />}
            />
            <StatCard
              label={t.contests.ratingsApplied}
              value={data.ratings_applied_at ? formatDate(data.ratings_applied_at, false) : "—"}
              tone={data.ratings_applied_at ? "accent" : "neutral"}
              icon={<TrendingUp className="size-[17px]" />}
            />
            <StatCard
              label={t.plagiarism.title}
              value={data.plagiarism_checked_at ? formatDate(data.plagiarism_checked_at, false) : "—"}
              tone={data.plagiarism_checked_at ? "info" : "neutral"}
              icon={<ShieldAlert className="size-[17px]" />}
            />
          </div>

          {/* Amallar — oq blok, har bir qator alohida operatsiya */}
          <div className="pane-solid overflow-hidden rounded-[var(--r-pane-lg)]">
            <h2 className="border-b border-[var(--edge)] px-5 py-4 text-[14px] font-semibold text-[var(--ink)]">
              Contest amallari
            </h2>
            <div className="divide-y divide-[var(--edge-soft)]">
              {[
                {
                  title: t.contests.recalculate,
                  description:
                    "Submissionlar asosida ballar, jarima va o'rinlarni qayta hisoblaydi.",
                  action: (
                    <Button
                      variant="outline"
                      size="sm"
                      loading={recalcMutation.isPending}
                      onClick={() => recalcMutation.mutate(undefined as never)}
                    >
                      {t.common.apply}
                    </Button>
                  ),
                },
                {
                  title: t.contests.applyRatings,
                  description:
                    "Elo formulasi bo'yicha reytingni yangilaydi. Faqat tugagan va reytingli contest uchun, bir marta.",
                  action: (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={
                        Boolean(data.ratings_applied_at) ||
                        !data.is_rated ||
                        data.computed_status !== "finished"
                      }
                      loading={ratingsMutation.isPending}
                      onClick={() => ratingsMutation.mutate(undefined as never)}
                    >
                      {data.ratings_applied_at ? t.contests.ratingsApplied : t.common.apply}
                    </Button>
                  ),
                },
                {
                  title: t.contests.scanPlagiarism,
                  description:
                    "Barcha Accepted submissionlarni juft-juft solishtiradi (13-bo'lim). Natija anti-plagiat sahifasida ko'rinadi.",
                  action: (
                    <Button
                      variant="outline"
                      size="sm"
                      loading={plagiarismMutation.isPending}
                      onClick={() => plagiarismMutation.mutate(undefined as never)}
                    >
                      {t.plagiarism.runScan}
                    </Button>
                  ),
                },
              ].map((item) => (
                <div key={item.title} className="flex flex-wrap items-center gap-3 px-5 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-medium text-[var(--ink)]">{item.title}</p>
                    <p className="t-meta mt-0.5 text-[var(--ink-3)]">{item.description}</p>
                  </div>
                  {item.action}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {/* Yopishqoq saqlash paneli — faqat tahrir tabida */}
      {tab === "edit" ? (
        <div className="sticky bottom-4 z-20 mt-6">
          <div className="pane-solid flex flex-wrap items-center justify-between gap-3 rounded-[var(--r-pane)] px-4 py-3 shadow-[var(--lift-3)]">
            <p className="t-meta min-w-0 truncate font-mono text-[var(--ink-4)]">{data.slug}</p>
            <div className="flex shrink-0 items-center gap-2">
              <KitButton variant="quiet" size="sm" onClick={() => router.push("/admin/contests")}>
                {t.common.cancel}
              </KitButton>
              <KitButton
                variant="primary"
                size="sm"
                icon={<Save className="size-4" />}
                loading={saveMutation.isPending}
                onClick={() => saveMutation.mutate(value)}
              >
                {t.common.save}
              </KitButton>
            </div>
          </div>
        </div>
      ) : null}


      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => deleteMutation.mutate(undefined as never)}
        loading={deleteMutation.isPending}
        title={t.common.delete}
        message="Contest, uning masalalari va ishtirokchilar ro'yxati o'chiriladi."
        confirmLabel={t.common.delete}
        cancelLabel={t.common.cancel}
      />
    </>
  );
}
