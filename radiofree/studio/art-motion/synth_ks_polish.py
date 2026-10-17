"""Kill Switch, polish test: the score. Glossy and small, from the Doodle palette's voices (the station's
tech-ad sound): a 112 BPM bed of tight kick, hats, plucks and sub, and a sound on every move in
clay-leaflet/motion.js, read from its EVENTS (motion-events.json).
The edit's one joke is in the sound: the finger taps the kill switch and the MUSIC STOPS. Nothing happens,
in silence, until the camera pulls back and the beat comes back in.

    uv run --with numpy --with soundfile python 音频/synth_ks_polish.py <events.json> <out.wav>
"""
import sys, json
from pathlib import Path
for _d in (Path(__file__).resolve().parent, Path(__file__).resolve().parents[1]): sys.path.insert(0, str(_d / 'lib'))
from rfsound import *

EV = json.load(open(sys.argv[1])); OUT = sys.argv[2]
END = 11.0
m = Mix(END + 0.5)
B = 60 / 112

def whoosh(d=0.45, up=True, g=1.0):
    t = tv(d); x = noise(d, 300, 9000)
    x = sweep(x, 400 if up else 6000, 6000 if up else 400, high=False)
    return x * np.sin(np.pi * t / d) ** 1.5 * 0.5 * g

# ---- the bed: a bar of A minor, F, C, G; the music stops at the tap and comes back at the pull
silent = (EV['tap'] + 0.02, EV['pull'])
chords = [(57, 60, 64), (53, 57, 60), (48, 52, 55), (55, 59, 62)]
t = EV['land']
bar = 0
while t < END - 0.6:
    for beat in range(4):
        tb = t + beat * B
        if tb >= END - 0.6 or (silent[0] <= tb < silent[1]): continue
        m.add(kick_tight(0.55), tb, 0.5)
        m.add(hat(vel=0.35), tb + B / 2, 0.35, pan=0.3)
        if beat in (1, 3): m.add(clap(0.3), tb, 0.22, pan=-0.2)
        ch = chords[bar % 4]
        m.add(sub_bass(ch[0] - 24, B * 0.9), tb, 0.45)
        for k, n in enumerate(ch): m.add(pluck(n + 12, 0.22, 0.8), tb + B / 2 + k * 0.012, 0.16, pan=(k - 1) * 0.4)
    t += 4 * B; bar += 1

# ---- the moves
m.add(whoosh(0.5, True, 1.1), EV['enter'], 0.9)
m.add(card(), EV['land'], 0.8); m.add(thump(), EV['land'], 0.5)
for k in ('punch1', 'toToaster', 'toGrid'): m.add(whoosh(0.28, True, 0.6), EV[k], 0.5)
for w in EV['words']:
    if w['pop']: m.add(blip(1760), w['t'] + 0.04, 0.5); m.add(chime(84, 0.5), w['t'] + 0.04, 0.25)
for i in range(6): m.add(click(), EV['jam'] + i * 0.05, 0.6, pan=-0.4)
m.add(glide(180, 120, 0.25), EV['jam'] + 0.05, 0.4)
m.add(click(), EV['flip2'], 0.8, pan=0.4); m.add(glide(880, 1320, 0.12), EV['flip2'] + 0.03, 0.5)
for i, tp in enumerate(EV['pictTimes']): m.add(marimba(72 + [0, 2, 4, 7, 9, 12, 14, 16][i], 0.3, 0.7), tp, 0.45, pan=((i % 4) - 1.5) * 0.3)
m.add(blip(1320), EV['picts'] + 0.75, 0.4)
m.add(whoosh(0.5, False, 1.0), EV['flipA'], 0.8); m.add(card(), EV['flipB'], 0.7)
for i, tp in enumerate(EV['rollTicks']): m.add(tick(), tp, 0.6); m.add(blip(1760 * 2 ** (-i / 12)), tp, 0.2)
m.add(stamp(), EV['slap'], 0.9); m.add(card(), EV['slap'] + 0.01, 0.6)
m.add(click(), EV['tap'], 1.0)
m.add(tone(110, 0.25, (1, 0.3), 0.002, 0.2, decay=8), EV['tap'] + 0.02, 0.5)   # a dull thup: nothing happens
m.add(whoosh(0.5, False, 0.9), EV['pull'], 0.7)
m.add(whoosh(0.25, True, 0.6), EV['tagIn'], 0.5); m.add(click(), EV['tagIn'] + 0.4, 0.5)
m.add(stamp(), END - 0.6, 0.7); m.add(chime(81, 1.2), END - 0.6, 0.3)

m.finish(OUT, END, END - 0.45, tau=0.35, lufs=-14.0)
