/**
 * Brauzerdagi xatoni serverga yetkazadi.
 *
 * Nima uchun: klientda yuz bergan xato foydalanuvchining konsolida qolib
 * ketadi — biz uni hech qachon ko'rmaymiz. Foydalanuvchi esa odatda xabar
 * bermaydi, shunchaki ketadi. Server tomonida esa log (va Sentry, agar
 * `SENTRY_DSN` sozlangan bo'lsa) allaqachon bor, shuning uchun xatoni
 * o'sha yerga yuborish yetadi — frontendga og'ir SDK qo'shish shart emas.
 *
 * Yuborilmaydigan narsalar: cookie, localStorage, forma qiymatlari. Faqat
 * xato matni, izi, sahifa manzili va brauzer versiyasi ketadi.
 */

/** Bir sahifa umrida shuncha xatodan ko'pi yuborilmaydi. */
const MAX_PER_SESSION = 5;
let sent = 0;

/** Bir xil xato takrorlanaversa, u faqat bir marta yuboriladi. */
const seen = new Set<string>();

export function reportError(error: unknown, context?: Record<string, string>) {
  if (typeof window === "undefined") return;
  if (sent >= MAX_PER_SESSION) return;

  const err = error instanceof Error ? error : new Error(String(error));
  const fingerprint = `${err.name}:${err.message}`;
  if (seen.has(fingerprint)) return;
  seen.add(fingerprint);
  sent += 1;

  const payload = {
    message: err.message.slice(0, 500),
    name: err.name.slice(0, 100),
    // Iz uzun bo'lishi mumkin — birinchi qatorlari yetarli.
    stack: (err.stack ?? "").slice(0, 4000),
    url: window.location.href.slice(0, 500),
    user_agent: navigator.userAgent.slice(0, 300),
    ...context,
  };

  const body = JSON.stringify(payload);

  // `sendBeacon` sahifa yopilayotgan bo'lsa ham yuboradi — xatodan keyin
  // foydalanuvchi darhol ketib qolsa, oddiy `fetch` bekor qilinardi.
  if (navigator.sendBeacon) {
    const blob = new Blob([body], { type: "application/json" });
    if (navigator.sendBeacon("/api/client-errors/", blob)) return;
  }

  void fetch("/api/client-errors/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
    // Xabar yetmasa ham foydalanuvchiga hech narsa ko'rsatilmaydi:
    // xato haqidagi xato foydasiz shovqin.
  }).catch(() => {});
}
