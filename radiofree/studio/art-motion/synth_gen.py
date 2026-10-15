#!/usr/bin/env python3
"""Score for "Genius" (Toko, clay, 21.2 s) — its own music (SOUND.md).

    uv run --with numpy --with soundfile python 音频/synth_gen.py

A cheesy game show and a sitcom groove in C at 109 BPM — the beat is 0.55 s because the sad
trombone's wahs are 0.55 s apart in the picture. Slap bass, a combo organ on the off-beats, a
kit with claps, and game-show brass; the room is Toko's (flies circling the poo, birds through the
window, the old dog snoring under the table, a kalimba for the dog's ear). The groove stops for
the TA-DA and holds it while the hand is open; a drum roll under the typing dots; the BURST is a
fanfare and a confetti cannon, a trophy boinging on its spring; the smash stops the band, a WIN
sting, and then nothing but the coin spinning down on its edge to its clack. When the update is
rolled back the burst itself is REWOUND — the same fanfare and confetti, reversed, spooling faster
and faster into the phone, ending on a blip — while the old dog sniffs three times; and as it
walks out, a muted trombone: wah, wah, wah, waaah. Kalimba sighs as Toko sags. Every effect is at
its second in clay-genius/EVENTS.md (hard cuts, no grid).
"""
import sys
from pathlib import Path
for _d in (Path(__file__).resolve().parent, Path(__file__).resolve().parents[1]): sys.path.insert(0, str(_d / 'lib'))
from rfseries import *

DUR = 509 / 24                                                         # 21.21 s


class Show(Score):
    BPM = 60 / 0.55                                                    # 109.1: the trombone's wahs are a beat apart
    VERB = dict(t60=0.9, lo=180, hi=7000, pre=0.012, g=0.26, seed=81)  # a bright kitchen
    GLUE = dict(thresh=-16.0, ratio=2.2)
    EQ = dict(fc=3500.0, db=1.5, hp=35.0)


s = Show(dur=DUR + 0.5); B = s.B
CUTS = [0.0, 4.40, 9.20, 12.80, 16.40]
def g_(k): return k * B                                                 # the groove's grid, from 0 (the BURST, 4.95, is beat 9)


# ── the band ────────────────────────────────────────────────────────────────────────────────
RIFF = [(0, 0, True), (0.75, 0, False), (1.5, 7, True), (2, 10, False), (2.5, 12, True), (3.5, 7, False)]   # C7, thumbed
def groove(b0, b1, root=36, level=2, g=1.0):
    """the sitcom groove from beat b0 to b1: slap riff, kick on 1 and the and-of-2, claps on 2 and 4,
    hats in eighths; level 2 adds organ stabs on the off-beats"""
    for bar in range(int(b0 // 4), int(np.ceil(b1 / 4))):
        r = root + (5 if bar % 2 else 0)
        for o, iv, sl in RIFF:
            b = bar * 4 + o
            if b0 <= b < b1: s.note(slap_bass(r + iv, 0.24, sl), g_(b), 0.5 * g, 0, 0.05)
        for o in np.arange(0, 4, 0.5):
            b = bar * 4 + o
            if not (b0 <= b < b1): continue
            s.note(hat(vel=0.7 if o % 1 else 0.45), g_(b), 0.45 * g, 0.3, 0.05)
            if o in (0, 2.5): s.note(kick_tight(0.8), g_(b), 0.5 * g, 0, 0)
            if o in (1, 3): s.note(clap(0.8), g_(b), 0.4 * g, 0, 0.3)
            if level >= 2 and o in (1.5, 3.5):
                for j, n in enumerate((r + 24, r + 28, r + 31, r + 34)): s.note(hammond(n, 0.18), g_(b), 0.3 * g, -0.3 + 0.2 * j, 0.25)


def brass(t, notes, d, g=0.4, dyn=0.85):
    for j, n in enumerate(notes):
        v = trumpet(n, d, dyn) if n >= 60 else trombone(n, d, dyn, a=0.01, r=0.12)
        s.note(v, t, g, -0.3 + 0.6 * j / max(1, len(notes) - 1), 0.35)


def burst_cue(add, t0):
    """the BURST: confetti cannon, game-show fanfare, cymbal, a glockenspiel run for the gold flash"""
    add(confetti_cannon(), t0, 0.9, 0.0)
    for j, n in enumerate((48, 55, 64, 67, 72)):
        add(trumpet(n, 0.22, 0.9) if n >= 60 else trombone(n, 0.22, 0.9, a=0.008, r=0.12), t0, 0.38, -0.3 + 0.15 * j)
    add(crash(2.2, 0.9), t0, 0.45, 0.3); add(kick_tight(), t0, 0.7, 0.0); add(timpani(36, 1.6, 0.9), t0, 0.5, -0.2)
    for i, n in enumerate((84, 88, 91, 96, 100)): add(glock(n, 0.9, 0.8), t0 + 0.03 + i * 0.05, 0.25, 0.3)
    for i, (dt, n) in enumerate(((0.275, 67), (0.4125, 69), (0.55, 71))):          # da-da-da …
        add(trumpet(n, 0.11, 0.85), t0 + dt, 0.42, 0.1); add(trumpet(n - 5, 0.11, 0.7), t0 + dt, 0.3, -0.1)
    for j, n in enumerate((60, 64, 67, 72, 76)):                                   # … DAAA
        add(trumpet(n, 0.9, 0.9) if n >= 60 else trombone(n, 0.9, 0.9), t0 + 0.825, 0.36, -0.3 + 0.15 * j)
    add(trombone(48, 0.9, 0.85, a=0.01), t0 + 0.825, 0.4, -0.2); add(crash(1.6, 0.6), t0 + 0.825, 0.3, -0.3)


# ── the room: flies circling the poo (every shot), birds through the window (not shot 2), the dog
# snoring under the table (shots 1–3) ───────────────────────────────────────────────────────
n = int(DUR * SR); tt = tv(DUR)
s.fx(fly_buzz(DUR, 205, 1), 0, 1.0, -0.35); s.fx(fly_buzz(DUR, 236, 2), 0, 1.0, 0.35)
s.fx(birds(DUR, 1.3, 3)[:n] * np.interp(tt, [0, 4.39, 4.40, 9.19, 9.20, DUR], [1, 1, 0, 0, 1, 1]), 0, 1.0, 0.5)
s.fx(snore(12.8, 2.4, 4), 0, 1.0, -0.2)

# ── 1 · the kitchen: the groove; he raises the stick, a proud bounce, a slide whistle as it twirls up
# to the TA-DA — the band stops and holds it while the hand is open; the dog's ear; a roll into shot 2
groove(0, 3.9)
s.fx(sweep(noise(0.75, 200), 600, 4000) * np.sin(np.pi * tv(0.75) / 0.75) * 0.2, 0.25, 0.9, 0.2)
s.fx(boing(520, 0.35) * 0.6, 1.25, 0.6, 0.2)
s.note(glide(700, 1600, 0.8) * 0.6, 1.30, 0.3, 0.2, 0.3)
T_TADA = 2.15
s.music_span(T_TADA, T_TADA + 1.7, lambda x: x * np.maximum(0, 1 - np.arange(len(x)) / (0.01 * SR)))   # the groove stops for it
brass(T_TADA, (48, 55, 64, 67, 72), 1.45, 0.4); s.note(crash(2.0, 0.8), T_TADA, 0.4, 0.3, 0.3); s.note(kick_tight(), T_TADA, 0.6, 0, 0)
s.note(kalimba(84, 0.5), 2.60, 0.25, -0.3, 0.3)                                                  # the ear twitches

# ── 2 · the phone: typing dots over a drum roll; the BURST; the trophy on its spring; the bubble; the
# confetti pattering down; the groove again, with the organ
for t in (4.47, 4.64, 4.81): s.fx(toy_blip(1600 + (t - 4.47) * 1500), t, 0.5, 0.2)
s.note(snare_roll(0.53, 0.15, 0.9, seed=9), 4.40, 0.5, 0.15, 0.2)
T_BURST = 4.95
burst_cue(lambda x, t, g, p: s.note(x, t, g, p, 0.3), T_BURST)
s.fx(boing(560, 2.0), 5.00, 0.8, 0.25, 0.2); s.fx(over(tag_pop(1000), knock(0.3, 1400)), 5.30, 0.7, 0.3)
g2 = np.random.default_rng(12)
for t in np.sort(g2.uniform(5.70, 6.88, 40)): s.fx(noise(0.012, 2500, 8000) * np.exp(-tv(0.012) * 300) * 0.05, t, 1.0, g2.uniform(-0.7, 0.7))
groove(12, 16.73, level=2)

# ── 3 · the smash: a roll for the wind-up; SMASH, the band stops; coins rain; a WIN sting as his arms
# go up; then only the coin spinning down on its edge, faster and faster, to its clack
s.note(snare_roll(0.48, 0.1, 0.8, seed=10), 9.20, 0.45, 0.15, 0.2)
T_SMASH = 9.72
s.fx(shatter(), T_SMASH, 1.0, 0.0, 0.2); s.note(kick_tight(), T_SMASH, 0.6, 0, 0); s.note(crash(1.4, 0.7), T_SMASH, 0.3, 0.3, 0.3)
for j, n in enumerate((48, 55, 64)): s.note(trombone(n, 0.15, 0.9, a=0.005, r=0.1), T_SMASH, 0.3, -0.3 + 0.3 * j, 0.3)
g3 = np.random.default_rng(13)
for t in np.sort(g3.uniform(9.85, 10.80, 22) ** 1.0): s.fx(coin_clink(g3.uniform(2400, 3600), g3.uniform(0.4, 0.9)), t, 0.8, g3.uniform(-0.6, 0.6))
s.fx(euler_disk(12.22 - 10.32), 10.32, 1.0, 0.15)
s.fx(over(coin_clink(3200, 1.0), knock(0.5, 900)), 12.22, 0.9, 0.15)                            # clack
s.note(kalimba(84, 0.4), 10.60, 0.2, -0.3, 0.3)
brass(10.62, (60, 64, 67), 0.12, 0.35); brass(10.62 + 0.165, (65, 69, 72), 0.5, 0.38)           # WIN!

# ── 4 · the old dog gets up and pads over; Toko offers the stick; the update is ROLLED BACK — the burst
# rewound into the phone, ending on a blip — while the dog sniffs three times and is not impressed
s.fx(creak(0.5) * 0.6, 13.25, 0.6, -0.2); s.fx(snore(0.9, 3.0, 9) * 0.7, 13.30, 0.6, -0.2)
groove(24, 26.45, root=36, level=1, g=0.6)                                                       # a sly vamp as it approaches
for t in (13.75, 13.90, 14.06, 14.21, 14.37, 14.52, 14.68): s.fx(paw(0.8), t, 1.0, -0.2)
tmp = Mix(2.5); burst_cue(lambda x, t, g, p: tmp.add(x, t, g, p), 0.0)
T_RB0, T_RB1 = 14.55, 15.95
s.fx(tape_rewind((tmp.L + tmp.R)[:int(2.2 * SR)] * 0.5, T_RB1 - T_RB0, 1.0, 2.15), T_RB0, 1.0, 0.1, 0.2)   # 2.2 s of burst in 1.4 s
s.fx(toy_blip(2400), T_RB1, 0.6, 0.1)
for t in (14.98, 15.13, 15.28): s.fx(sniff(), t, 0.8, -0.1)

# ── 5 · the dog walks out: shuffling round, claws on the tiles, and the muted trombone — wah, wah, wah,
# waaah — until its tail is gone; kalimba sighs as Toko's shoulders sag
for t in np.arange(16.45, 17.20, 0.15): s.fx(paw(0.5), t, 0.7, -0.1)
for t in np.arange(17.20, 19.95, 0.105): s.fx(paw(0.35), t, 0.6, -0.1 + 0.3 * (t - 17.2) / 2.75)
def wah(m, d, last=False):
    x = trombone(m, d, 0.75, a=0.03, r=0.15); k = np.arange(len(x)) / len(x)
    if last: x = wow(x, 0.012, 5.5, 0.0, 9.0)
    curve = np.sin(np.pi * k) ** 0.6 if not last else 0.25 + 0.5 * (0.5 + 0.5 * np.sin(2 * np.pi * 2.2 * k * d - 1.5)) * (1 - k)
    return sweep(x, 350, 3200, curve=curve) * 1.3
for t, m_, d in ((17.20, 58, 0.42), (17.75, 57, 0.42), (18.30, 56, 0.42)): s.note(wah(m_, d), t, 0.6, 0.0, 0.25)
s.note(wah(55, 19.95 - 18.85, True), 18.85, 0.65, 0.0, 0.25)
s.note(kalimba(76, 0.6), 20.25, 0.3, -0.2, 0.35); s.note(kalimba(72, 0.6), 20.62, 0.28, -0.2, 0.35)

s.render(str(Path(__file__).with_name('配乐_gen_m14.wav')), 20.9, tau=0.5, end=DUR)
