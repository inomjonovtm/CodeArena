import { ImageResponse } from "next/og";

/* ==========================================================================
   Ijtimoiy karta (Open Graph / Twitter)
   --------------------------------------------------------------------------
   Havola Telegram, Twitter yoki Facebook'ga tashlanganda ular sahifaning
   `og:image` rasmini ko'rsatadi. Rasm bo'lmasa — havola matn qatoriga
   aylanadi va lentada ko'zga tashlanmaydi. O'zbek auditoriyasi kontentni
   asosan Telegram orqali ulashadi, ya'ni bu rasm ko'p hollarda saytning
   BIRINCHI ko'rinishi bo'ladi.

   Karta dizayn tizimining aynan o'zida quriladi: TO'YINGAN YASHIL sahna,
   OQ sarlavha, oq aksent va millimetrli panjara. Boshqa rang yo'q.

   Nima uchun yashil fon: Telegram lentasi oq (yoki to'q kulrang). Oq
   fonli karta lentaga singib ketadi, yashil esa darhol ajralib turadi —
   ya'ni fon rangi bu yerda bezak emas, ko'rinish vositasi.

   O'lcham 1200×630 — barcha platformalar uchun standart nisbat (1.91:1).
   ========================================================================== */

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

const BRAND = "#00814E";
const BRAND_DEEP = "#006B40";
const CANVAS = "#FFFFFF";
const BRAND_LIGHT = "#AEE3CA";
const MUTED = "#D6F2E4";

/** Panjara — hero'dagi millimetrli qog'ozning aynan o'zi, juda xira. */
const GRID =
  "linear-gradient(rgba(255,255,255,0.07) 1px, transparent 1px)," +
  "linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px)";

export type OgCard = {
  /** Bo'lim yorlig'i — KATTA HARFLARDA, och yashil (`MASALA`, `MUSOBAQA`) */
  eyebrow: string;
  /** Asosiy sarlavha */
  title: string;
  /** Ixtiyoriy tavsif — sarlavha ostida, sokin kulrang */
  subtitle?: string;
  /** Pastki qatordagi faktlar (`Qiyin`, `30 ball`, `77% qabul`) */
  facts?: string[];
};

export function ogCard({ eyebrow, title, subtitle, facts = [] }: OgCard) {
  // Sarlavha uzun bo'lsa o'lcham pasayadi — matn kartadan chiqib ketmasin.
  const titleSize = title.length > 46 ? 60 : title.length > 28 ? 72 : 84;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: BRAND,
          backgroundImage: GRID,
          backgroundSize: "60px 60px",
          padding: "68px 72px",
          fontFamily: "sans-serif",
        }}
      >
        {/* Oq aksent chizig'i — kartaning yuqori qirrasida */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 1200,
            height: 8,
            backgroundColor: CANVAS,
          }}
        />

        {/* ------------------------------------------------------- brend */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 52,
              height: 52,
              borderRadius: 16,
              backgroundColor: CANVAS,
              color: BRAND_DEEP,
              fontSize: 30,
              fontWeight: 700,
            }}
          >
            {">"}
          </div>
          <div
            style={{
              color: CANVAS,
              fontSize: 30,
              fontWeight: 700,
              letterSpacing: "-0.02em",
            }}
          >
            CodeArena
          </div>
        </div>

        {/* ----------------------------------------------------- sarlavha */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              color: BRAND_LIGHT,
              fontSize: 24,
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
            }}
          >
            {eyebrow}
          </div>
          <div
            style={{
              marginTop: 22,
              color: CANVAS,
              fontSize: titleSize,
              fontWeight: 700,
              // 1.06 juda zich edi: `g`, `y`, `q` dumlari qator qutisidan
              // chiqib, keyingi qator bilan kesishardi.
              lineHeight: 1.14,
              letterSpacing: "-0.035em",
              // Uch qatordan uzun sarlavha kartadan chiqib ketmasin
              display: "block",
              overflow: "hidden",
              maxHeight: Math.round(titleSize * 1.14 * 3),
            }}
          >
            {title}
          </div>
          {subtitle ? (
            <div
              style={{
                marginTop: 24,
                color: MUTED,
                fontSize: 28,
                lineHeight: 1.45,
                maxWidth: 940,
                overflow: "hidden",
                maxHeight: 82,
              }}
            >
              {subtitle}
            </div>
          ) : null}
        </div>

        {/* -------------------------------------------------- pastki qator */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {facts.map((fact) => (
            <div
              key={fact}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "10px 20px",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.35)",
                color: MUTED,
                fontSize: 24,
                fontWeight: 500,
              }}
            >
              {fact}
            </div>
          ))}
          <div
            style={{
              display: "flex",
              marginLeft: "auto",
              color: MUTED,
              fontSize: 24,
            }}
          >
            codearena.uz
          </div>
        </div>
      </div>
    ),
    OG_SIZE,
  );
}
