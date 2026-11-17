#!/usr/bin/env python3
"""CONTACT.png: illustration scenes (16:9 + 9:16), card close-up + moods, the day layer stack, transition keyframes,
MP4 frame grabs, and the schematic board stills. Rebuild order: make_scenes.py, make_board.py, make_card_closeup.py,
make_transitions.py, make_sample_mp4.py, then this."""
import os, glob, numpy as np
from PIL import Image, ImageDraw
from bible_render import hx, font, CSS
HERE = os.path.dirname(os.path.abspath(__file__)); P = lambda p: os.path.join(HERE, p)
SW, M = 2400, 60
INK, DIM, RULE = hx(CSS['ink']), hx(CSS['dim']), hx(CSS['rule'])
def checker(w, h, s=14):
    a = (np.arange(h)[:, None] // s + np.arange(w)[None, :] // s) % 2
    return Image.fromarray(np.where(a[..., None] == 1, np.array([226, 229, 226, 255]), np.array([244, 245, 242, 255])).astype(np.uint8))
def thumb(path, w=None, h=None):
    im = Image.open(path).convert('RGBA'); r = (w / im.width) if w else (h / im.height); return im.resize((int(im.width * r), int(im.height * r)), Image.LANCZOS)
rows = []; H = 0
sheet = Image.new('RGBA', (SW, 7000), hx('#fbfaf6')); d = ImageDraw.Draw(sheet)
def put(im, x, y, cap=None, chk=False):
    if chk: sheet.paste(checker(im.width, im.height), (x, y))
    sheet.alpha_composite(im, (x, y)); d.rectangle([x, y, x + im.width, y + im.height], outline=RULE, width=2)
    if cap: d.text((x, y + im.height + 10), cap, font=font(15, 600), fill=DIM)
def section(y, title, sub=''):
    d.line([M, y - 22, SW - M, y - 22], fill=RULE, width=2); d.text((M, y), title, font=font(26, 750), fill=INK)
    if sub: d.text((M, y + 36), sub, font=font(16, 450), fill=DIM)
    return y + 74
d.text((M, 48), 'TOKO MOVE · minimal metro look', font=font(60, 800), fill=INK)
d.text((M + 2, 124), 'pass 3 — zoomed in, varied camera · flat vector after the metro-car + tram refs · CP2077 pose/staging · Bithell event card · one Toko face: the courier', font=font(21, 450), fill=DIM)
d.text((SW - M, 60), 'TOKO MIDORI GAMES', font=font(22, 750), fill=INK, anchor='ra'); d.ellipse([SW - M - 300 - 34, 58, SW - M - 300 - 8, 84], fill=hx('#33b2d2'))
y = section(200, '0  PASS 3 — "can be zoomed in and not always from the sitting side perspective"', 'left: pass 2 wide side-sit (_prev/pass2-side/) · then the refs: metro car, iso tram stop, CP2077 pose/staging')
put(thumb(P('_prev/pass2-side/day-169.png'), w=720), M, y, 'pass 2 (archived): wide, side-on, small figures')
r1 = thumb(P('_refs/ref-metro-interiors.png'), h=405); put(r1, M + 750, y, 'ref: metro car, flat people')
r2 = thumb(P('_refs/ref-iso-tram-shelter.png'), h=405); put(r2, M + 750 + r1.width + 20, y, 'ref: iso tram stop')
cp = '../cyberpunk-metro-2d/_refs/cp2077-metro-ref.jpg'
if os.path.exists(P(cp)): r3 = thumb(P(cp), w=SW - M - (M + 750 + r1.width + r2.width + 40)); put(r3, M + 750 + r1.width + r2.width + 40, y, 'ref: CP2077 (pose + staging only)')
y += 405 + 60
y = section(y, '1  HERO — day · tram 4 · three-quarter across the aisle (CP2077 bench sit, flat)', 'scenes/day-169.png · courier knees-up, parcel in both hands, dozing rider beside, window behind · yellow opportunity card')
put(thumb(P('scenes/day-169.png'), w=1360), M, y, 'scenes/day-169.png')
put(thumb(P('scenes/day-916.png'), h=765), M + 1390, y, 'day-916 (native vertical plate)')
put(thumb(P('scenes/night-916.png'), h=765), M + 1390 + 450, y, 'night-916 (card up on the glass)')
y += 765 + 60
y = section(y, '2  ANGLES — 16:9 masters', 'night · over the shoulder out the rainy glass (info)   strap · standing strap-hold at the door bay (notice)   disruption · iso wide + close platform crop (warning)')
for i, k in enumerate(('night', 'strap')): put(thumb(P(f'scenes/{k}-169.png'), w=1120), M + i * 1160, y, f'scenes/{k}-169.png')
y += 630 + 50
for i, k in enumerate(('disruption', 'disruption-close')): put(thumb(P(f'scenes/{k}-169.png'), w=1120), M + i * 1160, y, f'scenes/{k}-169.png')
y += 630 + 50
y = section(y, '2b  9:16 iso + the event card', 'vertical masters are native layouts, not slices · card: face, one line, two buttons priced in seconds')
for i, k in enumerate(('disruption', 'disruption-close')): put(thumb(P(f'scenes/{k}-916.png'), h=600), M + i * 360, y, f'{k}-916')
put(thumb(P('card-closeup.png'), w=1150), M + 1100, y, 'card-closeup.png')
y += 647 + 50
y = section(y, '3  LAYER STACK — day 16:9 (layers/day/169/, full-frame transparent PNG, back → front)', 'every scene ships its stack + MOTION.md; interiors add 01-outside-tile.png (seamless window scroll)')
names = ['01-outside', '02-car', '03-people', '04-courier', '05-signage', '06-hud', '07-card']
for i, n in enumerate(names):
    t = thumb(P(f'layers/day/169/{n}.png'), w=310); put(t, M + i * 325, y, n, chk=True)
y += 175 + 50
y = section(y, '4  TRANSITIONS — 5 keyframes each (transitions/<name>/f1–f5.png)  ·  MP4 frame grabs (sample-motion.mp4, 1280×720, 11.5 s)', '')
ts = thumb(P('transitions-sheet.png'), h=1150); put(ts, M, y, 'transitions-sheet.png')
gx = M + ts.width + 40; grabs = sorted(glob.glob(P('mp4-frames/grab-*.png')))
gw = (SW - M - gx - 20) // 2
for i, g in enumerate(grabs):
    t = thumb(g, w=gw); put(t, gx + (i % 2) * (gw + 20), y + (i // 2) * (t.height + 44), os.path.basename(g))
y += 1150 + 60
y = section(y, '5  SCHEMATIC BOARD — support stills (board/), same layer logic, bible map', '')
for i, k in enumerate(('day', 'night', 'disruption')): put(thumb(P(f'board/stills/{k}-169.png'), w=560), M + i * 590, y, f'board/stills/{k}-169.png')
nx = M + 3 * 590 + 10
for j, t in enumerate(['Rejected: painted / cyberpunk metro cars (../cyberpunk-metro*/).', 'Kept: the event-card UI. Toko cyan = courier only.',
                       'Isometric only at the stop (ref 2); interiors close + varied angle.', 'No magenta, no A→B route line, no mature content.']):
    d.text((nx, y + 10 + j * 28), t, font=font(16, 600 if j < 2 else 450), fill=INK if j < 2 else DIM)
y += 315 + 50
sheet.crop((0, 0, SW, y)).convert('RGB').save(P('CONTACT.png'), optimize=True); print('CONTACT', SW, y)
