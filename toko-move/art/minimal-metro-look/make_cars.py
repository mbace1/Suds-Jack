#!/usr/bin/env python3
"""More interiors (toko-move v3.11; owner 2026-11-06: "We need to add lots more art and scenarios in these styles").

The interiors are generated plates (plates.py) and this environment has no image generator, so every new car here is
made FROM the shipped plate, the way make_interiors.py made the museum and the old trams — the look stays the plate's:

  scenes/metro/<fmt>/   THE METRO BY DAY. The tram car with its colour families moved to the Helsinki metro's (orange
                        seats, the yellow grab poles, pale grey laminate), and a TUNNEL drawn for the window: dark
                        segments, cable runs and a lamp every few metres, as a seamless tile so the game's window
                        scroll is the train moving. Every metro hop used the tram's car until now.
  03-people-rush        RUSH HOUR on the newer trams and the metro: the plate's own rider, copied into the seats either side and
                        re-dressed (his grey coat moved to other coats, hue by hue, so the drawing is still his), and
                        two standing passengers close to the lens, holding the rail, cropped by the frame — in the
                        people's flat register (illus.person). A full tram, and the "crush" card, ride in it.

The rush car is two layers, 03-people-rush and 04-courier-rush (the standing are nearer the lens than the courier).
The empty car needs no art: the game leaves the riders' layer out (the "humming" card).

Run from this folder:  python3 make_cars.py ../../scenes
"""
import os, sys, math, tempfile, subprocess
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
import make_interiors as MI
import illus as I

OUT = sys.argv[1] if len(sys.argv) > 1 else '../../scenes'
FMTS = {'916': (1080, 1920), '169': (1920, 1080)}
MI.THEMES['metro'] = {'seat': '#d9682c', 'pole': '#e3b52f', 'wall': '#dfe3e3', 'grey': '#4f585e'}

def webp(im, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as t: im.save(t.name)
    MI.webp(t.name, path); os.unlink(t.name)

# ── the tunnel ──────────────────────────────────────────────────────────────────────────────────────────────────────
GLASS = {'916': (.14, .45), '169': (.0, .51)}                                     # where 02-car is see-through (measured)
def tunnel(W, H, fmt):
    """A seamless tile: every feature is drawn at x, x-W and x+W so the two edges are the same column. Everything
    that says TUNNEL sits inside the glass (GLASS above): the first cut put its lamps a few pixels under the window
    and the window read as a black panel."""
    g0, g1 = GLASS[fmt]; g0 = max(g0, .04); y0, y1 = H * (g0 + .02), H * (g1 - .02); hh = y1 - y0
    im = Image.new('RGBA', (W, H), (22, 26, 30, 255)); d = ImageDraw.Draw(im); u = min(W, H) / 1080
    for i in range(48):                                                         # the wall, lit by the car's own windows
        t = i / 47; k = math.exp(-((t - .55) / .32) ** 2)
        c = tuple(int(26 + 26 * k + v) for v in (0, 4, 8)) + (255,)
        d.rectangle([0, y0 + hh * i / 48, W, y0 + hh * (i + 1) / 48 + 1], fill=c)
    def at(x, f):
        for o in (-W, 0, W): f(x + o)
    for i in range(6):                                                          # the tunnel's rings, a bolt row each
        x = i * W / 6
        at(x, lambda xx: d.rectangle([xx, 0, xx + 9 * u, H], fill=(16, 19, 22, 255)))
        at(x, lambda xx: d.rectangle([xx + 9 * u, y0, xx + 12 * u, y1], fill=(58, 64, 70, 255)))
    for f_, w, col in ((.10, 6, (74, 80, 84)), (.15, 4, (66, 72, 78)), (.19, 8, (80, 86, 88)), (.86, 6, (62, 68, 74))):   # cable runs
        yy = y0 + hh * f_; d.rectangle([0, yy, W, yy + w * u], fill=col + (255,))
        for i in range(12): at(i * W / 12, lambda xx, yy=yy, w=w: d.rectangle([xx, yy - 3 * u, xx + 5 * u, yy + w * u + 3 * u], fill=(28, 32, 36, 255)))
    glow = Image.new('RGBA', (W, H), (0, 0, 0, 0)); gd = ImageDraw.Draw(glow)
    for i in range(3):                                                          # the lamps, with their light on the wall
        x = (i + .5) * W / 3; ly = y0 + hh * .42
        at(x, lambda xx: gd.ellipse([xx - 190 * u, ly - 120 * u, xx + 190 * u, ly + 150 * u], fill=(255, 226, 160, 70)))
    glow = glow.filter(ImageFilter.GaussianBlur(60 * u)); im.alpha_composite(glow)
    for i in range(3):
        x = (i + .5) * W / 3; ly = y0 + hh * .42
        at(x, lambda xx: (d.rounded_rectangle([xx - 64 * u, ly - 18 * u, xx + 64 * u, ly + 18 * u], 8 * u, fill=(70, 70, 60, 255)),
                          d.rounded_rectangle([xx - 52 * u, ly - 9 * u, xx + 52 * u, ly + 9 * u], 5 * u, fill=(255, 240, 196, 255))))
    for i, col in ((0, (51, 160, 196)), (1, (226, 104, 60))):                    # a sign, its words too far to read
        x = (i + .25) * W / 2; sy = y0 + hh * .66
        at(x, lambda xx, col=col: (d.rounded_rectangle([xx, sy, xx + 120 * u, sy + 34 * u], 4 * u, fill=col + (255,)),
                                   d.rectangle([xx + 14 * u, sy + 13 * u, xx + 92 * u, sy + 20 * u], fill=(240, 244, 244, 255))))
    return im

def unsky(path):
    """The plate's riders were cut out of a DAY window, and the matte kept a rim of that sky: a pale blue halo that
    vanishes against daylight and glows against a tunnel. Pale sky-blue in a rider layer is that rim, and goes."""
    im = Image.open(path).convert('RGBA'); a = np.array(im).astype(float); h, s, v = MI.hsv(a[..., :3] / 255)
    rim = (h > 175) & (h < 220) & (s > 0.06) & (s < 0.5) & (v > 0.66) & (a[..., 3] > 0)
    # ...except on Toko's head, whose white ring meets its cyan disc in exactly that colour (the first cut chewed it)
    disc = (h > 182) & (h < 202) & (s > 0.55) & (v > 0.6)
    if disc.sum() > 500:
        ys, xs = np.nonzero(disc); cy, cx, r = ys.mean(), xs.mean(), (xs.max() - xs.min()) / 2
        yy, xx = np.mgrid[0:a.shape[0], 0:a.shape[1]]; rim &= (yy - cy) ** 2 + (xx - cx) ** 2 > (r * 1.2) ** 2
    a[rim, 3] = 0; return Image.fromarray(a.astype(np.uint8), 'RGBA'), int(rim.sum())

# ── rush hour ───────────────────────────────────────────────────────────────────────────────────────────────────────
CHIN = {'916': 770, '169': 410}                                                     # the plate rider's chin row (measured)
def redress(rgba, coat, hair, chin):
    """The rider, re-dressed: his grey coat (low saturation, mid value, BELOW the chin) to another coat colour, and his
    grey hair (pale, above it) to another hair colour; skin, headphones and trousers stay. Shading is kept as value."""
    a = np.array(rgba).astype(float); rgb = a[..., :3] / 255; h, s, v = MI.hsv(rgb)
    yy = np.mgrid[0:a.shape[0], 0:a.shape[1]][0]; on = a[..., 3] > 0
    for m, col, ref in (((s < 0.16) & (v > 0.32) & (v < 0.78) & (yy > chin) & on, coat, .58),
                        ((s < 0.14) & (v > 0.55) & (yy <= chin) & on, hair, .78)):
        c = np.array([int(col[i:i + 2], 16) for i in (1, 3, 5)], float) / 255
        rgb[m] = np.clip(c[None, :] * (v[m] / ref)[:, None], 0, 1)
    a[..., :3] = rgb * 255; return Image.fromarray(a.astype(np.uint8), 'RGBA')

# who else is in the car: the plate's rider again, one seat over each way (only where the courier does not hide him)
SEATS = {'916': [], '169': [(-1180, 0, '#2c6a52', '#6b3e26'), (480, 0, '#6b4f86', '#2b2420')]}
# and who is standing over you, close to the lens, cropped by the frame: (x, foot, facing, scale, skin, hair, style, jacket, bag)
STAND = {'916': [(30, 1990, 1, 3.1, 0, 2, 'ponytail', '#2b3a4a', True), (1062, 1990, -1, 3.1, 2, 0, 'short', '#8a6346', False)],
         '169': [(40, 1140, 1, 1.9, 0, 2, 'ponytail', '#2b3a4a', True)]}
STRAP = '#3c4448'
def person_only(rgba, chin):
    """The rider layer was cut with bits of seat in it (the cream front edge, blue, the dark base under it), which sit
    on the seat where he is and float wherever a copy of him goes. Cream and seat-blue go; then whatever is not near
    the body — the body being the largest piece left after an opening wide enough to drop a seat strip — goes too."""
    a = np.array(rgba).astype(float); h, s, v = MI.hsv(a[..., :3] / 255); on = a[..., 3] > 40
    seat = ((h > 20) & (h < 60) & (s < 0.3) & (v > 0.6)) | ((h > 198) & (h < 232) & (s > 0.34) & (v < 0.62))
    seat &= np.mgrid[0:a.shape[0], 0:a.shape[1]][0] > chin + 300              # never the head or chest: grey hair is "cream" too
    keep = on & ~seat
    k = Image.fromarray((keep * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(31)).filter(ImageFilter.MaxFilter(31))
    lab = MI.patches(np.array(k) > 0)
    if lab.max():
        area = np.bincount(lab.ravel()); area[0] = 0; body = lab == int(area.argmax())
        near = np.array(Image.fromarray((body * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(31))) > 0
        keep &= near
    a[~keep, 3] = 0; return Image.fromarray(a.astype(np.uint8), 'RGBA')

def rush(fmt, W, H):
    """Two layers: the seated (03-people-rush: the rider and his copies) and the standing (04-courier-rush: the courier
    with the standing passengers OVER him — they are nearer the lens than he is, and the courier layer carries a strip
    of seat edge that drew across the first cut's standing legs)."""
    base = Image.open(f'{OUT}/tram/{fmt}/03-people.webp').convert('RGBA'); out = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    lone = person_only(base, CHIN[fmt]) if SEATS[fmt] else None
    for dx, dy, coat, hair in SEATS[fmt]:
        out.alpha_composite(redress(lone, coat, hair, CHIN[fmt]), (dx, dy))
    out.alpha_composite(base)
    big = Image.new('RGBA', (W * I.SS, H * I.SS), (0, 0, 0, 0)); d = ImageDraw.Draw(big)
    for x, foot, f, k, sk, hr, st, jk, bag in STAND[fmt]:
        hand = (14, 567)                                                         # the raised hand, at strap height
        hx, hy = (x + f * hand[0] * k) * I.SS, (foot - hand[1] * k) * I.SS; K = k * I.SS
        d.rectangle([hx - 2.2 * K, -10, hx + 2.2 * K, hy - 26 * K], fill=STRAP)                  # the strap, from the rail
        d.polygon([(hx, hy - 30 * K), (hx - 16 * K, hy + 5 * K), (hx + 16 * K, hy + 5 * K)], outline=STRAP, width=int(4.5 * K))   # its handle
        spec = {'pose': 'stand', 'skin': I.SKIN[sk], 'hair': I.HAIR[hr], 'style': st, 'jacket': jk, 'shirt': '#e9e4d8', 'legs': '#22303a',
                'shoes': '#15262b', 'closed': True, 'raise': True, 'props': ('backpack',) if bag else (),
                'arms': {'front': [(4, 426), (10, 500), hand], 'back': [(-2, 424), (-8, 350), (-2, 300)]}}
        I.person(big, x * I.SS, foot * I.SS, K, f, spec)
    return out, big.resize((W, H), Image.LANCZOS)

def main():
    with tempfile.TemporaryDirectory() as tmp:
        for fmt, (W, H) in FMTS.items():
            src, dst = f'{OUT}/tram/{fmt}', f'{OUT}/metro/{fmt}'; os.makedirs(dst, exist_ok=True)
            MI.remap(f'{src}/02-car.webp', f'{tmp}/c.png', 'metro'); MI.webp(f'{tmp}/c.png', f'{dst}/02-car.webp')
            for L in ('03-people', '04-courier'):
                MI.riders(f'{src}/{L}.webp', f'{tmp}/r.png', 'metro'); im, n = unsky(f'{tmp}/r.png'); webp(im, f'{dst}/{L}.webp')
                print(fmt, L, 'sky rim', n, flush=True)
            tw, th = Image.open(f'{src}/01-outside-tile.webp').size
            webp(tunnel(tw, th, fmt), f'{dst}/01-outside-tile.webp')
            seated, standing = rush(fmt, W, H)
            webp(seated, f'{src}/03-people-rush.webp')
            seated.save(f'{tmp}/s.png'); MI.riders(f'{tmp}/s.png', f'{tmp}/r.png', 'metro'); webp(unsky(f'{tmp}/r.png')[0], f'{dst}/03-people-rush.webp')
            for d_ in (src, dst):                                   # the standing over each car's own courier (re-dressed only by the remap above)
                c = Image.open(f'{d_}/04-courier.webp').convert('RGBA'); c.alpha_composite(standing); webp(c, f'{d_}/04-courier-rush.webp')
            print(fmt, 'done', flush=True)

if __name__ == '__main__': main()
