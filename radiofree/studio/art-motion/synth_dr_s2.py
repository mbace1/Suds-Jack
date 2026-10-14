#!/usr/bin/env python3
"""Score for "Unexpectedly, a Deer" (Toko thinker #1, CLAY remake, 37.5 s) — the TOKO palette (SOUND.md).

    uv run --with numpy --with soundfile python 音频/synth_dr_s2.py

A comedy in two voices. Toko's room is warm: a kitchen waltz in F at 168 BPM — felt piano,
music box, kalimba, a plucked upright, brushes — over room tone, a record's surface and rain.
The camera is small and cold: pips in fifths and octaves (a machine is sure, never warm),
ticks, a servo, snapping brackets, flags that whistle down and wobble, all out of a tiny
speaker. The jokes are timed by stopping: the band stops dead when the DEER flag pops; the
phone buzzes and its brief arrives in the camera's voice; two pats, each a felt note, then
NOTHING — real silence, the caption says it — and the dog's head tilt and Toko's are an
upright bass sliding up, 'bwoop?', twice. In the hallway (no window, so no rain) the camera
grows surer, a pip higher with every DEER flag, the reflection gets a kalimba shimmer, and
RACCOON whistles down onto the cat. At night Toko's hand-written DOG tag lands on a warm F
chord; the camera's DEER lands beside it in the same cold chime as before; the bass sighs; the
lamp clicks warmer and the music box answers. Every event is at its second in
clay-deer/EVENTS.md (global seconds; the picture's beat is PB).
"""
import sys
from pathlib import Path
for _d in (Path(__file__).resolve().parent, Path(__file__).resolve().parents[1]): sys.path.insert(0, str(_d / 'lib'))
from rfseries import *

s = Toko(); B = s.B
T_LAMP = CUT[5] + 9 * PB                                           # 36.96, the last hit (beat 9 of the last shot)
SURE = [(84, 91, 96), (86, 93, 98), (88, 95, 100)]                 # the camera's chime, a step surer each time
def step(v=1.0):                                                  # a paw: the pad on the floor and the claws' tick
    return over(paw(0.9) * v, noise(0.008, 2500, 9000) * np.exp(-tv(0.008) * 700) * 0.18 * v)
def jingle():                                                     # the dog's collar tag: two small bright pings
    return over(*[pad(sum(np.sin(2 * np.pi * f * k * tv(0.25)) * np.exp(-tv(0.25) * (18 + 6 * k)) / k for k in (1, 2.76)) * 0.12, dt) for f, dt in ((3300, 0), (4150, 0.05))])

# the room: tone and a record's surface throughout; rain on the window in shots 1–4 and 6 (quieter at
# night), none in the hallway — faded across the 0.5 s dissolves
s.beds(rain_=0, room_=1.0, vinyl_=0.7)
rn = np.interp(tv(END), [0, CUT[4] - 0.25, CUT[4] + 0.25, CUT[5] - 0.25, CUT[5] + 0.25, END], [1, 1, 0, 0, 0.6, 0.6])
s.sfx.bed(rain(END, 9, 1.0)[:len(rn)] * rn, 700)

# ── shot 1 · the Kallio living room at dusk: the waltz, softly; a tram passes in the rain, its bell
# as it enters; the camera wakes (an LED stutter, a servo, a two-pip boot), its LED pulsing after;
# the dog's ear twitches on the music box's note
s.waltz(0, 0, ['F', 'F', 'Bb', 'F', 'Gm7', 'C7'], 2, 0.62)
s.tune(0, 0, [(0, 0, 81), (1, 0, 84), (3, 0, 86), (4, 0, 82), (4, 1, 81), (4, 2, 79), (5, 0, 79), (5, 2, 76)], 0.38)
s.fx(tram(3.0, (0.5, 0.75)), 1.2, 0.8, -0.3, 0.15)
s.fx(led_tick(2600), s.snap(pop(0, 0)), 0.5, 0.35)                                          # "AI": a cold little pip
s.fx(led_flicker(0.5), PB * 4, 0.9, 0.35); s.fx(servo(0.3), PB * 4, 0.7, 0.35); s.fx(cam_chime((91, 96), 0.09, 0.06, 0.1), PB * 4, 0.5, 0.35, 0.1)
s.fx(card() * 0.3, PB * 4 + 0.12, 0.5, 0.35)                                               # the price tag set swinging
for k in range(4): s.fx(led_tick(), PB * (5 + 2 * k), 0.4, 0.35)                           # the LED, bright on alternate beats
s.fx(kalimba(93, 0.4), PB * 6, 0.12, -0.2, 0.2)                                             # the ear twitch

# ── shot 2 · rug level: the dog wakes (two kalimba notes), stretches into a play bow (the bass
# slides down), stands, and trots — the camera turning after it, its LED ticking on every paw; the
# brackets snap shut and the DEER flag POPS: the camera's chime, and the band stops dead
T = CUT[1]
s.waltz(1, 0, ['F', 'C', 'F'], 2, 0.62)
s.note(upright(36, 0.45, 0.75), s.bar(1, 3), 0.4, -0.1, 0.15); s.hold(s.bar(1, 3, 1), (55, 60, 64), B * 0.8, 0.4, 0.24)   # bar 4 cut short
s.tune(1, 0, [(0, 0, 81), (1, 0, 84), (2, 0, 86)], 0.36)          # no box in bar 4: the stop must be dead
s.note(kalimba(72, 0.8), T + PB, 0.5, -0.2, 0.3); s.note(kalimba(77, 0.8), T + PB + 0.13, 0.45, -0.2, 0.3)          # eyes open
s.note(upright_slide(41, 34, 0.5, 0.8), T + PB * 2, 0.45, -0.1, 0.2)                                              # the stretch
s.fx(step(), T + PB * 3, 1.3, -0.2); s.fx(jingle(), T + PB * 3, 0.6, -0.2)                                       # stands: the collar tag
s.fx(servo(2.25), T + PB * 3 + 0.13, 0.55, 0.35)                                                                   # tracking
for i in range(8):
    t = T + PB * 4 + i * PB / 2; s.fx(step(), t, 1.3, -0.3 + 0.08 * i); s.fx(led_tick(), t, 0.35, 0.35)
s.fx(cam_snap(), T + 3.06, 0.9, 0.2); s.fx(led_tick(4200), T + PB * 6, 0.3, 0.2)                          # brackets, settled
T_DEER = T + PB * 7
s.fx(tinny(tag_pop(1200)), T_DEER, 0.8, 0.2); s.fx(cam_chime(SURE[0]), T_DEER, 0.75, 0.25, 0.12)
s.note(kalimba(84, 0.6), T + 4.10, 0.3, -0.2, 0.3); s.note(kalimba(89, 0.6), T + 4.10 + 0.12, 0.27, -0.2, 0.3)   # looks up, a small wag
s.hold(s.bar(1, 5), (58, 60, 64), 3 * B, 0.3, 0.2, 36)                                                             # the band, carefully, back

# ── shot 3 · the phone in the gloved hand, 18:42: a buzz; the brief slides up in the camera's own
# voice; the band holds still under the reading, and walks up into the next shot
T = CUT[2]
s.hold(T, (57, 60, 64), 1.0, 0.3, 0.22, 41)
s.fx(phone_buzz(0.35), T + PB, 1.2, 0.1); s.fx(knock(0.5, 900) + 0, T + PB, 0.45, 0.1)                                       # the buzz, and the case rattling in the hand
s.fx(tinny(sweep(noise(0.3, 800, 6000), 1200, 6000) * np.sin(np.pi * tv(0.3) / 0.3) ** 2) * 0.25, T + PB * 2 - 0.02, 0.6, 0.15)
s.fx(cam_chime((79, 86, 91, 98), 0.07, 0.05, 0.22), T + PB * 2, 0.7, 0.15, 0.12)                                  # the brief arrives
s.hold(s.bar(2, 2), (58, 62, 65, 69), 2 * 3 * B, 0.28, 0.2, 34); s.hold(s.bar(2, 4), (58, 62, 65, 67), 3 * B, 0.28, 0.2, 43)
for i, n in enumerate([36, 38, 40]): s.note(upright(n, 0.25, 0.7), s.bar(2, 5, i), 0.42, -0.1, 0.15)                  # tiptoe

# ── shot 4 · antlers: a tiptoe waltz while Toko lowers the phone and leans in; the band stops for
# the pats — each a felt note — then NOTHING; the dog tilts its head (the bass, 'bwoop?') and Toko
# tilts his (again, higher); then, deadpan, the waltz picks up where it was
T = CUT[3]
s.waltz(3, 0, ['F', 'C7'], 1, 0.55)
s.note(kalimba(88, 0.4), s.snap(pop(3, 0)), 0.14, 0.2, 0.3)                                                        # "for antlers"
P1, P2 = T + PB * 3 + 0.14, T + PB * 4 + 0.14
fur = lambda: over(pat(1.0), noise(0.03, 1500, 5000) * np.exp(-tv(0.03) * 150) * 0.12)                      # a hand landing on fur
s.fx(fur(), P1, 1.2, -0.15); s.note(felt_piano(72, 0.35, 0.45), P1, 0.3, -0.15, 0.3)
s.fx(fur(), P2, 1.2, 0.15); s.note(felt_piano(76, 0.35, 0.45), P2, 0.3, 0.15, 0.3)
s.note(upright_slide(38, 45, 0.3, 0.85), T + PB * 6, 0.55, -0.1, 0.25)                                             # the dog's tilt
s.note(upright_slide(40, 48, 0.3, 0.85), T + PB * 7, 0.55, 0.1, 0.25)                                              # Toko's
s.waltz(3, 4, ['F', 'C7'], 1, 0.55); s.tune(3, 4, [(0, 0, 81), (1, 0, 79), (1, 2, 76)], 0.34)

# ── shot 5 · the hallway mirror (no rain): the dog's paws all the way across; DEER flags pop on the
# mirror, the camera a step surer each time; the antlered reflection gets a kalimba shimmer; the cat
# pads in; RACCOON whistles down, pins and wobbles; the cat looks up — the bass, 'bwomp'
T = CUT[4]
s.waltz(4, 0, ['F', 'C'], 2, 0.5); s.waltz(4, 2, ['Dm', 'Bb'], 1, 0.45); s.waltz(4, 5, ['C7'], 1, 0.45)
s.tune(4, 0, [(0, 0, 84), (1, 0, 81), (5, 0, 79)], 0.34)
for i in range(17): s.fx(step(), T + i * PB / 2, 1.4, -0.6 + 0.07 * i)                                           # on the hall floor, nothing to hide them
for k, b in enumerate([3, 4, 5]):
    t = T + PB * b; s.fx(tinny(tag_pop(1200 + 100 * k)), t, 0.7, 0.3); s.fx(cam_chime(SURE[k]), t, 0.6 + 0.05 * k, 0.3, 0.12)
for i, n in enumerate([77, 81, 84, 89, 93, 96]): s.note(kalimba(n, 0.55), T + 1.65 + 0.035 * i, 0.22, -0.1 + 0.08 * i, 0.4)   # the reflection
t = T + 2.20
while t < T + PB * 7: s.fx(step(0.5), t, 0.8, -0.5); t += 0.25                                                    # the cat
s.fx(fall_whistle(0.45), T + 3.30, 0.8, 0.0); s.fx(pin_wobble(0.5), T + PB * 7, 0.8, -0.1)
s.note(upright_slide(43, 36, 0.3, 0.8), T + PB * 8, 0.5, -0.1, 0.25)                                             # the cat looks up

# ── shot 6 · night: Toko tying a card tag on the collar; a quiet waltz; the DOG tag flips round on a
# warm F chord; the camera's LED, its brackets, its DEER whistling down beside the tag in the same
# cold chime as before; the bass sighs; the lamp clicks warmer and the music box answers
T = CUT[5]
s.fx(fiddle(3.1), T, 0.9, 0.1)
s.waltz(5, 0, ['F', 'Dm', 'C7'], 1, 0.5); s.tune(5, 0, [(0, 0, 81), (1, 0, 79), (2, 0, 82)], 0.32)
t = s.snap(pop(5, 0)); s.fx(cam_chime((96, 96), 0.06, 0.03, 0.03), t, 0.35, 0.35)                                   # "$20 a month": blip-blip
T_DOG = T + PB * 6
s.fx(card_flip(), T_DOG, 0.85, 0.0); s.fx(sit(0.5), T_DOG + 0.1, 0.5)
s.hold(T_DOG, (53, 57, 60, 65), 1.6, 0.45, 0.3, 41); s.box(T_DOG, 89, 0.36)
s.fx(led_flicker(0.45), T + PB * 7, 0.8, 0.35); s.fx(cam_snap(), T + 3.85, 0.8, 0.3)
s.fx(fall_whistle(0.4), T + 3.89, 0.7, 0.2); s.fx(pin_wobble(0.45), T + PB * 8, 0.7, 0.2); s.fx(cam_chime(SURE[0]), T + PB * 8 + 0.05, 0.55, 0.25, 0.12)
s.note(upright_slide(41, 36, 0.35, 0.7), T + 4.39, 0.45, -0.1, 0.2)                                              # the slump
s.fx(lamp_click(), T_LAMP, 0.9, -0.2); s.fx(knock(0.3, 200), T_LAMP + 0.01, 0.3, -0.2)
s.box(T_LAMP, 93, 0.36); s.hold(T_LAMP, (57, 60, 65, 69), 0.6, 0.38, 0.24)

s.render(str(Path(__file__).with_name('配乐_dr_s2_m14.wav')), T_LAMP + 0.12, tau=0.45)
