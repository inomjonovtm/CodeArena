"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

import { useAuth, useI18n } from "@/components/providers";
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
  const { locale } = useI18n();
  if (!rank) return null;

  const padding = {
    xs: "h-5 gap-1 px-1.5 text-[10.5px]",
    sm: "h-6 gap-1.5 px-2 text-[11.5px]",
    md: "h-7 gap-1.5 px-2.5 text-[12.5px]",
    lg: "h-9 gap-2 px-3.5 text-[14px]",
  }[size];

  return (
    <span
      title={`${rankName(rank, locale)} · ${formatNumber(rank.min_rating)}+`}
      style={rankChipStyle(rank)}
      className={cn(
        "inline-flex shrink-0 items-center rounded-[var(--r-chip)] font-semibold",
        padding,
        isElite(rank) && "animate-rank-glow",
        className,
      )}
    >
      <RankGlyph rank={rank} size={size === "lg" ? 16 : size === "xs" ? 10 : 12} />
      {rankName(rank, locale)}
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
 * (`animate-rank-spin`), rasm esa teskari aylanib tik turadi.
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
        "bg-[var(--brand-wash-strong)] font-semibold uppercase text-[var(--brand-ink)]",
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
        isElite(rank) && "animate-rank-spin",
        className,
      )}
    >
      {face}
    </span>
  );
}

/** Rank + keyingi rankgacha qolgan yo'l — profil yon ustuni uchun. */
export function RankProgress({ rank, rating }: { rank: RankInfo; rating: number }) {
  const { locale } = useI18n();

  return (
    <div className="w-full">
      <div className="flex items-center gap-3">
        <span
          style={rankChipStyle(rank)}
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-[var(--r-ctl)]",
            isElite(rank) && "animate-rank-glow",
          )}
        >
          <RankGlyph rank={rank} size={24} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold" style={{ color: rank.color }}>
            {rankName(rank, locale)}
          </p>
          <p className="t-meta text-[var(--ink-3)]">
            {rank.is_max
              ? `Eng yuqori rank · reyting ${formatNumber(rating)}`
              : `Reyting ${formatNumber(rating)} · ${rank.next_name_uz} gacha ${formatNumber(rank.to_next)}`}
          </p>
        </div>
      </div>

      <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-[var(--pane-sunken)]">
        {/* To'ldirma bir tekis rang — gradient chiziq bezak bo'lib qolardi */}
        <div
          className="h-full rounded-full transition-[width] duration-[var(--t-slow)] ease-[var(--ease-soft)]"
          style={{
            width: `${rank.progress}%`,
            backgroundColor: rank.color,
          }}
        />
      </div>
      <div className="t-num mt-1 flex justify-between text-[11px] text-[var(--ink-4)]">
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
    <div className={cn("pane rounded-[var(--r-pane)] p-4 sm:p-5", className)}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="focus-ring flex w-full items-center justify-between gap-3 rounded-[var(--r-ctl)] text-left"
      >
        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-[var(--ink)]">Ranklar zinasi</p>
          <p className="t-meta mt-0.5 text-[var(--ink-3)]">
            Reyting o&apos;sgani sari rank ko&apos;tariladi — avatar ramkasi ham o&apos;zgaradi
          </p>
        </div>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-[var(--ink-4)] transition-transform duration-[var(--t-base)]",
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
              className="inline-flex items-center gap-1.5 rounded-[var(--r-chip)] border border-[var(--edge)] bg-[var(--pane-solid)] px-2.5 py-1 text-[12px] font-medium text-[var(--ink-2)]"
            >
              <span className="size-2.5 rounded-full" style={{ backgroundColor: group.color }} />
              {group.name_uz}
            </span>
          ))}
        </div>
      ) : (
        <ul className="enter-stagger mt-4 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((row) => {
            const active = row.tier === currentTier;
            return (
              <li
                key={row.code}
                className={cn(
                  "flex items-center gap-2.5 rounded-[var(--r-field)] border px-3 py-2 transition-colors",
                  active
                    ? "edge-brand border-[var(--brand-edge)] bg-[var(--brand-wash)]"
                    : "border-[var(--edge)] bg-[var(--pane-solid)]",
                )}
              >
                <span
                  style={rankChipStyle(row as unknown as RankInfo)}
                  className="flex size-7 shrink-0 items-center justify-center rounded-[var(--r-ctl)]"
                >
                  <RankGlyph rank={row as unknown as RankInfo} size={15} />
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className="block truncate text-[13px] font-medium"
                    style={{ color: row.color }}
                  >
                    {row.name_uz}
                  </span>
                  <span className="t-num block text-[11.5px] text-[var(--ink-4)]">
                    {formatNumber(row.min_rating)}
                    {row.max_rating ? `–${formatNumber(row.max_rating)}` : "+"}
                  </span>
                </span>
                {active ? (
                  <span className="shrink-0 text-[11px] font-semibold text-[var(--brand-ink)]">siz</span>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
