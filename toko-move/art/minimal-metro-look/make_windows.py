#!/usr/bin/env python3
"""What the window shows (toko-move v3.11; owner 2026-11-07, on a night screenshot: "Rain seems to be falling
into 2 different directions here. But assume we need more of these and outside art").

The window is a seamless tile the game scrolls (plates.py cut it). To make its two ends meet, plates.py put the
picture beside its own MIRROR — fine for a row of houses, wrong for the rain the night plate had painted in: the
left half fell one way and the right half the other, and where they met the streaks made a row of Λs. So the rain
comes OUT of the plate here and goes back in as weather, drawn at x, x-W and x+W so the tile stays seamless, and
all of it falls the same way (down and to the left — the car runs right, so the drops trail behind it, the same
slant as the stop's rain).

And since the weather is now a layer of its own, the window carries all of it, by day and by night. Until now a
rainy run showed sun through the glass, because the stop's weather is never drawn inside the car:

  scenes/tram/<fmt>/01-outside-tile.webp                  clear, as painted
  scenes/tram/<fmt>/01-outside-tile-<rain|snow|fog>.webp
  scenes/night/<fmt>/01-outside-tile.webp                 RAIN, falling one way (the night run is always 'clear' and
                                                          its look was always a rainy night; that stays)
  scenes/night/<fmt>/01-outside-tile-<snow|fog>.webp      from the dried plate, for a night that gets weather

Run from this folder:  python3 make_windows.py ../../scenes
"""
import os, sys, tempfile, math, random, shutil
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
import make_interiors as MI

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = sys.argv[1] if len(sys.argv) > 1 else '../../scenes'
SLANT = -0.27                      # dx per dy: down and to the LEFT (the stop's CSS rain is 105deg, the same 15deg)

def save(im, path):
    with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as t: im.save(t.name)
    MI.webp(t.name, path); os.unlink(t.name)

def dry(im):
    """Take the painted rain out. A streak is steep and ~5px across, so along a ROW it is a short bright run: anything
    brighter than the median of its 31px row neighbourhood, and not lamp-coloured, is rain, and gets that median.
    (A square 9px median does not work: a steep streak fills more than half of the square, and its ghost stays.)"""
    rgb = np.array(im.convert('RGB')); H, W, _ = rgb.shape; R = 15
    pad = np.concatenate([rgb[:, -R:], rgb, rgb[:, :R]], 1)                  # the tile wraps, so its row does too
    win = np.lib.stride_tricks.sliding_window_view(pad, 2 * R + 1, axis=1)   # (H, W, 3, 31)
    med = np.median(win, -1).astype(float) / 255
    a = rgb.astype(float) / 255; h, s, v = MI.hsv(a); _, _, vm = MI.hsv(med)
    lamp = (h > 15) & (h < 65) & (s > 0.35)
    m = (v - vm > 0.015) & ~lamp
    m = np.array(Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(3))) > 0   # and its fringe
    m &= ~lamp
    out = a.copy(); out[m] = med[m]
    return Image.fromarray((out * 255).astype(np.uint8)).convert('RGBA'), int(m.sum())

def wrap(W, x, f):
    for o in (-W, 0, W): f(x + o)

def rain(im, night, seed=3):
    W, H = im.size; u = H / 1080; r = random.Random(seed)
    lay = Image.new('RGBA', (W * 2, H * 2), (0, 0, 0, 0)); d = ImageDraw.Draw(lay)   # 2x, for clean thin lines
    col = (196, 218, 236) if night else (236, 244, 250)
    n = int(W * H / (1080 * 1080) * 75)                                    # the plate's own rain: few, long, crisp
    for _ in range(n):
        x, y = r.uniform(0, W), r.uniform(-200 * u, H); L = r.uniform(90, 230) * u; a = int(r.uniform(.6, .95) * 255)
        wd = r.choice((4, 5, 6))
        wrap(W, x, lambda xx: d.line([(2 * xx, 2 * y), (2 * (xx + SLANT * L), 2 * (y + L))], fill=col + (a,), width=wd))
    for _ in range(n // 4):                                                    # a few drops on the glass
        x, y = r.uniform(0, W), r.uniform(0, H); rr = r.uniform(3, 6) * u
        wrap(W, x, lambda xx: (d.ellipse([2 * (xx - rr), 2 * (y - rr), 2 * (xx + rr), 2 * (y + rr)], fill=col + (90,)),
                               d.polygon([(2 * (xx - rr * .7), 2 * (y - rr * .4)), (2 * xx, 2 * (y - rr * 2.6)), (2 * (xx + rr * .7), 2 * (y - rr * .4))], fill=col + (90,))))
    lay = lay.resize((W, H), Image.LANCZOS)
    base = im.copy()
    if not night: base = tint(base, (150, 162, 172), .32)                       # overcast
    base.alpha_composite(lay); return base

def snow(im, night, seed=5):
    W, H = im.size; u = H / 1080; r = random.Random(seed)
    base = tint(im, (60, 74, 96) if night else (226, 232, 236), .22 if night else .30)
    lay = Image.new('RGBA', (W * 2, H * 2), (0, 0, 0, 0)); d = ImageDraw.Draw(lay)
    for _ in range(int(W * H / (1080 * 1080) * 190)):
        x, y = r.uniform(0, W), r.uniform(0, H); rr = r.choice((2.2, 3, 3, 4, 5.5)) * u * (1 if night else 1.35); a = int(r.uniform(.7, 1) * 255)
        edge = (128, 146, 160, int(a * .75)) if not night else None
        wrap(W, x, lambda xx: (edge and d.ellipse([2 * (xx - rr - 1), 2 * (y - rr - 1), 2 * (xx + rr + 1), 2 * (y + rr + 1)], fill=edge),
                               d.ellipse([2 * (xx - rr), 2 * (y - rr), 2 * (xx + rr), 2 * (y + rr)], fill=(255, 255, 255, a))))
    base.alpha_composite(lay.resize((W, H), Image.LANCZOS)); return base

def fog(im, night):
    W, H = im.size; a = np.array(im).astype(float)
    c = np.array((84, 98, 118) if night else (232, 236, 238), float)
    y = np.linspace(0, 1, H)[:, None, None]
    k = np.clip(.55 + .30 * np.exp(-((y - .55) / .18) ** 2), 0, .85)             # thickest at the street, where the houses stand
    a[..., :3] = a[..., :3] * (1 - k) + c * k
    return Image.fromarray(a.astype(np.uint8), 'RGBA')

def tint(im, col, k):
    a = np.array(im).astype(float); a[..., :3] = a[..., :3] * (1 - k) + np.array(col, float) * k
    return Image.fromarray(a.astype(np.uint8), 'RGBA')

def main():
    for scene, night in (('night', True), ('tram', False)):
        for fmt in ('916', '169'):
            d = f'{OUT}/{scene}/{fmt}'; src = f'{d}/01-outside-tile.webp'
            im = Image.open(src).convert('RGBA')
            if night:
                keep = f'{HERE}/_prev/night-{fmt}-tile-painted.webp'                   # the plate as cut, rain and all
                if not os.path.exists(keep): shutil.copyfile(src, keep)
                im = Image.open(keep).convert('RGBA')                                     # so a re-run starts from it, not from its own output
                im, n = dry(im); print(scene, fmt, 'dried', n, 'px', flush=True)
                save(rain(im, night), src)          # the night run is always 'clear', and its look is a rainy night: it keeps its rain
            else: save(rain(im, night), f'{d}/01-outside-tile-rain.webp')
            save(snow(im, night), f'{d}/01-outside-tile-snow.webp')
            save(fog(im, night), f'{d}/01-outside-tile-fog.webp')
            print(scene, fmt, 'done', flush=True)

if __name__ == '__main__': main()
