"""Sleep Tight (RFH, Helsinki 2 · ICEYE) — the cue sheet, v3 (9 Nov). Owner: "can we plan some slightly different sounds?
Now it's all the same sounds on all the videos". So this film no longer uses the house bed, motif, pop or accent: its
music and its pops come from the COLD WAR kit (pipeline/sound/coldwar.py), the first per-film kit (SOUND.md, "Sound per
film"). Only the station's sting at the end, and the sign-off after it, stay the house's.

  1 · the desk at night: wind on the window, the lamp's hum, a radio left on between stations; a drone in D minor, and
      the sequencer line starting dark and opening as the camera whips up to the sky
  2 · orbit: a BOOM on the cut into space, then the full ostinato (bass eighths, the sixteenth arpeggio) at 96 BPM;
      sonar pings on the strips' clock
  3 · the pull-back: a glass chip as each orbit plane lights; the counter's teleprinter strikes slow as it rolls to
      €10B and lock with a synth stab
  4 · the war room: the music strips to the bass in quarters and the drone; the grant drops; the satellite LANDS on
      "buys it" (wood, metal, a low body; the music ducks −10 dB)
  5 · the requirements slide in; the stamp SLAMS on "classified" (the music ducks −14 dB)
  6 · the turn: the music is OUT. The monitor's open channel and double beep, the radio faint under it, a music box
      playing the opening of Brahms's lullaby (1868, public domain); then the RFH sting
  every tag: typed in on a teleprinter as it appears; every caption pop: a hard teleprinter strike and a synth stab

    uv run --with numpy --with soundfile python clay/iceye/score.py <events.json> <out.wav> [<report.json> <stems>]
"""
import sys, json
from pathlib import Path
import numpy as np
sys.path[:0] = [str(Path(__file__).resolve().parents[2] / 'pipeline' / 'sound')]
from mix import Session
from stems import sting
from sfx import whoosh, swish, chip, foley, WHOOSH, _noise, _fade, _norm, _g
from rfsound import SR, tv, soft
from coldwar import ColdWar, chord_at, bass_bar, arp_bar, drone, stab, shortwave, teletype, key, ping, boom

EV = json.load(open(sys.argv[1])); OUT = sys.argv[2]
REP = sys.argv[3] if len(sys.argv) > 3 else None; STEMS = sys.argv[4] if len(sys.argv) > 4 else None
END = EV['end']; s = Session(END + 0.5, ColdWar)
S = [EV[f's{i}'] for i in range(1, 7)]
B = ColdWar.B; BAR = 4 * B; T0 = S[0] + 0.05      # the music's own clock starts with the film


def body(f0=70, drop=40, dur=0.5, decay=11):
    t = tv(dur); x = np.sin(2 * np.pi * (f0 + drop * np.exp(-t * 25)) * t) * np.exp(-t * decay)
    return _fade(_norm(x, 0.9), 0.001, 0.12)


def crack():
    d = 0.09; g = _g('crack'); t = tv(d)
    x = _noise(d, g, 1800, 9000) * np.exp(-t * 90) + np.sin(2 * np.pi * 1700 * t) * np.exp(-t * 160) * 0.5
    return _fade(_norm(x, 0.85), 0.0003, 0.02)


def clank(k=0):
    d = 0.35; t = tv(d); g = _g('clank', k)
    x = np.sin(2 * np.pi * 410 * t) * np.exp(-t * 18) + np.sin(2 * np.pi * 1290 * t) * np.exp(-t * 30) * 0.4 + _noise(d, g, 1500, 7000) * np.exp(-t * 90) * 0.4
    return _fade(_norm(x, 0.7), 0.0005, 0.05)


def beep(f=1900, d=0.085):
    t = tv(d); return _fade(_norm(np.sin(2 * np.pi * f * t) + 0.2 * np.sin(2 * np.pi * f * 2 * t), 0.6), 0.004, 0.02)


def mbox(f, d=1.3):
    t = tv(d); x = np.zeros(len(t))
    for m, a, dk in ((1, 1.0, 0.85), (2.0, 0.32, 0.35), (3.01, 0.16, 0.18), (4.17, 0.1, 0.1), (5.43, 0.05, 0.07)):
        x += np.sin(2 * np.pi * f * m * t) * np.exp(-t / dk) * a
    n = int(0.002 * SR); x[:n] += _noise(0.002, _g('tine', int(f))) * 0.3
    return _fade(_norm(x, 0.7), 0.0008, 0.12)


def wind(d):
    t = tv(d); g = _g('wind')
    x = soft(_noise(d, g), 150, 900, 2) * (0.55 + 0.45 * np.sin(2 * np.pi * 0.31 * t + 1.0) * np.sin(2 * np.pi * 0.13 * t))
    return _fade(_norm(x, 0.6), 0.4, 0.3)


def hum(d):
    t = tv(d); x = np.sin(2 * np.pi * 50 * t) + 0.5 * np.sin(2 * np.pi * 100 * t) + 0.15 * np.sin(2 * np.pi * 150 * t)
    return _fade(_norm(x, 0.5), 0.3, 0.1)


def hiss(d):
    t = tv(d); g = _g('hiss'); x = soft(_noise(d, g), 2500, 9000, 2) * 0.5
    n = int(0.004 * SR); x[:n] += np.sin(2 * np.pi * 2400 * t[:n]) * 2.0
    return _fade(_norm(x, 0.5), 0.001, 0.3)


# ── the music (the cold-war kit), bar by bar on its own clock: what plays follows the beat it falls in
bars = int(np.ceil((S[5] - T0) / BAR))
for i in range(bars):
    tb = T0 + i * BAR; ch = chord_at(tb, T0)
    if tb >= S[5] - 0.05: break
    if tb < S[1]:                                    # 1 · the desk: the line starts dark and opens toward the whip
        arp_bar(s, tb, ch, b=0.15 + 0.5 * i, g=0.07 + 0.03 * i)
    elif tb < S[3]:                                  # 2–3 · orbit: the full ostinato
        arp_bar(s, tb, ch, b=0.85, g=0.12); bass_bar(s, tb, ch, g=0.32)
    else:                                            # 4–5 · the war room: bass in quarters and the drone only
        bass_bar(s, tb, ch, g=0.3, eighths=False)
s.note(drone(38, S[5] - T0 + 0.6), T0, 0.16, 0, 0.3, stem='drone', name='the drone, D')
for cp in EV['captions']:
    last = max(w['t'] for w in EV['words'] if w['caption'] == cp['id'])
    s.duck(cp['t0'], last + 0.4, -3.0, why=f'caption {cp["id"]} reveal')
s.duck(S[5] - 0.25, END + 0.5, -40, attack=0.2, release=0.1, why='the turn: the music is out')

# ── 1 · the desk at night: wind, the lamp, a radio between stations; the whip up and the flash into orbit
s.fx(wind(S[1] + 0.2), 0.0, 0.08, -0.3, name='wind against the window')
s.fx(hum(S[1]), 0.0, 0.03, 0.3, name='the lamp hums')
s.fx(shortwave(S[1] + 0.3, 'desk'), 0.0, 0.07, 0.4, name='a radio left on between stations')
s.fx(swish(), EV['rise'], 0.22, 0.2, name='the whip starts')
s.fx(whoosh('mid', 'in', bright=0.8), EV['rise'] - 0.05, 0.3, 0, at=S[1], name='the camera whips up to the sky')
s.fx(boom(), S[1], 0.55, 0, wet=0.3, name='into orbit: the boom')
s.fx(whoosh('long', 'out', bright=1.0), S[1], 0.2, 0, wet=0.25, at=S[1] + 0.05, name='through the cloud')

# ── 2–3 · orbit: the sonar on the strips' clock
pings = sorted((v, k) for k, v in EV.items() if k.startswith('ping'))
for i, (t, k) in enumerate(pings): s.fx(ping(i), t, 0.14 if i < 4 else 0.09, -0.35 if i % 2 == 0 else 0.35, wet=0.35, name=f'sonar {k}')
for i, t in enumerate(S[2:5]): s.fx(whoosh('short', 'in', bright=0.5), t - WHOOSH['short'] * 0.8, 0.14, 0, at=t, name=f'cut {i + 3}')

# ── 3 · the constellation lights plane by plane; the counter's strikes slow and lock on the stab
d3 = S[3] - S[2]
for p in range(9): s.fx(chip(True), S[2] + p / 9 * d3 * 0.75, 0.06, -0.6 + 1.2 * p / 8, wet=0.3, name=f'orbit plane {p + 1} lights')
n = 16
for i in range(1, n):
    x = 1 - (1 - i / n) ** (1 / 3); t = EV['count0'] + x * (EV['worth'] - EV['count0'])
    s.fx(key(i), t, 0.12, 0.1, name=f'counter {i}')
ch = chord_at(EV['worth'], T0)
s.fx(stab([ch[1][0], ch[1][1], ch[1][2], ch[1][0] + 12]), EV['worth'] + 0.01, 0.4, 0, wet=0.3, name='the counter locks: a stab')

# ── 4 · the war room: the grant drops; the satellite LANDS on "buys it"
s.fx(swish(), EV['grant'] - 0.3, 0.14, -0.3, name='the envelope falls')
s.fx(foley('paper', 'drop', 0.95), EV['grant'], 0.45, -0.3, name='the grant lands on the glass'); s.fx(body(120, 40, 0.2, 30), EV['grant'] + 0.003, 0.18, -0.3, name='its weight')
s.fx(whoosh('mid', 'in', bright=0.5), EV['buys'] - WHOOSH['mid'] * 0.8, 0.26, 0.05, at=EV['buys'], name='the satellite falls')
s.fx(foley('wood', 'tap', 1.0), EV['buys'], 0.6, 0.05, wet=0.12, name='the satellite LANDS'); s.fx(clank(), EV['buys'] + 0.004, 0.42, 0.05, name='its stand on the glass')
s.fx(body(66, 42, 0.6, 9), EV['buys'] + 0.003, 0.7, 0, name='its weight')
for i, dt in enumerate((0.22, 0.42)): s.fx(clank(i + 1), EV['buys'] + dt, 0.12 - i * 0.05, 0.05, name=f'bounce {i + 1}')
s.duck(EV['buys'] - 0.02, EV['buys'] + 0.4, -10, attack=0.02, release=0.4, why='the landing')

# ── 5 · the requirements slide in; the stamp SLAMS on "classified"
s.fx(foley('paper', 'slide', 0.8), EV['sheet'], 0.32, 0.4, name='the requirements slide in')
s.fx(whoosh('short', 'in', bright=0.9), EV['stamp'] - WHOOSH['short'] * 0.8, 0.22, 0.1, at=EV['stamp'], name='the stamp comes down')
s.fx(foley('wood', 'tap', 1.0), EV['stamp'], 0.75, 0.1, wet=0.14, name='the stamp SLAMS'); s.fx(crack(), EV['stamp'] + 0.002, 0.5, 0.1, name='its snap')
s.fx(body(58, 45, 0.7, 8), EV['stamp'] + 0.003, 0.8, 0.0, name='its weight')
s.duck(EV['stamp'] - 0.02, EV['stamp'] + 0.45, -14, attack=0.015, release=0.45, why='the slam')
s.fx(foley('card', 'slide', 0.5), EV['stamp'] + 0.3, 0.14, 0.15, name='the stamp lifts')

# ── 6 · the turn: the music is out; the monitor's channel, its beep; the radio faint; the music box; the sting
s.fx(hiss(END - S[5] + 0.3), S[5], 0.05, 0.1, name='the monitor: an open channel, a click')
s.fx(shortwave(END - S[5] + 0.3, 'night'), S[5], 0.035, -0.5, name='the radio, faint, between stations')
for i, dt in enumerate((0.0, 0.16)): s.fx(beep(1900 if i == 0 else 2250), EV['beep'] + dt, 0.2, 0.15, name=f'monitor beep {i + 1}')
E5, G5, C6 = 659.26, 783.99, 1046.5
t = EV['beep'] + 0.55
for f, dur in ((E5, 0.22), (E5, 0.22), (G5, 0.6), (E5, 0.22), (E5, 0.22), (G5, 0.6), (E5, 0.22), (G5, 0.22), (C6, 0.5)):
    if t > END - 0.55: break
    s.fx(mbox(f), t, 0.22, -0.1, wet=0.3, name=f'music box {f:.0f} Hz'); t += dur

# ── every tag is typed in; every caption pop is a strike and a stab (the impacts ARE their pops; the turn stays quiet)
for k, v in EV.items():
    if k.startswith('on_'): s.fx(teletype(7, seed=sum(map(ord, k)) % 97), v, 0.09, 0.25, name=f'{k[3:]} typed in')
ACTED = {'buys', 'classified', 'sleep'}
for w in EV['words']:
    if not w['pop'] or w['caption'] in ACTED: continue
    ch = chord_at(w['t'], T0)
    s.fx(key(7), w['t'] + 0.02, 0.32, 0.15, name=f'pop {w["w"]}: the strike')
    s.fx(stab([ch[1][0] + 12, ch[1][2] + 12]), w['t'] + 0.03, 0.2, -0.1, wet=0.25, name=f'pop {w["w"]}: the stab')
sting(s, END - 0.6)

cues = [(k, EV[k]) for k in ('s1', 's2', 's3', 's4', 's5', 's6', 'rise', 'worth', 'grant', 'buys', 'sheet', 'stamp', 'beep', 'sleep')]
s.render(OUT, ring_from=END - 0.45, tau=0.35, end=END, cues=cues, exempt={}, quiet=[], stems_dir=STEMS, report=REP)
