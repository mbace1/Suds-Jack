#!/usr/bin/env python3
"""Score for "On Hold" (Doodle #2, 37.5 s), series 2 — the DOODLE palette (SOUND.md).

    uv run --with numpy --with soundfile python 音频/synth_doh_s2.py

The film's title is the joke, so the score is corporate hold music with a launch video's
gloss: an FM e-piano arpeggio in D major that just keeps going, a clap groove that arrives with
the money, and a jingle in the 3/4 break bar before every cut that sours as the record does —
bright, bright, flat after the support is snipped, brightest under the €13 bn cheque, flat
again over the felled forest; then the floodlights go off, the groove TAPE-STOPS, the hold
loop comes back worn, and on the last hit the padlock and the hold's old motif (D–A–F) on the
e-piano, sagging. 140 BPM (fifteen beats a shot). Every effect is at its second in
synth_doh.py (written here as the same expressions in PB, the picture's 112 BPM beat).
"""
import sys
from pathlib import Path
for _d in (Path(__file__).resolve().parent, Path(__file__).resolve().parents[1]): sys.path.insert(0, str(_d / 'lib'))
from rfseries import *

s = Doodle(); B = s.B
BR, SO = Doodle.BRIGHT, Doodle.SOUR
def chain(d=0.4): t = tv(d); return noise(d, 2500, 9000) * np.exp(-(t % 0.12) * 60) * 0.35 * np.sin(np.pi * t / d)
def rip(): t = tv(0.16); return noise(0.16, 1200, 7000) * np.exp(-t * 18) * (1 + 0.6 * np.sin(2 * np.pi * 70 * t)) * 0.5
def snip(): return over(click() * 1.2, tone(3400, 0.02, (1,), 0.001, 0.08, decay=40) * 0.3)

# the site's wind, outdoors only (the gate: shots 1, 5, 6), and the meter's mains hum
w = np.interp(tv(END), [0, CUT[1] - 0.3, CUT[1] + 0.3, CUT[4] - 0.3, CUT[4] + 0.3, END], [1, 1, 0.3, 0.3, 1, 1])
s.sfx.bed(noise(END, 120, 1600) * 0.022 * (1 + 0.5 * np.sin(2 * np.pi * 0.13 * tv(END))) * w)
s.fx(hum(50, SHOT_S + 0.5), CUT[1], 0.35)

# ── shot 1 · the gate. The logo plays before the first caption (a launch arpeggio over a D add9
# bloom); the sign drops on its chains; the padlock snaps shut and the music is put ON HOLD
for i, n in enumerate([74, 78, 81, 86]):
    s.note(pluck(n, 0.12), i * B / 4, 0.3, -0.3 + 0.2 * i, 0.35); s.note(marimba(n + 12, 0.1, 0.8), i * B / 4, 0.16, 0.3, 0.3)
s.ep_chord(0.0, (50, 62, 66, 69, 76), 1.45, 0.7, 0.2); s.note(sparkle(86), 0.33, 0.25, 0.3, 0.5)
for i, n in enumerate((62, 66, 69)): s.note(supersaw(n, 1.25, a=0.35, r=0.12, cut=2400, seed=i), 0.0, 0.10, -0.3 + 0.3 * i, 0.4)
s.fx(chain(0.45), 0.1, 0.8); s.fx(thump(), PB * 1, 0.7); s.fx(card(), PB * 1, 0.6)
s.fx(click(), PB * 3, 1.0); s.fx(stamp() * 0.6, PB * 3, 0.7); s.note(bonk(69), PB * 3 + 0.03, 0.28, 0.2, 0.4)   # the padlock: denied
s.arp(0, 4, 12, BR); s.groove(0, 4, 12, 0, BR)                                   # please hold: the loop, no drums
s.groove(0, 12, 15, 1, BR); s.hook(0, 'bright')

# ── shot 2 · the meter: the wheels tick over (a digit at a time, as an app animates it), the disc
# whirs up, ×45 lands as a launch hit; the clap groove arrives with the tax
s.note(kick_tight(), CUT[1], 0.6, 0, 0); s.fx(card(), CUT[1], 0.45)
s.groove(1, 0, 6, 1, BR); s.arp(1, 0, 6, BR, 0.13, 'marimba', 0.5)
for i in range(3):
    t0 = CUT[1] + PB * (1 + i * 0.5)
    for k in range(12): s.fx(ui_tick(3200 + 180 * i + 20 * k), t0 + k * 0.07, 0.5 - k * 0.03, -0.3 + i * 0.3)
s.fx(whir(180, 520, 2.4), CUT[1] + PB, 0.28)
s.note(sparkle(91), s.snap(pop(1, 0)), 0.16, 0.35, 0.5)                          # "anyway"
T45 = CUT[1] + PB * 5
s.lead_in(T45, 0.8, 0.28); s.fx(stamp() * 0.5, T45, 0.6); s.hit(T45, 1.0)
s.groove(1, 8, 15, 2, BR); s.arp(1, 7, 12, BR, 0.13, 'marimba', 0.55); s.hook(1, 'bright')

# ── shot 3 · the support: the envelope lowered in, the groove until the scissors — on the snip
# the drums stop and the hold music sinks under a closing filter; the jingle comes back FLAT
s.note(kick_tight(), CUT[2], 0.6, 0, 0)
s.fx(whir(440, 260, 0.75), CUT[2], 0.18)
T_SNIP = CUT[2] + PB * 5
s.groove(2, 0, (T_SNIP - CUT[2]) / B, 2, BR); s.arp(2, 0, 12, BR, 0.15)
s.note(bonk(74), s.snap(pop(2, 0)), 0.22, -0.2, 0.4)                               # "dropped"
s.fx(rustle(0.5), T_SNIP - 1.0, 0.6, 0.6)
s.fx(snip(), T_SNIP, 1.0, 0.2); s.fx(snip(), T_SNIP + 0.06, 0.7, 0.2)
s.fx(np.flip(riser(1.0)), T_SNIP + 0.05, 0.22); s.fx(glide(600, 120, 1.0), T_SNIP + 0.05, 0.2); s.fx(rustle(0.8), T_SNIP + 0.1, 0.5)
s.fx(thump() * 0.4, T_SNIP + 1.1, 0.5)
T_BRK = s.at(2, 12)
s.music_span(T_SNIP, T_BRK, lambda x: sweep(x, 9000, 420, curve=np.minimum(1, np.arange(len(x)) / SR / 0.8)))
s.ep_chord(T_BRK, SO[3][1], 1.2, 0.4, 0.12); s.hook(2, 'sour')

# ── shot 4 · eight days: a page torn off every half picture-beat, a marimba step up the scale
# with each; the cheque swings in on a riser and lands as the biggest launch hit in the film
T0 = CUT[3] + 0.6
for i, n in enumerate([74, 76, 78, 79, 81, 83, 85, 86]):
    t = T0 + i * PB / 2
    s.fx(rip(), t, 0.7, (-1) ** i * 0.4); s.note(marimba(n, 0.25, 0.85), t + 0.02, 0.32, (-1) ** i * 0.2, 0.35); s.fx(ui_tick(2800 + 120 * i), t + 0.02, 0.25)
for i, n in enumerate((62, 66, 69)): s.note(supersaw(n, 3.2, a=1.6, r=0.3, cut=1800, seed=10 + i), CUT[3] + 0.1, 0.08, -0.3 + 0.2 * i, 0.4)
T_CHQ = CUT[3] + 0.6 + 8 * PB / 2 + 0.35; T_LAND = T_CHQ + 0.7
s.lead_in(T_LAND, 0.7, 0.32); s.fx(glide(220, 110, 0.7), T_CHQ, 0.12)
s.fx(stamp() * 0.6, T_LAND, 0.7); s.fx(card(), T_LAND, 0.6); s.hit(T_LAND, 1.3); s.note(sparkle(93), T_LAND + 0.12, 0.2, -0.3, 0.6)
s.note(hat(True), T_LAND, 0.35, -0.3, 0.3)
s.groove(3, 10, 15, 3, BR); s.arp(3, 10, 12, BR, 0.13, 'marimba', 0.6); s.hook(3, 'brightest')

# ── shot 5 · open: chains let go, the sign hits the puddle, the gate creaks, the floodlights
# come on as a hit and the full launch groove runs — and the jingle in the break goes flat
s.note(kick_tight(), CUT[4], 0.6, 0, 0)
s.groove(4, 0, 3.75, 1, BR)
s.fx(chain(0.3), CUT[4] + 0.5, 0.8); s.fx(thump(), CUT[4] + 0.9, 0.8); s.fx(card(), CUT[4] + 0.9, 0.6)
s.fx(creak(1.0), CUT[4] + PB * 2, 0.9, -0.3); s.fx(creak(0.9), CUT[4] + PB * 2 + 0.1, 0.7, 0.3)
T_FLOOD = CUT[4] + PB * 3
s.lead_in(T_FLOOD, 0.5, 0.25); s.fx(stamp() * 0.4, T_FLOOD, 0.5); s.hit(T_FLOOD, 0.75, sparkle_=False)
s.fx(hum(100, 4.5), T_FLOOD, 0.15); s.fx(glide(70, 110, 2.4) * 0.6, CUT[4] + PB * 3.5, 0.35)
C5 = BR[:3] + [SO[3]]
s.groove(4, 4, 15, 3, C5); s.arp(4, 4, 12, C5, 0.12, 'marimba', 0.6)
for b in (4, 8): s.ep_chord(s.at(4, b), C5[s.bar_of(b)][1], 0.9, 0.6, 0.1)
s.note(bonk(71), s.snap(pop(4, 1)), 0.26, -0.2, 0.4)                              # "over 500 hectares"
s.hook(4, 'sour')

# ── shot 6 · on hold, again (6.10.2026). The groove runs into the cut and the floodlights clunk
# off — the music TAPE-STOPS with them. The gate creaks shut, the sign is hung back, the notice
# pinned; the hold loop comes back worn and in D minor; on the last hit the padlock, and the
# hold's old motif D–A–F on the e-piano, sagging flat as it rings out
T_OFF = CUT[5] + 0.5
s.groove(5, 0, 2, 3, SO)
s.music_span(T_OFF, END + 0.5, lambda x: tape_stop(x, 0.55))
s.fx(stamp() * 0.5, T_OFF, 0.6); s.fx(click(), T_OFF, 0.6); s.fx(stamp() * 0.4, CUT[5] + 0.8, 0.5); s.fx(click(), CUT[5] + 0.8, 0.5)
s.fx(creak(0.7), CUT[5] + PB * 2, 0.9, -0.3); s.fx(creak(0.6), CUT[5] + PB * 2 + 0.08, 0.7, 0.3); s.fx(thump() * 0.6, CUT[5] + PB * 2 + 0.7, 0.6)
s.fx(rustle(0.6), CUT[5] + PB * 3, 0.6); s.fx(chain(0.4), CUT[5] + PB * 3 + 0.6, 0.7); s.fx(card(), CUT[5] + PB * 3 + 0.8, 0.6)
s.fx(click(), CUT[5] + 2.5, 0.7, 0.5); s.fx(card() * 0.6, CUT[5] + 2.5, 0.5, 0.5)
T_WORN = s.at(5, 3)
s.arp(5, 3, (T_HIT - CUT[5]) / B, [SO[0]] * 4, 0.15)
s.fx(click(), T_HIT, 1.0); s.fx(stamp(), T_HIT, 0.9); s.note(kick_tight(), T_HIT, 0.8, 0, 0); s.note(bonk(62), T_HIT + 0.02, 0.3, -0.2, 0.5)
s.note(sub_bass(38, 1.4), T_HIT, 0.4, 0, 0)
for i, n in enumerate([62, 57, 53]):
    L = 1.7 if i == 2 else 0.3
    s.note(fm_ep(n, L, 0.75), T_HIT + i * B, 0.42, -0.1, 0.5); s.note(pluck(n + 12, min(L, 0.4)), T_HIT + i * B, 0.12, 0.2, 0.4)
s.music_span(T_WORN, END + 0.5, lambda x: soft(wow(x, 0.007, 0.55, 0.002), None, 3000) * np.linspace(1, 0.85, len(x)))

s.render(str(Path(__file__).with_name('配乐_doh_s2_m14.wav')), T_HIT + 1.3, tau=1.0)
