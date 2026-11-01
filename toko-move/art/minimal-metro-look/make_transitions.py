#!/usr/bin/env python3
"""Transition keyframe pack: 5 transparent PNG keyframes per transition (bible UI kit, no neon wipes),
plus transitions-sheet.png (keyframes on a checkerboard). Run after nothing; self-contained."""
import os, math, numpy as np
from PIL import Image, ImageDraw, ImageFilter
import bible_render as B
from bible_render import hx, font, CSS, DAY, NIGHT
import look, illus
illus.SS = 1
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = f'{HERE}/transitions'
T = [0, .25, .5, .75, 1.0]
def out_back(t, k=1.7): t -= 1; return 1 + t * t * ((k + 1) * t + k)
def save(name, frames):
    d = f'{OUT}/{name}'; os.makedirs(d, exist_ok=True)
    for i, f in enumerate(frames): f.save(f'{d}/f{i + 1}.png', optimize=True)
    return frames
def blank(w, h): return Image.new('RGBA', (int(w), int(h)), (0, 0, 0, 0))
def fade(im, a):
    a = max(0, min(1, a)); x = np.array(im); x[..., 3] = (x[..., 3] * a).astype(np.uint8); return Image.fromarray(x)
def place(canvas, im, scale, dx=0, dy=0, alpha=1.0):
    w, h = max(1, int(im.width * scale)), max(1, int(im.height * scale)); s = fade(im.resize((w, h), Image.LANCZOS), alpha)
    canvas.alpha_composite(s, (int((canvas.width - w) / 2 + dx), int((canvas.height - h) / 2 + dy))); return canvas

PACK = {}
# 1 card stamp-in, one per Toko mood -------------------------------------------------------------
from beats import STAMPS
for mood, (sk, line, b1, b2) in STAMPS.items():
    cw = max(820, look.card_width_needed(line, 1.0)); fr = []
    for i, t in enumerate(T):
        fs = [0, 0, 1.18, .96, 1.0][i]                       # face pops in after the panel lands
        base = blank(cw + 60, 280); look.card(base, sk, 26, 30, cw, 1.0, line, b1, b2, mood, face_scale=fs)
        sc = [.9, .97, 1.025, .995, 1.0][i]; dy = [28, 10, -3, 1, 0][i]; al = [0, .7, 1, 1, 1][i]
        fr.append(place(blank(cw + 60, 280), base, sc, 0, dy, al))
    PACK[f'card-stamp-{mood}'] = save(f'card-stamp-{mood}', fr)

# 2 night fade: an ink wash grows from the courier ------------------------------------------------
W, H = 1920, 1080; cx, cy = W * .44, H * .52; diag = math.hypot(W, H)
fr = []
for t in T:
    r = [0.0, .14, .38, .7, 1.15][T.index(t)] * diag
    m = Image.new('L', (W, H), 0)
    if r > 0: ImageDraw.Draw(m).ellipse([cx - r, cy - r, cx + r, cy + r], fill=255)
    m = m.filter(ImageFilter.GaussianBlur(40 + r * .06))
    ink = Image.new('RGBA', (W, H), hx(NIGHT['paper'])); ink.putalpha(m); fr.append(ink)
PACK['night-fade'] = save('night-fade', fr)

# 3 disruption grey-out: line 4 dashes to halted grey, then the coral halt stop pulses ---------------
S = 3; CWd, CHd = 1100, 260; lw = 10 * S
xs = np.linspace(60, CWd - 60, 400) * S; ys = (CHd / 2 + 38 * np.sin(np.linspace(0, math.pi * 1.2, 400))) * S
pts = list(zip(xs, ys)); fr = []
for i, t in enumerate(T):
    im = blank(CWd * S, CHd * S); d = ImageDraw.Draw(im); n = max(2, int(len(pts) * t))
    d.line(pts, fill=hx(DAY['inks']['4']), width=lw, joint='curve')
    if t > 0:
        d.line(pts[:n], fill=hx(DAY['paper']), width=lw, joint='curve'); B.dashed(d, pts[:n], hx(B.DISRUPT['haltGrey']), lw, lw * 3.2, lw * 2.2)
    if i >= 2:
        px, py = pts[len(pts) // 2]; r = lw * 2.6 * [0, 0, .7, 1, 1][i]; pulse = [0, 0, 0, .35, .75][i]
        if pulse:
            rr = r * (1.25 + .9 * pulse); d.ellipse([px - rr, py - rr, px + rr, py + rr], outline=hx(CSS['coral'], int(150 * (1 - pulse))), width=int(lw * .5))
        d.ellipse([px - r * 1.25, py - r * 1.25, px + r * 1.25, py + r * 1.25], fill=hx('#ffffff')); d.ellipse([px - r, py - r, px + r, py + r], fill=hx(CSS['coral']))
        for sg in (-1, 1): d.rounded_rectangle([px + sg * r * .3 - r * .13, py - r * .45, px + sg * r * .3 + r * .13, py + r * .45], radius=r * .06, fill=hx('#ffffff'))
    fr.append(im.resize((CWd, CHd), Image.LANCZOS))
PACK['disruption-greyout'] = save('disruption-greyout', fr)

# 4 iris to the courier disc ------------------------------------------------------------------------
fr = []
for i, t in enumerate(T):
    r = [1.06, .45, .2, .07, 0][i] * diag / 2; S = 2
    m = Image.new('L', (W * S, H * S), 255); dm = ImageDraw.Draw(m)
    if r > 0: dm.ellipse([(W / 2 - r) * S, (H / 2 - r) * S, (W / 2 + r) * S, (H / 2 + r) * S], fill=0)
    im = Image.new('RGBA', (W * S, H * S), hx(DAY['paper'])); im.putalpha(m); d = ImageDraw.Draw(im)
    if i >= 2:                                               # lands on the courier's Toko face (cyan mood disc, white ring)
        cr = [0, 0, 44, 66, 60][i] * S; illus.toko_head(im, W / 2 * S, H / 2 * S, cr)
    fr.append(im.resize((W, H), Image.LANCZOS))
PACK['iris-to-courier'] = save('iris-to-courier', fr)

# 5 HUD ticks ---------------------------------------------------------------------------------------
fr = []
for i, t in enumerate(T):                                    # +Ns time-cost counter rises off the chosen button
    im = blank(320, 200); d = ImageDraw.Draw(im); v = [0, 10, 25, 40, 40][i]; y = 120 - [0, 12, 26, 38, 52][i]; a = [1, 1, 1, 1, .35][i]
    c = blank(320, 200); dc = ImageDraw.Draw(c); dc.rounded_rectangle([90, y - 30, 230, y + 30], radius=30, fill=hx(CSS['navy']))
    dc.text((160, y), f'+{v} s', font=font(30, 700), fill=hx('#ffffff'), anchor='mm', features=['tnum']); fr.append(fade(c, a))
PACK['hud-cost-counter'] = save('hud-cost-counter', fr)
fr = []
for i, t in enumerate(T):                                    # job dot fills: ●○○ -> ●●○
    S = 3; im = blank(260 * S, 90 * S); d = ImageDraw.Draw(im); r = 14 * S
    for j in range(3):
        x = (60 + j * 70) * S; y = 45 * S
        if j == 0: d.ellipse([x - r, y - r, x + r, y + r], fill=hx(CSS['ink']))
        elif j == 1:
            d.ellipse([x - r, y - r, x + r, y + r], outline=hx(CSS['dim']), width=int(r * .38))
            rr = r * [0, .45, .85, 1.18, 1.0][i]
            if rr: d.ellipse([x - rr, y - rr, x + rr, y + rr], fill=hx(CSS['ink']))
        else: d.ellipse([x - r, y - r, x + r, y + r], outline=hx(CSS['dim']), width=int(r * .38))
    fr.append(im.resize((260, 90), Image.LANCZOS))
PACK['hud-job-dot'] = save('hud-job-dot', fr)
fr = []
for i, t in enumerate(T):                                    # deadline ring drains clockwise; coral under 30 %
    S = 3; im = blank(160 * S, 160 * S); d = ImageDraw.Draw(im); p = [1.0, .75, .5, .29, .1][i]
    B.cargo(d, 80 * S, 80 * S, 34 * S, p, DAY, look.ring_col(DAY, p)); fr.append(im.resize((160, 160), Image.LANCZOS))
PACK['hud-deadline-ring'] = save('hud-deadline-ring', fr)
fr = []
for i, t in enumerate(T):                                    # clock minute rolls 07:42 -> 07:43 (tabular, short slide + crossfade)
    im = blank(260, 110); d = ImageDraw.Draw(im); f = font(56, 650); u = [0, .3, .6, .9, 1][i]
    d.text((30, 55), '07:4', font=f, fill=hx(CSS['ink']), anchor='lm', features=['tnum'])
    x = 30 + d.textlength('07:4', font=f, features=['tnum'])
    d.text((x, 55 - 18 * u), '2', font=f, fill=hx(CSS['ink'], int(255 * (1 - u) ** 1.5)), anchor='lm', features=['tnum'])
    d.text((x, 55 + 18 * (1 - u)), '3', font=f, fill=hx(CSS['ink'], int(255 * u ** .7)), anchor='lm', features=['tnum']); fr.append(im)
PACK['hud-clock-roll'] = save('hud-clock-roll', fr)

# 6 title / mutator chips ---------------------------------------------------------------------------
from ui_extra import chip
for kind in ('NIGHT', 'DISRUPTION', 'SEALED PARCEL'):
    c = chip(kind); fr = []
    for i, t in enumerate(T):                                 # slide-reveal from the left, tiny settle
        rev = [.0, .35, .75, 1.0, 1.0][i]; sc = [1, 1, 1, 1.03, 1.0][i]
        cv = blank(c.width + 40, c.height + 30); m = Image.new('L', c.size, 0)
        ImageDraw.Draw(m).rectangle([0, 0, int(c.width * rev), c.height], fill=255)
        cc = c.copy(); cc.putalpha(Image.fromarray(np.minimum(np.array(c.getchannel('A')), np.array(m))))
        fr.append(place(cv, cc, sc, 0, [10, 4, 0, 0, 0][i], [0, .8, 1, 1, 1][i]))
    PACK['chip-' + kind.lower().replace(' ', '-')] = save('chip-' + kind.lower().replace(' ', '-'), fr)

# contact sheet on checkerboard -------------------------------------------------------------------
def checker(w, h, s=16):
    a = (np.indices((h, w)).sum(0) // s) % 2 if False else ((np.arange(h)[:, None] // s + np.arange(w)[None, :] // s) % 2)
    c = np.where(a[..., None] == 1, np.array([226, 229, 226, 255]), np.array([244, 245, 242, 255])).astype(np.uint8); return Image.fromarray(c)
CELL_W, CELL_H, LBL = 300, 150, 300
rows = list(PACK.items()); SW = 60 + LBL + 5 * (CELL_W + 16) + 40; SH = 160 + len(rows) * (CELL_H + 24) + 40
sheet = Image.new('RGBA', (SW, SH), hx('#fbfaf6')); d = ImageDraw.Draw(sheet)
d.text((60, 44), 'TOKO MOVE · transition keyframes', font=font(44, 800), fill=hx(CSS['ink']))
d.text((62, 102), '5 transparent PNG keyframes each (transitions/<name>/f1–f5.png) · bible UI kit only: Toko faces, Inter, navy / coral / halted grey · shown on a checkerboard', font=font(18, 450), fill=hx(CSS['dim']))
for r, (name, frs) in enumerate(rows):
    y = 160 + r * (CELL_H + 24)
    d.text((60, y + CELL_H / 2 - 12), name, font=font(19, 700), fill=hx(CSS['ink']), anchor='lm')
    d.text((60, y + CELL_H / 2 + 14), f'{frs[0].width}×{frs[0].height}', font=font(14, 450), fill=hx(CSS['dim']), anchor='lm')
    for i, f in enumerate(frs):
        x = 60 + LBL + i * (CELL_W + 16); sheet.paste(checker(CELL_W, CELL_H), (x, y))
        t = f.copy(); t.thumbnail((CELL_W - 12, CELL_H - 12), Image.LANCZOS); sheet.alpha_composite(t, (x + (CELL_W - t.width) // 2, y + (CELL_H - t.height) // 2))
        d.rectangle([x, y, x + CELL_W, y + CELL_H], outline=hx(CSS['rule'])); d.text((x + 6, y + 4), f'f{i + 1}', font=font(12, 650), fill=hx(CSS['dim']))
sheet.convert('RGB').save(f'{HERE}/transitions-sheet.png', optimize=True); print('transitions', len(PACK))
