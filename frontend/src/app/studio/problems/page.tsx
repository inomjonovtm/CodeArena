"use client";

import { useQuery } from "@tanstack/react-query";
import { Plus, Puzzle, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { useAuth } from "@/components/providers";
import { Verdict, WorkBody, WorkEmpty, WorkError, WorkHeader, WorkPanel } from "@/components/studio/workbench";
import { Pagination } from "@/components/ui/pagination";
import { useTableQuery } from "@/hooks/use-table-query";
import { resource } from "@/lib/api";
import type { ProblemListItem } from "@/lib/types";
import { formatRelative } from "@/lib/utils";

const problems = resource<ProblemListItem>("problems");

const DIFFICULTY_LABEL: Record<string, string> = {
  easy: "Oson",
  medium: "O'rta",
  hard: "Qiyin",
};

const STATUS_FILTERS = [
  { value: "", label: "Hammasi" },
  { value: "draft", label: "Qoralama" },
  { value: "published", label: "Chop etilgan" },
  { value: "archived", label: "Arxiv" },
];

export default function StudioProblemsPage() {
  const { user } = useAuth();
  const table = useTableQuery({ pageSize: 20, ordering: "-updated_at" });
  const [onlyMine, setOnlyMine] = useState(false);

  const params = onlyMine && user ? { ...table.params, author: user.username } : table.params;

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["studio", "problems", params],
    queryFn: () => problems.list(params),
  });

  const rows = data?.results ?? [];

  return (
    <>
      <WorkHeader
        breadcrumbs={[{ href: "/studio", label: "Studio" }]}
        title="Masalalar"
        meta={
          data ? (
            <span className="st-num text-[15px] text-[var(--text-4)]">{data.count} ta</span>
          ) : null
        }
        actions={
          <Link
            href="/studio/problems/new"
            className="inline-flex h-9 items-center gap-2 rounded-[var(--radius-sm)] bg-[var(--green)] px-4 text-[15px] font-semibold text-[var(--text-on-green)] transition-colors hover:bg-[var(--green-hover)]"
          >
            <Plus className="size-4" />
            Yangi masala
          </Link>
        }
      />

      <WorkBody wide className="space-y-4">
        {/* Filtrlar */}
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative flex-1 min-w-[220px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--text-4)]" />
            <input
              type="search"
              value={table.search}
              onChange={(event) => table.setSearch(event.target.value)}
              placeholder="Sarlavha yoki slug bo'yicha qidirish"
              className="st-sunken h-9 w-full pl-9 pr-3 text-[15.5px] text-[var(--text)] outline-none placeholder:text-[var(--text-4)] focus-visible:border-[var(--green-line)]"
            />
          </label>

          <div className="st-sunken flex items-center gap-0.5 p-0.5">
            {STATUS_FILTERS.map((filter) => {
              const active = (table.filters.status ?? "") === filter.value;
              return (
                <button
                  key={filter.value || "all"}
                  type="button"
                  onClick={() => table.setFilter("status", filter.value || undefined)}
                  data-active={active}
                  className="h-8 rounded-[7px] px-3 text-[15px] font-medium text-[var(--text-3)] transition-colors hover:text-[var(--text)] data-[active=true]:bg-[var(--green-wash)] data-[active=true]:text-[var(--text)]"
                >
                  {filter.label}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setOnlyMine((value) => !value)}
            data-active={onlyMine}
            className="st-sunken h-9 px-3.5 text-[15px] font-medium text-[var(--text-3)] transition-colors hover:text-[var(--text)] data-[active=true]:border-[var(--green-line)] data-[active=true]:bg-[var(--green-wash)] data-[active=true]:text-[var(--text)]"
          >
            Mening masalalarim
          </button>
        </div>

        <WorkPanel bodyClassName="p-0">
          {isLoading ? (
            <div className="space-y-px p-4">
              {[0, 1, 2, 3, 4].map((row) => (
                <div key={row} className="h-11 animate-pulse rounded bg-[var(--surface-hover)]" />
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
                    <th>Masala</th>
                    <th>Qiyinlik</th>
                    <th>Testlar</th>
                    <th>Limitlar</th>
                    <th>Holat</th>
                    <th>Muallif</th>
                    <th>O&apos;zgargan</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td className="max-w-[380px]">
                        <Link
                          href={`/studio/problems/${row.id}`}
                          className="block min-w-0 font-medium text-[var(--text)] transition-colors hover:text-[var(--green-text)]"
                        >
                          <span className="block truncate">{row.title_uz}</span>
                          <span className="block truncate font-mono text-[13px] text-[var(--text-4)]">
                            {row.slug}
                          </span>
                        </Link>
                      </td>
                      <td className="text-[var(--text-2)]">
                        {DIFFICULTY_LABEL[row.difficulty] ?? row.difficulty}
                      </td>
                      <td className="st-num">
                        {/* Testsiz masala chop etilmaydi — buni ro'yxatdayoq
                            ko'rsatish qidirib yurish vaqtini tejaydi. */}
                        {row.test_case_count ? (
                          <span className="text-[var(--text-2)]">{row.test_case_count}</span>
                        ) : (
                          <Verdict tone="fail">yo&apos;q</Verdict>
                        )}
                      </td>
                      <td className="st-num whitespace-nowrap text-[14px] text-[var(--text-4)]">
                        {row.time_limit_ms} ms · {Math.round(row.memory_limit_kb / 1024)} MB
                      </td>
                      <td>
                        <Verdict tone={row.status === "published" ? "pass" : "idle"}>
                          {row.status === "published"
                            ? "chop etilgan"
                            : row.status === "archived"
                              ? "arxiv"
                              : "qoralama"}
                        </Verdict>
                      </td>
                      <td className="text-[14px] text-[var(--text-4)]">
                        {row.author_username ? `@${row.author_username}` : "—"}
                      </td>
                      <td className="whitespace-nowrap text-[14px] text-[var(--text-4)]">
                        {formatRelative(row.updated_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-4">
              <WorkEmpty
                icon={<Puzzle className="size-6" />}
                title="Masala topilmadi"
                hint="Qidiruv shartlarini o'zgartiring yoki yangi masala yarating."
                action={
                  <Link
                    href="/studio/problems/new"
                    className="inline-flex h-9 items-center gap-2 rounded-[var(--radius-sm)] bg-[var(--green)] px-4 text-[15px] font-semibold text-[var(--text-on-green)] transition-colors hover:bg-[var(--green-hover)]"
                  >
                    <Plus className="size-4" />
                    Yangi masala
                  </Link>
                }
              />
            </div>
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
