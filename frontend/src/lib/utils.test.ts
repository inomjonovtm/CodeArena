/**
 * Formatlash yordamchilari.
 *
 * Bu funksiyalar saytning HAR BIR sahifasida ishlatiladi: sana, son, nisbiy
 * vaqt. Ular buzilsa xato "500" ko'rinishida chiqmaydi — shunchaki hamma
 * joyda «—» yoki «Invalid Date» paydo bo'ladi va buni faqat foydalanuvchi
 * ko'radi. Shu sababli chetki holatlar (null, noto'g'ri sana, manfiy son)
 * alohida tekshiriladi.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  formatBytes,
  formatCompact,
  formatDate,
  formatDateShort,
  formatDuration,
  formatNumber,
  formatRelative,
  formatTime,
  initials,
  slugify,
  weekdayUz,
} from "./utils";

afterEach(() => {
  vi.useRealTimers();
});

/**
 * Guruh ajratgichi — ODDIY BO'SHLIQ EMAS, `U+2009` (ingichka bo'shliq).
 * Aynan shu belgi tanlangani muhim: oddiy bo'shliqda "1 234" qator oxirida
 * ikkiga bo'linib ketishi mumkin. Testda uni ko'z bilan ajratib bo'lmaydi,
 * shuning uchun kod bilan yoziladi.
 */
const THIN = " ";
/** Matematik minus (`U+2212`) — defis emas: raqamlar bilan bir balandlikda. */
const MINUS = "−";

describe("formatNumber", () => {
  it("uch xonali guruhlarni ingichka bo'shliq bilan ajratadi", () => {
    expect(formatNumber(1234567)).toBe(`1${THIN}234${THIN}567`);
    expect(formatNumber(1000)).toBe(`1${THIN}000`);
  });

  it("oddiy bo'shliq ISHLATILMAYDI", () => {
    // Qator oxirida son ikkiga bo'linib ketmasligi uchun
    expect(formatNumber(1000)).not.toContain(" ");
  });

  it("kichik sonlarni o'zgartirmaydi", () => {
    expect(formatNumber(0)).toBe("0");
    expect(formatNumber(999)).toBe("999");
  });

  it("manfiy sonda matematik minus qo'yadi", () => {
    expect(formatNumber(-1500)).toBe(`${MINUS}1${THIN}500`);
  });

  it("kasrni vergul bilan beradi", () => {
    expect(formatNumber(1234.5)).toBe(`1${THIN}234,5`);
  });

  it("bo'sh qiymatlarda chiziqcha qaytaradi", () => {
    expect(formatNumber(null)).toBe("—");
    expect(formatNumber(undefined)).toBe("—");
    expect(formatNumber(NaN)).toBe("—");
  });
});

describe("formatCompact", () => {
  it("mingdan kichik sonni o'zgartirmaydi", () => {
    expect(formatCompact(999)).toBe("999");
  });

  it("katta sonni qisqartiradi", () => {
    expect(formatCompact(1500)).toBe("1.5k");
    expect(formatCompact(2_000_000)).toBe("2m");
  });

  it("bo'sh qiymat", () => {
    expect(formatCompact(null)).toBe("—");
  });
});

describe("formatDate", () => {
  it("o'zbekcha oy nomini ishlatadi", () => {
    // Intl `uz-UZ` ni bilmasligi mumkin — shuning uchun qo'lda formatlaymiz
    expect(formatDate(new Date(2026, 6, 22, 9, 11))).toBe("22 iyul 2026, 09:11");
  });

  it("vaqtsiz varianti", () => {
    expect(formatDate(new Date(2026, 0, 5), false)).toBe("5 yanvar 2026");
  });

  it("soat va daqiqani ikki xonaga to'ldiradi", () => {
    expect(formatDate(new Date(2026, 0, 1, 5, 7))).toContain("05:07");
  });

  it("noto'g'ri sanada chiziqcha", () => {
    expect(formatDate("umuman-sana-emas")).toBe("—");
    expect(formatDate(null)).toBe("—");
    expect(formatDate("")).toBe("—");
  });
});

describe("formatDateShort", () => {
  it("joriy yilda yilni ko'rsatmaydi", () => {
    const now = new Date();
    const result = formatDateShort(new Date(now.getFullYear(), 6, 22));
    expect(result).toBe("22 iyl");
  });

  it("boshqa yilda yilni qo'shadi", () => {
    expect(formatDateShort(new Date(2001, 6, 22))).toBe("22 iyl 2001");
  });
});

describe("formatTime va weekdayUz", () => {
  it("vaqtni ikki xonada beradi", () => {
    expect(formatTime(new Date(2026, 0, 1, 3, 4))).toBe("03:04");
  });

  it("hafta kunini o'zbekcha beradi", () => {
    // 2026-07-22 — chorshanba
    expect(weekdayUz(new Date(2026, 6, 22))).toBe("chorshanba");
  });
});

describe("formatRelative", () => {
  it("yaqin o'tmish — hozirgina", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 1, 12, 0, 0));
    expect(formatRelative(new Date(2026, 0, 1, 11, 59, 50))).toBe("hozirgina");
  });

  it("o'tmishdagi vaqt", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 1, 12, 0, 0));
    expect(formatRelative(new Date(2026, 0, 1, 11, 55, 0))).toBe("5 daqiqa oldin");
    expect(formatRelative(new Date(2026, 0, 1, 9, 0, 0))).toBe("3 soat oldin");
    expect(formatRelative(new Date(2025, 11, 29, 12, 0, 0))).toBe("3 kun oldin");
  });

  it("kelajakdagi vaqt", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 1, 12, 0, 0));
    expect(formatRelative(new Date(2026, 0, 1, 14, 0, 0))).toBe("2 soatdan keyin");
  });

  it("eng katta mos birlikni tanlaydi", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 1, 12, 0, 0));
    // 400 kun oldin — «yil» bo'lishi kerak, «kun» emas
    expect(formatRelative(new Date(2024, 10, 27, 12, 0, 0))).toContain("yil");
  });

  it("bo'sh qiymat", () => {
    expect(formatRelative(null)).toBe("—");
  });
});

describe("formatDuration va formatBytes", () => {
  it("millisekund", () => {
    expect(formatDuration(999)).toBe("999 ms");
    expect(formatDuration(0)).toBe("0 ms");
  });

  it("sekund", () => {
    expect(formatDuration(1500)).toBe("1.50 s");
  });

  it("kilobayt va megabayt", () => {
    expect(formatBytes(512)).toBe("512 KB");
    expect(formatBytes(2048)).toBe("2.0 MB");
  });

  it("bo'sh qiymatlar", () => {
    expect(formatDuration(null)).toBe("—");
    expect(formatBytes(undefined)).toBe("—");
  });
});

describe("initials", () => {
  it("ism va familiyadan bosh harflar", () => {
    expect(initials("Alisher Navoiy")).toBe("AN");
  });

  it("bitta so'zdan ikki harf", () => {
    expect(initials("codearena")).toBe("CO");
  });

  it("uch so'zda birinchi va oxirgi", () => {
    expect(initials("Abu Ali ibn Sino")).toBe("AS");
  });

  it("ortiqcha bo'shliqlar", () => {
    expect(initials("  Alisher   Navoiy  ")).toBe("AN");
  });

  it("bo'sh qiymat", () => {
    expect(initials("")).toBe("?");
    expect(initials(null)).toBe("?");
  });
});

describe("slugify", () => {
  it("kichik harf va chiziqcha", () => {
    expect(slugify("Ikki Yig'indi")).toBe("ikki-yigindi");
  });

  it("chetdagi chiziqchalarni olib tashlaydi", () => {
    expect(slugify("!!! Salom !!!")).toBe("salom");
  });

  it("ketma-ket belgilarni bitta chiziqchaga yig'adi", () => {
    expect(slugify("a   b---c")).toBe("a-b-c");
  });

  it("uzunligi cheklangan", () => {
    expect(slugify("a".repeat(200)).length).toBeLessThanOrEqual(80);
  });

  it("faqat belgilardan iborat matn bo'sh natija beradi", () => {
    expect(slugify("!!!")).toBe("");
  });
});
