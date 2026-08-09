# The Prince of Persia sheet, repainted as Jimbo.
#
# His outfit on that rip is ONE white — tunic and trousers the same value — so
# there is nothing to look up. It has to be split by region instead, and the
# sheet hands over the line to split on: the RED is his hair at the top of the
# figure and his BELT at the waist. So the lower red blob in a frame is the
# waistband, and everything below it is trousers, everything above is the
# jacket. Frames with no belt showing fall back to 55% down the figure.
#
# What that lack of shading costs elsewhere it gives back here: with one flat
# colour there is nothing to preserve, so the sleeves can be picked out too —
# the arm is what sticks out past the torso's column at shoulder height.
from PIL import Image
import numpy as np, json

A = np.array(Image.open('pop.png').convert('RGB')).astype(int)
H, W = A.shape[:2]
out = A.copy()

WHITE, SKIN, RED = (248, 248, 248), (255, 163, 71), (248, 56, 0)
J_SKIN = (198, 115, 99)
J_HAIR = (99, 49, 0)
JACKET, JACKET_HI = (42, 46, 64), (60, 66, 88)
SLEEVE, SLEEVE_HI = (150, 154, 162), (184, 188, 196)
TROUSER, TROUSER_HI = (136, 103, 63), (154, 118, 74)
STEEL = (200, 204, 212)

eq = lambda c: (A[:, :, 0] == c[0]) & (A[:, :, 1] == c[1]) & (A[:, :, 2] == c[2])
white, skin, red = eq(WHITE), eq(SKIN), eq(RED)
out[skin] = J_SKIN

idx = json.load(open('pop.json'))
for band in idx:
    for f in band['frames']:
        x0, y0, w, h = f['x'], f['y'], f['w'], f['h']
        sl = (slice(y0, y0 + h), slice(x0, x0 + w))
        wm, rm = white[sl], red[sl]
        if not wm.any():
            continue
        # The belt: the red on this sheet is his hair AND his waistband, and the
        # two are separate blobs. A fraction-of-height test fails the moment he
        # raises the sword — the blade stretches the frame, the head drops to a
        # third of the way down, and hair gets read as belt. So the red is split
        # into runs of rows instead, and the SECOND run is the waist.
        # Measure against the BODY, not the frame. The frame stretches with the
        # blade — raise the sword and it grows fifteen pixels of empty air at
        # the top — so any fraction taken off the frame puts the waist in his
        # chest and paints his jacket brown.
        ys_b, _ = wm.nonzero()
        b_top, b_bot = int(ys_b.min()), int(ys_b.max())
        b_h = max(1, b_bot - b_top)
        ry, rx = rm.nonzero()
        waist = None
        if len(ry):
            rows_used = sorted(set(int(v) for v in ry))
            runs, cur = [], [rows_used[0]]
            for v in rows_used[1:]:
                if v - cur[-1] <= 2: cur.append(v)
                else: runs.append(cur); cur = [v]
            runs.append(cur)
            # a belt is a run of red in the MIDDLE of him: below the head and
            # above the knees. A second run of hair does not qualify.
            for run in runs[1:]:
                f = (run[0] - b_top) / b_h
                if 0.35 < f < 0.70:
                    waist = run[0]
                    break
        if waist is None:
            waist = int(b_top + b_h * 0.55)
        out[y0:y0 + h, x0:x0 + w][rm & (np.arange(h)[:, None] < waist)] = J_HAIR
        out[y0:y0 + h, x0:x0 + w][rm & (np.arange(h)[:, None] >= waist)] = JACKET

        rows = np.arange(h)[:, None]

        # The BLADE first, or it gets painted as clothing: it is white, it is
        # attached to his hand, and it is the only thing on him that is one or
        # two pixels thick. Vertical run length finds it and nothing else.
        run = np.zeros((h, w), int)
        for y in range(h):
            run[y] = np.where(wm[y], (run[y - 1] if y else 0) + 1, 0)
        down = np.zeros((h, w), int)
        for y in range(h - 1, -1, -1):
            down[y] = np.where(wm[y], (down[y + 1] if y < h - 1 else 0) + 1, 0)
        blade = wm & ((run + down - 1) <= 2)

        # NO SLEEVE. It was tried two ways — the torso's own column, then a
        # flood out from the hands — and both fail for the same reason: with the
        # arm tucked against a chest twelve pixels across there is no rule that
        # separates them, so half the frames came out with a grey torso and half
        # with a dark arm. Half-right is worse than consistent, and Conrad's
        # sheet cannot give sleeves either, so neither does this one.
        sleeve = np.zeros((h, w), bool)

        legs = wm & (rows >= waist) & ~blade & ~sleeve
        torso = wm & (rows < waist) & ~blade & ~sleeve

        cell = out[y0:y0 + h, x0:x0 + w]
        cell[legs] = TROUSER
        cell[torso] = JACKET
        cell[sleeve] = SLEEVE
        cell[blade] = STEEL
        # one lit row along the top of each mass, so it is not a flat cut-out
        for m, hi in ((legs, TROUSER_HI), (torso, JACKET_HI), (sleeve, SLEEVE_HI)):
            top = m & ~np.vstack([np.zeros((1, w), bool), m[:-1]])
            cell[top] = hi

Image.fromarray(out.astype('uint8')).save('pop-jimbo.png')
seen = sorted({tuple(p) for p in out.reshape(-1, 3)} - {(0, 0, 0)})
print('pop-jimbo.png colours:', len(seen))
for c in seen: print('  #%02x%02x%02x' % c)
