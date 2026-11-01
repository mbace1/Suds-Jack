"""Shared UI bits for transitions + MP4: title / mutator chips (Inter, bible palette)."""
from PIL import Image, ImageDraw
import bible_render as B
from bible_render import hx, font, CSS, NIGHT
def blank(w, h): return Image.new('RGBA', (int(w), int(h)), (0, 0, 0, 0))
def chip(kind):
    S = 3; f = font(30 * S, 800); h = 72 * S
    if kind == 'NIGHT': txt, fill, tc, out = 'NIGHT', hx(NIGHT['paper']), hx('#e6edf0'), hx('#2c363d')
    elif kind == 'DISRUPTION': txt, fill, tc, out = 'DISRUPTION', hx(CSS['coral']), hx('#ffffff'), hx('#ffffff')
    else: txt, fill, tc, out = 'SEALED PARCEL', hx(CSS['panel']), hx(CSS['ink']), hx(CSS['rule'])
    tw = ImageDraw.Draw(blank(4, 4)).textlength(txt, font=f) + len(txt) * 3 * S
    lead = h * .9; w = int(tw + lead + 40 * S); im = blank(w + 8 * S, h + 8 * S); d = ImageDraw.Draw(im)
    d.rounded_rectangle([4 * S, 4 * S, 4 * S + w, 4 * S + h], radius=h / 2, fill=fill, outline=out, width=3 * S)
    gx, gy = 4 * S + h / 2 + 4 * S, 4 * S + h / 2; r = h * .32
    if kind == 'NIGHT':                                       # crescent = ground-coloured bite out of a label-grey disc
        d.ellipse([gx - r, gy - r, gx + r, gy + r], fill=hx('#c4ced4')); d.ellipse([gx - r + r * .55, gy - r - r * .2, gx + r + r * .55, gy + r - r * .2], fill=fill)
    elif kind == 'DISRUPTION':
        d.ellipse([gx - r, gy - r, gx + r, gy + r], fill=hx('#ffffff'))
        for sg in (-1, 1): d.rounded_rectangle([gx + sg * r * .32 - r * .14, gy - r * .48, gx + sg * r * .32 + r * .14, gy + r * .48], radius=r * .06, fill=fill)
    else:
        fc = B.toko_face_img(r * 1.25, 'opportunity'); im.alpha_composite(fc, (int(gx - fc.width / 2), int(gy - fc.height / 2)))
    x = 4 * S + lead + 10 * S
    for ch in txt: d.text((x, gy), ch, font=f, fill=tc, anchor='lm'); x += d.textlength(ch, font=f) + 3 * S
    return im.resize((im.width // S, im.height // S), Image.LANCZOS)
