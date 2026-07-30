"use client";

import { useQuery } from "@tanstack/react-query";
import { Check, Inbox, Mail, MailOpen, Reply, Trash2 } from "lucide-react";
import { useState } from "react";

import { PageHeader, StatCard } from "@/components/admin/page-header";
import { Alert } from "@/components/kit";
import { useI18n } from "@/components/providers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Field, FilterSelect, Textarea } from "@/components/ui/field";
import { ConfirmDialog, Drawer } from "@/components/ui/modal";
import { StatRow } from "@/components/ui/misc";
import { useCrudMutation } from "@/hooks/use-crud";
import { useTableQuery } from "@/hooks/use-table-query";
import { resource } from "@/lib/api";
import type { ContactMessage } from "@/lib/types";
import { formatDate, formatNumber, formatRelative } from "@/lib/utils";

const messages = resource<ContactMessage>("contact-messages");

export default function ContactMessagesPage() {
  const { t } = useI18n();
  const table = useTableQuery({ ordering: "-created_at" });
  const [openRow, setOpenRow] = useState<ContactMessage | null>(null);
  const [answer, setAnswer] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<ContactMessage | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["contact-messages", table.params],
    queryFn: () => messages.list(table.params),
  });

  const replyMutation = useCrudMutation(
    ({ id, text }: { id: string; text: string }) =>
      messages.action<{ detail: string; email_sent: boolean }>(id, "reply", { answer: text }),
    {
      invalidate: [["contact-messages"]],
      successMessage: "Javob yuborildi",
      onSuccess: () => {
        setOpenRow(null);
        setAnswer("");
      },
    },
  );

  const deleteMutation = useCrudMutation((id: string) => messages.remove(id), {
    invalidate: [["contact-messages"]],
    successMessage: t.common.delete,
    onSuccess: () => setDeleteTarget(null),
  });

  const bulkMutation = useCrudMutation(
    ({ ids, action }: { ids: (string | number)[]; action: string }) => messages.bulk(ids, action),
    { invalidate: [["contact-messages"]] },
  );

  // KPI joriy sahifadan hisoblanadi — yangi so'rov qo'shilmaydi
  const rows = data?.results ?? [];
  const unread = rows.filter((row) => !row.is_read).length;
  const open = rows.filter((row) => !row.is_resolved).length;

  const columns: Column<ContactMessage>[] = [
    {
      key: "subject",
      header: "Xabar",
      csv: (row) => row.subject,
      render: (row) => (
        <div className="flex min-w-0 items-start gap-2">
          {/* O'qilmagan xabar — brend nuqta, mavzu qalinroq */}
          {row.is_read ? null : (
            <span
              className="mt-[7px] size-1.5 shrink-0 rounded-full bg-[var(--brand)]"
              title="O'qilmagan"
              aria-label="O'qilmagan"
            />
          )}
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-[13px] text-[var(--ink)]">
              {row.is_read ? (
                <MailOpen className="size-3.5 shrink-0 text-[var(--ink-4)]" />
              ) : (
                <Mail className="size-3.5 shrink-0 text-[var(--brand)]" />
              )}
              <span
                className={`max-w-md truncate ${row.is_read ? "font-medium" : "font-semibold"}`}
              >
                {row.subject}
              </span>
            </p>
            <p className="mt-0.5 line-clamp-1 max-w-md text-[11.5px] text-[var(--ink-4)]">
              {row.body}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "from",
      header: "Kimdan",
      csv: (row) => `${row.name} <${row.email}>`,
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate text-[12.5px] text-[var(--ink-2)]">{row.name}</p>
          <p className="truncate text-[11.5px] text-[var(--ink-4)]">{row.email}</p>
        </div>
      ),
    },
    {
      key: "topic",
      header: "Mavzu",
      csv: (row) => row.topic_display,
      render: (row) => <Badge tone="outline">{row.topic_display}</Badge>,
    },
    {
      key: "is_resolved",
      header: "Holat",
      align: "center",
      csv: (row) => (row.is_resolved ? "hal qilingan" : "ochiq"),
      render: (row) =>
        row.is_resolved ? (
          <Badge tone="success" dot>
            hal qilingan
          </Badge>
        ) : (
          <Badge tone="warning" dot>
            ochiq
          </Badge>
        ),
    },
    {
      key: "created_at",
      header: t.common.createdAt,
      sortKey: "created_at",
      csv: (row) => row.created_at,
      render: (row) => (
        <span className="t-num whitespace-nowrap text-[12px] text-[var(--ink-4)]">
          {formatRelative(row.created_at)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      width: "6rem",
      render: (row) => (
        <div className="flex justify-end gap-0.5">
          <Button
            variant="ghost"
            size="iconSm"
            title="Javob berish"
            aria-label={`${row.subject} — javob berish`}
            onClick={() => {
              setOpenRow(row);
              setAnswer(row.answer || "");
            }}
          >
            <Reply className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="iconSm"
            className="text-[var(--bad)] hover:bg-[var(--bad-wash)] hover:text-[var(--bad)]"
            title={t.common.delete}
            aria-label={`${row.subject} — ${t.common.delete}`}
            onClick={() => setDeleteTarget(row)}
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
        title="Bog'lanish xabarlari"
        description="Saytdagi «Bog'lanish» formasidan kelgan murojaatlar"
      />

      {/* KPI qatori — pochta qutisining holati */}
      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t.common.total}
          value={formatNumber(data?.count ?? 0)}
          icon={<Inbox className="size-[18px]" />}
        />
        <StatCard
          label="O‘qilmagan"
          value={formatNumber(unread)}
          hint="shu sahifada"
          icon={<Mail className="size-[18px]" />}
          tone={unread ? "accent" : "neutral"}
        />
        <StatCard
          label="Ochiq"
          value={formatNumber(open)}
          hint="shu sahifada"
          tone={open ? "warning" : "neutral"}
        />
        <StatCard
          label="Hal qilingan"
          value={formatNumber(rows.length - open)}
          hint="shu sahifada"
          icon={<Check className="size-[18px]" />}
          tone="neutral"
        />
      </div>

      {isError ? (
        <Alert
          tone="bad"
          title="Xabarlarni yuklab bo'lmadi"
          className="mb-5"
          action={
            <Button variant="outline" size="sm" onClick={() => void refetch()}>
              Qayta urinish
            </Button>
          }
        >
          Tarmoq yoki server xatosi. Qayta urinib ko&apos;ring.
        </Alert>
      ) : null}

      <DataTable
        rows={rows}
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
        onRowClick={(row) => {
          setOpenRow(row);
          setAnswer(row.answer || "");
        }}
        filtersSlot={
          <>
            <FilterSelect
              label="Holat"
              allLabel="Barcha holatlar"
              value={table.filters.is_resolved as string}
              onChange={(next) => table.setFilter("is_resolved", next)}
              options={[
                { value: "false", label: "Ochiq" },
                { value: "true", label: "Hal qilingan" },
              ]}
            />
            <FilterSelect
              label="Mavzu"
              allLabel="Barcha mavzular"
              value={table.filters.topic as string}
              onChange={(next) => table.setFilter("topic", next)}
              options={[
                { value: "general", label: "Umumiy savol" },
                { value: "bug", label: "Xatolik haqida" },
                { value: "problem", label: "Masala bo'yicha" },
                { value: "partnership", label: "Hamkorlik" },
                { value: "other", label: "Boshqa" },
              ]}
            />
          </>
        }
        bulkActions={[
          {
            key: "mark_read",
            label: "O'qilgan deb belgilash",
            icon: <MailOpen className="size-3.5" />,
            onRun: (ids) => bulkMutation.mutateAsync({ ids, action: "mark_read" }),
          },
          {
            key: "resolve",
            label: "Hal qilindi",
            icon: <Check className="size-3.5" />,
            onRun: (ids) => bulkMutation.mutateAsync({ ids, action: "resolve" }),
          },
          {
            key: "unresolve",
            label: "Qayta ochish",
            onRun: (ids) => bulkMutation.mutateAsync({ ids, action: "unresolve" }),
          },
          {
            key: "delete",
            label: t.common.delete,
            icon: <Trash2 className="size-3.5" />,
            danger: true,
            onRun: (ids) => bulkMutation.mutateAsync({ ids, action: "delete" }),
          },
        ]}
      />

      <Drawer
        open={Boolean(openRow)}
        onClose={() => setOpenRow(null)}
        title={openRow?.subject}
        description={openRow ? formatDate(openRow.created_at) : undefined}
        width="max-w-2xl"
        footer={
          openRow ? (
            <Button
              icon={<Reply className="size-4" />}
              loading={replyMutation.isPending}
              disabled={answer.trim().length < 5}
              onClick={() => replyMutation.mutate({ id: openRow.id, text: answer })}
            >
              Javobni yuborish
            </Button>
          ) : null
        }
      >
        {openRow ? (
          <div className="flex flex-col gap-4">
            {/* Botiq maydon — murojaat pasporti */}
            <div className="pane-sunken rounded-[var(--r-field)] px-4 py-2.5">
              <StatRow label="Ism" value={openRow.name} />
              <StatRow label="Email" value={openRow.email} />
              <StatRow label="Mavzu" value={openRow.topic_display} />
              <StatRow label="Hisob" value={openRow.user_username ?? "mehmon"} />
              <StatRow label="IP" value={openRow.ip_address ?? "—"} />
            </div>

            {/* Xabar matni — uzun matn oq kartada o'qiladi */}
            <Card>
              <CardBody>
                <p className="whitespace-pre-wrap text-[13.5px] leading-relaxed text-[var(--ink)]">
                  {openRow.body}
                </p>
              </CardBody>
            </Card>

            {openRow.answered_at ? (
              <Alert
                tone="ok"
                title={`${openRow.answered_by_username} · ${formatRelative(openRow.answered_at)}`}
              >
                <span className="block whitespace-pre-wrap text-[13px] leading-relaxed">
                  {openRow.answer}
                </span>
              </Alert>
            ) : null}

            <Field label="Javob" hint="Javob ko'rsatilgan emailga yuboriladi">
              <Textarea
                rows={6}
                value={answer}
                onChange={(event) => setAnswer(event.target.value)}
                placeholder="Javob matnini yozing..."
                aria-label="Javob matni"
              />
            </Field>
          </div>
        ) : null}
      </Drawer>

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
