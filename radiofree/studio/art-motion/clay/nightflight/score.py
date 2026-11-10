"""Night Flight (RFH channel promo, 10 Nov) — the cue sheet. Its own kit, NIGHT FLIGHT (pipeline/sound/nightflight.py),
per SOUND.md "Sound per film": the drone is the engine of the track. Only the station's three-note call (G C G) is shared
with the house; everything else is this film's.

  0 · the fly-by: wind in the spruces, an owl far off; the drone comes out of the dark and passes over the lens
      (its rotor rises, Dopplers down, a whoosh over the top)
  1 · its own view: the rotor on board, its pitch following the speed (slow at each flag, fast between); a muted
      pulse in A minor; each lock is three rising beeps and a low thump, and the label is written in blips;
      the climb out through the canopy rises into
  2 · the lake country: a wide held chord (F add9) opens with the land, air rushes past, the aurora shimmers in
      high bells, a loon calls across the water; the chords walk F, C, G
  3 · Helsinki: the music lifts — sixteenths, a kick, the sub; a ferry's horn, a tram's bell
  4 · the landing: the music thins to one held chord (G sus) and the rotor is the sound; a tick on the perch, the
      rotor winds down; a breath of quiet
  5 · ON AIR: the relay closes, the neon buzzes and catches; the call rings on the three rings; the chord resolves
      to C, wide, and rings out over the name and the slogan

    uv run --with numpy --with soundfile python clay/nightflight/score.py <events.json> <out.wav> [<report.json> <stems>]
"""
import sys, json
from pathlib import Path
import numpy as np
sys.path[:0] = [str(Path(__file__).resolve().parents[2] / 'pipeline' / 'sound')]
from mix import Session
from sfx import whoosh, swish, tick, WHOOSH, _noise, _fade, _norm, _g
from rfsound import SR, tv, soft, celesta, chime, sparkle, sub_bass, supersaw, kick_tight, hat, riser
from nightflight import (NightFlight as NF, rotor, lockbeep, lockthump, data, owl, loon, ferryhorn, trambell, relay, neon,
                         airrush, pines, pulse_bar, arp_bar, chord_pad)

EV = json.load(open(sys.argv[1])); OUT = sys.argv[2]
REP = sys.argv[3] if len(sys.argv) > 3 else None; STEMS = sys.argv[4] if len(sys.argv) > 4 else None
T = {k: v for k, v in EV.items() if isinstance(v, (int, float))}; RINGS = EV['rings']; LOCK = [EV[f'lock{i}'] for i in range(3)]
END = T['end']; s = Session(END + 0.5, NF); B = NF.B; BAR = 4 * B
FLAGS = ['FELLING AT NIGHT', 'UNMARKED BOXES', 'NO NAME ON THE GATE']
seg = lambda t0, t1: np.arange(int((t1 - t0) * SR)) / SR + t0     # the film's clock across a stretch

# ── 0 · the fly-by
s.fx(pines(T['land'] + 0.3), 0.0, 0.07, -0.2, name='wind in the spruces')
s.fx(owl(), 0.15, 0.05, -0.65, wet=0.5, name='an owl, far off')
tt = seg(0, T['fpv']); PASS = 1.05
dist = 3 + 30 * np.abs(tt - PASS) ** 1.1
f = 175 * (1 + 0.075 * np.tanh((PASS - tt) * 5))                   # higher coming in, lower going away
s.fx(rotor(T['fpv'], (f - 118) / 92, (6 / (6 + dist)) ** 1.3, seed=1), 0.0, 0.62, np.clip((tt[-1] - PASS) * 0.4, -0.3, 0.3), wet=0.18, name='the drone passes over the lens')
s.fx(whoosh('mid', 'in', bright=0.7), PASS - WHOOSH['mid'] * 0.8, 0.22, 0.1, at=PASS, name='over the top')

# ── 1 · its own view: the rotor on board, slow at each flag, flat out between, climbing at the end
tt = seg(T['fpv'], T['land'])
sp = 0.85 - 0.6 * sum(np.exp(-((tt - L) / 0.55) ** 2) for L in LOCK) + 0.15 * np.clip((tt - 7.0) / 1.2, 0, 1)
s.fx(rotor(T['land'] - T['fpv'], sp, 1.0, onboard=True, seed=2), T['fpv'], 0.2, 0, wet=0.05, name='on board: the rotor')
s.fx(swish(), T['fpv'] - 0.12, 0.1, 0, name='the cut to its own view')
for i, (bt, ch) in enumerate(zip((T['fpv'], T['fpv'] + BAR, T['fpv'] + 2 * BAR), (NF.Am, NF.F, NF.G))):
    pulse_bar(s, bt, ch, g=0.09 + 0.02 * i)
    chord_pad(s, bt, BAR, ch, g=0.035 + 0.01 * i, cut=1100 + 600 * i, r=0.4)
s.note(riser(1.4), T['land'] - 1.4, 0.16, 0, 0.3, stem='fx-music', name='the climb out through the canopy')
s.fx(swish(), 7.15, 0.12, -0.3, name='through the branches'); s.fx(swish(), 7.45, 0.1, 0.3, name='through the branches')
for i, L in enumerate(LOCK):
    for k, dt in enumerate((0.45, 0.3, 0.15)): s.fx(lockbeep(k), L - dt, 0.12, 0.1, name=f'flag {i + 1}: acquiring')
    s.fx(lockthump(), L, 0.42, 0, wet=0.15, name=f'flag {i + 1}: LOCK'); s.fx(chime(88 + 2 * i, 0.3), L + 0.01, 0.06, 0.2, wet=0.3, name=f'flag {i + 1}: confirm')
    s.fx(data(len(FLAGS[i]) // 2 + 4, seed=i), L + 0.02, 0.07, 0.25, name=f'flag {i + 1}: the label is written')
    s.fx(data(5, seed=10 + i, rate=40), L + 1.0, 0.05, -0.4, name=f'flag {i + 1}: logged')
    s.duck(L - 0.05, L + 0.35, -4, why=f'lock {i + 1}')

# ── 2 · the lake country: it opens
s.fx(whoosh('long', 'out', bright=1.0), T['land'], 0.24, 0, wet=0.3, name='out over the lake')
s.fx(airrush(T['city'] - T['land'] + 0.3), T['land'], 0.08, 0, name='air rushing past')
tt = seg(T['land'], T['city']); s.fx(rotor(T['city'] - T['land'], np.full(len(tt), 1.0), 1.0, onboard=True, seed=3), T['land'], 0.09, 0, wet=0.05, name='on board: flat out')
chord_pad(s, T['land'], 2.6, NF.Fadd9, g=0.08, cut=3600, r=1.6, name='the lake opens: F add9')
s.note(sub_bass(41, 2.4), T['land'], 0.22, 0, 0.1, stem='bass', name='the sub under it')
s.note(sparkle(84), T['land'] + 0.04, 0.1, 0.2, 0.6, stem='bells', name='the aurora')
for ch, t0, d in ((NF.C, 11.0, 1.4), (NF.G, 12.4, 1.25)):
    chord_pad(s, t0, d, ch, g=0.075, cut=3200, r=1.0, name='the lake chords')
    s.note(sub_bass(ch[0], d), t0, 0.2, 0, 0.1, stem='bass', name='sub')
pulse_bar(s, 11.0, NF.C, g=0.05, sub=False, bright=0.5)
g = _g('aurora'); PENTA = (84, 86, 88, 91, 93, 96)
for i, t0 in enumerate(np.arange(T['land'] + 0.5, T['city'] - 0.3, 0.42)):
    s.note(chime(PENTA[int(g.random() * len(PENTA))], 0.4), t0 + g.random() * 0.12, 0.03, g.uniform(-0.7, 0.7), 0.7, stem='bells', name='the aurora shimmers')
s.fx(loon(), 9.3, 0.045, -0.6, wet=0.65, name='a loon across the water')
s.note(riser(0.9), T['city'] - 0.9, 0.1, 0, 0.3, stem='fx-music', name='into the city')

# ── 3 · Helsinki: the music lifts
s.fx(whoosh('mid', 'in', bright=0.8), T['city'] - WHOOSH['mid'] * 0.8, 0.2, 0, at=T['city'], name='the cut to the harbor')
tt = seg(T['city'], T['home']); sp = 1.0 - 0.6 * np.clip((tt - T['city']) / (T['home'] - T['city']), 0, 1)
s.fx(rotor(T['home'] - T['city'], sp, 1.0, onboard=True, seed=4), T['city'], 0.11, 0, wet=0.05, name='on board: slowing for home')
s.fx(soft(_noise(T['home'] - T['city'] + 0.4, _g('city')), 40, 320, 2) * 0.5, T['city'], 0.12, 0, wet=0.2, name='the city, low')
for i, (bt, ch) in enumerate(((T['city'], NF.F), (T['city'] + BAR, NF.G))):
    arp_bar(s, bt, ch, g=0.07 + 0.015 * i, bright=0.8); pulse_bar(s, bt, ch, g=0.08)
    chord_pad(s, bt, BAR, ch, g=0.05, cut=3000, r=0.6)
    for k in range(4): s.note(kick_tight(0.7), bt + k * B, 0.32, 0, 0.05, stem='drums', name='kick')
    for k in range(4): s.note(hat(False, 0.5), bt + k * B + B / 2, 0.16, 0.3, 0.1, stem='drums', name='hat')
s.fx(ferryhorn(2.4), 14.0, 0.1, 0.55, wet=0.5, name="a ferry's horn")
s.fx(trambell(), 16.9, 0.07, -0.35, wet=0.3, name="the tram's bell")

# ── 4 · the landing: one held chord, the rotor, the perch, the hush
s.fx(whoosh('short', 'in', bright=0.5), T['home'] - WHOOSH['short'] * 0.8, 0.16, 0, at=T['home'], name='the cut behind the drone')
Gsus = (43, (55, 60, 62)); chord_pad(s, T['home'], T['on'] - T['home'] - 0.2, Gsus, g=0.05, cut=1500, r=0.4, name='one held chord: G sus')
s.note(sub_bass(31, T['on'] - T['home'] - 0.2), T['home'], 0.18, 0, 0.1, stem='bass', name='sub under it')
tt = seg(T['home'], T['down'] + 0.8); spin = np.clip((tt - T['down']) / 0.65, 0, 1)
sp = 0.42 - 0.1 * np.clip((tt - T['home']) / 1.8, 0, 1) - 1.25 * spin ** 0.8
s.fx(rotor(T['down'] + 0.8 - T['home'], sp, (1 - spin) ** 1.5, seed=5), T['home'], 0.42, 0.15, wet=0.15, name='the drone settles; the rotor winds down')
s.fx(tick(0, True), T['down'], 0.3, 0.15, name='feet on the perch'); s.fx(lockthump(), T['down'] + 0.004, 0.12, 0.15, name='its weight')
s.duck(T['down'] - 0.25, T['on'] + 0.02, -10, attack=0.2, release=0.05, why='the hush before ON AIR')

# ── 5 · ON AIR: the relay, the neon, the call, the chord
s.fx(relay(), T['on'], 0.55, -0.35, wet=0.2, name='ON AIR: the relay closes')
tt = seg(T['on'], END); on = np.where(tt < T['on'] + 0.18, (np.sin(tt * 90) > 0) * 1.0, 0.9 + 0.1 * np.sin(tt * 11))
s.fx(neon(END - T['on'], on), T['on'], 0.045, -0.35, wet=0.1, name='the neon buzzes and catches')
for i, (t, m) in enumerate(zip(RINGS, (67, 72, 79))): s.note(celesta(m, 0.6 if i == 2 else 0.3), t, 0.42, (i - 1) * 0.3, 0.4, stem='motif', name=f'the call: ring {i + 1}')
C_WIDE = (36, (48, 55, 60, 64, 67, 72)); hold = END - T['chord'] - 0.2
chord_pad(s, T['chord'], hold, C_WIDE, g=0.085, cut=4200, r=2.2, name='the chord resolves: C, wide')
s.note(sub_bass(36, 2.5), T['chord'], 0.24, 0, 0.1, stem='bass', name='C under everything')
s.note(sparkle(84), T['chord'] + 0.02, 0.14, 0.15, 0.6, stem='bells', name='the bell over it')
s.fx(lockthump(), T['chord'], 0.32, 0, wet=0.3, name='the chord lands')
s.fx(whoosh('short', 'in', bright=0.6), T['l1'] - WHOOSH['short'] * 0.8, 0.09, -0.1, at=T['l1'], name='RADIO FREE rises')
s.fx(whoosh('short', 'in', bright=0.6), T['l2'] - WHOOSH['short'] * 0.8, 0.09, 0.1, at=T['l2'], name='HELSINKI rises')
for i, dt in enumerate((0.0, 0.22, 0.4)): s.fx(swish(), T['slogan'] + dt, 0.05, (-0.2, 0.0, 0.2)[i], name=f'slogan line {i + 1}')
s.fx(pines(END - T['home'] + 0.2), T['home'], 0.035, 0.3, name='wind over the roofs')

cues = [(k, T[k]) for k in ('fpv', 'land', 'city', 'home', 'down', 'on', 'l1', 'l2', 'chord', 'slogan')] + \
       [(f'ring{i}', t) for i, t in enumerate(RINGS)] + [(f'lock{i}', t) for i, t in enumerate(LOCK)]
s.render(OUT, ring_from=END - 0.9, tau=0.6, end=END, cues=cues, exempt={}, quiet=[], stems_dir=STEMS, report=REP)
