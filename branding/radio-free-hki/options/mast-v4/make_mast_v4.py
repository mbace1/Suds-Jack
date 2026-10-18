#!/usr/bin/env python3
"""RFH mast icon v4: three refinements of v3-5 (duotone ochre dusk).
Reuses the papercut helpers from ../mast-v3/make_mast_v3.py. Run: python3 make_mast_v4.py"""
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__)) + '/'
sys.path.insert(0, HERE + '../mast-v3')
import make_mast_v3 as m3
from make_mast_v3 import (N, C, S, NIGHT, MAG, CREAM, layer, sheet, radial, linear, glow, mast, rooftops)
from PIL import Image, ImageDraw, ImageFont, ImageFilter
m3.OUT = HERE

def round_arcs(d, cx, cy, radii, a0, a1, col, widths):
    """crisp arcs with rounded ends"""
    import math
    for r, w in zip(radii, widths):
        d.arc((cx - r, cy - r, cx + r, cy + r), a0, a1, fill=col, width=int(w))
        for a in (a0, a1):
            t = math.radians(a); rr = r - w / 2
            x, y = cx + rr * math.cos(t), cy + rr * math.sin(t)
            d.ellipse((x - w / 2, y - w / 2, x + w / 2, y + w / 2), fill=col)

def tip_light(c, x, y, core, halo, strength):
    glow(c, x, y, halo, MAG, strength)
    T = layer(); ImageDraw.Draw(T).ellipse((x - core, y - core, x + core, y + core), fill=MAG + (255,))
    sheet(c, T, lift=2, tex=0.02, seed=9, shade=0.3, rim=False)

def v1():
    """Cleaner + lower: one low rooftop ridge with the cathedral, more sky, crisp rounded night waves, small tight tip."""
    c = radial((248, 196, 100), (204, 128, 36), C, int(N * .66), int(N * .74), 1.15)
    tip = int(N * .52)
    W = layer(); round_arcs(ImageDraw.Draw(W), C, tip - 70 * S, [110 * S, 195 * S, 280 * S], 215, 325, NIGHT + (255,), [26 * S, 23 * S, 20 * S])
    sheet(c, W, lift=4, tex=0.04, seed=50, shade=0.25, rim=False)
    R = layer(); rooftops(ImageDraw.Draw(R), int(N * .93), NIGHT + (255,), seed=21, h=85, cathedral_x=int(N * .76)); sheet(c, R, lift=5, tex=0.04, seed=51, shade=0.25, rim=False)
    M = layer(); top = mast(ImageDraw.Draw(M), C, int(N * .91), tip, 150 * S, NIGHT + (255,), leg=26, brace=13, bays=4)
    sheet(c, M, lift=6, tex=0.03, seed=52, shade=0.25, rim=False)
    tip_light(c, C, top, 14 * S, 34 * S, 0.8)
    m3.finish(c, 'v4-1-clean-low')

def v2():
    """Warmer dusk: honey-to-amber-to-burnt-orange sky, lower mast, stronger magenta tip glow."""
    c = linear((250, 206, 112), (226, 112, 38), int(N * .05), int(N * .92))
    glow(c, C, int(N * .86), int(N * .38), (255, 222, 140), 0.45)   # low sun behind the skyline
    tip = int(N * .50)
    W = layer(); round_arcs(ImageDraw.Draw(W), C, tip - 70 * S, [110 * S, 195 * S, 280 * S], 212, 328, NIGHT + (255,), [24 * S, 21 * S, 18 * S])
    sheet(c, W, lift=5, tex=0.05, seed=60, shade=0.28, rim=False)
    R = layer(); rooftops(ImageDraw.Draw(R), int(N * .92), NIGHT + (255,), seed=21, h=120, cathedral_x=int(N * .77)); sheet(c, R, lift=6, tex=0.04, seed=61, shade=0.28, rim=False)
    M = layer(); top = mast(ImageDraw.Draw(M), C, int(N * .90), tip, 150 * S, NIGHT + (255,), leg=25, brace=12, bays=4)
    sheet(c, M, lift=8, tex=0.04, seed=62, shade=0.28, rim=False)
    # stronger tip: clean pink halo ring + bright core (no muddy dark blur on ochre)
    H = layer(); ImageDraw.Draw(H).ellipse((C - 46 * S, top - 46 * S, C + 46 * S, top + 46 * S), fill=(255, 120, 180, 150))
    c.alpha_composite(H.filter(ImageFilter.GaussianBlur(14 * S)))
    tip_light(c, C, top, 20 * S, 30 * S, 0.9)
    m3.finish(c, 'v4-2-warm-strong-glow')

def v3():
    """Pure silhouette: no rooftops, just a horizon; big low mast, four tapering waves, small sharp tip."""
    c = radial((250, 200, 104), (200, 122, 32), C, int(N * .70), int(N * .78), 1.2)
    G = layer(); ImageDraw.Draw(G).rectangle((0, int(N * .88), N, N), fill=NIGHT + (255,)); sheet(c, G, lift=4, tex=0.03, seed=70, shade=0.25, rim=False)
    tip = int(N * .48)
    W = layer(); round_arcs(ImageDraw.Draw(W), C, tip - 60 * S, [95 * S, 165 * S, 235 * S, 305 * S], 218, 322, NIGHT + (255,), [24 * S, 21 * S, 18 * S, 15 * S])
    sheet(c, W, lift=4, tex=0.04, seed=71, shade=0.25, rim=False)
    M = layer(); top = mast(ImageDraw.Draw(M), C, int(N * .89), tip, 175 * S, NIGHT + (255,), leg=30, brace=15, bays=4)
    sheet(c, M, lift=6, tex=0.03, seed=72, shade=0.25, rim=False)
    tip_light(c, C, top, 13 * S, 26 * S, 0.7)
    m3.finish(c, 'v4-3-pure-silhouette')

VARIANTS = [('v4-1', 'v4-1-clean-low', v1), ('v4-2', 'v4-2-warm-strong-glow', v2), ('v4-3', 'v4-3-pure-silhouette', v3)]

def contact():
    B = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
    f = ImageFont.truetype(B, 24); fs = ImageFont.truetype(B, 17)
    cs = Image.new('RGB', (3 * 500, 640), (34, 34, 40)); d = ImageDraw.Draw(cs)
    d.text((20, 16), 'Radio Free Helsinki: mast v4 (refining v3-5), 400px · 64px · 48px', font=f, fill=CREAM)
    for i, (lab, stem, _) in enumerate(VARIANTS):
        x = i * 500; ci = Image.open(HERE + stem + '-circle.png')
        b = ci.resize((400, 400), Image.LANCZOS); cs.paste(b, (x + 50, 60), b)
        for j, z in enumerate((64, 48)):
            t = ci.resize((z, z), Image.LANCZOS); cs.paste(t, (x + 170 + j * 110, 480 + (64 - z) // 2), t)
        d.text((x + 250, 580), lab, font=f, fill=CREAM, anchor='mm')
        d.text((x + 250, 612), stem[5:].replace('-', ' '), font=fs, fill=(170, 170, 178), anchor='mm')
    cs.save(HERE + 'contact-sheet.png'); print('wrote contact-sheet.png')

if __name__ == '__main__':
    only = sys.argv[1:]
    for lab, stem, fn in VARIANTS:
        if not only or lab in only: fn()
    contact()
