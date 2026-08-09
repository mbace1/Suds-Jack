# Conrad's sheet, repainted as Jimbo.
#
# The sheet is indexed art in fourteen colours, so most of the outfit is one
# lookup: the five blues of his jeans become browns, the two magentas of the
# undershirt become a white tee, the jacket browns become a dark letterman.
#
# Two things are NOT a lookup, because the sheet does not separate them:
#
#   HAIR shares a colour with the jacket — (99,49,0) is both — so the swap is
#   done by REGION instead: inside the top eight rows of a frame it is hair and
#   keeps its brown, below that it is jacket and goes dark.
#
#   SLEEVES cannot be separated at all. The four browns are shading — lit side,
#   shade side, fold, edge — laid across the whole garment, not body-versus-
#   sleeve. Grey sleeves need those pixels picked out by hand, frame by frame.
from PIL import Image
import numpy as np

SRC, OUT = 'conrad.png', 'jimbo.png'
CELL_W, CELL_H = 32, 48

TROUSERS = {                      # blue denim -> brown
    (132, 132, 247): (154, 118, 74),
    (115, 115, 231): (136, 103, 63),
    (99, 99, 198): (116, 87, 53),
    (82, 82, 181): (97, 72, 43),
    (66, 66, 165): (79, 58, 34),
}
TEE = {                           # the undershirt -> a white t-shirt
    (181, 33, 82): (226, 230, 236),
    (148, 16, 66): (188, 194, 206),
}
JACKET = {                        # -> dark letterman
    (99, 66, 16): (42, 46, 64),
    (148, 99, 49): (60, 66, 88),
    (115, 82, 33): (49, 54, 74),
    (99, 49, 0): (31, 35, 51),    # below the head only; above it this is hair
}
HAIR_KEEP = (99, 49, 0)

A = np.array(Image.open(SRC).convert('RGB')).astype(int)
H, W = A.shape[:2]
out = A.copy()

def swap(table, mask=None):
    for src, dst in table.items():
        m = (A[:, :, 0] == src[0]) & (A[:, :, 1] == src[1]) & (A[:, :, 2] == src[2])
        if mask is not None:
            m &= mask
        out[m] = dst

# the head: the top eight rows of whatever is drawn in each cell
ink = ~(((A[:, :, 0] == 0) & (A[:, :, 1] == 0) & (A[:, :, 2] == 0)) |
        ((A[:, :, 0] > 240) & (A[:, :, 1] > 240) & (A[:, :, 2] > 240)))
head = np.zeros(ink.shape, bool)
for r in range(H // CELL_H):
    for c in range(W // CELL_W):
        cell = ink[r * CELL_H:(r + 1) * CELL_H, c * CELL_W:(c + 1) * CELL_W]
        if cell.sum() < 20:
            continue
        top = cell.nonzero()[0].min()
        head[r * CELL_H + top:r * CELL_H + top + 8, c * CELL_W:(c + 1) * CELL_W] = True

swap(TROUSERS)
swap(TEE)
swap(JACKET, ~head)
# and inside the head that one shade stays hair
m = (A[:, :, 0] == HAIR_KEEP[0]) & (A[:, :, 1] == HAIR_KEEP[1]) & (A[:, :, 2] == HAIR_KEEP[2]) & head
out[m] = HAIR_KEEP

Image.fromarray(out.astype('uint8')).save(OUT)
seen = sorted({tuple(p) for p in out.reshape(-1, 3)} - {(0, 0, 0), (247, 247, 247)})
print(f'{OUT}: {len(seen)} colours')
for c in seen:
    print('  #%02x%02x%02x' % c)
