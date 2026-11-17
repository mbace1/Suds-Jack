"""Seat Toko's head on the courier's neck in the tram and metro interiors
(toko-move v3.19; owner, 2026-11-08: "The neck is a bit disconnected").

The face disc sat high on the 04-courier layers: about 40 px of neck showed
between its ring and the collar. This moves the disc (the cyan face and its
white ring, as one circular patch) down so its ring meets the collar, and
centres it over the neck. It always works from the originals, kept in
_prev/neck/ the first time it runs, so running it again gives the same files. A redrawn courier from the art request (ART-REQUEST-v3.18, item 2)
replaces all of this.

  python3 fix_neck.py            # writes ../../scenes/{tram,metro}/{916,169}/04-courier*.webp
"""
import glob, os, shutil
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SCENES = os.path.join(HERE, '..', '..', 'scenes')
GAP = {'916': 12, '169': 14}          # how much neck may show under the ring, px

def measure(a):
    r, g, b, al = (a[..., i].astype(int) for i in range(4))
    cyan = (al > 200) & (b > 170) & (g > 150) & (r < 110) & (b - r > 90)
    ys, xs = np.nonzero(cyan)
    cx, cy, R = xs.mean(), ys.mean(), (xs.max() - xs.min()) / 2
    skin = (al > 200) & (r > 150) & (r < 235) & (g > 100) & (g < 190) & (b > 60) & (b < 150) & (r - b > 50)
    band = np.zeros_like(skin); band[int(cy + R * 0.7):int(cy + R * 1.6), int(cx - R * 1.3):int(cx + R * 1.3)] = True
    sy, sx = np.nonzero(skin & band)
    return cx, cy, R, sx.mean(), sy.max()

def seat(path, fmt):
    keep = os.path.join(HERE, '_prev', 'neck', path.split('scenes' + os.sep)[1].replace(os.sep, '__'))
    if not os.path.exists(keep): shutil.copy(path, keep)  # the original, once
    a = np.array(Image.open(keep).convert('RGBA'))
    cx, cy, R, nx, collar = measure(a)
    ring = R * 1.13 + 2                                   # the white ring outside the cyan
    dx, dy = round(nx - cx), round(collar - GAP[fmt] - (cy + ring))
    H, W = a.shape[:2]; yy, xx = np.mgrid[0:H, 0:W]
    old = (xx - cx) ** 2 + (yy - cy) ** 2 <= ring ** 2
    patch = np.zeros_like(a); patch[old] = a[old]
    out = a.copy(); out[old] = 0                           # the head lifts off
    moved = np.roll(np.roll(patch, dy, axis=0), dx, axis=1)
    m = moved[..., 3] > 0
    out[m] = moved[m]                                      # and is set down on the neck
    Image.fromarray(out).save(path, 'WEBP', quality=90, method=6)
    return dx, dy

for mode in ('tram', 'metro'):
    for fmt in ('916', '169'):
        for p in sorted(glob.glob(os.path.join(SCENES, mode, fmt, '04-courier*.webp'))):
            print(os.path.relpath(p, SCENES), 'moved by', seat(p, fmt))
