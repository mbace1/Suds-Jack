#!/usr/bin/env python3
"""Radio Free Helsinki: fall-colour paper mosaic profile icons.
Torn/cut paper tiles in autumn colours + magenta accent. Night gaps between tiles.
Run: python3 make_fall_mosaic.py [m1 ...]"""
import math, os, random, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageChops

D = os.path.dirname(os.path.abspath(__file__)) + '/'
SZ, SS = 1080, 2
N = SZ * SS; C = N // 2
NIGHT = (13, 15, 22)
OCHRE = (227, 163, 58)
AMBER = (196, 120, 40)
RUST  = (160, 62, 36)
DEEPR = (110, 28, 32)
CREAM = (251, 243, 228)
MAG   = (240, 2, 127)
SHADOW = (6, 4, 14)
FALL = [OCHRE, AMBER, RUST, DEEPR, CREAM, (210, 140, 55), (180, 90, 40), (140, 48, 38)]

def disc_mask(r=None):
    r = r or C - 4 * SS
    m = Image.new('L', (N, N), 0)
    ImageDraw.Draw(m).ellipse((C - r, C - r, C + r, C + r), fill=255)
    return m

def sheet(canvas, layer, xy=(0, 0), lift=6, shade=0.45):
    x, y = xy; a = layer.getchannel('A')
    if lift:
        sh = Image.new('RGBA', layer.size, SHADOW + (0,))
        sh.putalpha(a.filter(ImageFilter.GaussianBlur(max(1, lift * SS))).point(lambda v: int(v * shade)))
        canvas.alpha_composite(sh, (x + int(lift * 0.2 * SS), y + int(lift * 0.55 * SS)))
    canvas.alpha_composite(layer, (x, y))

def torn_poly(cx, cy, r, n=7, seed=1, jagged=0.28):
    rnd = random.Random(seed)
    pts = []
    for i in range(n):
        a = (i / n) * math.tau + rnd.uniform(-0.12, 0.12)
        rr = r * (1 + rnd.uniform(-jagged, jagged))
        pts.append((cx + rr * math.cos(a), cy + rr * math.sin(a)))
    return pts

def tile(size, color, seed, style='torn'):
    """one paper tile as RGBA"""
    im = Image.new('RGBA', size, (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    w, h = size; rnd = random.Random(seed)
    if style == 'rect':
        pad = int(min(w, h) * 0.04)
        d.polygon([(pad + rnd.randint(-2, 2), pad), (w - pad, pad + rnd.randint(-2, 2)),
                   (w - pad + rnd.randint(-2, 2), h - pad), (pad, h - pad + rnd.randint(-2, 2))], fill=color + (255,))
    else:
        pts = torn_poly(w / 2, h / 2, min(w, h) * 0.46, n=rnd.randint(6, 9), seed=seed)
        d.polygon(pts, fill=color + (255,))
    # fibre texture
    a = im.getchannel('A')
    noise = Image.effect_noise(size, 28).convert('L')
    rgb = list(im.split()[:3])
    for i in range(3):
        rgb[i] = ImageChops.blend(rgb[i], ImageChops.multiply(rgb[i], noise), 0.18)
    out = Image.merge('RGBA', (*rgb, a))
    # top-edge highlight (paper lift)
    return out

def mosaic_field(mask, cell=70, gap=10, seed=1, colors=None, style='torn'):
    """fill mask with paper tiles separated by night gaps"""
    colors = colors or FALL
    rnd = random.Random(seed)
    field = Image.new('RGBA', (N, N), NIGHT + (255,))
    step = cell + gap
    # slight rotation variety per tile
    for iy, y in enumerate(range(-cell, N + cell, step)):
        for ix, x in enumerate(range(-cell, N + cell, step)):
            # jitter
            jx = x + rnd.randint(-gap // 2, gap // 2)
            jy = y + rnd.randint(-gap // 2, gap // 2)
            col = colors[(ix * 7 + iy * 13 + seed) % len(colors)]
            # occasionally magenta accent tile
            if rnd.random() < 0.04: col = MAG
            ts = cell + rnd.randint(-8, 12)
            t = tile((ts, ts), col, seed=seed * 1000 + ix * 50 + iy, style=style)
            ang = rnd.uniform(-12, 12)
            t = t.rotate(ang, expand=True, resample=Image.BICUBIC)
            # only paste if centre is inside mask
            cx, cy = jx + ts // 2, jy + ts // 2
            if 0 <= cx < N and 0 <= cy < N and mask.getpixel((min(N - 1, max(0, cx)), min(N - 1, max(0, cy)))) > 128:
                sheet(field, t, (jx - (t.width - ts) // 2, jy - (t.height - ts) // 2), lift=4, shade=0.4)
    # clip to mask
    out = Image.new('RGBA', (N, N), NIGHT + (255,))
    out.paste(field, (0, 0), mask)
    # night shows through gaps: multiply mask soft edge
    return out

def silhouette_mask(draw_fn):
    m = Image.new('L', (N, N), 0); draw_fn(ImageDraw.Draw(m)); return m

def mast_sil(d, cx, base, tip, half_base=90):
    """simplified lattice mast silhouette (filled)"""
    H = base - tip
    def hx(y):
        t = (y - tip) / H
        return max(6, half_base * (t ** 1.2))
    # shaft as tapering polygon
    pts = []
    for i in range(40):
        y = tip + H * i / 39; pts.append((cx - hx(y), y))
    for i in range(39, -1, -1):
        y = tip + H * i / 39; pts.append((cx + hx(y), y))
    d.polygon(pts, fill=255)
    # platforms / cross arms
    for t in (0.25, 0.4, 0.55, 0.7, 0.85):
        y = tip + H * t; arm = hx(y) * 1.8
        d.rectangle((cx - arm, y - 6 * SS, cx + arm, y + 6 * SS), fill=255)
    # tip blob
    d.ellipse((cx - 10 * SS, tip - 10 * SS, cx + 10 * SS, tip + 10 * SS), fill=255)

def skyline_sil(d, base, seed=3):
    rnd = random.Random(seed); x = int(N * 0.12)
    while x < N * 0.88:
        w = rnd.randint(int(N * 0.04), int(N * 0.09))
        h = rnd.randint(int(N * 0.12), int(N * 0.38))
        d.rectangle((x, base - h, x + w, base + 20), fill=255)
        if rnd.random() < 0.35:
            d.polygon([(x, base - h), (x + w / 2, base - h - w * 0.4), (x + w, base - h)], fill=255)
        x += w + rnd.randint(2, 10)
    # cathedral
    cx = int(N * 0.72); s = SS * 1.1; b = base
    d.rectangle((cx - 55 * s, b - 90 * s, cx + 55 * s, b + 10), fill=255)
    d.polygon([(cx - 58 * s, b - 90 * s), (cx, b - 120 * s), (cx + 58 * s, b - 90 * s)], fill=255)
    d.rectangle((cx - 22 * s, b - 150 * s, cx + 22 * s, b - 110 * s), fill=255)
    d.ellipse((cx - 28 * s, b - 185 * s, cx + 28 * s, b - 130 * s), fill=255)
    d.rectangle((cx - 4 * s, b - 210 * s, cx + 4 * s, b - 180 * s), fill=255)

def cathedral_mast_sil(d):
    base = int(N * 0.88)
    skyline_sil(d, base, seed=9)
    # mast left of cathedral
    mast_sil(d, int(N * 0.32), base, int(N * 0.18), half_base=int(N * 0.055))

def finish(canvas, name):
    # ensure circle crop look on square too (night outside already)
    m = disc_mask()
    night = Image.new('RGBA', (N, N), NIGHT + (255,))
    canvas = Image.composite(canvas, night, m)
    sq = canvas.convert('RGB').resize((SZ, SZ), Image.LANCZOS); sq.save(D + name + '-1080.png')
    cm = Image.new('L', (SZ, SZ), 0); ImageDraw.Draw(cm).ellipse((0, 0, SZ - 1, SZ - 1), fill=255)
    cm = cm.resize((SZ * 2, SZ * 2)).filter(ImageFilter.GaussianBlur(1)).resize((SZ, SZ), Image.LANCZOS)
    ci = Image.new('RGBA', (SZ, SZ), (0, 0, 0, 0)); ci.paste(sq, (0, 0), cm); ci.save(D + name + '-circle.png')
    print('wrote', name)

def mosaic_in_shape(shape_mask, cell=55, gap=8, seed=1, colors=None):
    """mosaic only inside shape; night elsewhere"""
    colors = colors or FALL
    rnd = random.Random(seed)
    field = Image.new('RGBA', (N, N), (0, 0, 0, 0))
    step = cell + gap
    # dilate shape slightly so tiles cover edges
    cover = shape_mask.filter(ImageFilter.MaxFilter(5))
    for iy, y in enumerate(range(-cell, N + cell, step)):
        for ix, x in enumerate(range(-cell, N + cell, step)):
            jx = x + rnd.randint(-gap, gap)
            jy = y + rnd.randint(-gap, gap)
            cx, cy = jx + cell // 2, jy + cell // 2
            if not (0 <= cx < N and 0 <= cy < N): continue
            if cover.getpixel((cx, cy)) < 128: continue
            col = colors[(ix * 5 + iy * 11 + seed) % len(colors)]
            if rnd.random() < 0.05: col = MAG
            ts = cell + rnd.randint(-6, 10)
            t = tile((ts, ts), col, seed=seed * 900 + ix * 40 + iy, style='torn')
            t = t.rotate(rnd.uniform(-18, 18), expand=True, resample=Image.BICUBIC)
            sheet(field, t, (jx - (t.width - ts) // 2, jy - (t.height - ts) // 2), lift=5, shade=0.45)
    # clip to shape
    out = Image.new('RGBA', (N, N), NIGHT + (255,))
    clipped = Image.new('RGBA', (N, N), (0, 0, 0, 0))
    clipped.paste(field, (0, 0), shape_mask)
    out.alpha_composite(clipped)
    return out

# ── variants ──
def m1():
    """mast silhouette built from mosaic tiles"""
    m = silhouette_mask(lambda d: mast_sil(d, C, int(N * 0.90), int(N * 0.12), half_base=int(N * 0.13)))
    # thicken for small size
    m = m.filter(ImageFilter.MaxFilter(13)).point(lambda v: 255 if v > 40 else 0)
    c = mosaic_in_shape(m, cell=52, gap=6, seed=11)
    # magenta tip accent tile
    tip = Image.new('RGBA', (N, N), (0, 0, 0, 0))
    ImageDraw.Draw(tip).ellipse((C - 22 * SS, int(N * 0.10), C + 22 * SS, int(N * 0.10) + 44 * SS), fill=MAG + (255,))
    sheet(c, tip, (0, 0), lift=6)
    finish(c, 'm1-mast-mosaic')

def m2():
    """Helsinki skyline mosaic"""
    m = silhouette_mask(lambda d: skyline_sil(d, int(N * 0.88), seed=4))
    m = m.filter(ImageFilter.MaxFilter(7)).point(lambda v: 255 if v > 40 else 0)
    # also fill a ground strip
    d = ImageDraw.Draw(m); d.rectangle((0, int(N * 0.86), N, int(N * 0.94)), fill=255)
    c = mosaic_in_shape(m, cell=38, gap=5, seed=22, colors=[OCHRE, AMBER, RUST, DEEPR, CREAM, (200, 130, 50)])
    finish(c, 'm2-skyline-mosaic')

def m3():
    """abstract mosaic disc — full circle of torn autumn tiles"""
    m = disc_mask(C - 20 * SS)
    c = mosaic_field(m, cell=78, gap=12, seed=33, style='torn')
    # one deliberate magenta tile near centre-right
    t = tile((90 * SS // 2, 90 * SS // 2), MAG, seed=333, style='torn')
    t = t.rotate(15, expand=True, resample=Image.BICUBIC)
    sheet(c, t, (int(N * 0.58), int(N * 0.42)), lift=8)
    finish(c, 'm3-abstract-disc')

def m4():
    """cathedral + mast in mosaic"""
    m = silhouette_mask(cathedral_mast_sil)
    m = m.filter(ImageFilter.MaxFilter(7)).point(lambda v: 255 if v > 40 else 0)
    d = ImageDraw.Draw(m); d.rectangle((0, int(N * 0.86), N, int(N * 0.94)), fill=255)
    c = mosaic_in_shape(m, cell=40, gap=6, seed=44)
    # magenta accent on mast tip
    tip = Image.new('RGBA', (N, N), (0, 0, 0, 0))
    ImageDraw.Draw(tip).ellipse((int(N * 0.32) - 18 * SS, int(N * 0.16), int(N * 0.32) + 18 * SS, int(N * 0.16) + 36 * SS), fill=MAG + (255,))
    sheet(c, tip, (0, 0), lift=5)
    finish(c, 'm4-cathedral-mast-mosaic')

def m5():
    """concentric mosaic rings (paper wreath) with mast cutout in night centre"""
    c = Image.new('RGBA', (N, N), NIGHT + (255,))
    rnd = random.Random(55)
    # three concentric rings of tiles
    for ring_i, (r_mid, n_tiles, ts) in enumerate([(0.38, 16, 70), (0.30, 12, 64), (0.22, 10, 58)]):
        R = int(N * r_mid)
        for i in range(n_tiles):
            a = i / n_tiles * math.tau + rnd.uniform(-0.05, 0.05)
            cx = C + R * math.cos(a); cy = C + R * math.sin(a)
            col = FALL[(i + ring_i * 3) % len(FALL)]
            if i == 3 and ring_i == 0: col = MAG
            t = tile((ts * SS // 1, ts * SS // 1), col, seed=55 + ring_i * 100 + i)
            t = t.rotate(math.degrees(a) + 90 + rnd.uniform(-10, 10), expand=True, resample=Image.BICUBIC)
            sheet(c, t, (int(cx - t.width / 2), int(cy - t.height / 2)), lift=5)
    # mast silhouette punched as night (negative) — draw cream mosaic mast instead
    m = silhouette_mask(lambda d: mast_sil(d, C, int(N * 0.74), int(N * 0.26), half_base=int(N * 0.08)))
    m = m.filter(ImageFilter.MaxFilter(5)).point(lambda v: 255 if v > 40 else 0)
    mast = mosaic_in_shape(m, cell=28, gap=4, seed=56, colors=[CREAM, OCHRE, AMBER, CREAM])
    # only keep mast pixels
    mast_only = Image.new('RGBA', (N, N), (0, 0, 0, 0))
    mast_only.paste(mast, (0, 0), m)
    sheet(c, mast_only, (0, 0), lift=8)
    finish(c, 'm5-wreath-mast')

VARIANTS = [
    ('m1', 'm1-mast-mosaic', m1),
    ('m2', 'm2-skyline-mosaic', m2),
    ('m3', 'm3-abstract-disc', m3),
    ('m4', 'm4-cathedral-mast-mosaic', m4),
    ('m5', 'm5-wreath-mast', m5),
]

def contact():
    f = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 24)
    fs = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 15)
    cw, ch = 420, 580
    cols = 3; rows = 2
    cs = Image.new('RGB', (cols * cw, rows * ch + 50), (34, 34, 40)); d = ImageDraw.Draw(cs)
    d.text((16, 12), 'Radio Free Helsinki: fall mosaic icons (400 · 64 · 48)', font=f, fill=CREAM)
    for i, (lab, stem, _) in enumerate(VARIANTS):
        x, y = (i % cols) * cw, 50 + (i // cols) * ch
        ci = Image.open(D + stem + '-circle.png')
        b = ci.resize((360, 360), Image.LANCZOS); cs.paste(b, (x + 30, y + 10), b)
        for j, z in enumerate((64, 48)):
            t = ci.resize((z, z), Image.LANCZOS); cs.paste(t, (x + 120 + j * 100, y + 390 + (64 - z) // 2), t)
        d.text((x + cw // 2, y + 480), lab, font=f, fill=CREAM, anchor='mm')
        d.text((x + cw // 2, y + 510), stem[3:].replace('-', ' '), font=fs, fill=(170, 170, 178), anchor='mm')
    cs.save(D + 'contact-sheet.png'); print('wrote contact-sheet.png')

if __name__ == '__main__':
    only = sys.argv[1:]
    for lab, stem, fn in VARIANTS:
        if not only or lab in only: fn()
    contact()
