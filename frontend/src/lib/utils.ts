import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/* ==========================================================================
   Sana / son formatlash.

   `Intl` ning ko'p muhitida `uz-UZ` ma'lumotlari yo'q — u holda oylar "M07",
   nisbiy vaqt esa "-7 h" ko'rinishida chiqadi. Shuning uchun o'zbekcha
   formatlash qo'lda bajariladi va natija hamma joyda bir xil bo'ladi.
   ========================================================================== */

const MONTHS_UZ = [
  "yanvar", "fevral", "mart", "aprel", "may", "iyun",
  "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr",
];

const MONTHS_UZ_SHORT = [
  "yan", "fev", "mar", "apr", "may", "iyn",
  "iyl", "avg", "sen", "okt", "noy", "dek",
];

const WEEKDAYS_UZ = [
  "yakshanba", "dushanba", "seshanba", "chorshanba", "payshanba", "juma", "shanba",
];

function toDate(value?: string | number | Date | null): Date | null {
  if (value === null || value === undefined || value === "") return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

/** Uch xonali guruhlar bo'sh joy bilan ajratiladi: 1 234 567 (o'zbek yozuvi). */
export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const negative = value < 0;
  const [whole, fraction] = Math.abs(value).toString().split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${negative ? "−" : ""}${grouped}${fraction ? `,${fraction}` : ""}`;
}

export function formatCompact(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  if (Math.abs(value) < 1000) return String(value);
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 })
    .format(value)
    .toLowerCase();
}

/** `22 iyul 2026, 09:11` (yoki vaqtsiz: `22 iyul 2026`). */
export function formatDate(value?: string | number | Date | null, withTime = true): string {
  const date = toDate(value);
  if (!date) return "—";
  const base = `${date.getDate()} ${MONTHS_UZ[date.getMonth()]} ${date.getFullYear()}`;
  return withTime ? `${base}, ${pad2(date.getHours())}:${pad2(date.getMinutes())}` : base;
}

/** Qisqa ko'rinish — jadval va kartalar uchun: `22 iyl`. */
export function formatDateShort(value?: string | number | Date | null): string {
  const date = toDate(value);
  if (!date) return "—";
  const sameYear = date.getFullYear() === new Date().getFullYear();
  const base = `${date.getDate()} ${MONTHS_UZ_SHORT[date.getMonth()]}`;
  return sameYear ? base : `${base} ${date.getFullYear()}`;
}

/** `09:11` */
export function formatTime(value?: string | number | Date | null): string {
  const date = toDate(value);
  if (!date) return "—";
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

export function weekdayUz(value?: string | number | Date | null): string {
  const date = toDate(value);
  return date ? WEEKDAYS_UZ[date.getDay()] : "—";
}

export function monthUzShort(value?: string | number | Date | null): string {
  const date = toDate(value);
  return date ? MONTHS_UZ_SHORT[date.getMonth()] : "—";
}

/** `5 daqiqa oldin`, `3 kundan keyin`, `hozirgina`. */
export function formatRelative(value?: string | number | Date | null): string {
  const date = toDate(value);
  if (!date) return "—";

  const diffSeconds = Math.round((date.getTime() - Date.now()) / 1000);
  const past = diffSeconds < 0;
  const abs = Math.abs(diffSeconds);

  if (abs < 45) return past ? "hozirgina" : "hozir";

  const units: [number, string][] = [
    [60, "daqiqa"],
    [3600, "soat"],
    [86400, "kun"],
    [604800, "hafta"],
    [2592000, "oy"],
    [31536000, "yil"],
  ];

  let amount = 1;
  let unit = "daqiqa";
  for (let index = units.length - 1; index >= 0; index -= 1) {
    const [seconds, label] = units[index];
    if (abs >= seconds) {
      amount = Math.floor(abs / seconds);
      unit = label;
      break;
    }
  }

  return past ? `${amount} ${unit} oldin` : `${amount} ${unit}dan keyin`;
}

export function formatDuration(ms?: number | null): string {
  if (ms === null || ms === undefined) return "—";
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

export function formatBytes(kb?: number | null): string {
  if (kb === null || kb === undefined) return "—";
  if (kb < 1024) return `${kb} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

export function initials(name?: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function debounce<T extends (...args: never[]) => void>(fn: T, delay = 300) {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/['''`ʻʼ]/g, "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const escape = (val: unknown) => {
    const str = val === null || val === undefined ? "" : String(val);
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };
  const csv = [
    headers.join(","),
    ...rows.map((row) => headers.map((h) => escape(row[h])).join(",")),
  ].join("\n");

  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
