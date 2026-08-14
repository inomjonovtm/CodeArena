"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Ban,
  ListChecks,
  Puzzle,
  RotateCcw,
  ScanSearch,
  Search,
  Trash2,
  Trophy,
  Undo2,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { useConfirm, useToast } from "@/components/providers";
import { StButton, StField, StInput, StSelect } from "@/components/studio/problem/shared";
import { Verdict, WorkEmpty, WorkPanel, verdictTone } from "@/components/studio/workbench";
import { Avatar } from "@/components/ui/misc";
import { Pagination } from "@/components/ui/pagination";
import { api } from "@/lib/api";
import type {
  AdminSubmission,
  ContestParticipant,
  ContestProblemRow,
  Paginated,
  ProblemListItem,
} from "@/lib/types";
import { formatDate, formatRelative } from "@/lib/utils";

/* ==========================================================================
   Olimpiada ishxonasining qolgan tablari
   ========================================================================== */

/** «Masalalar» — olimpiadaga masala biriktirish va tartiblash. */
export function ContestProblemsTab({ contestId }: { contestId: string | null }) {
  const toast = useToast();
  const { confirm } = useConfirm();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [points, setPoints] = useState(100);

  const { data: rows, isLoading } = useQuery({
    queryKey: ["studio", "contest-problems", contestId],
    queryFn: () => api.get<ContestProblemRow[]>(`/admin/contests/${contestId}/problems/`),
    enabled: Boolean(contestId),
  });

  // Musobaqaga faqat `is_contest_only` masala qo'shiladi — aks holda uni
  // ishtirokchilar musobaqadan oldin amaliyot bo'limida yechib olishardi.
  const { data: candidates } = useQuery({
    queryKey: ["studio", "contest-candidates", search],
    queryFn: () =>
      api.get<Paginated<ProblemListItem>>("/admin/problems/", {
        search,
        is_contest_only: true,
        page_size: 8,
      }),
    enabled: Boolean(contestId) && search.trim().length >= 2,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["studio", "contest-problems", contestId] });

  const add = useMutation({
    mutationFn: (problem: string) =>
      api.post(`/admin/contests/${contestId}/problems/`, {
        problem,
        order: (rows?.length ?? 0) + 1,
        label: String.fromCharCode(65 + (rows?.length ?? 0)),
        points,
      }),
    onSuccess: async () => {
      await invalidate();
      setSearch("");
      toast.success("Masala qo'shildi");
    },
    onError: (error: unknown) =>
      toast.error("Qo'shib bo'lmadi", error instanceof Error ? error.message : String(error)),
  });

  const remove = useMutation({
    mutationFn: (cpId: string) =>
      api.delete<void>(`/admin/contests/${contestId}/problems/${cpId}/`),
    onSuccess: invalidate,
  });

  if (!contestId) return <NeedsSave what="masala biriktirish" />;

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
      <WorkPanel
        title="Olimpiada masalalari"
        hint={`${rows?.length ?? 0} ta`}
        bodyClassName={rows?.length ? "p-0" : "p-4"}
      >
        {isLoading ? (
          <div className="space-y-2 p-4">
            {[0, 1].map((row) => (
              <div key={row} className="h-12 animate-pulse rounded bg-[var(--surface-hover)]" />
            ))}
          </div>
        ) : rows?.length ? (
          <table className="st-table">
            <thead>
              <tr>
                <th className="w-16">Belgi</th>
                <th>Masala</th>
                <th className="w-24">Ball</th>
                <th className="w-12" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="font-mono font-semibold text-[var(--green-text)]">
                    {row.label || row.order}
                  </td>
                  <td>
                    <Link
                      href={`/studio/problems/${row.problem}`}
                      className="font-medium text-[var(--text)] transition-colors hover:text-[var(--green-text)]"
                    >
                      {row.problem_title}
                    </Link>
                  </td>
                  <td className="st-num text-[var(--text-2)]">{row.points}</td>
                  <td>
                    <button
                      type="button"
                      aria-label="Olib tashlash"
                      onClick={async () => {
                        const ok = await confirm({
                          title: "Masala olib tashlansinmi?",
                          message: `«${row.problem_title}» olimpiadadan chiqariladi.`,
                          confirmLabel: "Olib tashlash",
                          danger: true,
                        });
                        if (ok) remove.mutate(String(row.id));
                      }}
                      className="grid size-8 place-items-center rounded-lg text-[var(--text-4)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <WorkEmpty
            icon={<Puzzle className="size-6" />}
            title="Masala biriktirilmagan"
            hint="O'ngdagi qidiruv orqali masala qo'shing."
          />
        )}
      </WorkPanel>

      <WorkPanel title="Masala qo'shish">
        <div className="space-y-3">
          <StField label="Qidirish" hint="Faqat «musobaqa uchun» belgilangan masalalar">
            <StInput
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Masala nomi"
            />
          </StField>

          <StField label="Ball">
            <StInput
              type="number"
              min={1}
              value={points}
              onChange={(event) => setPoints(Number(event.target.value))}
            />
          </StField>

          {search.trim().length >= 2 ? (
            candidates?.results.length ? (
              <ul className="st-sunken max-h-64 divide-y divide-[var(--st-edge-soft)] overflow-y-auto">
                {candidates.results.map((row) => (
                  <li key={row.id}>
                    <button
                      type="button"
                      onClick={() => add.mutate(row.id)}
                      disabled={add.isPending}
                      className="w-full px-3 py-2 text-left transition-colors hover:bg-[var(--surface-hover)] disabled:opacity-50"
                    >
                      <span className="block truncate text-[15px] text-[var(--text)]">
                        {row.title_uz}
                      </span>
                      <span className="block truncate text-[13px] text-[var(--text-4)]">
                        {row.test_case_count} test · {row.difficulty}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[14px] text-[var(--text-4)]">
                Mos masala topilmadi. Masalaning «Faqat musobaqa uchun» sozlamasi
                yoqilganini tekshiring.
              </p>
            )
          ) : null}
        </div>
      </WorkPanel>
    </div>
  );
}

/** «Urinishlar» — musobaqadagi barcha submissionlar. */
export function ContestSubmissionsTab({ contestId }: { contestId: string | null }) {
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const { data, isLoading } = useQuery({
    queryKey: ["studio", "contest-submissions", contestId, status, page],
    queryFn: () =>
      api.get<Paginated<AdminSubmission>>("/admin/submissions/", {
        contest: contestId,
        status: status || undefined,
        page,
        page_size: pageSize,
        ordering: "-created_at",
      }),
    enabled: Boolean(contestId),
    refetchInterval: 30_000,
    placeholderData: keepPreviousData,
  });

  if (!contestId) return <NeedsSave what="urinishlarni ko'rish" />;

  return (
    <WorkPanel
      title="Urinishlar"
      hint={data ? `${data.count} ta` : undefined}
      actions={
        <StSelect
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
          className="w-48"
        >
          <option value="">Barcha holatlar</option>
          <option value="ACCEPTED">Qabul qilindi</option>
          <option value="WRONG_ANSWER">Noto&apos;g&apos;ri javob</option>
          <option value="TIME_LIMIT_EXCEEDED">Vaqt tugadi</option>
          <option value="RUNTIME_ERROR">Bajarilish xatosi</option>
          <option value="COMPILE_ERROR">Kompilyatsiya xatosi</option>
        </StSelect>
      }
      bodyClassName={data?.results.length ? "p-0" : "p-4"}
    >
      {isLoading ? (
        <div className="space-y-2 p-4">
          {[0, 1, 2].map((row) => (
            <div key={row} className="h-10 animate-pulse rounded bg-[var(--surface-hover)]" />
          ))}
        </div>
      ) : data?.results.length ? (
        <div className="overflow-x-auto">
          <table className="st-table">
            <thead>
              <tr>
                <th>Foydalanuvchi</th>
                <th>Masala</th>
                <th>Til</th>
                <th>Holati</th>
                <th>Vaqt</th>
                <th>Xotira</th>
                <th>Yuborilgan</th>
              </tr>
            </thead>
            <tbody>
              {data.results.map((row) => (
                <tr key={row.id}>
                  <td className="text-[var(--text)]">@{row.username}</td>
                  <td className="max-w-[220px] truncate text-[var(--text-2)]">
                    {row.problem_title}
                  </td>
                  <td className="font-mono text-[14px] text-[var(--text-3)]">{row.language}</td>
                  <td>
                    <Verdict tone={verdictTone(row.status)}>
                      {row.status === "ACCEPTED"
                        ? "qabul qilindi"
                        : `${row.status.toLowerCase().replace(/_/g, " ")}${
                            row.failed_test_index ? ` · test ${row.failed_test_index}` : ""
                          }`}
                    </Verdict>
                  </td>
                  <td className="st-num text-[var(--text-3)]">
                    {row.runtime_ms != null ? `${row.runtime_ms} ms` : "—"}
                  </td>
                  <td className="st-num text-[var(--text-3)]">
                    {row.memory_kb != null ? `${Math.round(row.memory_kb / 1024)} MB` : "—"}
                  </td>
                  <td className="whitespace-nowrap text-[14px] text-[var(--text-4)]">
                    {formatRelative(row.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <WorkEmpty
          icon={<ListChecks className="size-6" />}
          title="Urinish yo'q"
          hint="Musobaqa boshlanganda yuborilgan yechimlar shu yerda ko'rinadi."
        />
      )}
      <PanelPager page={page} count={data?.count ?? 0} pageSize={pageSize} onChange={setPage} />
    </WorkPanel>
  );
}

/** «Qatnashuvchilar» — ro'yxat, diskvalifikatsiya va tiklash. */
export function ContestParticipantsTab({ contestId }: { contestId: string | null }) {
  const toast = useToast();
  const { prompt } = useConfirm();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const { data, isLoading } = useQuery({
    queryKey: ["studio", "contest-participants", contestId, page],
    queryFn: () =>
      api.get<Paginated<ContestParticipant> | ContestParticipant[]>(
        `/admin/contests/${contestId}/participants/`,
        { page, page_size: pageSize },
      ),
    enabled: Boolean(contestId),
    placeholderData: keepPreviousData,
  });

  const rows = Array.isArray(data) ? data : (data?.results ?? []);
  const total = Array.isArray(data) ? data.length : (data?.count ?? 0);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["studio", "contest-participants", contestId] });

  const disqualify = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      api.post(`/admin/contests/${contestId}/participants/${id}/disqualify/`, { reason }),
    onSuccess: async () => {
      await invalidate();
      toast.success("Ishtirokchi diskvalifikatsiya qilindi");
    },
  });

  const restore = useMutation({
    mutationFn: (id: number) =>
      api.post(`/admin/contests/${contestId}/participants/${id}/restore/`, {}),
    onSuccess: async () => {
      await invalidate();
      toast.success("Ishtirokchi tiklandi");
    },
  });

  if (!contestId) return <NeedsSave what="qatnashuvchilarni ko'rish" />;

  return (
    <WorkPanel
      title="Qatnashuvchilar"
      hint={`${total} ta`}
      bodyClassName={rows.length ? "p-0" : "p-4"}
    >
      {isLoading ? (
        <div className="space-y-2 p-4">
          {[0, 1, 2].map((row) => (
            <div key={row} className="h-10 animate-pulse rounded bg-[var(--surface-hover)]" />
          ))}
        </div>
      ) : rows.length ? (
        <div className="overflow-x-auto">
          <table className="st-table">
            <thead>
              <tr>
                <th className="w-16">O&apos;rin</th>
                <th>Ishtirokchi</th>
                <th>Ball</th>
                <th>Yechgan</th>
                <th>Jarima</th>
                <th>Reyting</th>
                <th className="w-12" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="st-num font-semibold text-[var(--text)]">{row.rank ?? "—"}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <Avatar src={row.avatar_url} name={row.full_name || row.username} size="xs" />
                      <div className="min-w-0">
                        <p className="truncate text-[15px] text-[var(--text)]">
                          {row.full_name || row.username}
                        </p>
                        <p className="truncate text-[13px] text-[var(--text-4)]">
                          @{row.username}
                          {row.is_virtual ? " · virtual" : ""}
                        </p>
                      </div>
                      {row.is_disqualified ? (
                        <Verdict tone="fail">diskvalifikatsiya</Verdict>
                      ) : null}
                    </div>
                  </td>
                  <td className="st-num text-[var(--text-2)]">{row.score}</td>
                  <td className="st-num text-[var(--text-2)]">{row.solved_count}</td>
                  <td className="st-num text-[var(--text-3)]">{row.penalty}</td>
                  <td className="st-num text-[var(--text-3)]">
                    {row.rating_change ? (
                      <span>
                        {row.rating_change > 0 ? "+" : ""}
                        {row.rating_change}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    {row.is_disqualified ? (
                      <button
                        type="button"
                        aria-label="Tiklash"
                        title="Tiklash"
                        onClick={() => restore.mutate(row.id)}
                        className="grid size-8 place-items-center rounded-lg text-[var(--text-4)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
                      >
                        <Undo2 className="size-3.5" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        aria-label="Diskvalifikatsiya"
                        title="Diskvalifikatsiya"
                        onClick={async () => {
                          const reason = await prompt({
                            title: "Diskvalifikatsiya sababi",
                            label: "Sabab",
                            placeholder: "Masalan: boshqa ishtirokchi kodidan foydalangan",
                          });
                          if (reason) disqualify.mutate({ id: row.id, reason });
                        }}
                        className="grid size-8 place-items-center rounded-lg text-[var(--text-4)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
                      >
                        <Ban className="size-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <WorkEmpty
          icon={<Users className="size-6" />}
          title="Qatnashuvchi yo'q"
          hint="Ro'yxatdan o'tgan ishtirokchilar shu yerda ko'rinadi."
        />
      )}
      <PanelPager page={page} count={total} pageSize={pageSize} onChange={setPage} />
    </WorkPanel>
  );
}

/** «Natijalar» — yakuniy jadval va reyting qo'llash. */
export function ContestResultsTab({ contestId }: { contestId: string | null }) {
  const toast = useToast();
  const { confirm } = useConfirm();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["studio", "contest-leaderboard", contestId],
    queryFn: () =>
      api.get<{ rows: ContestParticipant[]; generated_at: string }>(
        `/admin/contests/${contestId}/leaderboard/`,
      ),
    enabled: Boolean(contestId),
  });

  const recalculate = useMutation({
    mutationFn: () => api.post(`/admin/contests/${contestId}/recalculate/`, {}),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["studio", "contest-leaderboard", contestId],
      });
      toast.success("Natijalar qayta hisoblanmoqda");
    },
    onError: (error: unknown) =>
      toast.error("Bajarilmadi", error instanceof Error ? error.message : String(error)),
  });

  const applyRatings = useMutation({
    mutationFn: () => api.post(`/admin/contests/${contestId}/apply-ratings/`, {}),
    onSuccess: () => toast.success("Reyting hisoblanmoqda"),
    onError: (error: unknown) =>
      toast.error("Bajarilmadi", error instanceof Error ? error.message : String(error)),
  });

  if (!contestId) return <NeedsSave what="natijalarni ko'rish" />;

  const rows = data?.rows ?? [];

  return (
    <WorkPanel
      title="Natijalar jadvali"
      hint={data ? `Yangilangan: ${formatDate(data.generated_at)}` : undefined}
      actions={
        <>
          <StButton
            variant="quiet"
            onClick={() => recalculate.mutate()}
            disabled={recalculate.isPending}
          >
            <RotateCcw className="size-3.5" />
            Qayta hisoblash
          </StButton>
          <StButton
            variant="brand"
            onClick={async () => {
              const ok = await confirm({
                title: "Reyting qo'llansinmi?",
                message:
                  "Ishtirokchilarning reytingi o'zgaradi. Bu amalni qaytarib bo'lmaydi.",
                confirmLabel: "Qo'llash",
              });
              if (ok) applyRatings.mutate();
            }}
            disabled={applyRatings.isPending}
          >
            <Trophy className="size-3.5" />
            Reytingni qo&apos;llash
          </StButton>
        </>
      }
      bodyClassName={rows.length ? "p-0" : "p-4"}
    >
      {isLoading ? (
        <div className="space-y-2 p-4">
          {[0, 1, 2].map((row) => (
            <div key={row} className="h-10 animate-pulse rounded bg-[var(--surface-hover)]" />
          ))}
        </div>
      ) : rows.length ? (
        <div className="overflow-x-auto">
          <table className="st-table">
            <thead>
              <tr>
                <th className="w-16">O&apos;rin</th>
                <th>Ishtirokchi</th>
                <th>Ball</th>
                <th>Yechgan</th>
                <th>Jarima</th>
                <th>Reyting o&apos;zgarishi</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="st-num font-semibold text-[var(--text)]">{row.rank ?? "—"}</td>
                  <td className="text-[var(--text-2)]">
                    {row.full_name || row.username}
                    <span className="ml-1.5 text-[13px] text-[var(--text-4)]">
                      @{row.username}
                    </span>
                  </td>
                  <td className="st-num text-[var(--text)]">{row.score}</td>
                  <td className="st-num text-[var(--text-2)]">{row.solved_count}</td>
                  <td className="st-num text-[var(--text-3)]">{row.penalty}</td>
                  <td className="st-num text-[var(--text-3)]">
                    {row.rating_before != null && row.rating_after != null
                      ? `${row.rating_before} → ${row.rating_after}`
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <WorkEmpty
          icon={<Trophy className="size-6" />}
          title="Natija yo'q"
          hint="Musobaqa boshlangach jadval avtomatik to'ladi."
        />
      )}
      {rows.length >= 500 ? (
        <p className="border-t border-[var(--st-edge-soft)] px-4 py-2.5 text-[13.5px] text-[var(--text-4)]">
          Faqat dastlabki 500 o&apos;rin ko&apos;rsatilgan. To&apos;liq ro&apos;yxat
          «Qatnashuvchilar» tabida sahifalab beriladi.
        </p>
      ) : null}
    </WorkPanel>
  );
}

/** «Qoidabuzarliklar» — anti-plagiat tekshiruvi. */
export function ContestViolationsTab({
  contestId,
  checkedAt,
}: {
  contestId: string | null;
  checkedAt?: string | null;
}) {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["studio", "contest-plagiarism", contestId, page],
    queryFn: () =>
      api.get<Paginated<{
        id: string;
        first_username: string;
        second_username: string;
        problem_title: string;
        similarity: number;
        status: string;
        created_at: string;
      }>>("/admin/plagiarism/", { contest: contestId, page, page_size: pageSize }),
    enabled: Boolean(contestId),
    placeholderData: keepPreviousData,
  });

  const scan = useMutation({
    mutationFn: () => api.post(`/admin/contests/${contestId}/scan-plagiarism/`, {}),
    onSuccess: () =>
      toast.success(
        "Tekshiruv boshlandi",
        "Natija bir necha daqiqadan so'ng shu yerda ko'rinadi.",
      ),
    onError: (error: unknown) =>
      toast.error("Boshlab bo'lmadi", error instanceof Error ? error.message : String(error)),
  });

  if (!contestId) return <NeedsSave what="qoidabuzarliklarni tekshirish" />;

  const rows = data?.results ?? [];

  return (
    <WorkPanel
      title="Qoidabuzarliklar"
      hint={
        checkedAt
          ? `Oxirgi tekshiruv: ${formatDate(checkedAt)}`
          : "Yechimlar o'xshashligi hali tekshirilmagan"
      }
      actions={
        <>
          <StButton variant="quiet" onClick={() => void refetch()}>
            <Search className="size-3.5" />
            Yangilash
          </StButton>
          <StButton variant="brand" onClick={() => scan.mutate()} disabled={scan.isPending}>
            <ScanSearch className="size-3.5" />
            Tekshiruvni boshlash
          </StButton>
        </>
      }
      bodyClassName={rows.length ? "p-0" : "p-4"}
    >
      {isLoading ? (
        <div className="space-y-2 p-4">
          {[0, 1].map((row) => (
            <div key={row} className="h-10 animate-pulse rounded bg-[var(--surface-hover)]" />
          ))}
        </div>
      ) : rows.length ? (
        <div className="overflow-x-auto">
          <table className="st-table">
            <thead>
              <tr>
                <th>Ishtirokchilar</th>
                <th>Masala</th>
                <th>O&apos;xshashlik</th>
                <th>Holat</th>
                <th>Aniqlangan</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="text-[var(--text)]">
                    @{row.first_username} ↔ @{row.second_username}
                  </td>
                  <td className="max-w-[220px] truncate text-[var(--text-2)]">
                    {row.problem_title}
                  </td>
                  <td>
                    <Verdict tone={row.similarity >= 90 ? "fail" : "warn"}>
                      {row.similarity}%
                    </Verdict>
                  </td>
                  <td className="text-[14px] text-[var(--text-3)]">{row.status}</td>
                  <td className="whitespace-nowrap text-[14px] text-[var(--text-4)]">
                    {formatRelative(row.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <WorkEmpty
          icon={<ScanSearch className="size-6" />}
          title="Qoidabuzarlik topilmadi"
          hint="Tekshiruv yechimlarni juftma-juft solishtirib, o'xshashligi yuqori bo'lganlarini belgilaydi."
        />
      )}
      <PanelPager page={page} count={data?.count ?? 0} pageSize={pageSize} onChange={setPage} />
    </WorkPanel>
  );
}

/** Panel ichidagi sahifalash — jadval ostida, faqat bir sahifadan ko'p bo'lsa. */
function PanelPager({
  page,
  count,
  pageSize,
  onChange,
}: {
  page: number;
  count: number;
  pageSize: number;
  onChange: (page: number) => void;
}) {
  const totalPages = Math.ceil(count / pageSize);
  if (totalPages <= 1) return null;
  return (
    <div className="flex justify-center border-t border-[var(--st-edge-soft)] p-2">
      <Pagination page={page} totalPages={totalPages} onChange={onChange} />
    </div>
  );
}

function NeedsSave({ what }: { what: string }) {
  return (
    <WorkPanel>
      <p className="text-[15px] text-[var(--text-4)]">
        {what.charAt(0).toUpperCase() + what.slice(1)} uchun avval olimpiadani saqlang.
      </p>
    </WorkPanel>
  );
}
