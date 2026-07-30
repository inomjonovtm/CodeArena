/**
 * CodeArena service worker — brauzer push xabarlari.
 *
 * Bu fayl `public/` da turadi va `/sw.js` manzilidan beriladi. Manzil muhim:
 * service worker faqat o'z katalogi va undan pastdagi sahifalarni boshqara
 * oladi, shuning uchun u ildizda bo'lishi kerak.
 *
 * Ataylab kesh (offline) mantig'i yo'q: sahifalar Next tomonidan render
 * qilinadi va ma'lumot doim yangi bo'lishi kerak — noto'g'ri sozlangan kesh
 * foydalanuvchiga eskirgan masala shartini yoki eski natijani ko'rsatib
 * qo'yishi mumkin. Bu worker faqat bildirishnomalar bilan shug'ullanadi.
 */

// Yangi versiya chiqqanda kutib turmasdan boshqaruvni oladi
self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

/** Server yuborgan JSON'ni o'qiydi; buzilgan bo'lsa — umumiy matn. */
function readPayload(event) {
  const fallback = {
    title: "CodeArena",
    body: "Yangi bildirishnoma bor.",
    url: "/notifications",
  };
  if (!event.data) return fallback;
  try {
    return { ...fallback, ...event.data.json() };
  } catch {
    const text = event.data.text();
    return text ? { ...fallback, body: text } : fallback;
  }
}

self.addEventListener("push", (event) => {
  const payload = readPayload(event);

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/icon-192.png",
      // Android status panelidagi kichik siluet
      badge: "/badge-72.png",
      // Bir xil `tag` li xabarlar bir-birining ustiga tushadi — ketma-ket
      // kelgan bildirishnomalar ekranni to'ldirib yubormaydi
      tag: payload.tag || "codearena",
      renotify: Boolean(payload.tag),
      // Bosilganda qaysi sahifa ochilishini `notificationclick` shu yerdan oladi
      data: { url: payload.url || "/notifications" },
      // Muhim xabarlar (masalan musobaqa boshlanishi) o'zi yo'qolib ketmasin
      requireInteraction: payload.level === "danger" || payload.kind === "contest_soon",
      lang: "uz",
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const target = (event.notification.data && event.notification.data.url) || "/notifications";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      // Sayt allaqachon ochiq bo'lsa yangi oyna ochmaymiz — mavjudini
      // fokuslab, kerakli sahifaga o'tkazamiz
      for (const client of clients) {
        if (new URL(client.url).origin === self.location.origin) {
          return client.focus().then((focused) => focused.navigate(target));
        }
      }
      return self.clients.openWindow(target);
    }),
  );
});

/**
 * Push xizmati obunani yangilaganda brauzer shu hodisani yuboradi. Yangi
 * obunani serverga qaytarmasak, foydalanuvchi jimgina xabar olmay qoladi.
 */
self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    (async () => {
      const applicationServerKey =
        event.oldSubscription && event.oldSubscription.options
          ? event.oldSubscription.options.applicationServerKey
          : null;
      if (!applicationServerKey) return;

      const subscription = await self.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });

      await fetch("/api/push/subscribe/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(subscription.toJSON()),
      });
    })(),
  );
});
