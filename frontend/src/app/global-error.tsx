"use client";

/* ==========================================================================
   Ildiz xatolik chegarasi
   --------------------------------------------------------------------------
   `app/error.tsx` ildiz layoutning O'ZIDA xato yuz berganda ishlamaydi —
   u layout ichida render bo'ladi. Bu fayl esa `<html>` ni o'zi chizadi,
   shuning uchun provayderlar ham, tema ham mavjud emas: uslub inline.
   ========================================================================== */

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="uz">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f7f7f4",
          color: "#1a1917",
          fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
          padding: "2rem 1.25rem",
        }}
      >
        <main style={{ maxWidth: "28rem" }}>
          <p
            style={{
              margin: 0,
              fontFamily: "ui-monospace, Consolas, monospace",
              fontSize: "0.6875rem",
              letterSpacing: "0.11em",
              textTransform: "uppercase",
              color: "#a09c92",
            }}
          >
            CodeArena
          </p>
          <h1 style={{ margin: "1rem 0 0", fontSize: "1.6rem", letterSpacing: "-0.03em" }}>
            Ilova ishga tushmadi
          </h1>
          <p style={{ margin: "0.75rem 0 0", lineHeight: 1.65, color: "#4a4842" }}>
            Kutilmagan xatolik yuz berdi. Sahifani qayta yuklab ko&apos;ring.
          </p>
          {error.digest ? (
            <p
              style={{
                margin: "1rem 0 0",
                fontFamily: "ui-monospace, Consolas, monospace",
                fontSize: "0.8125rem",
                color: "#736f66",
              }}
            >
              {error.digest}
            </p>
          ) : null}
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "1.75rem",
              height: "2.25rem",
              padding: "0 0.875rem",
              borderRadius: "8px",
              border: "none",
              backgroundColor: "#1f6feb",
              color: "#fff",
              fontSize: "0.85rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Qayta urinish
          </button>
        </main>
      </body>
    </html>
  );
}
