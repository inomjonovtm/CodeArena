"use client";

import { useQuery } from "@tanstack/react-query";
import { Activity, Ban, Check, CircleDashed, RefreshCw, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { LiveDot, Spinner } from "@/components/kit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, EmptyState, Skeleton } from "@/components/ui/card";
import { CodeEditor } from "@/components/ui/code-editor";
import { Field, Textarea } from "@/components/ui/field";
import { Drawer, Modal } from "@/components/ui/modal";
import { useCrudMutation } from "@/hooks/use-crud";
import { api } from "@/lib/api";
import type {
  ContestMonitor,
  ContestMonitorCell,
  ContestMonitorSubmissions,
} from "@/lib/types";
import { cn, formatDate, formatRelative } from "@/lib/utils";

/** Jadval sarlavhasi — barcha ustunlarda bir xil */
const TH = "t-eyebrow whitespace-nowrap px-3 py-2.5";

/** Bitta katak: masala × ishtirokchi kesimidagi holat. Bosilsa kod ochiladi. */
function Cell({
  cell,
  onOpen,
}: {
  cell: ContestMonitorCell;
  onOpen: () => void;
}) {
  if (cell.attempts === 0) {
    return (
      <span className="inline-flex min-w-[2.75rem] items-center justify-center rounded-[var(--r-ctl)] bg-[var(--pane-sunken)] px-2 py-1 text-[11.5px] text-[var(--ink-4)]">
        —
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      title={
        cell.solved
          ? `${cell.attempts} urinish · yechilgan ${cell.first_solved_at ? formatRelative(cell.first_solved_at) : ""} — kodni ko'rish`
          : `${cell.attempts} urinish, yechilmagan — kodni ko'rish`
      }
      className={cn(
        // Hoverda faqat to'ldirma o'zgaradi — jadval sakramaydi
        "focus-ring inline-flex min-w-[2.75rem] items-center justify-center gap-1 rounded-[var(--r-ctl)] px-2 py-1",
        "t-num text-[11.5px] font-semibold transition-colors duration-[var(--t-fast)]",
        cell.solved
          ? "bg-[var(--ok-wash)] text-[var(--ok)] hover:bg-[var(--ok)] hover:text-white"
          : "bg-[var(--bad-wash)] text-[var(--bad)] hover:bg-[var(--bad)] hover:text-white",
      )}
    >
      {cell.solved ? <Check className="size-3" strokeWidth={3} /> : <CircleDashed className="size-3" />}
      {cell.attempts}
    </button>
  );
}

/** Tanlangan katak ortidagi yechimlar — kod bilan. */
function SubmissionDrawer({
  contestId,
  target,
  onClose,
}: {
  contestId: string;
  target: { username: string; problemId: string; label: string } | null;
  onClose: () => void;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["contests", contestId, "monitor", target?.username, target?.problemId],
    queryFn: () =>
      api.get<ContestMonitorSubmissions>(
        `/admin/contests/${contestId}/monitor/${target!.username}/${target!.problemId}/`,
      ),
    enabled: Boolean(target),
  });

  return (
    <Drawer
      open={Boolean(target)}
      onClose={onClose}
      title={target ? `${target.username} · ${target.label}` : undefined}
      description={data ? `${data.results.length} ta yuborilgan yechim` : undefined}
      width="max-w-3xl"
    >
      {isLoading ? (
        <Spinner label="Yuklanmoqda..." />
      ) : !data?.results.length ? (
        <EmptyState title="Yechim topilmadi" />
      ) : (
        <div className="flex flex-col gap-4">
          {data.results.map((row) => (
            <Card key={row.id}>
              <CardHeader
                title={
                  <span className="flex items-center gap-2">
                    <Badge tone={row.status === "ACCEPTED" ? "success" : "danger"}>
                      {row.status}
                    </Badge>
                    <span className="t-num text-[12.5px] font-normal text-[var(--ink-3)]">
                      {row.passed_tests}/{row.total_tests} test
                    </span>
                  </span>
                }
                description={`${formatDate(row.created_at)} · ${row.language}${
                  row.ip_address ? ` · ${row.ip_address}` : ""
                }`}
              />
              <CardBody className="flex flex-col gap-3">
                <CodeEditor
                  value={row.code}
                  language={row.language}
                  height="18rem"
                  readOnly
                  expandable
                />
                {row.compile_output || row.error_message ? (
                  <pre className="scrollbar-thin max-h-32 overflow-auto rounded-[var(--r-field)] bg-[var(--pane-sunken)] p-3 font-mono text-[11.5px] whitespace-pre-wrap text-[var(--ink-3)]">
                    {row.compile_output || row.error_message}
                  </pre>
                ) : null}
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </Drawer>
  );
}

/**
 * Musobaqani jonli kuzatish.
 *
 * Davom etayotgan musobaqada har 15 soniyada yangilanadi — administrator
 * kim qaysi masalada qanchadan urinayotganini real vaqtda ko'radi.
 */
export function ContestMonitorPanel({ contestId }: { contestId: string }) {
  const [codeTarget, setCodeTarget] = useState<{
    username: string;
    problemId: string;
    label: string;
  } | null>(null);
  const [dqTarget, setDqTarget] = useState<{ id: string; username: string } | null>(null);
  const [dqReason, setDqReason] = useState("");

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["contests", contestId, "monitor"],
    queryFn: () => api.get<ContestMonitor>(`/admin/contests/${contestId}/monitor/`),
    refetchInterval: (query) =>
      query.state.data?.state === "running" ? 15_000 : false,
  });

  const disqualifyMutation = useCrudMutation(
    ({ id, reason }: { id: string; reason: string }) =>
      api.post(`/admin/contests/${contestId}/participants/${id}/disqualify/`, { reason }),
    {
      invalidate: [["contests", contestId, "monitor"]],
      successMessage: "Ishtirokchi chetlatildi",
      onSuccess: () => {
        setDqTarget(null);
        setDqReason("");
      },
    },
  );

  const restoreMutation = useCrudMutation(
    (id: string) => api.post(`/admin/contests/${contestId}/participants/${id}/restore/`),
    {
      invalidate: [["contests", contestId, "monitor"]],
      successMessage: "Ishtirokchi tiklandi",
    },
  );

  // Skelet haqiqiy tartibni takrorlaydi: KPI qatori, keyin jadval
  if (isLoading) {
    return (
      <div className="flex flex-col gap-5">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-20 rounded-[var(--r-pane)]" />
          ))}
        </div>
        <Skeleton className="h-80 rounded-[var(--r-pane-lg)]" />
      </div>
    );
  }

  if (!data) return null;

  // KPI'lar mavjud javobdan hisoblanadi — qo'shimcha so'rov yo'q
  const solvedTotal = data.problems.reduce((sum, problem) => sum + problem.solved_count, 0);
  const dqCount = data.rows.filter((row) => row.is_disqualified).length;

  return (
    <div className="flex flex-col gap-5">
      {/* --------------------------------------------------- jonli ko'rsatkichlar */}
      {/* Bitta lenta ichida ochiq raqamlar — karta panjarasi emas */}
      <div className="pane grid grid-cols-2 gap-5 rounded-[var(--r-pane-lg)] p-5 sm:p-6 xl:grid-cols-4">
        {[
          { label: "Ishtirokchilar", value: data.rows.length, tone: "var(--ink)" },
          { label: "Masalalar", value: data.problems.length, tone: "var(--ink)" },
          { label: "Yechilgan", value: solvedTotal, tone: "var(--ok)" },
          { label: "Chetlatilgan", value: dqCount, tone: dqCount ? "var(--bad)" : "var(--ink-4)" },
        ].map((stat) => (
          <div key={stat.label} className="min-w-0">
            <p className="t-eyebrow">{stat.label}</p>
            <p
              className="t-num mt-2 text-[24px] leading-none font-semibold"
              style={{ color: stat.tone }}
            >
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* -------------------------------------------------------------- natijalar */}
      <Card>
        <CardHeader
          title="Ishtirokchilar va natijalar"
          description={`${data.rows.length} ishtirokchi · ${data.problems.length} masala · katakni bosib kodni ko'ring`}
          action={
            <div className="flex items-center gap-2">
              {data.state === "running" ? (
                <span className="inline-flex items-center gap-1.5 rounded-[var(--r-chip)] bg-[var(--ok-wash)] px-2.5 py-1 text-[12px] font-medium text-[var(--ok)]">
                  <LiveDot tone="ok" />
                  jonli
                </span>
              ) : (
                <Badge tone="neutral">{data.state}</Badge>
              )}
              <Button
                variant="ghost"
                size="iconSm"
                className="focus-ring"
                onClick={() => void refetch()}
                title="Yangilash"
                aria-label="Yangilash"
              >
                <RefreshCw className={cn("size-4", isFetching && "animate-spin")} />
              </Button>
            </div>
          }
        />
        <CardBody className="p-0">
          {data.rows.length === 0 ? (
            <EmptyState
              icon={<Activity className="size-5" />}
              title="Hali ishtirokchi yo'q"
              description="Musobaqaga yozilganlar shu yerda ko'rinadi."
            />
          ) : (
            <div className="scrollbar-thin overflow-x-auto">
              <table className="w-full min-w-[42rem] border-collapse">
                <thead>
                  <tr className="text-left">
                    <th className={cn(TH, "shadow-[inset_0_-1px_0_var(--edge)]")}>#</th>
                    <th className={cn(TH, "shadow-[inset_0_-1px_0_var(--edge)]")}>Ishtirokchi</th>
                    {data.problems.map((problem) => (
                      <th
                        key={problem.id}
                        title={problem.title_uz}
                        className="px-2 py-2.5 text-center shadow-[inset_0_-1px_0_var(--edge)]"
                      >
                        <span className="block text-[12px] font-semibold text-[var(--ink)]">
                          {problem.label}
                        </span>
                        <span className="t-num text-[10px] font-medium text-[var(--ok)]">
                          {problem.solved_count}
                        </span>
                      </th>
                    ))}
                    <th className={cn(TH, "text-right shadow-[inset_0_-1px_0_var(--edge)]")}>Ball</th>
                    <th className={cn(TH, "text-right shadow-[inset_0_-1px_0_var(--edge)]")}>Jarima</th>
                    <th className={cn(TH, "text-right shadow-[inset_0_-1px_0_var(--edge)]")}>Reyting</th>
                    <th className="w-12 shadow-[inset_0_-1px_0_var(--edge)]" />
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((row, index) => (
                    <tr
                      key={row.participant_id}
                      className={cn(
                        "border-b border-[var(--edge)] transition-colors duration-[var(--t-fast)] last:border-0",
                        "hover:bg-[var(--pane-hover)]",
                        row.is_disqualified && "opacity-45",
                      )}
                    >
                      <td className="t-num px-3 py-2 text-[12.5px] text-[var(--ink-4)]">
                        {row.rank ?? index + 1}
                      </td>
                      <td className="px-3 py-2">
                        <Link
                          href={`/u/${row.username}`}
                          className="focus-ring rounded-[6px] text-[13px] font-medium text-[var(--ink)] transition-colors hover:text-[var(--brand)]"
                        >
                          {row.username}
                        </Link>
                        {row.is_virtual ? (
                          <span className="ml-1.5 text-[10.5px] text-[var(--ink-4)]">virtual</span>
                        ) : null}
                        {row.is_disqualified ? (
                          <span
                            title={row.disqualify_reason}
                            className="ml-1.5 rounded-[var(--r-chip)] bg-[var(--bad-wash)] px-1.5 py-px text-[10.5px] font-semibold text-[var(--bad)]"
                          >
                            DQ
                          </span>
                        ) : null}
                        <span className="t-meta block text-[11px] text-[var(--ink-4)]">
                          <span className="t-num">{row.solved_count}</span> yechilgan
                        </span>
                      </td>
                      {row.cells.map((cell, cellIndex) => (
                        <td key={cellIndex} className="px-2 py-2 text-center">
                          <Cell
                            cell={cell}
                            onOpen={() =>
                              setCodeTarget({
                                username: row.username,
                                problemId: data.problems[cellIndex].id,
                                label: data.problems[cellIndex].label,
                              })
                            }
                          />
                        </td>
                      ))}
                      <td className="t-num px-3 py-2 text-right text-[13px] font-semibold text-[var(--ink)]">
                        {row.score}
                      </td>
                      <td className="t-num px-2 py-2 text-right text-[12.5px] text-[var(--ink-3)]">
                        {row.penalty}
                      </td>
                      <td
                        className={cn(
                          "t-num px-2 py-2 text-right text-[12.5px] font-medium",
                          row.rating_change > 0
                            ? "text-[var(--ok)]"
                            : row.rating_change < 0
                              ? "text-[var(--bad)]"
                              : "text-[var(--ink-4)]",
                        )}
                      >
                        {row.rating_change !== 0
                          ? `${row.rating_change > 0 ? "+" : ""}${row.rating_change}`
                          : "—"}
                      </td>
                      <td className="px-2 py-2 text-right">
                        {row.is_disqualified ? (
                          <Button
                            variant="ghost"
                            size="iconSm"
                            className="focus-ring"
                            title="Chetlatishni bekor qilish"
                            aria-label="Chetlatishni bekor qilish"
                            onClick={() => restoreMutation.mutate(row.participant_id)}
                          >
                            <RotateCcw className="size-3.5" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="iconSm"
                            className="focus-ring text-[var(--bad)] hover:bg-[var(--bad-wash)]"
                            title="Musobaqadan chetlatish"
                            aria-label="Musobaqadan chetlatish"
                            onClick={() =>
                              setDqTarget({ id: row.participant_id, username: row.username })
                            }
                          >
                            <Ban className="size-3.5" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      {/* --------------------------------------------------------- so'nggi oqim */}
      <Card>
        <CardHeader title="So'nggi yuborishlar" description="Oxirgi 40 ta" />
        <CardBody className="p-0">
          {data.recent_submissions.length === 0 ? (
            <EmptyState title="Hali yuborilgan yechim yo'q" />
          ) : (
            <ul className="divide-y divide-[var(--edge-soft)]">
              {data.recent_submissions.map((row) => (
                <li
                  key={row.id}
                  className="flex flex-wrap items-center gap-3 px-4 py-2.5 transition-colors duration-[var(--t-fast)] hover:bg-[var(--pane-hover)]"
                >
                  <Link
                    href={`/u/${row.username}`}
                    className="focus-ring rounded-[6px] text-[13px] font-medium text-[var(--ink)] transition-colors hover:text-[var(--brand)]"
                  >
                    {row.username}
                  </Link>
                  <span className="min-w-0 flex-1 truncate text-[12.5px] text-[var(--ink-3)]">
                    {row.problem_title}
                  </span>
                  <Badge tone={row.status === "ACCEPTED" ? "success" : "danger"}>
                    {row.status}
                  </Badge>
                  <span className="t-num text-[11.5px] whitespace-nowrap text-[var(--ink-4)]">
                    {formatRelative(row.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <SubmissionDrawer
        contestId={contestId}
        target={codeTarget}
        onClose={() => setCodeTarget(null)}
      />

      <Modal
        open={Boolean(dqTarget)}
        onClose={() => setDqTarget(null)}
        title="Musobaqadan chetlatish"
        description={dqTarget ? `@${dqTarget.username} natijalari hisobga olinmaydi` : undefined}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDqTarget(null)}>
              Bekor qilish
            </Button>
            <Button
              variant="danger"
              loading={disqualifyMutation.isPending}
              disabled={dqReason.trim().length < 3}
              onClick={() =>
                dqTarget && disqualifyMutation.mutate({ id: dqTarget.id, reason: dqReason })
              }
            >
              Chetlatish
            </Button>
          </>
        }
      >
        <Field label="Sabab" hint="Audit logda saqlanadi">
          <Textarea
            rows={3}
            value={dqReason}
            onChange={(event) => setDqReason(event.target.value)}
            placeholder="Masalan: plagiat, tashqi yordam..."
          />
        </Field>
      </Modal>
    </div>
  );
}
