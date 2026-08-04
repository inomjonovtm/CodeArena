/**
 * Xato hisobotini yuborish.
 *
 * Bu modulning eng muhim xususiyati — CHEKLASH. Xato odatda sikl ichida
 * yoki har renderda takrorlanadi; cheklovsiz bitta buzuq sahifa serverga
 * minglab so'rov yog'dirib, o'z logimizni o'zimiz ko'mib tashlardik.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/** Har bir test toza modul holati bilan boshlansin (hisoblagichlar ichkarida). */
async function freshModule() {
  vi.resetModules();
  return import("./report-error");
}

/** Yuborilgan tanani o'qish uchun soxta `Blob`. */
type FakeBlob = { parts: string[] };

// Tiplar aniq beriladi: `vi.fn(() => true)` argumentlarni bo'sh kortej deb
// biladi va `mock.calls[0][0]` tip xatosi bo'lardi.
const sendBeacon = vi.fn<(url: string, data?: unknown) => boolean>(() => true);

beforeEach(() => {
  sendBeacon.mockClear();
  vi.stubGlobal("window", { location: { href: "https://codearena.uz/problems/abc" } });
  vi.stubGlobal("navigator", { sendBeacon, userAgent: "vitest" });
  vi.stubGlobal("Blob", class {
    parts: unknown[];
    constructor(parts: unknown[]) {
      this.parts = parts;
    }
  });
  vi.stubGlobal("fetch", vi.fn(() => Promise.resolve()));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("reportError", () => {
  it("xatoni yuboradi", async () => {
    const { reportError } = await freshModule();
    reportError(new Error("nimadir buzildi"));
    expect(sendBeacon).toHaveBeenCalledTimes(1);
    expect(sendBeacon.mock.calls[0][0]).toBe("/api/client-errors/");
  });

  it("bir xil xatoni ikki marta yubormaydi", async () => {
    const { reportError } = await freshModule();
    reportError(new Error("takroriy"));
    reportError(new Error("takroriy"));
    reportError(new Error("takroriy"));
    expect(sendBeacon).toHaveBeenCalledTimes(1);
  });

  it("har xil xatolarni alohida yuboradi", async () => {
    const { reportError } = await freshModule();
    reportError(new Error("birinchi"));
    reportError(new Error("ikkinchi"));
    expect(sendBeacon).toHaveBeenCalledTimes(2);
  });

  it("sessiya davomida cheklangan sonda yuboradi", async () => {
    const { reportError } = await freshModule();
    for (let i = 0; i < 50; i += 1) reportError(new Error(`xato-${i}`));
    expect(sendBeacon.mock.calls.length).toBeLessThanOrEqual(5);
  });

  it("Error bo'lmagan qiymatni ham qabul qiladi", async () => {
    const { reportError } = await freshModule();
    reportError("oddiy satr");
    expect(sendBeacon).toHaveBeenCalledTimes(1);
  });

  it("qo'shimcha kontekstni qo'shadi", async () => {
    const { reportError } = await freshModule();
    reportError(new Error("kontekstli"), { boundary: "global" });

    const blob = sendBeacon.mock.calls[0][1] as FakeBlob;
    const payload = JSON.parse(blob.parts[0]);
    expect(payload.boundary).toBe("global");
    expect(payload.message).toBe("kontekstli");
    expect(payload.url).toContain("codearena.uz");
  });

  it("sendBeacon bo'lmasa fetch bilan yuboradi", async () => {
    vi.stubGlobal("navigator", { userAgent: "vitest" });
    const { reportError } = await freshModule();
    reportError(new Error("beaconsiz"));
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it("juda uzun izni qisqartiradi", async () => {
    const { reportError } = await freshModule();
    const error = new Error("uzun");
    error.stack = "x".repeat(50_000);
    reportError(error);

    const blob = sendBeacon.mock.calls[0][1] as FakeBlob;
    const payload = JSON.parse(blob.parts[0]);
    expect(payload.stack.length).toBeLessThanOrEqual(4000);
  });
});
