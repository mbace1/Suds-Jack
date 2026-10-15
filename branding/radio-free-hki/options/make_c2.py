#!/usr/bin/env python3
"""icon-c2-lattice-mast — traditional steel lattice transmitter mast (papercut)."""
from PIL import Image, ImageDraw
import math
from make_options import (
    OUT, OCHRE, MAG, NIGHT, DEEP, MIDN, CREAM,
    sheet, solid_ellipse, circ_preview,
)

def lattice_mast_rgba(W=1080, H=1080):
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    base_y, tip_y = 880, 200
    base_half, tip_half, leg_w = 95, 8, 14
    col, mag = CREAM + (255,), MAG + (255,)

    def x_at(y, side):
        t = (y - tip_y) / (base_y - tip_y)
        half = tip_half + (base_half - tip_half) * t
        return 540 + side * half

    for side in (-1, 1):
        pts = []
        for y in range(tip_y, base_y + 1, 4):
            pts.append((x_at(y, side) + side * (leg_w // 2), y))
        for y in range(base_y, tip_y - 1, -4):
            pts.append((x_at(y, side) - side * (leg_w // 2), y))
        d.polygon(pts, fill=col)

    n_horiz = 7
    for i in range(1, n_horiz + 1):
        t = i / (n_horiz + 1)
        y = int(tip_y + (base_y - tip_y) * t)
        xl, xr = x_at(y, -1), x_at(y, 1)
        bw = max(6, int(12 - 6 * t))
        d.rectangle((xl, y - bw // 2, xr, y + bw // 2), fill=col)

    ys = [tip_y + 20] + [int(tip_y + (base_y - tip_y) * i / (n_horiz + 1)) for i in range(1, n_horiz + 1)] + [base_y]
    brace_w = 7

    def thick_line(p0, p1, w):
        dx, dy = p1[0] - p0[0], p1[1] - p0[1]
        L = math.hypot(dx, dy) or 1
        nx, ny = -dy / L * w / 2, dx / L * w / 2
        d.polygon([
            (p0[0] + nx, p0[1] + ny), (p0[0] - nx, p0[1] - ny),
            (p1[0] - nx, p1[1] - ny), (p1[0] + nx, p1[1] + ny),
        ], fill=col)

    for i in range(len(ys) - 1):
        y0, y1 = ys[i], ys[i + 1]
        if y1 - y0 < 40:
            continue
        xl0, xr0 = x_at(y0, -1) + leg_w // 2, x_at(y0, 1) - leg_w // 2
        xl1, xr1 = x_at(y1, -1) + leg_w // 2, x_at(y1, 1) - leg_w // 2
        thick_line((xl0, y0), (xr1, y1), brace_w)
        thick_line((xr0, y0), (xl1, y1), brace_w)

    d.ellipse((540 - 16, tip_y - 28, 540 + 16, tip_y + 4), fill=mag)
    d.rectangle((540 - 4, tip_y - 55, 540 + 4, tip_y - 20), fill=col)
    d.ellipse((540 - 7, tip_y - 68, 540 + 7, tip_y - 54), fill=mag)
    for k in range(1, 4):
        r = 70 + k * 95
        d.arc((540 - r, tip_y - 40 - r, 540 + r, tip_y - 40 + r), 200, 340,
              fill=mag, width=max(10, 18 - k * 2))
    d.rectangle((540 - 110, base_y - 8, 540 + 110, base_y + 28), fill=OCHRE + (255,))
    d.rectangle((540 - 130, base_y + 28, 540 + 130, base_y + 48), fill=OCHRE + (255,))
    return im

def main():
    c = Image.new('RGBA', (1080, 1080), NIGHT + (255,))
    sheet(c, solid_ellipse((1000, 1000), DEEP, (0, 0, 1000, 1000)), (40, 40), lift=16, seed=60)
    sheet(c, solid_ellipse((900, 180), MIDN, (0, 0, 900, 180)), (90, 840), lift=6, seed=61)
    sheet(c, lattice_mast_rgba(), (0, 0), lift=14, tex=0.25, seed=62)
    stem = OUT + 'icon-c2-lattice-mast'
    c.convert('RGB').save(stem + '-1080.png')
    circ_preview(stem + '-1080.png', stem + '-circle.png', 400)
    circ_preview(stem + '-1080.png', stem + '-circle-96.png', 96)
    print('wrote', stem)

if __name__ == '__main__':
    main()
