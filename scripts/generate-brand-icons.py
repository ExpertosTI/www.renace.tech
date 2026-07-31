#!/usr/bin/env python3
"""Genera iconos web RENACE desde el logo oficial navy R (electron/brand/icon-512.png)."""
from __future__ import annotations

import argparse
import shutil
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    import subprocess, sys

    subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'pillow', '-q'])
    from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
CANONICAL = ROOT / 'electron' / 'brand' / 'icon-512.png'


def save_resized(base: Image.Image, path: Path, size: int, maskable: bool = False) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if maskable:
        canvas = Image.new('RGBA', (size, size), (11, 22, 40, 255))  # #0b1628
        inner = int(size * 0.72)
        icon = base.resize((inner, inner), Image.Resampling.LANCZOS)
        off = (size - inner) // 2
        canvas.paste(icon, (off, off), icon)
        canvas.save(path, 'PNG', optimize=True)
    else:
        base.resize((size, size), Image.Resampling.LANCZOS).save(path, 'PNG', optimize=True)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument(
        '--source',
        type=Path,
        default=None,
        help='PNG/JPG fuente (default: electron/brand/icon-512.png — logo RENACE navy R)',
    )
    args = ap.parse_args()
    source = (args.source or CANONICAL).resolve()
    if not source.is_file():
        raise SystemExit(f'❌ Falta fuente de icono: {source}')

    master = Image.open(source).convert('RGBA')
    master_path = ROOT / 'images' / 'brand' / 'app-icon-1024.png'
    master_path.parent.mkdir(parents=True, exist_ok=True)
    master.resize((1024, 1024), Image.Resampling.LANCZOS).save(master_path, 'PNG', optimize=True)

    img = ROOT / 'images'
    # Keep 512 identical to canonical when source is the brand file
    if source == CANONICAL.resolve():
        shutil.copy2(CANONICAL, img / 'icon-512.png')
    else:
        save_resized(master, img / 'icon-512.png', 512)
    save_resized(master, img / 'icon-192.png', 192)
    save_resized(master, img / 'apple-touch-icon-180.png', 180)
    save_resized(master, img / 'icon-512-maskable.png', 512, maskable=True)
    save_resized(master, img / 'favicon-32.png', 32)
    save_resized(master, img / 'favicon-16.png', 16)
    ico = [master.resize((s, s), Image.Resampling.LANCZOS) for s in (16, 32, 48)]
    ico[-1].save(img / 'favicon.ico', format='ICO', sizes=[(i.width, i.height) for i in ico])
    shutil.copy2(img / 'favicon.ico', ROOT / 'favicon.ico')
    og = Image.new('RGBA', (1200, 630), (10, 10, 12, 255))
    icon_og = master.resize((480, 480), Image.Resampling.LANCZOS)
    og.paste(icon_og, ((1200 - 480) // 2, (630 - 480) // 2), icon_og)
    og.convert('RGB').save(img / 'og-image.png', 'PNG', optimize=True)
    print('✓ web icons →', img, '(fuente:', source.name + ')')


if __name__ == '__main__':
    main()
