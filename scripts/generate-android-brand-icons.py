#!/usr/bin/env python3
"""Genera todos los iconos e identidades de marca Android para RENACE.
Utiliza el logo oficial navy R (electron/brand/icon-512.png) y genera:
- mipmap (ic_launcher, ic_launcher_round, ic_launcher_foreground) para todas las densidades.
- ic_launcher_background.xml con color corporativo #0b1628.
- Splash screens / drawables de arranque.
"""
from __future__ import annotations
import os
import shutil
from pathlib import Path

try:
    from PIL import Image, ImageDraw
except ImportError:
    import subprocess, sys
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'pillow', '-q'])
    from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'electron' / 'brand' / 'icon-512.png'
RES = ROOT / 'android' / 'app' / 'src' / 'main' / 'res'
NAVY = (11, 22, 40, 255) # #0b1628

DENSITIES = {
    'mipmap-mdpi': (48, 108),
    'mipmap-hdpi': (72, 162),
    'mipmap-xhdpi': (96, 216),
    'mipmap-xxhdpi': (144, 324),
    'mipmap-xxxhdpi': (192, 432),
}

def make_sq_icon(master: Image.Image, size: int) -> Image.Image:
    canvas = Image.new('RGBA', (size, size), NAVY)
    inner_size = int(size * 0.72)
    inner = master.resize((inner_size, inner_size), Image.Resampling.LANCZOS)
    offset = (size - inner_size) // 2
    canvas.paste(inner, (offset, offset), inner)
    return canvas

def make_round_icon(master: Image.Image, size: int) -> Image.Image:
    sq = make_sq_icon(master, size)
    mask = Image.new('L', (size, size), 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((0, 0, size, size), fill=255)
    rounded = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    rounded.paste(sq, (0, 0), mask)
    return rounded

def make_fg_icon(master: Image.Image, fg_size: int) -> Image.Image:
    # Android adaptive icon foreground is inside a 108dp grid with 72dp safe zone (~66%)
    canvas = Image.new('RGBA', (fg_size, fg_size), (0, 0, 0, 0))
    inner_size = int(fg_size * 0.55)
    inner = master.resize((inner_size, inner_size), Image.Resampling.LANCZOS)
    offset = (fg_size - inner_size) // 2
    canvas.paste(inner, (offset, offset), inner)
    return canvas

def main() -> None:
    if not SOURCE.is_file():
        raise SystemExit(f'❌ Falta fuente de icono: {SOURCE}')
    
    master = Image.open(SOURCE).convert('RGBA')

    # Update ic_launcher_background.xml
    bg_xml = RES / 'values' / 'ic_launcher_background.xml'
    bg_xml.parent.mkdir(parents=True, exist_ok=True)
    bg_xml.write_text('<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#0B1628</color>\n</resources>\n', encoding='utf-8')

    for folder_name, (icon_sz, fg_sz) in DENSITIES.items():
        folder = RES / folder_name
        folder.mkdir(parents=True, exist_ok=True)
        
        sq = make_sq_icon(master, icon_sz)
        sq.save(folder / 'ic_launcher.png', 'PNG', optimize=True)
        
        rd = make_round_icon(master, icon_sz)
        rd.save(folder / 'ic_launcher_round.png', 'PNG', optimize=True)
        
        fg = make_fg_icon(master, fg_sz)
        fg.save(folder / 'ic_launcher_foreground.png', 'PNG', optimize=True)
        
        print(f'✓ {folder_name}: ic_launcher ({icon_sz}x{icon_sz}), foreground ({fg_sz}x{fg_sz})')

    # Update splash / drawables if present
    drawables = [d for d in RES.glob('drawable*') if d.is_dir()]
    for d in drawables:
        splash_file = d / 'splash.png'
        if splash_file.is_file() or 'land' in d.name or 'port' in d.name:
            # Generate splash image with Navy bg & centered logo
            w, h = (1280, 720) if 'land' in d.name else (720, 1280)
            splash = Image.new('RGBA', (w, h), NAVY)
            icon_sz = int(min(w, h) * 0.35)
            icon = master.resize((icon_sz, icon_sz), Image.Resampling.LANCZOS)
            off_x = (w - icon_sz) // 2
            off_y = (h - icon_sz) // 2
            splash.paste(icon, (off_x, off_y), icon)
            splash.save(splash_file if splash_file.is_file() else d / 'splash.png', 'PNG', optimize=True)

    print('✅ Iconos e identidad corporativa de Android actualizados con éxito.')

if __name__ == '__main__':
    main()
