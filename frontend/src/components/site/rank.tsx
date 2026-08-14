"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

import { useAuth } from "@/components/providers";
import { publicApi } from "@/lib/public-api";
import { isElite, rankChipStyle, rankName, ringStyle, ringWidth } from "@/lib/rank";
import type { RankInfo } from "@/lib/types";
import { cn, formatNumber, initials } from "@/lib/utils";

/**
 * Rank nishoni — «Oltin II» kabi.
 *
 * Ranglar backenddan keladi (admin sozlamasi), shuning uchun nishon rangi
 * token emas, `rank.color` dan hisoblanadi. Oq kanvasda ham o'qilishi uchun
 * fon juda och yuvindi, chegara esa ingichka halqa.
 */
export function RankBadge({
  rank,
  size = "md",
  showRating,
  rating,
  className,
}: {
  rank: RankInfo | null | undefined;
  size?: "xs" | "sm" | "md" | "lg";
  /** Nom yonida reyting sonini ham ko'rsatish. */
  showRating?: boolean;
  rating?: number;
  className?: string;
}) {
  if (!rank) return null;

  const padding = {
    xs: "h-5 gap-1 px-1.5 text-[12px]",
    sm: "h-6 gap-1.5 px-2 text-[12px]",
    md: "h-7 gap-1.5 px-2.5 text-[13px]",
    lg: "h-9 gap-2 px-3.5 text-[15px]",
  }[size];

  return (
    <span
      title={`${rankName(rank)} · ${formatNumber(rank.min_rating)}+`}
      style={rankChipStyle(rank)}
      className={cn(
        "inline-flex shrink-0 items-center rounded-[var(--radius-xs)] font-semibold",
        padding,
        isElite(rank) && "",
        className,
      )}
    >
      <RankGlyph rank={rank} size={size === "lg" ? 16 : size === "xs" ? 10 : 12} />
      {rankName(rank)}
      {showRating && rating !== undefined ? (
        <span className="opacity-60">· {formatNumber(rating)}</span>
      ) : null}
    </span>
  );
}

/** Rank belgisi — qalqon shaklidagi kichik SVG. */
export function RankGlyph({ rank, size = 14 }: { rank: RankInfo; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className="shrink-0"
    >
      <path
        d="M12 2.5 20 6v6.2c0 4.4-3.2 8.2-8 9.3-4.8-1.1-8-4.9-8-9.3V6l8-3.5Z"
        fill="currentColor"
        opacity="0.22"
      />
      <path
        d="M12 2.5 20 6v6.2c0 4.4-3.2 8.2-8 9.3-4.8-1.1-8-4.9-8-9.3V6l8-3.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      {rank.division ? (
        <text
          x="12"
          y="15.5"
          textAnchor="middle"
          fontSize="8"
          fontWeight="700"
          fill="currentColor"
        >
          {rank.division}
        </text>
      ) : (
        <path
          d="m8.8 12.2 2.2 2.2 4.2-4.4"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}

/**
 * Rank halqali avatar — sayt sahifalari uchun yagona avatar.
 *
 * Halqa rangi rankdan keladi; eng yuqori ranklarda halqa sekin aylanadi
 * (``), rasm esa teskari aylanib tik turadi.
 */
export function RankAvatar({
  src,
  name,
  size = 40,
  rank,
  className,
}: {
  src?: string | null;
  name?: string | null;
  size?: number;
  rank?: RankInfo | null;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src) && !failed;
  const ring = ringWidth(size);
  const inner = rank ? size - ring * 2 : size;

  const face = (
    <span
      style={{ width: inner, height: inner, fontSize: Math.max(10, inner * 0.36) }}
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full",
        "bg-[var(--green-wash-2)] font-semibold uppercase text-[var(--green-text)]",
        !rank && className,
      )}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src as string}
          alt=""
          onError={() => setFailed(true)}
          className="size-full object-cover"
        />
      ) : (
        initials(name)
      )}
    </span>
  );

  if (!rank) return face;

  return (
    <span
      title={rank.name_uz}
      style={{ width: size, height: size, ...ringStyle(rank, size) }}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full",
        isElite(rank) && "",
        className,
      )}
    >
      {face}
    </span>
  );
}

/** Rank + keyingi rankgacha qolgan yo'l — profil yon ustuni uchun. */
export function RankProgress({ rank, rating }: { rank: RankInfo; rating: number }) {

  return (
    <div className="w-full">
      <div className="flex items-center gap-3">
        <span
          style={rankChipStyle(rank)}
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-sm)]",
            isElite(rank) && "",
          )}
        >
          <RankGlyph rank={rank} size={24} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[16px] font-semibold" style={{ color: rank.color }}>
            {rankName(rank)}
          </p>
          <p className="ts-sm text-[var(--text-3)]">
            {rank.is_max
              ? `Eng yuqori rank · reyting ${formatNumber(rating)}`
              : `Reyting ${formatNumber(rating)} · ${rank.next_name_uz} gacha ${formatNumber(rank.to_next)}`}
          </p>
        </div>
      </div>

      <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-sunk)]">
        {/* To'ldirma bir tekis rang — gradient chiziq bezak bo'lib qolardi */}
        <div
          className="h-full rounded-full transition-[width] duration-[var(--dur-2)] ease-[var(--ease)]"
          style={{
            width: `${rank.progress}%`,
            backgroundColor: rank.color,
          }}
        />
      </div>
      <div className="ts-num mt-1 flex justify-between text-[12px] text-[var(--text-4)]">
        <span>{formatNumber(rank.min_rating)}</span>
        <span>{rank.next_rating ? formatNumber(rank.next_rating) : "∞"}</span>
      </div>
    </div>
  );
}

/**
 * Ranklar zinasi — «qanday ko'tarilaman» degan savolga javob.
 *
 * Yig'ilgan holatda faqat guruhlar (Bronza…Afsona) ko'rinadi; ochilganda
 * har bir pog'ona va unga kerakli reyting chiqadi. Foydalanuvchining hozirgi
 * pog'onasi brend chizig'i bilan ajratiladi.
 */
export function RankLadder({ className }: { className?: string }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  const { data } = useQuery({
    queryKey: ["ranks"],
    queryFn: () => publicApi.ranks(),
    staleTime: 60 * 60 * 1000,
  });

  const rows = data?.ranks ?? [];
  if (!rows.length) return null;

  const currentTier = user?.rank?.tier;

  return (
    <div className={cn("card rounded-[var(--radius-lg)] p-4 sm:p-5", className)}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="ring-focus flex w-full items-center justify-between gap-3 rounded-[var(--radius-sm)] text-left"
      >
        <div className="min-w-0">
          <p className="text-[15px] font-semibold text-[var(--text)]">Ranklar zinasi</p>
          <p className="ts-sm mt-0.5 text-[var(--text-3)]">
            Reyting o&apos;sgani sari rank ko&apos;tariladi — avatar ramkasi ham o&apos;zgaradi
          </p>
        </div>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-[var(--text-4)] transition-transform duration-[var(--dur-2)]",
            open && "rotate-180",
          )}
        />
      </button>

      {/* Yig'ilgan holat — guruhlar bo'yicha qisqacha */}
      {!open ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {(data?.groups ?? []).map((group) => (
            <span
              key={group.key}
              className="inline-flex items-center gap-1.5 rounded-[var(--radius-xs)] border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1 text-[12.5px] font-medium text-[var(--text-2)]"
            >
              <span className="size-2.5 rounded-full" style={{ backgroundColor: group.color }} />
              {group.name_uz}
            </span>
          ))}
        </div>
      ) : (
        <ul className="mt-4 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((row) => {
            const active = row.tier === currentTier;
            return (
              <li
                key={row.code}
                className={cn(
                  "flex items-center gap-2.5 rounded-[var(--radius-sm)] border px-3 py-2 transition-colors",
                  active
                    ? "edge-green border-[var(--green-line)] bg-[var(--green-wash)]"
                    : "border-[var(--line)] bg-[var(--surface)]",
                )}
              >
                <span
                  style={rankChipStyle(row as unknown as RankInfo)}
                  className="flex size-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)]"
                >
                  <RankGlyph rank={row as unknown as RankInfo} size={15} />
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className="block truncate text-[14px] font-medium"
                    style={{ color: row.color }}
                  >
                    {row.name_uz}
                  </span>
                  <span className="ts-num block text-[12px] text-[var(--text-4)]">
                    {formatNumber(row.min_rating)}
                    {row.max_rating ? `–${formatNumber(row.max_rating)}` : "+"}
                  </span>
                </span>
                {active ? (
                  <span className="shrink-0 text-[12px] font-semibold text-[var(--green-text)]">siz</span>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
