#!/usr/bin/env python3
"""Toko Move flat-illustration scenes, pass 2 ("too blocky -> closer to the refs"). Procedural flat vector (Pillow):
articulated people (tapered limbs, hair silhouettes, jackets over shirts, shoes, bags, phones), L-shaped seats with
cushions, gold poles + strap handles, framed windows, door bays, ceiling/floor bands. Interiors are side-on (ref 1 / the
CP2077 seated-courier staging); the disruption stop is icon-clean isometric (ref 2). Flat fills only: no gradients,
no texture. Exactly ONE person has a Toko face: the courier. Every scene returns full-frame transparent layers."""
import math, numpy as np
from PIL import Image, ImageDraw
import bible_render as B
from bible_render import hx, font, CSS
import look

SS = 2
C = dict(paper='#f4f1e8', panel='#fffdf7', ink='#15262b', dim='#69777a', rule='#c5cec8', navy='#233d4d', water='#c9e4e8',
         metro='#e2531f', metroLit='#ff6a3d', t4='#8a6802', t4n='#c09734', t2='#04829a', halt='#b8c2c6', coral='#e2683c', cyan='#33b2d2')
SKIN = ['#e8b996', '#c98e66', '#8d5b3f', '#f1cfb0', '#b07a52']
HAIR = ['#2b2420', '#6b3e26', '#c9a15a', '#15262b', '#9aa3a6', '#a8502c']
INTERIOR = ['01-outside', '02-car-shell', '03-fixtures', '04-people', '05-courier', '06-signage', '07-hud', '08-card']
STOP = ['01-backdrop', '02-street', '03-tram', '04-shelter', '05-people', '06-courier', '07-signage', '08-hud', '09-card']
MARK = {}                                     # (scene, W, H) -> dict(head=(x, y), plate=(x, y)) in output px

def rgb(c): return np.array(hx(c)[:3], float)
def mix(a, b, t): v = rgb(a) + (rgb(b) - rgb(a)) * t; return '#%02x%02x%02x' % tuple(int(round(x)) for x in v)
def shade(c, k): return mix(c, '#000000', 1 - k) if k < 1 else mix(c, '#ffffff', k - 1)

class Frame:
    def __init__(s, W, H):
        s.W, s.H = W, H; s.k = SS; s.u = min(W, H) / 1080 * SS
        s.vert = H > W
        s.oy = 470 * s.u if s.vert else 0
        s.cx = (W * .40 if not s.vert else W * .5) * SS
    def new(s): return Image.new('RGBA', (s.W * SS, s.H * SS), (0, 0, 0, 0))
    def Y(s, y): return s.oy + y * s.u
    def X(s, x): return s.cx + x * s.u
    def down(s, im): return im.resize((s.W, s.H), Image.LANCZOS)

def rr(d, box, r, fill, outline=None, width=0):
    x0, y0, x1, y1 = box; d.rounded_rectangle([min(x0, x1), min(y0, y1), max(x0, x1), max(y0, y1)], radius=max(0, min(r, abs(x1 - x0) / 2 - .01, abs(y1 - y0) / 2 - .01)), fill=fill, outline=outline, width=width)
def bar(d, a, b, w, fill):
    d.line([a, b], fill=fill, width=max(1, int(w))); r = w / 2
    for p in (a, b): d.ellipse([p[0] - r, p[1] - r, p[0] + r, p[1] + r], fill=fill)

# ================================================================ people
class Pen:
    """Person-local drawing: origin = floor point under the hip, +x = facing direction, +y = up, units ~ design px."""
    def __init__(s, img, ox, oy, k, f=1):
        s.img, s.d, s.ox, s.oy, s.k, s.f = img, ImageDraw.Draw(img), ox, oy, k, f
    def p(s, x, y): return (s.ox + s.f * x * s.k, s.oy - y * s.k)
    def poly(s, pts, col): s.d.polygon([s.p(*q) for q in pts], fill=hx(col))
    def ell(s, x, y, rx, ry, col):
        cx, cy = s.p(x, y); s.d.ellipse([cx - rx * s.k, cy - ry * s.k, cx + rx * s.k, cy + ry * s.k], fill=hx(col))
    def rect(s, x0, y0, x1, y1, r, col, outline=None, w=0):
        a, b = s.p(x0, y0), s.p(x1, y1); rr(s.d, (a[0], a[1], b[0], b[1]), r * s.k, hx(col), hx(outline) if outline else None, int(w * s.k))
    def line(s, pts, w, col): s.d.line([s.p(*q) for q in pts], fill=hx(col), width=max(1, int(w * s.k)), joint='curve')
    def limb(s, pts, ws, col):
        """Tapered capsule chain through pts with widths ws (per joint)."""
        P = [np.array(s.p(*q)) for q in pts]; W = [w * s.k / 2 for w in ws]; c = hx(col)
        for i in range(len(P) - 1):
            a, b = P[i], P[i + 1]; v = b - a; n = np.array([-v[1], v[0]]) / (np.hypot(*v) + 1e-6)
            s.d.polygon([tuple(a + n * W[i]), tuple(b + n * W[i + 1]), tuple(b - n * W[i + 1]), tuple(a - n * W[i])], fill=c)
        for q, r in zip(P, W): s.d.ellipse([q[0] - r, q[1] - r, q[0] + r, q[1] + r], fill=c)

def hair_back(pn, style, hc, hy, col):
    if style == 'long': pn.poly([(hc - 26, hy + 6), (hc - 36, hy - 58), (hc - 18, hy - 70), (hc + 2, hy - 54), (hc + 8, hy - 10)], col)
    if style == 'ponytail':
        pn.limb([(hc - 22, hy + 10), (hc - 40, hy - 12), (hc - 38, hy - 40)], [22, 18, 8], col)
    if style == 'curly':
        for dx, dy, r in ((-24, -16, 14), (-14, -30, 12)): pn.ell(hc + dx, hy + dy, r, r, col)

def head(pn, hc, hy, skin, hair, style, tilt=0):
    """Profile-ish flat head: hair mass, face cut-out in skin, ear, nose bump. No facial features (like the refs)."""
    hair_back(pn, style, hc, hy, hair)
    pn.limb([(hc - 4, hy - 44), (hc + 4, hy - 20)], [18, 18], skin)                                   # neck
    if style == 'beanie': pn.ell(hc, hy, 28, 31, skin)
    else: pn.ell(hc - 3, hy + 1, 30, 32, hair)
    pn.ell(hc + 6 + tilt, hy - 4, 23, 27, skin)                                                       # face
    pn.ell(hc + 28 + tilt, hy - 4, 5, 6, skin)                                                        # nose bump
    if style in ('short', 'ponytail', 'bun', 'long', 'curly', 'grey'):
        pn.poly([(hc - 22, hy + 22), (hc + 8, hy + 33), (hc + 28 + tilt, hy + 18), (hc + 22 + tilt, hy + 10), (hc - 4, hy + 14)], hair)   # fringe
    if style == 'bun': pn.ell(hc - 14, hy + 32, 14, 13, hair)
    if style == 'curly':
        for dx, dy, r in ((-18, 26, 14), (0, 32, 13), (16, 26, 11), (-28, 8, 12)): pn.ell(hc + dx, hy + dy, r, r, hair)
    if style == 'beanie':
        pn.ell(hc - 2, hy + 10, 30, 24, hair); pn.rect(hc - 32, hy + 4, hc + 28, hy + 16, 6, shade(hair, .8))
    if style not in ('long',): pn.ell(hc - 6, hy - 4, 6, 8, shade(skin, .88))                          # ear
    if style == 'ponytail': pn.ell(hc - 24, hy + 8, 6, 6, shade(hair, .7))                             # hair tie

def person(img, ox, oy, k, f, spec):
    """spec: pose stand|sit|sleep, skin, hair, style, jacket, shirt, legs, shoes, arms (front, back), props, toko (mood)."""
    pn = Pen(img, ox, oy, k, f); g = spec.get
    skin, jk, sh, lg, shoe = g('skin'), g('jacket'), g('shirt', '#f4f1e8'), g('legs'), g('shoes', C['ink'])
    sole = g('sole'); pose = g('pose', 'stand'); props = g('props', ())
    if pose == 'stand':
        hip, sho, hc, hy = 262, 432, 8, 490
        if 'backpack' in props: pass
        # back leg + shoe
        pn.limb([(-8, hip), (-12, 140), (-16, 26)], [38, 30, 22], shade(lg, .82)); shoe_(pn, -16, shoe, sole)
        pn.limb([(10, hip), (14, 140), (18, 26)], [40, 31, 23], lg); shoe_(pn, 18, shoe, sole)
        torso = [(-38, 246), (36, 246), (40, 330), (36, 410), (22, 450), (-26, 452), (-40, 410), (-43, 320)]
    else:
        hip, sho = 212, 386; hc, hy = (34, 404) if pose == 'sleep' else (12, 440)
        kx = g('knee', 104)
        pn.limb([(-4, hip + 4), (kx - 8, hip + 14), (kx - 2, 26)], [40, 32, 22], shade(lg, .82)); shoe_(pn, kx - 2, shoe, sole)
        pn.limb([(4, hip), (kx, hip + 8), (kx + 10, 26)], [42, 34, 23], lg); shoe_(pn, kx + 10, shoe, sole)
        torso = [(-40, 200), (34, 200), (42, 290), (36, 360), (24, 396), (-22, 398), (-40, 352), (-46, 270)]
    arms = g('arms') or {}
    back_arm = arms.get('back', [(-2, sho - 8), (-6, sho - 80), (4, sho - 150)] if pose == 'stand' else [(-4, sho - 6), (18, sho - 86), (60, sho - 116)])
    front_arm = arms.get('front', [(4, sho - 6), (10, sho - 82), (22, sho - 150)] if pose == 'stand' else [(6, sho - 6), (30, sho - 90), (72, sho - 120)])
    if 'backpack' in props:
        bp = g('bag', '#2f4b5c'); pn.rect(-78, sho - 150, -26, sho - 8, 16, bp); pn.rect(-82, sho - 120, -60, sho - 50, 8, shade(bp, .82))
    if 'tote' in props:
        tb = g('bag', '#c09734'); pn.line([(-14, sho + 2), (-34, sho - 120)], 5, shade(tb, .8)); pn.rect(-52, sho - 200, -2, sho - 120, 6, tb)
    pn.limb(back_arm, [24, 20, 17], shade(jk, .82)); pn.ell(*back_arm[-1], 10, 10, shade(skin, .9))
    pn.poly(torso, jk)
    pn.ell(-4, sho - 14, 40, 24, jk)                                                                   # shoulder roundness
    # open jacket: shirt strip down the front + lapel
    fx = torso[2][0]
    if g('hood'): pn.ell(-14, sho + 6, 30, 22, shade(jk, .78))
    if g('closed'):
        pn.poly([(fx - 30, sho + 8), (fx - 6, sho - 2), (fx - 2, sho - 22), (fx - 30, sho - 14)], shade(jk, .86))   # collar
        for yy in range(torso[0][1] + 40, sho - 30, 42): pn.ell(fx - 8, yy, 3.5, 3.5, shade(jk, .7))
        pn.rect(torso[0][0], torso[0][1] + 34, fx - 2, torso[0][1] + 44, 3, shade(jk, .86))                 # belt / hem line
    else:
      pn.poly([(fx - 22, torso[0][1] + 18), (fx - 4, torso[0][1] + 18), (fx, sho - 30), (fx - 12, sho + 12), (fx - 26, sho + 10)], sh)
      pn.poly([(fx - 26, sho + 10), (fx - 14, sho - 40), (fx - 30, sho - 70), (fx - 34, sho + 4)], shade(jk, .86))
    if g('strap'):                                                                                      # crossbody strap
        pn.line([(-30, sho + 4), (fx - 6, torso[0][1] + 40)], 9, g('strap'))
    if 'backpack' in props: pn.line([(-10, sho + 6), (-18, sho - 110)], 8, shade(g('bag', '#2f4b5c'), .75))
    def front():
        pn.limb(front_arm, [26, 21, 18], jk); pn.rect(front_arm[-1][0] - 10, front_arm[-1][1] - 2, front_arm[-1][0] + 10, front_arm[-1][1] + 4, 2, shade(jk, .8))
        pn.ell(*front_arm[-1], 11, 11, skin)
    if g('raise'): front()
    tk = g('toko')
    if tk:
        pn.limb([(hc - 2, hy - 48), (hc + 2, hy - 24)], [20, 20], skin)
        r = 40; cx, cy = pn.p(hc + 2, hy + 4); toko_head(img, cx, cy, r * k, tk)
        MARK['_head'] = (cx / SS, cy / SS)
    else: head(pn, hc, hy, skin, g('hair'), g('style', 'short'), tilt=-4 if pose == 'sleep' else 0)
    if 'headphones' in props and not tk:
        pn.line([(hc - 22, hy + 6), (hc - 6, hy + 34), (hc + 12, hy + 18)], 6, C['ink']); pn.ell(hc - 6, hy - 4, 10, 12, C['ink'])
    # props held in front hand
    hand = front_arm[-1]
    if 'parcel' in props:
        px, py = hand[0] - 30, hand[1] - 34
        pn.rect(px - 6, py, px + 84, py + 70, 6, '#ffffff', outline=C['rule'], w=2.5)
        pn.rect(px + 34, py, px + 44, py + 70, 0, C['ink'])                                             # sealed: one tape band
    if 'book' in props: pn.rect(hand[0] - 6, hand[1] - 20, hand[0] + 34, hand[1] + 30, 4, g('book', C['t2'])); pn.rect(hand[0] - 2, hand[1] - 16, hand[0] + 4, hand[1] + 26, 0, '#ffffff')
    if 'phone' in props:
        pn.rect(hand[0] - 2, hand[1] - 6, hand[0] + 14, hand[1] + 28, 4, C['ink']); pn.rect(hand[0] + 1, hand[1] - 2, hand[0] + 11, hand[1] + 24, 2, '#9fb8c0')
    if 'coffee' in props: pn.rect(hand[0] - 8, hand[1] - 12, hand[0] + 12, hand[1] + 22, 3, '#fffdf7'); pn.rect(hand[0] - 8, hand[1] + 2, hand[0] + 12, hand[1] + 10, 0, C['t4n'])
    if not g('raise'): front()
    if 'parcel' in props:                                                                               # thumb over the parcel edge
        pn.ell(hand[0] + 2, hand[1] + 2, 9, 9, skin)

def shoe_(pn, ax, col, sole=None):
    pn.rect(ax - 16, 0, ax + 34, 24, 10, col); pn.ell(ax + 22, 12, 14, 12, col)
    if sole: pn.rect(ax - 16, 0, ax + 36, 7, 3, sole)

def toko_head(img, x, y, r, mood='info'):
    """The courier's head: Toko face, white on a mood disc, white ring (bible face())."""
    f = B.toko_face_img(r / SS, mood, ring='#ffffff')
    f = f.resize((int(f.width * SS), int(f.height * SS)), Image.LANCZOS)
    img.alpha_composite(f, (int(x - f.width / 2), int(y - f.height / 2)))

def place(img, fr, x, floor, spec, f=1, scale=1.0):
    person(img, fr.X(x), fr.Y(floor), fr.u * scale, f, spec)

COURIER = dict(skin='#c98e66', jacket=C['navy'], shirt='#fffdf7', legs=C['ink'], shoes='#fffdf7', sole='#c5cec8', strap=C['t4n'], toko='info')

# ================================================================ interior pieces
def seat(d, fr, x, shell, cushion, f=1, s=1.0, floor=900):
    pn = Pen(Image.new('RGBA', (1, 1)), fr.X(x), fr.Y(floor), fr.u * s, f); pn.d = d
    pn.ell(4, 0, 110, 10, '#00000014' if False else shade(PAL_FLOOR.get(shell, '#d9d3c3'), .92))
    pn.rect(-6, 0, 10, 196, 3, shade(shell, .8)); pn.rect(-30, 0, 34, 8, 3, shade(shell, .8))         # pedestal + foot
    pn.poly([(-70, 196), (-38, 196), (-46, 470), (-62, 486), (-84, 480)], shell)                      # back shell, tilted
    pn.ell(-70, 470, 16, 16, shell)
    pn.poly([(-62, 230), (-42, 230), (-48, 450), (-64, 460), (-72, 452)], cushion)                     # back cushion
    pn.rect(-72, 186, 82, 222, 16, shell); pn.rect(-60, 214, 76, 236, 12, cushion)                    # seat pan + cushion
    pn.rect(-72, 186, 82, 196, 6, shade(shell, .85))

PAL_FLOOR = {}
def outside_tile(kind, fr, tw):
    """Seamless horizontal tile (width tw supersampled px) of what passes the windows."""
    H = fr.H * SS; u = fr.u; Y = fr.Y
    im = Image.new('RGBA', (tw, H), hx('#dceef0' if kind == 'day' else '#0b1014')); d = ImageDraw.Draw(im)
    rng = np.random.default_rng(7 if kind == 'day' else 11)
    def R(x0, y0, x1, y1, col, r=0):
        for o in (-tw, 0, tw): rr(d, (x0 + o, y0, x1 + o, y1), r, hx(col))
    if kind == 'day':
        for o in (-tw, 0, tw):                                                              # two soft flat clouds
            for cx, cy in ((.2, 300), (.68, 270)):
                X0 = cx * tw + o
                for dx, dy, r in ((0, 0, 34), (40, -14, 42), (86, 0, 30)): d.ellipse([X0 + (dx - r) * u, Y(cy + dy - r), X0 + (dx + r) * u, Y(cy + dy + r)], fill=hx('#eef7f8'))
                rr(d, (X0 - 34 * u, Y(cy), X0 + 116 * u, Y(cy + 30)), 15 * u, hx('#eef7f8'))
        x = 0
        while x < tw:                                                                       # far skyline (one dome, a few towers)
            w = rng.integers(70, 170) * u; h = rng.integers(70, 210) * u; R(x, Y(560) - h, x + w - 10 * u, Y(900), '#c6dde1'); x += w
        for fx_ in (.33, .81):
            X0 = fx_ * tw; R(X0, Y(330), X0 + 46 * u, Y(900), '#c6dde1'); R(X0 + 16 * u, Y(296), X0 + 30 * u, Y(332), '#c6dde1')
        X0 = .55 * tw
        for o in (-tw, 0, tw): d.pieslice([X0 + o, Y(392), X0 + o + 130 * u, Y(512)], 180, 360, fill=hx('#c6dde1'))
        R(X0 - 10 * u, Y(450), X0 + 140 * u, Y(900), '#c6dde1')
        x = 0
        while x < tw:                                                                       # mid blocks with window rows
            w = rng.integers(150, 290) * u; h = rng.integers(60, 170) * u; top = Y(600) - h; col = '#abcfd8'
            R(x, top, x + w - 18 * u, Y(900), col); R(x, top - 8 * u, x + w - 18 * u, top + 4 * u, '#9fc6d0')
            for yy in np.arange(top + 22 * u, Y(640), 34 * u):
                for xx in np.arange(x + 16 * u, x + w - 40 * u, 30 * u): R(xx, yy, xx + 16 * u, yy + 18 * u, '#bfdde4', 2 * u)
            x += w
        x = 0
        while x < tw:                                                                       # street trees
            cxx = x + rng.integers(40, 80) * u
            for o in (-tw, 0, tw):
                d.rectangle([cxx + o - 4 * u, Y(600), cxx + o + 4 * u, Y(680)], fill=hx('#8db8ba'))
                d.ellipse([cxx + o - 34 * u, Y(560), cxx + o + 34 * u, Y(626)], fill=hx('#98c3c0'))
            x += rng.integers(220, 420) * u
        R(0, Y(640), tw, Y(900), '#c3dcdc')                                                 # pavement band
        for o in (-tw, 0, tw): d.line([o, Y(250), tw + o, Y(250)], fill=hx('#8fb3bb'), width=int(3 * u))
        for px in np.arange(0, tw, tw / 4): R(px, Y(240), px + 9 * u, Y(900), '#8fb3bb')
    else:
        for px in np.arange(0, tw, tw / 8): R(px, Y(200), px + 6 * u, Y(900), '#121b21')    # tunnel ribs
        for o in (-tw, 0, tw):
            for yy, col, wdt in ((330, '#1d2a33', 4), (346, '#1d2a33', 4), (372, '#22313b', 6), (470, '#16222a', 12)):
                d.line([o, Y(yy), tw + o, Y(yy)], fill=hx(col), width=int(wdt * u))
        for px in np.arange(0, tw, tw / 6): R(px, Y(410), px + 120 * u, Y(422), '#2a5f88', 6 * u); R(px + 30 * u, Y(424), px + 90 * u, Y(430), '#1d3d58', 3 * u)
        for px in np.arange(tw / 12, tw, tw / 3): R(px, Y(520), px + 34 * u, Y(560), '#1a2730', 4 * u)   # cable boxes
    return im

def tile_across(tile, W, off=0):
    out = Image.new('RGBA', (W, tile.height), (0, 0, 0, 0)); tw = tile.width; x = -(off % tw)
    while x < W: out.alpha_composite(tile, (int(x), 0)); x += tw
    return out

PAL = {'day': dict(wall='#f7f2e5', wain='#ece5d3', ceil='#e9e4d6', lamp='#fffdf7', floor='#d9d3c3', edge='#bdb6a4', frame='#41525a',
                   sill='#fffdf7', door='#e6dfcc', doorwin='#d8d0bb', pole=C['t4n'], strap='#7d8a8f', seat=C['navy'], cushion='#30566c', rule=C['rule']),
       'night': dict(wall='#24303a', wain='#1d272e', ceil='#141b20', lamp='#c4ced4', floor='#11171b', edge='#2c363d', frame='#0c1115',
                     sill='#2a353c', door='#232d34', doorwin='#1a2329', pole=C['metroLit'], strap='#4a5660', seat='#2c3a44', cushion='#9c4320', rule='#2c363d')}

def car_interior(fr, kind, windows, doors, poles):
    """Side-on car. windows: [(x0, x1)], doors: [x0] (two 150-wide leaves), poles: [x] in design units."""
    u = fr.u; W, H = fr.W * SS, fr.H * SS; p = PAL[kind]; Y, X = fr.Y, fr.X; L = {}
    tw = int(1600 * u); tile = outside_tile(kind, fr, tw); L['_tile'] = tile; L['01-outside'] = tile_across(tile, W)
    sh = fr.new(); d = ImageDraw.Draw(sh)
    d.rectangle([0, 0, W, H], fill=hx(p['wall'])); d.rectangle([0, Y(640), W, Y(900)], fill=hx(p['wain']))
    d.rectangle([0, Y(632), W, Y(642)], fill=hx(p['rule']))                                  # dado rail
    for wx0, wx1 in windows:                                                                  # framed windows (cut-outs)
        rr(d, (X(wx0) - 14 * u, Y(206), X(wx1) + 14 * u, Y(604)), 40 * u, hx(p['frame']))
        rr(d, (X(wx0), Y(220), X(wx1), Y(590)), 30 * u, (0, 0, 0, 0))
        d.rectangle([X(wx0) - 6 * u, Y(604), X(wx1) + 6 * u, Y(618)], fill=hx(p['sill']))
        if wx1 - wx0 > 420: d.rectangle([X((wx0 + wx1) / 2) - 5 * u, Y(220), X((wx0 + wx1) / 2) + 5 * u, Y(590)], fill=hx(p['frame']))
    for dx in doors:                                                                          # door bay
        rr(d, (X(dx) - 18 * u, Y(176), X(dx + 318) + 18 * u, Y(902)), 18 * u, hx(p['frame']))
        for j in (0, 1):
            px = X(dx + j * 162); rr(d, (px, Y(190), px + 156 * u, Y(900)), 10 * u, hx(p['door']))
            rr(d, (px + 24 * u, Y(230), px + 132 * u, Y(650)), 22 * u, hx(p['frame'])); rr(d, (px + 32 * u, Y(238), px + 124 * u, Y(642)), 18 * u, (0, 0, 0, 0))
            d.rectangle([px + (130 if j == 0 else 18) * u, Y(470), px + (138 if j == 0 else 26) * u, Y(760)], fill=hx(p['frame']))   # handles
        d.rectangle([X(dx + 155), Y(190), X(dx + 163), Y(900)], fill=hx(p['frame']))
        d.rectangle([X(dx) - 18 * u, Y(890), X(dx + 318) + 18 * u, Y(904)], fill=hx(C['t4n'] if kind == 'day' else C['metro']))   # threshold
    d.rectangle([0, 0, W, Y(140)], fill=hx(p['ceil']))
    for i in range(-6, 8):                                                                    # ceiling light panels
        lx = X(i * 340 - 40); rr(d, (lx, Y(84), lx + 220 * u, Y(110)), 13 * u, hx(p['lamp']))
    d.rectangle([0, Y(140), W, Y(152)], fill=hx(p['rule']))
    d.rectangle([0, Y(900), W, H], fill=hx(p['floor'])); d.rectangle([0, Y(900), W, Y(910)], fill=hx(p['edge']))
    d.rectangle([0, Y(960), W, Y(966)], fill=hx(p['edge']))
    L['02-car-shell'] = sh
    fx = fr.new(); d = ImageDraw.Draw(fx)
    d.rectangle([0, Y(174), W, Y(186)], fill=hx(p['pole']))                                  # grab rail
    for px in poles:
        x = X(px); d.rectangle([x - 6 * u, Y(180), x + 6 * u, Y(900)], fill=hx(p['pole']))
        d.ellipse([x - 13 * u, Y(167), x + 13 * u, Y(193)], fill=hx(p['pole'])); rr(d, (x - 16 * u, Y(888), x + 16 * u, Y(902)), 5 * u, hx(shade(p['pole'], .8)))
    for i in range(-10, 12):                                                                  # strap + triangular handle
        sx = X(i * 230 + 20); d.rectangle([sx - 5 * u, Y(186), sx + 5 * u, Y(236)], fill=hx(p['strap']))
        d.polygon([(sx, Y(232)), (sx - 18 * u, Y(284)), (sx + 18 * u, Y(284))], outline=hx(p['strap']), width=int(6 * u))
        d.line([(sx - 18 * u, Y(284)), (sx + 18 * u, Y(284))], fill=hx(p['strap']), width=int(8 * u))
    L['03-fixtures'] = fx
    return L

PAL_FLOOR[PAL['day']['seat']] = PAL['day']['floor']; PAL_FLOOR[PAL['night']['seat']] = PAL['night']['floor']
def strap_xy(i): return (i * 230 + 20, 280)

def signage(fr, line_badge, dest, nxt, night, x=0):
    """In-car display: dark strip, line chip (tram = rounded rect, metro = pill, white border), destination, next stop."""
    im = fr.new(); d = ImageDraw.Draw(im); u = fr.u
    x0, x1, y0, y1 = fr.X(x - 330), fr.X(x + 330), fr.Y(20), fr.Y(72) if False else fr.Y(70)
    x0, x1, y0, y1 = fr.X(x - 330), fr.X(x + 330), fr.Y(10), fr.Y(84)
    rr(d, (x0, y0, x1, y1), 14 * u, hx('#15262b'))
    fam, col = line_badge; bx = x0 + 22 * u; bh = 50 * u; by = (y0 + y1) / 2 - bh / 2
    if fam == 'M': rr(d, (bx, by, bx + 84 * u, by + bh), bh / 2, hx(col), outline=hx('#ffffff'), width=int(4 * u)); bw = 84 * u
    else: rr(d, (bx, by, bx + 62 * u, by + bh), 10 * u, hx(col), outline=hx('#ffffff'), width=int(4 * u)); bw = 62 * u
    d.text((bx + bw / 2, by + bh / 2), fam, font=font(28 * u, 800), fill=hx('#ffffff'), anchor='mm')
    d.text((bx + bw + 22 * u, by + bh / 2), dest, font=font(28 * u, 700), fill=hx('#e6edf0'), anchor='lm')
    d.text((x1 - 22 * u, by + bh / 2), nxt, font=font(25 * u, 700), fill=hx('#ffcc00'), anchor='rm')
    d.text((x1 - 22 * u - d.textlength(nxt, font=font(25 * u, 700)) - 14 * u, by + bh / 2), '›', font=font(28 * u, 700), fill=hx('#98a4ab'), anchor='rm')
    return im

def stop_strip(im, fr, col, stops, cur, night):
    """Vertical masters only: the in-car line strip (this vehicle's own stops, current one ringed). Not route guidance."""
    d = ImageDraw.Draw(im); u = fr.u; y = fr.Y(-170); x0, x1 = fr.X(-420), fr.X(420)
    rr(d, (x0 - 40 * u, y - 90 * u, x1 + 40 * u, y + 70 * u), 22 * u, hx('#15262b' if not night else '#0b1014'))
    d.line([x0, y, x1, y], fill=hx(col), width=int(14 * u)); lf = font(24 * u, 700)
    for i, nm in enumerate(stops):
        x = x0 + (x1 - x0) * i / (len(stops) - 1); r = (17 if i == cur else 11) * u
        d.ellipse([x - r, y - r, x + r, y + r], fill=hx('#ffffff'), outline=hx('#15262b'), width=int(4 * u))
        anc = 'ls' if i == 0 else 'rs' if i == len(stops) - 1 else 'ms'; tx = x - 12 * u if i == 0 else x + 12 * u if i == len(stops) - 1 else x
        d.text((tx, y - 34 * u), nm, font=lf, fill=hx('#ffcc00' if i == cur else '#c4ced4'), anchor=anc)

def night_tint(im, t=.2, col='#16222a'):
    a = np.array(im).astype(float); c = rgb(col); a[..., :3] = a[..., :3] * (1 - t) + c * t
    return Image.fromarray(a.astype(np.uint8))

# ================================================================ scenes
S_P = 1.12                                        # people scale in interiors (character-forward)
def scene_day(fr):
    if fr.vert: fr.cx -= 230 * fr.u
    L = car_interior(fr, 'day', windows=[(-760, -330), (-250, 420)], doors=[640, 1260] if not fr.vert else [640], poles=[-290, 600, 1000])
    p = PAL['day']; seats = fr.new(); d = ImageDraw.Draw(seats)
    for x in ((-520, -80, 270) if not fr.vert else (-80, 270)): seat(d, fr, x, p['seat'], p['cushion'], 1, S_P)
    L['03-fixtures'].alpha_composite(seats)
    pp = fr.new()
    if not fr.vert:
        place(pp, fr, -520, 900, dict(pose='sit', skin=SKIN[3], hair=HAIR[4], style='grey', jacket='#8a6f5a', shirt='#e8e2d2', legs='#3e4a52',
              shoes='#4a3426', props=('book',), book=C['t2'], arms=dict(front=[(6, 380), (40, 300), (70, 336)], back=[(-4, 380), (24, 300), (56, 330)])), 1, S_P)
    place(pp, fr, 270, 900, dict(pose='sit', skin=SKIN[0], hair=HAIR[1], style='ponytail', closed=True, jacket='#cf7a93', shirt='#fffdf7', legs=C['navy'],
          shoes=C['ink'], props=('phone',), arms=dict(front=[(6, 380), (34, 300), (58, 352)], back=[(-4, 380), (22, 300), (48, 340)])), 1, S_P)
    sx, sy = strap_xy(3)
    st = dict(pose='stand', skin=SKIN[2], hair=HAIR[0], style='bun', jacket='#5f8f3a', shirt='#e8e2d2', legs='#2a3b47', shoes='#fffdf7', sole='#c5cec8',
              props=('backpack',), bag='#2f4b5c')
    xs = 790 if not fr.vert else 760
    hxl, hyl = (sx - xs) / S_P * -1, (900 - sy) / S_P
    st['arms'] = dict(front=[(6, 428), (hxl * .55 + 4, (428 + hyl) / 2 + 6), (hxl, hyl)], back=[(-2, 424), (-6, 346), (2, 276)]); st['raise'] = True
    place(pp, fr, xs, 900, st, -1, S_P)
    L['04-people'] = pp
    cc = fr.new(); MARK.pop('_head', None)
    place(cc, fr, -80, 900, dict(COURIER, pose='sit', props=('parcel',), arms=dict(front=[(6, 380), (40, 296), (66, 286)], back=[(-4, 380), (26, 296), (58, 280)])), 1, S_P)
    L['05-courier'] = cc; L['_head'] = MARK.pop('_head')
    L['06-signage'] = signage(fr, ('4', C['t4']), 'MUNKKINIEMI', 'LASIPALATSI', False, x=120 if not fr.vert else 250)
    if fr.vert:
        fr.cx += 230 * fr.u; stop_strip(L['06-signage'], fr, C['t4n'], ['SENAATINTORI', 'LASIPALATSI', 'OOPPERA', 'TÖÖLÖ'], 1, False)
    return L

def scene_night(fr):
    if fr.vert: fr.cx += 20 * fr.u
    L = car_interior(fr, 'night', windows=[(-760, -420), (-300, 380), (980, 1300)], doors=[520], poles=[-360, 460, 900])
    p = PAL['night']; seats = fr.new(); d = ImageDraw.Draw(seats)
    for x in ((-40, 280, 1120) if not fr.vert else (-40, 280)): seat(d, fr, x, p['seat'], p['cushion'], 1, S_P)
    L['03-fixtures'].alpha_composite(seats)
    pp = fr.new()
    place(pp, fr, 280, 900, dict(pose='sleep', skin=SKIN[3], hair=HAIR[5], style='long', hood=True, jacket='#3e7fb4', shirt='#d8dde0', legs='#2a3640',
          shoes='#5b3a2a', knee=100, props=('tote',), bag='#6c5a8a', arms=dict(front=[(6, 376), (30, 300), (78, 262)], back=[(-4, 376), (20, 296), (66, 258)])), 1, S_P)
    xs = -470
    sp = dict(pose='stand', skin=SKIN[4], hair=HAIR[3], style='beanie', jacket='#6b5b7b', shirt='#c4ced4', legs='#22303a', shoes=C['ink'],
              sole='#8a979d', props=('headphones', 'backpack'), bag='#3a4650')
    px = -360; hxp = (px - xs) / S_P - 8; sp['arms'] = dict(front=[(4, 426), (hxp * .55, 372), (hxp, 400)], back=[(-2, 424), (-8, 346), (-2, 278)])
    place(pp, fr, xs, 900, sp, 1, S_P)
    L['04-people'] = night_tint(pp)
    cc = fr.new()
    place(cc, fr, -40, 900, dict(COURIER, jacket='#3d5a6b', legs='#26343d', shoes='#dfe6e9', sole='#8a979d', pose='sit', props=('parcel',),
          arms=dict(front=[(6, 380), (40, 296), (66, 286)], back=[(-4, 380), (26, 296), (58, 280)])), 1, S_P)
    L['05-courier'] = cc; L['_head'] = MARK.pop('_head')
    L['06-signage'] = signage(fr, ('M', C['metro']), 'VUOSAARI', 'KAMPPI', True, x=120 if not fr.vert else -20)
    if fr.vert:
        fr.cx -= 20 * fr.u; stop_strip(L['06-signage'], fr, C['metroLit'], ['RUOHOLAHTI', 'KAMPPI', 'RAUTATIENTORI', 'HAKANIEMI'], 1, True)
    return L

# ---------------------------------------------------------------- isometric stop (ref 2 language)
class Iso:
    def __init__(s, fr, ox, oy, sc, m=-1): s.fr, s.ox, s.oy, s.s, s.m = fr, ox, oy, sc, m     # m=-1: mirrored (track runs upper-right -> lower-left, keeps the card corner clear)
    def p(s, X, Y, Z=0):
        k = s.s * s.fr.u; return (s.ox + s.m * (X - Y) * .866 * k, s.oy + ((X + Y) * .5 - Z) * k)
    def poly(s, d, pts, col): d.polygon([s.p(*q) for q in pts], fill=hx(col) if isinstance(col, str) else col)
    def box(s, d, X0, X1, Y0, Y1, Z0, Z1, top, side, end, endface=True):
        s.poly(d, [(X0, Y1, Z0), (X1, Y1, Z0), (X1, Y1, Z1), (X0, Y1, Z1)], side)
        if endface: s.poly(d, [(X1, Y0, Z0), (X1, Y1, Z0), (X1, Y1, Z1), (X1, Y0, Z1)], end)
        s.poly(d, [(X0, Y0, Z1), (X1, Y0, Z1), (X1, Y1, Z1), (X0, Y1, Z1)], top)
    def quadY(s, d, Y, X0, X1, Z0, Z1, col): s.poly(d, [(X0, Y, Z0), (X1, Y, Z0), (X1, Y, Z1), (X0, Y, Z1)], col)
    def quadX(s, d, X, Y0, Y1, Z0, Z1, col): s.poly(d, [(X, Y0, Z0), (X, Y1, Z0), (X, Y1, Z1), (X, Y0, Z1)], col)

def iso_cam(fr, close=False):
    if close: sc, (wx, wy), (fx, fy) = (2.15, (-190, 175), (.40, .86)) if not fr.vert else (2.0, (-190, 175), (.60, .74))
    else: sc, (wx, wy), (fx, fy) = (1.3, (0, 150), (.47, .62)) if not fr.vert else (1.2, (40, 150), (.65, .56))
    k = sc * fr.u; ox = fr.W * SS * fx + (wx - wy) * .866 * k; oy = fr.H * SS * fy - (wx + wy) * .5 * k
    return Iso(fr, ox, oy, sc)

TRAM = dict(Y0=-52, Y1=52, Z0=22, Z1=150, segs=[(-1180, -840), (-826, -486), (-472, -80)])
def tram_iso(fr, iso, tint):
    im = fr.new(); d = ImageDraw.Draw(im); T = TRAM; Y0, Y1, Z0, Z1 = T['Y0'], T['Y1'], T['Z0'], T['Z1']
    band = mix(C['t4n'], C['halt'], tint); bandD = mix(C['t4'], '#9aa5aa', tint)
    body, bodyE, roof = '#fffdf7', '#ebe7db', '#dedad0'
    win, winE = '#2b4252', '#22384a'
    sh = [(T['segs'][0][0] + 40, Y1 + 10, 0), (T['segs'][-1][1] + 40, Y1 + 10, 0), (T['segs'][-1][1] + 120, Y1 + 70, 0), (T['segs'][0][0] + 120, Y1 + 70, 0)]
    iso.poly(d, sh, '#e3e1d8')                                                                         # flat cast shadow
    for i in range(len(T['segs']) - 1):                                                                # gangways
        a, b = T['segs'][i][1], T['segs'][i + 1][0]; iso.box(d, a - 4, b + 4, Y0 + 10, Y1 - 10, Z0 + 10, Z1 - 6, '#2c363d', '#15262b', '#15262b')
    for i, (X0, X1) in enumerate(T['segs']):
        last = i == len(T['segs']) - 1; nose = 34 if last else 0; zm = 92
        # side (+Y) face
        pts = [(X0, Y1, Z0), (X1, Y1, Z0), (X1, Y1, zm), (X1 - nose, Y1, Z1), (X0, Y1, Z1)] if last else [(X0, Y1, Z0), (X1, Y1, Z0), (X1, Y1, Z1), (X0, Y1, Z1)]
        iso.poly(d, pts, body)
        iso.quadY(d, Y1, X0, X1, Z0, Z0 + 14, '#2c363d')                                               # skirt
        iso.quadY(d, Y1, X0, X1, Z0 + 26, Z0 + 44, band)                                               # line band
        iso.quadY(d, Y1, X0, X1, Z0 + 44, Z0 + 48, bandD)
        n = 3; span = (X1 - nose - 20) - (X0 + 20)
        for k in range(n):                                                                             # windows + one door per car
            a = X0 + 20 + k * span / n; b = a + span / n - 16
            if k == 1:
                iso.quadY(d, Y1, a + 6, b - 6, Z0 + 2, Z1 - 16, '#d3cfc3'); iso.quadY(d, Y1, a + 14, (a + b) / 2 - 3, Z0 + 56, Z1 - 26, win)
                iso.quadY(d, Y1, (a + b) / 2 + 3, b - 14, Z0 + 56, Z1 - 26, win); iso.quadY(d, Y1, (a + b) / 2 - 1.5, (a + b) / 2 + 1.5, Z0 + 2, Z1 - 16, '#8a948f')
            else: iso.quadY(d, Y1, a, b, Z0 + 60, Z1 - 18, win)
        # roof (+ nose slope)
        if last:
            iso.poly(d, [(X0, Y0, Z1), (X1 - nose, Y0, Z1), (X1 - nose, Y1, Z1), (X0, Y1, Z1)], roof)
            iso.poly(d, [(X1, Y0, Z0), (X1, Y1, Z0), (X1, Y1, zm), (X1, Y0, zm)], bodyE)
            iso.poly(d, [(X1, Y0, zm), (X1, Y1, zm), (X1 - nose, Y1, Z1), (X1 - nose, Y0, Z1)], '#1f3442')       # windscreen
            iso.quadX(d, X1, Y0, Y1, Z0 + 26, Z0 + 44, band)
            iso.quadX(d, X1, Y0, Y1, Z0, Z0 + 14, '#2c363d')
            for yy in (Y0 + 14, Y1 - 22): iso.quadX(d, X1, yy, yy + 8, Z0 + 52, Z0 + 60, '#fff3c4')   # headlights
        else:
            iso.poly(d, [(X0, Y0, Z1), (X1, Y0, Z1), (X1, Y1, Z1), (X0, Y1, Z1)], roof)
        iso.box(d, X0 + 90, X0 + 200, Y0 + 20, Y1 - 20, Z1, Z1 + 14, '#eceae2', '#cfcbbf', '#d8d4c8')  # roof unit
    # pantograph on the middle car up to the wire
    mX = (T['segs'][1][0] + T['segs'][1][1]) / 2; dd = ImageDraw.Draw(im); w = max(2, int(5 * fr.u))
    base = iso.p(mX, 0, Z1 + 14); kn = iso.p(mX + 50, 0, Z1 + 60); top = iso.p(mX + 10, 0, 238)
    dd.line([base, kn, top], fill=hx('#15262b'), width=w, joint='curve'); dd.line([iso.p(mX - 16, 0, 238), iso.p(mX + 36, 0, 238)], fill=hx('#15262b'), width=w)
    iso.box(d, mX - 22, mX + 22, -16, 16, Z1 + 14, Z1 + 20, '#9aa5aa', '#69777a', '#7d8a8f')
    # front destination: line chip + coral pause when halted (screen-parallel, readable)
    X1 = T['segs'][-1][1]; fx, fy = iso.p(X1 - 14, 0, Z1 - 30); u = fr.u * iso.s
    rr(d, (fx - 56 * u, fy - 20 * u, fx + 56 * u, fy + 20 * u), 7 * u, hx('#15262b'))
    rr(d, (fx - 48 * u, fy - 15 * u, fx - 12 * u, fy + 15 * u), 5 * u, hx(mix(C['t4'], C['halt'], tint)), outline=hx('#ffffff'), width=max(1, int(2.5 * u)))
    d.text((fx - 30 * u, fy), '4', font=font(20 * u, 800), fill=hx('#ffffff'), anchor='mm')
    if tint > .5:
        r = 13 * u; px, py = fx + 26 * u, fy; d.ellipse([px - r, py - r, px + r, py + r], fill=hx(C['coral']))
        for sg in (-1, 1): d.rectangle([px + sg * r * .32 - r * .14, py - r * .48, px + sg * r * .32 + r * .14, py + r * .48], fill=hx('#ffffff'))
    else:
        d.text((fx + 20 * u, fy), '›', font=font(22 * u, 800), fill=hx('#ffcc00'), anchor='mm')
    return im

def scene_disruption(fr, tint=1.0, close=False):
    W, H = fr.W * SS, fr.H * SS; iso = iso_cam(fr, close); u = fr.u; L = {}
    bg = Image.new('RGBA', (W, H), hx(C['paper'])); d = ImageDraw.Draw(bg)
    blocks = [(-900, -640, -620, -360, 260), (-560, -330, -640, -420, 340), (-250, -40, -700, -480, 210), (60, 300, -760, -520, 300),
              (380, 600, -700, -470, 180), (650, 880, -620, -380, 280), (-1200, -960, -520, -280, 200), (920, 1160, -520, -300, 230)]
    for X0, X1, Y0, Y1, h in sorted(blocks, key=lambda b: b[0] + b[2]):                                # far iso blocks, paper on paper
        iso.box(d, X0, X1, Y0, Y1, 0, h, '#efece3', '#e2ddcf', '#d8d2c2')
        for zz in range(40, h - 20, 46):
            for xx in range(X0 + 20, X1 - 30, 46): iso.quadY(d, Y1, xx, xx + 22, zz, zz + 24, '#d6d0c0')
    for X, Y in ((-700, -230), (-420, -260), (240, -300), (560, -250), (860, -200), (-1080, -180)):    # trees
        cx, cy = iso.p(X, Y, 0); r = 30 * u * iso.s
        d.rectangle([cx - 3 * u, cy - 40 * u * iso.s, cx + 3 * u, cy], fill=hx('#a9b3a4'))
        d.ellipse([cx - r, cy - 40 * u * iso.s - r * 1.5, cx + r, cy - 40 * u * iso.s + r * .5], fill=hx('#c9d3c2'))
    L['01-backdrop'] = bg
    st = fr.new(); d = ImageDraw.Draw(st)
    iso.poly(d, [(-3000, -90, 0), (3000, -90, 0), (3000, 74, 0), (-3000, 74, 0)], '#e4e6e1')            # track bed
    for yy in (-30, 30):
        d.line([iso.p(-3000, yy), iso.p(3000, yy)], fill=hx('#8a948f'), width=max(1, int(4 * u * iso.s)))
        d.line([iso.p(-3000, yy + 6), iso.p(3000, yy + 6)], fill=hx('#c3c8c2'), width=max(1, int(2 * u * iso.s)))
    iso.box(st and d, -3000, 3000, 80, 230, 0, 12, '#efece3', '#d6d2c6', '#d6d2c6', endface=False)     # platform slab
    iso.poly(d, [(-3000, 84, 12), (3000, 84, 12), (3000, 98, 12), (-3000, 98, 12)], '#e9d38a')         # edge warning strip
    for X in range(-3000, 3000, 140): d.line([iso.p(X, 100, 12), iso.p(X, 230, 12)], fill=hx('#e4e0d5'), width=max(1, int(2 * u * iso.s)))
    for X in (-1500, -700, 100, 900, 1700):                                                            # catenary masts on the far side
        d.line([iso.p(X, -130, 0), iso.p(X, -130, 260)], fill=hx('#69777a'), width=max(1, int(6 * u * iso.s)))
        d.line([iso.p(X, -130, 252), iso.p(X, 0, 244)], fill=hx('#69777a'), width=max(1, int(4 * u * iso.s)))
    d.line([iso.p(-3000, 0, 238), iso.p(3000, 0, 238)], fill=hx('#69777a'), width=max(1, int(3 * u * iso.s)))
    L['02-street'] = st
    L['03-tram'] = tram_iso(fr, iso, tint)
    sh = fr.new(); d = ImageDraw.Draw(sh)
    SX0, SX1, SY0, SY1 = 200, 450, 150, 215
    iso.poly(d, [(SX0 + 30, SY1, 12), (SX1 + 30, SY1, 12), (SX1 + 90, SY1 + 50, 12), (SX0 + 90, SY1 + 50, 12)], '#ebe8de')   # shadow
    iso.quadY(d, SY0, SX0, SX1, 12, 290, hx(C['water'], 170))                                           # back glass
    iso.quadX(d, SX0, SY0, SY1, 12, 290, hx('#b9d9de', 190))                                            # end glass (upstream)
    for X in (SX0, SX1):
        iso.box(d, X - 5, X + 5, SY0 - 5, SY0 + 5, 12, 296, '#3a5566', C['navy'], '#1c3140')
    iso.quadY(d, SY0, SX0 + 20, SX1 - 20, 190, 250, '#fffdf7'); iso.quadY(d, SY0, SX0 + 30, SX0 + 110, 200, 240, C['water'])                                         # ad panel strip
    iso.box(d, SX0 + 30, SX1 - 30, SY0 + 6, SY0 + 34, 52, 60, '#d9b25a', C['t4n'], '#a88228')           # bench
    for X in (SX0 + 50, SX1 - 50): iso.box(d, X - 4, X + 4, SY0 + 14, SY0 + 26, 12, 52, C['navy'], C['navy'], '#1c3140')
    iso.box(d, SX1 + 30, SX1 + 62, 176, 204, 12, 120, '#3a5566', C['navy'], '#1c3140')               # ticket machine
    iso.quadY(d, 204, SX1 + 36, SX1 + 56, 70, 104, '#9fb8c0')
    iso.box(d, -600, -576, 196, 218, 12, 64, '#9aa5aa', '#69777a', '#7d8a8f')                          # bin
    L['04-shelter'] = sh
    roof = fr.new(); d = ImageDraw.Draw(roof)
    iso.box(d, SX0 - 20, SX1 + 20, SY0 - 14, SY1 - 10, 296, 308, '#4a5a62', '#2f3d45', '#25323a')
    pp = fr.new(); u2 = fr.u * iso.s * .5
    hx_, hy_ = iso.p((SX0 + SX1) / 2 - 10, SY0 + 20, 12)
    person(pp, hx_ - 40 * u2, hy_ - 14 * u2, u2, 1, dict(pose='sit', skin=SKIN[2], hair=HAIR[0], style='curly', jacket='#bc7c53', shirt='#efe6d4', legs='#3e4a52',
           shoes=C['ink'], props=('phone',), arms=dict(front=[(6, 380), (34, 300), (58, 352)], back=[(-4, 380), (22, 300), (48, 340)])))
    ox, oy = iso.p(-380, 215, 12)
    if not fr.vert: person(pp, ox, oy, u2, -1, dict(pose='stand', skin=SKIN[3], hair=HAIR[2], style='long', jacket='#6c981c', shirt='#fffdf7', legs=C['navy'],
           shoes='#5b3a2a', props=('coffee',), arms=dict(front=[(4, 426), (26, 352), (44, 404)])))
    pp.alpha_composite(roof); L['05-people'] = pp
    cc = fr.new(); ox, oy = iso.p(-190, 175, 12)
    person(cc, ox, oy, u2 * 1.08, -1, dict(COURIER, pose='stand', props=('parcel',), arms=dict(front=[(4, 426), (30, 350), (56, 330)], back=[(-2, 424), (16, 348), (40, 320)])))
    L['06-courier'] = cc; L['_head'] = MARK.pop('_head')
    sg = fr.new(); d = ImageDraw.Draw(sg)                                                              # stop pole + plate: OOPPERA, chips 4 (halted) and 2
    bx_, by_ = iso.p(530, 120, 12); tx, ty = iso.p(530, 120, 300); w = max(2, int(7 * u * iso.s)); s_ = u * iso.s * .8
    d.line([(bx_, by_), (tx, ty)], fill=hx(C['ink']), width=w); d.ellipse([bx_ - 12 * s_, by_ - 6 * s_, bx_ + 12 * s_, by_ + 6 * s_], fill=hx('#2c363d'))
    x0, y0 = tx - 126 * s_, ty - 72 * s_
    rr(d, (x0, y0, x0 + 252 * s_, y0 + 140 * s_), 12 * s_, hx('#15262b'))
    d.text((x0 + 126 * s_, y0 + 38 * s_), 'OOPPERA', font=font(32 * s_, 800), fill=hx('#e6edf0'), anchor='mm')
    band = mix(C['t4'], C['halt'], tint)
    for i, (lab, col) in enumerate((('4', band), ('2', C['t2']))):
        bx = x0 + (46 + i * 90) * s_; rr(d, (bx, y0 + 72 * s_, bx + 60 * s_, y0 + 118 * s_), 9 * s_, hx(col), outline=hx('#ffffff'), width=max(1, int(3 * s_)))
        d.text((bx + 30 * s_, y0 + 95 * s_), lab, font=font(26 * s_, 800), fill=hx('#ffffff'), anchor='mm')
    cxp, cyp = x0 + 246 * s_, y0
    if tint > .5:
        r = 22 * s_; d.ellipse([cxp - r * 1.25, cyp - r * 1.25, cxp + r * 1.25, cyp + r * 1.25], fill=hx('#ffffff'))
        d.ellipse([cxp - r, cyp - r, cxp + r, cyp + r], fill=hx(C['coral']))
        for s2 in (-1, 1): d.rectangle([cxp + s2 * r * .32 - r * .14, cyp - r * .48, cxp + s2 * r * .32 + r * .14, cyp + r * .48], fill=hx('#ffffff'))
    L['07-signage'] = sg; L['_plate'] = (cxp / SS, cyp / SS, 22 * s_ / SS)
    return L

# ---------------------------------------------------------------- pass 3: close, varied-angle plates (plates.py) + closer iso crop
PLATE = ['01-outside', '02-car', '03-people', '04-courier', '05-signage', '06-hud', '07-card']
def scene_disruption_close(fr, tint=1.0): return scene_disruption(fr, tint, close=True)

SCENES = {
 'day': dict(plate=True, order=PLATE, ui=B.DAY, clock='07:42', hud=(1, 3, .62), sign=(('4', C['t4']), 'MUNKKINIEMI', 'LASIPALATSI', False),
             card=('A rider at Lasipalatsi needs this before Töölö.', ('Take it', '+40 s'), ('Leave it', '+0 s'), 'opportunity'),
             angle='three-quarter across the aisle (CP2077 bench sit), knees-up'),
 'night': dict(plate=True, order=PLATE, ui=B.NIGHT, clock='23:51', hud=(2, 3, .34), sign=(('M', C['metro']), 'VUOSAARI', 'KULOSAARI', True), card916_y=300,
               card=('Last metro to Vuosaari leaves Kamppi.', ('Catch it', '+60 s'), ('Walk', '+900 s'), 'info'),
               angle='seat-forward over the shoulder, out the rainy night glass'),
 'strap': dict(plate=True, order=PLATE, ui=B.DAY, clock='08:05', hud=(2, 3, .48), sign=(('4', C['t4']), 'MUNKKINIEMI', 'RAUTATIENTORI', False),
               card=('Inspectors board the 4 at Rautatientori.', ('Show the app', '+15 s'), ('Step off', '+120 s'), 'notice'),
               angle='standing strap-hold at the door bay, waist-up, low angle'),
 'disruption-close': dict(fn=scene_disruption_close, order=STOP, ui=B.DISRUPT, clock='07:42', hud=(1, 3, .26),
                    card=('Line 4 is halted at Ooppera.', ('Walk to the 2', '+90 s'), ('Wait it out', '+420 s'), 'warning'),
                    angle='isometric, close platform crop on the courier + halted nose'),
 'disruption': dict(fn=scene_disruption, order=STOP, ui=B.DISRUPT, clock='07:42', hud=(1, 3, .26),
                    card=('Line 4 is halted at Ooppera.', ('Walk to the 2', '+90 s'), ('Wait it out', '+420 s'), 'warning'), angle='isometric stop, wide'),
}

def ui_layers(name, W, H, card_on=True):
    sc = SCENES[name]; sk = sc['ui']; hudL = Image.new('RGBA', (W, H), (0, 0, 0, 0)); cardL = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    line, b1, b2, mood = sc['card']
    if W > H:
        s = W / 1920; look.hud(hudL, sk, 40 * s, 36 * s, s, sc['clock'], *sc['hud'])
        cs = 1.12 * s; cw = max(820 * s, look.card_width_needed(line, cs)); geo = (W - cw - 48 * s, H - 200 * cs - 56 * s, cw, cs)
    else:
        s = W / 1080; look.hud(hudL, sk, 48 * s, 72 * s, 1.15 * s, sc['clock'], *sc['hud'])
        cs = 1.22 * s; cw = W - 96 * s; geo = (48 * s, sc['card916_y'] * s if sc.get('card916_y') else H - 200 * cs - 150 * s, cw, cs)
    if card_on: look.card(cardL, sk, geo[0], geo[1], geo[2], geo[3], line, b1, b2, mood)
    return hudL, cardL, geo

def render_plate(name, W, H):
    import plates
    sc = SCENES[name]; fr = Frame(W, H); L, head, r = plates.layers(name, W, H); tile = L.pop('_tile')
    if fr.vert: fr.oy = 170 * fr.u
    sx = (W * SS * .5 - fr.cx) / fr.u
    L['05-signage'] = fr.down(signage(fr, *sc['sign'], x=sx))
    MARK[(name, W, H)] = dict(head=head, plate=None, r=r)
    hudL, cardL, geo = ui_layers(name, W, H); L['06-hud'] = hudL; L['07-card'] = cardL; L['_tile'] = tile
    return L, fr, geo

def render(name, W, H, **kw):
    if SCENES[name].get('plate'): return render_plate(name, W, H)
    sc = SCENES[name]; fr = Frame(W, H); L = sc['fn'](fr, **kw) if kw else sc['fn'](fr)
    tile = L.pop('_tile', None); head = L.pop('_head', None); plate = L.pop('_plate', None)
    MARK[(name, W, H)] = dict(head=head, plate=plate)
    out = {k: fr.down(v) for k, v in L.items()}
    hudL, cardL, geo = ui_layers(name, W, H); o = sc['order']; out[o[-2]] = hudL; out[o[-1]] = cardL
    if tile is not None: out['_tile'] = tile.resize((tile.width // SS, H), Image.LANCZOS)
    return out, fr, geo

def flatten(L, order):
    out = None
    for k in order: out = L[k].copy() if out is None else Image.alpha_composite(out, L[k])
    return out

def _mark(name, W, H):
    if (name, W, H) not in MARK: render(name, W, H)
    return MARK[(name, W, H)]
def head_xy(name, W, H):
    """Courier Toko-face centre in output px (for iris / ink-wash origins)."""
    x, y = _mark(name, W, H)['head']; return x * SS / SS if False else (x, y)
def plate_xy(W, H):
    """Coral pause disc on the OOPPERA plate: (x, y, r) in output px."""
    return _mark('disruption', W, H)['plate']
