#!/usr/bin/env python3
"""Genera build/dmg-background.png + @2x + TIFF HiDPI — atmósfera RENACE (minimal)."""
from __future__ import annotations

import math
import shutil
import subprocess
import tempfile
from pathlib import Path

try:
    from PIL import Image, ImageDraw, ImageFilter
except ImportError:
    print("⚠ Pillow no instalado — omitiendo dmg-background (pip install pillow)")
    raise SystemExit(0)

ROOT = Path(__file__).resolve().parents[1]
BUILD = ROOT / "build"
BASE_W, BASE_H = 660, 420  # alineado con package.json build.dmg.window

# Posiciones 1x = package.json build.dmg.contents
APP_XY_1X = (160, 205)
APPS_XY_1X = (500, 205)

# Rasterizer path used by the last rasterize_logo call
_LAST_RASTERIZER: str | None = None


def lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def mix(c1, c2, t: float):
    return tuple(int(lerp(c1[i], c2[i], t)) for i in range(3))


def soft_orb(
    w: int,
    h: int,
    cx: int,
    cy: int,
    radius: int,
    color: tuple[int, int, int],
    alpha: int = 55,
    blur: int = 18,
) -> Image.Image:
    orb = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    od = ImageDraw.Draw(orb)
    for i in range(6, 0, -1):
        a = int(alpha * (i / 6) ** 1.6)
        rr = int(radius * (1.15 - i * 0.08))
        od.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], fill=(*color, a))
    return orb.filter(ImageFilter.GaussianBlur(blur))


def icon_plate(w: int, h: int, cx: int, cy: int, scale: int) -> Image.Image:
    plate = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    pd = ImageDraw.Draw(plate)
    rw, rh = 122 * scale, 158 * scale
    box = [cx - rw // 2, cy - 62 * scale, cx + rw // 2, cy + rh - 62 * scale]
    pd.rounded_rectangle(
        box,
        radius=30 * scale,
        fill=(255, 255, 255, 22),
        outline=(200, 230, 255, 48),
        width=max(1, scale),
    )
    return plate


def rasterize_logo(logo: Path, target_w: int = 1440) -> Image.Image | None:
    """Rasteriza el SVG a PNG transparente a target_w px de ancho (resvg → qlmanage)."""
    global _LAST_RASTERIZER
    _LAST_RASTERIZER = None

    raw = logo.read_text(encoding="utf-8", errors="ignore")
    # Flecha de la "a": gris Illustrator → blanco puro (más nítido sobre fondo oscuro)
    raw = raw.replace("#f0f0f0", "#ffffff").replace("#F0F0F0", "#ffffff")
    if "width=" not in raw.split(">", 1)[0]:
        raw = raw.replace("<svg ", f'<svg width="{target_w}" height="{int(target_w * 81 / 360)}" ', 1)

    # 1) @resvg/resvg-js en temp (alpha real, sin caja blanca)
    tmp = Path(tempfile.mkdtemp(prefix="renace-resvg-"))
    try:
        svg_path = tmp / "logo.svg"
        out_png = tmp / "logo.png"
        svg_path.write_text(raw, encoding="utf-8")
        subprocess.run(["npm", "init", "-y"], cwd=str(tmp), capture_output=True, check=False)
        inst = subprocess.run(
            ["npm", "install", "@resvg/resvg-js", "--silent", "--no-fund", "--no-audit"],
            cwd=str(tmp),
            capture_output=True,
            text=True,
        )
        if inst.returncode == 0:
            script = tmp / "render.mjs"
            script.write_text(
                f"""\
import {{ readFileSync, writeFileSync }} from 'node:fs';
import {{ Resvg }} from '@resvg/resvg-js';
const svg = readFileSync({svg_path.as_posix()!r});
const resvg = new Resvg(svg, {{
  fitTo: {{ mode: 'width', value: {target_w} }},
  background: 'rgba(0,0,0,0)',
}});
writeFileSync({out_png.as_posix()!r}, resvg.render().asPng());
""",
                encoding="utf-8",
            )
            r = subprocess.run(
                ["node", str(script)],
                cwd=str(tmp),
                capture_output=True,
                text=True,
            )
            if r.returncode == 0 and out_png.exists():
                _LAST_RASTERIZER = "resvg"
                return Image.open(out_png).convert("RGBA")
    finally:
        shutil.rmtree(tmp, ignore_errors=True)

    # 2) Fallback qlmanage (thumbnail cuadrado + key blanco)
    BUILD.mkdir(parents=True, exist_ok=True)
    wide = BUILD / "_renace-logo-wide.svg"
    wide.write_text(raw, encoding="utf-8")
    subprocess.run(
        ["qlmanage", "-t", "-s", "2048", "-o", str(BUILD), str(wide)],
        capture_output=True,
        check=False,
    )
    qlp = BUILD / f"{wide.name}.png"
    wide.unlink(missing_ok=True)
    if not qlp.exists():
        subprocess.run(
            ["qlmanage", "-t", "-s", "2048", "-o", str(BUILD), str(logo)],
            capture_output=True,
            check=False,
        )
        qlp = BUILD / f"{logo.name}.png"
    if not qlp.exists():
        return None
    wm = Image.open(qlp).convert("RGBA")
    pixels = wm.load()
    ww, hh = wm.size
    for y in range(hh):
        for x in range(ww):
            r, g, b, a = pixels[x, y]
            if r >= 250 and g >= 250 and b >= 250:
                pixels[x, y] = (0, 0, 0, 0)
    bb = wm.getbbox()
    if bb:
        pad = 2
        bb = (
            max(0, bb[0] - pad),
            max(0, bb[1] - pad),
            min(ww, bb[2] + pad),
            min(hh, bb[3] + pad),
        )
        wm = wm.crop(bb)
    ratio = target_w / max(1, wm.width)
    wm = wm.resize((target_w, max(1, int(wm.height * ratio))), Image.Resampling.LANCZOS)
    qlp.unlink(missing_ok=True)
    _LAST_RASTERIZER = "qlmanage"
    return wm


def compose(scale: int, logo_hires: Image.Image | None = None) -> Image.Image:
    """Compose DMG background at 1x (660×420) or 2x (1320×840)."""
    assert scale in (1, 2)
    w, h = BASE_W * scale, BASE_H * scale
    app_xy = (APP_XY_1X[0] * scale, APP_XY_1X[1] * scale)
    apps_xy = (APPS_XY_1X[0] * scale, APPS_XY_1X[1] * scale)

    img = Image.new("RGB", (w, h), (5, 10, 18))
    px = img.load()
    for y in range(h):
        for x in range(w):
            t = y / h
            u = x / w
            base = mix((7, 12, 26), (3, 24, 34), t)
            g1 = max(0.0, 1.0 - math.hypot(x - w * 0.5, y - 48 * scale) / (300 * scale))
            g2 = max(0.0, 1.0 - math.hypot(x - w * 0.78, y - h * 0.7) / (270 * scale))
            g3 = max(0.0, 1.0 - math.hypot(x - w * 0.22, y - h * 0.68) / (250 * scale))
            r = min(255, int(base[0] + 22 * g1 + 10 * g2 + 8 * g3))
            g = min(255, int(base[1] + 48 * g1 + 30 * g2 + 22 * g3))
            b = min(255, int(base[2] + 78 * g1 + 40 * g2 + 34 * g3))
            v = 1.0 - 0.32 * math.sqrt((u - 0.5) ** 2 + (t - 0.48) ** 2) * 1.55
            px[x, y] = (int(r * v), int(g * v), int(b * v))

    # Malla sutil de puntos
    dots = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    dd = ImageDraw.Draw(dots)
    step = 28 * scale
    for yy in range(30 * scale, h, step):
        for xx in range(24 * scale, w, step):
            dd.ellipse([xx, yy, xx + scale, yy + scale], fill=(120, 180, 220, 18))
    layer = dots

    blur = 18 * scale
    layer = Image.alpha_composite(
        layer, soft_orb(w, h, w // 2, 72 * scale, 130 * scale, (0, 135, 255), 52, blur)
    )
    layer = Image.alpha_composite(
        layer, soft_orb(w, h, app_xy[0], app_xy[1], 95 * scale, (0, 190, 210), 38, blur)
    )
    layer = Image.alpha_composite(
        layer, soft_orb(w, h, apps_xy[0], apps_xy[1], 95 * scale, (0, 120, 255), 38, blur)
    )
    layer = Image.alpha_composite(layer, icon_plate(w, h, *app_xy, scale))
    layer = Image.alpha_composite(layer, icon_plate(w, h, *apps_xy, scale))

    # Flecha Bézier con glow
    arrow = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    ad = ImageDraw.Draw(arrow)
    x0, y0 = app_xy[0] + 72 * scale, app_xy[1] - 6 * scale
    x1, y1 = apps_xy[0] - 72 * scale, apps_xy[1] - 6 * scale
    cx1, cy1 = (x0 + x1) / 2, y0 - 52 * scale

    def bezier(t: float):
        ax = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * cx1 + t * t * x1
        ay = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * cy1 + t * t * y1
        return ax, ay

    pts = [bezier(i / 72) for i in range(73)]
    for width, alpha in ((16 * scale, 24), (9 * scale, 50), (4 * scale, 150)):
        ad.line(pts, fill=(0, 175, 255, alpha), width=width, joint="curve")
    for i in range(0, len(pts) - 1, 2):
        ad.line([pts[i], pts[i + 1]], fill=(200, 236, 255, 235), width=3 * scale, joint="curve")

    tx, ty = pts[-1]
    sx, sy = pts[-5]
    ang = math.atan2(ty - sy, tx - sx)
    size = 17 * scale
    ad.polygon(
        [
            (tx, ty),
            (tx - size * math.cos(ang - 0.48), ty - size * math.sin(ang - 0.48)),
            (tx - size * math.cos(ang + 0.48), ty - size * math.sin(ang + 0.48)),
        ],
        fill=(220, 245, 255, 245),
    )
    ad.ellipse(
        [x0 - 5 * scale, y0 - 5 * scale, x0 + 5 * scale, y0 + 5 * scale],
        fill=(0, 210, 255, 210),
    )
    for t in (0.35, 0.55, 0.72):
        bx, by = bezier(t)
        bx2, by2 = bezier(t + 0.04)
        a2 = math.atan2(by2 - by, bx2 - bx)
        s = 7 * scale
        ad.polygon(
            [
                (bx + s * math.cos(a2), by + s * math.sin(a2)),
                (bx - s * 0.7 * math.cos(a2 - 0.9), by - s * 0.7 * math.sin(a2 - 0.9)),
                (bx - s * 0.7 * math.cos(a2 + 0.9), by - s * 0.7 * math.sin(a2 + 0.9)),
            ],
            fill=(160, 220, 255, 150),
        )

    layer = Image.alpha_composite(layer, arrow)

    # Logo nítido (sin texto inferior — la flecha basta)
    if logo_hires is not None:
        display_w = 360 * scale  # 360 @1x, 720 @2x
        display_h = max(1, int(logo_hires.height * (display_w / logo_hires.width)))
        wm = logo_hires.resize((display_w, display_h), Image.Resampling.LANCZOS)
        glow = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        gd = ImageDraw.Draw(glow)
        lx = (w - wm.width) // 2
        ly = 42 * scale
        # Glow suave detrás (sin emborronar bordes del logo)
        gd.ellipse(
            [lx - 12 * scale, ly - 6 * scale, lx + wm.width + 12 * scale, ly + wm.height + 10 * scale],
            fill=(0, 140, 255, 14),
        )
        glow = glow.filter(ImageFilter.GaussianBlur(8 * scale))
        layer = Image.alpha_composite(layer, glow)
        layer.paste(wm, (lx, ly), wm)

    return Image.alpha_composite(img.convert("RGBA"), layer).convert("RGB")


def main() -> None:
    BUILD.mkdir(parents=True, exist_ok=True)

    logo_path = ROOT / "images" / "renacelogo.svg"
    logo_hires: Image.Image | None = None
    if logo_path.exists():
        # Rasterize once at high res (1440+), downscale per size in compose()
        logo_hires = rasterize_logo(logo_path, target_w=1440)

    rasterizer = _LAST_RASTERIZER or ("none" if logo_hires is None else "unknown")
    print(f"✓ Logo rasterizer: {rasterizer}")

    out_1x = BUILD / "dmg-background.png"
    out_2x = BUILD / "dmg-background@2x.png"
    out_tiff = BUILD / "dmg-background.tiff"

    compose(1, logo_hires).save(out_1x, optimize=False)
    print(f"✓ {out_1x.relative_to(ROOT)} (660×420)")

    compose(2, logo_hires).save(out_2x, optimize=False)
    print(f"✓ {out_2x.relative_to(ROOT)} (1320×840)")

    r = subprocess.run(
        [
            "tiffutil",
            "-cathidpicheck",
            str(out_1x),
            str(out_2x),
            "-out",
            str(out_tiff),
        ],
        capture_output=True,
        text=True,
    )
    if r.returncode == 0 and out_tiff.exists():
        print(f"✓ {out_tiff.relative_to(ROOT)} (HiDPI TIFF)")
        print("→ Prefer package.json build.dmg.background = \"build/dmg-background.tiff\"")
    else:
        print("⚠ tiffutil failed — use build/dmg-background.png as fallback")
        if r.stderr:
            print(r.stderr.strip())

if __name__ == "__main__":
    main()
