# writes looks/gl/tokodrop2/plan.json for the Toko Midori Games re-cut (8 Nov): python3 tools/mkplan3.py plan.json
# Every cut is on the 172 BPM beat grid; the layout is 16 intro beats + 40 compilation beats + a 16-beat end slate
# = 72 beats = 18 bars = 25.12 s (the 4 Nov GL film was 96 beats, 33.49 s). score.py reads its bars off this file.
# `from` is where a cut starts in its capture folder, in source frames (30 fps); `kind` says what the cut shows:
# REAL = the game played by the capture's player (tools/bot.cjs through debug.capPlay), STAGED = the game's own
# look-check hooks (showcase/idle/act) place the bodies and script the hero (tools/stage2.cjs).
import json, sys
OUT = sys.argv[1]
BPM = 172; B = 60 / BPM
# the game's own intro, three runs: (beats, from in intro seconds, what it keeps)
INTRO = [
 (7, 1.90, 'the Toko Midori Games lockup, then "Toko drop" builds in its place'),
 (5, 5.60, 'the drop hangs from the magenta bar, lets go, falls, lands; the ring goes out'),
 (4, 9.10, 'it opens its eyes over the grid, drops to the floor of world 1; the HUD comes in'),
]
# (beats, src, from frame, label, kind, note, crop)
CUTS = [
 (4, 'w1', 55,  'WORLD 1 · THE GRID',        'REAL', 'world 1 in the void (v123): the neon loops round it, every body a light; a WALL CURTAIN of shots', None),
 (4, 'w1', 115, 'WORLD 1 · THE GRID',        'REAL', 'world 1: WAVE 6 CLEAR, then wave 7 and a BOUNTY body', None),
 (4, 'w2', 100, 'WORLD 2 · THE DRIVEWAY',    'REAL', 'world 2: the DASH THE GATES challenge, a tank and the rolling ball (v111)', None),
 (4, 'w3', 72,  'WORLD 3 · THE SEWER',       'REAL', 'world 3: a giant gathers and slams beside the hero (v112)', None),
 (4, 'w4', 50,  'WORLD 4 · THE CISTERN',     'REAL', 'world 4: DIAG CURTAIN, a floor of goo', None),
 (4, 'w5', 60,  'WORLD 5 · THE BOILER ROOM', 'REAL', 'world 5: PROTECT THE HEART', None),
 (2, 'w6', 25,  'WORLD 6 · THE RIVER',       'REAL', 'world 6: HOLD THE RING, a crab-legged giant', None),
 (2, 'w7', 30,  'WORLD 7 · THE ICE SHEET',   'REAL', 'world 7: SWARM', None),
 (2, 'w8', 60,  'WORLD 8 · THE DEEP',        'REAL', 'world 8: COLLECT THE GEMS', None),
 (4, 'w9', 36,  'WORLD 9 · THE CORE',        'REAL', 'world 9: PROTECT THE HEART on the magenta grid', None),
 (6, 'boss', 34, 'WORLD 1 · BOSS',           'REAL', 'world 1: TWIN PRISMS (debug.bossWave jumps the run to its boss wave), fought by the capture player', None),
]
FROMS = json.load(open(sys.argv[2])) if len(sys.argv) > 2 else {}
segs, t = [], 0.0
for beats, fr, note in INTRO:
    segs.append({'kind': 'intro', 't0': round(t, 4), 't1': round(t + beats * B, 4), 'src': 'intro', 'from': fr, 'note': note}); t += beats * B
for beats, src, fr, label, kind, note, crop in CUTS:
    fr = FROMS.get(src, fr)
    s = {'kind': 'play', 't0': round(t, 4), 't1': round(t + beats * B, 4), 'src': src, 'label': label, 'punch': 0.05 if beats <= 2 else 0.035,
         'take': kind, 'note': note, 'from': round(fr / 30, 4)}
    if crop: s['crop'] = crop
    segs.append(s); t += beats * B
assert abs(t - 56 * B) < 1e-6, t
end = 72 * B
segs.append({'kind': 'card', 't0': round(t, 4), 't1': round(end, 4), 'note': 'the Toko Midori Games end slate: lockup, TOKO DROP 2.0, COMING IN 2027, the two handles as words'})
json.dump({'bpm': BPM, 'fps': 30, 'end': round(end, 4), 'segs': segs}, open(OUT, 'w'), indent=1)
print(len(segs), 'segs; slate at', round(t, 3), 's; end', round(end, 3), 's')
