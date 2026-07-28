#!/usr/bin/env python3
"""Genera build/dmg-background.png — atmósfera RENACE + flecha de arrastre."""
from __future__ import annotations

import math
import subprocess
from pathlib import Path

try:
    from PIL import Image, ImageDraw, ImageFilter, ImageFont
except ImportError:
    print("⚠ Pillow no instalado — omitiendo dmg-background.png (pip install pillow)")
    raise SystemExit(0)

ROOT = Path(__file__).resolve().parents[1]
BUILD = ROOT / "build"
W, H = 660, 420  # alineado con package.json build.dmg.window

# Posiciones = package.json build.dmg.contents
APP_XY = (160, 205)
APPS_XY = (500, 205)


def lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def mix(c1, c2, t: float):
    return tuple(int(lerp(c1[i], c2[i], t)) for i in range(3))


def soft_orb(cx: int, cy: int, radius: int, color: tuple[int, int, int], alpha: int = 55) -> Image.Image:
    orb = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    od = ImageDraw.Draw(orb)
    for i in range(6, 0, -1):
        a = int(alpha * (i / 6) ** 1.6)
        rr = int(radius * (1.15 - i * 0.08))
        od.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], fill=(*color, a))
    return orb.filter(ImageFilter.GaussianBlur(18))


def icon_plate(cx: int, cy: int) -> Image.Image:
    plate = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    pd = ImageDraw.Draw(plate)
    rw, rh = 122, 158
    box = [cx - rw // 2, cy - 62, cx + rw // 2, cy + rh - 62]
    pd.rounded_rectangle(box, radius=30, fill=(255, 255, 255, 22), outline=(200, 230, 255, 48), width=1)
    return plate


def main() -> None:
    BUILD.mkdir(parents=True, exist_ok=True)

    img = Image.new("RGB", (W, H), (5, 10, 18))
    px = img.load()
    for y in range(H):
        for x in range(W):
            t = y / H
            u = x / W
            base = mix((7, 12, 26), (3, 24, 34), t)
            g1 = max(0.0, 1.0 - math.hypot(x - W * 0.5, y - 48) / 300)
            g2 = max(0.0, 1.0 - math.hypot(x - W * 0.78, y - H * 0.7) / 270)
            g3 = max(0.0, 1.0 - math.hypot(x - W * 0.22, y - H * 0.68) / 250)
            r = min(255, int(base[0] + 22 * g1 + 10 * g2 + 8 * g3))
            g = min(255, int(base[1] + 48 * g1 + 30 * g2 + 22 * g3))
            b = min(255, int(base[2] + 78 * g1 + 40 * g2 + 34 * g3))
            v = 1.0 - 0.32 * math.sqrt((u - 0.5) ** 2 + (t - 0.48) ** 2) * 1.55
            px[x, y] = (int(r * v), int(g * v), int(b * v))

    # Malla sutil de puntos
    dots = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    dd = ImageDraw.Draw(dots)
    for yy in range(30, H, 28):
        for xx in range(24, W, 28):
            dd.ellipse([xx, yy, xx + 1, yy + 1], fill=(120, 180, 220, 18))
    layer = dots

    layer = Image.alpha_composite(layer, soft_orb(W // 2, 72, 130, (0, 135, 255), 52))
    layer = Image.alpha_composite(layer, soft_orb(APP_XY[0], APP_XY[1], 95, (0, 190, 210), 38))
    layer = Image.alpha_composite(layer, soft_orb(APPS_XY[0], APPS_XY[1], 95, (0, 120, 255), 38))
    layer = Image.alpha_composite(layer, icon_plate(*APP_XY))
    layer = Image.alpha_composite(layer, icon_plate(*APPS_XY))

    # Flecha Bézier con glow
    arrow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ad = ImageDraw.Draw(arrow)
    x0, y0 = APP_XY[0] + 72, APP_XY[1] - 6
    x1, y1 = APPS_XY[0] - 72, APPS_XY[1] - 6
    cx1, cy1 = (x0 + x1) / 2, y0 - 52

    def bezier(t: float):
        ax = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * cx1 + t * t * x1
        ay = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * cy1 + t * t * y1
        return ax, ay

    pts = [bezier(i / 72) for i in range(73)]
    for width, alpha in ((16, 24), (9, 50), (4, 150)):
        ad.line(pts, fill=(0, 175, 255, alpha), width=width, joint="curve")
    for i in range(0, len(pts) - 1, 2):
        ad.line([pts[i], pts[i + 1]], fill=(200, 236, 255, 235), width=3, joint="curve")

    tx, ty = pts[-1]
    sx, sy = pts[-5]
    ang = math.atan2(ty - sy, tx - sx)
    size = 17
    ad.polygon(
        [
            (tx, ty),
            (tx - size * math.cos(ang - 0.48), ty - size * math.sin(ang - 0.48)),
            (tx - size * math.cos(ang + 0.48), ty - size * math.sin(ang + 0.48)),
        ],
        fill=(220, 245, 255, 245),
    )
    ad.ellipse([x0 - 5, y0 - 5, x0 + 5, y0 + 5], fill=(0, 210, 255, 210))
    # chevrons intermedios (sugerencia de movimiento)
    for t in (0.35, 0.55, 0.72):
        bx, by = bezier(t)
        bx2, by2 = bezier(t + 0.04)
        a2 = math.atan2(by2 - by, bx2 - bx)
        s = 7
        ad.polygon(
            [
                (bx + s * math.cos(a2), by + s * math.sin(a2)),
                (bx - s * 0.7 * math.cos(a2 - 0.9), by - s * 0.7 * math.sin(a2 - 0.9)),
                (bx - s * 0.7 * math.cos(a2 + 0.9), by - s * 0.7 * math.sin(a2 + 0.9)),
            ],
            fill=(160, 220, 255, 150),
        )

    layer = Image.alpha_composite(layer, arrow)

    text_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    td = ImageDraw.Draw(text_layer)
    try:
        font = ImageFont.truetype("/System/Library/Fonts/SFNS.ttf", 16)
        font_sm = ImageFont.truetype("/System/Library/Fonts/SFNS.ttf", 12)
    except Exception:
        try:
            font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 16)
            font_sm = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 12)
        except Exception:
            font = ImageFont.load_default()
            font_sm = font

    hint = "Arrastra RENACE Portal a Applications"
    bbox = td.textbbox((0, 0), hint, font=font)
    tw = bbox[2] - bbox[0]
    hx = (W - tw) // 2
    hy = 338
    # pill detrás del texto
    pad_x, pad_y = 18, 10
    td.rounded_rectangle(
        [hx - pad_x, hy - pad_y, hx + tw + pad_x, hy + 40],
        radius=16,
        fill=(8, 18, 32, 140),
        outline=(120, 180, 230, 50),
        width=1,
    )
    td.text((hx + 1, hy + 1), hint, font=font, fill=(0, 0, 0, 110))
    td.text((hx, hy), hint, font=font, fill=(225, 240, 255, 230))
    sub = "Instalación en un gesto"
    sb = td.textbbox((0, 0), sub, font=font_sm)
    stw = sb[2] - sb[0]
    td.text(((W - stw) // 2, hy + 22), sub, font=font_sm, fill=(150, 190, 220, 180))
    layer = Image.alpha_composite(layer, text_layer)

    # Logo
    logo = ROOT / "images" / "renacelogo.svg"
    if logo.exists():
        subprocess.run(
            ["qlmanage", "-t", "-s", "900", "-o", str(BUILD), str(logo)],
            capture_output=True,
            check=False,
        )
        png = BUILD / f"{logo.name}.png"
        if png.exists():
            wm = Image.open(png).convert("RGBA")
            pixels = wm.load()
            ww, hh = wm.size
            for y in range(hh):
                for x in range(ww):
                    r, g, b, a = pixels[x, y]
                    if r >= 250 and g >= 250 and b >= 250:
                        pixels[x, y] = (0, 0, 0, 0)
            bb = wm.getbbox()
            if bb:
                wm = wm.crop(bb)
            wm.thumbnail((300, 84), Image.Resampling.LANCZOS)
            pxw = wm.load()
            for y in range(wm.size[1]):
                for x in range(wm.size[0]):
                    r, g, b, a = pxw[x, y]
                    if a > 0 and abs(r - g) < 12 and abs(g - b) < 12 and 220 <= r <= 248:
                        pxw[x, y] = (236, 244, 255, a)
            glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
            gd = ImageDraw.Draw(glow)
            lx = (W - wm.width) // 2
            ly = 38
            gd.ellipse([lx - 24, ly - 12, lx + wm.width + 24, ly + wm.height + 20], fill=(0, 140, 255, 32))
            glow = glow.filter(ImageFilter.GaussianBlur(14))
            layer = Image.alpha_composite(layer, glow)
            layer.paste(wm, (lx, ly), wm)
            png.unlink(missing_ok=True)

    out = Image.alpha_composite(img.convert("RGBA"), layer).convert("RGB")
    out.save(BUILD / "dmg-background.png", optimize=True)
    print("✓ build/dmg-background.png (atmósfera + flecha de arrastre)")


if __name__ == "__main__":
    main()
