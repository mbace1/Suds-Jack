# Index the Prince of Persia sheet.
#
# It is a hand-laid rip, not a grid: twenty-two bands of different heights with
# frames sitting at whatever x they happened to land on. So frames are found —
# bands by rows of ink, frames by columns of ink inside a band — and each one
# keeps its own source rect.
from PIL import Image
import numpy as np, json, sys

A = np.array(Image.open('pop.png').convert('RGB')).astype(int)
H, W = A.shape[:2]
INK = ~((A[:, :, 0] == 0) & (A[:, :, 1] == 0) & (A[:, :, 2] == 0))

# the rip's own colours; the logo and the credit text use others
BODY = (248, 248, 248)
SKIN = (255, 163, 71)
SASH = (248, 56, 0)
FIG = ((A[:, :, 0] == BODY[0]) & (A[:, :, 1] == BODY[1]) & (A[:, :, 2] == BODY[2])) | \
      ((A[:, :, 0] == SKIN[0]) & (A[:, :, 1] == SKIN[1]) & (A[:, :, 2] == SKIN[2])) | \
      ((A[:, :, 0] == SASH[0]) & (A[:, :, 1] == SASH[1]) & (A[:, :, 2] == SASH[2]))


def bands(mask):
    rows = mask.sum(1)
    out, s = [], None
    for y, v in enumerate(rows):
        if v > 0 and s is None: s = y
        elif v == 0 and s is not None:
            if y - s >= 8: out.append((s, y - 1))
            s = None
    if s is not None: out.append((s, len(rows) - 1))
    return out


def frames(y0, y1):
    band = FIG[y0:y1 + 1]
    cols = band.sum(0)
    spans, s = [], None
    for x, v in enumerate(cols):
        if v > 0 and s is None: s = x
        elif v == 0 and s is not None:
            if x - s >= 5: spans.append((s, x - 1))
            s = None
    if s is not None: spans.append((s, W - 1))
    out = []
    for a, b in spans:
        sub = band[:, a:b + 1]
        ys, xs = sub.nonzero()
        if len(ys) < 40: continue
        out.append(dict(x=a, y=int(ys.min()) + y0, w=b - a + 1, h=int(ys.max() - ys.min()) + 1))
    return out


if __name__ == '__main__':
    idx = []
    for i, (y0, y1) in enumerate(bands(FIG)):
        f = frames(y0, y1)
        if not f: continue
        idx.append(dict(band=len(idx), y0=y0, y1=y1, frames=f))
        hs = [d['h'] for d in f]
        print(f"band {len(idx)-1:2d}  y {y0:4d}-{y1:4d}  {len(f):3d} frames  "
              f"h {min(hs)}-{max(hs)}  w {min(d['w'] for d in f)}-{max(d['w'] for d in f)}")
    json.dump(idx, open('pop.json', 'w'))
