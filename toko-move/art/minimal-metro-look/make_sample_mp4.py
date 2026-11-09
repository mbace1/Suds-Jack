#!/usr/bin/env python3
"""sample-motion.mp4 (1280x720, 30 fps, ~11.5 s), pass 3: one beat chain across varied camera angles, all from the layer stacks.
day tram 4, three-quarter across the aisle (window scroll + sway + slow push-in) -> yellow card -> 'Take it' -> +40 s to the HUD
-> iris to the courier's Toko face -> Ooppera stop, wide iso: line 4 greys out, DISRUPTION chip -> cut to the close platform crop
-> coral card -> 'Walk to the 2' -> ink wash from the courier -> NIGHT chip, last metro over the shoulder out the rainy glass
(lights drift, code rain runs down the pane) -> cyan card -> 'Catch it' -> job dot fills -> hold.
Frames are Pillow; ffmpeg encodes (libx264, yuv420p). Also writes mp4-frames/grab-*.png for the contact sheet."""
import os, math, subprocess, shutil, numpy as np
from PIL import Image, ImageDraw, ImageFilter
import illus, look, bible_render as B
from bible_render import hx, font, CSS
from ui_extra import chip
HERE = os.path.dirname(os.path.abspath(__file__)); W, H = 1280, 720; FPS = 30; DUR = 11.5
TMP = f'{HERE}/_cache/mp4'; shutil.rmtree(TMP, ignore_errors=True); os.makedirs(TMP); os.makedirs(f'{HERE}/mp4-frames', exist_ok=True)
def ease(t): t = min(1, max(0, t)); return t * t * (3 - 2 * t)
def out_back(t, k=1.6): t = min(1, max(0, t)) - 1; return 1 + t * t * ((k + 1) * t + k)
def seg(t, a, b): return min(1, max(0, (t - a) / (b - a)))
def flat(L, keys): 
    out = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    for k in keys: out.alpha_composite(L[k])
    return out
def fade(im, a): x = np.array(im); x[..., 3] = (x[..., 3] * max(0, min(1, a))).astype(np.uint8); return Image.fromarray(x)
def shift(im, dx, dy): return im.transform(im.size, Image.AFFINE, (1, 0, -dx, 0, 1, -dy), resample=Image.BILINEAR)

print('layers…', flush=True)
S = {}
for k in ('day', 'night'):
    L, fr, geo = illus.render(k, W, H); glass = 255 - np.array(L['02-car'].getchannel('A'))
    S[k] = dict(L=L, geo=geo, tile=L['_tile'], car=L['02-car'], people=L['03-people'], cour=L['04-courier'], sign=L['05-signage'], glass=Image.fromarray(glass))
for k in ('disruption', 'disruption-close'):
    L0, _, geo = illus.render(k, W, H, tint=0.0); L1, _, _ = illus.render(k, W, H, tint=1.0)
    S[k] = dict(geo=geo, back=flat(L0, ['01-backdrop', '02-street']), tram0=L0['03-tram'], tram1=L1['03-tram'],
                front=flat(L0, ['04-shelter', '05-people', '06-courier']), sign0=L0['07-signage'], sign1=L1['07-signage'])
RNG = np.random.default_rng(3); RAIN = [(RNG.uniform(0, W), RNG.uniform(0, H), RNG.uniform(.6, 1.0)) for _ in range(70)]
def rain(t, mask):
    """flat rain streaks sliding down the glass (diagonal, like the plate's own), clipped to the pane"""
    r = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(r)
    for x0, y0, v in RAIN:
        y = (y0 + t * 520 * v) % (H + 80) - 40; x = x0 - (y - y0) * .28
        x = x % W; d.line([(x, y), (x - 9 * v, y + 34 * v)], fill=(200, 220, 235, int(120 * v)), width=2)
    a = np.array(r); a[..., 3] = (a[..., 3].astype(float) * np.array(mask) / 255).astype(np.uint8); return Image.fromarray(a)
def push(img, z, cx, cy):
    """slow push-in about (cx, cy)"""
    if z <= 1.0001: return img
    w2, h2 = int(W * z), int(H * z); big = img.resize((w2, h2), Image.BICUBIC)
    x0 = int(cx * z - cx); y0 = int(cy * z - cy); return big.crop((x0, y0, x0 + W, y0 + H))
CH = {k: chip(k) for k in ('SEALED PARCEL', 'DISRUPTION', 'NIGHT')}

def card_frame(img, name, t_in, t, press_at=None, out_at=None):
    """stamp-in (0.45 s, face pops after panel), press pulse, fade-out. returns primary-button centre."""
    sc = illus.SCENES[name]; line, b1, b2, mood = sc['card']; x, y, cw, cs = S[name]['geo']; ch = 200 * cs
    u = seg(t, t_in, t_in + .45)
    if u <= 0: return None
    a = min(1, u * 2.5); s = .9 + .1 * out_back(u); dy = 26 * (1 - ease(u)); fs = 0 if u < .45 else out_back(seg(u, .45, 1), 2.4)
    pr = 0
    if press_at is not None: p = seg(t, press_at, press_at + .25); pr = math.sin(p * math.pi)
    if out_at is not None: o = seg(t, out_at, out_at + .3); a *= 1 - o; dy += 24 * ease(o)
    if a <= 0: return None
    pad = 30; cv = Image.new('RGBA', (int(cw + 2 * pad), int(ch + 2 * pad)), (0, 0, 0, 0))
    look.card(cv, sc['ui'], pad, pad, cw, cs, line, b1, b2, mood, face_scale=fs, press=pr)
    w2, h2 = int(cv.width * s), int(cv.height * s); cv = fade(cv.resize((w2, h2), Image.LANCZOS), a)
    img.alpha_composite(cv, (int(x - pad + (cw + 2 * pad - w2) / 2), int(y - pad + (ch + 2 * pad - h2) / 2 + dy)))
    bw = (cw - 3 * 24 * cs) / 2; return (x + 24 * cs + bw / 2, y + 118 * cs + 31 * cs)

def cost_chip(img, label, a, b, u):
    if u <= 0 or u >= 1: return
    p = (a[0] + (b[0] - a[0]) * ease(u), a[1] + (b[1] - a[1]) * ease(u) - 60 * math.sin(u * math.pi))
    d = ImageDraw.Draw(img); al = int(255 * (1 - seg(u, .8, 1)))
    d.rounded_rectangle([p[0] - 52, p[1] - 22, p[0] + 52, p[1] + 22], radius=22, fill=hx(CSS['navy'], al))
    d.text(p, label, font=font(22, 700), fill=hx('#ffffff', al), anchor='mm', features=['tnum'])

def put_chip(img, name, t, a, b, y=26, x=None):
    u = seg(t, a, a + .35); o = seg(t, b, b + .3)
    if u <= 0 or o >= 1: return
    c = CH[name]; w = max(1, int(c.width * ease(u))); m = Image.new('L', c.size, 0); ImageDraw.Draw(m).rectangle([0, 0, w, c.height], fill=255)
    cc = c.copy(); cc.putalpha(Image.fromarray(np.minimum(np.array(c.getchannel('A')), np.array(m)))); cc = fade(cc, 1 - o)
    img.alpha_composite(cc, (int((W - c.width) / 2) if x is None else int(x), int(y + 8 * (1 - ease(u)))))

HUDPOS = (40 * W / 1920 + 34 * W / 1920 + 30, 36 * W / 1920 + 38 * W / 1920)
def frame(t):
    img = Image.new('RGBA', (W, H), (0, 0, 0, 255))
    if t < 3.0:                                                     # ---- DAY tram 4, across the aisle
        sc = S['day']; img.alpha_composite(illus.tile_across(sc['tile'], W, int(t * 150)))
        sw = 1.4 * math.sin(t * 2 * math.pi / 1.6)
        img.alpha_composite(shift(sc['car'], 0, sw)); img.alpha_composite(shift(sc['people'], 0, 1.4 * math.sin((t - .08) * 2 * math.pi / 1.6)))
        img.alpha_composite(shift(sc['cour'], 0, sw + .8 * math.sin(t * 4 * math.pi / 1.6))); img.alpha_composite(sc['sign'])
        hx0, hy0 = illus.head_xy('day', W, H); img = push(img, 1 + .035 * ease(seg(t, 0, 2.4)), hx0, hy0)
        clock = '07:42' if t < 2.35 else '07:43'; look.hud(img, B.DAY, 40 * W / 1920, 36 * W / 1920, W / 1920, clock, 1, 3, .62 - .02 * t)
        put_chip(img, 'SEALED PARCEL', t, .25, 2.0, y=104, x=24)
        btn = card_frame(img, 'day', .8, t, press_at=1.75, out_at=2.0)
        if btn is None and t > 1.9: btn = (S['day']['geo'][0] + 200, S['day']['geo'][1] + 120)
        if t > 1.95: cost_chip(img, '+40 s', btn, HUDPOS, seg(t, 1.95, 2.4))
        if t > 2.45:                                                 # iris closes onto the courier's Toko face
            hx_, hy = illus.head_xy('day', W, H); r = (1 - ease(seg(t, 2.45, 3.0))) * 1500 + 34
            m = Image.new('L', (W, H), 255); ImageDraw.Draw(m).ellipse([hx_ - r, hy - r, hx_ + r, hy + r], fill=0)
            ov = Image.new('RGBA', (W, H), hx(illus.C['paper'])); ov.putalpha(m); img.alpha_composite(ov)
    elif t < 7.0:                                                   # ---- OOPPERA stop, line 4 halts
        nm = 'disruption' if t < 4.7 else 'disruption-close'; sc = S[nm]; img.alpha_composite(sc['back'])
        g = ease(seg(t, 3.7, 4.3))                                   # grey-out wipes left -> right along the tram
        tram = sc['tram0'].copy()
        if g > 0:
            m = Image.new('L', (W, H), 0); ImageDraw.Draw(m).rectangle([0, 0, int(W * g), H], fill=255); tram.paste(sc['tram1'], (0, 0), m)
        img.alpha_composite(tram); img.alpha_composite(sc['front']); img.alpha_composite(sc['sign1'] if g > .5 else sc['sign0'])
        if g >= 1 and nm == 'disruption':                            # coral pulse on the stop plate
            ph = ((t - 4.3) % 1.0); px, py, pr = illus.plate_xy(W, H)
            r = pr * (1.25 + .9 * ph); ImageDraw.Draw(img).ellipse([px - r, py - r, px + r, py + r], outline=hx(CSS['coral'], int(160 * (1 - ph))), width=3)
        clock = '07:43' if t < 5.95 else '07:44'; look.hud(img, B.DISRUPT, 40 * W / 1920, 36 * W / 1920, W / 1920, clock, 1, 3, max(.22, .3 - .02 * (t - 3)))
        put_chip(img, 'DISRUPTION', t, 4.0, 5.2)
        btn = card_frame(img, 'disruption-close', 4.8, t, press_at=5.6, out_at=5.85)
        if btn is None and t > 5.8: btn = (S['disruption-close']['geo'][0] + 200, S['disruption-close']['geo'][1] + 120)
        if t > 5.8: cost_chip(img, '+90 s', btn, HUDPOS, seg(t, 5.8, 6.25))
        if t < 3.5:                                                  # iris opens from the courier's face
            hx_, hy = illus.head_xy('disruption', W, H); r = ease(seg(t, 3.0, 3.5)) * 1500 + 34
            m = Image.new('L', (W, H), 255); ImageDraw.Draw(m).ellipse([hx_ - r, hy - r, hx_ + r, hy + r], fill=0)
            ov = Image.new('RGBA', (W, H), hx(illus.C['paper'])); ov.putalpha(m); img.alpha_composite(ov)
        if t > 6.3:                                                  # ink wash grows from the courier
            hx_, hy = illus.head_xy('disruption-close', W, H); r = ease(seg(t, 6.3, 7.0)) * 1600
            m = Image.new('L', (W, H), 0); ImageDraw.Draw(m).ellipse([hx_ - r, hy - r, hx_ + r, hy + r], fill=255); m = m.filter(ImageFilter.GaussianBlur(24))
            ov = Image.new('RGBA', (W, H), hx(B.NIGHT['paper'])); ov.putalpha(m); img.alpha_composite(ov)
    else:                                                           # ---- NIGHT metro to Vuosaari
        sc = S['night']; tt = t - 7.0
        img.alpha_composite(shift(sc['L']['01-outside'], -10 * tt, 0))      # city lights + bridge drift past slowly
        img.alpha_composite(rain(tt, sc['glass']))
        sw = 1.0 * math.sin(tt * 2 * math.pi / 1.1)
        img.alpha_composite(shift(sc['car'], 0, sw)); img.alpha_composite(shift(sc['cour'], 0, sw + .6 * math.sin(tt * 2 * math.pi / .9)))
        img.alpha_composite(sc['sign'])
        done = 3 if t > 10.25 else 2
        look.hud(img, B.NIGHT, 40 * W / 1920, 36 * W / 1920, W / 1920, '23:51', done, 3, .34 if done == 2 else 1.0)
        put_chip(img, 'NIGHT', t, 7.1, 8.4, y=104, x=W - 230)
        btn = card_frame(img, 'night', 7.7, t, press_at=9.4, out_at=9.7)
        if btn is None and t > 9.6: btn = (S['night']['geo'][0] + 200, S['night']['geo'][1] + 120)
        if t > 9.65: cost_chip(img, '+60 s', btn, HUDPOS, seg(t, 9.65, 10.1))
        v = 1 - ease(seg(t, 7.0, 7.45))                              # ink lifts off the night car
        if v > 0: img.alpha_composite(Image.new('RGBA', (W, H), hx(B.NIGHT['paper'], int(255 * v))))
        if t > 11.2: img.alpha_composite(Image.new('RGBA', (W, H), hx(B.NIGHT['paper'], int(255 * ease(seg(t, 11.2, 11.5))))))
    return img.convert('RGB')

N = int(DUR * FPS); grabs = {int(x * FPS): n for x, n in ((1.3, 'a-day-card'), (4.15, 'b-greyout'), (5.0, 'c-disruption-card'), (6.6, 'd-ink-wash'), (8.6, 'e-night-card'), (10.3, 'f-night-done'))}
for i in range(N):
    f = frame(i / FPS); f.save(f'{TMP}/{i:04d}.png', compress_level=1)
    if i in grabs: f.save(f'{HERE}/mp4-frames/grab-{grabs[i]}.png', optimize=True)
    if i % 60 == 0: print(i, '/', N, flush=True)
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-framerate', str(FPS), '-i', f'{TMP}/%04d.png', '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
                '-crf', '18', '-preset', 'slow', '-movflags', '+faststart', f'{HERE}/sample-motion.mp4'], check=True)
shutil.rmtree(TMP); print('wrote sample-motion.mp4')
