#!/usr/bin/env python3
"""Toko Move minimal-metro look: layered scene renderer.
Reuses a LOCAL copy of the itch-bible renderer (bible_render.py = itch-bible/make_bible.py, unmodified copy)
for palette, HSL geometry, bundling, water, courier, cargo, Toko faces. Adds: arbitrary camera (centre + m/px),
per-beat vehicles/courier/jobs, and full-frame transparent layers that composite back to the still.
"""
import math, numpy as np
from PIL import Image, ImageDraw, ImageFilter
import bible_render as B
from bible_render import hx, font, CSS, DAY, NIGHT, DISRUPT, TOKO_CYAN

import os as _os
SS = int(_os.environ.get('LOOK_SS', 3))
LAYERS = ['01-ground', '02-lines', '03-hubs-labels', '04-vehicles', '05-jobs-alerts', '06-courier', '07-hud', '08-card']
MINT = '#7ad3b0'

def stop(name):
    return next(s for s in B.D['stops'] if s['name'] == name)

def box_from(lat, lon, mpp, W, H):
    kx = math.cos(math.radians(lat)); dlat = H * mpp / 110540; dlon = W * mpp / (110540 * kx)
    return dict(s=lat - dlat / 2, n=lat + dlat / 2, w=lon - dlon / 2, e=lon + dlon / 2)

class Camera:
    """Everything needed to draw at supersampled resolution for one framing."""
    def __init__(s, skin, W, H, lat, lon, mpp, ss=SS, lw=None):
        s.skin, s.W, s.H, s.ss = skin, W, H, ss
        s.w, s.h = W * ss, H * ss
        s.P = B.Proj(box_from(lat, lon, mpp, W, H), s.w, s.h)
        s.lw = (lw or 9.0 * min(W, H) / 1080) * ss
        s.B = B.bundle(s.P, s.lw * 1.15)
    def xy(s, name_or_ll):
        if isinstance(name_or_ll, str):
            st = stop(name_or_ll); return s.P(st['lat'], st['lon'])
        return s.P(*name_or_ll)
    def on_line(s, f, where, shift=0.0):
        """point + unit tangent on family f nearest `where`, moved `shift` line-widths along the track."""
        x, y = s.xy(where); best = None
        for arr in s.B[f]:
            dd = np.hypot(arr[:, 0] - x, arr[:, 1] - y); i = int(np.argmin(dd))
            if best is None or dd[i] < best[0]: best = (dd[i], arr, i)
        _, arr, i = best
        seg = np.linalg.norm(np.diff(arr, axis=0), axis=1); c = np.concatenate([[0], np.cumsum(seg)])
        t = (c[i] + shift * s.lw) / c[-1]
        return B.path_point(arr, min(max(t, 0), 1))
    def ink(s, f):
        return s.skin['metro'] if f == 'M' else s.skin['inks'].get(f, '#6a7a80')

def _new(cam): return Image.new('RGBA', (cam.w, cam.h), (0, 0, 0, 0))
def _down(cam, im): return im.resize((cam.W, cam.H), Image.LANCZOS)

# ---------------------------------------------------------------- static layers
_REF = {}
def sea_ref():
    """Sea mask solved ONCE on the bible's proven framing (B.BOX), cached; cameras resample it.
    Edges are replicated outward so framings that run past the OSM extract keep the coast's sea/land."""
    if 'm' in _REF: return _REF['m'], _REF['P'], _REF['pad']
    import os; cdir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '_cache'); os.makedirs(cdir, exist_ok=True)
    RW, RH = 6400, 6400; P = B.Proj(B.BOX, RW, RH); fn = os.path.join(cdir, 'sea_ref.png')
    if os.path.exists(fn): m = Image.open(fn).convert('L')
    else: m = B.sea_mask(P, RW, RH); m.save(fn)
    pad = 2000; a = np.pad(np.array(m), pad, mode='edge'); a[-pad:, :] = 255   # south of the extract = open sea
    _REF.update(m=Image.fromarray(a), P=P, pad=pad); return _REF['m'], P, pad

def sea_for(cam):
    m, RP, pad = sea_ref()
    # camera px -> lat/lon -> ref px (both equirectangular => affine)
    def c2ll(x, y):
        p = cam.P; return (p.box['n'] - (y - p.oy) / p.sc, p.box['w'] + (x - p.ox) / (p.kx * p.sc))
    (la0, lo0), (la1, lo1) = c2ll(0, 0), c2ll(cam.w, cam.h)
    (rx0, ry0), (rx1, ry1) = RP(la0, lo0), RP(la1, lo1)
    ax = (rx1 - rx0) / cam.w; ay = (ry1 - ry0) / cam.h
    return m.transform((cam.w, cam.h), Image.AFFINE, (ax, 0, rx0 + pad, 0, ay, ry0 + pad), resample=Image.BILINEAR).point(lambda v: 255 if v > 127 else 0)

def layer_ground(cam):
    sk = cam.skin; img = Image.new('RGBA', (cam.w, cam.h), hx(sk['paper']))
    sea = sea_for(cam)
    img.paste(Image.new('RGBA', img.size, hx(sk['water'])), (0, 0), sea)
    edge = sea.filter(ImageFilter.FIND_EDGES).filter(ImageFilter.MaxFilter(3))
    img.paste(Image.new('RGBA', img.size, hx(sk['coast'])), (0, 0), edge)
    return img

def layer_lines(cam, halted=None, halt_frac=1.0):
    """halt_frac < 1 = the grey-out transition part-way (dashes run along the line)."""
    sk, lw = cam.skin, cam.lw; img = _new(cam)
    if sk['glow']:
        g = _new(cam); gd = ImageDraw.Draw(g)
        for f in reversed(B.ORDER):
            for arr in cam.B.get(f, []):
                gd.line([tuple(p) for p in arr], fill=hx(cam.ink(f)), width=int(lw * (2.6 if f == 'M' else 2.2)), joint='curve')
        g = g.filter(ImageFilter.GaussianBlur(lw * 2.2)); a = np.array(g); a[..., 3] = (a[..., 3] * .85).astype(np.uint8)
        img = Image.alpha_composite(img, Image.fromarray(a))
    d = ImageDraw.Draw(img)
    for f in reversed(B.ORDER):
        for arr in cam.B.get(f, []):
            pts = [tuple(p) for p in arr]; width = lw * (1.6 if f == 'M' else 1.0)
            if f == 'M': d.line(pts, fill=hx(sk['casing']), width=int(width + lw * .9), joint='curve')
            if f == halted:
                n = max(2, int(len(pts) * halt_frac))
                if n < len(pts): d.line(pts[n - 1:], fill=hx(cam.ink(f)), width=int(width), joint='curve')
                d.line(pts[:n], fill=hx(sk['paper']), width=int(width), joint='curve')
                B.dashed(d, pts[:n], hx(DISRUPT['haltGrey']), width, lw * 3.2, lw * 2.2)
            else:
                d.line(pts, fill=hx(cam.ink(f)), width=int(width), joint='curve')
    return img

def layer_hubs(cam, labels, extra_hubs=()):
    sk, lw = cam.skin, cam.lw; img = _new(cam); d = ImageDraw.Draw(img); seen = []
    def hub(x, y, big):
        r = lw * (1.45 if big else 1.15)
        d.ellipse([x - r - lw * .45, y - r - lw * .45, x + r + lw * .45, y + r + lw * .45], fill=hx(sk['hubRing']))
        d.ellipse([x - r, y - r, x + r, y + r], fill=hx(sk['hub']))
    for sid, fs in B.HUBS.items():
        if len(fs) < 3 or sid not in B.STOPS: continue
        x, y = cam.P(B.STOPS[sid]['lat'], B.STOPS[sid]['lon'])
        if any(math.hypot(x - a, y - b) < lw * 3.5 for a, b in seen): continue
        seen.append((x, y)); hub(x, y, len(fs) >= 5)
    for nm in extra_hubs:                                   # e.g. a metro station that is a story stop
        x, y = cam.xy(nm)
        if not any(math.hypot(x - a, y - b) < lw * 3.5 for a, b in seen): hub(x, y, True); seen.append((x, y))
    lf = font(max(10, min(cam.W, cam.H) / 52) * cam.ss, 700)
    for sname, txt, dx, dy in labels:
        x, y = cam.xy(sname); tw = d.textlength(txt, font=lf)
        tx = x + dx * lw * 3 + (math.copysign(tw / 2, dx) if dx else 0) - tw / 2; ty = y + dy * lw * 4.5 - lf.size / 2
        d.text((tx, ty), txt, font=lf, fill=hx(sk['labelDim']), stroke_width=int(lw * .6), stroke_fill=sk['halo'])
    return img

# ---------------------------------------------------------------- dynamic layers
def draw_vehicle(d, cam, f, p, tv, grey=False):
    sk, lw = cam.skin, cam.lw; vl, vw = lw * 5.0, lw * 3.0
    a, b = tuple(p - tv * vl / 2), tuple(p + tv * vl / 2)
    col = DISRUPT['haltGrey'] if grey else cam.ink(f)
    B.pill(d, a, b, vw + lw * .8, hx(sk['casing'] if sk['name'] == 'night' else '#ffffff'))
    B.pill(d, a, b, vw, hx(col))
    if f != 'M':
        d.text(tuple(p), f, font=font(vw * .66, 800), fill=hx('#ffffff' if sk['name'] != 'night' else '#0f1418'), anchor='mm')

def layer_vehicles(cam, vehicles, halted=None, ride=None):
    img = _new(cam); d = ImageDraw.Draw(img)
    if ride: vehicles = list(vehicles) + [ride]              # the vehicle the courier is riding
    for f, where, shift in vehicles:
        p, tv = cam.on_line(f, where, shift)
        if -50 < p[0] < cam.w + 50 and -50 < p[1] < cam.h + 50: draw_vehicle(d, cam, f, p, tv, grey=(f == halted))
    return img

def ring_col(skin, p):
    if p < .3 or skin.get('warn'): return CSS['coral']
    return MINT if skin['name'] == 'night' else CSS['navy']

def halt_stop(d, cam, where, pulse=0.0):
    p = np.array(cam.xy(where)); r = cam.lw * 2.6
    if pulse > 0:                                           # coral pulse ring (motion)
        rr = r * (1.25 + .9 * pulse); a = int(150 * (1 - pulse))
        d.ellipse([p[0] - rr, p[1] - rr, p[0] + rr, p[1] + rr], outline=hx(CSS['coral'], a), width=int(cam.lw * .5))
    d.ellipse([p[0] - r * 1.25, p[1] - r * 1.25, p[0] + r * 1.25, p[1] + r * 1.25], fill=hx('#ffffff'))
    d.ellipse([p[0] - r, p[1] - r, p[0] + r, p[1] + r], fill=hx(CSS['coral']))
    for sgn in (-1, 1):
        d.rounded_rectangle([p[0] + sgn * r * .3 - r * .13, p[1] - r * .45, p[0] + sgn * r * .3 + r * .13, p[1] + r * .45], radius=r * .06, fill=hx('#ffffff'))

def layer_jobs(cam, jobs, halt=None, pulse=0.0):
    img = _new(cam); d = ImageDraw.Draw(img)
    for where, p in jobs:
        x, y = cam.xy(where); B.cargo(d, x, y, cam.lw * 1.9, p, cam.skin, ring_col(cam.skin, p))
    if halt: halt_stop(d, cam, halt, pulse)
    return img

def layer_courier(cam, courier):
    img = _new(cam); d = ImageDraw.Draw(img)
    f, where, shift = courier; p, _ = cam.on_line(f, where, shift)
    B.courier(d, p[0], p[1], cam.lw * 1.9, cam.skin); return img

# ---------------------------------------------------------------- UI (drawn at output res, 1x, like the bible)
def hud(img, skin, x0, y0, s, clock='07:42', done=2, n=3, p=.62):
    c = B.ui_cols(skin); d = ImageDraw.Draw(img); ph = 76 * s
    d.rounded_rectangle([x0, y0, x0 + 430 * s, y0 + ph], radius=ph / 2, fill=c['panel'], outline=hx(c['rule']), width=max(1, int(1.5 * s)))
    d.text((x0 + 34 * s, y0 + ph / 2), clock, font=font(40 * s, 650), fill=hx(c['ink']), anchor='lm', features=['tnum'])
    B.jobdots(d, x0 + 190 * s, y0 + ph / 2, 11 * s, done, n, c['ink'], c['dim'])
    sk = dict(skin); sk['label'] = c['ink'] if skin['name'] == 'night' else skin['label']
    B.cargo(d, x0 + 370 * s, y0 + ph / 2, 15 * s, p, sk, ring_col(skin, p))

def card(img, skin, x, y, w, s, line, b1, b2, mood, face_scale=1.0, press=None):
    """Bible §4 event card: Toko face, ONE line, TWO buttons priced in seconds (left = filled primary, right = ghost).
    press: 0..1 highlight on the primary (motion only). Drawn on its own overlay, then composited (soft shadow)."""
    dst = img; img = Image.new('RGBA', dst.size, (0, 0, 0, 0)); d = ImageDraw.Draw(img); c = B.ui_cols(skin); h = 200 * s; warn = mood == 'warning'
    d.rounded_rectangle([x + 4 * s, y + 8 * s, x + w + 4 * s, y + h + 8 * s], radius=26 * s, fill=(0, 0, 0, 40 if skin['name'] != 'night' else 90))
    d.rounded_rectangle([x, y, x + w, y + h], radius=26 * s, fill=c['panel'],
                        outline=hx(CSS['coral']) if warn else hx(c['rule']), width=max(2, int((3 if warn else 1.5) * s)))
    if face_scale > 0.02:
        f = B.toko_face_img(40 * s * face_scale, mood, ring='#ffffff' if skin['name'] != 'night' else None)
        img.alpha_composite(f, (int(x + 64 * s - f.width / 2), int(y + 66 * s - f.height / 2)))
    d.text((x + 124 * s, y + 66 * s), line, font=font(30 * s, 600), fill=hx(c['ink']), anchor='lm')
    bw = (w - 3 * 24 * s) / 2; by = y + 118 * s; bh = 62 * s
    for i, (lab, price) in enumerate((b1, b2)):
        bx = x + 24 * s + i * (bw + 24 * s); prime = i == 0
        ins = (press or 0) * 3 * s if prime else 0
        d.rounded_rectangle([bx + ins, by + ins, bx + bw - ins, by + bh - ins], radius=bh / 2, fill=hx(c['prime']) if prime else None,
                            outline=hx(c['prime']), width=max(2, int(2.5 * s)))
        tc = hx(c['primeTxt']) if prime else hx(c['ink'])
        d.text((bx + 30 * s, by + bh / 2), lab, font=font(26 * s, 650), fill=tc, anchor='lm')
        d.text((bx + bw - 30 * s, by + bh / 2), price, font=font(26 * s, 500), fill=tc, anchor='rm')
    dst.alpha_composite(img); return h

def card_width_needed(line, s):
    d = ImageDraw.Draw(Image.new('RGBA', (8, 8))); return 124 * s + d.textlength(line, font=font(30 * s, 600)) + 44 * s

# ---------------------------------------------------------------- full scene
def render(beat, W, H):
    sk = beat['skin']; cam = Camera(sk, W, H, *beat['center'], beat['mpp'] * 1920 / max(W, H) if W > H else beat['mpp_v'])
    halted = beat.get('halted')
    L = {}
    L['01-ground'] = _down(cam, layer_ground(cam))
    L['02-lines'] = _down(cam, layer_lines(cam, halted))
    L['03-hubs-labels'] = _down(cam, layer_hubs(cam, beat['labels'], beat.get('extra_hubs', ())))
    L['04-vehicles'] = _down(cam, layer_vehicles(cam, beat['vehicles'], halted, beat['courier']))
    L['05-jobs-alerts'] = _down(cam, layer_jobs(cam, beat['jobs'], beat.get('halt_at')))
    L['06-courier'] = _down(cam, layer_courier(cam, beat['courier']))
    hudL = Image.new('RGBA', (W, H), (0, 0, 0, 0)); cardL = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    line, b1, b2, mood = beat['card']
    if W > H:
        s = W / 1920; hud(hudL, sk, 40 * s, 36 * s, s, beat['clock'], *beat['hud'])
        cs = 1.12 * s; cw = max(820 * s, card_width_needed(line, cs)); card(cardL, sk, W - cw - 48 * s, H - 200 * cs - 56 * s, cw, cs, line, b1, b2, mood)
    else:
        s = W / 1080; hud(hudL, sk, 48 * s, 72 * s, 1.15 * s, beat['clock'], *beat['hud'])
        cs = 1.22 * s; cw = W - 96 * s; card(cardL, sk, 48 * s, H - 200 * cs - 150 * s, cw, cs, line, b1, b2, mood)
    L['07-hud'] = hudL; L['08-card'] = cardL
    return L, cam

def flatten(L, order=LAYERS):
    out = None
    for k in order:
        out = L[k].copy() if out is None else Image.alpha_composite(out, L[k])
    return out
