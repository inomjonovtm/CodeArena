"use client";

import { useQuery } from "@tanstack/react-query";
import { Eye, FlaskConical, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { PageHeader } from "@/components/admin/page-header";
import { useConfirm, useI18n } from "@/components/providers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Checkbox, Field, FilterSelect, Input, SegmentedControl, Textarea } from "@/components/ui/field";
import { ConfirmDialog, Modal } from "@/components/ui/modal";
import { useCrudMutation } from "@/hooks/use-crud";
import { useTableQuery } from "@/hooks/use-table-query";
import { api, resource } from "@/lib/api";
import type { Paginated, ProblemListItem, TestCase } from "@/lib/types";
import { formatNumber } from "@/lib/utils";

const testCases = resource<TestCase & { id: number; problem: string }>("test-cases");

type Row = TestCase & { id: number; problem: string };

export default function TestCasesPage() {
  const { t } = useI18n();
  const { confirm } = useConfirm();
  const table = useTableQuery({ ordering: "problem" });
  const [draft, setDraft] = useState<Row | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Row | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["test-cases", table.params],
    queryFn: () => testCases.list(table.params),
  });

  const { data: problems } = useQuery({
    queryKey: ["problems", "picker"],
    queryFn: () =>
      api.get<Paginated<ProblemListItem>>("/admin/problems/", { page_size: 200, ordering: "title_uz" }),
  });

  const problemTitle = (id: string) =>
    problems?.results.find((problem) => problem.id === id)?.title_uz ?? id.slice(0, 8);

  const saveMutation = useCrudMutation((payload: Row) => testCases.update(payload.id, payload), {
    invalidate: [["test-cases"]],
    successMessage: "Test-case saqlandi",
    onSuccess: () => setDraft(null),
  });

  const deleteMutation = useCrudMutation((id: number) => testCases.remove(id), {
    invalidate: [["test-cases"]],
    successMessage: "O'chirildi",
    onSuccess: () => setDeleteTarget(null),
  });

  const bulkMutation = useCrudMutation(
    ({ ids, action }: { ids: (string | number)[]; action: string }) => testCases.bulk(ids, action),
    { invalidate: [["test-cases"]] },
  );

  const columns: Column<Row>[] = [
    {
      key: "problem",
      header: t.submissions.problem,
      csv: (row) => problemTitle(row.problem),
      mobilePrimary: true,
      render: (row) => (
        <Link
          href={`/admin/problems/${row.problem}`}
          className="focus-ring block max-w-[16rem] truncate rounded-[6px] text-[13px] font-medium text-[var(--ink)] transition-colors duration-[var(--t-fast)] hover:text-[var(--brand)]"
        >
          {problemTitle(row.problem)}
        </Link>
      ),
    },
    {
      key: "order",
      header: "#",
      sortKey: "order",
      align: "center",
      width: "4rem",
      csv: (row) => row.order,
      render: (row) => (
        <span className="t-num font-mono text-[12px] text-[var(--ink-4)]">{row.order + 1}</span>
      ),
    },
    {
      key: "type",
      header: "Turi",
      csv: (row) => (row.is_sample ? "sample" : "hidden"),
      render: (row) =>
        row.is_sample ? (
          <Badge tone="accent">
            <Eye className="size-3" /> namuna
          </Badge>
        ) : (
          <Badge tone="neutral">yashirin</Badge>
        ),
    },
    {
      key: "input",
      header: t.problems.input,
      csv: (row) => row.input,
      render: (row) => (
        <span className="line-clamp-1 max-w-[16rem] font-mono text-[12px] text-[var(--ink-3)]">
          {row.input.replace(/\n/g, " ␤ ") || "—"}
        </span>
      ),
    },
    {
      key: "output",
      header: t.problems.expectedOutput,
      csv: (row) => row.expected_output,
      render: (row) => (
        <span className="line-clamp-1 max-w-[12rem] font-mono text-[12px] text-[var(--ink-3)]">
          {row.expected_output.replace(/\n/g, " ␤ ") || "—"}
        </span>
      ),
    },
    {
      key: "limits",
      header: "Limitlar",
      hideable: true,
      defaultHidden: true,
      csv: (row) => `${row.time_limit_ms ?? ""}/${row.memory_limit_kb ?? ""}`,
      render: (row) => (
        <span className="t-num text-[12px] text-[var(--ink-4)]">
          {row.time_limit_ms ? `${row.time_limit_ms} ms` : "std"} ·{" "}
          {row.memory_limit_kb ? `${row.memory_limit_kb} KB` : "std"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      width: "5rem",
      render: (row) => (
        <div className="flex justify-end gap-0.5">
          <Button
            variant="ghost"
            size="iconSm"
            onClick={() => setDraft({ ...row })}
            aria-label={t.common.edit}
          >
            <Pencil className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="iconSm"
            className="text-[var(--bad)] hover:bg-[var(--bad-wash)]"
            onClick={() => setDeleteTarget(row)}
            aria-label={t.common.delete}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title={t.nav.testCases}
        description={
          data
            ? `Barcha masalalarning test-case'lari — jami ${formatNumber(data.count)} ta`
            : "Barcha masalalarning test-case'lari — markazlashgan ko'rinish"
        }
      />

      <DataTable
        rows={data?.results ?? []}
        columns={columns}
        rowKey={(row) => row.id}
        loading={isLoading}
        page={table.page}
        pageSize={table.pageSize}
        totalCount={data?.count ?? 0}
        totalPages={data?.total_pages ?? 1}
        onPageChange={table.setPage}
        onPageSizeChange={table.setPageSize}
        ordering={table.ordering}
        onOrderingChange={table.setOrdering}
        search={table.search}
        onSearchChange={table.setSearch}
        searchPlaceholder="Kirish yoki chiqish matni bo'yicha..."
        selectable
        exportName="codearena-testcases"
        activeFilterCount={table.activeFilterCount}
        onClearFilters={table.clearFilters}
        emptyTitle="Test-case topilmadi"
        emptyDescription="Test-case'lar masala sahifasida qo'shiladi."
        filtersSlot={
          <>
            <FilterSelect
              allLabel="Barcha masalalar"
              value={table.filters.problem as string}
              onChange={(next) => table.setFilter("problem", next)}
              searchable
              options={(problems?.results ?? []).map((problem) => ({
                value: problem.id,
                label: problem.title_uz,
              }))}
            />
            <SegmentedControl
              stacked
              label="Turi"
              allLabel={t.common.all}
              value={table.filters.is_sample as string}
              onChange={(next) => table.setFilter("is_sample", next)}
              options={[
                { value: "true", label: "Namuna", tone: "accent" },
                { value: "false", label: "Yashirin", tone: "neutral" },
              ]}
            />
          </>
        }
        bulkActions={[
          {
            key: "delete",
            label: t.common.delete,
            icon: <Trash2 className="size-3.5" />,
            danger: true,
            onRun: async (ids) => {
              const ok = await confirm({
                title: `${ids.length} ta test-case'ni o'chirish`,
                message:
                  "Test-case'lar o'chiriladi, tegishli masalalar qayta tekshirilishi kerak bo'ladi.",
                confirmLabel: t.common.delete,
                danger: true,
              });
              if (!ok) return;
              return bulkMutation.mutateAsync({ ids, action: "delete" });
            },
          },
        ]}
      />

      <Modal
        open={Boolean(draft)}
        onClose={() => setDraft(null)}
        title={
          <span className="flex items-center gap-2">
            <FlaskConical className="size-4 text-[var(--brand)]" />
            {t.common.edit}
          </span>
        }
        size="lg"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setDraft(null)}>
              {t.common.cancel}
            </Button>
            <Button
              size="sm"
              loading={saveMutation.isPending}
              onClick={() => draft && saveMutation.mutate(draft)}
            >
              {t.common.save}
            </Button>
          </>
        }
      >
        {draft ? (
          <div className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t.problems.input}>
                <Textarea
                  rows={6}
                  className="font-mono text-[12.5px]"
                  value={draft.input}
                  onChange={(event) => setDraft({ ...draft, input: event.target.value })}
                />
              </Field>
              <Field label={t.problems.expectedOutput}>
                <Textarea
                  rows={6}
                  className="font-mono text-[12.5px]"
                  value={draft.expected_output}
                  onChange={(event) => setDraft({ ...draft, expected_output: event.target.value })}
                />
              </Field>
            </div>
            {/* Limitlar guruhi — yupqa chiziq bo'limlarni ajratadi (maydonlar botiq) */}
            <div className="grid gap-4 rounded-[var(--r-field)] border border-[var(--edge)] p-4 sm:grid-cols-3">
              <Field label="Tartib">
                <Input
                  type="number"
                  value={draft.order}
                  onChange={(event) => setDraft({ ...draft, order: Number(event.target.value) })}
                />
              </Field>
              <Field label={t.problems.timeLimit}>
                <Input
                  type="number"
                  value={draft.time_limit_ms ?? ""}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      time_limit_ms: event.target.value ? Number(event.target.value) : null,
                    })
                  }
                  placeholder="standart"
                />
              </Field>
              <Field label={t.problems.memoryLimit}>
                <Input
                  type="number"
                  value={draft.memory_limit_kb ?? ""}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      memory_limit_kb: event.target.value ? Number(event.target.value) : null,
                    })
                  }
                  placeholder="standart"
                />
              </Field>
            </div>
            <Checkbox
              checked={draft.is_sample}
              onChange={(event) => setDraft({ ...draft, is_sample: event.target.checked })}
              label={t.problems.sampleTest}
              description="Namuna testlar foydalanuvchiga ochiq ko'rsatiladi"
            />
            {draft.is_sample ? (
              <Field label={t.problems.explanation}>
                <Textarea
                  rows={2}
                  value={draft.explanation_uz}
                  onChange={(event) => setDraft({ ...draft, explanation_uz: event.target.value })}
                />
              </Field>
            ) : null}
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        loading={deleteMutation.isPending}
        title={t.common.delete}
        message={t.common.deleteConfirm}
        confirmLabel={t.common.delete}
        cancelLabel={t.common.cancel}
      />
    </>
  );
}
