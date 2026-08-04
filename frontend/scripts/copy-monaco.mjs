/**
 * Monaco muharririni `public/monaco/vs` ga ko'chiradi.
 *
 * Nima uchun: `@monaco-editor/react` sukut bo'yicha muharrirni jsdelivr
 * CDN'idan yuklaydi. Bu uch muammo tug'diradi:
 *
 *   1. CDN bloklangan tarmoqlarda (ba'zi maktab/korxona tarmoqlari,
 *      mintaqaviy filtrlar) kod muharriri UMUMAN ochilmaydi — sayt ishlaydi,
 *      lekin asosiy funksiya yo'q;
 *   2. har bir foydalanuvchining IP manzili uchinchi tomonga ketadi;
 *   3. CSP'da tashqi domenga ruxsat berish kerak bo'ladi.
 *
 * Fayllar `public/` ichida turadi va git'ga tushmaydi — ular `node_modules`
 * dan har build oldidan qayta nusxalanadi.
 */
import { cp, mkdir, rm, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const source = join(root, "node_modules", "monaco-editor", "min", "vs");
const target = join(root, "public", "monaco", "vs");

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

if (!(await exists(source))) {
  // Buildni to'xtatmaymiz: `loader.config` fayl topilmasa CDN'ga qaytadi,
  // ya'ni sayt baribir ishlaydi. Lekin bu holat ko'rinib turishi kerak.
  console.warn(
    "[monaco] node_modules/monaco-editor topilmadi — muharrir CDN'dan yuklanadi.\n" +
      "[monaco] Tuzatish: npm install",
  );
  process.exit(0);
}

if (await exists(target)) {
  await rm(target, { recursive: true, force: true });
}

await mkdir(dirname(target), { recursive: true });
await cp(source, target, { recursive: true });

console.log("[monaco] public/monaco/vs tayyor");
