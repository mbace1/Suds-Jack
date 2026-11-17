#!/usr/bin/env python3
"""Toko Move flat-illustration scenes (procedural vector, Pillow). Direction: Mikael's flat UI-illustration refs
(_refs/), pushed more minimal: big shapes, few people, no texture, bible palette. Exactly ONE person has a Toko face:
the courier (cyan mood disc, white ring, white traced-master face). Everyone else: plain flat heads, no features.
Every scene returns full-frame transparent layers (back -> front) that composite to the still, plus a seamless
outside tile for window scroll."""
import math, numpy as np
from PIL import Image, ImageDraw
import bible_render as B
from bible_render import hx, font, CSS
import look

SS = 2
C = dict(paper='#f4f1e8', panel='#fffdf7', ink='#15262b', dim='#69777a', rule='#c5cec8', navy='#233d4d', water='#c9e4e8',
         metro='#e2531f', metroLit='#ff6a3d', t4='#8a6802', t4n='#c09734', t2='#04829a', halt='#b8c2c6', coral='#e2683c', cyan='#33b2d2')
SKIN = ['#e8b996', '#c98e66', '#8d5b3f', '#f1cfb0']
HAIR = ['#2b2420', '#6b3e26', '#c9a15a', '#15262b']
INTERIOR = ['01-outside', '02-car-shell', '03-fixtures', '04-people', '05-courier', '06-signage', '07-hud', '08-card']
STOP = ['01-backdrop', '02-street', '03-tram', '04-shelter', '05-people', '06-courier', '07-signage', '08-hud', '09-card']

class Frame:
    def __init__(s, W, H):
        s.W, s.H = W, H; s.k = SS; s.u = min(W, H) / 1080 * SS         # 1 design unit (1080 space) in supersampled px
        s.oy = (H - 1080 * min(W, H) / 1080) / 2 * SS if H > W else 0     # vertical: centre the 1080 scene band
        if H > W: s.oy = 470 * s.u                                       # leave room for HUD above, card below
        s.cx = (W * .40 if W > H else W * .5) * SS                       # courier column
        s.vert = H > W
    def new(s): return Image.new('RGBA', (s.W * SS, s.H * SS), (0, 0, 0, 0))
    def Y(s, y): return s.oy + y * s.u
    def X(s, x): return s.cx + x * s.u
    def down(s, im): return im.resize((s.W, s.H), Image.LANCZOS)

def rr(d, box, r, fill, outline=None, width=0):
    x0, y0, x1, y1 = box; d.rounded_rectangle([min(x0, x1), min(y0, y1), max(x0, x1), max(y0, y1)], radius=r, fill=fill, outline=outline, width=width)
def bar(d, a, b, w, fill):
    d.line([a, b], fill=fill, width=int(w)); r = w / 2
    for p in (a, b): d.ellipse([p[0] - r, p[1] - r, p[0] + r, p[1] + r], fill=fill)

# ---------------------------------------------------------------- people
def head_plain(d, x, y, r, skin, hair, f=1):
    d.ellipse([x - r, y - r, x + r, y + r], fill=hx(skin))
    d.pieslice([x - r * 1.04, y - r * 1.08, x + r * 1.04, y + r * .9], 180, 360, fill=hx(hair))
    d.ellipse([x - f * r * 1.05 - r * .35, y - r * .5, x - f * r * 1.05 + r * .35, y + r * .2], fill=hx(hair))   # back of the head

def toko_head(img, x, y, r, mood='info'):
    """The courier's head: Toko face, white on a mood disc, white ring (bible face())."""
    f = B.toko_face_img(r / SS, mood, ring='#ffffff')
    f = f.resize((int(f.width * SS), int(f.height * SS)), Image.LANCZOS)
    img.alpha_composite(f, (int(x - f.width / 2), int(y - f.height / 2)))

def person(img, fr, x, pose, skin, hair, top, legs, f=1, strap=None, prop=None, toko=None, floor=900):
    """x in design units from the courier column; pose: stand | sit | sleep. f = facing (+1 right, -1 left)."""
    d = ImageDraw.Draw(img); P = getattr(fr, 'P', 1.0); u = fr.u * P; X = lambda dx: fr.X(x + dx * f * P); Y = lambda y: fr.Y(floor - (floor - y) * P); fy = floor
    shoe = hx(C['ink'])
    if pose == 'stand':
        for dx in (-13, 13): bar(d, (X(dx), Y(fy - 150)), (X(dx), Y(fy - 12)), 26 * u, hx(legs)); rr(d, (X(dx - 12), Y(fy - 14), X(dx + 22), Y(fy)), 7 * u, shoe)
        rr(d, (X(-46), Y(fy - 305), X(46), Y(fy - 135)), 36 * u, hx(top))
        hx_, hy = X(6), Y(fy - 348)
        if strap:                                            # strap = (x, y) absolute design coords of the hanging ring
            hxp, hyp = fr.X(strap[0]), fr.Y(strap[1]); bar(d, (X(24), Y(fy - 288)), (hxp, hyp), 22 * u, hx(top))
            d.ellipse([hxp - 13 * u, hyp - 13 * u, hxp + 13 * u, hyp + 13 * u], fill=hx(skin))
        else: bar(d, (X(26), Y(fy - 285)), (X(46), Y(fy - 180)), 22 * u, hx(top))
    else:
        sy = fy - 150
        bar(d, (X(-4), Y(sy - 14)), (X(100), Y(sy - 14)), 30 * u, hx(legs)); bar(d, (X(100), Y(sy - 14)), (X(108), Y(fy - 12)), 26 * u, hx(legs))
        rr(d, (X(94), Y(fy - 14), X(132), Y(fy)), 7 * u, shoe)
        rr(d, (X(-44), Y(sy - 175), X(40), Y(sy + 4)), 34 * u, hx(top))
        hx_, hy = (X(22), Y(sy - 192)) if pose == 'sleep' else (X(4), Y(sy - 212))
        if prop == 'parcel':
            bar(d, (X(14), Y(sy - 140)), (X(70), Y(sy - 66)), 22 * u, hx(top))
            rr(d, (X(36), Y(sy - 118), X(118), Y(sy - 40)), 8 * u, hx('#ffffff'), outline=hx(C['rule']), width=int(3 * u))
            d.line([X(77), Y(sy - 118), X(77), Y(sy - 40)], fill=hx(C['ink']), width=int(6 * u))       # sealed: one tape band
        elif prop == 'book':
            bar(d, (X(14), Y(sy - 140)), (X(64), Y(sy - 80)), 22 * u, hx(top)); rr(d, (X(56), Y(sy - 118), X(78), Y(sy - 66)), 4 * u, hx(C['t2']))
        else: bar(d, (X(14), Y(sy - 140)), (X(66), Y(sy - 50)), 22 * u, hx(top))
    if toko: toko_head(img, hx_, hy, 40 * u, toko)
    else: head_plain(d, hx_, hy, 31 * u, skin, hair, f)

def courier_kit(img, fr, x, pose, f=1, strap=None, prop='parcel', floor=900, night=False):
    top, legs = ('#3d5a6b', '#26343d') if night else (C['navy'], C['ink'])
    person(img, fr, x, pose, C['ink'] if not night else '#26343d', None, top, legs, f, strap, prop, toko='info', floor=floor)

# ---------------------------------------------------------------- interior pieces
def seat(d, fr, x, col, f=1):
    P = getattr(fr, 'P', 1.0); u = fr.u * P; X = lambda dx: fr.X(x + dx * f * P); Y = lambda y: fr.Y(900 - (900 - y) * P); sy = 750
    bar(d, (X(-58), Y(sy - 190)), (X(-40), Y(sy - 8)), 26 * u, hx(col))
    bar(d, (X(-46), Y(sy - 4)), (X(84), Y(sy - 4)), 26 * u, hx(col))
    bar(d, (X(14), Y(sy + 10)), (X(14), Y(900)), 14 * u, hx(col))

def outside_tile(kind, fr, tw):
    """Seamless horizontal tile (width tw supersampled px) of what passes the windows."""
    H = fr.H * SS; im = Image.new('RGBA', (tw, H), hx('#dceef0' if kind == 'day' else '#0b1014')); d = ImageDraw.Draw(im); u = fr.u
    rng = np.random.default_rng(7 if kind == 'day' else 11)
    def wrap_rect(x0, y0, w, h, col, r=0):
        for o in (-tw, 0, tw): rr(d, (x0 + o, y0, x0 + w + o, y0 + h), r, col)
    if kind == 'day':
        x = 0
        while x < tw:                                            # far blocks
            w = rng.integers(90, 220) * u; h = rng.integers(80, 240) * u; wrap_rect(x, fr.Y(560) - h, w - 14 * u, h + 400 * u, hx('#c3dade')); x += w
        x = 0
        while x < tw:                                            # near blocks, one with a flat dome (city skyline, no landmarks drawn literally)
            w = rng.integers(160, 320) * u; h = rng.integers(40, 150) * u; wrap_rect(x, fr.Y(600) - h, w - 22 * u, h + 400 * u, hx('#a9cdd6')); x += w
        for o in (-tw, 0, tw):                                   # catenary line + poles: the only "rail" detail
            d.line([0 + o, fr.Y(300), tw + o, fr.Y(300)], fill=hx('#8fb3bb'), width=int(3 * u))
        for px in np.arange(0, tw, tw / 4): wrap_rect(px, fr.Y(280), 10 * u, 900 * u, hx('#8fb3bb'))
    else:
        for o in (-tw, 0, tw):
            for yy, col, wdt in ((330, '#1d2a33', 4), (370, '#1d2a33', 4), (470, '#16222a', 10)):
                d.line([o, fr.Y(yy), tw + o, fr.Y(yy)], fill=hx(col), width=int(wdt * u))
        for px in np.arange(0, tw, tw / 6): wrap_rect(px, fr.Y(400), 120 * u, 10 * u, hx('#2a5f88'), 5 * u)   # tunnel lamps
    return im

def tile_across(tile, W, off=0):
    out = Image.new('RGBA', (W, tile.height), (0, 0, 0, 0)); tw = tile.width; x = -(off % tw)
    while x < W: out.alpha_composite(tile, (int(x), 0)); x += tw
    return out

def car_interior(fr, kind):
    """kind: day (tram 4, Sealed Parcel) | night (metro M, Last metro)."""
    u = fr.u; W, H = fr.W * SS, fr.H * SS; night = kind == 'night'
    wall, ceil_, floor_ = (('#1b2329', '#141b20', '#10161a') if night else ('#fbf8f0', '#ece8dc', '#e3dfd2'))
    pole = C['metroLit'] if night else C['t4n']; seatc = '#2c3a44' if night else C['navy']
    L = {}
    tw = int(1600 * u); tile = outside_tile(kind, fr, tw); L['_tile'] = tile
    L['01-outside'] = tile_across(tile, W)
    sh = fr.new(); d = ImageDraw.Draw(sh)
    d.rectangle([0, 0, W, H], fill=hx(wall)); d.rectangle([0, 0, W, fr.Y(130)], fill=hx(ceil_)); d.rectangle([0, fr.Y(900), W, H], fill=hx(floor_))
    d.line([0, fr.Y(900), W, fr.Y(900)], fill=hx(C['ink'] if not night else '#2c363d'), width=int(4 * u))
    bay = 600; doors = []
    for i in range(-4, 5):
        bx = fr.X(i * bay - 300)
        if i % 3 == 1:                                           # door bay: two panels with tall windows
            doors.append(bx)
            for j in (0, 1):
                px = bx + (150 + j * 152) * u; rr(d, (px, fr.Y(190), px + 148 * u, fr.Y(898)), 14 * u, hx('#e7e3d6' if not night else '#232d34'))
                rr(d, (px + 22 * u, fr.Y(230), px + 126 * u, fr.Y(620)), 14 * u, (0, 0, 0, 0))
        else:
            rr(d, (bx + 120 * u, fr.Y(210), bx + 480 * u, fr.Y(560)), 28 * u, (0, 0, 0, 0))
    d.rectangle([0, fr.Y(130), W, fr.Y(146)], fill=hx(C['rule'] if not night else '#2c363d'))
    if night: d.rectangle([0, fr.Y(112), W, fr.Y(124)], fill=hx('#c4ced4'))          # ceiling light strip
    L['02-car-shell'] = sh
    fx = fr.new(); d = ImageDraw.Draw(fx)
    d.line([0, fr.Y(180), W, fr.Y(180)], fill=hx(pole), width=int(12 * u))           # grab rail
    for i in range(-4, 5):
        px = fr.X(i * bay - 300 + 105)
        bar(d, (px, fr.Y(180)), (px, fr.Y(900)), 12 * u, hx(pole))
    for i in range(-8, 9):                                     # straps
        sx = fr.X(i * 300 + 40); d.line([sx, fr.Y(180), sx, fr.Y(296)], fill=hx(C['dim'] if not night else '#4a5660'), width=int(5 * u))
        d.ellipse([sx - 16 * u, fr.Y(292), sx + 16 * u, fr.Y(324)], outline=hx(C['dim'] if not night else '#4a5660'), width=int(5 * u))
    L['03-fixtures'] = fx
    return L, bay

def signage(fr, line_badge, dest, nxt, night, x=0):
    """In-car display: dark strip, line chip (tram = rounded rect, metro = pill, white border), destination, next stop."""
    im = fr.new(); d = ImageDraw.Draw(im); u = fr.u
    x0, x1, y0, y1 = fr.X(x - 330), fr.X(x + 330), fr.Y(28), fr.Y(118)
    rr(d, (x0, y0, x1, y1), 14 * u, hx('#15262b'))
    fam, col = line_badge; bx = x0 + 22 * u; bh = 54 * u; by = (y0 + y1) / 2 - bh / 2
    if fam == 'M': rr(d, (bx, by, bx + 84 * u, by + bh), bh / 2, hx(col), outline=hx('#ffffff'), width=int(4 * u)); bw = 84 * u
    else: rr(d, (bx, by, bx + 62 * u, by + bh), 10 * u, hx(col), outline=hx('#ffffff'), width=int(4 * u)); bw = 62 * u
    d.text((bx + bw / 2, by + bh / 2), fam, font=font(30 * u, 800), fill=hx('#ffffff'), anchor='mm')
    d.text((bx + bw + 22 * u, by + bh / 2), dest, font=font(30 * u, 700), fill=hx('#e6edf0'), anchor='lm')
    d.text((x1 - 22 * u, by + bh / 2), nxt, font=font(26 * u, 700), fill=hx('#ffcc00'), anchor='rm')
    d.text((x1 - 22 * u - d.textlength(nxt, font=font(26 * u, 700)) - 14 * u, by + bh / 2), '›', font=font(30 * u, 700), fill=hx('#98a4ab'), anchor='rm')
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

# ---------------------------------------------------------------- scenes
def scene_day(fr):
    fr.P = 1.35
    L, bay = car_interior(fr, 'day')
    seats = fr.new(); d = ImageDraw.Draw(seats)
    for x in (-60, 300): seat(d, fr, x, C['navy'], 1)
    L['03-fixtures'].alpha_composite(seats)
    pp = fr.new()
    person(pp, fr, 300, 'sit', SKIN[1], HAIR[2], '#c76c8a', '#3e4a52', 1, prop='book')
    person(pp, fr, 600, 'stand', SKIN[0], HAIR[1], '#6c981c', '#233d4d', -1, strap=(640, 312))
    L['04-people'] = pp
    cc = fr.new(); courier_kit(cc, fr, -60, 'sit', 1, prop='parcel'); L['05-courier'] = cc
    L['06-signage'] = signage(fr, ('4', C['t4']), 'MUNKKINIEMI', 'LASIPALATSI', False, x=120 if not fr.vert else 0)
    if fr.vert: stop_strip(L['06-signage'], fr, C['t4n'], ['SENAATINTORI', 'LASIPALATSI', 'OOPPERA', 'TÖÖLÖ'], 1, False)
    return L

def scene_night(fr):
    fr.P = 1.35
    L, bay = car_interior(fr, 'night')
    seats = fr.new(); d = ImageDraw.Draw(seats)
    for x in (-420, 420): seat(d, fr, x, '#2c3a44', 1)
    L['03-fixtures'].alpha_composite(seats)
    pp = fr.new(); person(pp, fr, 420, 'sleep', SKIN[3], HAIR[0], '#3e8ecc', '#2a3640', 1); L['04-people'] = pp
    cc = fr.new(); courier_kit(cc, fr, 10, 'stand', 1, strap=(40, 312), night=True)
    d = ImageDraw.Draw(cc); u = fr.u                         # parcel under the free arm
    rr(d, (fr.X(-40), fr.Y(600), fr.X(56), fr.Y(676)), 8 * u, hx('#ffffff')); d.line([fr.X(8), fr.Y(600), fr.X(8), fr.Y(676)], fill=hx(C['ink']), width=int(6 * u))
    L['05-courier'] = cc
    L['06-signage'] = signage(fr, ('M', C['metro']), 'VUOSAARI', 'KAMPPI', True, x=120 if not fr.vert else 0)
    if fr.vert: stop_strip(L['06-signage'], fr, C['metroLit'], ['RUOHOLAHTI', 'KAMPPI', 'RAUTATIENTORI', 'HAKANIEMI'], 1, True)
    return L

def tram_side(fr, x0, halted, tint=0.0):
    """Flat profile tram: paper body, line-colour band. halted / tint (0..1) moves band + chip to halted grey."""
    im = fr.new(); d = ImageDraw.Draw(im); u = fr.u
    def mix(a, b, t): a, b = np.array(hx(a)[:3]), np.array(hx(b)[:3]); return tuple(int(v) for v in a + (b - a) * t) + (255,)
    t = 1.0 if halted else tint; band = mix(C['t4'], C['halt'], t)
    top, bot = fr.Y(380), fr.Y(735); segs = [(x0, x0 + 560), (x0 + 580, x0 + 1140), (x0 + 1160, x0 + 1760)]
    for i, (a, b) in enumerate(segs):
        A, Bx = fr.X(a), fr.X(b); rr(d, (A, top, Bx, bot), (60 if i == 2 else 18) * u, hx('#fffdf7'), outline=hx(C['ink']), width=int(4 * u))
        rr(d, (A, fr.Y(640), Bx, fr.Y(690)), 0, band)
        for k in range(3):                                   # windows
            wx = A + (36 + k * 175) * u; rr(d, (wx, fr.Y(430), wx + 140 * u, fr.Y(590)), 16 * u, hx('#233d4d'))
    for a, b in ((segs[0][1], segs[1][0]), (segs[1][1], segs[2][0])): d.rectangle([fr.X(a), fr.Y(420), fr.X(b), fr.Y(720)], fill=hx(C['ink']))
    d.line([fr.X(x0 + 700), top, fr.X(x0 + 760), fr.Y(300), fr.X(x0 + 840), fr.Y(300)], fill=hx(C['ink']), width=int(6 * u))
    for wx in (x0 + 120, x0 + 450, x0 + 700, x0 + 1020, x0 + 1300, x0 + 1640):
        d.ellipse([fr.X(wx) - 26 * u, fr.Y(712), fr.X(wx) + 26 * u, fr.Y(764)], fill=hx(C['ink']))
    # front sign: line chip (+ coral pause when halted)
    fx = fr.X(x0 + 1600); rr(d, (fx - 70 * u, fr.Y(400), fx + 70 * u, fr.Y(440)), 8 * u, hx('#15262b'))
    rr(d, (fx - 60 * u, fr.Y(404), fx - 14 * u, fr.Y(436)), 6 * u, band, outline=hx('#ffffff'), width=int(3 * u))
    d.text((fx - 37 * u, fr.Y(420)), '4', font=font(24 * u, 800), fill=hx('#ffffff'), anchor='mm')
    if t > .5:
        r = 16 * u; px, py = fx + 30 * u, fr.Y(420); d.ellipse([px - r, py - r, px + r, py + r], fill=hx(C['coral']))
        for sg in (-1, 1): d.rectangle([px + sg * r * .32 - r * .14, py - r * .48, px + sg * r * .32 + r * .14, py + r * .48], fill=hx('#ffffff'))
    return im

def scene_disruption(fr, tint=1.0):
    u = fr.u; W, H = fr.W * SS, fr.H * SS; L = {}
    bg = Image.new('RGBA', (W, H), hx(C['paper'])); d = ImageDraw.Draw(bg); rng = np.random.default_rng(3); x = -200 * u
    while x < W:                                             # flat skyline blocks, paper-on-paper
        w = rng.integers(140, 300) * u; h = (rng.integers(260, 820) if fr.vert else rng.integers(120, 300)) * u; rr(d, (x, fr.Y(640) - h, x + w - 20 * u, fr.Y(640)), 6 * u, hx('#e6e2d6')); x += w
    L['01-backdrop'] = bg
    st = fr.new(); d = ImageDraw.Draw(st)
    d.rectangle([0, fr.Y(640), W, fr.Y(790)], fill=hx('#e1e4df')); d.rectangle([0, fr.Y(790), W, H], fill=hx('#ece9df'))
    for yy in (760, 772): d.line([0, fr.Y(yy), W, fr.Y(yy)], fill=hx(C['dim']), width=int(4 * u))
    d.line([0, fr.Y(300), W, fr.Y(300)], fill=hx(C['dim']), width=int(3 * u))          # overhead wire
    L['02-street'] = st
    L['03-tram'] = tram_side(fr, -1250, False, tint)
    sh = fr.new(); d = ImageDraw.Draw(sh)                    # shelter, in front of the tram on the kerb
    sx = 160 if not fr.vert else 70; rr(d, (fr.X(sx), fr.Y(560), fr.X(sx + 520), fr.Y(590)), 8 * u, hx(C['navy']))
    for px in (sx + 20, sx + 490): d.rectangle([fr.X(px), fr.Y(590), fr.X(px + 12), fr.Y(905)], fill=hx(C['navy']))
    rr(d, (fr.X(sx + 40), fr.Y(600), fr.X(sx + 480), fr.Y(860)), 6 * u, hx(C['water'], 150))
    rr(d, (fr.X(sx + 80), fr.Y(770), fr.X(sx + 440), fr.Y(792)), 6 * u, hx(C['t4n']))
    for px in (sx + 110, sx + 400): d.rectangle([fr.X(px), fr.Y(792), fr.X(px + 10), fr.Y(905)], fill=hx(C['navy']))
    L['04-shelter'] = sh
    pp = fr.new(); person(pp, fr, sx + 250, 'sit', SKIN[2], HAIR[0], '#bc7c53', '#3e4a52', -1, floor=905); L['05-people'] = pp
    cc = fr.new(); courier_kit(cc, fr, -40, 'stand', 1, prop=None, floor=905)
    d = ImageDraw.Draw(cc); rr(d, (fr.X(-60), fr.Y(700), fr.X(-140 + 200 - 100), fr.Y(700)), 0, None)
    rr(d, (fr.X(-118), fr.Y(690), fr.X(-36), fr.Y(758)), 8 * u, hx('#ffffff'), outline=hx(C['rule']), width=int(3 * u))
    d.line([fr.X(-77), fr.Y(690), fr.X(-77), fr.Y(758)], fill=hx(C['ink']), width=int(6 * u)); L['06-courier'] = cc
    sg = fr.new(); d = ImageDraw.Draw(sg); px = 760 if not fr.vert else -380                  # stop pole + plate: OOPPERA, chips 4 (halted) and 2
    d.rectangle([fr.X(px), fr.Y(420), fr.X(px + 12), fr.Y(905)], fill=hx(C['ink']))
    rr(d, (fr.X(px - 120), fr.Y(330), fr.X(px + 132), fr.Y(470)), 12 * u, hx('#15262b'))
    d.text((fr.X(px + 6), fr.Y(368)), 'OOPPERA', font=font(32 * u, 800), fill=hx('#e6edf0'), anchor='mm')
    band = tuple(int(a + (b - a) * tint) for a, b in zip(hx(C['t4'])[:3], hx(C['halt'])[:3])) + (255,)
    for i, (lab, col) in enumerate((('4', band), ('2', hx(C['t2'])))):
        bx = fr.X(px - 80 + i * 90); rr(d, (bx, fr.Y(402), bx + 60 * u, fr.Y(448)), 9 * u, col, outline=hx('#ffffff'), width=int(3 * u))
        d.text((bx + 30 * u, fr.Y(425)), lab, font=font(26 * u, 800), fill=hx('#ffffff'), anchor='mm')
    if tint > .5:
        r = 22 * u; cxp, cyp = fr.X(px + 120), fr.Y(330); d.ellipse([cxp - r * 1.25, cyp - r * 1.25, cxp + r * 1.25, cyp + r * 1.25], fill=hx('#ffffff'))
        d.ellipse([cxp - r, cyp - r, cxp + r, cyp + r], fill=hx(C['coral']))
        for s_ in (-1, 1): d.rectangle([cxp + s_ * r * .32 - r * .14, cyp - r * .48, cxp + s_ * r * .32 + r * .14, cyp + r * .48], fill=hx('#ffffff'))
    L['07-signage'] = sg
    return L

SCENES = {
 'day': dict(fn=scene_day, order=INTERIOR, ui=look.DAY if hasattr(look, 'DAY') else B.DAY, clock='07:42', hud=(1, 3, .62),
             card=('A rider at Lasipalatsi needs this before Töölö.', ('Take it', '+40 s'), ('Leave it', '+0 s'), 'opportunity')),
 'night': dict(fn=scene_night, order=INTERIOR, ui=B.NIGHT, clock='23:51', hud=(2, 3, .34),
               card=('Last metro to Vuosaari leaves Kamppi.', ('Catch it', '+60 s'), ('Walk', '+900 s'), 'info')),
 'disruption': dict(fn=scene_disruption, order=STOP, ui=B.DISRUPT, clock='07:42', hud=(1, 3, .26),
                    card=('Line 4 is halted at Ooppera.', ('Walk to the 2', '+90 s'), ('Wait it out', '+420 s'), 'warning')),
}

def ui_layers(name, W, H, card_on=True):
    sc = SCENES[name]; sk = sc['ui']; hudL = Image.new('RGBA', (W, H), (0, 0, 0, 0)); cardL = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    line, b1, b2, mood = sc['card']
    if W > H:
        s = W / 1920; look.hud(hudL, sk, 40 * s, 36 * s, s, sc['clock'], *sc['hud'])
        cs = 1.12 * s; cw = max(820 * s, look.card_width_needed(line, cs)); geo = (W - cw - 48 * s, H - 200 * cs - 56 * s, cw, cs)
    else:
        s = W / 1080; look.hud(hudL, sk, 48 * s, 72 * s, 1.15 * s, sc['clock'], *sc['hud'])
        cs = 1.22 * s; cw = W - 96 * s; geo = (48 * s, H - 200 * cs - 150 * s, cw, cs)
    if card_on: look.card(cardL, sk, geo[0], geo[1], geo[2], geo[3], line, b1, b2, mood)
    return hudL, cardL, geo

def render(name, W, H, **kw):
    sc = SCENES[name]; fr = Frame(W, H); L = sc['fn'](fr, **kw) if kw else sc['fn'](fr)
    tile = L.pop('_tile', None); out = {k: fr.down(v) for k, v in L.items()}
    hudL, cardL, geo = ui_layers(name, W, H); o = sc['order']; out[o[-2]] = hudL; out[o[-1]] = cardL
    if tile is not None: out['_tile'] = tile.resize((tile.width // SS, H), Image.LANCZOS)
    return out, fr, geo

def flatten(L, order):
    out = None
    for k in order: out = L[k].copy() if out is None else Image.alpha_composite(out, L[k])
    return out

HEAD = {'day': (-60 + 4 * 1.35, 900 - 362 * 1.35), 'night': (10 + 6 * 1.35, 900 - 348 * 1.35), 'disruption': (-34, 905 - 348)}
def head_xy(name, W, H):
    """Courier Toko-face centre in output px (for iris / ink-wash origins)."""
    fr = Frame(W, H)
    if name == 'disruption' and fr.vert: pass
    x, y = HEAD[name]; return fr.X(x) / SS, fr.Y(y) / SS
