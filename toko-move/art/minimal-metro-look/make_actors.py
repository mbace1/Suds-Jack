#!/usr/bin/env python3
"""Scenarios in the scene (toko-move v3.9; owner 2026-11-06: "We need to add lots more art and scenarios in these styles").

A story card played at the stop used to be words over the same stop. Now its subject stands in it: the gull on the
parcel, the lady at the kerb, the tourist with Stockholm's map. Same camera, same flat iso, same people as
`illus.scene_disruption`, so every actor drops into the shipped stack (toko-move/scenes/stop/<fmt>/) on top of the
courier:

  07-actor-<card>.webp   one full-frame transparent layer per card and format. The game lays it over the scene when
                         that card is dealt at the stop and takes it away when the card is answered.

The rules the people already keep, kept: flat fills, no gradients, featureless faces (an ear and a nose bump), exactly
ONE Toko face in cyan — the courier's. The other courier wears the same face in INK on WHITE (CARDS.md: "drawn in white
with an ink ring, never cyan"). Text is never drawn here, and no character from anybody else's book: the Moomin card's
tourist carries a paper bag and a fan of notes, not a troll.

Where they stand: on the platform between the courier and the shelter, nearer the camera than the courier, which in
9:16 is just above the card and in 16:9 just left of it — `SPOT` per format, checked against the card's box by
`contact()` (the sheet draws the card's rectangle so a clash is visible).

Run from this folder:  python3 make_actors.py ../../scenes [--sheet out.png]
"""
import math, os, sys, json, subprocess, tempfile
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import illus as I
import bible_render as B
from illus import C, Frame, Pen, person, iso_cam, hx, mix, shade, SKIN, HAIR, SS, COURIER

OUT = sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].startswith('--') else '../../scenes'
FMTS = {'916': (1080, 1920), '169': (1920, 1080)}
INK, PAPER = C['ink'], '#fffdf7'

# ── where the courier is and where an actor may stand (world coordinates, as illus.scene_disruption) ──────────────
COURIER_AT = (-190, 175)
SPOT = {'916': dict(a=(-40, 222), b=(110, 236), c=(-150, 250)), '169': dict(a=(-30, 222), b=(120, 236), c=(-150, 252))}

def u2_of(fr, iso): return fr.u * iso.s * .5

# ── small things people hold ─────────────────────────────────────────────────────────────────────────────────────
def cane(pn, hand, col='#5b3a2a'): pn.line([(hand[0] + 4, hand[1] + 6), (hand[0] + 22, 6)], 9, col); pn.ell(hand[0] + 22, 8, 7, 5, INK)

def bigmap(pn, hand, col='#fffdf7'):
    """A paper map held open in both hands: folds, blue water, two green parks. Stockholm's, not that it shows."""
    x0, y0, x1, y1 = hand[0] - 70, hand[1] - 40, hand[0] + 70, hand[1] + 70
    pn.rect(x0, y0, x1, y1, 4, col, outline=C['rule'], w=2)
    pn.poly([(x0 + 6, y0 + 8), (x0 + 60, y0 + 30), (x0 + 72, y0 + 6)], C['water']); pn.poly([(x0 + 84, y1 - 8), (x1 - 6, y1 - 30), (x1 - 8, y1 - 6)], C['water'])
    pn.ell(x0 + 40, y1 - 30, 14, 10, '#c9d3c2'); pn.ell(x1 - 34, y0 + 40, 12, 9, '#c9d3c2')
    for xx in (x0 + 47, x0 + 94): pn.line([(xx, y0 + 2), (xx, y1 - 2)], 2, C['rule'])
    pn.line([(x0 + 2, (y0 + y1) / 2), (x1 - 2, (y0 + y1) / 2)], 2, C['rule'])

def cashfan(pn, hand, n=4):
    for i in range(n):
        a = math.radians(-35 + i * 18); cx, cy = hand[0] + 8, hand[1] + 6
        pts = [(cx + math.cos(a + d) * r, cy + math.sin(a + d) * r) for d, r in ((-.18, 8), (.18, 8), (.10, 52), (-.10, 52))]
        pn.poly(pts, '#9ec7a3' if i % 2 else '#b5d6a0')
    pn.ell(hand[0] + 4, hand[1] + 2, 11, 11, SKIN[0])

def accordion(pn, hand, col='#a3302c'):
    """Held at the chest: two keyboard ends and the bellows between."""
    x0, x1, y0, y1 = hand[0] - 78, hand[0] + 14, hand[1] - 46, hand[1] + 66
    pn.rect(x0, y0, x0 + 22, y1, 4, col); pn.rect(x1 - 22, y0, x1, y1, 4, col)
    for i, xx in enumerate(range(int(x0 + 24), int(x1 - 22), 9)): pn.rect(xx, y0 + 6, xx + 7, y1 - 6, 1, '#efe6d4' if i % 2 else '#d8cba8')
    for yy in range(int(y0 + 10), int(y1 - 6), 14): pn.rect(x1 - 18, yy, x1 - 6, yy + 8, 2, PAPER)

def case(img, iso, X, Y, z=12):
    """The open instrument case on the platform, with the morning's coins."""
    d = ImageDraw.Draw(img)
    iso.box(d, X - 60, X + 60, Y - 18, Y + 18, z, z + 10, '#2b4252', '#22384a', '#1c3140')
    iso.poly(d, [(X - 54, Y - 12, z + 10), (X + 54, Y - 12, z + 10), (X + 54, Y + 12, z + 10), (X - 54, Y + 12, z + 10)], '#a3302c')
    for dx, dy in ((-20, -2), (6, 4), (24, -4), (-4, 8)): cx, cy = iso.p(X + dx, Y + dy, z + 11); r = 5 * iso.s * iso.fr.u; d.ellipse([cx - r, cy - r * .6, cx + r, cy + r * .6], fill=hx('#e0c060'))

def student_cap(pn, hc, hy):
    """Ylioppilaslakki: the white crown, the black band, the little black peak and the lyre badge."""
    pn.ell(hc - 2, hy + 26, 34, 15, '#ffffff'); pn.rect(hc - 34, hy + 10, hc + 30, hy + 22, 3, INK)
    pn.poly([(hc + 18, hy + 12), (hc + 46, hy + 6), (hc + 44, hy + 14), (hc + 20, hy + 18)], INK)
    pn.ell(hc + 6, hy + 30, 4, 4, '#e0c060')

def towel(pn, col='#ffffff'):
    pn.poly([(-42, 278), (40, 278), (44, 140), (-46, 140)], col); pn.line([(-40, 270), (38, 270)], 5, shade(col, .9))

def coat_skirt(pn, col, hem=70):
    pn.poly([(-44, 262), (40, 262), (46, hem), (-52, hem)], col); pn.line([(14, 250), (16, hem + 4)], 3, shade(col, .8))

def labcoat(pn):
    pn.poly([(-44, 262), (40, 262), (46, 120), (-52, 120)], '#ffffff'); pn.line([(14, 250), (16, 124)], 3, '#dfe4e2')

def quilt(pn, top=262, bot=450, col='#2c9c77'):
    for yy in range(top + 22, bot - 10, 30): pn.line([(-44, yy), (42, yy + 2)], 4, shade(col, .82))

def gull(img, x, y, k, f=1):
    """A herring gull, side on: white body, the grey mantle, black wingtips, yellow bill with its red spot."""
    pn = Pen(img, x, y, k, f)
    pn.limb([(4, 0), (6, 28)], [4, 4], '#e8b48a'); pn.limb([(-12, 0), (-10, 28)], [4, 4], '#e8b48a')
    pn.ell(-2, 52, 44, 26, '#ffffff')                                                                   # body
    pn.poly([(-44, 60), (-70, 50), (-40, 44)], INK)                                                    # tail tips
    pn.poly([(-40, 70), (26, 72), (16, 50), (-50, 48)], '#a9b6bd'); pn.poly([(-52, 50), (-72, 46), (-40, 58)], INK)
    pn.ell(30, 82, 17, 17, '#ffffff')                                                                  # head
    pn.poly([(42, 86), (66, 82), (64, 77), (44, 78)], '#f2c84b'); pn.ell(58, 79, 2.6, 2.6, C['coral'])
    pn.ell(36, 88, 2.6, 2.6, INK)

def dog(img, x, y, k, f=1):
    """A small dog in a tiny yellow raincoat, walking itself to work."""
    pn = Pen(img, x, y, k, f); fur, fur_d = '#b07a52', '#8d5b3f'
    for lx, sh in ((-34, .85), (26, .85), (-24, 1), (34, 1)): pn.limb([(lx, 46), (lx + (6 if sh == 1 else 2), 4)], [12, 10], fur if sh == 1 else fur_d)
    pn.limb([(-46, 58), (-62, 92)], [9, 6], fur)                                                       # tail, up
    pn.rect(-50, 36, 46, 76, 18, fur)                                                                  # body
    pn.rect(-46, 48, 40, 84, 14, '#ffcc00'); pn.line([(-46, 62), (40, 62)], 3, '#d8a800')              # the raincoat
    pn.ell(-30, 86, 14, 6, '#ffcc00')                                                                  # its hood, down
    pn.ell(54, 84, 20, 18, fur); pn.ell(70, 78, 12, 8, fur); pn.ell(80, 80, 4, 4, INK)                  # head, snout, nose
    pn.poly([(42, 96), (50, 110), (58, 96)], fur_d)                                                    # ear
    pn.ell(56, 88, 2.4, 2.4, INK)

def ink_courier_head(img, x, y, r):
    """The other courier: the same face, but INK on WHITE inside an ink ring — never the courier's cyan."""
    f = B.toko_face_img(r / SS, 'info'); f = f.resize((int(f.width * SS), int(f.height * SS)), Image.LANCZOS)
    a = np.array(f).astype(float); alpha = a[..., 3] / 255; t = np.clip((a[..., 0] - 51) / (255 - 51), 0, 1)
    ink = np.array(hx(INK)[:3], float); out = np.zeros_like(a)
    out[..., :3] = 255 * (1 - t[..., None]) + ink * t[..., None]; out[..., 3] = alpha * 255
    face = Image.fromarray(out.astype(np.uint8), 'RGBA')
    d = ImageDraw.Draw(img); R = r * 1.12; d.ellipse([x - R, y - R, x + R, y + R], fill=hx(INK))
    img.alpha_composite(face, (int(x - face.width / 2), int(y - face.height / 2)))

# ── the cast: (card) -> draw(fr, iso, img) ───────────────────────────────────────────────────────────────────────
def at(fr, iso, spot, z=12): X, Y = SPOT['916' if fr.vert else '169'][spot]; return iso.p(X, Y, z)
STAND_FRONT = [(4, 426), (26, 352), (44, 404)]                                     # a hand at the chest

def a_granny(fr, iso, img):
    x, y = at(fr, iso, 'a'); k = u2_of(fr, iso) * .9; f = -1
    spec = dict(pose='stand', skin=SKIN[3], hair=HAIR[4], style='bun', jacket='#7d5a8a', shirt='#efe6d4', legs='#3e4a52', shoes='#5b3a2a', closed=True,
                arms=dict(front=[(4, 426), (20, 352), (34, 290)]), props=())
    person(img, x, y, k, f, spec); pn = Pen(img, x, y, k, f); coat_skirt(pn, '#7d5a8a', 110); cane(pn, (34, 290)); pn.ell(34, 290, 10, 10, SKIN[3])

def a_tourist(fr, iso, img, props=('map',)):
    x, y = at(fr, iso, 'a'); k = u2_of(fr, iso); f = -1
    spec = dict(pose='stand', skin=SKIN[0], hair=HAIR[2], style='ponytail', jacket='#e2683c', shirt='#fffdf7', legs='#3e65a8', shoes=PAPER, sole=C['rule'],
                props=('backpack',), bag='#2c9c77', arms=dict(front=[(4, 426), (40, 360), (70, 380)], back=[(-2, 424), (24, 352), (56, 372)]))
    person(img, x, y, k, f, spec); pn = Pen(img, x, y, k, f)
    if 'map' in props: bigmap(pn, (60, 360))
    if 'cash' in props:
        pn.rect(-70, 150, -20, 220, 6, '#d8cba8'); pn.line([(-60, 220), (-46, 250), (-30, 220)], 4, '#b3a37a')   # a paper shopping bag
        cashfan(pn, (70, 380))

def a_busker(fr, iso, img):
    X, Y = SPOT['916' if fr.vert else '169']['b']; case(img, iso, X - 70, Y + 40)
    x, y = iso.p(X, Y, 12); k = u2_of(fr, iso); f = -1
    spec = dict(pose='stand', skin=SKIN[2], hair=HAIR[0], style='beanie', jacket='#3e8ecc', shirt='#fffdf7', legs=INK, shoes='#5b3a2a', closed=True,
                arms=dict(front=[(4, 426), (30, 360), (60, 380)], back=[(-2, 424), (-10, 350), (-40, 372)]))
    person(img, x, y, k, f, spec); pn = Pen(img, x, y, k, f); accordion(pn, (60, 380))

def a_vappu(fr, iso, img):
    x, y = at(fr, iso, 'a'); k = u2_of(fr, iso); f = -1
    spec = dict(pose='stand', skin=SKIN[1], hair=HAIR[1], style='short', jacket='#c4372f', shirt='#c4372f', legs='#c4372f', shoes=INK, closed=True,
                arms=dict(front=[(4, 426), (40, 380), (66, 420)]))                                        # student overalls, an arm up with the cash
    person(img, x, y, k, f, spec); pn = Pen(img, x, y, k, f)
    for (px, py, c) in ((-30, 330, '#ffcc00'), (-18, 290, '#33b2d2'), (-34, 220, '#2c9c77'), (10, 240, '#ffffff')): pn.ell(px, py, 9, 9, c)   # patches
    student_cap(pn, 8, 490); cashfan(pn, (66, 420), 2)
    pn.line([(-30, 440), (-50, 640)], 2, INK); pn.ell(-52, 676, 26, 32, '#ffcc00')                       # a vappu balloon

def a_rival(fr, iso, img):
    x, y = at(fr, iso, 'a'); k = u2_of(fr, iso) * 1.04; f = -1
    spec = dict(COURIER, jacket='#e4e6e1', shirt=INK, legs='#3e4a52', shoes=INK, sole='#69777a', strap=INK, toko=None, props=('parcel',),
                arms=dict(front=[(4, 426), (30, 350), (56, 330)], back=[(-2, 424), (16, 348), (40, 320)]))
    spec.pop('toko'); spec.update(skin='#c98e66', hair=HAIR[3], style='short')
    person(img, x, y, k, f, spec)
    hc, hy = 8, 490; pn = Pen(img, x, y, k, f); cx, cy = pn.p(hc + 2, hy + 4)
    pn.limb([(hc - 2, hy - 48), (hc + 2, hy - 24)], [20, 20], '#c98e66'); ink_courier_head(img, cx, cy, 40 * k)

def a_longcoat(fr, iso, img):
    x, y = at(fr, iso, 'a'); k = u2_of(fr, iso) * 1.06; f = -1
    spec = dict(pose='stand', skin=SKIN[3], hair=HAIR[0], style='long', jacket='#2b3238', shirt='#2b3238', legs='#2b3238', shoes=INK, closed=True,
                arms=dict(front=[(4, 426), (34, 372), (64, 392)]))
    person(img, x, y, k, f, spec); pn = Pen(img, x, y, k, f); coat_skirt(pn, '#2b3238', 40); cashfan(pn, (64, 392), 5)

def a_dentist(fr, iso, img):
    x, y = at(fr, iso, 'a'); k = u2_of(fr, iso); f = -1
    spec = dict(pose='stand', skin=SKIN[0], hair=HAIR[5], style='bun', jacket='#ffffff', shirt='#9fd3d9', legs='#3e65a8', shoes=PAPER, sole=C['rule'],
                arms=dict(front=[(4, 426), (34, 372), (64, 392)]))
    person(img, x, y, k, f, spec); pn = Pen(img, x, y, k, f); labcoat(pn); cashfan(pn, (64, 392), 3)

def a_sauna(fr, iso, img):
    x, y = at(fr, iso, 'a'); k = u2_of(fr, iso); f = -1; sk = SKIN[3]
    spec = dict(pose='stand', skin=sk, hair=HAIR[2], style='short', jacket=sk, shirt=sk, legs=sk, shoes='#33b2d2', closed=False,
                arms=dict(front=[(4, 426), (30, 380), (58, 440)]))                                         # waving you in
    person(img, x, y, k, f, spec); pn = Pen(img, x, y, k, f); towel(pn)
    for i, (sx, sy) in enumerate(((-20, 560), (10, 600), (-6, 640))): pn.ell(sx, sy, 16 - i * 3, 12 - i * 2, '#e4e6e1')   # steam

def a_spruce(fr, iso, img):
    x, y = at(fr, iso, 'a'); k = u2_of(fr, iso) * 1.1; f = -1
    spec = dict(pose='stand', skin=SKIN[1], hair='#6b3e26', style='beanie', jacket='#a3302c', shirt='#2b3238', legs='#3e4a52', shoes='#5b3a2a', closed=True,
                arms=dict(front=[(4, 426), (44, 380), (84, 370)], back=[(-2, 424), (30, 370), (70, 360)]))     # arms out for the parcel
    person(img, x, y, k, f, spec); pn = Pen(img, x, y, k, f)
    for yy in range(280, 440, 40): pn.line([(-42, yy), (40, yy + 2)], 6, '#6b1f1c')                      # the check
    for (nx, ny) in ((-20, 400), (12, 350), (-30, 300), (24, 420), (0, 270)): pn.line([(nx, ny), (nx + 10, ny + 6)], 3, '#2c6a3c')   # needles, still
    pn.ell(30, 470, 22, 16, '#6b3e26')                                                                   # beard

def a_swedish(fr, iso, img):
    x, y = at(fr, iso, 'a'); k = u2_of(fr, iso); f = -1
    spec = dict(pose='stand', skin=SKIN[3], hair=HAIR[2], style='curly', jacket='#2c9c77', shirt='#fffdf7', legs='#3e4a52', shoes=PAPER, sole=C['rule'],
                props=('tote',), bag='#e9d38a', arms=dict(front=[(4, 426), (34, 470), (40, 540)]))          # a hand up: a question
    person(img, x, y, k, f, spec)

def a_puffy(fr, iso, img):
    X0, Y0 = SPOT['916' if fr.vert else '169']['a']
    for i, (dx, dy, col, sk, hr, st) in enumerate(((60, -24, '#2c9c77', SKIN[0], HAIR[1], 'short'), (0, 0, '#3e65a8', SKIN[2], HAIR[0], 'beanie'),
                                                     (110, 14, '#c4372f', SKIN[3], HAIR[2], 'ponytail'))):
        x, y = iso.p(X0 + dx, Y0 + dy, 12); k = u2_of(fr, iso) * (1 + .02 * i); f = -1 if i != 2 else 1
        spec = dict(pose='stand', skin=sk, hair=hr, style=st, jacket=col, shirt=col, legs=INK, shoes=INK, closed=True)
        person(img, x, y, k, f, spec); pn = Pen(img, x, y, k, f)
        pn.ell(-2, 330, 58, 96, col); quilt(pn, 250, 440, col); pn.ell(4, 440, 46, 20, shade(col, .9))   # the puff

def a_umbrella(fr, iso, img):
    """Eleven people under one shelter: the crowd that is not already there, pressed in out of the rain."""
    for i, (X, Y, col) in enumerate(((250, 196, '#3e65a8'), (300, 200, '#c4372f'), (350, 196, '#2c9c77'), (400, 204, '#7d5a8a'), (430, 190, '#bc7c53'), (220, 206, '#2b3238'))):
        x, y = iso.p(X, Y, 12); k = u2_of(fr, iso) * .94; f = -1 if i % 2 else 1
        spec = dict(pose='stand', skin=SKIN[i % 5], hair=HAIR[i % 6], style=('short', 'bun', 'beanie', 'curly', 'long', 'short')[i], jacket=col, shirt=PAPER,
                    legs=INK, shoes=INK, closed=bool(i % 2), arms=dict(front=[(4, 426), (12, 350), (18, 286)]))
        person(img, x, y, k, f, spec)

def a_gull(fr, iso, img, two=False):
    """On the courier's parcel (where illus.scene_disruption puts it), and with gull2, its friend on the platform."""
    X, Y = COURIER_AT; ox, oy = iso.p(X, Y, 12); k = u2_of(fr, iso) * 1.08
    pn = Pen(img, ox, oy, k, -1); top = pn.p(68, 366)                                                    # the parcel's top edge
    gull(img, top[0], top[1], k * 1.0, 1)                                                                # facing him: it is owed money
    if two: x, y = at(fr, iso, 'a'); gull(img, x, y, k * 1.2, 1)

def a_dog(fr, iso, img):
    x, y = at(fr, iso, 'a'); dog(img, x, y, u2_of(fr, iso) * 1.2, -1)

CAST = {
  'granny': a_granny, 'map': a_tourist, 'moomin': lambda fr, iso, img: a_tourist(fr, iso, img, ('cash',)), 'busker': a_busker, 'vappu': a_vappu,
  'rival': a_rival, 'longcoat': a_longcoat, 'dentist': a_dentist, 'sauna': a_sauna, 'spruce2': a_spruce, 'swedish': a_swedish,
  'puffy': a_puffy, 'umbrella': a_umbrella, 'gull': a_gull, 'gull2': lambda fr, iso, img: a_gull(fr, iso, img, True), 'dog': a_dog,
}

def save(im, path, fr):
    os.makedirs(os.path.dirname(path), exist_ok=True); small = fr.down(im)
    with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as t: small.save(t.name)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', t.name, '-c:v', 'libwebp', '-quality', '82', '-pix_fmt', 'yuva420p', path], check=True)
    os.unlink(t.name); return small

def contact(shots, path):
    """Each actor over the shipped stop, the card's box outlined, both formats: the sheet to LOOK at."""
    tiles = []
    for fmt, (W, H) in FMTS.items():
        base = Image.new('RGBA', (W, H), hx(C['paper']))
        for l in ('01-backdrop', '02-street', '04-shelter', '05-people', '06-courier'): base.alpha_composite(Image.open(f'{OUT}/stop/{fmt}/{l}.webp').convert('RGBA'))
        card = (0.04 * W, 0.72 * H, 0.96 * W, 0.985 * H) if fmt == '916' else (0.55 * W, 0.66 * H, 0.98 * W, 0.97 * H)
        for name in CAST:
            t = base.copy(); t.alpha_composite(shots[(name, fmt)]); d = ImageDraw.Draw(t)
            d.rectangle(card, outline=(226, 104, 60, 255), width=6); d.text((24, 24), name, fill=(21, 38, 43, 255), font=ImageFont.load_default(48 if fmt == '916' else 40))
            tiles.append(t.resize((W // 4, H // 4), Image.LANCZOS))
    cols = 8; w, h = max(t.width for t in tiles), max(t.height for t in tiles); rows = math.ceil(len(tiles) / cols)
    sheet = Image.new('RGBA', (cols * w, rows * h), (255, 255, 255, 255))
    for i, t in enumerate(tiles): sheet.alpha_composite(t, ((i % cols) * w, (i // cols) * h))
    sheet.convert('RGB').save(path)

def main():
    shots, only = {}, [a for a in sys.argv[1:] if not a.startswith('--') and a in CAST]
    for fmt, (W, H) in FMTS.items():
        fr = Frame(W, H); iso = iso_cam(fr)
        for name, draw in CAST.items():
            if only and name not in only: continue
            im = fr.new(); draw(fr, iso, im); shots[(name, fmt)] = save(im, f'{OUT}/stop/{fmt}/07-actor-{name}.webp', fr).convert('RGBA')
        print(fmt, 'done')
    if '--sheet' in sys.argv and not only: contact(shots, sys.argv[sys.argv.index('--sheet') + 1])
    with open(f'{OUT}/stop/act1.json') as fh: meta = json.load(fh)
    meta['actors'] = sorted(CAST); open(f'{OUT}/stop/act1.json', 'w').write(json.dumps(meta, indent=1))

if __name__ == '__main__': main()
