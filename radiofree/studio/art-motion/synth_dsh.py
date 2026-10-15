#!/usr/bin/env python3
"""Score for "Somebody Does the Dishes" (Toko, clay, 24.4 s) — its own music (SOUND.md).

    uv run --with numpy --with soundfile python 音频/synth_dsh.py

Two worlds. The kitchen is a smooth lounge-bossa "smart home" jingle in G: nylon guitar comping
the batida, a plucked upright (Toko's), a rim clave, a shaker, and a vibraphone for the jingle —
its quarter note is 0.7 s, the robot's teleoperated jerk, so the robot moves on the jingle's beat
(and whines a little each time). The cubicle is not music at all: a fluorescent tube's 120 Hz buzz,
the HVAC, a yawn, a stapler. Toko sips and the band goes drowsy; the clock leaps five minutes; his
snort snaps the band awake. On the pull-back the bossa closes off as if through the wall and the
office hum takes over; the split shot plays BOTH — the kitchen on the left, the cubicle on the
right — while robot and man wobble on one leg together; the jingle comes back quieter for Toko's
wave, and when the man waves back, a little two-note wave on the vibes. The last shot runs three
seconds longer (owner, 2026-10-15): the hum carries on, his hand comes down and lands back on his
controller with a click (22.5), one soft vibraphone chord rings out under the push-in, and everything
fades with the picture over the last 0.35 s. Every effect is at its second in clay-dishes/EVENTS.md
(hard cuts, no grid) or clay-dishes/film.js.
"""
import sys
from pathlib import Path
for _d in (Path(__file__).resolve().parent, Path(__file__).resolve().parents[1]): sys.path.insert(0, str(_d / 'lib'))
from rfseries import *

DUR = 586 / 24                                                          # 24.42 s (was 514 frames, 21.42 s)


class Lounge(Score):
    BPM = 60 / 0.7                                                      # 85.7: the robot's jerk is the beat
    VERB = dict(t60=0.8, lo=180, hi=6500, pre=0.01, g=0.28, seed=91)   # a tiled kitchen, polished
    GLUE = dict(thresh=-18.0, ratio=1.8)
    EQ = dict(fc=5000.0, db=-0.5, hp=35.0)


s = Lounge(dur=DUR + 0.5); Q = 0.7; SX = Q / 4                          # quarter, sixteenth
CH = {'Gmaj7': (43, (59, 62, 66, 69)), 'Am7': (45, (60, 64, 67, 71)), 'D7': (38, (60, 62, 66, 69)),
      'Em7': (40, (59, 62, 67, 71)), 'A7': (45, (61, 64, 67, 71))}
PROG = ['Gmaj7', 'Am7', 'D7', 'Gmaj7', 'Em7', 'A7', 'Am7', 'D7']
CLAVE = (0, 3, 6, 10, 13)                                               # bossa clave, over two bars of 2/4


def bossa(t0, t1, pan=0.0, g=1.0, perc=True, bar0=0, start=None, drowsy=None):
    """the band from t0 to t1 (bars of two quarters = 1.4 s): bass on one and the and-of-two, the guitar's
    batida, a rim clave, a shaker in sixteenths. Nothing sounds before `start` (so the grid can begin
    before a cut); inside `drowsy` (a, b) it plays at half level with no percussion"""
    start = t0 if start is None else start; nb = int(np.ceil((t1 - t0) / (2 * Q)))
    def lv(t): return 0.5 if drowsy and drowsy[0] <= t < drowsy[1] else 1.0
    for i in range(nb):
        tb = t0 + i * 2 * Q; root, ch = CH[PROG[(bar0 + i) % len(PROG)]]
        for p, n in ((0, root), (6, root + 7)):
            t = tb + p * SX
            if start <= t < t1: s.note(upright(n, 0.5, 0.7), t, 0.5 * g * lv(t), pan - 0.1, 0.15)
        for p in ((0, 3, 6) if i % 2 == 0 else (2, 5)):
            t = tb + p * SX
            if start <= t < t1:
                for j, n in enumerate(ch): s.note(nylon(n, 0.3, 0.55), t + 0.012 * j, 0.22 * g * lv(t), pan + 0.15, 0.3)
        if perc:
            for p in range(8):
                t = tb + p * SX
                if start <= t < t1 and lv(t) == 1.0:
                    s.note(shaker(0.7 if p % 2 else 0.4), t, 0.35 * g, pan + 0.4, 0.15)
                    if (p + 8 * (i % 2)) in CLAVE: s.note(rim(0.45), t, 0.32 * g, pan - 0.3, 0.25)


def jingle(t0, g=1.0, pan=0.0):
    """the smart home's jingle on the vibes: D, B, G — F-sharp, held"""
    for b, n, L in ((0, 74, 0.5), (0.5, 71, 0.5), (1.0, 79, 0.5), (1.5, 78, 1.5)):
        s.note(vibes(n, L * Q + 0.6, 0.75), t0 + b * Q, 0.5 * g, pan + 0.2, 0.4)


def whirr(t, g=0.5, pan=0.0): s.fx(servo(0.25), t, g, pan, 0.1)       # the robot's joints, faintly
def china(): t = tv(0.4); return over(sum(np.sin(2 * np.pi * f * t) * np.exp(-t * dk) for f, dk in ((2700, 14), (4400, 22), (6300, 30))) * 0.07, noise(0.01, 2000, 8000) * np.exp(-tv(0.01) * 500) * 0.2)


# ── the rooms ───────────────────────────────────────────────────────────────────────────────
s.sfx.bed(room(DUR, 0.6), 600)                                                                  # the kitchen, fridge-quiet
CUB = [(9.9, 12.8), (12.8, 16.4), (16.4, 17.9), (19.6, DUR)]
hum = office_hum(DUR + 0.5)
for a, b in CUB:
    pan = 0.7 if a == 12.8 else 0.0; x = hum[int(a * SR):int(b * SR)].copy(); f = int(0.04 * SR)
    x[:f] *= np.linspace(0, 1, f) if a != 9.9 else 1; x[-f:] *= np.linspace(1, 0, f)
    if a == 9.9: x *= np.minimum(1, np.arange(len(x)) / (0.5 * SR))
    s.fx(x, a, 1.4, pan, 0.0)

# ── 1 · the kitchen: the jingle, then the bossa; the robot carries one plate a centimetre per beat
jingle(0.0); bossa(0.0, 4.40, g=0.9)
for t in np.arange(0.0, 4.25, Q): whirr(t, 0.45, 0.3)

# ── 2 · Toko and his tea: the band goes drowsy as he nods off; the clock leaps five minutes; his snort
# snaps it awake; the robot still holding the same plate
bossa(4.20, 8.40, g=0.88, bar0=3, start=4.40, drowsy=(5.95, 7.12))                                # on the robot's grid (6 x 0.7)
s.fx(china() * 0.6, 4.55, 0.8, -0.3); s.fx(slurp(0.4), 5.05, 1.0, -0.3); s.fx(china(), 5.85, 0.9, -0.3)
s.fx(snore(0.75, 1.5, 7) * 1.5, 6.40, 0.8, -0.3)
for t in np.linspace(6.35, 7.05, 8): s.fx(clock_tick(t > 6.7), t, 0.7, 0.1)
s.fx(over(noise(0.12, 150, 1800) * np.exp(-tv(0.12) * 20) * 0.4, knock(0.2, 300)), 7.12, 0.9, -0.3)   # the snort
s.note(over(vibes(79, 0.5, 0.9, False), vibes(83, 0.5, 0.8, False)), 7.12, 0.3, 0.2, 0.3)            # awake!
for t in (4.90, 5.60, 6.30, 7.00, 7.70): whirr(t, 0.5, 0.4)

# ── 3 · the pull-back: the robot close, then the wall's cut end wipes past and the bossa closes off as if
# through the wall; the office hum; the man mimes the same jerks; a long yawn
bossa(8.40, 10.0, g=0.9, bar0=6)
for t in (8.40, 9.10, 9.80): whirr(t, 0.5, 0.2)
s.music_span(9.40, 10.6, lambda x: sweep(x, 9000, 250, curve=np.minimum(1, np.arange(len(x)) / (0.5 * SR))) * np.maximum(0, 1 - np.arange(len(x)) / (0.6 * SR)))
s.fx(sweep(noise(1.0, 150), 400, 3000) * np.sin(np.pi * tv(1.0) / 1.0) * 0.25, 9.40, 0.9, -0.2)
for t in (10.50, 11.20, 11.90, 12.60): s.fx(over(click() * 0.3, noise(0.06, 800, 3000) * np.exp(-tv(0.06) * 60) * 0.08), t, 0.7, 0.2)
s.fx(yawn(1.4, 150), 11.25, 0.8, 0.1, 0.15)

# ── 4 · the split: BOTH — the bossa on the left, the cubicle on the right; the rack rolls home, the door
# CLUNKS; robot and man wobble on one leg together (a wobble on the vibes), and stomp
bossa(12.80, 16.40, pan=-0.6, g=0.75, bar0=0)
s.fx(rack_rattle(0.28), 13.60, 0.9, -0.6); s.fx(over(thump() * 0.7, knock(0.6, 400)), 14.18, 1.0, -0.6, 0.15); s.fx(knock(0.25, 500), 14.30, 0.6, -0.6)
for k, t in enumerate((14.12, 14.47, 14.81, 15.16)):
    a = 1 - 0.2 * k; whirr(t - 0.1, 0.4 * a, -0.6); s.fx(creak(0.25) * 0.3 * a, t - 0.1, 0.6, 0.6)
    s.note(vibes(71 if k % 2 == 0 else 72, 0.35, 0.6 * a, False), t, 0.3, 0.0, 0.3)
def stomp(): return over(thump() * 0.5, knock(0.7, 220), noise(0.06, 250, 2500) * np.exp(-tv(0.06) * 60) * 0.35)   # heel on the floor
s.fx(stomp(), 15.40, 1.0, -0.6); s.fx(stomp(), 15.40, 0.9, 0.6)

# ── 5 · the cubicle: a big stretching yawn, a stapler; the kitchen: the jingle back, quieter, for Toko's
# wave; the robot's eye lights (someone is looking), its head tilts, its hand comes up; the cubicle: he
# waves back — a little two-note wave on the vibes
s.fx(yawn(0.85, 165, 4), 16.58, 1.0, 0.0, 0.15); s.fx(stapler() * 0.45, 17.62, 0.8, 0.3, 0.1)
bossa(17.90, 19.60, g=0.55, bar0=0); jingle(17.90, 0.55)
s.fx(toy_blip(2400), 18.20, 0.5, 0.2, 0.1); whirr(18.50, 0.5, 0.2); s.fx(servo(0.45), 19.15, 0.4, 0.2)
s.music_span(19.60, DUR + 0.5, lambda x: x * np.maximum(0, 1 - np.arange(len(x)) / (0.012 * SR)))   # hard cut back to the cubicle
for t, n in ((19.78, 79), (20.06, 83)): s.note(vibes(n, 0.9, 0.6, False), t, 0.32, 0.1, 0.3)       # hi!

# ── 5c, longer: he waves on to 21.9, lowers his hand by 22.5 and is back on his controller (a click);
# Toko waves on in the monitor; one soft chord on the vibes under the push-in, out with the picture's fade
s.fx(over(click() * 0.35, knock(0.3, 2600) * 0.5, pad(knock(0.15, 1900) * 0.4, 0.045)), 22.50, 0.6, 0.15, 0.1)
for j, n in enumerate((62, 66, 71, 74)): s.note(vibes(n, 1.6, 0.4), 23.0 + 0.06 * j, 0.14, -0.1 + 0.1 * j, 0.4)

s.render(str(Path(__file__).with_name('配乐_dsh_m14.wav')), DUR - 0.35, tau=0.18, end=DUR)        # out with the picture
