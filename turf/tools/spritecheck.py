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

# ── Thresholds, CALIBRATED against the 28 shipped cast frames ────────────
# These were guesses on the first cut. Measured across every pair in
# turf/art-src/sprites/cast (gunner + leopard, 7 poses x 2 facings), the real
# distributions are:
#
#   same character, DIFFERENT pose, same facing (n=84)
#       full  min 0.288  median 0.507  max 0.758
#       legs  min 0.144  median 0.484  p90 0.659  max 0.801
#   same character+pose, front vs back (n=14)
#       full  min 0.388  median 0.607  max 0.841
#   different characters, same pose+facing (n=14)
#       full  min 0.287  median 0.550  max 0.787
#
# The highest overlap anything LEGITIMATELY different reaches is 0.841 —
# gunner's death-down front vs back, which is fair enough: a body lying flat
# looks much the same from either side. Distinct poses of one character top
# out at 0.758.
#
# So the original 0.93 was far too lenient: it caught only the near-exact
# copies the handover happened to report, and a subtler duplicate at 0.88
# would have sailed through as "ok". 0.86 sits just above the observed
# legitimate maximum with a little headroom.
DUP_IOU = 0.86
# Legs weighted separately because in a bad half-cycle the torso and head
# genuinely ARE near-identical (they should be) and averaging them in dilutes
# the leg-ownership swap that is the actual thing being tested. p90 of
# legitimately-different poses is 0.659, max 0.801 — so 0.80 flags, and the
# softer 0.70 band below it is worth a human look rather than a verdict.
DUP_LEG_IOU = 0.80
SUSPECT_LEG_IOU = 0.70
# The opposite failure: a frame sharing almost nothing with its neighbour, so
# the cycle does not connect (M1). The original 0.45 was ABOVE the 25th
# percentile (0.441) of merely-different poses, so it would have flagged
# legitimate large-motion transitions as broken. Observed floor is 0.288.
ADJACENT_MIN_IOU = 0.25


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
        if o > DUP_IOU or l > DUP_LEG_IOU:
            verdict, flagged = 'DUPLICATE — rebuild', flagged + 1
        elif l > SUSPECT_LEG_IOU:
            verdict, flagged = 'suspicious legs', flagged + 1
        else:
            verdict = 'ok'
        label = f'F{i+1} <-> F{j+1}'
        print(f'{label:<40}{o:>7.3f}{l:>8.3f}   {verdict}')
    print(f'\n{flagged} pair(s) flagged for review')
    print('Geometry only — a passing pair still needs mechanical review.')
    return 1 if flagged else 0


# The height the board actually draws a unit at (render.js's SPRITE_H). Every
# readability question is asked at THIS size, not at the 288px the plate is
# authored at — Bible §2 asks for "animation that reads instantly at tactical
# zoom", and that is the only scale where the answer counts.
GAME_H = 46


def game_scale(frame):
    """The frame's silhouette as the board would actually show it: shrunk to
    GAME_H, then blown back up so it can be compared with a full-res one."""
    m = frame.mask()
    bb = frame.bbox()
    if bb is None:
        return np.zeros((128, 96), dtype=bool)
    x0, y0, x1, y1 = bb
    crop = m[y0:y1 + 1, x0:x1 + 1]
    img = Image.fromarray((crop * 255).astype(np.uint8))
    small = img.resize((max(1, int(GAME_H * crop.shape[1] / crop.shape[0])), GAME_H), Image.BILINEAR)
    return np.array(small.resize((96, 128), Image.NEAREST)) > 127


def separation(frame):
    """Mean number of disjoint ink runs per row — how much of the pose reads as
    limbs rather than as one mass. A blob scores 1.0; a figure with an arm
    clear of the torso scores above it. Cheap stand-in for the convex-hull
    solidity measure, with no extra dependency, and it answers the question
    that actually matters for a silhouette: is anything separated from
    anything else."""
    m = frame.mask()
    rows, total = 0, 0
    for y in range(m.shape[0]):
        row = m[y]
        if not row.any():
            continue
        runs = np.diff(np.concatenate(([0], row.view(np.int8), [0])))
        total += int((runs == 1).sum())
        rows += 1
    return total / rows if rows else 0.0


def cmd_zoom(args):
    """Does this set still read as distinct poses at the size the board draws?

    Bible §2 asks for animation that "reads instantly at tactical zoom". A
    pair can be a genuine two-beat at 192x288 and collapse into the same
    shape at 46px, and 46px is the only size a player ever sees. This
    compares every pair's silhouette IoU at full resolution against the same
    pair at game scale, and reports the ones that converge."""
    frames = load_frames(args.paths)
    if len(frames) < 2:
        print('need at least two frames')
        return 1
    full = [norm_silhouette(f) for f in frames]
    small = [game_scale(f) for f in frames]
    print(f'readability at game scale ({GAME_H}px, render.js SPRITE_H)\n')
    print(f'{"pair":<46}{"full":>7}{"@game":>7}   verdict')
    flagged = 0
    for i in range(len(frames)):
        for j in range(i + 1, len(frames)):
            a, b = iou(full[i], full[j]), iou(small[i], small[j])
            notes = ''
            # Distinct when authored, the same thing once shrunk.
            if b > DUP_IOU and a <= DUP_IOU:
                notes, flagged = 'COLLAPSES at game scale', flagged + 1
            elif b - a > 0.15:
                notes, flagged = 'converges when shrunk', flagged + 1
            if notes:
                label = f'{frames[i].name[:20]} <-> {frames[j].name[:20]}'
                print(f'{label:<46}{a:>7.3f}{b:>7.3f}   {notes}')
    print(f'\n{flagged} pair(s) lose their distinction at the size the board draws.')
    print('Pairs that stayed distinct are not listed.')
    return 1 if flagged else 0


def cmd_silhouette(args):
    """Awkward-silhouette check: how much of each pose reads as limbs rather
    than one mass, at game scale. Reports the measure per frame and names the
    outliers relative to the set's own median — an absolute threshold would
    mean nothing across characters with different builds and costumes."""
    frames = load_frames(args.paths)
    if not frames:
        print('no frames')
        return 1
    vals = [(separation(f), f) for f in frames]
    nums = sorted(v for v, _ in vals)
    med = nums[len(nums) // 2]
    print(f'silhouette separation (runs per ink row) — set median {med:.2f}\n')
    print(f'{"frame":<44}{"sep":>6}   note')
    flagged = 0
    for v, f in vals:
        note = ''
        if v < med * 0.75:
            note, flagged = 'READS AS ONE MASS vs the rest of this set', flagged + 1
        print(f'{f.name:<44}{v:>6.2f}   {note}')
    print(f'\n{flagged} frame(s) noticeably blobbier than the set.')
    print('Relative, not absolute — a low score is a prompt to look, not a verdict.')
    return 1 if flagged else 0


def cmd_facing(args):
    """Direction drift (D1/D2) against a reference frame — by default the
    first file given, which should be the character's approved idle.

    WHY THIS EXISTS: a regenerated attack pair passed every similarity check
    in this file and was still wrong, because both frames had rotated to a
    near-PROFILE view that Bible §5 forbids outright ("No profile
    side-scroller pose"). Worse, the rotation IMPROVED the pair's IoU score,
    so the geometry checks read a camera change as a successful pose change.

    This is a PROXY and says so: a profile figure is wider relative to its
    height and carries its mass differently across the vertical axis than a
    three-quarter one. It cannot name the true camera angle. It answers only
    "does this frame carry its mass like the reference does", which is enough
    to catch a set drifting away from its own idle."""
    frames = load_frames(args.paths)
    if len(frames) < 2:
        print('need a reference frame plus at least one to check')
        return 1

    def shape(f):
        m = f.mask()
        bb = f.bbox()
        x0, y0, x1, y1 = bb
        w, h = x1 - x0 + 1, y1 - y0 + 1
        crop = m[y0:y1 + 1, x0:x1 + 1]
        # Mass either side of the ink's own centre of gravity: a profile pose
        # aiming across frame is lopsided, a squarer stance is balanced.
        cols = crop.sum(axis=0)
        cx = (np.arange(len(cols)) * cols).sum() / max(1, cols.sum())
        left = cols[:int(cx)].sum(); right = cols[int(cx):].sum()
        return w / h, abs(left - right) / max(1, cols.sum())

    ref = frames[0]
    ra, rb = shape(ref)
    print(f'facing drift vs reference: {ref.name}')
    print(f'  reference  aspect {ra:.2f}  lopsided {rb:.2f}\n')
    print(f'{"frame":<44}{"aspect":>7}{"lopsided":>10}   note')
    flagged = 0
    for f in frames[1:]:
        a, b = shape(f)
        note = ''
        if a > ra * 1.35:
            note, flagged = 'much WIDER than the reference — check for profile (D1)', flagged + 1
        elif abs(b - rb) > 0.25:
            note, flagged = 'mass sits very differently — check facing (D2)', flagged + 1
        print(f'{f.name:<44}{a:>7.2f}{b:>10.2f}   {note}')
    print(f'\n{flagged} frame(s) worth eyeballing against Bible §5.')
    print('A PROXY for direction, never a reading of it — the eye decides.')
    return 1 if flagged else 0


# Bible §11-§14 give each attack/hit/KO animation a named frame vocabulary and
# state, in prose, what must differ from what. Those statements are mostly
# checkable; these encode them so the claims stop being taken on trust.
VOCAB = {
    'melee': (5, ['READY', 'LOAD', 'STRIKE', 'OVERSHOOT', 'RECOVER']),
    'ranged': (5, ['LOW READY', 'AIM', 'FIRE', 'RECOIL', 'SETTLE']),
    'hit': (3, ['CONTACT', 'MAX RECOIL', 'CATCH']),
    'ko': (5, ['STAGGER', 'BUCKLE', 'FALL', 'IMPACT', 'DEAD']),
}


def cmd_vocab(args):
    kind = args.kind
    want, names = VOCAB[kind]
    frames = load_frames(args.paths)
    if len(frames) != want:
        print(f'  ! Bible sets {kind} at {want} frames; found {len(frames)}')
        if len(frames) < want:
            return 1
    sil = [norm_silhouette(f) for f in frames]
    hts = [(f.bbox()[3] - f.bbox()[1] + 1) if f.bbox() else 0 for f in frames]
    print(f'{kind} vocabulary (Bible: {" -> ".join(names)})\n')
    for i, f in enumerate(frames[:want]):
        print(f'  {i+1}. {names[i]:<12} {f.name}')
    print()
    flagged = 0

    def note(ok, msg):
        nonlocal flagged
        print(f'  {"ok " if ok else "!! "}{msg}')
        if not ok:
            flagged += 1

    if kind == 'melee':
        # §11: "The biggest silhouette contrast should usually be between
        # Frames 2 and 3" — load coiled, strike extended.
        adj = [iou(sil[i], sil[i + 1]) for i in range(len(sil) - 1)]
        note(adj.index(min(adj)) == 1,
             f'the biggest contrast is between LOAD and STRIKE (adjacent IoUs {[round(x,3) for x in adj]})')
        note(iou(sil[0], sil[4]) < DUP_IOU, 'RECOVER is not simply a duplicate of READY (§11.1 frame 5)')
    elif kind == 'ranged':
        # §12: "FIRE and RECOIL must not be the same pose."
        note(iou(sil[2], sil[3]) < DUP_IOU,
             f'FIRE and RECOIL are different poses (IoU {iou(sil[2], sil[3]):.3f})')
        note(iou(sil[1], sil[2]) < DUP_IOU, 'AIM and FIRE are distinguishable')
    elif kind == 'hit':
        # §13: frame 2 carries the strongest reaction, and 3 does not simply
        # return to 1.
        d2, d3 = 1 - iou(sil[0], sil[1]), 1 - iou(sil[0], sil[2])
        note(d2 >= d3, f'MAX RECOIL is the strongest reaction (deviation {d2:.3f} vs CATCH {d3:.3f})')
        note(iou(sil[0], sil[2]) < DUP_IOU, 'CATCH does not snap straight back to CONTACT')
    elif kind == 'ko':
        # §14: the body must actually go down, and the corpse must not be
        # spread over several near-identical frames.
        note(hts[4] < hts[0] * 0.75,
             f'DEAD is well below STAGGER ({hts[4]}px vs {hts[0]}px) — the body actually goes down')
        note(iou(sil[3], sil[4]) < DUP_IOU,
             f'IMPACT and DEAD are not near-identical corpse frames (IoU {iou(sil[3], sil[4]):.3f}, §14)')
    print(f'\n{flagged} issue(s). Vocabulary and geometry only — whether the pose is'
          '\nthe RIGHT pose, and whether it faces the right way, still needs the eye.')
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
        ('zoom', cmd_zoom, 'do poses stay distinct at the 46px the board actually draws?'),
        ('silhouette', cmd_silhouette, 'awkward-silhouette check: which frames read as one mass'),
        ('facing', cmd_facing, 'direction drift (D1/D2) vs a reference frame — first path is the reference'),
        ('vocab', cmd_vocab, 'Bible 11-14 frame vocabularies for melee/ranged/hit/ko'),
    ]:
        p = sub.add_parser(name, help=helptext)
        p.add_argument('paths', nargs='+')
        if name == 'pairs':
            p.add_argument('--half', type=int, default=None)
        if name == 'vocab':
            p.add_argument('--kind', required=True, choices=sorted(VOCAB))
        p.set_defaults(fn=fn)
    args = ap.parse_args()
    sys.exit(args.fn(args))


if __name__ == '__main__':
    main()
