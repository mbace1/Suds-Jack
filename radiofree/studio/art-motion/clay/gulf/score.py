"""Stable (RFH, Helsinki · the drone war in the Gulf of Finland), 3D v1 — the cue sheet. Its own kit: GULF
(pipeline/sound/gulf.py), first built for this film. Ominous, a war piece.
  s1  SEA   wind, swell, a sub drone that beats; a foghorn far off; the flash: a far boom rolling over the water
  s2  ROOM  the transformer hum; the marker drops (a knock); sonar pings with the sweep; the teleprinter; a heartbeat begins
  s3  SEA   again the sea; the fire crackles across the water; a second boom; the low string cluster
  s4  ROOM  the alarm far down a corridor with the beacon; timpani roll up to "Again"; the zone lands on a low hit; the marker
  s5  ROOM  the teleprinter types STABLE; the heartbeat faster; the THUD (everything ducks), the lamp buzzes and fails;
            on OUT every sound stops dead: a click, one sonar ping in the dark, silence, the station's sting

    uv run --with numpy --with soundfile python clay/gulf/score.py <events.json> <out.wav> [<report.json> <stems>]
"""
import sys, json
from pathlib import Path
import numpy as np
sys.path[:0] = [str(Path(__file__).resolve().parents[2] / 'pipeline' / 'sound')]
from mix import Session
from stems import sting
from rfsound import knock, lamp_click, timpani
from gulf import Gulf as K, sea_bed, sub, far_boom, foghorn, sonar, crackle, teleprinter, hum, buzz, heart, alarm, cluster, swell_roll

EV = json.load(open(sys.argv[1])); OUT = sys.argv[2]
REP = sys.argv[3] if len(sys.argv) > 3 else None; STEMS = sys.argv[4] if len(sys.argv) > 4 else None
T = {k: v for k, v in EV.items() if isinstance(v, (int, float))}
END = T['end']; s = Session(END + 0.5, K); O = T['out']

# the sea, twice
for a, b, k in ((0.0, T['s2'], 1), (T['s3'], T['s4'], 2)):
    s.fx(sea_bed(b - a + 0.3, k), a, 0.5, 0.0, wet=0.12, name='the sea: wind and swell')
s.fx(sub(O, 34.0), 0.0, 0.55, 0.0, wet=0.1, name='the sub drone, beating')
s.fx(foghorn(2.6), 0.4, 0.16, -0.5, wet=0.5, name='a foghorn, far off')
s.fx(far_boom(1, 1.0), T['flash'], 0.6, 0.2, wet=0.45, name='the flash: a far boom over the water')
s.fx(crackle(T['s4'] - T['fire'], 3), T['fire'], 0.22, -0.3, wet=0.3, name='the fire across the water')
s.fx(far_boom(2, 0.7), T['fire'] + 0.02, 0.45, -0.3, wet=0.5, name='the second boom')

# the room: hum from s2 to OUT (on the sea shots it drops away)
for a, b in ((T['s2'], T['s3']), (T['s4'], O)):
    s.fx(hum(b - a), a, 0.12, 0.0, wet=0.08, name='the room: a transformer hum')
s.fx(knock(0.9, 140), T['mark1'], 0.35, 0.2, wet=0.2, name='the first marker drops')
s.fx(knock(0.9, 140), T['mark2'], 0.35, 0.3, wet=0.2, name='the second marker drops')
for k in sorted(k for k in T if k.startswith('ping')): s.fx(sonar(), T[k], 0.16, -0.2, wet=0.55, name='sonar: the sweep')
s.fx(teleprinter(T['tty1End'] - T['tty1'], 1), T['tty1'], 0.3, -0.35, wet=0.12, name='the teleprinter: NO IMMEDIATE THREAT')
s.fx(alarm(T['s5'] - T['beacon']), T['beacon'], 0.1, 0.5, wet=0.6, name='an alarm, far down a corridor')
s.fx(far_boom(3, 0.5), T['zone'], 0.4, 0.0, wet=0.3, name='the zone lands: a low hit')
s.fx(teleprinter(T['tty2End'] - T['tty2'], 2), T['tty2'], 0.3, -0.35, wet=0.12, name='the teleprinter: STABLE')
s.fx(far_boom(4, 1.0), T['thud'], 0.7, 0.1, wet=0.35, name='the thud: something close')
s.duck(T['thud'] - 0.02, T['thud'] + 0.8, -6, attack=0.01, release=0.4, why='the thud')
s.fx(buzz(O - T['thud'] - 0.05, 1), T['thud'] + 0.05, 0.1, 0.0, wet=0.1, name='the lamp, failing')
s.fx(lamp_click(), O, 0.5, 0.0, wet=0.2, name='OUT: the lamp')
s.fx(sonar(1040.0), O + 0.6, 0.2, 0.0, wet=0.7, name='one ping in the dark')

# the heart: from s2, slow; faster in s5; it stops at OUT
t = T['s2'] + 0.5
while t < O - 0.2:
    s.fx(heart(0.7), t, 0.4, 0.0, wet=0.05, name='a heartbeat'); t += 1.25 if t < T['s5'] else 0.85

# music: the cluster under the sea and the end; the roll into "Again"
cluster(s, T['s1'] + 0.3, T['s2'] - 0.1, g=0.05)
cluster(s, T['s3'], T['s4'] + 0.6, g=0.06, notes=(36, 37, 42))
swell_roll(s, T['zone'] - 1.6, 1.6, g=0.14)
cluster(s, T['s5'], O - T['s5'], g=0.07, notes=(31, 36, 37))
# every pop word: the cluster's low note, struck
for w in EV['words']:
    if not w['pop']: continue
    s.note(timpani(36, 1.6, 0.4), w['t'], 0.08, 0.0, 0.3, stem='drums', name=f'pop {w["w"]}')
sting(s, END - 0.6)
cues = [(k, T[k]) for k in EV['cueNames']]
s.render(OUT, ring_from=END - 0.45, tau=0.35, end=END, cues=cues, exempt={}, quiet=[[O, END]], stems_dir=STEMS, report=REP)
