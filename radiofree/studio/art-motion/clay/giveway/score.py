"""Give Way (RFH · Highway 9, the road base) — the cue sheet, v1 (12 Nov). Per SOUND.md, "Sound per film", its sound is
its own world's: the CABIN kit (pipeline/sound/cabin.py), first built for this film. A car at night from the driver's
seat, a sat-nav that never raises its voice, and what comes over the roof. Only the station's sting at the end, and
the sign-off after it, are the house's.

  0 · the drive: engine and tires on packed snow, the heater; one low pulse a beat (90 BPM, E minor)
  1 · the sat-nav's alert (three glass notes), and the road's pulse tightens to eighths
  2 · the Hornet comes over the roof from behind: the low end first, the roar, the whine bent by the pass; the dash
      rattles; the music ducks 10 dB. Far off, tires meet the road
  3 · the car stops: tires settle on the snow, and the hazard relay starts. Its tick-tock IS the click track from here:
      a marimba vamp answers it (Em, C, G, D), a round bass under it
  4 · three flights high up, each a long tear across the sky; a blip as each row lands on the sat-nav's list, and two
      falling notes for the row that is not taking part
  5 · the take-off: the afterburner's crackle grows down the road, passes over the roof and throws the road's snow at
      the glass (the music ducks 14 dB and the vamp stops)
  6 · "Recalculating": only the relay, the idle and the sat-nav thinking. On "runway" its chime resolves to C, the
      chord opens under it, and the station's sting closes the film
  every caption is announced by the sat-nav's chime; every pop word is a glass blip and a marimba note

    uv run --with numpy --with soundfile python clay/giveway/score.py <events.json> <out.wav> [<report.json> <stems>]
"""
import sys, json
from pathlib import Path
import numpy as np
sys.path[:0] = [str(Path(__file__).resolve().parents[2] / 'pipeline' / 'sound')]
from mix import Session
from stems import sting
from sfx import whoosh, WHOOSH
from rfsound import SR, sub_bass, supersaw, marimba, sparkle, pluck
from cabin import Cabin, drive, heater, navchime, navhit, blip, relay, jet, rattle, chirp, faraway, snowblast, crunch, road_bar, vamp_bar

EV = json.load(open(sys.argv[1])); OUT = sys.argv[2]
REP = sys.argv[3] if len(sys.argv) > 3 else None; STEMS = sys.argv[4] if len(sys.argv) > 4 else None
T = {k: v for k, v in EV.items() if isinstance(v, (int, float))}
END = T['end']; s = Session(END + 0.5, Cabin); B = Cabin.B; BAR = 4 * B
seg = lambda t0, t1: np.arange(int((t1 - t0) * SR)) / SR + t0     # the film's clock across a stretch


def smooth(k): k = np.clip(k, 0, 1); return k * k * (3 - 2 * k)


# ── 0 · the car, all the way through: at speed, braking on the picture's own curve, then idling at the block
tt = seg(0, END); sp = 1 - smooth((tt - T['brake']) / (T['stop'] - T['brake']))
s.fx(drive(END, sp), 0.0, 0.1, 0, wet=0.05, name='the car: engine and tires on snow, then idling')
s.fx(heater(END), 0.0, 0.03, 0.25, name='the heater fan')
road_bar(s, 0.0, Cabin.Em, g=0.07)
road_bar(s, BAR, Cabin.C, g=0.075)

# ── 1 · the alert; the road's pulse tightens until the jet takes the frame
s.fx(navchime('alert'), T['alert'], 0.3, 0.12, wet=0.2, name='sat-nav: the alert (road closed ahead)')
t = T['alert'] + 0.45; k = 0
while t < T['pass1'] - 1.0:
    s.note(pluck(52 if k % 4 else 40, 0.16, 0.45), t, 0.06 + 0.008 * k, (-0.25, 0.25)[k % 2], 0.2, stem='keys', name='the pulse tightens'); t += B / 2; k += 1

# ── 2 · the Hornet over the roof, from behind
LEAD = 3.4
s.fx(jet(7.4, LEAD, v=62, h=9, away=True, burner=0.15, seed=1), T['pass1'] - LEAD, 1.35, 0, wet=0.1, at=T['pass1'], name='the Hornet passes over the roof')
tt = seg(T['pass1'] - 0.9, T['pass1'] + 0.9)
s.fx(rattle(1.8, np.exp(-((tt - T['pass1'] - 0.05) / 0.36) ** 2), seed=1), T['pass1'] - 0.9, 0.11, -0.3, name='the dashboard rattles')
s.fx(whoosh('mid', 'in', bright=0.55), T['pass1'] - WHOOSH['mid'] * 0.8, 0.2, 0, name='air off its wings')
s.duck(T['pass1'] - 0.9, T['pass1'] + 1.3, -10, attack=0.5, release=0.6, why='the first pass')
s.fx(chirp(), T['touch'], 0.13, -0.15, wet=0.45, name='touchdown, far down the road')

# ── 3 · the stop, and the hazard relay: the click track from here to the end
s.fx(crunch(), T['stop'] - 0.5, 0.2, 0, at=T['stop'], name='tires settle on the snow')
R0 = T['stop'] + 0.3; t = R0
while t < END - 0.15:
    s.fx(relay(False), t, 0.075, -0.4, wet=0.08, name='hazard relay: tick')
    if t + B / 2 < END - 0.15: s.fx(relay(True), t + B / 2, 0.062, -0.4, wet=0.08, name='hazard relay: tock')
    t += B
VAMP_END = T['pass2'] - 1.5
for i in range(8):
    tb = R0 + i * BAR
    if tb + BAR > VAMP_END + 0.7: break
    ch = Cabin.CHORDS[i % 4]; vamp_bar(s, tb, ch, g=0.09 + 0.008 * min(i, 2))
    for j, m in enumerate(ch[1]): s.note(supersaw(m - 12, BAR, cut=900, a=0.3, r=0.4, seed=j), tb, 0.03, (-0.5, 0.0, 0.5)[j], 0.4, stem='pad', name='vamp pad')
s.fx(navchime('info'), T['chime2'] - navhit('info'), 0.24, 0.12, wet=0.2, at=T['chime2'], name='sat-nav: the exercise')

# ── 4 · also in the air: three flights, and the list filling in
s.fx(navchime('info'), T['s3'], 0.22, 0.12, wet=0.2, name='sat-nav: also in the air')
for i, (k, d, pan) in enumerate((('fl0', 3.6, -0.55), ('fl1', 4.2, 0.5), ('fl2', 4.8, 0.0))):
    s.fx(faraway(d, seed=i), T[k], 0.2, pan, wet=0.35, name=f'flight {i + 1}, high up')
for i, k in enumerate(('nl', 'fr', 'se')): s.fx(blip(i), T[k], 0.16, 0.18, name=f'the list: {k}')
s.fx(navchime('info'), T['chime4'], 0.2, 0.12, wet=0.2, name='sat-nav: not taking part')
s.fx(blip(0, down=True), T['fi'], 0.2, 0.18, name='the list: Finland, not taking part')

# ── 5 · the take-off: down the road at us, over the roof, and the road's snow against the glass
LEAD2 = 6.2; tt = seg(T['pass2'] - LEAD2, T['pass2'] - LEAD2 + 8.6)
s.fx(jet(8.6, LEAD2, v=72, h=17, away=False, burner=smooth((tt - T['roll2'] - 0.3) / 0.8), seed=2), T['pass2'] - LEAD2, 1.7, 0, wet=0.1, at=T['pass2'], name='the take-off: afterburners over the roof')
tt = seg(T['pass2'] - 1.2, T['pass2'] + 1.0)
s.fx(rattle(2.2, np.exp(-((tt - T['pass2']) / 0.45) ** 2), seed=2), T['pass2'] - 1.2, 0.15, -0.3, name='the dashboard rattles, harder')
s.fx(snowblast(1.9), T['pass2'] + 0.12, 0.6, 0, wet=0.15, name="the jet's wash throws snow at the glass")
s.duck(T['pass2'] - 1.6, T['pass2'] + 1.1, -14, attack=0.8, release=0.5, why='the take-off')

# ── 6 · recalculating; the chime resolves on "runway"; the station's sting
s.fx(navchime('recalc'), T['recalc'], 0.26, 0.12, wet=0.2, name='sat-nav: recalculating')
t = T['recalc'] + 0.5; k = 0
while t < T['runway'] - 0.45:
    s.fx(blip(k % 3), t, 0.05, 0.2, name='the sat-nav thinks'); t += 0.2; k += 1
s.fx(navchime('done'), T['runway'] - navhit('done'), 0.3, 0.1, wet=0.25, at=T['runway'], name='sat-nav: this road is a runway')
hold = END - T['runway'] - 0.15
for i, m in enumerate(Cabin.Cadd9[1]): s.note(supersaw(m, hold, cut=2600, a=0.05, r=0.5, seed=i), T['runway'], 0.045, -0.5 + i / 3, 0.4, stem='pad', name='the chord opens: C add9')
s.note(sub_bass(36, min(1.6, hold)), T['runway'], 0.17, 0, 0.08, stem='bass', name='C under it')
s.note(sparkle(86), T['runway'] + 0.03, 0.1, 0.2, 0.5, stem='bells', name='the bell over it')
for i, m in enumerate((72, 76, 79, 84)):
    if T['runway'] + 0.34 + i * B / 2 < END - 0.95: s.note(marimba(m, 0.3, 0.75), T['runway'] + 0.34 + i * B / 2, 0.16, (-0.3, -0.1, 0.1, 0.3)[i], 0.3, stem='marimba', name='the vamp answers once, in C')
sting(s, END - 0.6)

# ── every pop word: a glass blip and a marimba note from the chord under it (the allies' and the runway's are acted above)
seen = set()
for w in EV['words']:
    if not w['pop'] or w['caption'] in seen or w['caption'] in ('allies', 'runway'): continue
    seen.add(w['caption']); bar = int(max(0, w['t'] - R0) // BAR) % 4; ch = Cabin.CHORDS[bar] if w['t'] >= R0 else Cabin.Em
    s.fx(blip(2), w['t'], 0.13, 0.15, name=f'pop {w["w"]}: the blip')
    s.note(marimba(ch[1][2] + 12, 0.35, 0.8), w['t'] + 0.01, 0.2, 0.2, 0.3, stem='marimba', name=f'pop {w["w"]}: the note')
    if w['caption'] == 'giveway': s.note(sub_bass(28, 0.9), w['t'], 0.15, 0, 0.05, stem='bass', name='pop: the low E under "fighter jets"')

cues = [(k, T[k]) for k in EV['cueNames']]
s.render(OUT, ring_from=END - 0.45, tau=0.35, end=END, cues=cues, exempt={}, quiet=[], stems_dir=STEMS, report=REP)
