#!/usr/bin/env python3
"""cards-sheet.png: six sample twist cards (CARDS.md), drawn with make_bible.event_card + the traced Toko face."""
import os
from PIL import Image, ImageDraw
import make_bible as B
CARDS = [  # (twist, tag, skin, mood, line, A, B)
 ('1 · The Sealed Parcel', 'run-modifier → meta', B.DAY, 'info', 'The label says: you\u2019ll know the stop.', ('Ride the 6 and watch', '+0 s'), ('Ask at the kiosk', '+40 s')),
 ('2 · Same Morning', 'meta', B.DAY, 'opportunity', 'You again. The 4 was early yesterday too.', ('Trust her', '+0 s'), ('Check the board', '+25 s')),
 ('3 · The Other Courier', 'encounter → mutator', B.DAY, 'warning', 'She took your drop at Kamppi. Smiled about it.', ('Take hers at Hakaniemi', '+60 s'), ('Let it go', '+0 s')),
 ('4 · The Retired Number', 'mutator (Night)', B.NIGHT, 'notice', 'The screen says 3B. There is no 3B.', ('Wait for it', '+120 s'), ('Take the real 3', '+0 s')),
 ('5 · The Inspector', 'encounter', B.DAY, 'notice', 'Tickets, please. Yours is in the parcel, isn\u2019t it?', ('Show the app', '+15 s'), ('Open the parcel', '+60 s')),
 ('6 · Dispatch Changes Its Mind', 'meta · Act III', B.DAY, 'opportunity', 'Just one. By hand. She asked for you.', ('Take it', '+0 s'), ('Send the other courier', '+0 s')),
]
TW, TH, M = 1100, 330, 60
W, H = M * 2 + TW * 2 + 40, 170 + 3 * (TH + 30)
sheet = Image.new('RGBA', (W, H), B.hx('#fbfaf6')); d = ImageDraw.Draw(sheet)
INK, DIM = B.hx(B.CSS['ink']), B.hx(B.CSS['dim'])
d.text((M, 46), 'TOKO MOVE · twist cards', font=B.font(48, 800), fill=INK)
d.text((M + 2, 108), 'Toko face (traced master, never magenta) · one line · two buttons priced in seconds — from CARDS.md', font=B.font(20, 450), fill=DIM)
for i, (name, tag, skin, mood, line, a, b) in enumerate(CARDS):
    x = M + (i % 2) * (TW + 40); y = 170 + (i // 2) * (TH + 30)
    bg = B.hx(skin['paper']) if skin['name'] == 'night' else B.hx('#eef1ec')
    d.rounded_rectangle([x, y, x + TW, y + TH], radius=18, fill=bg)
    tc = B.hx('#c4ced4') if skin['name'] == 'night' else INK; tdim = B.hx('#98a4ab') if skin['name'] == 'night' else DIM
    d.text((x + 30, y + 22), name, font=B.font(22, 750), fill=tc)
    d.text((x + TW - 30, y + 24), f'{tag} · {mood}', font=B.font(16, 550), fill=tdim, anchor='ra')
    B.event_card(d, x + 45, y + 80, TW - 90, skin, 1.0, line, a, b, mood)
sheet.convert('RGB').save(os.path.join(B.HERE, 'cards-sheet.png'), optimize=True); print('wrote cards-sheet.png', W, H)
