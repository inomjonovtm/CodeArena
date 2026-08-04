/**
 * Buildni ALOHIDA katalogga yig'adi (`.next-check`).
 *
 * Nima uchun kerak: `next dev` va `next build` sukut bo'yicha bitta `.next`
 * katalogiga yozadi. Dev server ishlab turganda build qilinsa, u serverning
 * chunk'larini almashtirib yuboradi va ishlab turgan sayt darhol
 * «Cannot find module './5611.js'» deb 500 qaytara boshlaydi — jarayon eski
 * modul xaritasini xotirada saqlagani uchun uni faqat qayta ishga tushirish
 * tuzatadi.
 *
 * Shuning uchun TEKSHIRUV uchun har doim shu skript ishlatilsin:
 *
 *     npm run build:check
 *
 * Produksiya buildi (`npm run build`) o'zgarishsiz `.next` ga yig'iladi —
 * deploy o'sha katalogni kutadi.
 *
 * `cross-env` qo'shilmadi: kerak bo'lgan narsa shu bir necha qatordan iborat
 * va bitta bog'liqlikni saqlab yurishdan arzonroq (loyihadagi `next.config.mjs`
 * dagi `NEXT_DIST_DIR` bilan bir xil yondashuv).
 */
import { spawn } from "node:child_process";

const distDir = process.env.NEXT_DIST_DIR || ".next-check";

const child = spawn("next", ["build", ...process.argv.slice(2)], {
  stdio: "inherit",
  // Windowsda `next` — `.cmd` qobig'i, u `shell: true` siz topilmaydi
  shell: true,
  env: { ...process.env, NEXT_DIST_DIR: distDir },
});

child.on("exit", (code) => process.exit(code ?? 1));
