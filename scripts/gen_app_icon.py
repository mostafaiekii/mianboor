#!/usr/bin/env python3
"""Generate Mianboor launcher icons + in-app brand logo from the new artwork.

Inputs : upload/Futuristic Earth Orbit App Icon.png (1254x1254 RGB)
Outputs:
  - mipmap-{mdpi..xxxhdpi}/ic_launcher.png       (legacy full art, 48..192)
  - mipmap-{mdpi..xxxhdpi}/ic_launcher_round.png (circle-cropped, 48..192)
  - mipmap-{mdpi..xxxhdpi}/ic_launcher_fg.png    (adaptive foreground, art at 67% of 108dp canvas)
  - mipmap-{mdpi..xxxhdpi}/ic_launcher_bg.png    (adaptive background, solid navy from art corners)
  - res/drawable-nodpi/brand_logo.png            (384px, for the in-app brand row)
  - public/logo-512.png                          (512px, demo favicon)
"""
from PIL import Image, ImageDraw, ImageOps
import os

SRC = "/home/z/my-project/upload/Futuristic Earth Orbit App Icon.png"
RES = "/home/z/my-project/android/app/src/main/res"
PUB = "/home/z/my-project/public"

art = Image.open(SRC).convert("RGBA")
w, h = art.size
side = min(w, h)
art = ImageOps.fit(art, (side, side), Image.LANCZOS, centering=(0.5, 0.5))

# ── adaptive background color: average of the 4 corners (dark navy) ──
px = art.load()
cols = []
for cx, cy in [(6, 6), (side - 7, 6), (6, side - 7), (side - 7, side - 7)]:
    cols.append(px[cx, cy])
bg_rgb = tuple(sum(c[i] for c in cols) // len(cols) for i in range(3))
print("corner bg =", bg_rgb)

DENS = {
    "mipmap-mdpi": 1, "mipmap-hdpi": 1.5, "mipmap-xhdpi": 2,
    "mipmap-xxhdpi": 3, "mipmap-xxxhdpi": 4,
}

def circle_alpha(size: int) -> Image.Image:
    m = Image.new("L", (size * 4, size * 4), 0)
    d = ImageDraw.Draw(m)
    d.ellipse((0, 0, size * 4 - 1, size * 4 - 1), fill=255)
    return m.resize((size, size), Image.LANCZOS)

for d, mult in DENS.items():
    out = os.path.join(RES, d)
    os.makedirs(out, exist_ok=True)

    # legacy launcher icon — full artwork (rounded corners baked into the art)
    s = int(48 * mult)
    art.resize((s, s), Image.LANCZOS).save(os.path.join(out, "ic_launcher.png"))

    # legacy round icon — circular crop
    r = art.resize((s, s), Image.LANCZOS)
    r.putalpha(circle_alpha(s))
    r.save(os.path.join(out, "ic_launcher_round.png"))

    # adaptive canvas = 108dp
    canvas = int(108 * mult)
    # foreground: artwork at 67% of canvas, centered (safe zone ~66dp)
    fg = Image.new("RGBA", (canvas, canvas), (0, 0, 0, 0))
    inner = int(canvas * 0.67)
    fg.paste(art.resize((inner, inner), Image.LANCZOS), ((canvas - inner) // 2,) * 2)
    fg.save(os.path.join(out, "ic_launcher_fg.png"))

    # background: solid navy sampled from the artwork corners
    Image.new("RGBA", (canvas, canvas), bg_rgb + (255,)).save(
        os.path.join(out, "ic_launcher_bg.png"))
    print(f"{d}: launcher={s}px fg={canvas}px inner={inner}px")

# ── in-app small brand logo (next to the app name) ──
os.makedirs(os.path.join(RES, "drawable-nodpi"), exist_ok=True)
art.resize((384, 384), Image.LANCZOS).save(os.path.join(RES, "drawable-nodpi", "brand_logo.png"))

# ── demo favicon ──
art.resize((512, 512), Image.LANCZOS).save(os.path.join(PUB, "logo-512.png"))

print("done ✓")
