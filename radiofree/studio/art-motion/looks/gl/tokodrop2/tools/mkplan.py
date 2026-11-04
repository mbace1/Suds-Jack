# writes looks/gl/tokodrop2/plan.json for the full film (4 Nov): python3 tools/mkplan.py plan.json tools/froms.json
# froms.json: where each cut starts in its capture folder, in source frames (30 fps)
import json, sys
PLAN, FROMS = sys.argv[1], sys.argv[2]
fr = json.load(open(FROMS))            # src -> {cutname: start frame}
BPM = 172; B = 60 / BPM; BAR = 4 * B
p = json.load(open(PLAN))
intro = [s for s in p['segs'] if s['kind'] == 'intro']
# (beats, src, label, note, crop)
CUTS = [
 (4, 'w8', 'ARCADE', 'real play, world 8 (the deep): a bounty, the gates, a slam ring', 'opener', None),
 (4, 'w2', 'GATES', 'real play, world 2 driveway: gates, DASH THROUGH!', 'gates', None),
 (4, 'g1', 'GIANTS', 'staged: a giant and its escort under fire, shedding goo as it wears (v114)', 'shed', [0.48, 0.42, 1.8]),
 (2, 'g2', 'STEP OUT!', 'staged: a giant gathers, its ring and the STEP OUT! tag (v115); the hero steps out', 'step', [0.5, 0.5, 1.5]),
 (2, 'g1', 'SPLIT!', 'staged: the giant bursts and splits in two', 'down', [0.48, 0.42, 1.8]),
 (4, 'ram', 'CLEAR THE LANE!', 'staged: world 3 sewer, a ram lane lit with four gels in it, CLEAR THE LANE! (v115)', 'lane', [0.72, 0.44, 1.8]),
 (2, 'ram', 'SEWER RAMS', 'staged: the ram punches the gels down the lane (v110)', 'ram', [0.72, 0.44, 1.8]),
 (2, 'w3', 'HOLD THE RING', 'real play, world 3', 'w3', None),
 (4, 'w4', 'CISTERN', 'real play, world 4', 'w4', None),
 (4, 'w5', 'BOILER', 'real play, world 5', 'w5', None),
 (2, 'w6', 'RIVER', 'real play, world 6', 'w6', None),
 (2, 'w7', 'ICE', 'real play, world 7', 'w7', None),
 (2, 'w8', 'THE DEEP', 'real play, world 8', 'deep', None),
 (2, 'w9', 'CORE', 'real play, world 9', 'w9', None),
 (4, 'boss', 'BOSS', 'real play: world 1 boss wave (debug.bossWave)', 'boss', None),
 (4, 'boss', 'WORLD CLEAR', 'the boss put down (debug.killBosses): the floor swallows the drop', 'clear', None),
 (1, 'w5', '', 'one beat', 'b1', None), (1, 'w6', '', 'one beat', 'b2', None), (1, 'w7', '', 'one beat', 'b3', None), (1, 'w8', '', 'one beat', 'b4', None),
 (4, 'escort', 'GIANT + ESCORT', 'staged: a giant riding its escort of mites (v106), world 9', 'escort', [0.45, 0.48, 1.5]),
 (4, 'dash', 'DASH', 'staged: the hero dashes through a line of bodies (debug.act)', 'dash', [0.5, 0.55, 1.3]),
 (4, 'w9', '', 'real play, world 9: the last bar', 'finale', None),
]
segs = list(intro); t = intro[-1]['t1']
for beats, src, label, note, key, crop in CUTS:
    s = {'kind': 'play', 't0': round(t, 4), 't1': round(t + beats * B, 4), 'src': src, 'label': label, 'ver': '', 'punch': 0.05 if beats <= 2 else 0.035,
         'note': note, 'from': round(fr.get(key, 0) / 30, 4)}
    if crop: s['crop'] = crop
    segs.append(s); t += beats * B
segs.append({'kind': 'card', 't0': round(t, 4), 't1': p['end'], 'note': 'end card B: the game\'s own title screen, PLAY FREE IN THE ARCADE'})
assert abs(t - 30.6977) < 0.01, t
p['segs'] = segs; p['title'] = {'src': 'title', 'from': 0.0}
json.dump(p, open(PLAN, 'w'), indent=1); print(len(segs), 'segs, card at', round(t, 3))
