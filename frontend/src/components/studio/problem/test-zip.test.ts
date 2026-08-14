import { describe, expect, it } from "vitest";

import { parseTestFileName } from "./test-zip";

/* Fayl nomini o'qish — ZIP importidagi YAGONA nozik joy. Arxivlar turli
   tizimlardan keladi va nomlash tartibi har xil; shu funksiya adashsa,
   testlar noto'g'ri juftlanadi va masala jimgina buziladi. */
describe("parseTestFileName", () => {
  it("Robocontest formatini o'qiydi", () => {
    expect(parseTestFileName("1in.txt")).toEqual({ index: 1, kind: "in" });
    expect(parseTestFileName("1out.txt")).toEqual({ index: 1, kind: "out" });
    expect(parseTestFileName("12out.txt")).toEqual({ index: 12, kind: "out" });
  });

  it("Codeforces/Polygon formatini o'qiydi", () => {
    expect(parseTestFileName("1.in")).toEqual({ index: 1, kind: "in" });
    expect(parseTestFileName("1.out")).toEqual({ index: 1, kind: "out" });
  });

  it("nol bilan to'ldirilgan raqamni o'qiydi", () => {
    expect(parseTestFileName("007.in")).toEqual({ index: 7, kind: "in" });
    expect(parseTestFileName("0001.out")).toEqual({ index: 1, kind: "out" });
  });

  it("`input`/`output` so'zli nomlarni o'qiydi", () => {
    expect(parseTestFileName("input3.txt")).toEqual({ index: 3, kind: "in" });
    expect(parseTestFileName("output3.txt")).toEqual({ index: 3, kind: "out" });
  });

  it("papka yo'lini e'tiborsiz qoldiradi", () => {
    expect(parseTestFileName("tests/2in.txt")).toEqual({ index: 2, kind: "in" });
    expect(parseTestFileName("a/b/c/2out.txt")).toEqual({ index: 2, kind: "out" });
  });

  it("katta-kichik harfga bog'liq emas", () => {
    expect(parseTestFileName("5IN.TXT")).toEqual({ index: 5, kind: "in" });
    expect(parseTestFileName("5OUT.TXT")).toEqual({ index: 5, kind: "out" });
  });

  /* `output` ichida `out` ham, `in` ham yo'q emas — lekin `input` ichida
     `in` bor va `out` yo'q. Shuning uchun `out` BIRINCHI tekshiriladi:
     aks holda `output1.txt` kirish fayli deb o'qilardi. */
  it("`output` ni kirish deb adashtirmaydi", () => {
    expect(parseTestFileName("output1.txt")?.kind).toBe("out");
    expect(parseTestFileName("1_output.txt")?.kind).toBe("out");
  });

  it("begona fayllarni tashlab yuboradi", () => {
    expect(parseTestFileName("readme.txt")).toBeNull();
    expect(parseTestFileName("in.txt")).toBeNull(); // raqamsiz
    expect(parseTestFileName("checker.cpp")).toBeNull();
    expect(parseTestFileName("__MACOSX/._1in.txt")).toBeNull(); // yashirin
  });
});
