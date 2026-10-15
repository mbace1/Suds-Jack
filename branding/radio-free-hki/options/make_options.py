#!/usr/bin/env python3
"""Radio Free Helsinki brand options — papercut house style (paper.js)."""
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps, ImageChops
import math, random, os

OUT = '/workspace/branding/radio-free-hki/options/'
BOLD = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
REG  = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
OCHRE = (227, 163, 58)      # #e3a33a
MAG   = (240, 2, 127)       # #f0027f
NIGHT = (13, 15, 22)        # #0d0f16
DEEP  = (28, 30, 48)
MIDN  = (20, 22, 36)
CREAM = (251, 243, 228)
INK   = (31, 29, 51)
CARD  = (255, 248, 234)

# ── Toko master face (from toko/master, same as BRAND.md canon) ──
FACE = Image.open('/tmp/ref/face-yellow-on-white.jpg').convert('RGB')
_b = FACE.split()[2]
_m = ImageOps.invert(_b).point(lambda v: 0 if v < 60 else 255 if v > 140 else int((v - 60) * 255 / 80))
_m = _m.crop(_m.getbbox())
_m = _m.resize((_m.width * 4, _m.height * 4), Image.LANCZOS).filter(ImageFilter.GaussianBlur(3))
MASK = _m.point(lambda v: 0 if v < 110 else 255 if v > 146 else int((v - 110) * 255 / 36))

def hexc(h): return tuple(int(h[i:i+2], 16) for i in (1, 3, 5))

def fibre(w, h, seed=9, strength=28):
    """paper.js fibre texture: noise + short strokes"""
    rnd = random.Random(seed)
    im = Image.new('L', (w, h))
    px = im.load()
    for y in range(h):
        for x in range(w):
            px[x, y] = 128 + int((rnd.random() - 0.5) * strength)
    d = ImageDraw.Draw(im)
    for _ in range(max(40, w * h // 4000)):
        x, y = rnd.randint(0, w), rnd.randint(0, h)
        a = rnd.random() * math.tau; L = 6 + rnd.random() * 22
        col = 200 if rnd.random() > 0.5 else 80
        d.line([(x, y), (x + math.cos(a) * L, y + math.sin(a) * L)], fill=col, width=1)
    return im

FIBRE_CACHE = {}
def fibre_tile(w, h, seed=9):
    key = (w, h, seed)
    if key not in FIBRE_CACHE:
        FIBRE_CACHE[key] = fibre(min(w, 512), min(h, 512), seed).resize((w, h), Image.BILINEAR)
    return FIBRE_CACHE[key]

def sheet(canvas, shape_rgba, xy, lift=12, tex=0.45, seed=1):
    """Drop a papercut sheet with soft shadow + fibre (paper.js sheet())."""
    x, y = xy
    sh = Image.new('RGBA', canvas.size, (0, 0, 0, 0))
    a = shape_rgba.getchannel('A')
    shadow = Image.new('RGBA', shape_rgba.size, (20, 10, 40, 0))
    shadow.putalpha(a.point(lambda v: int(v * 0.45)))
    shadow = shadow.filter(ImageFilter.GaussianBlur(max(2, lift)))
    ox, oy = int(lift * 0.22), int(lift * 0.7)
    sh.paste(shadow, (x + ox, y + oy), shadow)
    canvas.alpha_composite(sh)
    # fibre overlay clipped to shape
    piece = shape_rgba.copy()
    f = fibre_tile(piece.width, piece.height, seed)
    f_rgba = Image.merge('RGBA', (f, f, f, a.point(lambda v: int(v * tex))))
    # overlay blend approximation: multiply midtones
    base = Image.new('RGBA', piece.size, (0, 0, 0, 0))
    base.paste(piece, (0, 0), piece)
    # soft light via ImageChops
    rgb = list(base.split()[:3])
    fa = f.point(lambda v: int(128 + (v - 128) * tex))
    for i in range(3):
        rgb[i] = ImageChops.blend(rgb[i], ImageChops.multiply(rgb[i], fa.convert('L').point(lambda v: v)), 0.35)
    textured = Image.merge('RGBA', (*rgb, a))
    canvas.alpha_composite(textured, (x, y))

def fill_shape(size, color, draw_fn, seed=1):
    """Create an RGBA sheet of given size; draw_fn(draw, w, h) paints opaque shape."""
    im = Image.new('RGBA', size, (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    draw_fn(d, size[0], size[1])
    # recolor: take alpha from luminance of what was drawn... simpler: draw solid
    return im

def solid_poly(size, color, points):
    im = Image.new('RGBA', size, (0, 0, 0, 0))
    ImageDraw.Draw(im).polygon(points, fill=color + (255,))
    return im

def solid_rect(size, color, box):
    im = Image.new('RGBA', size, (0, 0, 0, 0))
    ImageDraw.Draw(im).rectangle(box, fill=color + (255,))
    return im

def solid_ellipse(size, color, box):
    im = Image.new('RGBA', size, (0, 0, 0, 0))
    ImageDraw.Draw(im).ellipse(box, fill=color + (255,))
    return im

def toko_face(w, color=(255, 255, 255)):
    f = MASK.resize((w, int(w * MASK.height / MASK.width)), Image.LANCZOS)
    L = Image.new('RGBA', f.size, color + (0,))
    L.putalpha(f)
    return L

def circ_preview(path, out, sz=400):
    im = Image.open(path).convert('RGBA')
    k = Image.new('L', im.size, 0)
    ImageDraw.Draw(k).ellipse((0, 0) + im.size, fill=255)
    bg = Image.new('RGBA', im.size, (255, 255, 255, 0))
    bg.paste(im, (0, 0), k)
    bg.resize((sz, sz), Image.LANCZOS).save(out)

def text_fit(d, xy, s, size, fill, anchor='mm', maxw=None):
    f = ImageFont.truetype(BOLD, size)
    while maxw and f.getlength(s) > maxw and size > 10:
        size -= 2; f = ImageFont.truetype(BOLD, size)
    d.text(xy, s, font=f, fill=fill, anchor=anchor)
    return size

# ═══════════════════════════════════════════════════════════════
# HELSINKI LANDMARK SILHOUETTES (papercut)
# ═══════════════════════════════════════════════════════════════

def draw_cathedral(d, cx, base, scale, color):
    """Helsinki Cathedral: central dome + four corner towers + steps."""
    s = scale
    # main body
    d.rectangle((cx - 55*s, base - 70*s, cx + 55*s, base), fill=color)
    # pediment
    d.polygon([(cx - 58*s, base - 70*s), (cx, base - 95*s), (cx + 58*s, base - 70*s)], fill=color)
    # central dome drum + dome + lantern
    d.rectangle((cx - 22*s, base - 120*s, cx + 22*s, base - 90*s), fill=color)
    d.ellipse((cx - 28*s, base - 155*s, cx + 28*s, base - 110*s), fill=color)
    d.rectangle((cx - 4*s, base - 175*s, cx + 4*s, base - 150*s), fill=color)
    d.ellipse((cx - 7*s, base - 185*s, cx + 7*s, base - 172*s), fill=color)
    # four corner towers
    for dx in (-48, -20, 20, 48):
        d.rectangle((cx + (dx-6)*s, base - 100*s, cx + (dx+6)*s, base - 70*s), fill=color)
        d.polygon([(cx+(dx-8)*s, base-100*s), (cx+dx*s, base-115*s), (cx+(dx+8)*s, base-100*s)], fill=color)
    # steps
    for i in range(3):
        d.rectangle((cx - (60+i*8)*s, base + i*6*s, cx + (60+i*8)*s, base + (i+1)*6*s), fill=color)

def draw_skyline(d, W, H, base, color, seed=7, windows=True):
    rnd = random.Random(seed)
    x = 0
    while x < W:
        w = rnd.randint(int(W * 0.025), int(W * 0.055))
        h = rnd.randint(int(H * 0.12), int(H * 0.38))
        y = base - h
        d.rectangle((x, y, x + w, base + 20), fill=color)
        if rnd.random() < 0.3:
            d.polygon([(x, y), (x + w // 2, y - w // 2), (x + w, y)], fill=color)
        if windows:
            for wy in range(y + 10, base - 8, max(12, H // 35)):
                for wx in range(x + 4, x + w - 4, max(8, w // 4)):
                    if rnd.random() < 0.25:
                        d.rectangle((wx, wy, wx + max(3, W // 400), wy + max(3, H // 120)), fill=OCHRE + (255,))
        x += w

def draw_mast(d, mx, base, height, color, waves=True, wave_col=MAG):
    """Radio mast with cross-arms and broadcast arcs — thick for small-size."""
    half = max(8, height // 45)
    d.polygon([(mx - half, base), (mx - half // 2, base - height), (mx + half // 2, base - height), (mx + half, base)], fill=color)
    for i in range(1, 5):
        yy = base - int(height * i / 5)
        arm = int(18 + i * 6)
        d.rectangle((mx - arm, yy - 3, mx + arm, yy + 3), fill=color)
    tip = base - height
    d.ellipse((mx - 8, tip - 8, mx + 8, tip + 8), fill=wave_col + (255,))
    if waves:
        for k in range(1, 4):
            r = k * height // 7
            d.arc((mx - r, tip - r, mx + r, tip + r), 200, 340, fill=wave_col + (255,), width=max(6, height // 28))

def draw_ferry(d, cx, cy, scale, color):
    s = scale
    d.polygon([
        (cx - 100*s, cy), (cx - 90*s, cy + 22*s), (cx + 85*s, cy + 22*s), (cx + 110*s, cy),
        (cx + 95*s, cy - 12*s), (cx - 85*s, cy - 12*s)
    ], fill=color)
    d.rectangle((cx - 50*s, cy - 40*s, cx + 60*s, cy - 12*s), fill=color)
    d.rectangle((cx - 25*s, cy - 58*s, cx + 40*s, cy - 40*s), fill=color)
    for i in range(5):
        wx = cx - 40*s + i * 20*s
        d.rectangle((wx, cy - 32*s, wx + 12*s, cy - 18*s), fill=NIGHT + (255,))
    d.rectangle((cx + 15*s, cy - 88*s, cx + 35*s, cy - 58*s), fill=color)
    d.ellipse((cx + 12*s, cy - 96*s, cx + 38*s, cy - 85*s), fill=color)
    d.line([(cx + 100*s, cy - 12*s), (cx + 100*s, cy - 40*s)], fill=color, width=max(2, int(3*s)))

def draw_tram(d, cx, cy, scale, color):
    s = scale
    d.rounded_rectangle((cx - 70*s, cy - 30*s, cx + 70*s, cy + 20*s), radius=int(8*s), fill=color)
    # windows
    for i in range(4):
        wx = cx - 55*s + i * 30*s
        d.rectangle((wx, cy - 22*s, wx + 20*s, cy - 5*s), fill=NIGHT + (255,))
    # pantograph / wires attachment
    d.line([(cx, cy - 30*s), (cx, cy - 50*s)], fill=color, width=max(2, int(3*s)))
    d.line([(cx - 20*s, cy - 50*s), (cx + 20*s, cy - 50*s)], fill=color, width=max(2, int(2*s)))

# ═══════════════════════════════════════════════════════════════
# PROFILE ICONS (5)
# ═══════════════════════════════════════════════════════════════

def icon_a_toko_mask():
    """A: Toko face as papercut mask on magenta disc with ochre ring."""
    c = Image.new('RGBA', (1080, 1080), NIGHT + (255,))
    # outer ochre papercut ring
    ring = solid_ellipse((1080, 1080), OCHRE, (40, 40, 1040, 1040))
    sheet(c, ring, (0, 0), lift=18, seed=1)
    # magenta disc
    disc = solid_ellipse((1080, 1080), MAG, (90, 90, 990, 990))
    sheet(c, disc, (0, 0), lift=14, seed=2)
    # cream inner
    inner = solid_ellipse((900, 900), CREAM, (0, 0, 900, 900))
    sheet(c, inner, (90, 90), lift=8, seed=3)
    # Toko face in deep ink
    face = toko_face(620, INK)
    fx = (1080 - face.width) // 2
    fy = (1080 - face.height) // 2 + 20
    sheet(c, face, (fx, fy), lift=10, tex=0.2, seed=4)
    return c

def icon_b_toko_mic():
    """B: Toko face behind a broadcast mic — papercut layers."""
    c = Image.new('RGBA', (1080, 1080), NIGHT + (255,))
    # dark card circle
    disc = solid_ellipse((1000, 1000), DEEP, (0, 0, 1000, 1000))
    sheet(c, disc, (40, 40), lift=16, seed=5)
    # magenta accent arc (left)
    arc_im = Image.new('RGBA', (1080, 1080), (0, 0, 0, 0))
    ImageDraw.Draw(arc_im).arc((80, 80, 1000, 1000), 200, 340, fill=MAG + (255,), width=28)
    sheet(c, arc_im, (0, 0), lift=6, seed=6)
    # Toko on cream rounded card
    card = Image.new('RGBA', (700, 700), (0, 0, 0, 0))
    ImageDraw.Draw(card).rounded_rectangle((0, 0, 700, 700), radius=60, fill=CREAM + (255,))
    sheet(c, card, (190, 120), lift=14, seed=7)
    face = toko_face(480, MAG)
    sheet(c, face, ((1080 - face.width) // 2, 180), lift=8, tex=0.15, seed=8)
    # mic silhouette (bottom, overlapping)
    mic = Image.new('RGBA', (1080, 1080), (0, 0, 0, 0))
    d = ImageDraw.Draw(mic)
    # grille head
    d.ellipse((390, 720, 690, 1020), fill=OCHRE + (255,))
    d.ellipse((420, 750, 660, 990), fill=MIDN + (255,))
    # grille lines
    for i in range(5):
        yy = 780 + i * 40
        d.arc((430, yy - 80, 650, yy + 80), 200, 340, fill=OCHRE + (255,), width=4)
    # stem
    d.rectangle((520, 1000, 560, 1080), fill=OCHRE + (255,))
    # stand base arc
    d.pieslice((480, 1040, 600, 1120), 180, 360, fill=OCHRE + (255,))
    sheet(c, mic, (0, 0), lift=12, seed=9)
    return c

def icon_c_mast():
    """C: Papercut radio mast with magenta waves on dark disc."""
    c = Image.new('RGBA', (1080, 1080), NIGHT + (255,))
    disc = solid_ellipse((1000, 1000), DEEP, (0, 0, 1000, 1000))
    sheet(c, disc, (40, 40), lift=16, seed=10)
    ground = solid_ellipse((900, 200), MIDN, (0, 0, 900, 200))
    sheet(c, ground, (90, 820), lift=6, seed=11)
    mast = Image.new('RGBA', (1080, 1080), (0, 0, 0, 0))
    draw_mast(ImageDraw.Draw(mast), 540, 900, 620, CREAM + (255,), waves=True, wave_col=MAG)
    sheet(c, mast, (0, 0), lift=14, seed=12)
    base = solid_rect((200, 60), OCHRE, (0, 0, 200, 60))
    sheet(c, base, (440, 870), lift=8, seed=13)
    return c

def icon_d_cathedral():
    """D: Helsinki Cathedral silhouette with magenta broadcast arc."""
    c = Image.new('RGBA', (1080, 1080), NIGHT + (255,))
    disc = solid_ellipse((1000, 1000), DEEP, (0, 0, 1000, 1000))
    sheet(c, disc, (40, 40), lift=16, seed=14)
    # ochre dusk glow behind
    glow = Image.new('RGBA', (1080, 1080), (0, 0, 0, 0))
    ImageDraw.Draw(glow).ellipse((200, 100, 880, 700), fill=OCHRE + (55,))
    glow = glow.filter(ImageFilter.GaussianBlur(60))
    c.alpha_composite(glow)
    # cathedral
    cath = Image.new('RGBA', (1080, 1080), (0, 0, 0, 0))
    draw_cathedral(ImageDraw.Draw(cath), 540, 880, 4.2, CREAM + (255,))
    sheet(c, cath, (0, 0), lift=16, seed=15)
    # broadcast arc from dome
    arc = Image.new('RGBA', (1080, 1080), (0, 0, 0, 0))
    d = ImageDraw.Draw(arc)
    for k, w in [(1, 10), (2, 7), (3, 5)]:
        r = 80 + k * 70
        d.arc((540 - r, 200 - r // 2, 540 + r, 200 + r * 2), 200, 340, fill=MAG + (255,), width=w)
    sheet(c, arc, (0, 0), lift=6, seed=16)
    # ground
    gnd = solid_rect((900, 80), MIDN, (0, 0, 900, 80))
    sheet(c, gnd, (90, 900), lift=4, seed=17)
    return c

def icon_e_monogram():
    """E: RFH papercut monogram — stacked letters on ochre card."""
    c = Image.new('RGBA', (1080, 1080), NIGHT + (255,))
    disc = solid_ellipse((1000, 1000), DEEP, (0, 0, 1000, 1000))
    sheet(c, disc, (40, 40), lift=16, seed=18)
    # ochre rounded square
    card = Image.new('RGBA', (780, 780), (0, 0, 0, 0))
    ImageDraw.Draw(card).rounded_rectangle((0, 0, 780, 780), radius=80, fill=OCHRE + (255,))
    sheet(c, card, (150, 150), lift=18, seed=19)
    # magenta inset
    inset = Image.new('RGBA', (680, 680), (0, 0, 0, 0))
    ImageDraw.Draw(inset).rounded_rectangle((0, 0, 680, 680), radius=60, fill=MAG + (255,))
    sheet(c, inset, (200, 200), lift=10, seed=20)
    # RFH letters as cream papercut blocks
    letters = Image.new('RGBA', (1080, 1080), (0, 0, 0, 0))
    d = ImageDraw.Draw(letters)
    f = ImageFont.truetype(BOLD, 220)
    # tight stacked / overlapping monogram look — single line bold RFH
    d.text((540, 520), 'RFH', font=f, fill=CREAM + (255,), anchor='mm')
    # small underline
    d.rectangle((320, 660, 760, 678), fill=CREAM + (255,))
    sheet(c, letters, (0, 0), lift=12, tex=0.15, seed=21)
    return c

# ═══════════════════════════════════════════════════════════════
# BANNERS (4 options × X + YouTube)
# ═══════════════════════════════════════════════════════════════

def wordmark(c, cx, cy, size, maxw=None, accent=True):
    d = ImageDraw.Draw(c)
    f = ImageFont.truetype(BOLD, size)
    word = 'RADIO FREE HELSINKI'
    while maxw and f.getlength(word) > maxw and size > 12:
        size -= 2; f = ImageFont.truetype(BOLD, size)
    d.text((cx, cy), word, font=f, fill=CREAM + (255,), anchor='mm')
    if accent:
        tw = f.getlength(word)
        rw = int(tw * 0.18)
        ry = cy + int(size * 0.85)
        d.rectangle((cx - rw // 2, ry, cx + rw // 2, ry + max(3, size // 22)), fill=MAG + (255,))
    return size

def banner_1_minimal(W, H, sx, sy, sw, sh, name, x_clear=False):
    """Minimal: flat dark + wordmark + magenta rule. X: wordmark right."""
    c = Image.new('RGBA', (W, H), NIGHT + (255,))
    if x_clear:
        # wordmark in right half, upper
        wordmark(c, sx + sw - sw // 3, sy + sh // 2 - 10, int(sh * 0.2), maxw=sw * 0.55)
    else:
        wordmark(c, sx + sw // 2, sy + sh // 2, int(sh * 0.18), maxw=sw * 0.85)
    c.convert('RGB').save(OUT + name)

def banner_2_skyline(W, H, sx, sy, sw, sh, name, x_clear=False):
    """Layered papercut skyline at dusk + wordmark."""
    c = Image.new('RGBA', (W, H), NIGHT + (255,))
    # ochre dusk gradient glow
    glow = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(glow).ellipse((-W * 0.1, -H * 0.6, W * 1.1, H * 0.7), fill=OCHRE + (40,))
    c.alpha_composite(glow.filter(ImageFilter.GaussianBlur(H // 6)))
    # three papercut skyline layers
    for i, (col, hf, seed, lift) in enumerate([
        ((36, 38, 58), 0.55, 30, 8),
        ((24, 26, 42), 0.38, 31, 12),
        ((14, 15, 24), 0.22, 32, 16),
    ]):
        lay = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        draw_skyline(ImageDraw.Draw(lay), W, H, int(H * 0.92), col + (255,), seed=seed, windows=(i == 2))
        # cathedral on back layer
        if i == 0:
            draw_cathedral(ImageDraw.Draw(lay), int(W * 0.72), int(H * 0.92), H / 280, col + (255,))
        sheet(c, lay, (0, 0), lift=lift, seed=seed)
    # mast on right of safe area
    mast = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    mx = sx + int(sw * 0.92) if not x_clear else int(W * 0.88)
    draw_mast(ImageDraw.Draw(mast), mx, int(H * 0.92), int(H * 0.55), CREAM + (255,), wave_col=MAG)
    sheet(c, mast, (0, 0), lift=14, seed=33)
    # wordmark panel
    if x_clear:
        # right side, leave bottom-left clear
        panel = Image.new('RGBA', (int(sw * 0.55), int(sh * 0.7)), (0, 0, 0, 0))
        ImageDraw.Draw(panel).rounded_rectangle((0, 0, panel.width - 1, panel.height - 1), radius=12, fill=NIGHT + (200,))
        px = sx + sw - panel.width - 20
        py = sy + (sh - panel.height) // 2 - 20
        sheet(c, panel, (px, py), lift=10, seed=34)
        wordmark(c, px + panel.width // 2, py + panel.height // 2, int(sh * 0.16), maxw=panel.width * 0.9)
    else:
        panel = Image.new('RGBA', (int(sw * 0.7), int(sh * 0.72)), (0, 0, 0, 0))
        ImageDraw.Draw(panel).rounded_rectangle((0, 0, panel.width - 1, panel.height - 1), radius=16, fill=NIGHT + (210,))
        px = sx + (sw - panel.width) // 2
        py = sy + (sh - panel.height) // 2
        sheet(c, panel, (px, py), lift=12, seed=34)
        wordmark(c, px + panel.width // 2, py + panel.height // 2, int(sh * 0.17), maxw=panel.width * 0.88)
    c.convert('RGB').save(OUT + name)

def banner_3_harbour(W, H, sx, sy, sw, sh, name, x_clear=False):
    """Harbour + ferry papercut; wordmark kept clear of the ferry."""
    c = Image.new('RGBA', (W, H), NIGHT + (255,))
    water = solid_rect((W, int(H * 0.45)), (18, 28, 48), (0, 0, W, int(H * 0.45)))
    sheet(c, water, (0, int(H * 0.55)), lift=4, seed=40)
    line = solid_rect((W, max(4, H // 80)), OCHRE, (0, 0, W, max(4, H // 80)))
    sheet(c, line, (0, int(H * 0.55)), lift=2, seed=41)
    shore = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    draw_skyline(ImageDraw.Draw(shore), W, H, int(H * 0.55), DEEP + (255,), seed=42, windows=False)
    draw_cathedral(ImageDraw.Draw(shore), int(W * 0.28), int(H * 0.55), H / 300, DEEP + (255,))
    sheet(c, shore, (0, 0), lift=10, seed=42)
    ferry = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    if x_clear:
        fx = int(W * 0.78); fy = int(H * 0.70)
    else:
        fx = sx + int(sw * 0.82); fy = sy + sh + int(H * 0.08)
    draw_ferry(ImageDraw.Draw(ferry), fx, fy, H / 180, CREAM + (255,))
    sheet(c, ferry, (0, 0), lift=14, seed=43)
    refl = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    rd = ImageDraw.Draw(refl)
    for i in range(5):
        rd.rectangle((fx - 50 + i * 10, fy + 30 + i * 10, fx + 50 - i * 10, fy + 30 + i * 10 + 3), fill=MAG + (160,))
    sheet(c, refl, (0, 0), lift=2, seed=44)
    if x_clear:
        wordmark(c, sx + int(sw * 0.68), sy + int(sh * 0.38), int(sh * 0.18), maxw=sw * 0.55)
    else:
        panel = Image.new('RGBA', (int(sw * 0.72), int(sh * 0.68)), (0, 0, 0, 0))
        ImageDraw.Draw(panel).rounded_rectangle((0, 0, panel.width - 1, panel.height - 1), radius=14, fill=NIGHT + (210,))
        px = sx + (sw - panel.width) // 2
        py = sy + (sh - panel.height) // 2
        sheet(c, panel, (px, py), lift=10, seed=45)
        wordmark(c, px + panel.width // 2, py + panel.height // 2, int(sh * 0.16), maxw=panel.width * 0.88)
    c.convert('RGB').save(OUT + name)

def banner_4_tram(W, H, sx, sy, sw, sh, name, x_clear=False):
    """Tram wires + papercut tram + mast, wordmark."""
    c = Image.new('RGBA', (W, H), NIGHT + (255,))
    # subtle ochre glow top
    glow = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(glow).rectangle((0, 0, W, int(H * 0.3)), fill=OCHRE + (25,))
    c.alpha_composite(glow.filter(ImageFilter.GaussianBlur(40)))
    # overhead wire network
    wires = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    wd = ImageDraw.Draw(wires)
    for i in range(3):
        yy = int(H * (0.18 + i * 0.06))
        wd.line([(0, yy), (W, yy + int(H * 0.02 * (i - 1)))], fill=OCHRE + (200,), width=max(2, H // 200))
    # hanging drops
    rnd = random.Random(50)
    for i in range(12):
        x = int(W * (0.1 + i * 0.07))
        wd.line([(x, int(H * 0.18)), (x + rnd.randint(-20, 20), int(H * 0.4))], fill=OCHRE + (160,), width=max(1, H // 300))
    sheet(c, wires, (0, 0), lift=4, seed=50)
    # street silhouette
    street = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    draw_skyline(ImageDraw.Draw(street), W, H, int(H * 0.85), MIDN + (255,), seed=51, windows=True)
    sheet(c, street, (0, 0), lift=8, seed=51)
    # tram
    tram = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    tx = sx + int(sw * 0.2) if not x_clear else int(W * 0.55)
    draw_tram(ImageDraw.Draw(tram), tx, int(H * 0.72), H / 160, OCHRE + (255,))
    sheet(c, tram, (0, 0), lift=14, seed=52)
    # mast right
    mast = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    mx = sx + int(sw * 0.9) if not x_clear else int(W * 0.9)
    draw_mast(ImageDraw.Draw(mast), mx, int(H * 0.85), int(H * 0.5), CREAM + (255,), wave_col=MAG)
    sheet(c, mast, (0, 0), lift=12, seed=53)
    if x_clear:
        wordmark(c, sx + int(sw * 0.7), sy + int(sh * 0.32), int(sh * 0.17), maxw=sw * 0.5)
    else:
        # dark panel for readability
        panel = Image.new('RGBA', (int(sw * 0.65), int(sh * 0.65)), (0, 0, 0, 0))
        ImageDraw.Draw(panel).rounded_rectangle((0, 0, panel.width - 1, panel.height - 1), radius=14, fill=NIGHT + (200,))
        px = sx + (sw - panel.width) // 2
        py = sy + (sh - panel.height) // 2
        sheet(c, panel, (px, py), lift=10, seed=54)
        wordmark(c, px + panel.width // 2, py + panel.height // 2, int(sh * 0.16), maxw=panel.width * 0.88)
    c.convert('RGB').save(OUT + name)

def yt_check(src, out):
    y = Image.open(src).convert('RGBA')
    o = ImageDraw.Draw(y)
    o.rectangle((507, 508, 2053, 931), outline=(255, 0, 0), width=6)
    o.rectangle((0, 0, 2559, 1439), outline=(0, 160, 255), width=6)
    f = ImageFont.truetype(BOLD, 36)
    o.text((1280, 960), '1546×423 safe area', font=f, fill=(255, 60, 60), anchor='mt')
    y.convert('RGB').save(out)

# ── generate all ──
print('icons...')
icons = [
    ('icon-a-toko-mask', icon_a_toko_mask, 'Toko face as papercut mask on magenta disc with ochre ring'),
    ('icon-b-toko-mic', icon_b_toko_mic, 'Toko face on cream card behind a papercut ochre broadcast mic'),
    ('icon-c-mast', icon_c_mast, 'Papercut radio mast with magenta broadcast waves'),
    ('icon-d-cathedral', icon_d_cathedral, 'Helsinki Cathedral silhouette with magenta broadcast arcs'),
    ('icon-e-monogram', icon_e_monogram, 'RFH papercut monogram on ochre/magenta stacked cards'),
]
descs = {}
for name, fn, desc in icons:
    im = fn()
    path = OUT + name + '-1080.png'
    im.convert('RGB').save(path)
    circ_preview(path, OUT + name + '-circle.png', 400)
    circ_preview(path, OUT + name + '-circle-96.png', 96)
    descs[name] = desc
    print(' ', name)

print('banners...')
banners = [
    ('banner-1-minimal', banner_1_minimal, 'Minimal: flat dark field, cream wordmark, thin magenta rule'),
    ('banner-2-skyline', banner_2_skyline, 'Layered papercut Helsinki skyline at dusk with mast and wordmark panel'),
    ('banner-3-harbour', banner_3_harbour, 'Harbour shoreline, cathedral, ferry and ochre waterline'),
    ('banner-4-tram', banner_4_tram, 'Tram wires, ochre tram, radio mast and skyline'),
]
for name, fn, desc in banners:
    descs[name] = desc
    # X header
    fn(1500, 500, 520, 40, 920, 280, name + '-x-1500x500.png', x_clear=True)
    # YouTube
    fn(2560, 1440, 507, 508, 1546, 423, name + '-youtube-2560x1440.png', x_clear=False)
    yt_check(OUT + name + '-youtube-2560x1440.png', OUT + name + '-youtube-safe-check.png')
    print(' ', name)

# contact sheet
print('contact sheet...')
icons_n = [n for n,_,_ in icons]
banners_n = [n for n,_,_ in banners]
CS_W = 1600
parts = []
title = Image.new('RGB', (CS_W, 40), (30, 30, 36))
ImageDraw.Draw(title).text((20, 10), 'Radio Free Helsinki — brand options', font=ImageFont.truetype(BOLD, 22), fill=CREAM)
parts.append(title)
# big icons
row = Image.new('RGB', (CS_W, 240), (40, 40, 48))
for i, n in enumerate(icons_n):
    row.paste(Image.open(OUT + n + '-1080.png').resize((200, 200), Image.LANCZOS), (50 + i * 310, 20))
parts.append(row)
# 96px circles
row = Image.new('RGB', (CS_W, 130), (40, 40, 48))
d = ImageDraw.Draw(row)
fnt = ImageFont.truetype(BOLD, 16)
for i, n in enumerate(icons_n):
    src = Image.open(OUT + n + '-1080.png').resize((96, 96), Image.LANCZOS).convert('RGBA')
    k = Image.new('L', (96, 96), 0); ImageDraw.Draw(k).ellipse((0, 0, 95, 95), fill=255)
    bg = Image.new('RGBA', (96, 96), (40, 40, 48, 255)); bg.paste(src, (0, 0), k)
    row.paste(bg.convert('RGB'), (102 + i * 310, 8))
    label = n.replace('icon-', '').replace('-', ' ')
    d.text((150 + i * 310, 112), label, font=fnt, fill=(180, 180, 180), anchor='mt')
parts.append(row)
# banners
for n in banners_n:
    r = Image.new('RGB', (CS_W, 220), (30, 30, 36))
    xh = Image.open(OUT + n + '-x-1500x500.png').resize((960, 320), Image.LANCZOS).crop((0, 40, 960, 200))
    yt = Image.open(OUT + n + '-youtube-safe-check.png').resize((560, 315), Image.LANCZOS).crop((0, 55, 560, 215))
    r.paste(xh, (20, 30)); r.paste(yt, (1000, 30))
    ImageDraw.Draw(r).text((20, 6), n, font=fnt, fill=(200, 200, 200))
    parts.append(r)
Htot = sum(p.height for p in parts)
cs = Image.new('RGB', (CS_W, Htot), (30, 30, 36))
y = 0
for p in parts:
    cs.paste(p, (0, y)); y += p.height
cs.save(OUT + 'contact-sheet.png')

# README
lines = ['# Radio Free Helsinki — brand options\n',
         'House style: dark papercut Helsinki (radiofree/studio/paper.js sheets +\n',
         'fibre texture + soft lift shadows), ochre #e3a33a and magenta #f0027f.\n',
         'Toko face from toko/master/face-yellow-on-white.jpg (BRAND.md canon).\n',
         'No art-motion folder on the RFH branch; clay + paper.js are the reference.\n\n',
         '## Profile icons (1080×1080 + circle previews)\n']
for name, _, desc in icons:
    lines.append(f'- `{name}-1080.png` / `-circle.png` / `-circle-96.png` — {desc}\n')
lines.append('\n## Banners (X 1500×500 + YouTube 2560×1440 + safe-area check)\n')
for name, _, desc in banners:
    lines.append(f'- `{name}-x-1500x500.png` / `-youtube-2560x1440.png` / `-youtube-safe-check.png` — {desc}\n')
lines.append('\nSee `contact-sheet.png` for a visual overview. Regenerate with `make_options.py`.\n')
open(OUT + 'README.md', 'w').write(''.join(lines))
print('done')
