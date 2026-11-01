#!/usr/bin/env python3
"""card-closeup.png (1920x1080): the hero of the look. One bible event card large, over a soft crop of the day tram-4 interior.
card-moods.png: the four Toko moods as cards on a clean panel. Needs board/layers/day/169 from make_stills.py."""
import os
from PIL import Image, ImageDraw, ImageFilter
import bible_render as B
from bible_render import hx, font, CSS, DAY, NIGHT
import look
from beats import STAMPS
HERE = os.path.dirname(os.path.abspath(__file__)); L = f'{HERE}/layers/day/169'
W, H = 1920, 1080
bg = None
for n in ('01-outside', '02-car', '03-people', '04-courier', '05-signage'):
    im = Image.open(f'{L}/{n}.png').convert('RGBA'); bg = im if bg is None else Image.alpha_composite(bg, im)
bg = bg.resize((int(W * 1.25), int(H * 1.25)), Image.LANCZOS).crop((int(W * .06), int(H * .02), int(W * .06) + W, int(H * .02) + H))
bg = bg.filter(ImageFilter.GaussianBlur(3)); wash = Image.new('RGBA', (W, H), hx(DAY['paper'], 175)); bg = Image.alpha_composite(bg, wash)
sk, line, b1, b2 = STAMPS['opportunity']; s = 1.75; cw = max(820 * s, look.card_width_needed(line, s))
look.card(bg, sk, (W - cw) / 2, (H - 200 * s) / 2, cw, s, line, b1, b2, 'opportunity')
bg.convert('RGB').save(f'{HERE}/card-closeup.png', optimize=True)
# four moods
CW = 1000; im = Image.new('RGBA', (1920, 860), hx('#eef1ec')); d = ImageDraw.Draw(im)
for i, mood in enumerate(('opportunity', 'info', 'warning', 'notice')):
    sk, line, b1, b2 = STAMPS[mood]; x = 60 + (i % 2) * 930; y = 170 + (i // 2) * 360
    if sk['name'] == 'night': d.rounded_rectangle([x - 20, y - 40, x + 860, y + 300], radius=22, fill=hx(NIGHT['paper']))
    look.card(im, sk, x, y, 840, .98, line, b1, b2, mood)
    d.text((x, y + 230 if sk['name'] != 'night' else y + 230), f'{mood} · {B.FACE_MOODS[mood]["ground"].lower()}', font=font(17, 650),
           fill=hx('#98a4ab' if sk['name'] == 'night' else CSS['dim']))
d.text((60, 50), 'Event card — Toko face · one line · two buttons priced in seconds', font=font(34, 800), fill=hx(CSS['ink']))
im.convert('RGB').save(f'{HERE}/card-moods.png', optimize=True); print('cards')
