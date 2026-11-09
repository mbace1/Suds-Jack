#!/usr/bin/env python3
"""Pass 3 plate cutter. Close / varied-angle interiors start as flat-vector plates (_plates/<scene>-<tag>-{full,empty,glass}.jpg:
the painted-flat frame, the same frame with the people removed, and the same empty frame with the glass keyed #00FF00).
This module cuts them into a motion stack, all full-frame RGBA at the requested size:
  01-outside   what is seen through the glass, bled ~70 px past the frames so it can drift / scroll
  02-car       the empty car with the glass punched out
  03-people    other riders  (full - empty difference, minus the courier)
  04-courier   the courier, with the placeholder cyan head replaced by the bible Toko face (neck + white ring)
Then illus adds signage / HUD / card. Results cache in _cache/plates/<scene>-<tag>/ at the master size."""
import os, numpy as np, cv2
from PIL import Image, ImageDraw
import bible_render as B
from bible_render import hx
HERE = os.path.dirname(os.path.abspath(__file__)); P = f'{HERE}/_plates'; CACHE = f'{HERE}/_cache/plates'
MASTER = {'169': (1920, 1080), '916': (1080, 1920)}
# per plate: courier seed (native px, a point inside the courier's torso), toko mood, head scale (disc -> head), extra masks
CFG = {
 ('day', '169'):   dict(seed=(560, 420), mood='info', hs=.9, others=lambda x, y: ((x > 778) & (y < 625)) | (x > 850)),
 ('day', '916'):   dict(seed=(300, 600), mood='info', hs=.9, others=lambda x, y: ((x > 556) & (y < 790)) | ((x > 590) & (y < 1045)) | (x > 640)),
 ('night', '169'): dict(seed=(300, 520), mood='info', hs=.9),
 ('night', '916'): dict(seed=(150, 820), mood='info', hs=.9),
 ('strap', '169'): dict(seed=(500, 360), mood='info', hs=.9),
}

def _rd(name): return cv2.cvtColor(cv2.imread(f'{P}/{name}.jpg'), cv2.COLOR_BGR2RGB)
def _clean(a): return cv2.bilateralFilter(a, 7, 28, 7)          # kill jpeg ringing, keep flat edges

def _people_mask(full, empty):
    f = cv2.GaussianBlur(full, (5, 5), 0).astype(int); e = cv2.GaussianBlur(empty, (5, 5), 0).astype(int)
    d = np.abs(f - e).sum(2); m = (d > 34).astype(np.uint8)
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5)))
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (15, 15)))
    # fill holes (navy jacket on a navy bench has low difference inside a closed outline)
    h, w = m.shape; ff = m.copy(); pad = np.zeros((h + 2, w + 2), np.uint8); cv2.floodFill(ff, pad, (0, 0), 1)
    ff2 = m.copy(); pad = np.zeros((h + 2, w + 2), np.uint8)
    inv = 1 - m; n, lab, st, _ = cv2.connectedComponentsWithStats(inv, 8)
    for i in range(1, n):                                           # holes = background comps not touching the border and not huge
        x, y, ww, hh, a = st[i]
        if x > 0 and y > 0 and x + ww < w and y + hh < h and a < .04 * w * h: m[lab == i] = 1
    n, lab, st, _ = cv2.connectedComponentsWithStats(m, 8)
    keep = np.zeros_like(m)
    for i in range(1, n):
        if st[i][4] > 2500: keep[lab == i] = 1
    return keep, lab

def _disc(full):
    a = full.astype(int); r, g, b = a[..., 0], a[..., 1], a[..., 2]
    m = ((b > 150) & (r < 80) & (b - g > 40)).astype(np.uint8)
    n, lab, st, cen = cv2.connectedComponentsWithStats(m, 8); i = 1 + int(np.argmax(st[1:, 4]))
    ys, xs = np.nonzero(lab == i); cx, cy = xs.mean(), ys.mean(); rad = (np.ptp(xs) + np.ptp(ys)) / 4 + 1
    return cx, cy, rad, (lab == i)

def toko_disc(r, mood, ring='#ffffff'):
    """Large Toko head: white ring (6% of r), mood ground, white traced-master face (bible)."""
    S = 4; R = int(r * S); size = 2 * R + 4
    f = B.toko_face_img(r * .94, mood, ring=None)
    im = Image.new('RGBA', (size, size), (0, 0, 0, 0)); d = ImageDraw.Draw(im); c = size / 2
    d.ellipse([c - R, c - R, c + R, c + R], fill=hx(ring)); im = im.resize((size // S, size // S), Image.LANCZOS)
    im.alpha_composite(f, (int(im.width / 2 - f.width / 2), int(im.height / 2 - f.height / 2)))
    return im

def build(scene, tag):
    out = f'{CACHE}/{scene}-{tag}'; names = ['01-outside', '02-car', '03-people', '04-courier']
    if os.path.exists(f'{out}/meta.npy') and all(os.path.exists(f'{out}/{n}.png') for n in names):
        L = {n: Image.open(f'{out}/{n}.png') for n in names}; L['_tile'] = Image.open(f'{out}/tile.png')
        return L, np.load(f'{out}/meta.npy', allow_pickle=True).item()
    os.makedirs(out, exist_ok=True); cfg = CFG[(scene, tag)]; W, H = MASTER[tag]
    full, empty, glass = _rd(f'{scene}-{tag}-full'), _rd(f'{scene}-{tag}-empty'), _rd(f'{scene}-{tag}-glass')
    h, w = full.shape[:2]; k = W / w
    # --- glass mask (from the keyed edit), cleaned
    g = glass.astype(int); gm = ((g[..., 1] - np.maximum(g[..., 0], g[..., 2]) > 70) & (g[..., 1] > 150)).astype(np.uint8)
    gm = cv2.morphologyEx(gm, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8)); gm = cv2.morphologyEx(gm, cv2.MORPH_CLOSE, np.ones((7, 7), np.uint8))
    # --- outside: empty plate inside the glass, bled outward with inpaint so it can drift
    bleed = cv2.dilate(gm, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (95, 95)))
    ins = cv2.erode(gm, np.ones((11, 11), np.uint8))   # stay clear of the frame edge (the keyed edit can be ~3 px off)
    src = empty.copy(); src[ins == 0] = 0
    fill = ((bleed == 1) & (ins == 0)).astype(np.uint8)
    outside = cv2.inpaint(src, fill, 9, cv2.INPAINT_TELEA)
    mean = empty[ins == 1].mean(0) if ins.any() else np.array([200, 200, 200]); outside[bleed == 0] = mean.astype(np.uint8)
    # --- people / courier
    pm, _ = _people_mask(full, empty)
    cx, cy, rad, dm = _disc(full)
    n, lab, st, _ = cv2.connectedComponentsWithStats(pm, 8)
    sx, sy = cfg['seed']; ci = lab[sy, sx] or lab[int(cy), int(cx)]
    cm = (lab == ci).astype(np.uint8) | dm.astype(np.uint8)
    if cfg.get('others'):                                                # the courier touches a neighbour: hand-drawn split region (native px)
        yy0, xx0 = np.mgrid[0:h, 0:w]; cm[cfg['others'](xx0, yy0) & ~dm] = 0
    om = ((pm == 1) & (cm == 0)).astype(np.uint8)
    # --- upscale everything to the master
    up = lambda a, it=cv2.INTER_LANCZOS4: cv2.resize(a, (W, H), interpolation=it)
    fullU, emptyU, outU = _clean(up(full)), _clean(up(empty)), _clean(up(outside))
    def soft(m, grow=1.5, blur=2.2):
        mu = up(m.astype(np.float32), cv2.INTER_LINEAR)
        if grow: mu = cv2.dilate(mu, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (int(2 * grow) + 1, int(2 * grow) + 1)))
        return np.clip(cv2.GaussianBlur(mu, (0, 0), blur), 0, 1)
    gA = soft(gm, 0, 1.2); cA = soft(cm); oA = soft(om)
    def rgba(rgb, a): return Image.fromarray(np.dstack([rgb, (a * 255).astype(np.uint8)]))
    L = {}
    L['01-outside'] = rgba(outU, np.ones((H, W)))
    L['02-car'] = rgba(emptyU, 1 - gA)
    L['03-people'] = rgba(fullU, oA)
    # courier: erase the placeholder disc, add neck, place the Toko head
    CX, CY, R = cx * k, cy * k, rad * k
    cA2 = cA.copy(); yy, xx = np.mgrid[0:H, 0:W]; cA2[(xx - CX) ** 2 + (yy - CY) ** 2 < (R * 1.07) ** 2] = 0
    cour = rgba(fullU, cA2)
    # skin sampled from the hand (the courier's skin-coloured pixels)
    cf = full[cm == 1].astype(int); sk = cf[(cf[:, 0] > 170) & (cf[:, 0] - cf[:, 2] > 50) & (cf[:, 1] > 110)]
    skin = tuple(int(v) for v in (np.median(sk, 0) if len(sk) > 50 else (214, 160, 120)))
    hr = R * cfg['hs']; hy = CY + (R - hr) * .96                         # smaller head, bottom-tangent to the old disc so the collar stays covered
    nk = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(nk)
    nw = hr * .78; d.rounded_rectangle([CX - nw / 2, hy, CX + nw / 2, CY + R * 1.02], radius=nw * .35, fill=skin + (255,))
    d.ellipse([CX - nw / 2 - 1, CY + R * .98 - nw * .22, CX + nw / 2 + 1, CY + R * .98 + nw * .22], fill=tuple(int(v * .86) for v in skin) + (255,))
    # neck goes BEHIND the jacket: composite neck, then courier body over it, then the head
    body = Image.alpha_composite(nk, cour)
    hd = toko_disc(hr, cfg['mood']); body.alpha_composite(hd, (int(CX - hd.width / 2), int(hy - hd.height / 2)))
    L['04-courier'] = body
    if cfg.get('reflect'):                                               # night: a faint flat reflection of the head on the glass
        fx, fy = cfg['reflect']; rx, ry = CX + fx * hr, hy + fy * hr
        rf = Image.new('RGBA', (W, H), (0, 0, 0, 0)); ImageDraw.Draw(rf).ellipse([rx - hr * .9, ry - hr * .9, rx + hr * .9, ry + hr * .9], outline=(220, 235, 240, 46), width=max(2, int(hr * .06)))
        ImageDraw.Draw(rf).ellipse([rx - hr * .84, ry - hr * .84, rx + hr * .84, ry + hr * .84], fill=(120, 170, 190, 22))
        ga = np.array(Image.fromarray((gA * 255).astype(np.uint8)))
        ra = np.array(rf); ra[..., 3] = (ra[..., 3].astype(float) * ga / 255).astype(np.uint8)
        L['01-outside'] = Image.alpha_composite(L['01-outside'], Image.fromarray(ra))
    # seamless scroll tile: the widest glass pane's column range of 01-outside, + its mirror (joins match on both sides)
    gmU = (gA > .5).astype(np.uint8); n2, lab2, st2, _ = cv2.connectedComponentsWithStats(gmU, 8)
    j = 1 + int(np.argmax(st2[1:, 4])); bx, by, bw, bh = st2[j][:4]; comp = lab2 == j
    xa, xb = bx + int(bw * .06), bx + int(bw * .94)                       # inner rectangle of the biggest pane
    rows = np.nonzero(comp[:, xa:xb].mean(1) > .995)[0]; ya, yb = (rows.min() + 6, rows.max() - 6) if len(rows) else (by, by + bh)
    strip = np.array(L['01-outside'].convert('RGB'))[ya:yb, xa:xb]
    top = np.median(strip[:4].reshape(-1, 3), 0).astype(np.uint8); bot = np.median(strip[-4:].reshape(-1, 3), 0).astype(np.uint8)
    strip = np.vstack([np.broadcast_to(top, (ya, strip.shape[1], 3)), strip, np.broadcast_to(bot, (H - yb, strip.shape[1], 3))])   # flat sky / pavement bands
    Image.fromarray(np.hstack([strip, strip[:, ::-1]])).convert('RGBA').save(f'{out}/tile.png')
    meta = dict(head=(CX, hy), r=hr, size=(W, H))
    for n_ in names: L[n_].save(f'{out}/{n_}.png', optimize=False, compress_level=3)
    np.save(f'{out}/meta.npy', meta); L['_tile'] = Image.open(f'{out}/tile.png')
    return L, meta

def layers(scene, W, H):
    """Plate layers at any size (resized from the master with the same aspect), + head position in output px."""
    tag = '169' if W >= H else '916'; L, meta = build(scene, tag); MW, MH = meta['size']; s = W / MW
    if (W, H) != (MW, MH):
        L = {k: (v.resize((W, H), Image.LANCZOS) if k != '_tile' else v.resize((max(1, int(v.width * s)), H), Image.LANCZOS)) for k, v in L.items()}
    return L, (meta['head'][0] * s, meta['head'][1] * s), meta['r'] * s

if __name__ == '__main__':
    import sys
    for sc, tg in CFG:
        if sys.argv[1:] and sc not in sys.argv[1:]: continue
        L, meta = build(sc, tg); comp = None
        for n in ['01-outside', '02-car', '03-people', '04-courier']: comp = L[n].copy() if comp is None else Image.alpha_composite(comp, L[n])
        os.makedirs('/tmp/pl', exist_ok=True); comp.convert('RGB').save(f'/tmp/pl/{sc}-{tg}.png'); print(sc, tg, meta)
