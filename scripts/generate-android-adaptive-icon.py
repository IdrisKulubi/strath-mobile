"""
Build android-adaptive-foreground.png from assets/images/icon.png.

The store icon is a heart on a square white canvas. Android adaptive masks
clip the corners, which leaves odd white wedges. This script removes
white that is connected to the image edges (outside the heart) and places
the artwork on a 1024x1024 transparent canvas scaled for the adaptive safe zone.

Re-run after changing icon.png:
  python scripts/generate-android-adaptive-icon.py
"""

from __future__ import annotations

import sys
from collections import deque
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "assets" / "images" / "icon.png"
OUT = ROOT / "assets" / "images" / "android-adaptive-foreground.png"
# Opaque icon for android.icon — some launchers / legacy mipmaps letterbox
# android.icon with white, which causes white "ears" under the mask.
OUT_OPAQUE = ROOT / "assets" / "images" / "android-app-icon.png"
# Must match app.json android.adaptiveIcon.backgroundColor
BRAND_BG = (252, 231, 243, 255)  # #fce7f3
CANVAS = 1024
# Keep logo inside ~62% of canvas (Material adaptive "keyline" safe zone)
INNER = int(CANVAS * 0.62)


def is_background_pixel(r: int, g: int, b: int, a: int) -> bool:
    if a < 200:
        return True
    return r >= 248 and g >= 248 and b >= 248


def flood_edge_white_to_transparent(im: Image.Image) -> Image.Image:
    im = im.convert("RGBA")
    w, h = im.size
    pixels = im.load()
    visited = bytearray(w * h)
    q: deque[tuple[int, int]] = deque()

    def idx(x: int, y: int) -> int:
        return y * w + x

    def push(x: int, y: int) -> None:
        if x < 0 or x >= w or y < 0 or y >= h:
            return
        i = idx(x, y)
        if visited[i]:
            return
        r, g, b, a = pixels[x, y]
        if not is_background_pixel(r, g, b, a):
            return
        visited[i] = 1
        q.append((x, y))

    for x in range(w):
        push(x, 0)
        push(x, h - 1)
    for y in range(h):
        push(0, y)
        push(w - 1, y)

    while q:
        x, y = q.popleft()
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            push(nx, ny)

    out = im.copy()
    o = out.load()
    for y in range(h):
        for x in range(w):
            if visited[idx(x, y)]:
                o[x, y] = (0, 0, 0, 0)
    return out


def main() -> int:
    if not SRC.is_file():
        print(f"Missing source: {SRC}", file=sys.stderr)
        return 1

    cut = flood_edge_white_to_transparent(Image.open(SRC))
    cw, ch = cut.size
    scale = min(INNER / cw, INNER / ch)
    nw, nh = max(1, int(cw * scale)), max(1, int(ch * scale))
    resized = cut.resize((nw, nh), Image.Resampling.LANCZOS)

    canvas = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    ox = (CANVAS - nw) // 2
    oy = (CANVAS - nh) // 2
    canvas.paste(resized, (ox, oy), resized)
    canvas.save(OUT, "PNG")
    print(f"Wrote {OUT} ({CANVAS}x{CANVAS})")

    base = Image.new("RGBA", (CANVAS, CANVAS), BRAND_BG)
    flat = Image.alpha_composite(base, canvas).convert("RGB")
    flat.save(OUT_OPAQUE, "PNG")
    print(f"Wrote {OUT_OPAQUE} (opaque, for android.icon)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
