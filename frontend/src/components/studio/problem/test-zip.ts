import type { TestCase } from "@/lib/types";

/* ==========================================================================
   TESTLARNI ZIP BILAN ALMASHISH
   --------------------------------------------------------------------------
   Format Robocontest Judge bilan AYNAN bir xil: arxiv ichida juftliklar

       1in.txt   1out.txt
       2in.txt   2out.txt
       ...

   Nima uchun aynan shu format: mualliflar testlarni allaqachon shu
   ko'rinishda saqlashadi va bir tizimdan ikkinchisiga ko'chira olishlari
   kerak. Ilgari bu yerda o'ziga xos matn formati bor edi (`---` bilan
   ajratilgan bloklar, ichida `===`) — u faqat shu saytda ishlardi va
   tashqaridan kelgan arxivni umuman qabul qilmasdi.

   O'QISHDA KENG QO'LLAB-QUVVATLASH. Turli tizimlar turlicha nomlaydi,
   shuning uchun quyidagilarning hammasi tushuniladi:

       1in.txt / 1out.txt        (Robocontest)
       1.in / 1.out              (Codeforces, Polygon)
       input1.txt / output1.txt
       01.in / 01.out            (nol bilan to'ldirilgan)
       tests/1in.txt             (papka ichida)

   Juftlik RAQAM bo'yicha topiladi, kengaytma va papka nomi hisobga
   olinmaydi. Raqam yo'q fayl (masalan `readme.txt`) tashlab yuboriladi.

   YOZISHDA esa faqat bitta format ishlatiladi — `Nin.txt` / `Nout.txt`,
   raqam 1 dan boshlanadi va testlar tartibida ketadi.
   ========================================================================== */

/** `1in.txt` → `{ index: 1, kind: "in" }`. Tushunarsiz nom uchun `null`. */
export function parseTestFileName(path: string): { index: number; kind: "in" | "out" } | null {
  // Papka yo'lini olib tashlaymiz: `tests/01.in` → `01.in`
  const name = path.split("/").pop()?.toLowerCase() ?? "";
  if (!name || name.startsWith(".")) return null;

  // `in`/`out` so'zi qayerda bo'lishidan qat'i nazar topiladi:
  // `1in.txt`, `1.in`, `input1.txt`, `1_output.txt` ...
  const isOut = /out/.test(name);
  const isIn = !isOut && /in/.test(name);
  if (!isIn && !isOut) return null;

  // Nomdagi BIRINCHI raqamlar guruhi — test tartibi.
  const digits = name.match(/\d+/);
  if (!digits) return null;

  return { index: Number(digits[0]), kind: isOut ? "out" : "in" };
}

/** Oxirida bitta qator tashlash — judge kutadigan ko'rinish. */
function normalize(text: string): string {
  const trimmed = text.replace(/\r\n/g, "\n").replace(/\s+$/, "");
  return trimmed ? `${trimmed}\n` : "";
}

/**
 * ZIP arxividan test juftliklarini o'qiydi.
 *
 * `jszip` DINAMIK import qilinadi: u ~100 KB va faqat shu tugma
 * bosilgandagina kerak — Studio'ning boshlang'ich yuklamasiga tushmasin.
 */
export async function readTestsZip(file: File): Promise<TestCase[]> {
  const { default: JSZip } = await import("jszip");
  const zip = await JSZip.loadAsync(file);

  const pairs = new Map<number, { input?: string; output?: string }>();

  const entries = Object.values(zip.files).filter((entry) => !entry.dir);
  for (const entry of entries) {
    const parsed = parseTestFileName(entry.name);
    if (!parsed) continue;

    const text = await entry.async("string");
    const slot = pairs.get(parsed.index) ?? {};
    if (parsed.kind === "in") slot.input = text;
    else slot.output = text;
    pairs.set(parsed.index, slot);
  }

  return [...pairs.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, slot], order) => ({
      order: order + 1,
      input: normalize(slot.input ?? ""),
      expected_output: normalize(slot.output ?? ""),
      is_sample: false,
      explanation_uz: "",
      time_limit_ms: null,
      memory_limit_kb: null,
      source: "manual" as const,
    }));
}

/**
 * Testlarni ZIP qilib yuklab beradi.
 *
 * Fayl nomi `<slug>-testlar.zip`; ichida `1in.txt`, `1out.txt`, ...
 * Siqish darajasi 6 — matn fayllar uchun yetarli va tez.
 */
export async function downloadTestsZip(tests: TestCase[], slug: string): Promise<void> {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();

  tests.forEach((test, index) => {
    const number = index + 1;
    zip.file(`${number}in.txt`, normalize(test.input ?? ""));
    zip.file(`${number}out.txt`, normalize(test.expected_output ?? ""));
  });

  const blob = await zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${slug || "masala"}-testlar.zip`;
  link.click();
  // Brauzer yuklashni boshlashi uchun bir kadr kutamiz, keyin manzilni
  // bo'shatamiz — darhol `revoke` qilinsa Safari faylni ololmay qoladi.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
