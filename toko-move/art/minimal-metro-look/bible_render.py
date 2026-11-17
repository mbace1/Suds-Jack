#!/usr/bin/env python3
"""Toko Move — itch.io art bible renderer.
Draws the REAL HSL tram + metro geometry (cities/helsinki.json, HSL CC BY 4.0) and OSM water
(cities/ground/helsinki-water.json, ODbL) in three skins, plus the UI kit, and composes bible-sheet.png.
Run:  python3 make_bible.py      (outputs next to this file)
"""
import json, math, os, re, collections
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageChops
HERE = os.path.dirname(os.path.abspath(__file__))
TM = os.path.abspath(os.path.join(HERE, '..', '..'))
SS = 3                                                   # supersampling
FD = '/usr/share/fonts/truetype/sand-box/google/Inter/Inter-VariableFont_opsz,wght.ttf'
def font(px, w=500):
    f = ImageFont.truetype(FD, int(px))
    try: f.set_variation_by_axes([max(14, min(32, px)), w])
    except Exception: pass
    return f
def hx(h, a=255):
    h = h.lstrip('#'); return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), a)

# ---------------------------------------------------------------- palette
# live: toko-move/js/board.js TRAM_INK / METRO_INK / NIGHT; index.html :root; js/palette.js
LIVE_TRAM = {'1': '#9a79aa', '2': '#00d7ef', '3': '#8bc4fe', '4': '#c09734', '5': '#808b53', '6': '#ce6459', '7': '#fca8c1',
             '8': '#8495fd', '9': '#abcf66', '10': '#f19ef9', '11': '#2a9950', '12': '#1c9595', '13': '#db5389', '15': '#f4b58f', 'H': '#7ad3b0'}
METRO = '#e2531f'
TOKO_CYAN = '#33B2D2'
CSS = dict(paper='#edf2ee', panel='#fffdf7', rule='#c5cec8', ink='#15262b', dim='#69777a', water='#c9e4e8',
           sky='#2f9fb8', mint='#5aa860', coral='#e2683c', navy='#233d4d')

def srgb2lin(c):
    c = c / 255.0; return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
def lin2srgb(c):
    c = np.clip(c, 0, 1); return np.where(c <= 0.0031308, c * 12.92, 1.055 * c ** (1 / 2.4) - 0.055) * 255
M = np.array([[0.4124, 0.3576, 0.1805], [0.2126, 0.7152, 0.0722], [0.0193, 0.1192, 0.9505]]); Mi = np.linalg.inv(M)
WP = np.array([0.95047, 1.0, 1.08883])
def rgb2lab(h):
    xyz = M @ srgb2lin(np.array(hx(h)[:3], float)) / WP
    f = np.where(xyz > 216 / 24389, np.cbrt(xyz), (24389 / 27 * xyz + 16) / 116)
    return np.array([116 * f[1] - 16, 500 * (f[0] - f[1]), 200 * (f[1] - f[2])])
def lab2rgb(L, a, b):
    fy = (L + 16) / 116; fx = fy + a / 500; fz = fy - b / 200
    inv = lambda t: np.where(t ** 3 > 216 / 24389, t ** 3, (116 * t - 16) / (24389 / 27))
    xyz = np.array([inv(fx), inv(fy), inv(fz)]) * WP; return lin2srgb(Mi @ xyz)
def in_gamut(L, a, b):
    xyz = np.array([0, 0, 0.]); fy = (L + 16) / 116; fx = fy + a / 500; fz = fy - b / 200
    inv = lambda t: t ** 3 if t ** 3 > 216 / 24389 else (116 * t - 16) / (24389 / 27)
    lin = Mi @ (np.array([inv(fx), inv(fy), inv(fz)]) * WP); return np.all(lin >= -1e-4) and np.all(lin <= 1 + 1e-4)
def tohex(rgb): return '#%02x%02x%02x' % tuple(int(round(v)) for v in rgb)
def lum(h):
    r = srgb2lin(np.array(hx(h)[:3], float)); return 0.2126 * r[0] + 0.7152 * r[1] + 0.0722 * r[2]
def contrast(a, b):
    la, lb = sorted((lum(a), lum(b)), reverse=True); return (la + 0.05) / (lb + 0.05)

def day_inks():
    """Same hue + chroma family as the live night inks, lightness moved into L 38-58 for the paper board."""
    Ls = {k: rgb2lab(v)[0] for k, v in LIVE_TRAM.items()}; lo, hi = min(Ls.values()), max(Ls.values())
    out = {}
    for k, v in LIVE_TRAM.items():
        L, a, b = rgb2lab(v); Lt = 38 + (L - lo) / (hi - lo) * 20; s = 1.15
        while s > 0.2 and not in_gamut(Lt, a * s, b * s): s -= 0.02
        out[k] = tohex(lab2rgb(Lt, a * s, b * s))
    return out
DAY_TRAM = day_inks()
# Tram 2 hand-set: the solved #0a9aab was 2.99:1 on paper and only dE 12.6 from Toko cyan (the courier).
# L 50, hue +10: 3.99:1, dE 18.3 to the courier and 18.3 to tram 12 (its nearest neighbour).
DAY_TRAM['2'] = '#04829a'
DAY = dict(name='day', paper='#f4f1e8', water='#c9e4e8', coast='#a9cdd6', label='#15262b', labelDim='#69777a', halo=(244, 241, 232, 230),
           hub='#ffffff', hubRing='#15262b', inks=DAY_TRAM, metro=METRO, glow=False, casing='#f4f1e8')
NIGHT = dict(name='night', paper='#0f1418', water='#12293d', coast='#2a5f88', label='#c4ced4', labelDim='#98a4ab', halo=(15, 20, 24, 220),
             hub='#eef3f6', hubRing='#0f1418', inks=LIVE_TRAM, metro='#ff6a3d', glow=True, casing='#0f1418')
DISRUPT = dict(DAY, name='disruption', halted='4', haltGrey='#b8c2c6', warn=CSS['coral'])

# ---------------------------------------------------------------- data
D = json.load(open(os.path.join(TM, 'cities/helsinki.json')))
WATER = json.load(open(os.path.join(TM, 'cities/ground/helsinki-water.json')))
def fam(n):
    m = re.match(r'^(M?\d+)', n); return m.group(1) if m else re.sub('[^A-Z]', '', n)
FAMS = collections.OrderedDict()
for l in D['lines']:
    f = 'M' if l['mode'] == 'SUBWAY' else fam(l['name'])
    if f == 'M' and l['name'] not in ('M1', 'M2'): continue
    if f != 'M' and l['name'] != f: continue              # base variant only: 4 not 4H / 4T
    FAMS.setdefault(f, []).append(l['path'])
ORDER = ['M', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '15', 'H']
STOPS = {s['id']: s for s in D['stops']}
HUBS = collections.defaultdict(set)
for l in D['lines']:
    for s in l['stops']: HUBS[s].add('M' if l['mode'] == 'SUBWAY' else fam(l['name']))
LABELS = [('Päärautatieasema', 'RAUTATIENTORI', 0, -1), ('Senaatintori', 'SENAATINTORI', 1, -1), ('Ooppera', 'OOPPERA', -2.2, 0),
          ('Sörnäinen (M)', 'SÖRNÄINEN', 1, 0), ('Pasilan asema', 'PASILA', 1, 0), ('Kampintori', 'KAMPPI', -1, 1), ('Töölöntulli', 'TÖÖLÖ', -1, 0)]
BOX = dict(s=60.150, n=60.212, w=24.897, e=24.993)

class Proj:
    def __init__(s, box, W, H, pad=0):
        s.kx = math.cos(math.radians((box['n'] + box['s']) / 2)); s.box = box
        sc = min((W - 2 * pad) / ((box['e'] - box['w']) * s.kx), (H - 2 * pad) / (box['n'] - box['s']))
        s.sc = sc; s.ox = (W - (box['e'] - box['w']) * s.kx * sc) / 2; s.oy = (H - (box['n'] - box['s']) * sc) / 2
        s.m_per_px = 110540 / sc
    def __call__(s, lat, lon): return (s.ox + (lon - s.box['w']) * s.kx * s.sc, s.oy + (s.box['n'] - lat) * s.sc)

def resample(pts, step):
    out = [pts[0]]
    for i in range(1, len(pts)):
        a, b = np.array(out[-1]), np.array(pts[i]); d = np.linalg.norm(b - a)
        while d >= step:
            a = a + (b - a) / d * step; out.append(tuple(a)); d = np.linalg.norm(b - a)
    out.append(pts[-1]); return np.array(out)

def bundle(P, spacing):
    """Offset families that share track so they run side by side (Mini Metro style), in px space."""
    paths = {}
    for f, ps in FAMS.items():
        paths[f] = [resample([P(*p) for p in path], 2.0) for path in ps]
    cell = 30 / P.m_per_px                                 # 30 m sharing tolerance
    occ = collections.defaultdict(set)
    for f, ps in paths.items():
        for arr in ps:
            for x, y in arr: occ[(int(x // cell), int(y // cell))].add(f)
    out = {}
    for f, ps in paths.items():
        res = []
        for arr in ps:
            offs = np.zeros(len(arr))
            for i, (x, y) in enumerate(arr):
                cx, cy = int(x // cell), int(y // cell); sh = set()
                for dx in (-1, 0, 1):
                    for dy in (-1, 0, 1): sh |= occ.get((cx + dx, cy + dy), set())
                sh = sorted(sh, key=ORDER.index); n = len(sh); offs[i] = (sh.index(f) - (n - 1) / 2) * spacing
            k = max(3, int(14 / 2.0 * (P.sc / P.sc)) * 4 + 1); ker = np.ones(k) / k
            offs = np.convolve(np.pad(offs, k // 2, mode='edge'), ker, 'valid')
            sm = np.stack([np.convolve(np.pad(arr[:, j], 6, mode='edge'), np.ones(13) / 13, 'valid') for j in (0, 1)], 1)
            t = np.gradient(sm, axis=0); t /= (np.linalg.norm(t, axis=1, keepdims=True) + 1e-9)
            nrm = np.stack([-t[:, 1], t[:, 0]], 1)
            res.append(arr + nrm * offs[:, None])
        out[f] = res
    return out

def sea_mask(P, W, H):
    m = Image.new('L', (W, H), 0); d = ImageDraw.Draw(m)
    for e in WATER['edges']:
        pts = [P(*p) for p in e['shape']]
        if len(pts) > 1: d.line(pts, fill=255, width=max(2, int(W / 500)))
    # OSM coastline: land on the LEFT of the way, sea on the right. Every region the coast encloses is
    # labelled, then sea/land is decided by majority vote of right-hand vs left-hand samples, so a few
    # oddly-oriented ways cannot flood the land.
    lab = m.convert('I'); W2, H2 = lab.size; px = lab.load(); k = max(4, W / 220)
    nxt = 1000; votes = collections.Counter()
    for e in WATER['edges']:
        pts = [P(*p) for p in e['shape']]
        for i in range(0, len(pts) - 1):
            (x0, y0), (x1, y1) = pts[i], pts[i + 1]; L = math.hypot(x1 - x0, y1 - y0)
            if L < 1: continue
            tx, ty = (x1 - x0) / L, (y1 - y0) / L; mx, my = (x0 + x1) / 2, (y0 + y1) / 2
            for sgn in (1, -1):                         # +1 = right-hand (sea) side
                sx, sy = int(mx - ty * k * sgn), int(my + tx * k * sgn)
                if not (0 <= sx < W2 and 0 <= sy < H2): continue
                v = px[sx, sy]
                if v == 255: continue
                if v == 0: ImageDraw.floodfill(lab, (sx, sy), nxt); v = nxt; nxt += 1
                votes[v] += sgn
    arr = np.array(lab); seamask = np.isin(arr, [v for v, c in votes.items() if c > 0])
    sea = Image.fromarray((seamask * 255).astype(np.uint8))
    for a in WATER['areas']:
        pts = [P(*p) for p in a['shape']]
        if len(pts) > 2: ImageDraw.Draw(sea).polygon(pts, fill=255)
    return sea

def pill(d, a, b, w, fill):
    d.line([a, b], fill=fill, width=int(w)); r = w / 2
    for p in (a, b): d.ellipse([p[0] - r, p[1] - r, p[0] + r, p[1] + r], fill=fill)

def dashed(d, pts, fill, width, on, off):
    acc, draw_on, seg = 0, True, [tuple(pts[0])]
    for i in range(1, len(pts)):
        a, b = np.array(pts[i - 1]), np.array(pts[i]); L = np.linalg.norm(b - a)
        acc += L; seg.append(tuple(b))
        if acc >= (on if draw_on else off):
            if draw_on and len(seg) > 1: d.line(seg, fill=fill, width=int(width), joint='curve')
            draw_on = not draw_on; acc = 0; seg = [tuple(b)]
    if draw_on and len(seg) > 1: d.line(seg, fill=fill, width=int(width), joint='curve')

def courier(d, x, y, r, skin):
    d.ellipse([x - r * 1.45, y - r * 1.45, x + r * 1.45, y + r * 1.45], fill=hx('#15262b' if skin['name'] != 'night' else '#0f1418', 70))
    d.ellipse([x - r * 1.3, y - r * 1.3, x + r * 1.3, y + r * 1.3], fill=hx('#ffffff'))
    d.ellipse([x - r, y - r, x + r, y + r], fill=hx(TOKO_CYAN))
    s = r * 0.42; d.rounded_rectangle([x - s, y - s, x + s, y + s], radius=s * 0.3, fill=hx('#ffffff'))

def cargo(d, x, y, r, p, skin, ring_col):
    d.ellipse([x - r * 1.5, y - r * 1.5, x + r * 1.5, y + r * 1.5], fill=hx(skin['hub']))
    w = max(2, r * 0.32); bb = [x - r * 1.3, y - r * 1.3, x + r * 1.3, y + r * 1.3]
    d.arc(bb, 0, 360, fill=hx('#d9dfdb' if skin['name'] != 'night' else '#3a454c'), width=int(w))
    d.arc(bb, -90, -90 + 360 * p, fill=hx(ring_col), width=int(w))
    s = r * 0.5; d.rounded_rectangle([x - s, y - s, x + s, y + s], radius=s * 0.25, fill=hx(skin['label']))

def path_point(arr, t):
    seg = np.linalg.norm(np.diff(arr, axis=0), axis=1); c = np.concatenate([[0], np.cumsum(seg)]); s = t * c[-1]
    i = min(len(seg) - 1, max(0, np.searchsorted(c, s) - 1)); u = (s - c[i]) / max(seg[i], 1e-9)
    p = arr[i] + (arr[i + 1] - arr[i]) * u; tv = arr[i + 1] - arr[i]; tv = tv / (np.linalg.norm(tv) + 1e-9); return p, tv

def render_map(skin, W, H, box=BOX, vehicles=True, hud=False, event=False, scale_ui=1.0):
    w, h = W * SS, H * SS; P = Proj(box, w, h)
    lw = max(3.0, W / 260) * SS; spacing = lw * 1.15
    img = Image.new('RGBA', (w, h), hx(skin['paper']))
    sea = sea_mask(P, w, h)
    img.paste(Image.new('RGBA', (w, h), hx(skin['water'])), (0, 0), sea)
    edge = sea.filter(ImageFilter.FIND_EDGES).filter(ImageFilter.MaxFilter(3))
    img.paste(Image.new('RGBA', (w, h), hx(skin['coast'])), (0, 0), edge)
    B = bundle(P, spacing)
    ink = lambda f: skin['metro'] if f == 'M' else skin['inks'].get(f, '#6a7a80')
    halted = skin.get('halted')
    if skin['glow']:
        g = Image.new('RGBA', (w, h), (0, 0, 0, 0)); gd = ImageDraw.Draw(g)
        for f in reversed(ORDER):
            for arr in B.get(f, []): gd.line([tuple(p) for p in arr], fill=hx(ink(f)), width=int(lw * (2.6 if f == 'M' else 2.2)), joint='curve')
        g = g.filter(ImageFilter.GaussianBlur(lw * 2.2))
        img = Image.alpha_composite(img, Image.blend(Image.new('RGBA', (w, h), (0, 0, 0, 0)), g, 0.85))
    d = ImageDraw.Draw(img)
    for f in reversed(ORDER):                                 # metro last = on top
        for arr in B.get(f, []):
            pts = [tuple(p) for p in arr]; width = lw * (1.6 if f == 'M' else 1.0)
            if f == 'M': d.line(pts, fill=hx(skin['casing']), width=int(width + lw * 0.9), joint='curve')
            if f == halted:
                d.line(pts, fill=hx(skin['paper']), width=int(width), joint='curve')
                dashed(d, pts, hx(skin['haltGrey']), width, lw * 3.2, lw * 2.2)
            else: d.line(pts, fill=hx(ink(f)), width=int(width), joint='curve')
    # hubs: interchanges with 3+ families
    seen = []
    for sid, fs in HUBS.items():
        if len(fs) < 3 or sid not in STOPS: continue
        x, y = P(STOPS[sid]['lat'], STOPS[sid]['lon'])
        if any(math.hypot(x - a, y - b) < lw * 3.5 for a, b in seen): continue
        seen.append((x, y)); r = lw * (1.45 if len(fs) >= 5 else 1.15)
        d.ellipse([x - r - lw * .45, y - r - lw * .45, x + r + lw * .45, y + r + lw * .45], fill=hx(skin['hubRing']))
        d.ellipse([x - r, y - r, x + r, y + r], fill=hx(skin['hub']))
    # labels
    lf = font(max(10, W / 95) * SS, 650)
    for sname, txt, dx, dy in LABELS:
        st = next((s for s in D['stops'] if s['name'] == sname), None)
        if not st: continue
        x, y = P(st['lat'], st['lon']); tw = d.textlength(txt, font=lf)
        tx = x + dx * lw * 3 + (math.copysign(tw / 2, dx) if dx else 0) - tw / 2; ty = y + dy * lw * 4.5 - lf.size / 2
        d.text((tx, ty), txt, font=lf, fill=hx(skin['labelDim']), stroke_width=int(lw * .6), stroke_fill=skin['halo'])
    # vehicles (numbered pills), courier, jobs
    if vehicles:
        vl = lw * 5.0; vw = lw * 3.0; nf = font(vw * 0.66, 800)
        for f, ts in (('M', (.18, .62)), ('2', (.35,)), ('4', (.42, .7)), ('6', (.55,)), ('7', (.3,)), ('9', (.6,)), ('3', (.2,)), ('1', (.5,)), ('10', (.4,)), ('8', (.65,))):
            for t in ts:
                arr = B[f][0]; p, tv = path_point(arr, t)
                if not (0 < p[0] < w and 0 < p[1] < h): continue
                a, b = tuple(p - tv * vl / 2), tuple(p + tv * vl / 2)
                col = skin['haltGrey'] if f == halted else ink(f)
                pill(d, a, b, vw + lw * .8, hx(skin['casing'] if skin['name'] == 'night' else '#ffffff'))
                pill(d, a, b, vw, hx(col))
                lab = '' if f == 'M' else f
                if lab: d.text(tuple(p), lab, font=nf, fill=hx('#ffffff' if skin['name'] != 'night' else '#0f1418'), anchor='mm')
        # courier rides tram 2 near the centre; job drop with deadline ring
        p, tv = path_point(B['2'][0], .47); courier(d, p[0], p[1], lw * 1.9, skin)
        x, y = P(60.1858, 24.9213)                          # drop near Töölön halli
        ring = skin.get('warn', CSS['navy'] if skin['name'] != 'night' else '#7ad3b0')
        cargo(d, x, y, lw * 1.9, 0.62 if skin['name'] != 'disruption' else 0.28, skin, ring)
        x2, y2 = P(60.1879, 24.9632); cargo(d, x2, y2, lw * 1.6, 0.85, skin, CSS['navy'] if skin['name'] != 'night' else '#7ad3b0')
        if halted:
            arr = B[halted][0]; st = next(s_ for s_ in D['stops'] if s_['name'] == 'Ooppera'); ox, oy = P(st['lat'], st['lon'])
            i0 = int(np.argmin(np.hypot(arr[:, 0] - ox, arr[:, 1] - oy)))
            seg = np.linalg.norm(np.diff(arr, axis=0), axis=1); c = np.concatenate([[0], np.cumsum(seg)]); t0 = c[i0] / c[-1]
            p, tv = path_point(arr, t0); n = np.array([-tv[1], tv[0]]); r = lw * 2.6
            d.ellipse([p[0] - r * 1.25, p[1] - r * 1.25, p[0] + r * 1.25, p[1] + r * 1.25], fill=hx('#ffffff'))
            d.ellipse([p[0] - r, p[1] - r, p[0] + r, p[1] + r], fill=hx(skin['warn']))
            for sgn in (-1, 1):                              # pause glyph = halted
                d.rounded_rectangle([p[0] + sgn * r * .3 - r * .13, p[1] - r * .45, p[0] + sgn * r * .3 + r * .13, p[1] + r * .45], radius=r * .06, fill=hx('#ffffff'))
    img = img.resize((W, H), Image.LANCZOS)
    if hud: draw_hud(img, skin, scale_ui)
    if event: draw_event(img, skin, scale_ui)
    return img

# ---------------------------------------------------------------- UI kit
def ui_cols(skin):
    if skin['name'] == 'night': return dict(panel=(21, 27, 32, 236), ink='#e6edf0', dim='#98a4ab', rule='#2c363d', prime='#e6edf0', primeTxt='#0f1418')
    return dict(panel=hx(CSS['panel'], 240), ink=CSS['ink'], dim=CSS['dim'], rule=CSS['rule'], prime=CSS['navy'], primeTxt='#ffffff')

def jobdots(d, x, y, r, n_done, n, col, ring):
    for i in range(n):
        cx = x + i * r * 3
        if i < n_done: d.ellipse([cx - r, cy(y, r)[0], cx + r, cy(y, r)[1]], fill=hx(col))
        else: d.ellipse([cx - r, cy(y, r)[0], cx + r, cy(y, r)[1]], outline=hx(ring), width=max(2, int(r * .38)))
def cy(y, r): return (y - r, y + r)

def draw_hud(img, skin, k=1.0):
    W, H = img.size; s = W / 1920 * k; c = ui_cols(skin)
    o = Image.new('RGBA', img.size, (0, 0, 0, 0)); d = ImageDraw.Draw(o)
    x0, y0, ph = 36 * s, 32 * s, 76 * s
    d.rounded_rectangle([x0, y0, x0 + 430 * s, y0 + ph], radius=ph / 2, fill=c['panel'], outline=hx(c['rule']), width=max(1, int(1.5 * s)))
    d.text((x0 + 34 * s, y0 + ph / 2), '07:42', font=font(40 * s, 650), fill=hx(c['ink']), anchor='lm')
    jobdots(d, x0 + 190 * s, y0 + ph / 2, 11 * s, 2, 3, c['ink'], c['dim'])
    sk = dict(skin); sk['label'] = c['ink'] if skin['name'] == 'night' else skin['label']
    cargo(d, x0 + 370 * s, y0 + ph / 2, 15 * s, 0.62 if skin['name'] != 'disruption' else 0.28, sk, skin.get('warn', CSS['navy'] if skin['name'] != 'night' else '#7ad3b0'))
    img.alpha_composite(o)

# ---- Toko faces: the traced master (toko/js/master.js, from toko/master/face-white-on-yellow.jpg).
# White ink on a mood disc, placed exactly as drawMasterBadge() does (BADGE_INK 1.33, by the 700 frame).
# Mood poses use only what master.js allows: eyes SQUASH about their foot, the smile GRINs about its top.
_MJS = open(os.path.join(TM, '..', 'toko', 'js', 'master.js')).read()
MASTER = {k: np.array([float(v) for v in re.search(k + r':\s*\[([^\]]+)\]', _MJS).group(1).split(',')]).reshape(-1, 2)
          for k in ('eyeL', 'eyeR', 'mouthOuter', 'mouthInner')}
FACE_MOODS = {   # non-magenta only (owner, 1 Nov 2026)
    'info':        dict(ground='#33B2D2', squash=1.0,  grin=1.0,  label='info · Toko cyan'),        # ref face-cyan-on-white.jpg
    'opportunity': dict(ground='#FFCC00', squash=1.0,  grin=1.06, label='opportunity · yellow'),    # ref face-*-yellow*.jpg
    'warning':     dict(ground='#e2683c', squash=0.62, grin=0.86, label='warning · coral'),         # live --coral
    'notice':      dict(ground='#176b73', squash=0.85, grin=0.94, label='service notice · deep teal'),
}
def _mb():
    allp = np.concatenate(list(MASTER.values())); x0, y0 = allp.min(0); x1, y1 = allp.max(0); return x0, y0, x1 - x0, y1 - y0
def toko_face_img(r, mood, ring=None):
    m = FACE_MOODS[mood]; S = 4; R = r * S; size = int(R * 2 + 8 * S)
    im = Image.new('RGBA', (size, size), (0, 0, 0, 0)); d = ImageDraw.Draw(im); c = size / 2
    if ring: d.ellipse([c - R - 3 * S, c - R - 3 * S, c + R + 3 * S, c + R + 3 * S], fill=hx(ring))
    d.ellipse([c - R, c - R, c + R, c + R], fill=hx(m['ground']))
    bx, by, bw, bh = _mb(); sc = R * 1.33 / bw; ox = c + (bx - 350) * sc; oy = c + (by - 350) * sc
    L = MASTER['eyeL']; Rr = MASTER['eyeR']; Mo = MASTER['mouthOuter']
    piv = {'eyeL': ((L[:, 0].min() + L[:, 0].max()) / 2, L[:, 1].max()), 'eyeR': ((Rr[:, 0].min() + Rr[:, 0].max()) / 2, Rr[:, 1].max()),
           'mouthOuter': ((Mo[:, 0].min() + Mo[:, 0].max()) / 2, Mo[:, 1].min())}
    piv['mouthInner'] = piv['mouthOuter']
    for k, pts in MASTER.items():
        px, py = piv[k]
        if k.startswith('eye'): q = np.stack([pts[:, 0], py + (pts[:, 1] - py) * m['squash']], 1)
        else: q = np.stack([px + (pts[:, 0] - px) * m['grin'], py + (pts[:, 1] - py) * m['grin']], 1)
        d.polygon([(ox + (x - bx) * sc, oy + (y - by) * sc) for x, y in q], fill=(255, 255, 255, 255))
    return im.resize((size // S, size // S), Image.LANCZOS)
def face(d, x, y, r, skin, mood='info'):
    f = toko_face_img(r, mood, ring='#ffffff' if skin['name'] != 'night' else None)
    d._image.alpha_composite(f, (int(x - f.width / 2), int(y - f.height / 2)))

def event_card(d, x, y, w, skin, s, line, b1, b2, mood='info'):
    c = ui_cols(skin); h = 200 * s
    d.rounded_rectangle([x + 4 * s, y + 8 * s, x + w + 4 * s, y + h + 8 * s], radius=26 * s, fill=(0, 0, 0, 40))
    d.rounded_rectangle([x, y, x + w, y + h], radius=26 * s, fill=c['panel'], outline=hx(skin.get('warn', c['rule'])) if skin.get('warn') else hx(c['rule']), width=max(2, int((3 if skin.get('warn') else 1.5) * s)))
    face(d, x + 64 * s, y + 66 * s, 40 * s, skin, mood)
    d.text((x + 124 * s, y + 66 * s), line, font=font(30 * s, 600), fill=hx(c['ink']), anchor='lm')
    bw = (w - 3 * 24 * s) / 2; by = y + 118 * s; bh = 62 * s
    for i, (lab, price) in enumerate((b1, b2)):
        bx = x + 24 * s + i * (bw + 24 * s); prime = i == 0
        d.rounded_rectangle([bx, by, bx + bw, by + bh], radius=bh / 2, fill=hx(c['prime']) if prime else None, outline=hx(c['prime']), width=max(2, int(2.5 * s)))
        tc = hx(c['primeTxt']) if prime else hx(c['ink'])
        d.text((bx + 30 * s, by + bh / 2), lab, font=font(26 * s, 650), fill=tc, anchor='lm')
        d.text((bx + bw - 30 * s, by + bh / 2), price, font=font(26 * s, 500), fill=tc, anchor='rm')
    return h

EVENTS = {'day': ('Tram 2 is two minutes early.', ('Run for it', '+20 s'), ('Next one', '+300 s'), 'opportunity'),
          'night': ('Last 4 east leaves Senaatintori.', ('Catch it', '+45 s'), ('Walk', '+540 s'), 'info'),
          'disruption': ('Line 4 is halted at Ooppera.', ('Walk to the 2', '+90 s'), ('Wait it out', '+420 s'), 'warning')}
def draw_event(img, skin, k=1.0):
    W, H = img.size; s = W / 1920 * k; o = Image.new('RGBA', img.size, (0, 0, 0, 0)); d = ImageDraw.Draw(o)
    line, b1, b2, mood = EVENTS[skin['name']]; w = 700 * s
    event_card(d, W - w - 40 * s, H - 250 * s, w, skin, s, line, b1, b2, mood); img.alpha_composite(o)

# ---------------------------------------------------------------- sheet
def swatch_row(d, x, y, items, s=1.0, f=None, col='#15262b'):
    f = f or font(15, 500)
    for i, (hexv, name) in enumerate(items):
        cx = x + i * 112 * s
        d.rounded_rectangle([cx, y, cx + 34 * s, y + 34 * s], radius=8 * s, fill=hx(hexv), outline=hx('#c5cec8'))
        d.text((cx + 42 * s, y + 4 * s), name, font=font(14 * s, 650), fill=hx(col))
        d.text((cx + 42 * s, y + 20 * s), hexv.lower(), font=font(13 * s, 450), fill=hx('#69777a'))

def main():
    out = {}
    for sk in (DAY, NIGHT, DISRUPT):
        im = render_map(sk, 1920, 1080, box=dict(s=60.158, n=60.200, w=24.897, e=24.993), hud=True, event=True)
        im.convert('RGB').save(f'{HERE}/still-{sk["name"]}.png', optimize=True); out[sk['name']] = im
        print('still', sk['name'])
    panels = {sk['name']: render_map(sk, 640, 900) for sk in (DAY, NIGHT, DISRUPT)}
    SW, SH = 2400, 2160; sheet = Image.new('RGBA', (SW, SH), hx('#fbfaf6')); d = ImageDraw.Draw(sheet)
    INK, DIM = hx(CSS['ink']), hx(CSS['dim'])
    d.text((60, 52), 'TOKO MOVE', font=font(64, 800), fill=INK)
    d.text((62, 132), 'itch.io art bible · a courier on Helsinki\u2019s real HSL network · wait · catch · ride · transfer · walk', font=font(22, 450), fill=DIM)
    d.text((SW - 60, 66), 'TOKO MIDORI GAMES', font=font(22, 750), fill=INK, anchor='ra')
    d.ellipse([SW - 60 - 300 - 34, 64, SW - 60 - 300 - 8, 90], fill=hx(TOKO_CYAN))
    d.text((SW - 60, 102), 'board: exact HSL tram + metro geometry · HSL CC BY 4.0 · water © OSM (ODbL)', font=font(15, 450), fill=DIM, anchor='ra')
    d.line([60, 180, SW - 60, 180], fill=hx(CSS['rule']), width=2)
    caps = {'day': ('1  DAY — the default skin', 'near-white paper, HSL lines, pale water'),
            'night': ('2  NIGHT — mutator', 'ink ground, the live board inks lit as neon'),
            'disruption': ('3  DISRUPTION — mutator', 'one line halted: grey dashes, coral stops')}
    for i, k in enumerate(('day', 'night', 'disruption')):
        x = 60 + i * 790; y = 210
        d.text((x, y), caps[k][0], font=font(24, 750), fill=INK); d.text((x, y + 34), caps[k][1], font=font(17, 450), fill=DIM)
        p = panels[k]; sheet.paste(p, (x, y + 70)); d.rounded_rectangle([x, y + 70, x + 640, y + 970], radius=2, outline=hx(CSS['rule']), width=2)
        sk = {'day': DAY, 'night': NIGHT, 'disruption': DISRUPT}[k]
        if k == 'day': sw = [(DAY['paper'], 'paper'), (DAY['water'], 'water'), (METRO, 'metro'), (DAY_TRAM['4'], 'tram 4'), (DAY_TRAM['2'], 'tram 2')]
        elif k == 'night': sw = [(NIGHT['paper'], 'ink'), (NIGHT['water'], 'water'), (NIGHT['metro'], 'metro'), (LIVE_TRAM['4'], 'tram 4'), (LIVE_TRAM['2'], 'tram 2')]
        else: sw = [(DAY['paper'], 'paper'), (DISRUPT['haltGrey'], 'halted'), (CSS['coral'], 'warn'), (METRO, 'metro'), (CSS['navy'], 'ui ink')]
        for j, (hv, nm) in enumerate(sw):
            cx = x + j * 128; cyy = y + 990
            d.rounded_rectangle([cx, cyy, cx + 30, cyy + 30], radius=7, fill=hx(hv), outline=hx(CSS['rule']))
            d.text((cx + 38, cyy + 1), nm, font=font(14, 650), fill=INK); d.text((cx + 38, cyy + 17), hv.lower(), font=font(13, 450), fill=DIM)
    # row B: courier + badges | UI kit
    yB = 1300; d.line([60, yB - 24, SW - 60, yB - 24], fill=hx(CSS['rule']), width=2)
    d.text((60, yB), '4  COURIER + VEHICLES', font=font(24, 750), fill=INK)
    courier(d, 110, yB + 110, 30, DAY); d.text((160, yB + 92), 'courier — Toko cyan disc, white ring,', font=font(17, 600), fill=INK)
    d.text((160, yB + 116), 'white parcel; the only cyan-filled thing', font=font(16, 450), fill=DIM)
    vx = 70; vy = yB + 210
    for f in ('1', '2', '3', '4', '6', '7', '9', '10', '13', 'H'):
        lab = f; wv = 46 if len(lab) < 2 else 56
        d.rounded_rectangle([vx, vy, vx + wv, vy + 34], radius=7, fill=hx(DAY_TRAM[f]), outline=hx('#ffffff'), width=3)
        d.text((vx + wv / 2, vy + 17), lab, font=font(18, 800), fill=hx('#ffffff'), anchor='mm'); vx += wv + 10
    d.rounded_rectangle([vx, vy, vx + 66, vy + 34], radius=17, fill=hx(METRO), outline=hx('#ffffff'), width=3)
    d.text((vx + 33, vy + 17), 'M1', font=font(18, 800), fill=hx('#ffffff'), anchor='mm')
    d.text((70, vy + 48), 'line badges = the CSS .lb chip: tram rounded-rect, metro pill; same colour as the map line', font=font(15, 450), fill=DIM)
    vy2 = vy + 92
    for i, (f, col) in enumerate((('4', DAY_TRAM['4']), ('2', DAY_TRAM['2']), ('M', METRO), ('4', DISRUPT['haltGrey']))):
        a = (90 + i * 150, vy2 + 20); b = (150 + i * 150, vy2 + 20)
        pill(d, a, b, 34, hx('#ffffff')); pill(d, a, b, 26, hx(col))
        if f != 'M': d.text(((a[0] + b[0]) / 2, a[1]), f, font=font(17, 800), fill=hx('#ffffff'), anchor='mm')
    d.text((70, vy2 + 52), 'vehicles on the map: numbered pills · metro un-numbered · halted = grey', font=font(15, 450), fill=DIM)
    # UI kit
    ux = 860; d.text((ux, yB), '5  UI KIT — three glyphs + one card', font=font(24, 750), fill=INK)
    d.rounded_rectangle([ux, yB + 60, ux + 430, yB + 136], radius=38, fill=hx(CSS['panel']), outline=hx(CSS['rule']), width=2)
    d.text((ux + 34, yB + 98), '07:42', font=font(40, 650), fill=INK, anchor='lm')
    jobdots(d, ux + 190, yB + 98, 11, 2, 3, CSS['ink'], CSS['dim'])
    cargo(d, ux + 370, yB + 98, 15, .62, DAY, CSS['navy'])
    lab = [('clock', ux + 34), ('jobs ●●○', ux + 170), ('deadline ring', ux + 318)]
    for t, lx in lab: d.text((lx, yB + 146), t, font=font(14, 600), fill=DIM)
    for i, (p, col, t) in enumerate(((.85, CSS['navy'], 'plenty'), (.5, CSS['navy'], 'half'), (.22, CSS['coral'], 'late: coral'))):
        cargo(d, ux + 40 + i * 140, yB + 230, 22, p, DAY, col); d.text((ux + 40 + i * 140, yB + 280), t, font=font(14, 600), fill=DIM, anchor='ma')
    event_card(d, ux + 470, yB + 60, 1010, DAY, 1.0, 'Tram 2 is two minutes early.', ('Run for it', '+20 s'), ('Next one', '+300 s'), 'opportunity')
    d.text((ux + 470, yB + 276), 'event = a Toko face, one line, two buttons priced in seconds. No headings, no tick counters, no paragraphs.', font=font(15, 450), fill=DIM)
    for i, (mk, mv) in enumerate(FACE_MOODS.items()):
        fx = ux + 500 + i * 250; face(d, fx, yB + 345, 30, DAY, mk)
        d.text((fx + 42, yB + 333), mv['label'].split(' · ')[0], font=font(15, 700), fill=INK)
        d.text((fx + 42, yB + 352), mv['label'].split(' · ')[1] + '  ' + mv['ground'].lower(), font=font(13, 450), fill=DIM)
    d.text((ux + 470, yB + 392), 'Toko faces: traced master (toko/js/master.js), white on a mood disc. Never magenta. Warning squashes the eyes; notice relaxes the smile.', font=font(14, 450), fill=DIM)
    # row C: itch stills
    yC = 1820; d.line([60, yC - 24, SW - 60, yC - 24], fill=hx(CSS['rule']), width=2)
    d.text((60, yC), '6  ITCH STILLS — the same map, three skins (1920×1080 files beside this sheet)', font=font(24, 750), fill=INK)
    for i, k in enumerate(('day', 'night', 'disruption')):
        t = out[k].copy(); t.thumbnail((440, 248)); x = 60 + i * 470; sheet.paste(t, (x, yC + 50))
        d.rectangle([x, yC + 50, x + t.width, yC + 50 + t.height], outline=hx(CSS['rule']), width=2)
        d.text((x, yC + 50 + t.height + 10), f'still-{k}.png', font=font(14, 600), fill=DIM)
    # brand note block
    bx = 1500; d.text((bx, yC + 50), 'Toko cyan #33b2d2 = the player and Toko only (courier, info face, logo).', font=font(17, 600), fill=INK)
    for j, t in enumerate(['HSL lines own every other hue. Tram 2 stays a deeper teal on paper so', 'the courier never reads as a vehicle (dE76 in ART-BIBLE.md).',
                           'Coral #e2683c = warning / late only, never a line stroke.', 'Metro #e2531f always on top, 1.6× width, paper casing.',
                           'Family-friendly. No mature content, no awards in this bible.']):
        d.text((bx, yC + 82 + j * 26), t, font=font(15, 450), fill=DIM)
    sheet.convert('RGB').save(f'{HERE}/bible-sheet.png', optimize=True); print('sheet')
    for k, p in panels.items(): p.convert('RGB').save(f'{HERE}/skin-{k}.png', optimize=True)

if __name__ == '__main__':
    main()
