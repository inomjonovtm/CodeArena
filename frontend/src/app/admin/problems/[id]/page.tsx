"use client";

import { useQuery } from "@tanstack/react-query";
import { Bookmark, CheckCircle2, Copy, Save, Trash2, Users } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { PageHeader, StatCard } from "@/components/admin/page-header";
import { ProblemForm, fromDetail, type ProblemFormValue } from "@/components/admin/problem-form";
import { Block, Button } from "@/components/kit";
import { useI18n } from "@/components/providers";
import { PublishBadge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/modal";
import { useCrudMutation } from "@/hooks/use-crud";
import { api, resource } from "@/lib/api";
import type { ProblemDetail } from "@/lib/types";
import { formatDate, formatNumber } from "@/lib/utils";

const problems = resource<ProblemDetail>("problems");

interface ProblemStats {
  total_submissions: number;
  accepted_submissions: number;
  acceptance_rate: number;
  unique_solvers: number;
  bookmarks: number;
  discussions: number;
  by_status: { status: string; count: number }[];
  by_language: { language: string; count: number }[];
}

/** Kesim ro'yxati — yorliq, ustun va nisbiy chiziq. */
function BreakdownList({ rows }: { rows: { label: string; count: number }[] }) {
  const max = Math.max(...rows.map((row) => row.count), 1);
  return (
    <ul className="flex flex-col gap-2.5">
      {rows.map((row) => (
        <li key={row.label}>
          <div className="mb-1 flex items-center justify-between gap-3">
            <span className="truncate text-[12.5px] text-[var(--ink-2)]">{row.label}</span>
            <span className="t-num shrink-0 text-[12.5px] font-semibold text-[var(--ink)]">
              {formatNumber(row.count)}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--pane-sunken)]">
            <div
              className="h-full rounded-full bg-[var(--brand)]"
              style={{ width: `${Math.max((row.count / max) * 100, 3)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function EditProblemPage() {
  const { t } = useI18n();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [value, setValue] = useState<ProblemFormValue | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["problems", id],
    queryFn: () => problems.retrieve(id),
  });

  const { data: summary } = useQuery({
    queryKey: ["problems", id, "stats"],
    queryFn: () => api.get<ProblemStats>(`/admin/problems/${id}/stats/`),
  });

  useEffect(() => {
    if (data) setValue(fromDetail(data));
  }, [data]);

  const saveMutation = useCrudMutation(
    (payload: ProblemFormValue) => problems.update(id, payload),
    { invalidate: [["problems"]], successMessage: t.problems.updatedSuccess },
  );

  const publishMutation = useCrudMutation(() => problems.action(id, "publish"), {
    invalidate: [["problems"]],
    successMessage: t.problems.publishedSuccess,
  });

  const duplicateMutation = useCrudMutation(
    () => problems.action<ProblemDetail>(id, "duplicate"),
    {
      invalidate: [["problems"]],
      successMessage: t.problems.duplicatedSuccess,
      onSuccess: (created) => router.push(`/admin/problems/${created.id}`),
    },
  );

  const deleteMutation = useCrudMutation(() => problems.remove(id), {
    invalidate: [["problems"]],
    successMessage: "Masala o'chirildi",
    onSuccess: () => router.replace("/admin/problems"),
  });

  // Skelet haqiqiy tartibni takrorlaydi — kontent kelganda sahifa sakramaydi
  if (isLoading || !value || !data) {
    return (
      <div className="enter">
        <Block className="h-8 w-72 rounded-[var(--r-ctl)]" />
        <Block className="mt-3 h-3.5 w-52" />
        <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Block key={index} className="h-28 rounded-[var(--r-pane)]" />
          ))}
        </div>
        <Block className="mt-6 h-96 rounded-[var(--r-pane-lg)]" />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title={
          <span className="flex items-center gap-2.5">
            <span className="truncate">
              {data.title_uz}
            </span>
            <PublishBadge value={data.status} />
          </span>
        }
        description={
          <span className="font-mono text-[12px]">
            {data.slug} · {t.common.updatedAt}: {formatDate(data.updated_at)}
          </span>
        }
        backHref="/admin/problems"
        actions={
          <>
            <Button
              variant="ghost"
              size="sm"
              icon={<Trash2 className="size-4" />}
              className="text-[var(--bad)] hover:bg-[var(--bad-wash)]"
              onClick={() => setConfirmDelete(true)}
            >
              {t.common.delete}
            </Button>
            <Button
              variant="quiet"
              size="sm"
              icon={<Copy className="size-4" />}
              loading={duplicateMutation.isPending}
              onClick={() => duplicateMutation.mutate(undefined as never)}
            >
              {t.common.duplicate}
            </Button>
            {data.status !== "published" ? (
              <Button
                variant="brand-soft"
                size="sm"
                icon={<CheckCircle2 className="size-4" />}
                loading={publishMutation.isPending}
                onClick={() => publishMutation.mutate(undefined as never)}
              >
                {t.problems.publish}
              </Button>
            ) : null}
          </>
        }
      />

      {summary ? (
        <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label={t.problems.submissions}
            value={formatNumber(summary.total_submissions)}
            hint={`${formatNumber(summary.accepted_submissions)} accepted`}
          />
          <StatCard
            label={t.problems.acceptance}
            value={`${summary.acceptance_rate}%`}
            tone="accent"
          />
          <StatCard
            label={t.problems.solvers}
            value={formatNumber(summary.unique_solvers)}
            tone="info"
            icon={<Users className="size-[17px]" />}
          />
          <StatCard
            label="Bookmark / muhokama"
            value={`${summary.bookmarks} / ${summary.discussions}`}
            tone="neutral"
            icon={<Bookmark className="size-[17px]" />}
          />
        </div>
      ) : null}

      <ProblemForm value={value} onChange={setValue} />

      {/* ------------------------------------------------ kesim statistikasi */}
      {summary?.by_language.length ? (
        <section className="mt-6">
          <div className="pane rounded-[var(--r-pane-lg)] p-5">
            <h2 className="text-[14px] leading-tight font-semibold text-[var(--ink)]">
              {t.problems.statsTab}
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="pane-solid rounded-[var(--r-pane)] p-4">
                <p className="t-eyebrow mb-3">Status bo&apos;yicha</p>
                <BreakdownList
                  rows={summary.by_status.map((row) => ({ label: row.status, count: row.count }))}
                />
              </div>
              <div className="pane-solid rounded-[var(--r-pane)] p-4">
                <p className="t-eyebrow mb-3">Til bo&apos;yicha</p>
                <BreakdownList
                  rows={summary.by_language.map((row) => ({
                    label: row.language,
                    count: row.count,
                  }))}
                />
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* Yopishqoq saqlash paneli */}
      <div className="sticky bottom-4 z-20 mt-6">
        <div className="pane-solid flex flex-wrap items-center justify-between gap-3 rounded-[var(--r-pane)] px-4 py-3 shadow-[var(--lift-3)]">
          <p className="t-meta min-w-0 truncate font-mono text-[var(--ink-4)]">{data.slug}</p>
          <div className="flex shrink-0 items-center gap-2">
            <Button variant="quiet" size="sm" onClick={() => router.push("/admin/problems")}>
              {t.common.cancel}
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<Save className="size-4" />}
              loading={saveMutation.isPending}
              onClick={() => saveMutation.mutate(value)}
            >
              {t.common.save}
            </Button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => deleteMutation.mutate(undefined as never)}
        loading={deleteMutation.isPending}
        title={t.common.delete}
        message="Masala barcha test-case va submissionlari bilan o'chiriladi. Bu amalni qaytarib bo'lmaydi."
        confirmLabel={t.common.delete}
        cancelLabel={t.common.cancel}
      />
    </>
  );
}
