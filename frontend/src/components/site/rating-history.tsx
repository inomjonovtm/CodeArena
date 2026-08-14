"use client";

import { useQuery } from "@tanstack/react-query";
import { Trophy, Zap } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

import { Empty, Pane, TextLines } from "@/components/kit";
import { publicApi } from "@/lib/public-api";
import { formatRelative } from "@/lib/utils";

/* ==========================================================================
   Reyting o'sishi — grafik va sabablar ro'yxati
   --------------------------------------------------------------------------
   Ilgari reyting bitta son edi: u qachon va NEGA o'zgargani hech qayerda
   ko'rinmasdi. Odam o'z o'sishini kuzata olmasdi va «reytingim nega
   tushdi?» degan savolga javob yo'q edi.

   Grafik ataylab SODDA: bitta chiziq, o'q belgilarisiz, gradientsiz.
   Muhimi — shakl: chiziq ko'tarilyaptimi yoki tekis turibdimi.
   ========================================================================== */

const WIDTH = 640;
const HEIGHT = 120;

export function RatingHistory({ username }: { username: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["rating-history", username],
    queryFn: () => publicApi.ratingHistory(username),
    enabled: Boolean(username),
    staleTime: 5 * 60_000,
  });

  const points = useMemo(() => {
    if (!data?.changes.length) return "";

    // Birinchi nuqta — boshlang'ich reyting, keyin har bir o'zgarish.
    const series = [data.start, ...data.changes.map((row) => row.rating_after)];
    const min = Math.min(...series);
    const max = Math.max(...series);
    const span = Math.max(1, max - min);

    return series
      .map((value, index) => {
        const x = (index / Math.max(1, series.length - 1)) * WIDTH;
        const y = HEIGHT - ((value - min) / span) * (HEIGHT - 8) - 4;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }, [data]);

  if (isLoading) {
    return (
      <Pane inset="lg">
        <TextLines lines={5} />
      </Pane>
    );
  }

  if (!data?.changes.length) {
    return (
      <Pane inset="lg">
        <Empty
          compact
          icon={<Zap className="size-6" />}
          title="Reyting hali o'zgarmagan"
          description="O'zingizdan kuchliroq masalani yeching — reyting o'sha zahoti o'sadi."
        />
      </Pane>
    );
  }

  const latest = data.changes[data.changes.length - 1];

  return (
    <Pane inset="lg">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <div>
          <p className="ts-label">Reyting o&apos;sishi</p>
          <p className="ts-sm mt-1 text-[var(--text-3)]">
            Qiyinroq masala — kattaroq o&apos;sish. Oson masala reytingni
            deyarli qimirlatmaydi.
          </p>
        </div>
        <p className="ts-num text-[var(--text-4)]">
          {data.start} → <span className="font-semibold text-[var(--text)]">{data.current}</span>
        </p>
      </div>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={`Reyting ${data.start} dan ${data.current} gacha o'sdi`}
        className="mt-5 h-28 w-full"
      >
        <polyline
          points={points}
          fill="none"
          stroke="var(--green)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      <ul className="mt-5 flex flex-col divide-y divide-[var(--line-soft)] border-t border-[var(--line-soft)]">
        {[...data.changes].reverse().slice(0, 8).map((row) => (
          <li key={row.id} className="flex items-center gap-3 py-2.5">
            <span className="text-[var(--text-4)]">
              {row.kind === "contest" ? (
                <Trophy className="size-4" />
              ) : (
                <Zap className="size-4" />
              )}
            </span>

            <span className="ts-sm min-w-0 flex-1 truncate text-[var(--text-2)]">
              {row.problem_slug ? (
                <Link
                  href={`/problems/${row.problem_slug}`}
                  className="hover:text-[var(--green-text)]"
                >
                  {row.note}
                </Link>
              ) : row.contest_slug ? (
                <Link
                  href={`/contests/${row.contest_slug}`}
                  className="hover:text-[var(--green-text)]"
                >
                  {row.note}
                </Link>
              ) : (
                row.note || row.kind_label
              )}
            </span>

            <span
              className={`ts-num ts-sm shrink-0 font-semibold ${
                row.delta >= 0 ? "text-[var(--green-text)]" : "text-[var(--text-3)]"
              }`}
            >
              {row.delta >= 0 ? "+" : ""}
              {row.delta}
            </span>
            <span className="ts-num ts-xs w-12 shrink-0 text-right text-[var(--text-4)]">
              {row.rating_after}
            </span>
            <span className="ts-xs hidden w-24 shrink-0 text-right text-[var(--text-4)] sm:block">
              {formatRelative(row.created_at)}
            </span>
          </li>
        ))}
      </ul>

      {latest ? (
        <p className="ts-xs mt-3 text-[var(--text-4)]">
          Eng yuqori qiymat: <span className="ts-num">{data.max}</span>
        </p>
      ) : null}
    </Pane>
  );
}
