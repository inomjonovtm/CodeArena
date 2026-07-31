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
          backgroundColor: "#ffffff",
          color: "#0a0a0a",
          fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
          padding: "2rem 1.25rem",
        }}
      >
        <main style={{ maxWidth: "28rem" }}>
          <p
            style={{
              margin: 0,
              fontSize: "0.8125rem",
              fontWeight: 600,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "#1e5eff",
            }}
          >
            CodeArena
          </p>
          <h1
            style={{
              margin: "1rem 0 0",
              fontSize: "2rem",
              fontWeight: 700,
              letterSpacing: "-0.026em",
            }}
          >
            Ilova ishga tushmadi
          </h1>
          <p style={{ margin: "0.75rem 0 0", lineHeight: 1.65, color: "#4a4a4a" }}>
            Kutilmagan xatolik yuz berdi. Sahifani qayta yuklab ko&apos;ring.
          </p>
          {error.digest ? (
            <p
              style={{
                margin: "1rem 0 0",
                fontFamily: "ui-monospace, Consolas, monospace",
                fontSize: "0.8125rem",
                color: "#737373",
              }}
            >
              {error.digest}
            </p>
          ) : null}
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "2rem",
              height: "3rem",
              padding: "0 1.75rem",
              borderRadius: "10px",
              border: "none",
              backgroundColor: "#0a0a0a",
              color: "#fff",
              fontSize: "1rem",
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
