#!/usr/bin/env python3
"""The old trams from inside (v3.3, ACT1.md §6: look only). One interior plate
serves every model; the older ones are the same car with its flat colour
families remapped — the museum tram in varnished wood with slatted benches,
brass and a bell rope, the Nr I and Nr II in a 1970s palette (orange ribbed
vinyl, beige laminate, chrome). The newer three keep the plate as painted.

The plate is flat vector, so a colour family is a handful of tones; each is
moved to its target with its shading kept (value relative to the family's
main tone). Two traps, both found by looking: the antialiased seam where a
blue seat meets a cream wall is a pale blue in neither family (a white fringe
round every seat), and part of the seat was cut WITH the riders, so the
people and courier layers carry seat-blue too — moved by a strict test, since
the courier's navy jacket is the same hue (it is more saturated).

  python make_interiors.py            # writes scenes/tram/<fmt>/0{2,3,4}-*-<theme>.webp
"""
import os, sys, subprocess, tempfile
import numpy as np
from PIL import Image
def hsv(rgb):
    r, g, b = [rgb[..., i] for i in range(3)]; mx = rgb.max(-1); mn = rgb.min(-1); d = mx - mn
    h = np.zeros_like(mx)
    m = d > 1e-6
    rr = m & (mx == r); gg = m & (mx == g) & ~rr; bb = m & ~rr & ~gg
    h[rr] = ((g - b)[rr] / d[rr]) % 6; h[gg] = (b - r)[gg] / d[gg] + 2; h[bb] = (r - g)[bb] / d[bb] + 4
    h = h * 60; s = np.where(mx > 0, d / np.maximum(mx, 1e-6), 0); return h, s, mx
def hx(c): return np.array([int(c[i:i + 2], 16) for i in (1, 3, 5)], float) / 255
# family: (test, reference value, target colour)
def patches(mask):
    # 8-connected labels by breadth-first search (numpy and Pillow are all the
    # pipeline has; a rider layer holds a few hundred thousand blue pixels)
    from collections import deque
    H, W = mask.shape; flat = mask.ravel(); lab = np.zeros(H * W, np.int32); n = 0
    for start in np.flatnonzero(flat):
        if lab[start]: continue
        n += 1; lab[start] = n; q = deque([start])
        while q:
            i = q.popleft(); y, x = divmod(int(i), W)
            for dy in (-1, 0, 1):
                yy = y + dy
                if yy < 0 or yy >= H: continue
                for dx in (-1, 0, 1):
                    xx = x + dx
                    if 0 <= xx < W:
                        j = yy * W + xx
                        if flat[j] and not lab[j]: lab[j] = n; q.append(j)
    return lab.reshape(H, W)
def riders(src, out, theme):
    # the seat that shows between and under the riders was cut WITH them: only
    # its own blue moves (a seat is less saturated than the courier's navy
    # jacket, s .55 against .77, and bluer than his black trousers)
    im = np.array(Image.open(src).convert('RGBA')).astype(float); rgb = im[..., :3] / 255; a = im[..., 3]
    h, s, v = hsv(rgb)
    m = (h > 198) & (h < 232) & (s > 0.34) & (s < 0.67) & (v > 0.3) & (v < 0.57) & (rgb[..., 0] > 0.13) & (a > 0)
    # ...but where the seat shows THROUGH a rider (the gap between the knees) it
    # is lit, and lit seat is the jacket's own blue: no colour test can part
    # them. Size can: the jacket is big patches of blue (the strap and the shirt
    # cut it into several — "all but the largest" turned half of it brown), and
    # seat seen through a gap is a small one.
    # (patches are found AFTER the strict test has taken its seat pixels out:
    # before, those pixels were the bridge that joined a gap to the jacket)
    loose = (h > 195) & (h < 235) & (s > 0.3) & (v > 0.28) & (a > 0) & ~m
    lab = patches(loose)
    if lab.max() > 1:
        area = np.bincount(lab.ravel()); area[0] = 0
        small = np.flatnonzero((area > 0) & (area < 0.08 * area.max()))
        m |= loose & np.isin(lab, small)
    res = rgb.copy(); tgt = hx(THEMES[theme]['seat']); res[m] = np.clip(tgt[None, :] * (v[m] / 0.53)[:, None], 0, 1)
    Image.fromarray(np.dstack([res * 255, a]).astype(np.uint8), 'RGBA').save(out)
    return int(m.sum())
def remap(src, out, theme):
    im = np.array(Image.open(src).convert('RGBA')).astype(float); rgb = im[..., :3] / 255; a = im[..., 3]
    h, s, v = hsv(rgb)
    fam = {
      'seat': (h > 185) & (h < 240) & (s > 0.22),
      'pole': (h > 18) & (h < 48) & (s > 0.45) & (v > 0.55),
      'wall': (h > 8) & (h < 70) & (s < 0.42) & (v > 0.62),
      'grey': (s < 0.2) & (v <= 0.62),
    }
    # the antialiased seam where a blue seat meets a cream wall is neither: a pale
    # desaturated blue. Left alone it is a white fringe round every seat.
    fam['seam'] = (h > 160) & (h < 250) & (s <= 0.22) & (s > 0.04) & (v > 0.5) & ~fam['grey']
    # and the 1px highlight along the top of every seat back: near-white, in no family
    hl = (s < 0.25) & (v > 0.75) & ~fam['wall'] & ~fam['seam'] & (a > 0)
    REF = {'seat': 0.53, 'pole': 0.78, 'wall': 0.97, 'grey': 0.47}
    T = THEMES[theme]
    res = rgb.copy()
    for k, m in fam.items():
        if k not in T: continue
        tgt = hx(T[k]); scale = (v[m] / REF[k])[:, None]
        res[m] = np.clip(tgt[None, :] * scale, 0, 1)
    sm = fam['seam']
    if sm.any():
        k = np.clip((v[sm] - 0.53) / (0.97 - 0.53), 0, 1)[:, None]
        res[sm] = np.clip(hx(T['seat'])[None, :] * (1 - k) + hx(T['wall'])[None, :] * k, 0, 1)
    if hl.any(): res[hl] = np.clip(hx(T['wall'])[None, :] * 1.22, 0, 1)
    H, W = a.shape; yy, xx = np.mgrid[0:H, 0:W]
    if theme == 'museum':
        # varnish: a slow grain along the boards, and the seats as slats
        grain = 0.94 + 0.06 * np.sin(yy / 3.1 + np.sin(xx / 57.0) * 2.2) + 0.03 * np.sin(yy / 0.9 + xx / 140.0)
        w = fam['wall']; res[w] *= grain[w][:, None]
        sl = fam['seat']; slat = ((yy // max(6, H // 120)) % 3 == 0)
        res[sl & slat] *= 0.72
        # the bell rope: a cord along the ceiling, sagging between its hangers
        n = 5; th = max(3, H // 300)
        for i in range(n):
            x0, x1 = i * W / n, (i + 1) * W / n
            for x in range(int(x0), int(min(W, x1))):
                t = (x - x0) / (x1 - x0); y = int(H * 0.045 + 4 * (H / 1080) * 6 * t * (1 - t))
                if a[y, x] > 200:
                    res[y:y + th, x] = hx('#efe0b4'); res[y + th:y + th + 1, x] = hx('#8a6a3a')
            hxp = int(x0) + 2
            if 0 <= hxp < W: res[: int(H * 0.045) + 2, hxp:hxp + th] = hx('#8a6a3a') * (a[: int(H * 0.045) + 2, hxp:hxp + th] > 200)[..., None] + res[: int(H * 0.045) + 2, hxp:hxp + th] * (a[: int(H * 0.045) + 2, hxp:hxp + th] <= 200)[..., None]
    if theme == 'old':
        sl = fam['seat']; rib = ((xx // max(5, W // 220)) % 2 == 0); res[sl & rib] *= 0.92     # ribbed vinyl
    o = np.dstack([np.clip(res, 0, 1) * 255, a]).astype(np.uint8)
    Image.fromarray(o, 'RGBA').save(out)
THEMES = {
  'museum': {'seat': '#b98448', 'pole': '#d9ae4c', 'wall': '#a8713e', 'grey': '#5b4632'},
  'old':    {'seat': '#b4592c', 'pole': '#b9c0c4', 'wall': '#eadbb0', 'grey': '#6d6253'},
}
def webp(png, path):
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', png, '-c:v', 'libwebp', '-quality', '82', '-pix_fmt', 'yuva420p', path], check=True)

if __name__ == '__main__':
    HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.normpath(f'{HERE}/../../scenes/tram')
    with tempfile.TemporaryDirectory() as tmp:
        for fmt in ('169', '916'):
            for th in THEMES:
                d = f'{ROOT}/{fmt}'
                remap(f'{d}/02-car.webp', f'{tmp}/c.png', th); webp(f'{tmp}/c.png', f'{d}/02-car-{th}.webp')
                for L in ('03-people', '04-courier'):
                    riders(f'{d}/{L}.webp', f'{tmp}/r.png', th); webp(f'{tmp}/r.png', f'{d}/{L}-{th}.webp')
                print(fmt, th, flush=True)
