# The Prince of Persia sheet, repainted as Jimbo.
#
# The brief was never "put Jimbo's colours on the Prince" — it was to fit
# JIMBO onto the Prince's animation without touching the model Conrad's own
# sheet gives him. So this does more than a palette swap: it hands the Prince
# Jimbo's shoes, Jimbo's sleeves and Jimbo's white tee, because those three are
# what your eye actually uses to tell one small man from another, and without
# them a sword frame reads as a different character walking on.
#
# His outfit on that rip is ONE white — tunic and trousers the same value — so
# there is nothing to look up. It has to be split by region instead, and the
# sheet hands over the line to split on: the RED is his hair at the top of the
# figure and his BELT at the waist. So the lower red blob in a frame is the
# waistband, and everything below it is trousers, everything above is the
# jacket. Frames with no belt showing fall back to 55% down the figure.
#
# And the thing that finally cracked the sleeves. On Conrad's sheet an arm
# cannot be separated because the four browns are shading laid across the whole
# garment. Here the Prince is BARE-ARMED — his arms are skin, a colour of their
# own — so the pixels that mean "arm" are simply handed over. Put the sleeve on
# them and keep the far end skin for the hand. Same trick for the feet: the
# Prince is barefoot, so the skin at the bottom of him is exactly the shoe.
#
# The sleeve is the JACKET's lit tone, not grey. Grey was tried and it was the
# right colour on the wrong sheet: Conrad's arm cannot be separated from his
# torso by any rule, so grey sleeves here and dark ones on the walk made the
# blade change his coat. A shade lighter than the torso keeps the arm legible —
# which is what the grey was for, since with the sword out the arm IS the pose —
# without claiming a garment the other sheet cannot wear.
#
# Every colour it paints is one of Jimbo's own eighteen (see JIMBO_COLOURS in
# js/sprite.js) — nothing new is invented, or the framebuffer's quantiser would
# not keep it and the sword frames would snap to the room palette while the
# walk did not.
from PIL import Image
import numpy as np, json
from collections import deque

A = np.array(Image.open('pop.png').convert('RGB')).astype(int)
H, W = A.shape[:2]
out = A.copy()

WHITE, SKIN, RED = (248, 248, 248), (255, 163, 71), (248, 56, 0)
J_SKIN = (198, 115, 99)
J_HAIR = (99, 49, 0)
JACKET, JACKET_HI = (42, 46, 64), (60, 66, 88)
SLEEVE, SLEEVE_HI = (60, 66, 88), (49, 54, 74)
TROUSER, TROUSER_HI = (136, 103, 63), (154, 118, 74)
SHOE, SHOE_HI = (188, 194, 206), (226, 230, 236)
TEE, TEE_HI = (198, 198, 198), (226, 230, 236)
STEEL = (188, 194, 206)

# Only these four bands have a sword in them. It matters: the blade is found by
# being one or two pixels through, and a man seen face-on mid-turn is one or
# two pixels through as well — which put a silver stripe down the middle of the
# turn, in the one animation off this sheet that plays in normal play.
SWORD_BANDS = {3, 4, 5, 6}

eq = lambda c: (A[:, :, 0] == c[0]) & (A[:, :, 1] == c[1]) & (A[:, :, 2] == c[2])
white, skin, red = eq(WHITE), eq(SKIN), eq(RED)
out[skin] = J_SKIN


def components(m):
    """8-connected blobs. Frames are forty pixels across; a flood fill is fine."""
    h, w = m.shape
    seen = np.zeros((h, w), bool)
    found = []
    for y in range(h):
        for x in range(w):
            if not m[y, x] or seen[y, x]:
                continue
            q = deque([(y, x)])
            seen[y, x] = True
            px = []
            while q:
                cy, cx = q.popleft()
                px.append((cy, cx))
                for dy in (-1, 0, 1):
                    for dx in (-1, 0, 1):
                        ny, nx = cy + dy, cx + dx
                        if 0 <= ny < h and 0 <= nx < w and m[ny, nx] and not seen[ny, nx]:
                            seen[ny, nx] = True
                            q.append((ny, nx))
            found.append(px)
    return found


idx = json.load(open('pop.json'))
for band in idx:
    for f in band['frames']:
        x0, y0, w, h = f['x'], f['y'], f['w'], f['h']
        sl = (slice(y0, y0 + h), slice(x0, x0 + w))
        wm, rm, sm = white[sl], red[sl], skin[sl]
        if not wm.any():
            continue
        rows = np.arange(h)[:, None]

        # The BLADE first, or it gets painted as clothing: it is white, it is
        # attached to his hand, and it is the only thing on him that is one or
        # two pixels thick. Vertical run length finds it and nothing else —
        # in a band that has a sword in it.
        if band['band'] in SWORD_BANDS:
            run = np.zeros((h, w), int)
            for y in range(h):
                run[y] = np.where(wm[y], (run[y - 1] if y else 0) + 1, 0)
            down = np.zeros((h, w), int)
            for y in range(h - 1, -1, -1):
                down[y] = np.where(wm[y], (down[y + 1] if y < h - 1 else 0) + 1, 0)
            blade = wm & ((run + down - 1) <= 2)
        else:
            blade = np.zeros((h, w), bool)

        # The body is the white MINUS the blade — measure him off that, not off
        # the frame. Raise the sword and the frame grows fifteen pixels of empty
        # air at the top, and any fraction taken off it puts the waist in his
        # chest and paints his jacket brown.
        body = wm & ~blade
        if not body.any():
            body = wm
        ys_b, _ = body.nonzero()
        b_top, b_bot = int(ys_b.min()), int(ys_b.max())
        b_h = max(1, b_bot - b_top)

        # The belt: the red on this sheet is his hair AND his waistband, and the
        # two are separate blobs. So the red is split into runs of rows and the
        # SECOND run is the waist.
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
            for run_ in runs[1:]:
                fr = (run_[0] - b_top) / b_h
                if 0.35 < fr < 0.70:
                    waist = run_[0]
                    break
        if waist is None:
            waist = int(b_top + b_h * 0.55)
        cell = out[y0:y0 + h, x0:x0 + w]
        cell[rm & (rows < waist)] = J_HAIR
        cell[rm & (rows >= waist)] = JACKET

        # ── the skin, sorted into head / arms / feet ──────────────────────
        # A face is about five rows tall, so the head is the blob holding the
        # topmost skin pixel, cut off five rows down — cut it that way and not
        # by blob, because in the overhead strike his raised arms touch his hair
        # and the whole lot comes back as one component.
        arms, feet, head = np.zeros((h, w), bool), np.zeros((h, w), bool), np.zeros((h, w), bool)
        if sm.any():
            sy, sx = sm.nonzero()
            s_top = int(sy.min())
            blobs = components(sm)
            top_blob = min(blobs, key=lambda c: min(p[0] for p in c))
            for (py, px) in top_blob:
                if py <= s_top + 5:
                    head[py, px] = True

            # A foot is skin at the very bottom of him. Measured off the body's
            # bottom rather than off the waist, because a low guard drops a hand
            # well below the belt and a hand is not a boot.
            bx = float(np.mean(np.nonzero(body)[1])) if body.any() else w / 2
            by = float(np.mean(np.nonzero(body)[0])) if body.any() else h / 2
            for blob in blobs:
                if blob is top_blob and head.any():
                    blob = [p for p in blob if not head[p[0], p[1]]]
                    if not blob:
                        continue
                if min(p[0] for p in blob) >= b_bot - 7:
                    for (py, px) in blob:
                        feet[py, px] = True
                    continue
                if len(blob) < 4:
                    continue                      # a stray pixel or two: leave it skin
                # An arm, then — sleeve it, and keep the far end for the hand.
                d = [((py - by) ** 2 + (px - bx) ** 2) ** 0.5 for (py, px) in blob]
                far = max(d)
                for (py, px), dd in zip(blob, d):
                    if dd < far - 2.0:
                        arms[py, px] = True

        legs = body & (rows >= waist)
        torso = body & (rows < waist)

        # The tee. Conrad's Jimbo wears the jacket open over a white shirt and
        # that white V is the loudest thing on him at this size — without it the
        # sword frames are a man in a plain dark top. It goes on the FRONT two
        # columns of the upper chest; he faces right on this sheet, so front is
        # the high x. Only where the chest is wide enough to have a front and a
        # back to it, or a turn would come out white down one side.
        tee = np.zeros((h, w), bool)
        t_rows = np.nonzero(torso.any(axis=1))[0]
        if len(t_rows):
            t0, t1 = int(t_rows.min()), int(t_rows.max())
            for y in range(t0 + 2, t0 + 2 + max(1, int((t1 - t0) * 0.55))):
                if y > t1:
                    break
                xs = np.nonzero(torso[y])[0]
                if len(xs) < 5:
                    continue
                tee[y, xs.max() - 1] = True
                tee[y, xs.max()] = True

        cell[legs] = TROUSER
        cell[torso] = JACKET
        cell[tee] = TEE
        cell[arms] = SLEEVE
        cell[feet] = SHOE
        cell[blade] = STEEL
        # one lit row along the top of each mass, so it is not a flat cut-out
        for m, hi in ((legs, TROUSER_HI), (torso & ~tee, JACKET_HI), (tee, TEE_HI),
                      (arms, SLEEVE_HI), (feet, SHOE_HI)):
            top = m & ~np.vstack([np.zeros((1, w), bool), m[:-1]])
            cell[top] = hi

Image.fromarray(out.astype('uint8')).save('pop-jimbo.png')

# ── the other man ──────────────────────────────────────────────────────
# Someone to fence with, and he has to be told apart from Jimbo at a glance
# across a 320px screen while both of them are doing the same eight moves.
#
# He is the SAME EIGHTEEN COLOURS, permuted. That is not thrift, it is the rule
# the framebuffer imposes: the quantise pass keeps a fixed list of colours and
# snaps everything else to the room palette, so a nineteenth colour would have
# to be added to that list, and a list of thirty-two fixed points is not a
# sixteen-colour framebuffer any more. Permuting inside the eighteen costs
# nothing and reads as a different man: brown leather over a grey shirt, dark
# trousers, black boots, black hair — the exact inverse of Jimbo's navy over
# white with tan trousers, which is why it works.
FOE = {
    JACKET:     (79, 58, 34),      # navy jacket   -> brown leather
    JACKET_HI:  (97, 72, 43),
    SLEEVE:     (97, 72, 43),
    SLEEVE_HI:  (79, 58, 34),
    TROUSER:    (49, 54, 74),      # tan trousers  -> dark navy
    TROUSER_HI: (60, 66, 88),
    TEE:        (132, 132, 132),   # white shirt   -> grey
    TEE_HI:     (198, 198, 198),
    SHOE:       (31, 35, 51),      # white shoes   -> black boots
    SHOE_HI:    (42, 46, 64),
    J_HAIR:     (31, 35, 51),      # brown hair    -> black
}
foe = out.copy()
for src, dst in FOE.items():
    foe[(out[:, :, 0] == src[0]) & (out[:, :, 1] == src[1]) & (out[:, :, 2] == src[2])] = dst
Image.fromarray(foe.astype('uint8')).save('pop-foe.png')
seen = sorted({tuple(p) for p in out.reshape(-1, 3)} - {(0, 0, 0)})
print('pop-jimbo.png colours:', len(seen))
for c in seen: print('  #%02x%02x%02x' % c)
