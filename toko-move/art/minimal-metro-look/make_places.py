#!/usr/bin/env python3
"""More places (toko-move v3.10; owner 2026-11-06: "We need to add lots more art and scenarios in these styles").

Act 1 drew a landmark behind the stop at twelve key stations; the other eleven places the network names stood in front
of the same paper blocks. Every place has one now, in make_act1.py's own register (flat iso boxes, domes and roofs, three
values a face, no outline, no text) and placed by its own `placed()`, so they sit in the same sky:

  katajanokka      Uspenski: red brick, green onion domes, gold
  sornainen        the Suvilahti gasometer, brick in a steel cage
  kruunuvuori      the Crown Bridge's pylon over the water, a tram on the deck
  kapyla           Puu-Käpylä: wooden houses in ochre, red and green, and garden trees
  arabia           the factory and its chimney
  lansiterminaali  the West Harbour terminal (the ferry is Olympiaterminaali's bobbing layer)
  eira             a Jugend villa with its turret
  ruoholahti       the Cable Factory and the canal
  messukeskus      the expo hall and its flags
  meilahti         the hospital towers
  laajasalo        pines on the rock, and a block among them

And the weather lies ON the stop now, not only in front of it: `05b-wx-snow` (snow on the shelter roof, the bench,
the ticket machine and the bin, drifts on the platform) and `05b-wx-rain` (puddles). Same camera as
illus.scene_disruption, so it lands exactly on what it covers.

act1.json is UPDATED, never rewritten: make_act1.py's trams and landmarks and make_actors.py's cast stay as they are.
Run from this folder:  python3 make_places.py ../../scenes
"""
import math, os, sys, json
from PIL import Image, ImageDraw
import illus as I
from illus import C, Frame, iso_cam, hx, mix, SS
from make_act1 import ANCHOR, placed, dome, pyramid, windows, save

OUT = sys.argv[1] if len(sys.argv) > 1 else '../../scenes'
FMTS = {'916': (1080, 1920), '169': (1920, 1080)}
WATER = ('#c9e4e8', '#b2d4d9', '#b2d4d9')

def cylinder(d, iso, fr, X, Y, z0, z1, R, body, top, lattice=None, bands=()):
    k = fr.u * iso.s; cx, cb = iso.p(X, Y, z0); _, ct = iso.p(X, Y, z1); rx, ry = 1.2247 * R * k, .7071 * R * k
    d.ellipse([cx - rx, cb - ry, cx + rx, cb + ry], fill=hx(body)); d.rectangle([cx - rx, ct, cx + rx, cb], fill=hx(body))
    for (za, zb, col) in bands:
        _, ya = iso.p(X, Y, za); _, yb = iso.p(X, Y, zb); d.rectangle([cx - rx, yb, cx + rx, ya], fill=hx(col)); d.chord([cx - rx, ya - ry, cx + rx, ya + ry], 0, 180, fill=hx(col))
    if lattice:
        for i in range(1, 12):
            t = math.pi * i / 12; x = cx - rx * math.cos(t); dy = ry * math.sin(t)
            d.line([(x, ct + dy), (x, cb + dy)], fill=hx(lattice), width=max(1, int(3 * k)))
    d.ellipse([cx - rx, ct - ry, cx + rx, ct + ry], fill=hx(top))
    return cx, ct

def gable(d, iso, X0, X1, Y0, Y1, Z, h, near, far, end):
    """A pitched roof, ridge along X: the far slope, the end gable, the near slope."""
    Ym = (Y0 + Y1) / 2
    iso.poly(d, [(X0, Y0, Z), (X1, Y0, Z), (X1, Ym, Z + h), (X0, Ym, Z + h)], far)
    iso.poly(d, [(X1, Y0, Z), (X1, Y1, Z), (X1, Ym, Z + h)], end)
    iso.poly(d, [(X0, Y1, Z), (X1, Y1, Z), (X1, Ym, Z + h), (X0, Ym, Z + h)], near)

def tree(d, iso, fr, X, Y, h=120, r=46, col='#9fb89a'):
    cx, cy = iso.p(X, Y, 0); k = fr.u * iso.s
    d.rectangle([cx - 4 * k, cy - h * .55 * k, cx + 4 * k, cy], fill=hx('#8a7a5f'))
    d.ellipse([cx - r * k, cy - h * k - r * .8 * k, cx + r * k, cy - h * k + r * .8 * k], fill=hx(col))

def pine(d, iso, fr, X, Y, h=200, col='#4f7a5a'):
    cx, cy = iso.p(X, Y, 0); k = fr.u * iso.s
    d.rectangle([cx - 4 * k, cy - 30 * k, cx + 4 * k, cy], fill=hx('#6b4a33'))
    for i in range(3):
        w = (46 - i * 11) * k; y0 = cy - (30 + i * h * .25) * k; y1 = y0 - h * .42 * k
        d.polygon([(cx - w, y0), (cx + w, y0), (cx, y1)], fill=hx(mix(col, '#000000', .08 * i)))

def land(fr, iso, key, fmt):
    im = fr.new(); d = ImageDraw.Draw(im); ax, ay = ANCHOR[fmt]; extra = {}; k = fr.u * iso.s
    B = lambda X0, X1, Y0_, Y1_, Z0, Z1, top, side, end: iso.box(d, ax + X0, ax + X1, ay + Y0_, ay + Y1_, Z0, Z1, top, side, end)
    P = lambda X, Y, Z=0: (ax + X, ay + Y, Z)
    if key == 'katajanokka':                                        # Uspenski: brick, onion domes, gold
        BR = ('#b0533f', '#97432f', '#83392a')
        B(-220, 160, -150, 0, 0, 210, *BR); B(-90, 30, -110, -40, 210, 300, *BR)
        for xx in range(-200, 150, 46): iso.quadY(d, ay + 0, ax + xx, ax + xx + 18, 40, 150, '#5e2a20')
        for X, Y, z, R, H in ((-30, -75, 300, 42, 74), (-190, -130, 210, 20, 40), (130, -130, 210, 20, 40), (-190, -20, 210, 20, 40), (130, -20, 210, 20, 40)):
            tx, ty = dome(d, iso, fr, ax + X, ay + Y, z, R, H, '#3f7a5a', '#2f5f45')
            d.polygon([(tx - 6 * k, ty + 4 * k), (tx + 6 * k, ty + 4 * k), (tx, ty - 26 * k)], fill=hx('#3f7a5a'))
            d.rectangle([tx - 2 * k, ty - 50 * k, tx + 2 * k, ty - 22 * k], fill=hx('#d8b24a')); d.rectangle([tx - 8 * k, ty - 42 * k, tx + 8 * k, ty - 38 * k], fill=hx('#d8b24a'))
    elif key == 'sornainen':                                        # the Suvilahti gasometer
        B(120, 320, -120, 0, 0, 120, '#c87a5c', '#b0634a', '#9b5440'); windows(d, iso, ax + 120, ax + 320, ay + 0, 20, 110, '#e9d9b8', step=40, w=16, h=30)
        cylinder(d, iso, fr, ax - 80, ay - 70, 0, 330, 150, '#a85a39', '#8a4a30', lattice='#69777a', bands=((150, 158, '#69777a'), (300, 308, '#69777a')))
    elif key == 'kruunuvuori':                                      # the Crown Bridge: water, the deck, the pylon, a tram
        B(-340, 320, -100, 70, 0, 6, *WATER)
        B(-340, 320, -40, 0, 70, 84, '#efece3', '#d8d2c2', '#cfc9b9')
        for X in (-260, -100, 160): B(X, X + 18, -30, -10, 0, 70, '#d8d2c2', '#c4bca7', '#b3ab97')
        apex = iso.p(*P(20, -20, 560))
        for Y in (-60, 20): iso.poly(d, [P(4, Y, 84), P(28, Y, 84), P(26, -20, 560), P(14, -20, 560)], '#fbfaf5')
        for X in (-300, -220, -140, -60, 100, 180, 260): d.line([apex, iso.p(*P(X, -20, 84))], fill=hx('#9aa5aa'), width=max(1, int(2 * k)))
        B(-200, -110, -34, -6, 84, 124, '#e9f5ec', '#2f7a4f', '#245f3d'); iso.quadY(d, ay - 6, ax - 196, ax - 114, 100, 116, '#2b4252')
    elif key == 'kapyla':                                           # Puu-Käpylä
        for X, Y, col in ((-300, -120, '#d9a441'), (-80, -150, '#b5533c'), (140, -110, '#8aa27a')):
            side, end = mix(col, '#000000', .12), mix(col, '#000000', .22)
            B(X, X + 160, Y, Y + 100, 0, 110, col, side, end); gable(d, iso, ax + X - 6, ax + X + 166, ay + Y - 6, ay + Y + 106, 110, 70, '#7d5a3a', '#5e4430', end)
            for xx in (X + 24, X + 92): iso.quadY(d, ay + Y + 100, ax + xx, ax + xx + 34, 40, 84, '#fffdf7'); iso.quadY(d, ay + Y + 100, ax + xx + 5, ax + xx + 29, 45, 79, '#6f8a9a')
        for X, Y in ((-120, -40), (100, -30), (280, -60)): tree(d, iso, fr, ax + X, ay + Y)
    elif key == 'arabia':                                           # the factory and its chimney
        B(-320, 160, -140, 0, 0, 140, '#c87a5c', '#b0634a', '#9b5440')
        for X in range(-320, 160, 80): pyramid(d, iso, ax + X, ax + X + 80, ay - 140, ay, 140, 190, '#9aa5aa', '#7d8a8f')
        windows(d, iso, ax - 310, ax + 150, ay + 0, 24, 120, '#e9d9b8', step=44, w=18, h=34)
        cylinder(d, iso, fr, ax + 220, ay - 70, 0, 600, 30, '#b5623f', '#7a3d28', bands=((520, 540, '#fffdf7'),))
    elif key == 'lansiterminaali':                                  # the West Harbour terminal (the ferry is the bobbing layer)
        B(-320, 300, -40, 60, 0, 6, *WATER)
        B(-300, 120, -180, -50, 0, 120, '#fbfaf5', '#e8e4d8', '#dcd7c9'); iso.quadY(d, ay - 50, ax - 290, ax + 110, 24, 100, '#9fc3cc')
        B(-200, 20, -170, -60, 120, 150, '#e2ddcf', '#cfc9b9', '#c4bca7')
        for X in (150, 220): B(X, X + 16, -170, -150, 0, 260, '#e2683c', '#c45730', '#b04d2a')
        extra['ferry'] = True
    elif key == 'eira':                                             # a Jugend villa, its turret and the tree
        col = '#e9c6b4'; side, end = mix(col, '#000000', .1), mix(col, '#000000', .2)
        B(-200, 80, -140, 0, 0, 200, col, side, end); gable(d, iso, ax - 206, ax + 86, ay - 146, ay + 6, 200, 110, '#7d8487', '#646b6e', end)
        tx, ty = cylinder(d, iso, fr, ax + 120, ay - 30, 0, 260, 48, col, col)
        d.polygon([(tx - 62 * k, ty), (tx + 62 * k, ty), (tx, ty - 130 * k)], fill=hx('#646b6e'))
        for z in (40, 120):
            for xx in (-170, -100, -30): iso.quadY(d, ay + 0, ax + xx, ax + xx + 34, z, z + 54, '#fffdf7'); iso.quadY(d, ay + 0, ax + xx + 5, ax + xx + 29, z + 5, z + 49, '#6f8a9a')
        tree(d, iso, fr, ax + 260, ay - 40, 150, 60)
    elif key == 'ruoholahti':                                       # the Cable Factory and the canal
        B(-330, 280, 10, 60, 0, 6, *WATER)
        B(-320, 230, -170, -40, 0, 200, '#efe6d4', '#ddd2b8', '#cfc3a6'); windows(d, iso, ax - 310, ax + 220, ay - 40, 20, 190, '#7d8a8f', step=40, w=20, h=26)
        cylinder(d, iso, fr, ax + 260, ay - 130, 0, 420, 24, '#b5623f', '#7a3d28')
    elif key == 'messukeskus':                                      # the expo hall and its flags
        B(-320, 260, -170, -30, 0, 110, '#e4e6e1', '#cfd4d4', '#c3c9ca'); gable(d, iso, ax - 326, ax + 266, ay - 176, ay - 24, 110, 46, '#9fb0b6', '#8aa0a8', '#c3c9ca')
        B(-120, 40, -30, 10, 0, 90, '#cfe3e8', '#9fc3cc', '#8fb6c0')
        for i, X in enumerate((-260, -200, -140, 120, 180, 240)):
            base = iso.p(*P(X, 20, 0)); topp = iso.p(*P(X, 20, 260)); d.line([base, topp], fill=hx('#9aa5aa'), width=max(1, int(3 * k)))
            col = ('#33b2d2', '#ffcc00', '#e2683c', '#2c9c77', '#3e65a8', '#ffcc00')[i]; d.polygon([topp, (topp[0] + 46 * k, topp[1] + 10 * k), (topp[0], topp[1] + 30 * k)], fill=hx(col))
    elif key == 'meilahti':                                         # the hospital towers
        for X, h in ((-220, 520), (20, 430)):
            B(X, X + 140, -150, -30, 0, h, '#fbfaf5', '#e8e4d8', '#dcd7c9')
            for z in range(30, h - 20, 40): iso.quadY(d, ay - 30, ax + X + 10, ax + X + 130, z, z + 14, '#b9d3d9')
        tree(d, iso, fr, ax + 230, ay - 40); tree(d, iso, fr, ax - 300, ay - 20, 100, 40)
    elif key == 'laajasalo':                                        # pines on the rock, a block among them
        B(-330, 300, 20, 80, 0, 6, *WATER)
        B(-300, -60, -120, 10, 0, 50, '#b8bdb9', '#9aa19c', '#8a918c'); B(-200, -100, -90, -20, 50, 90, '#c4c9c5', '#a7ada9', '#979e99')
        B(60, 260, -160, -50, 0, 220, '#efece3', '#e2ddcf', '#d8d2c2'); windows(d, iso, ax + 60, ax + 260, ay - 50, 20, 210, '#c9d6da', step=40, w=18, h=24)
        for X, Y, h in ((-260, -40, 230), (-170, -100, 280), (-90, -30, 210), (20, -20, 190), (290, -60, 240)): pine(d, iso, fr, ax + X, ay + Y, h)
    return im, extra

PLACES = ['katajanokka', 'sornainen', 'kruunuvuori', 'kapyla', 'arabia', 'lansiterminaali', 'eira', 'ruoholahti', 'messukeskus', 'meilahti', 'laajasalo']

# ── the weather on the stop (the same coordinates as illus.scene_disruption) ──────────────────────────────────────
SX0, SX1, SY0, SY1 = 200, 450, 150, 215
SNOW, SNOW_S, SNOW_E = '#ffffff', '#eef3f5', '#e3eaee'
def weather(fr, iso, kind):
    im = fr.new(); d = ImageDraw.Draw(im); k = fr.u * iso.s
    if kind == 'snow':
        iso.box(d, SX0 - 18, SX1 + 18, SY0 - 12, SY1 - 12, 308, 322, SNOW, SNOW_S, SNOW_E)                     # the shelter roof
        iso.box(d, SX0 + 30, SX1 - 30, SY0 + 8, SY0 + 32, 60, 66, SNOW, SNOW_S, SNOW_E)                         # the bench
        iso.box(d, SX1 + 30, SX1 + 62, 176, 204, 120, 128, SNOW, SNOW_S, SNOW_E)                                # the ticket machine
        iso.box(d, -600, -576, 196, 218, 64, 70, SNOW, SNOW_S, SNOW_E)                                         # the bin
        for X0, X1 in ((-3000, -700), (-520, -260), (480, 3000)):                                               # drifts along the back of the platform
            iso.poly(d, [(X0, 214, 12), (X1, 214, 12), (X1 - 40, 230, 12), (X0, 230, 12)], hx(SNOW, 235))
        for X0, X1 in ((-3000, 3000),):                                                                          # the far side of the track, white
            iso.poly(d, [(X0, -160, 0), (X1, -160, 0), (X1, -96, 0), (X0, -96, 0)], hx(SNOW, 220))
        for X in range(-1500, 1600, 230): iso.poly(d, [(X, 84, 12), (X + 120, 84, 12), (X + 100, 98, 12), (X + 20, 98, 12)], hx(SNOW, 200))   # on the warning strip
    elif kind == 'rain':
        for X, Y, R in ((-470, 196, 70), (-250, 214, 46), (60, 204, 54), (560, 196, 64), (-860, 200, 80)):       # puddles
            cx, cy = iso.p(X, Y, 12); rx, ry = 1.2247 * R * k, .7071 * R * k * .62
            d.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=hx('#b9cdd3', 210))
            d.line([(cx - rx * .45, cy - ry * .15), (cx + rx * .25, cy - ry * .15)], fill=hx('#e8f1f3', 230), width=max(1, int(3 * k)))
            d.line([(cx - rx * .2, cy + ry * .3), (cx + rx * .45, cy + ry * .3)], fill=hx('#e8f1f3', 180), width=max(1, int(2 * k)))
        iso.poly(d, [(-3000, 98, 12), (3000, 98, 12), (3000, 108, 12), (-3000, 108, 12)], hx('#9fb5bc', 120))   # the wet edge
    return im

def main():
    path = f'{OUT}/stop/act1.json'; meta = json.load(open(path))
    for fmt, (W, H) in FMTS.items():
        fr = Frame(W, H); iso = iso_cam(fr); pt = iso.p(*ANCHOR[fmt], 0)
        for key in PLACES:
            im, extra = land(fr, iso, key, fmt); out, mv, sc = placed(fr, im, fmt, pt); save(out, f'{OUT}/stop/{fmt}/01b-land-{key}.webp', fr, True)
            meta['land'].setdefault(key, {})[fmt] = {'ferry': True} if extra.get('ferry') else {}
        for kind in ('snow', 'rain'): save(weather(fr, iso, kind), f'{OUT}/stop/{fmt}/05b-wx-{kind}.webp', fr)
        print(fmt, 'done')
    meta['wx'] = ['rain', 'snow']
    open(path, 'w').write(json.dumps(meta, indent=1))

if __name__ == '__main__': main()
