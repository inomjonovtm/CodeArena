"use client";

import { useQuery } from "@tanstack/react-query";
import { Plus, Search, Trophy } from "lucide-react";
import Link from "next/link";

import { Verdict, WorkBody, WorkEmpty, WorkError, WorkHeader, WorkPanel } from "@/components/studio/workbench";
import { Pagination } from "@/components/ui/pagination";
import { useTableQuery } from "@/hooks/use-table-query";
import { resource } from "@/lib/api";
import type { Contest } from "@/lib/types";
import { formatDate } from "@/lib/utils";

const contests = resource<Contest>("contests");

const STATUS_LABEL: Record<string, string> = {
  draft: "qoralama",
  scheduled: "rejalashtirilgan",
  running: "davom etmoqda",
  finished: "tugagan",
  cancelled: "bekor qilingan",
};

/** Davomiylikni `02:00:00` ko'rinishida yozadi. */
function duration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(rest).padStart(2, "0")}:00`;
}

export default function StudioContestsPage() {
  const table = useTableQuery({ pageSize: 20, ordering: "-start_time" });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["studio", "contests", table.params],
    queryFn: () => contests.list(table.params),
  });

  const rows = data?.results ?? [];

  return (
    <>
      <WorkHeader
        breadcrumbs={[{ href: "/studio", label: "Studio" }]}
        title="Olimpiadalar"
        meta={
          data ? (
            <span className="st-num text-[15px] text-[var(--text-4)]">{data.count} ta</span>
          ) : null
        }
        actions={
          <Link
            href="/studio/contests/new"
            className="inline-flex h-9 items-center gap-2 rounded-[var(--radius-sm)] bg-[var(--green)] px-4 text-[15px] font-semibold text-[var(--text-on-green)] transition-colors hover:bg-[var(--green-hover)]"
          >
            <Plus className="size-4" />
            Yangi olimpiada
          </Link>
        }
      />

      <WorkBody wide className="space-y-4">
        <label className="relative block max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--text-4)]" />
          <input
            type="search"
            value={table.search}
            onChange={(event) => table.setSearch(event.target.value)}
            placeholder="Nomi bo'yicha qidirish"
            className="st-sunken h-9 w-full pl-9 pr-3 text-[15.5px] text-[var(--text)] outline-none placeholder:text-[var(--text-4)] focus-visible:border-[var(--green-line)]"
          />
        </label>

        <WorkPanel bodyClassName={rows.length ? "p-0" : "p-4"}>
          {isLoading ? (
            <div className="space-y-2 p-4">
              {[0, 1, 2, 3].map((row) => (
                <div key={row} className="h-12 animate-pulse rounded bg-[var(--surface-hover)]" />
              ))}
            </div>
          ) : isError ? (
            <div className="p-4">
              <WorkError onRetry={() => void refetch()} />
            </div>
          ) : rows.length ? (
            <div className="overflow-x-auto">
              <table className="st-table">
                <thead>
                  <tr>
                    <th>Olimpiada</th>
                    <th>Vaqti</th>
                    <th>Davomiylik</th>
                    <th>Masala</th>
                    <th>Ishtirokchi</th>
                    <th>Holat</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td className="max-w-[320px]">
                        <Link
                          href={`/studio/contests/${row.id}`}
                          className="block min-w-0 font-medium text-[var(--text)] transition-colors hover:text-[var(--green-text)]"
                        >
                          <span className="block truncate">{row.title_uz}</span>
                          <span className="block truncate font-mono text-[13px] text-[var(--text-4)]">
                            {row.slug}
                          </span>
                        </Link>
                      </td>
                      <td className="whitespace-nowrap text-[14px] text-[var(--text-3)]">
                        <span className="block">{formatDate(row.start_time)}</span>
                        <span className="block text-[var(--text-4)]">
                          {formatDate(row.end_time)}
                        </span>
                      </td>
                      <td className="st-num whitespace-nowrap text-[var(--text-2)]">
                        {duration(row.duration_minutes)}
                      </td>
                      <td className="st-num text-[var(--text-2)]">{row.problem_count ?? 0}</td>
                      <td className="st-num text-[var(--text-2)]">{row.participant_count ?? 0}</td>
                      <td>
                        <Verdict
                          tone={
                            row.computed_status === "running"
                              ? "warn"
                              : row.computed_status === "finished"
                                ? "pass"
                                : "idle"
                          }
                        >
                          {STATUS_LABEL[row.computed_status] ?? row.computed_status}
                        </Verdict>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <WorkEmpty
              icon={<Trophy className="size-6" />}
              title="Olimpiada yo'q"
              hint="Yangi olimpiada yarating, masalalarni biriktiring va hakamlarni qo'shing."
              action={
                <Link
                  href="/studio/contests/new"
                  className="inline-flex h-9 items-center gap-2 rounded-[var(--radius-sm)] bg-[var(--green)] px-4 text-[15px] font-semibold text-[var(--text-on-green)] transition-colors hover:bg-[var(--green-hover)]"
                >
                  <Plus className="size-4" />
                  Yangi olimpiada
                </Link>
              }
            />
          )}
        </WorkPanel>

        {data && data.count > table.pageSize ? (
          <Pagination
            page={table.page}
            totalPages={Math.ceil(data.count / table.pageSize)}
            onChange={table.setPage}
          />
        ) : null}
      </WorkBody>
    </>
  );
}
