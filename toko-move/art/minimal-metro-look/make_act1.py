#!/usr/bin/env python3
"""Act 1 art for the stop scene (toko-move/ACT1.md §6–7; owner 2026-11-02: "The trams in the bible
look a bit like the latest Helsinki trams, but we have older and even older models with distinct
visual look. That and key stations should have more visual indicators").

Same camera, same flat iso and same palette as `illus.scene_disruption`, so every layer drops into
the shipped stack (toko-move/scenes/stop/<fmt>/) over 02-street:

  03-tram-<model>.webp   six models, LOOK ONLY (signed off): Artic, Nr II+, Variotram, Nr II, Nr I,
                         the museum tram. The front chip is drawn BLANK — the game writes the line's
                         number on it, and pulses a coral pause there when the line is halted.
  01b-land-<id>.webp     a landmark behind the stop for each key station, placed where both the
                         phone's 9:16 crop and the 16:9 plate keep it in view, above the shelter and
                         clear of the tram. Moving parts are their own layers (the SkyWheel turns,
                         the ferry bobs) so the game animates them in CSS.
  act1.json              where each of those lands, in frame fractions, for the game to overlay.

Text is never drawn here: the game owns every word (and translates them).
Run from this folder:  python3 make_act1.py ../../scenes   (Pillow, no fonts needed)
"""
import json, math, os, sys, subprocess, tempfile
from PIL import Image, ImageDraw
import illus as I
from illus import C, Frame, iso_cam, hx, mix, SS

OUT = sys.argv[1] if len(sys.argv) > 1 else '../../scenes'
FMTS = {'916': (1080, 1920), '169': (1920, 1080)}

# ── the trams ──────────────────────────────────────────────────────────────
# A model is a set of sections, a livery split at a height, a front, and a pantograph. The real fleet's
# silhouettes, flattened: the Artic's raked nose; the Variotram's five short modules on a low floor;
# the Valmet Nr II's two long high-floor halves with a flat face; the Nr II+ with its low middle section
# added; the Nr I older and squarer still; the museum tram one short wooden car on two axles.
GREEN, GREEN_D, CREAM, CREAM_D = '#2f7a4f', '#245f3d', '#efe6c4', '#ddd2ac'
MODELS = {
  'artic':   dict(segs=[(-1180, -840), (-826, -486), (-472, -80)], Z0=22, Z1=150, upper='#fffdf7', lower='#fffdf7', side_end='#ebe7db', roof='#dedad0',
                  band=('#2e8b57', '#1f6b42'), split=None, front='raked', panto='arm', wins=3, door=True),
  'vario':   dict(segs=[(-1180, -1010), (-1000, -800), (-790, -620), (-610, -410), (-400, -80)], Z0=14, Z1=142, upper='#f7f6ef', lower='#8cc7a2', side_end='#e4e2d8', roof='#d9d6cc',
                  band=None, split=58, front='sloped', panto='arm', wins=2, door=True, ribbon=True),
  'nr2plus': dict(segs=[(-1180, -760), (-748, -560), (-548, -80)], Z0=26, Z1=156, upper=CREAM, lower=GREEN, side_end=CREAM_D, roof='#cfc9b4',
                  band=None, split=88, front='flat', panto='arm', wins=4, door=True, lowmid=True),
  'nr2':     dict(segs=[(-1180, -640), (-628, -80)], Z0=28, Z1=156, upper=CREAM, lower=GREEN, side_end=CREAM_D, roof='#cfc9b4',
                  band=None, split=90, front='flat', panto='arm', wins=5, door=True),
  'nr1':     dict(segs=[(-1120, -620), (-608, -120)], Z0=28, Z1=150, upper='#ece0a8', lower=GREEN_D, side_end='#d8cb92', roof='#bdb59c',
                  band=None, split=92, front='flat', panto='diamond', wins=6, door=True, round=True),
  'museum':  dict(segs=[(-640, -240)], Z0=40, Z1=150, upper='#ead79c', lower='#2d5f3c', side_end='#d6c283', roof='#9b8b6a',
                  band=None, split=100, front='platform', panto='bow', wins=6, door=False, wood=True),
}
Y0, Y1 = -52, 52

def tram(fr, iso, name):
    m = MODELS[name]; im = fr.new(); d = ImageDraw.Draw(im); segs = m['segs']; Z0, Z1 = m['Z0'], m['Z1']
    iso.poly(d, [(segs[0][0] + 40, Y1 + 10, 0), (segs[-1][1] + 40, Y1 + 10, 0), (segs[-1][1] + 120, Y1 + 70, 0), (segs[0][0] + 120, Y1 + 70, 0)], '#e3e1d8')   # cast shadow
    if m.get('wood'):                                                                                  # two axles, and the wheels show
        for X in (segs[0][0] + 80, segs[0][1] - 80):
            cx, cy = iso.p(X, Y1 + 2, 18); r = 15 * fr.u * iso.s; d.ellipse([cx - r, cy - r * .9, cx + r, cy + r * .9], fill=hx('#2c363d'))
    for i in range(len(segs) - 1):                                                                     # gangways
        a, b = segs[i][1], segs[i + 1][0]; iso.box(d, a - 4, b + 4, Y0 + 10, Y1 - 10, Z0 + 10, Z1 - 6, '#2c363d', '#15262b', '#15262b')
    win, win_e = '#2b4252', '#22384a'
    for i, (X0, X1) in enumerate(segs):
        last = i == len(segs) - 1
        z0 = Z0 - (10 if m.get('lowmid') and i == 1 else 0)
        nose = 34 if (last and m['front'] == 'raked') else 14 if (last and m['front'] == 'sloped') else 0; zm = 92 if m['front'] == 'raked' else 112
        side = [(X0, Y1, z0), (X1, Y1, z0), (X1, Y1, zm), (X1 - nose, Y1, Z1), (X0, Y1, Z1)] if (last and nose) else [(X0, Y1, z0), (X1, Y1, z0), (X1, Y1, Z1), (X0, Y1, Z1)]
        iso.poly(d, side, m['upper'])
        if m['split']: iso.quadY(d, Y1, X0, X1, z0, m['split'], m['lower'])                            # the two-tone livery
        if m.get('wood'):                                                                              # varnished panels and trim
            for xx in range(int(X0) + 30, int(X1) - 20, 60): iso.quadY(d, Y1, xx, xx + 3, z0 + 4, m['split'] - 4, '#1f4a2d')
            iso.quadY(d, Y1, X0, X1, m['split'], m['split'] + 5, '#7a4a2a'); iso.quadY(d, Y1, X0, X1, Z1 - 6, Z1, '#7a4a2a')
        iso.quadY(d, Y1, X0, X1, z0, z0 + 12, '#2c363d')                                                # skirt
        if m['band']: iso.quadY(d, Y1, X0, X1, z0 + 24, z0 + 42, m['band'][0]); iso.quadY(d, Y1, X0, X1, z0 + 42, z0 + 46, m['band'][1])
        n = m['wins'] if not (m.get('lowmid') and i == 1) else 2; span = (X1 - nose - 18) - (X0 + 18)
        wz0 = (m['split'] + 10) if m['split'] else z0 + 58; wz1 = Z1 - (22 if m.get('round') else 16)
        if m.get('ribbon'): iso.quadY(d, Y1, X0 + 10, X1 - nose - 10, wz0 + 6, wz1, win)               # the Variotram's one long band of glass
        for k in range(n):                                                                             # windows, and a door per section
            a = X0 + 18 + k * span / n; b = a + span / n - (12 if n > 3 else 16)
            if m['door'] and k == (1 if n > 2 else 0) and not (m.get('lowmid') and i == 1 and k != 0):
                iso.quadY(d, Y1, a + 4, b - 4, z0 + 2, Z1 - 14, '#d3cfc3' if not m['split'] else mix(m['lower'], '#000000', .25))
                iso.quadY(d, Y1, a + 10, (a + b) / 2 - 3, wz0 + 4, wz1 - 6, win); iso.quadY(d, Y1, (a + b) / 2 + 3, b - 10, wz0 + 4, wz1 - 6, win)
            else: iso.quadY(d, Y1, a, b, wz0, wz1, win)
        # roof (+ the front)
        if last and nose:
            iso.poly(d, [(X0, Y0, Z1), (X1 - nose, Y0, Z1), (X1 - nose, Y1, Z1), (X0, Y1, Z1)], m['roof'])
            iso.poly(d, [(X1, Y0, z0), (X1, Y1, z0), (X1, Y1, zm), (X1, Y0, zm)], m['side_end'])
            iso.poly(d, [(X1, Y0, zm), (X1, Y1, zm), (X1 - nose, Y1, Z1), (X1 - nose, Y0, Z1)], '#1f3442')     # windscreen
            if m['band']: iso.quadX(d, X1, Y0, Y1, z0 + 24, z0 + 42, m['band'][0])
        else:
            iso.poly(d, [(X0, Y0, Z1), (X1, Y0, Z1), (X1, Y1, Z1), (X0, Y1, Z1)], m['roof'])
            if m.get('round'): iso.quadY(d, Y1, X0, X1, Z1 - 8, Z1, mix(m['roof'], '#000000', .12))           # the older, rounder eave
            if last:
                iso.poly(d, [(X1, Y0, z0), (X1, Y1, z0), (X1, Y1, Z1), (X1, Y0, Z1)], m['side_end'])
                if m['split']: iso.quadX(d, X1, Y0, Y1, z0, m['split'], mix(m['lower'], '#000000', .1))
                if m['front'] == 'platform':                                                           # the end: three small panes, a dash, a lamp, a step
                    for yy in (Y0 + 6, -12, Y1 - 30): iso.quadX(d, X1, yy, yy + 24, m['split'] + 10, Z1 - 24, '#1f3442')
                    iso.quadX(d, X1, Y0, Y1, m['split'], m['split'] + 5, '#7a4a2a')
                    iso.box(d, X1, X1 + 14, Y0 + 14, Y1 - 14, z0 - 10, z0 - 4, '#7a4a2a', '#5c3820', '#5c3820')
                    cx, cy = iso.p(X1, 0, m['split'] - 22); r = 8 * fr.u * iso.s; d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=hx('#fff3c4'))
                else:
                    iso.quadX(d, X1, Y0 + 8, Y1 - 8, (m['split'] or z0 + 58) + 10, Z1 - 30, '#1f3442')     # the flat face's big windscreen
                    iso.quadX(d, X1, Y0 + 10, Y1 - 10, Z1 - 26, Z1 - 8, '#15262b')                       # the destination box (chip goes here)
        if not m.get('wood'): iso.box(d, X0 + 90, X0 + min(200, (X1 - X0) * .45), Y0 + 20, Y1 - 20, Z1, Z1 + 12, '#eceae2', '#cfcbbf', '#d8d4c8')   # roof unit
        else: iso.box(d, X0 + 40, X1 - 40, Y0 + 26, Y1 - 26, Z1, Z1 + 14, '#b3a27e', '#8f7f5e', '#9b8b6a')       # the clerestory
    if not m.get('wood') and m['front'] != 'platform':                                                 # headlights on the face
        X1 = segs[-1][1]
        for yy in (Y0 + 14, Y1 - 22): iso.quadX(d, X1, yy, yy + 8, Z0 + 46, Z0 + 54, '#fff3c4')
    # the current collector, up to the wire (z 238)
    ps = segs[len(segs) // 2]; mX = (ps[0] + ps[1]) / 2; w = max(2, int(5 * fr.u)); ink = hx('#15262b')
    if m['panto'] == 'arm':
        d.line([iso.p(mX, 0, Z1 + 12), iso.p(mX + 50, 0, Z1 + 58), iso.p(mX + 10, 0, 238)], fill=ink, width=w, joint='curve')
        d.line([iso.p(mX - 16, 0, 238), iso.p(mX + 36, 0, 238)], fill=ink, width=w)
    elif m['panto'] == 'diamond':
        pts = [iso.p(mX - 34, 0, Z1 + 12), iso.p(mX, 0, 200), iso.p(mX + 34, 0, Z1 + 12)]
        d.line(pts, fill=ink, width=w); d.line([iso.p(mX - 34, 0, 238 - 2), iso.p(mX, 0, 200), iso.p(mX + 34, 0, 236)], fill=ink, width=w)
        d.line([iso.p(mX - 22, 0, 238), iso.p(mX + 22, 0, 238)], fill=ink, width=w)
    else:                                                                                              # the museum tram's bow
        d.line([iso.p(mX - 30, 0, Z1 + 14), iso.p(mX - 6, 0, 238), iso.p(mX + 18, 0, 238), iso.p(mX + 30, 0, Z1 + 14)], fill=ink, width=w, joint='curve')
    iso.box(d, mX - 22, mX + 22, -16, 16, Z1 + 12, Z1 + 18, '#9aa5aa', '#69777a', '#7d8a8f')
    # where the chip goes: the raked front's display, or the destination box
    X1 = segs[-1][1]
    if m['front'] in ('raked', 'sloped'): cx, cy = iso.p(X1 - 14, 0, Z1 - 30); cw, ch = 112, 40
    elif m['front'] == 'platform': cx, cy = iso.p(X1, 0, Z1 + 8); cw, ch = 64, 24
    else: cx, cy = iso.p(X1, 0, Z1 - 17); cw, ch = 96, 32
    u = fr.u * iso.s
    if m['front'] in ('raked', 'sloped'): I.rr(d, (cx - cw / 2 * u, cy - ch / 2 * u, cx + cw / 2 * u, cy + ch / 2 * u), 7 * u, hx('#15262b'))
    if m['front'] == 'platform': I.rr(d, (cx - cw / 2 * u, cy - ch / 2 * u, cx + cw / 2 * u, cy + ch / 2 * u), 4 * u, hx('#15262b'))
    chip = (cx / SS, cy / SS, cw * u / SS, ch * u / SS)
    return im, chip

# ── the landmarks ──────────────────────────────────────────────────────────
# Flat iso solids in the paper palette, each with ONE muted accent of its own so it is that place and
# not another block: granite and a clock for the station, white and green domes for the cathedral,
# brick for the market hall, wood for the chapel. Placed at a per-format ground point (see ANCHOR).
ANCHOR = {'916': (-150, -290), '169': (55, -290)}
# where the landmark's ground point goes, in output px, and how big: the free sky between the HUD,
# the corner map and the shelter — measured on a phone's 9:16 crop and a phone held sideways
TARGET = {'916': ((480, 800), .70), '169': ((250, 610), .62)}
def placed(fr, im, fmt, pt):
    (tx, ty), sc = TARGET[fmt]; px, py = pt[0] / SS, pt[1] / SS
    small = fr.down(im); W, H = small.size
    s2 = small.resize((max(1, int(W * sc)), max(1, int(H * sc))), Image.LANCZOS); out = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    out.paste(s2, (int(round(tx - px * sc)), int(round(ty - py * sc))), s2)
    return out, (lambda x, y: (tx + (x - px) * sc, ty + (y - py) * sc)), sc

def dome(d, iso, fr, X, Y, Z, R, H, col, rim=None):
    cx, cy = iso.p(X, Y, Z); k = fr.u * iso.s
    rx, ry = 1.2247 * R * k, .7071 * R * k
    d.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=hx(rim or mix(col, '#000000', .18)))
    d.chord([cx - rx, cy - H * k, cx + rx, cy + H * k], 180, 360, fill=hx(col))
    return cx, cy - H * k

def pyramid(d, iso, X0, X1, Y0_, Y1_, Z, Zt, lit, dark):
    ax, ay = (X0 + X1) / 2, (Y0_ + Y1_) / 2
    iso.poly(d, [(X0, Y1_, Z), (X1, Y1_, Z), (ax, ay, Zt)], lit); iso.poly(d, [(X1, Y0_, Z), (X1, Y1_, Z), (ax, ay, Zt)], dark)

def windows(d, iso, X0, X1, Y, z0, z1, col, step=46, w=20, h=26):
    for zz in range(int(z0), int(z1) - h, step):
        for xx in range(int(X0) + 14, int(X1) - w, step): iso.quadY(d, Y, xx, xx + w, zz, zz + h, col)

def land(fr, iso, key, fmt):
    im = fr.new(); d = ImageDraw.Draw(im); ax, ay = ANCHOR[fmt]; extra = {}
    B = lambda X0, X1, Y0_, Y1_, Z0, Z1, top, side, end: iso.box(d, ax + X0, ax + X1, ay + Y0_, ay + Y1_, Z0, Z1, top, side, end)
    P = lambda X, Y, Z=0: (ax + X, ay + Y, Z)
    if key == 'rautatientori':                                       # the station: granite hall, the arch, the clock tower
        B(-260, 220, -120, 0, 0, 170, '#d9d4c4', '#c4bca7', '#b3ab97'); iso.poly(d, [P(-260, -120, 170), P(220, -120, 170), P(220, 0, 170), P(-260, 0, 170)], '#9fbdb0')
        cx, cy = iso.p(*P(-20, 0, 70)); k = fr.u * iso.s; d.chord([cx - 70 * k, cy - 80 * k, cx + 70 * k, cy + 80 * k], 180, 360, fill=hx('#2b4252'))
        iso.quadY(d, ay + 0, ax - 90, ax + 50, 0, 70, '#2b4252')
        B(140, 230, -80, 0, 0, 520, '#d9d4c4', '#c4bca7', '#b3ab97'); pyramid(d, iso, ax + 140, ax + 230, ay - 80, ay + 0, 520, 600, '#9fbdb0', '#7fa092')
        cx, cy = iso.p(*P(185, 0, 450)); r = 22 * k; d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=hx('#fffdf7')); d.line([(cx, cy), (cx, cy - r * .7)], fill=hx('#15262b'), width=max(1, int(3 * k))); d.line([(cx, cy), (cx + r * .5, cy)], fill=hx('#15262b'), width=max(1, int(3 * k)))
    elif key == 'senaatintori':                                      # the cathedral: white, a green drum and dome, four small domes, the steps
        B(-300, 260, -60, 60, 0, 30, '#ebe7db', '#dcd7c9', '#d3cdbd')
        B(-200, 160, -150, -10, 30, 260, '#fbfaf5', '#e8e4d8', '#dcd7c9')
        B(-120, 80, -150, 30, 30, 210, '#fbfaf5', '#e8e4d8', '#dcd7c9')
        for xx in range(-100, 80, 34): iso.quadY(d, ay + 30, ax + xx, ax + xx + 12, 40, 190, '#e3dfd2')
        pyramid(d, iso, ax - 120, ax + 80, ay - 20, ay + 30, 210, 250, '#f3f1ea', '#e0dccf')
        B(-60, 20, -110, -30, 260, 330, '#fbfaf5', '#e8e4d8', '#dcd7c9')
        top = dome(d, iso, fr, ax - 20, ay - 70, 330, 64, 96, '#5f9e8f')
        for X, Y in ((-180, -140), (140, -140), (-180, -20), (140, -20)): dome(d, iso, fr, ax + X, ay + Y, 260, 22, 34, '#6aa898')
        d.rectangle([top[0] - 3 * fr.u, top[1] - 26 * fr.u, top[0] + 3 * fr.u, top[1]], fill=hx('#c9a24a'))
    elif key == 'kauppatori':                                        # the SkyWheel (its own, turning layer) and the market tents
        B(-260, 260, -40, 40, 0, 6, '#c9e4e8', '#b2d4d9', '#b2d4d9')
        for i, X in enumerate((-220, -120, -20, 80)):
            col = ('#e2683c', '#33b2d2', '#ffcc00', '#5aa860')[i]
            B(X, X + 70, 40, 110, 0, 50, '#fffdf7', '#efece3', '#e2ddcf'); pyramid(d, iso, ax + X, ax + X + 70, ay + 40, ay + 110, 50, 86, col, mix(col, '#000000', .2))
        hub = iso.p(*P(140, -60, 330)); k = fr.u * iso.s; R = 230 * k
        for sx in (-1, 1): d.line([iso.p(*P(140 + sx * 80, -60, 0)), hub], fill=hx('#9aa5aa'), width=max(2, int(9 * k)))
        wh = fr.new(); w2 = ImageDraw.Draw(wh); lw = max(2, int(6 * k))
        w2.ellipse([hub[0] - R, hub[1] - R, hub[0] + R, hub[1] + R], outline=hx('#e9edef'), width=lw)
        for a in range(0, 360, 20):
            t = math.radians(a); w2.line([hub, (hub[0] + R * math.cos(t), hub[1] + R * math.sin(t))], fill=hx('#d5dcdf'), width=max(1, int(2 * k)))
        for a in range(0, 360, 30):
            t = math.radians(a); gx, gy = hub[0] + R * math.cos(t), hub[1] + R * math.sin(t); g = 16 * k
            w2.ellipse([gx - g, gy - g, gx + g, gy + g], fill=hx('#33b2d2' if a % 90 else '#e2683c'), outline=hx('#fffdf7'), width=max(1, int(2 * k)))
        w2.ellipse([hub[0] - 14 * k, hub[1] - 14 * k, hub[0] + 14 * k, hub[1] + 14 * k], fill=hx('#69777a'))
        extra['wheel'] = (wh, (hub[0] / SS, hub[1] / SS, (R + 16 * k) / SS))
    elif key == 'kamppi':                                            # the Chapel of Silence: a wooden bowl
        k = fr.u * iso.s
        for i in range(14):
            z = 10 + i * 22; R = 70 + i * 6.5; cx, cy = iso.p(*P(0, -60, z))
            col = ('#c08a55', '#a8743f')[i % 2]; rx, ry = 1.2247 * R * k, .7071 * R * k
            d.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=hx(col))
        cx, cy = iso.p(*P(0, -60, 10 + 14 * 22)); R = 70 + 14 * 6.5; d.ellipse([cx - 1.2247 * R * k, cy - .7071 * R * k, cx + 1.2247 * R * k, cy + .7071 * R * k], fill=hx('#d9b07a'))
        B(160, 320, -120, 0, 0, 120, '#efece3', '#e2ddcf', '#d8d2c2'); windows(d, iso, ax + 160, ax + 320, ay + 0, 20, 110, '#c9d6da')
    elif key == 'kallionkirkko':                                     # Kallio church: a granite nave and the tall tower
        B(-260, 60, -100, 20, 0, 170, '#dcdad3', '#c8c5bc', '#b8b5ab'); pyramid(d, iso, ax - 260, ax + 60, ay - 100, ay + 20, 170, 240, '#7d8487', '#646b6e')
        B(60, 150, -80, 10, 0, 560, '#e1dfd8', '#cbc8bf', '#bab7ad')
        for z in (380, 450): iso.quadY(d, ay + 10, ax + 84, ax + 126, z, z + 46, '#5b666b')
        pyramid(d, iso, ax + 60, ax + 150, ay - 80, ay + 10, 560, 700, '#7d8487', '#646b6e')
    elif key == 'hakaniemi':                                         # the market hall: brick, long, two little towers
        B(-300, 260, -120, 0, 0, 150, '#c87a5c', '#b0634a', '#9b5440'); iso.poly(d, [P(-300, -120, 150), P(260, -120, 150), P(260, 0, 150), P(-300, 0, 150)], '#7d8487')
        for xx in range(-270, 240, 52):
            cx, cy = iso.p(*P(xx + 18, 0, 70)); k = fr.u * iso.s; d.chord([cx - 16 * k, cy - 30 * k, cx + 16 * k, cy + 30 * k], 180, 360, fill=hx('#e9d9b8')); iso.quadY(d, ay + 0, ax + xx + 4, ax + xx + 32, 30, 70, '#e9d9b8')
        for X in (-300, 200): B(X, X + 60, -90, 0, 150, 240, '#c87a5c', '#b0634a', '#9b5440'); pyramid(d, iso, ax + X, ax + X + 60, ay - 90, ay, 240, 290, '#7d8487', '#646b6e')
    elif key == 'ooppera':                                           # the opera house: white stacked blocks and the glass foyer
        B(-280, 240, -160, 0, 0, 120, '#fbfaf5', '#e8e4d8', '#dcd7c9'); iso.quadY(d, ay + 0, ax - 260, ax + 220, 20, 100, '#b9d3d9')
        B(-180, 120, -160, -40, 120, 300, '#fbfaf5', '#e8e4d8', '#dcd7c9'); B(-80, 40, -160, -80, 300, 360, '#f3f1ea', '#e0dccf', '#d6d1c3')
    elif key == 'lasipalatsi':                                       # Amos Rex: domes with portholes, and the chimney
        k = fr.u * iso.s
        for X, Y, R in ((-180, 40, 70), (-20, 0, 90), (130, 60, 60)):
            cx, cy = dome(d, iso, fr, ax + X, ay + Y, 0, R, R * .55, '#ebe7db', '#d8d2c2'); r = R * .28 * k
            d.ellipse([cx - r * 1.6, cy + r * .3, cx + r * 1.6, cy + r * 1.7], fill=hx('#2b4252'))
        B(180, 230, -120, -70, 0, 520, '#fbfaf5', '#e8e4d8', '#dcd7c9')
        cx, cy = iso.p(*P(205, -95, 520)); d.ellipse([cx - 34 * k, cy - 20 * k, cx + 34 * k, cy + 20 * k], fill=hx('#fbfaf5'), outline=hx('#c4bca7'), width=max(1, int(3 * k)))
        B(-300, -40, -160, -60, 0, 110, '#efece3', '#e2ddcf', '#d8d2c2'); iso.quadY(d, ay - 60, ax - 290, ax - 50, 20, 90, '#b9d3d9')
    elif key == 'olympiaterminaali':                                 # the ferry (its own, bobbing layer) at the quay
        B(-320, 300, -40, 60, 0, 6, '#c9e4e8', '#b2d4d9', '#b2d4d9')
        sh = fr.new(); s2 = ImageDraw.Draw(sh)
        iso.box(s2, ax - 300, ax + 280, ay - 160, ay - 40, 0, 90, '#fffdf7', '#2b4252', '#22384a')
        iso.box(s2, ax - 240, ax + 200, ay - 150, ay - 50, 90, 170, '#fffdf7', '#efece3', '#e2ddcf')
        windows(s2, iso, ax - 230, ax + 190, ay - 50, 100, 170, '#2b4252', step=34, w=18, h=16)
        iso.box(s2, ax - 160, ax + 80, ay - 140, ay - 60, 170, 230, '#fffdf7', '#efece3', '#e2ddcf')
        for X in (-100, 10): iso.box(s2, ax + X, ax + X + 50, ay - 120, ay - 80, 230, 320, '#e2683c', '#c45730', '#b04d2a')
        extra['ferry'] = (sh, None)
    elif key == 'hietalahti':                                        # the shipyard: two gantry cranes and a hull
        B(-320, 280, -180, -60, 0, 80, '#7d8a8f', '#5d6a70', '#53606a')
        for X, col in ((-240, '#ffcc00'), (120, '#33b2d2')):
            for Y in (-200, -40):
                B(X, X + 24, Y, Y + 24, 0, 480, col, mix(col, '#000000', .2), mix(col, '#000000', .3))
            B(X - 20, X + 44, -220, 0, 480, 520, col, mix(col, '#000000', .2), mix(col, '#000000', .3))
    elif key == 'kalasatama':                                        # the towers
        for X, Y, h, col in ((-220, -140, 520, '#e8e4d8'), (-40, -120, 640, '#dcd7c9'), (140, -160, 460, '#efece3')):
            B(X, X + 110, Y, Y + 110, 0, h, col, mix(col, '#000000', .1), mix(col, '#000000', .18)); windows(d, iso, ax + X, ax + X + 110, ay + Y + 110, 40, h - 20, '#c9d6da', step=40, w=16, h=20)
        B(-300, 300, -20, 80, 0, 90, '#efece3', '#e2ddcf', '#d8d2c2')
    elif key == 'pasila':                                            # Tripla and the towers over the tracks
        B(-300, 260, -80, 40, 0, 140, '#d8d2c2', '#c4bca7', '#b3ab97'); iso.quadY(d, ay + 40, ax - 280, ax + 240, 30, 120, '#b9d3d9')
        for X, h in ((-200, 520), (40, 600)): B(X, X + 110, -200, -90, 0, h, '#2b4252', '#22384a', '#1c3140'); windows(d, iso, ax + X, ax + X + 110, ay - 90, 40, h - 20, '#4a6476', step=36, w=18, h=20)
    return im, extra

LANDMARKS = ['rautatientori', 'senaatintori', 'kauppatori', 'kamppi', 'kallionkirkko', 'hakaniemi', 'ooppera', 'lasipalatsi', 'olympiaterminaali', 'hietalahti', 'kalasatama', 'pasila']

def save(im, path, fr, already=False):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    small = im if already else fr.down(im)
    with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as t: small.save(t.name)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', t.name, '-c:v', 'libwebp', '-quality', '82', '-pix_fmt', 'yuva420p', path], check=True)
    os.unlink(t.name)

def main():
    meta = {'trams': {}, 'land': {}, 'axis': {}}
    for fmt, (W, H) in FMTS.items():
        fr = Frame(W, H); iso = iso_cam(fr); f = lambda x, y, w=0, h=0: [round(x / W, 4), round(y / H, 4), round(w / W, 4), round(h / H, 4)]
        a, b = iso.p(0, 0, 0), iso.p(1, 0, 0); L = math.hypot(b[0] - a[0], b[1] - a[1])
        meta['axis'][fmt] = [round((b[0] - a[0]) / L, 4), round((b[1] - a[1]) / L, 4)]      # the direction a tram drives (+X), on screen
        for name in MODELS:
            im, chip = tram(fr, iso, name); save(im, f'{OUT}/stop/{fmt}/03-tram-{name}.webp', fr); meta['trams'].setdefault(name, {})[fmt] = f(*chip)
        pt = iso.p(*ANCHOR[fmt], 0)
        for key in LANDMARKS:
            im, extra = land(fr, iso, key, fmt); out, mv, sc = placed(fr, im, fmt, pt); save(out, f'{OUT}/stop/{fmt}/01b-land-{key}.webp', fr, True); meta['land'].setdefault(key, {})[fmt] = {}
            if 'wheel' in extra:
                wh, (hx_, hy_, r) = extra['wheel']; o2, _, _ = placed(fr, wh, fmt, pt); save(o2, f'{OUT}/stop/{fmt}/01c-wheel.webp', fr, True)
                X, Y = mv(hx_, hy_); meta['land'][key][fmt]['wheel'] = f(X, Y, r * sc, r * sc)
            if 'ferry' in extra: o2, _, _ = placed(fr, extra['ferry'][0], fmt, pt); save(o2, f'{OUT}/stop/{fmt}/01c-ferry.webp', fr, True); meta['land'][key][fmt]['ferry'] = True
        print(fmt, 'done')
    with open(f'{OUT}/stop/act1.json', 'w') as fh: json.dump(meta, fh, indent=1)

if __name__ == '__main__': main()
