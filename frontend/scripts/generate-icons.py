"""PWA ikonkalarini brend belgisidan yaratadi.

Belgi navbardagi bilan bir xil (`components/site/navbar.tsx` → `Brand`):
yashil (`--accent`) yumaloq kvadrat va uning ustida lucide `Terminal` glifi.

Ishga tushirish (tashqi kutubxona kerak emas, faqat Python):

    python scripts/generate-icons.py

Nima uchun qo'lda chizilgan: bitta manba (brend rangi va glif koordinatalari)
shu faylda turadi, brend o'zgarsa ikonkalarni bir buyruq bilan qayta yaratish
mumkin. Rasm tahrirlagichda yasalgan PNG'larda bu bog'liqlik yo'qoladi.
"""
from __future__ import annotations

import math
import struct
import zlib
from pathlib import Path

# --------------------------------------------------------------- brend ranglari
ACCENT = (16, 185, 129)  # --accent  #10b981
INK = (4, 20, 14)  # --accent-fg (dark)  #04140e
WHITE = (255, 255, 255)

ROOT = Path(__file__).resolve().parent.parent

# lucide `Terminal` — 24x24 koordinatalar tizimida
GLYPH_SEGMENTS = [
    ((4, 17), (10, 11)),  # chevron pastki yelkasi
    ((10, 11), (4, 5)),  # chevron yuqori yelkasi
    ((12, 19), (20, 19)),  # tagidagi chiziq
]
GLYPH_STROKE = 2.5  # navbardagi `strokeWidth={2.5}`
GLYPH_BOX = 24.0


# ------------------------------------------------------------------- geometriya
def _segment_distance(px: float, py: float, ax: float, ay: float, bx: float, by: float) -> float:
    dx, dy = bx - ax, by - ay
    length_sq = dx * dx + dy * dy
    if length_sq == 0:
        return math.hypot(px - ax, py - ay)
    t = max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / length_sq))
    return math.hypot(px - (ax + t * dx), py - (ay + t * dy))


def _rounded_rect_distance(
    px: float, py: float, cx: float, cy: float, half_w: float, half_h: float, radius: float
) -> float:
    """Yumaloq burchakli to'rtburchakning ishorali masofasi (ichkarida manfiy)."""
    qx = abs(px - cx) - (half_w - radius)
    qy = abs(py - cy) - (half_h - radius)
    outside = math.hypot(max(qx, 0.0), max(qy, 0.0))
    inside = min(max(qx, qy), 0.0)
    return outside + inside - radius


def _coverage(distance: float) -> float:
    """Masofani piksel qoplamiga aylantiradi — chekkalar silliq chiqadi."""
    return max(0.0, min(1.0, 0.5 - distance))


# ----------------------------------------------------------------------- chizish
def render(
    size: int,
    *,
    background: tuple[int, int, int] | None,
    foreground: tuple[int, int, int],
    glyph_ratio: float,
    corner_ratio: float = 0.22,
    square: bool = False,
) -> bytes:
    """Bitta ikonka yasaydi va RGBA baytlarini qaytaradi.

    `background=None` — fon shaffof (bildirishnoma nishoni uchun).
    `square=True` — burchaklar yumaloqlanmaydi (iOS o'zi qirqadi).
    """
    center = size / 2.0
    radius = 0 if square else size * corner_ratio

    # Glif markazda, `glyph_ratio` ulushini egallaydi
    glyph_size = size * glyph_ratio
    scale = glyph_size / GLYPH_BOX
    offset = center - glyph_size / 2.0
    stroke_half = (GLYPH_STROKE * scale) / 2.0

    segments = [
        (
            offset + ax * scale,
            offset + ay * scale,
            offset + bx * scale,
            offset + by * scale,
        )
        for (ax, ay), (bx, by) in GLYPH_SEGMENTS
    ]

    rows = []
    for y in range(size):
        py = y + 0.5
        row = bytearray()
        for x in range(size):
            px = x + 0.5

            if background is None:
                red, green, blue, alpha = 0.0, 0.0, 0.0, 0.0
            else:
                bg_alpha = _coverage(
                    _rounded_rect_distance(px, py, center, center, center, center, radius)
                )
                red, green, blue = (float(channel) for channel in background)
                alpha = bg_alpha

            glyph_alpha = 0.0
            for ax, ay, bx, by in segments:
                glyph_alpha = max(
                    glyph_alpha,
                    _coverage(_segment_distance(px, py, ax, ay, bx, by) - stroke_half),
                )

            if glyph_alpha > 0:
                # Glifni fon ustiga qo'yamiz (oddiy "source over")
                out_alpha = glyph_alpha + alpha * (1 - glyph_alpha)
                if out_alpha > 0:
                    red = (foreground[0] * glyph_alpha + red * alpha * (1 - glyph_alpha)) / out_alpha
                    green = (
                        foreground[1] * glyph_alpha + green * alpha * (1 - glyph_alpha)
                    ) / out_alpha
                    blue = (
                        foreground[2] * glyph_alpha + blue * alpha * (1 - glyph_alpha)
                    ) / out_alpha
                alpha = out_alpha

            row += bytes(
                (
                    int(round(red)),
                    int(round(green)),
                    int(round(blue)),
                    int(round(alpha * 255)),
                )
            )
        rows.append(bytes(row))
    return b"".join(b"\x00" + row for row in rows)


# --------------------------------------------------------------------- PNG yozish
def _chunk(tag: bytes, payload: bytes) -> bytes:
    return (
        struct.pack(">I", len(payload))
        + tag
        + payload
        + struct.pack(">I", zlib.crc32(tag + payload) & 0xFFFFFFFF)
    )


def write_png(path: Path, size: int, raw: bytes) -> None:
    header = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)  # 8-bit RGBA
    data = (
        b"\x89PNG\r\n\x1a\n"
        + _chunk(b"IHDR", header)
        + _chunk(b"IDAT", zlib.compress(raw, 9))
        + _chunk(b"IEND", b"")
    )
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)
    print(f"  {path.relative_to(ROOT)}  ({size}x{size}, {len(data) / 1024:.1f} KB)")


def main() -> None:
    print("Ikonkalar yaratilmoqda:")

    # --- manifest ikonkalari
    for size in (192, 512):
        write_png(
            ROOT / "public" / f"icon-{size}.png",
            size,
            render(size, background=ACCENT, foreground=INK, glyph_ratio=0.56),
        )

    # --- maskable: Android ikonkani doira/kvadratga qirqadi, shuning uchun
    # glif ichki 80% "xavfsiz zona" ichida turishi kerak, fon esa to'liq to'ladi
    write_png(
        ROOT / "public" / "icon-maskable-512.png",
        512,
        render(512, background=ACCENT, foreground=INK, glyph_ratio=0.42, corner_ratio=0.5),
    )

    # --- bildirishnoma nishoni: Android status panelida faqat siluet ko'rinadi
    write_png(
        ROOT / "public" / "badge-72.png",
        72,
        render(72, background=None, foreground=WHITE, glyph_ratio=0.78),
    )

    # --- favicon va iOS ikonkasi: Next App Router bularni fayl nomiga qarab oladi
    write_png(
        ROOT / "src" / "app" / "icon.png",
        64,
        render(64, background=ACCENT, foreground=INK, glyph_ratio=0.62),
    )
    write_png(
        ROOT / "src" / "app" / "apple-icon.png",
        180,
        # iOS burchaklarni o'zi yumaloqlaydi — kvadrat beramiz
        render(180, background=ACCENT, foreground=INK, glyph_ratio=0.54, square=True),
    )

    print("Tayyor.")


if __name__ == "__main__":
    main()
