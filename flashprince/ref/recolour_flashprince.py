# Conrad's full action sheet, colour-matched to the immutable v18 run.
#
# The approved run uses seven colours. Every other action keeps Conrad's exact
# raster silhouette and frame order, but is reduced to that same palette so the
# hero no longer changes clothes when he starts or finishes running.
from PIL import Image
import numpy as np

SRC, OUT = 'conrad.png', 'flash-prince.png'
CELL_W, CELL_H = 32, 48

INK = (23, 25, 28)            # #17191c
SKIN = (190, 112, 78)         # #be704e
SHIRT_HI = (214, 232, 220)    # #d6e8dc
SHIRT = (143, 200, 192)       # #8fc8c0
SHIRT_LO = (81, 132, 128)     # #518480
TROUSER = (79, 120, 168)      # #4f78a8
TROUSER_LO = (42, 70, 101)    # #2a4665

MAP = {
    # trousers
    (132, 132, 247): TROUSER,
    (115, 115, 231): TROUSER,
    (99, 99, 198): TROUSER_LO,
    (82, 82, 181): TROUSER_LO,
    (66, 66, 165): INK,
    # upper body; the run is a light shirt, not the rejected dark jacket
    (148, 99, 49): SHIRT_HI,
    (115, 82, 33): SHIRT,
    (99, 66, 16): SHIRT_LO,
    (99, 49, 0): SHIRT_LO,
    (181, 33, 82): SHIRT_HI,
    (148, 16, 66): SHIRT,
    # skin and light footwear/details
    (198, 115, 99): SKIN,
    (198, 198, 198): SHIRT_HI,
    (132, 132, 132): SHIRT_LO,
}

A = np.array(Image.open(SRC).convert('RGB'))
H, W = A.shape[:2]
out = np.zeros_like(A)

# The rip's black cells are transparent at runtime. Near-white is sheet chrome,
# not character ink, and stays black too.
ink = ~(((A[:, :, 0] == 0) & (A[:, :, 1] == 0) & (A[:, :, 2] == 0)) |
        ((A[:, :, 0] > 240) & (A[:, :, 1] > 240) & (A[:, :, 2] > 240)))

# Hair shares a source brown with the shirt. As in the previous repaint, the
# top eight ink rows in each cell are the head region; that shared brown becomes
# the dark hair/edge colour there and shirt shadow everywhere else.
head = np.zeros(ink.shape, bool)
for r in range(H // CELL_H):
    for c in range(W // CELL_W):
        y0, x0 = r * CELL_H, c * CELL_W
        cell = ink[y0:y0 + CELL_H, x0:x0 + CELL_W]
        ys = cell.nonzero()[0]
        if len(ys) < 20:
            continue
        top = int(ys.min())
        head[y0 + top:y0 + min(CELL_H, top + 8), x0:x0 + CELL_W] = True

# A one-pixel dark contour gives the non-run frames the same clean definition
# as the locked run. Dilation is cell-local so neighbouring frames never touch.
for r in range(H // CELL_H):
    for c in range(W // CELL_W):
        y0, x0 = r * CELL_H, c * CELL_W
        cell = ink[y0:y0 + CELL_H, x0:x0 + CELL_W]
        if not cell.any():
            continue
        dilated = cell.copy()
        dilated[1:, :] |= cell[:-1, :]
        dilated[:-1, :] |= cell[1:, :]
        dilated[:, 1:] |= cell[:, :-1]
        dilated[:, :-1] |= cell[:, 1:]
        out[y0:y0 + CELL_H, x0:x0 + CELL_W][dilated] = INK

for src, dst in MAP.items():
    mask = np.all(A == src, axis=2) & ink
    if src == (99, 49, 0):
        out[mask & head] = INK
        out[mask & ~head] = SHIRT_LO
    else:
        out[mask] = dst

Image.fromarray(out.astype('uint8')).save(OUT, optimize=True)
print(f'{OUT}: locked v18 seven-colour palette')
