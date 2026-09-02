#!/usr/bin/env python3
"""TURF sprite production validator.

Implements the mechanical half of CLAUDE_CODE_TURF_SPRITE_HANDOVER.md §
"Automated validation" and § "Recommended duplicate detection".

What this is FOR: catching the failures a person should never have to spend
attention on — a background that is not pure magenta, a frame that drifted in
scale, an origin that slid, and above all the systemic one the handover names:
a second half-cycle that is a near-copy of the first while its labels claim
opposite mechanics.

What this is NOT: animation review. The handover is explicit — "Do not let
automated similarity replace mechanical animation review." Every check here
answers a geometric question. None of them can tell you whether the weight
transfer reads, whether the apron lags rather than drives, or whether a pose
is the right pose. A frame that passes every check in this file can still be
worthless. PASS here means "nothing mechanical is provably wrong", never
"approved".

Python rather than Node on purpose: this is production tooling, not shipped
game code, so the repo's vanilla-ES-modules/no-build rule does not bind it,
and pixel work over whole frame sets is what numpy is for. The game tree
stays free of it.

Usage:
    python3 turf/tools/spritecheck.py frames <dir-or-file>...
    python3 turf/tools/spritecheck.py pairs  <cycle-dir> [--half N]
    python3 turf/tools/spritecheck.py cycle  <cycle-dir>
"""

import sys
import os
import glob
import argparse

import numpy as np
from PIL import Image

# The production background, per the handover's output rules. Exact, not near:
# the whole point of a key colour is that it is separable by equality.
MAGENTA = (255, 0, 255)

# A frame pair whose silhouettes overlap more than this is very likely the
# duplicate-half-cycle failure. Deliberately NOT a pass/fail gate on its own —
# it flags for human review, because a legitimately similar pose exists (a
# near-symmetric idle) and auto-rejecting it would be the automated-similarity
# overreach the handover warns against.
DUP_IOU = 0.93
# Adjacent frames SHOULD be similar — they are 1/12th of a cycle apart. This
# catches the opposite failure: a frame that shares almost nothing with its
# neighbour, i.e. the cycle does not connect (failure code M1).
ADJACENT_MIN_IOU = 0.45


def count_enclosed_bg(char):
    """Background pixels with no path to the canvas edge — i.e. holes punched
    through the character by the key colour (Bible 4.1). A flood fill inward
    from the border marks all real background; whatever background is left is
    enclosed. Small counts are legitimate (the gap inside a bent elbow is not
    enclosed; an eye drawn as a hole would be), so this reports rather than
    fails."""
    bg = ~char
    h, w = bg.shape
    reach = np.zeros_like(bg)
    stack = []
    for x in range(w):
        if bg[0, x]: stack.append((0, x))
        if bg[h - 1, x]: stack.append((h - 1, x))
    for y in range(h):
        if bg[y, 0]: stack.append((y, 0))
        if bg[y, w - 1]: stack.append((y, w - 1))
    while stack:
        y, x = stack.pop()
        if reach[y, x] or not bg[y, x]:
            continue
        reach[y, x] = True
        if y > 0: stack.append((y - 1, x))
        if y < h - 1: stack.append((y + 1, x))
        if x > 0: stack.append((y, x - 1))
        if x < w - 1: stack.append((y, x + 1))
    return int(np.sum(bg & ~reach))


class Frame:
    def __init__(self, path):
        self.path = path
        self.name = os.path.basename(path)
        img = Image.open(path).convert('RGBA')
        self.w, self.h = img.size
        self.rgba = np.array(img)

    # ── background / contamination ───────────────────────────────────────
    def mask(self):
        """True where the character is. Handles both conventions: a real alpha
        cutout, and the magenta-key sheet the generator actually returns."""
        a = self.rgba[:, :, 3]
        rgb = self.rgba[:, :, :3]
        is_magenta = np.all(rgb == MAGENTA, axis=-1)
        return (a > 40) & ~is_magenta

    def bg_report(self):
        """Every non-character pixel must be EXACTLY #FF00FF (or fully
        transparent). 'Nearly magenta' is the contamination that survives a
        colour-key cut as a fringe of purple pixels around the silhouette."""
        a = self.rgba[:, :, 3]
        rgb = self.rgba[:, :, :3]
        is_magenta = np.all(rgb == MAGENTA, axis=-1)
        transparent = a == 0
        bg = is_magenta | transparent
        char = self.mask()
        # Pixels that are neither clean background nor solid character: the
        # semi-transparent fringe, and near-miss magenta.
        semi = int(np.sum((a > 0) & (a < 255) & ~char))
        near = np.abs(rgb.astype(int) - np.array(MAGENTA)).sum(axis=-1)
        nearly = int(np.sum((near > 0) & (near < 90) & ~char))
        # Bible 4.1: "Magenta must not appear on the character." Because the
        # key colour is what cuts the sprite out, magenta inside the body does
        # not render as magenta — it punches a HOLE through the character, and
        # the hole is only obvious once the sprite is composited over the game
        # background. Enclosed background regions are how it shows up here.
        holes = count_enclosed_bg(char)
        return {
            'bg_pixels': int(np.sum(bg)),
            'char_pixels': int(np.sum(char)),
            'semi_transparent': semi,
            'near_magenta_fringe': nearly,
            'holes': holes,
        }

    # ── geometry ─────────────────────────────────────────────────────────
    def bbox(self):
        m = self.mask()
        rows, cols = np.any(m, axis=1), np.any(m, axis=0)
        if not rows.any():
            return None
        y0, y1 = np.where(rows)[0][[0, -1]]
        x0, x1 = np.where(cols)[0][[0, -1]]
        return int(x0), int(y0), int(x1), int(y1)

    def origin(self):
        """The foot anchor: horizontal centre of the lowest ink row. This is
        the point the game stands on a tile, so it is the point every
        comparison has to be normalised around — comparing raw canvases
        measures padding, not motion."""
        m = self.mask()
        if not m.any():
            return None
        ys = np.where(np.any(m, axis=1))[0]
        bottom = ys[-1]
        xs = np.where(m[bottom])[0]
        return float(xs.mean()), int(bottom)


def norm_silhouette(frame, size=(96, 128)):
    """Binary silhouette, translated so the foot origin sits at a fixed point
    and scaled to a common box. Both normalisations matter: without the origin
    shift a frame that merely sits 3px left reads as a different pose; without
    the scale it reads as different when only the render size changed."""
    m = frame.mask()
    bb = frame.bbox()
    if bb is None:
        return np.zeros(size[::-1], dtype=bool)
    x0, y0, x1, y1 = bb
    crop = m[y0:y1 + 1, x0:x1 + 1]
    img = Image.fromarray((crop * 255).astype(np.uint8))
    img = img.resize(size, Image.NEAREST)
    return np.array(img) > 127


def iou(a, b):
    union = np.logical_or(a, b).sum()
    return float(np.logical_and(a, b).sum() / union) if union else 1.0


def leg_iou(a, b):
    """Legs alone — the bottom 45% of the silhouette. The handover asks for
    this separately for a real reason: in a bad half-cycle the torso and head
    genuinely are near-identical (they should be), and averaging them in
    dilutes exactly the leg-ownership swap that is the thing being tested."""
    cut = int(a.shape[0] * 0.55)
    return iou(a[cut:], b[cut:])


def load_frames(paths):
    files = []
    for p in paths:
        if os.path.isdir(p):
            files += sorted(glob.glob(os.path.join(p, '*.png')))
        else:
            files.append(p)
    return [Frame(f) for f in files]


# ── commands ─────────────────────────────────────────────────────────────
def cmd_frames(args):
    frames = load_frames(args.paths)
    if not frames:
        print('no frames found')
        return 1
    bad = 0
    widths, heights, scales = [], [], []
    print(f'{"frame":<44}{"size":>11}  {"ink":>7}  {"bbox h":>6}  notes')
    for f in frames:
        r = f.bg_report()
        bb = f.bbox()
        notes = []
        if r['char_pixels'] == 0:
            notes.append('EMPTY')
        if r['semi_transparent']:
            notes.append(f"semi:{r['semi_transparent']}")
        if r['near_magenta_fringe']:
            notes.append(f"fringe:{r['near_magenta_fringe']}")
        if r['holes']:
            notes.append(f"holes:{r['holes']}")
        h = (bb[3] - bb[1] + 1) if bb else 0
        widths.append(f.w); heights.append(f.h); scales.append(h)
        if notes:
            bad += 1
        print(f'{f.name:<44}{f.w}x{f.h:<6}  {r["char_pixels"]:>7}  {h:>6}  '
              f'{" ".join(notes) if notes else "ok"}')

    # Scale drift (C2) and canvas consistency, across the whole set.
    print()
    if len(set(zip(widths, heights))) > 1:
        print(f'  ! canvas size is not constant across the set: '
              f'{sorted(set(zip(widths, heights)))}')
        bad += 1
    live = [s for s in scales if s]
    if live:
        lo, hi = min(live), max(live)
        drift = (hi - lo) / hi if hi else 0
        flag = '  ! SCALE DRIFT' if drift > 0.08 else ''
        print(f'  character height {lo}-{hi}px  drift {drift:.1%}{flag}')
        if drift > 0.08:
            bad += 1
    print(f'\n{len(frames)} frames, {bad} flagged')
    return 1 if bad else 0


def cmd_pairs(args):
    """Phase opposition: F1<->F7, F2<->F8, ... for a 12-frame cycle.

    This is the check the handover was written around. A pair that comes back
    with very high IoU is the systemic failure: the same drawing serving two
    phases that are supposed to have opposite leg ownership."""
    frames = load_frames(args.paths)
    n = len(frames)
    if n < 2:
        print('need a full cycle directory')
        return 1
    half = args.half or n // 2
    if n % 2 and not args.half:
        print(f'  ! odd frame count ({n}) — pass --half explicitly')
        return 1
    sil = [norm_silhouette(f) for f in frames]
    print(f'phase opposition, {n}-frame cycle, half={half}\n')
    print(f'{"pair":<40}{"IoU":>7}{"legs":>8}   verdict')
    flagged = 0
    for i in range(half):
        j = i + half
        if j >= n:
            break
        o, l = iou(sil[i], sil[j]), leg_iou(sil[i], sil[j])
        # Legs are weighted: identical legs across a phase pair is the
        # failure, even if the arms happen to differ.
        if l > DUP_IOU or o > DUP_IOU:
            verdict, flagged = 'DUPLICATE — rebuild', flagged + 1
        elif l > 0.85:
            verdict, flagged = 'suspicious legs', flagged + 1
        else:
            verdict = 'ok'
        label = f'F{i+1} <-> F{j+1}'
        print(f'{label:<40}{o:>7.3f}{l:>8.3f}   {verdict}')
    print(f'\n{flagged} pair(s) flagged for review')
    print('Geometry only — a passing pair still needs mechanical review.')
    return 1 if flagged else 0


def cmd_move(args):
    """The six-frame locomotion check, straight from Sprite Bible section 9.

    Section 9.3 gives an expected body-height waveform:

        LOW -> LOW -> HIGH -> LOW -> LOW -> HIGH

    and section 7.4 calls it "one of the easiest ways to detect a broken run
    cycle". It is checkable because the origin is the foot anchor, so bbox
    height IS head-height-above-ground: at contact the legs are spread and the
    head sits low; at the pass frame the body is stacked and it rises.

    Section 9.4 rejects "torso height remains flat" outright, which is why
    amplitude is measured and not just ordering — a cycle can have its peaks
    in the right places and still be mechanically dead."""
    frames = load_frames(args.paths)
    n = len(frames)
    if n != 6:
        print(f'  ! Bible section 8 sets Move at 6 frames; found {n}.')
        print('    (Run `cycle` and `pairs` for a non-standard count.)')
        if n < 6:
            return 1
    heights, tops = [], []
    for f in frames:
        bb = f.bbox()
        heights.append((bb[3] - bb[1] + 1) if bb else 0)
        tops.append(bb[1] if bb else 0)

    hi = max(heights) if heights else 0
    lo = min(h for h in heights if h) if any(heights) else 0
    amp = (hi - lo) / hi if hi else 0

    # Frames 3 and 6 (1-based) are the PASS/HIGH frames; 1,2,4,5 are contact
    # and load, all LOW.
    peaks, lows = [2, 5], [0, 1, 3, 4]
    print('body-height waveform (Bible 9.3: LOW LOW HIGH LOW LOW HIGH)\n')
    print(f'{"frame":<44}{"height":>7}  phase')
    PHASE = ['LOW  contact', 'LOW  load', 'HIGH pass',
             'LOW  contact', 'LOW  load', 'HIGH pass']
    for i, f in enumerate(frames[:6]):
        print(f'{f.name:<44}{heights[i]:>7}  {PHASE[i] if i < 6 else ""}')

    flagged = 0
    print()
    if amp < 0.03:
        print(f'  ! M3 FLAT — height varies only {amp:.1%} across the cycle;'
              ' section 9.4 rejects a flat torso height')
        flagged += 1
    else:
        print(f'  height wave amplitude {amp:.1%}')

    if n >= 6:
        for p in peaks:
            for l in lows:
                # A pass frame must out-rise every low frame in its own half.
                if abs(p - l) <= 2 and heights[p] <= heights[l]:
                    print(f'  ! M3 F{p+1} (pass/HIGH) is not above F{l+1} '
                          f'({heights[p]} vs {heights[l]})')
                    flagged += 1
    print(f'\n{flagged} issue(s). Geometry only — contact pattern (M2) and '
          'weight transfer still need a human.')
    return 1 if flagged else 0


def cmd_cycle(args):
    """Adjacent continuity: does each frame connect to the next, and does the
    last close back onto the first (failure codes M1, M5)?"""
    frames = load_frames(args.paths)
    n = len(frames)
    if n < 2:
        print('need a cycle directory')
        return 1
    sil = [norm_silhouette(f) for f in frames]
    origins = [f.origin() for f in frames]
    print(f'adjacent continuity, {n} frames\n')
    print(f'{"step":<40}{"IoU":>7}   {"dx":>6}   verdict')
    flagged = 0
    for i in range(n):
        j = (i + 1) % n
        o = iou(sil[i], sil[j])
        dx = (origins[j][0] - origins[i][0]) if origins[i] and origins[j] else 0
        notes = []
        if o < ADJACENT_MIN_IOU:
            notes.append('DISCONNECTED')
        if o > 0.985:
            notes.append('near-duplicate of neighbour')
        if notes:
            flagged += 1
        label = f'F{i+1} -> F{j+1}' + (' (loop)' if j == 0 else '')
        print(f'{label:<40}{o:>7.3f}   {dx:>6.1f}   '
              f'{" ".join(notes) if notes else "ok"}')

    # Origin drift across the cycle (M4 sliding origin). A locomotion cycle is
    # authored in place — the world moves the character, the frames must not.
    xs = [o[0] for o in origins if o]
    if xs:
        span = max(xs) - min(xs)
        print(f'\n  foot origin spans {span:.1f}px across the cycle'
              f'{"   ! SLIDING ORIGIN" if span > 6 else ""}')
        if span > 6:
            flagged += 1
    print(f'\n{flagged} issue(s) flagged')
    return 1 if flagged else 0


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest='cmd', required=True)
    for name, fn, helptext in [
        ('frames', cmd_frames, 'per-frame: background purity, contamination, bbox, scale drift'),
        ('pairs', cmd_pairs, 'phase opposition (F1<->F7 ...) — the duplicate-half-cycle check'),
        ('cycle', cmd_cycle, 'adjacent continuity, loop closure, origin drift'),
        ('move', cmd_move, 'Bible 9.3 six-frame body-height waveform (LOW LOW HIGH ...)'),
    ]:
        p = sub.add_parser(name, help=helptext)
        p.add_argument('paths', nargs='+')
        if name == 'pairs':
            p.add_argument('--half', type=int, default=None)
        p.set_defaults(fn=fn)
    args = ap.parse_args()
    sys.exit(args.fn(args))


if __name__ == '__main__':
    main()
