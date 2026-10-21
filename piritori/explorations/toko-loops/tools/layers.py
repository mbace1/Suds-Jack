# Toko Slomo: split the segmented chef into rig pieces, fill what each piece hides, and write the layers + rig.json
import cv2, numpy as np, json, sys, os
D, OUT = sys.argv[1], sys.argv[2]; os.makedirs(OUT, exist_ok=True)
im = cv2.imread(f'{D}/src.png'); H, W = im.shape[:2]
toko = cv2.imread(f'{D}/m_toko.png', 0) > 0
P = lambda pts: np.array(pts, np.int32)
def poly(pts):
    m = np.zeros((H, W), np.uint8); cv2.fillPoly(m, [P(pts)], 255); return m > 0
def fill_holes(m):
    m8 = m.astype(np.uint8) * 255; inv = cv2.bitwise_not(m8); n, lab = cv2.connectedComponents(inv)
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]])))
    for i in range(1, n):
        if i not in border: m8[lab == i] = 255
    return m8 > 0
def largest(m):
    n, lab, st, _ = cv2.connectedComponentsWithStats(m.astype(np.uint8)); 
    return lab == (1 + np.argmax(st[1:, cv2.CC_STAT_AREA])) if n > 1 else m
hsv = cv2.cvtColor(im, cv2.COLOR_BGR2HSV); Hh, Ss, Vv = hsv[..., 0], hsv[..., 1], hsv[..., 2]
# ---- the head: the yellow card hood (holes filled: the white marks and the eye openings) plus the grey hair above it
hoodbox = poly([(670, 130), (845, 130), (845, 352), (670, 352)])
yellow = (Hh >= 10) & (Hh <= 32) & (Ss > 150) & (Vv > 140) & hoodbox & toko
hood = fill_holes(largest(cv2.morphologyEx(yellow.astype(np.uint8), cv2.MORPH_CLOSE, np.ones((7, 7), np.uint8)) > 0)) & toko
hair = toko & poly([(650, 100), (850, 100), (850, 284), (650, 284)]) & ~hood
head = hood | hair
# brows: grey card on the hood; eyes: the dark openings inside the white arches
grey = (Ss < 125) & (Vv > 60) & (Vv < 165) & toko
browL = grey & poly([(700, 170), (752, 170), (752, 205), (700, 205)]); browR = grey & poly([(770, 165), (825, 165), (825, 200), (770, 200)])
browL, browR = [cv2.morphologyEx(b.astype(np.uint8), cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8)) > 0 for b in (browL, browR)]
head = head | browL | browR; hood = hood | browL | browR
dark = (Vv < 70) & hood
eyeL = largest(dark & poly([(718, 200), (765, 200), (765, 250), (718, 250)])); eyeR = largest(dark & poly([(782, 200), (825, 200), (825, 250), (782, 250)]))
# ---- the forearms: right (image left) with the drying cloth, left (image right) with the hand on the note
foreR = toko & poly([(568, 420), (575, 395), (640, 392), (642, 367), (665, 359), (690, 366), (710, 376), (745, 394), (756, 420), (758, 455), (746, 480), (700, 482), (660, 461), (620, 459), (590, 456), (572, 450)]) & ~head
foreL = toko & poly([(774, 503), (776, 466), (805, 455), (808, 440), (825, 433), (860, 432), (857, 410), (855, 395), (862, 380), (880, 372), (905, 370), (925, 375), (940, 380), (951, 395), (953, 430), (949, 456), (935, 462), (882, 486), (856, 506)]) & ~head
note = foreL & poly([(772, 462), (856, 462), (856, 508), (772, 508)]) & (Ss < 135) & (Vv > 165)
note = cv2.morphologyEx(note.astype(np.uint8), cv2.MORPH_OPEN, np.ones((2, 2), np.uint8)) > 0
hand = foreL & ~note
torso = toko & ~head & ~foreR & ~foreL
# the counter's back edge: the bottom of the torso, column by column (smoothed); the counter is drawn in front of it
cols = np.where(torso.any(0))[0]; edge = {}
for x in cols:
    yb = int(np.where(torso[:, x])[0].max())
    if yb >= 430: edge[int(x)] = yb                       # only where the torso actually reaches the counter
print({k: int(v.sum()) for k, v in dict(hood=hood, hair=hair, browL=browL, browR=browR, eyeL=eyeL, eyeR=eyeR, foreR=foreR, foreL=foreL, torso=torso).items()})
xs = np.array(sorted(edge)); ys = np.array([edge[x] for x in xs]); ys = np.convolve(np.pad(ys, 15, mode='edge'), np.ones(31) / 31, mode='valid')
counter_y = {int(x): float(y) for x, y in zip(xs, ys)}
print('counter edge y range', ys.min(), ys.max())
# ---- fills: the plate behind the whole chef; the torso under its pieces; the hood under the brows
def inpaint(img, m, r=6):
    return cv2.xphoto.inpaint(img, (~m).astype(np.uint8), np.zeros_like(img), cv2.xphoto.INPAINT_FSR_FAST) if False else cv2.inpaint(img, m.astype(np.uint8) * 255, r, cv2.INPAINT_TELEA)
def fsr(img, m, box):
    x0, y0, x1, y1 = box; sub = img[y0:y1, x0:x1].copy(); mm = m[y0:y1, x0:x1]
    keep = (~mm).astype(np.uint8)
    out = np.zeros_like(sub); cv2.xphoto.inpaint(sub, keep, out, cv2.xphoto.INPAINT_FSR_FAST)
    res = img.copy(); res[y0:y1, x0:x1] = np.where(mm[..., None], out, sub); return res
def rowfill(img, m, box, vblur=3, valid=None):
    """fill each row's masked runs by mirroring what lies either side of them, blended across the run, so horizontal
    structure (shelves, noren hems, counter grain) and the paper tooth carry through. `valid` limits what may be
    sampled (a torso fill must borrow shirt, never the wall beside him)."""
    x0, y0, x1, y1 = box; out = img.copy(); ok = ~m if valid is None else (valid & ~m)
    for y in range(y0, y1):
        row = m[y, x0:x1]; x = 0
        while x < x1 - x0:
            if not row[x]: x += 1; continue
            a = x
            while x < x1 - x0 and row[x]: x += 1
            A, B = x0 + a, x0 + x - 1; n = B - A + 1
            L = [xx for xx in range(A - 1, max(-1, A - 1 - 2 * n - 40), -1) if ok[y, xx]]
            Rr = [xx for xx in range(B + 1, min(img.shape[1], B + 2 + 2 * n + 40)) if ok[y, xx]]
            if not L and not Rr: continue
            for i in range(n):
                l = img[y, L[min(i, len(L) - 1)]].astype(np.float32) if L else None
                r = img[y, Rr[min(n - 1 - i, len(Rr) - 1)]].astype(np.float32) if Rr else None
                w = (i + 0.5) / n; w = w * w * (3 - 2 * w)
                out[y, A + i] = r if l is None else l if r is None else (1 - w) * l + w * r
    if vblur:
        bl = cv2.blur(out, (1, vblur)); out = np.where(m[..., None], bl, out)
    return out
dil = lambda m, k: cv2.dilate(m.astype(np.uint8), np.ones((k, k), np.uint8)) > 0
keep = lambda filled, before, m: np.where(dil(m, 2)[..., None], filled, before)   # fill only under the piece; outside it the painting stays as painted
plate = keep(rowfill(im, dil(toko, 5), (520, 80, 1000, 540)), im, toko)
# what is revealed behind a moving piece is in that piece's shadow (v2, the bigger moves of 21 Oct): darken the fill,
# softly, so a gap reads as the shadow a cut-out throws on the card behind it rather than as a light smear
def shade(img, m, k=0.68, soft=5):
    w = cv2.GaussianBlur(m.astype(np.float32), (0, 0), soft)[..., None]
    return (img.astype(np.float32) * (1 - (1 - k) * w)).clip(0, 255).astype(np.uint8)
plate = shade(plate, toko)
# torso: fill under the head's lower half (the collar) and under both forearms, inside the torso's own reach
collar = dil(head, 3) & poly([(690, 285), (840, 285), (840, 356), (690, 356)])
under = (dil(foreR, 3) | dil(foreL, 3)) & poly([(600, 300), (930, 300), (930, 458), (600, 458)])
torso_full = torso | collar | (under & ~poly([(760, 455), (960, 455), (960, 520), (760, 520)]))
torso_img = rowfill(im, dil(head | foreR | foreL, 2) & ~torso, (560, 250, 980, 520), valid=torso & ~dil(head | foreR | foreL, 2))
torso_img = shade(torso_img, dil(head | foreR | foreL, 2) & ~torso, 0.62, 3)
# extend the torso 14 px below the counter edge so a breath never opens a gap; the counter hides it
for x, y in counter_y.items():
    y = int(round(y)); torso_full[y:y + 14, x] = torso_full[y, x] or torso_full[y - 1, x]
    torso_img[y:y + 14, x] = torso_img[y - 2, x]
hood_img = rowfill(im, dil(browL | browR, 3), (690, 160, 835, 215))
# lids: hood colour taken from just above each eye, shaped like the opening it closes
# ---- the counter in front of the torso (taken from the plate, so no hands), to the counter's front edge
counter = np.zeros((H, W), bool)
for x, y in counter_y.items(): counter[int(round(y)) - 1:530, x] = True
counter &= poly([(560, 430), (965, 430), (965, 530), (560, 530)])
# ---- ambient: the lantern (sways), the tram in the window (passes)
lant = (((Hh <= 14) | (Hh >= 170)) & (Ss > 120) & (Vv > 90)) & poly([(5, 20), (160, 20), (160, 310), (5, 310)])
lant = fill_holes(largest(cv2.morphologyEx(lant.astype(np.uint8), cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8)) > 0))
lant |= poly([(72, 18), (92, 18), (92, 60), (72, 60)]) & (Vv < 200)   # the cord and cap
plate = keep(cv2.inpaint(plate, dil(lant, 7).astype(np.uint8) * 255, 9, cv2.INPAINT_TELEA), plate, lant)   # dark wall: a smooth fill, only edges ever show
mask = np.full((H, W), cv2.GC_BGD, np.uint8); cv2.rectangle(mask, (1478, 236), (1652, 432), cv2.GC_PR_FGD, -1); cv2.rectangle(mask, (1505, 262), (1630, 410), cv2.GC_FGD, -1)
bg_, fg_ = np.zeros((1, 65)), np.zeros((1, 65)); cv2.grabCut(im, mask, None, bg_, fg_, 6, cv2.GC_INIT_WITH_MASK)
tram = fill_holes(largest((mask == 1) | (mask == 3)))
plate = keep(rowfill(plate, dil(tram, 7), (1395, 180, 1668, 448)), plate, tram)
# ---- write: each piece cropped to its box, with a 1 px feathered edge
pieces = {}
def save(name, img, m, extra=None):
    print(name, int(m.sum()))
    ys_, xs_ = np.where(m); x0, y0, x1, y1 = xs_.min(), ys_.min(), xs_.max() + 1, ys_.max() + 1
    a = cv2.GaussianBlur(m.astype(np.float32), (3, 3), 0.6)[y0:y1, x0:x1]
    rgba = np.dstack([img[y0:y1, x0:x1], (a * 255).astype(np.uint8)]); cv2.imwrite(f'{OUT}/{name}.png', rgba)
    pieces[name] = {'file': f'{name}.png', 'x': int(x0), 'y': int(y0), 'w': int(x1 - x0), 'h': int(y1 - y0), **(extra or {})}
cv2.imwrite(f'{OUT}/plate.png', plate); pieces['plate'] = {'file': 'plate.png', 'x': 0, 'y': 0, 'w': W, 'h': H}
save('torso', torso_img, torso_full); save('counter', plate, counter)
save('head', im, head); save('hood_bare', hood_img, dil(browL | browR, 3) & hood)   # the hood under the brows (shown when brows move)
save('brow_l', im, browL); save('brow_r', im, browR)
save('eye_l', im, eyeL); save('eye_r', im, eyeR)
save('fore_r', im, foreR); save('hand_l', im, hand); save('note', im, note)
save('lantern', im, lant); save('tram', im, tram)
# the lid colour: the median hood yellow just above each eye
lidcol = [int(v) for v in np.median(im[(hood & ~dark & ~(browL | browR)) & poly([(715, 205), (820, 205), (820, 215), (715, 215)])], 0)[::-1]]
json.dump({'size': [W, H], 'pieces': pieces, 'lid_rgb': lidcol, 'counter_edge': {'x0': int(xs.min()), 'x1': int(xs.max()), 'y': [round(float(v), 1) for v in ys]}}, open(f'{OUT}/layers.json', 'w'), indent=1)
# a review overlay: every piece outlined in its own colour
ov = (im * 0.55).astype(np.uint8); cols_ = {'head': (0, 255, 255), 'torso': (0, 255, 0), 'fore_r': (255, 128, 0), 'fore_l': (255, 0, 255), 'brow_l': (255, 255, 255), 'brow_r': (255, 255, 255), 'eye_l': (0, 0, 255), 'eye_r': (0, 0, 255), 'counter': (0, 128, 255), 'note': (0, 255, 128), 'lantern': (0, 200, 255), 'tram': (255, 255, 0)}
for n_, m_ in [('torso', torso_full), ('counter', counter), ('head', head), ('fore_r', foreR), ('fore_l', hand), ('note', note), ('brow_l', browL), ('brow_r', browR), ('eye_l', eyeL), ('eye_r', eyeR), ('lantern', lant), ('tram', tram)]:
    c_, _ = cv2.findContours(m_.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE); cv2.drawContours(ov, c_, -1, cols_[n_], 2)
cv2.imwrite(f'{D}/ov_pieces.jpg', ov); cv2.imwrite(f'{D}/plate_crop.jpg', plate[80:540, 520:1000])
print(json.dumps({k: [v['x'], v['y'], v['w'], v['h']] for k, v in pieces.items()}))
