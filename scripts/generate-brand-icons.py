#!/usr/bin/env python3
"""Genera iconos web/app RENACE desde images/brand/app-icon-1024.png (o --source)."""
from __future__ import annotations

import argparse
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    import subprocess, sys

    subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'pillow', '-q'])
    from PIL import Image

ROOT = Path(__file__).resolve().parents[1]


def crop_square(img: Image.Image) -> Image.Image:
    img = img.convert('RGB')
    w, h = img.size
    side = min(w, h)
    left = (w - side) // 2
    top = (h - side) // 2
    return img.crop((left, top, left + side, top + side))


def save_resized(base: Image.Image, path: Path, size: int, maskable: bool = False) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if maskable:
        canvas = Image.new('RGB', (size, size), (18, 18, 20))
        inner = int(size * 0.72)
        icon = base.resize((inner, inner), Image.Resampling.LANCZOS)
        off = (size - inner) // 2
        canvas.paste(icon, (off, off))
        canvas.save(path, 'PNG', optimize=True)
    else:
        base.resize((size, size), Image.Resampling.LANCZOS).save(path, 'PNG', optimize=True)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument('--source', type=Path, default=None)
    args = ap.parse_args()
    master_path = ROOT / 'images' / 'brand' / 'app-icon-1024.png'
    if args.source:
        sq = crop_square(Image.open(args.source))
        master = Image.new('RGB', (1024, 1024), (18, 18, 20))
        master.paste(sq.resize((1024, 1024), Image.Resampling.LANCZOS), (0, 0))
        master_path.parent.mkdir(parents=True, exist_ok=True)
        master.save(master_path, 'PNG', optimize=True)
    else:
        master = Image.open(master_path).convert('RGB')

    img = ROOT / 'images'
    save_resized(master, img / 'icon-512.png', 512)
    save_resized(master, img / 'icon-192.png', 192)
    save_resized(master, img / 'apple-touch-icon-180.png', 180)
    save_resized(master, img / 'icon-512-maskable.png', 512, maskable=True)
    save_resized(master, img / 'favicon-32.png', 32)
    save_resized(master, img / 'favicon-16.png', 16)
    ico = [master.resize((s, s), Image.Resampling.LANCZOS) for s in (16, 32, 48)]
    ico[-1].save(img / 'favicon.ico', format='ICO', sizes=[(i.width, i.height) for i in ico])
    og = Image.new('RGB', (1200, 630), (10, 10, 12))
    icon_og = master.resize((480, 480), Image.Resampling.LANCZOS)
    og.paste(icon_og, ((1200 - 480) // 2, (630 - 480) // 2))
    og.save(img / 'og-image.png', 'PNG', optimize=True)
    print('✓ web icons →', img)


if __name__ == '__main__':
    main()
