"""Sound for TESLUR (tech-satire clay film, version B, ~21 s): no music you would notice, no voice.

    uv run --with numpy --with soundfile python 音频/synth_teslur.py

The machines do the talking. Under the livestream, a dark hype pulse at 120 BPM and a faint crowd.
The CAR is a vacuum cleaner: its suction whine follows the suction curve the picture is animated with
(EV['suction'], from clay-roadster/EVENTS-B.md), big and low. The janitor's canister vacuum hums small and
high while he is on screen, panned with him, with clay footsteps. Run 1: the crowd "ooh"s while the car
hangs upside down; run 2: a cheer as it launches, and the cold-gas jets hiss. Then the cough: the hype
bed tape-stops, the crowd dies, the jets stutter into throaty coughs, and the janitor's vacuum switches
off — its motor spinning down in the shape of "whuuut?". The car's last cough answers in the same shape.
HARD CUT to black: TESLUR lands with a clay thump, "What?" with a smaller thup, and a breath of room.
Every time below comes from EVENTS-B.md (placeholders until the picture is final). Voices: teslur_voices.py.
"""
import sys
from pathlib import Path
HERE = Path(__file__).resolve().parent
for _d in (HERE, HERE.parent): sys.path.insert(0, str(_d / 'lib'))
sys.path.insert(0, str(HERE))
from rfsound import *
from teslur_voices import vac_motor, whut, jets, cough, clay_thump, thup

END = 21.0
EVENTS = Path(__file__).resolve().parent / 'clay' / 'teslur' / 'EVENTS-B.md'


def read_suction(md=EVENTS):
    """the car's suction(t) table from EVENTS-B.md: rows of | t | s | t | s | ... |"""
    txt = md.read_text().split('## suction(t)')[1].split('##')[0]; pts = []
    for line in txt.splitlines():
        cells = [c.strip() for c in line.strip().strip('|').split('|')]
        if len(cells) < 2 or not cells[0].replace('.', '').isdigit(): continue
        nums = [float(c) for c in cells if c and c.replace('.', '').isdigit()]
        pts += list(zip(nums[0::2], nums[1::2]))
    return sorted(pts)


EV = dict(                                                                             # every time from clay-roadster/EVENTS-B.md
    vac_on=0.40, vac_off=14.00,                                                        # the janitor's vacuum runs without a break between these
    offscreen=[(0.0, 2.1), (8.2, 11.0)],                                               # ...quieter and hard left while he is out of frame
    steps=[(0.68, 1), (1.04, 1), (1.40, 1), (1.76, 1), (2.11, 1), (2.47, 0), (2.82, 0), (7.54, 0), (7.72, 0), (7.90, 0), (8.09, 0), (8.28, 1),
           (8.47, 1), (8.65, 1), (8.84, 1), (9.07, 1), (9.97, 1), (10.25, 1), (10.54, 1), (10.82, 1), (11.10, 0), (11.38, 0), (11.67, 0)],   # (t, off-screen)
    swishes=[0.86, 1.44, 2.01, 2.59, 3.16, 3.74, 4.31, 4.89, 5.46, 6.04, 6.61, 7.19, 7.76, 8.34, 8.91, 9.49, 10.06, 10.64, 11.21, 11.79, 12.36, 12.94, 13.51],
    shuffles=[7.05, 7.25, 13.65, 13.9], cup_pop=14.15,
    run1=(3.2, 5.6), hang=(5.6, 7.0), down=(7.0, 8.6), run2=(9.2, 10.6), launch=10.6, jets=(11.45, 13.95), hud=8.9, cough0=14.0,
    coughs=[(14.05, 0.5), (14.62, 1.0), (14.86, 1.0), (16.58, 1.5), (17.12, 0.5)],    # (time, size); the 16.58 one also asks "whuuut?"
    wheeze=(15.45, 16.30), cut=17.5, what=18.10,
    suction=read_suction(),
)


GAIN = dict(bed=0.35, crowd=1.0, car=1.0, jets=1.0, coughs=1.0, jan=0.8, card=1.0)   # stem levels, set by teslur_stems.py: the hype bed sits ~10 dB under the car


def suction_curve(n):
    """the car's suction 0–1 per sample: from EVENTS-B if given, else the placeholder shape"""
    t = np.arange(n) / SR
    if EV['suction']:
        ts, vs = zip(*EV['suction']); return np.interp(t, ts, vs)
    r1, h, dn, r2 = EV['run1'], EV['hang'], EV['down'], EV['run2']
    pts = [(0, 0.15), (r1[0], 0.15), (r1[1], 1.0), (h[1], 1.0), (dn[1], 0.15), (r2[0], 0.15), (r2[1], 1.0), (EV['launch'] + 0.3, 0.0), (END, 0.0)]
    ts, vs = zip(*pts); return np.interp(t, ts, vs)


def gate(n, spans, fade=0.25):
    """1 inside any (t0, t1) span, with fades — the janitor's vacuum while he is on screen"""
    t = np.arange(n) / SR; g = np.zeros(n)
    for a, b in spans: g = np.maximum(g, np.clip((t - a) / fade, 0, 1) * np.clip((b - t) / fade, 0, 1))
    return g


def build(variant='B'):
    scene, card = Mix(END), Mix(END)
    N = scene.N; t = np.arange(N) / SR
    cut = EV['cut']

    # ── the livestream: a dark hype pulse (A minor, 120 BPM) and a faint crowd; both die at the cough
    B = 0.5; bed = np.zeros(N)
    for k in range(int(EV['cough0'] / B) + 1):
        s0 = int(k * B * SR); x = kick_tight(0.7)[: N - s0]; bed[s0:s0 + len(x)] += x * 0.5
        if k % 2: h = hat(vel=0.5)[: N - s0]; bed[s0:s0 + len(h)] += h * 0.4
    for k, (m, m2) in enumerate([(45, 57), (41, 53), (43, 55), (40, 52)] * 4):
        s0 = int(k * 4 * B * SR)
        if s0 >= N: break
        p = over(supersaw(m2, 4 * B, cut=1400), sub_bass(m - 12, 4 * B) * 0.8)[: N - s0]; bed[s0:s0 + len(p)] += p * 0.35
    c0 = int(EV['cough0'] * SR); bed[c0:] = tape_stop(bed[c0:], 0.7)
    scene.bed(bed * 0.5 * GAIN['bed'])
    crowd_bed = noise(END, 250, 2500) * 0.04 + crowd(END, 7) * 0.05
    h0, l0 = EV['hang'][0], EV['launch']
    swell = np.interp(t, [0, h0 - 0.4, h0 + 0.3, EV['down'][0], l0, l0 + 0.4, EV['cough0'] + 0.3, EV['cough0'] + 1.2], [0.5, 0.5, 1.6, 1.0, 1.0, 2.2, 1.2, 0.0])
    scene.bed(crowd_bed * swell * 0.8 * GAIN['crowd'], 1300)
    scene.add(crowd(1.6, 11) * np.sin(np.pi * tv(1.6) / 1.6), h0 - 0.1, 0.35 * GAIN['crowd'])                     # "ooh" at the hang
    scene.add(over(*[pad(clap(0.8), i * 0.07 + 0.01 * (i % 3)) for i in range(18)]) * 0.5, l0 + 0.15, 0.25 * GAIN['crowd'], 0.1)   # cheer at the launch
    scene.add(ui_tick(2600), EV['hud'], 0.12, 0.6)                                                               # the HUD changes layout

    # ── the car: a big low vacuum on the picture's own suction curve
    sc = suction_curve(N)
    car = vac_motor(END, 380, np.clip(sc, 0, 1), roar=0.9, seed=41) * np.clip(sc * 1.4, 0, 1)
    scene.add(car, 0, 0.55 * GAIN['car'], -0.05)
    dd = EV['down'][1] - EV['down'][0]
    scene.add(noise(dd, 60, 600) * np.sin(np.pi * tv(dd) / dd), EV['down'][0], 0.2 * GAIN['car'])                 # tyres rolling back down
    scene.add(noise(0.9, 200, 6000) * np.exp(-tv(0.9) * 4) * np.minimum(1, tv(0.9) / 0.05), EV['launch'] - 0.1, 0.35 * GAIN['jets'], -0.2)   # whoosh off the lip

    # ── the jets: a steady hiss 11.45–13.95; then the cough — each stutter chokes the hiss 0.09 s early
    j0, j1 = EV['jets']; J = jets(cut - j0, seed=43); jt = np.arange(len(J)) / SR + j0
    jg = np.clip((jt - j0) / 0.08, 0, 1) * np.where(jt < j1, 1.0, 0.35)          # after 13.95 only a ragged remnant
    for ct, size in EV['coughs']: jg *= 1 - np.clip(1 - np.abs(jt - (ct - 0.09)) / 0.07, 0, 1)
    w0, w1 = EV['wheeze']; jg *= np.where((jt > w0) & (jt < w1), 1 + 0.8 * np.sin(2 * np.pi * 9 * jt) * np.sin(2 * np.pi * 2.3 * jt), 1)
    scene.add(J * np.clip(jg, 0, 1.6) * np.clip((cut - 0.02 - jt) / 0.02, 0, 1), j0, 0.22 * GAIN['jets'], -0.25)
    for i, (ct, size) in enumerate(EV['coughs']):
        if size >= 1.5: v = over(cough(size, seed=60 + i), whut(0.5, 190, seed=70) * 0.6)    # the big one asks too: "whuut?"
        else: v = cough(size, seed=60 + i)
        scene.add(v, ct, (0.5 + 0.15 * size) * GAIN['coughs'], -0.35)
    rr = np.random.default_rng(81)                                                # the long wheeze: a rattling stream of small coughs
    for k, wt in enumerate(np.sort(rr.uniform(w0, w1, 18))):
        scene.add(cough(0.3, seed=90 + k), wt, 0.32 * GAIN['coughs'], -0.4)
    scene.add(vac_motor(w1 - w0, 300, np.linspace(0.5, 0.15, int((w1 - w0) * SR)), roar=1.0, seed=82) * np.sin(np.pi * tv(w1 - w0) / (w1 - w0)), w0, 0.25 * GAIN['coughs'], -0.35)

    # ── the janitor: his canister vacuum 0.40–14.00 without a break (quieter and hard left off-screen), steps, swishes
    g = np.clip((t - EV['vac_on']) / 0.35, 0, 1) * (t < EV['vac_off'])
    off = np.zeros(N)
    for a_, b_ in EV['offscreen']: off = np.maximum(off, np.clip((t - a_ + 0.3) / 0.3, 0, 1) * np.clip((b_ + 0.3 - t) / 0.3, 0, 1))
    pan = -0.25 - 0.7 * off; lvl = 1 - 0.5 * off
    jv = vac_motor(END, 1450, roar=0.55, seed=44) * g * lvl * GAIN['jan']
    a = (pan + 1) * np.pi / 4; scene.L += jv * np.cos(a) * 0.22; scene.R += jv * np.sin(a) * 0.22
    for st, o in EV['steps']: scene.add(pat(0.6), st, (0.25 if o else 0.5) * GAIN['jan'], -0.9 if o else -0.3)
    for sw in EV['swishes']:
        o = any(a_ <= sw <= b_ for a_, b_ in EV['offscreen'])
        scene.add(brush_swish(0.35, 0.6), sw - 0.15, (0.12 if o else 0.25) * GAIN['jan'], -0.9 if o else -0.2)
    for sh in EV['shuffles']: scene.add(pat(0.4), sh, 0.3 * GAIN['jan'], -0.25)
    scene.add(whut(0.6, 280, seed=22), EV['vac_off'], 0.6 * GAIN['jan'], -0.15)     # the motor switched off, asking: "whuut?"
    scene.add(tag_pop(520) * 0.6, EV['cup_pop'], 0.18 * GAIN['jan'], -0.1)           # the ear cup's seal breaking

    if variant == 'C':                                                            # the TESLUR robot (EVENTS-C.md): servos, harder feet, an idle hum
        for sw in EV['swishes']:
            o = any(a_ <= sw <= b_ for a_, b_ in EV['offscreen'])
            scene.add(servo(0.22), sw - 0.3, (0.08 if o else 0.16) * GAIN['jan'], -0.9 if o else -0.2)
            scene.add(ui_tick(4200), sw, (0.05 if o else 0.1) * GAIN['jan'], -0.9 if o else -0.2)
        for st, o in EV['steps']: scene.add(knock(0.5, 240), st, (0.12 if o else 0.25) * GAIN['jan'], -0.9 if o else -0.3)
        for ss in (14.08, 14.40, 14.60, 14.75):
            scene.add(servo(0.18), ss - 0.18, 0.18 * GAIN['jan'], -0.15); scene.add(ui_tick(3800), ss, 0.12 * GAIN['jan'], -0.15)
        scene.add(hum(118, 2.1) * 0.6, 15.4, 0.12 * GAIN['jan'], -0.15)

    # ── HARD CUT, then the card
    c = int(cut * SR); f = int(0.012 * SR)
    for ch in (scene.L, scene.R): ch[c:c + f] *= np.linspace(1, 0, f); ch[c + f:] = 0
    card.add(room(END - cut, 1.0, seed=9) * 0.25 * GAIN['card'], cut)
    card.add(clay_thump(1.0), cut, 0.9 * GAIN['card'])
    card.add(thup(0.7), EV['what'], 0.6 * GAIN['card'])
    out = Mix(END); out.L = scene.L + card.L; out.R = scene.R + card.R
    return out


if __name__ == '__main__':
    v = sys.argv[1] if len(sys.argv) > 1 else 'B'
    m = build(v)
    m.finish(str(HERE / ('配乐_teslur_m14.wav' if v == 'B' else f'配乐_teslur_{v}_m14.wav')), END, END - 0.4, tau=0.3)
