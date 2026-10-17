"""Sound for TESLUR (tech-satire clay film, ~29.5 s), v2: the car and the janitor's vacuum are ONE machine.

    uv run --with numpy --with soundfile python 音频/synth_teslur.py [B|C]

Owner, 17 Oct 2026: "The car should start moving, sounds start, then Toko appears, so it sounds like the same
with the car and the vacuum; when Toko moves away, sounds stop and car comes down on same second."
So there is ONE vacuum: it starts with the car (1.50), arrives from off-screen right before he does, travels
with him right→left (panned with him), and dies in 0.12 s the instant his canister leaves frame (12.00) — the
same instant the car lets go and rolls down. Run 2 the same from the left (15.00). Its level is the picture's
own suction curve (clay-roadster/EVENTS-B.md). At 22.00 he stops dead and the vacuum is switched off; with no
suction the car coughs (throaty jet stutters) until the HARD CUT (25.50). TESLUR lands in SILENCE; only "What?"
(26.30) sounds — a vacuum-voiced "whuut?" with a soft clay thump under it (owner: "only the 'What' text can
appear and have a thump, or an audible whut"). Under the scene, a livestream: a dark hype pulse that
tape-stops at the cough, and a faint crowd ("ooh" at the top, "ohh" at the drop, a cheer at the launch).
C (the TESLUR robot): servo whirs on his sweeps, harder feet, servo stops on the peek and the look, an idle hum.
"""
import sys
from pathlib import Path
HERE = Path(__file__).resolve().parent
for _d in (HERE, HERE.parent): sys.path.insert(0, str(_d / 'lib'))
sys.path.insert(0, str(HERE))
from rfsound import *
from teslur_voices import vac_motor, whut, jets, cough, clay_thump, thup

END = 29.5
EVENTS = Path(__file__).resolve().parent / 'clay' / 'teslur' / 'EVENTS-B.md'


def read_suction(md=EVENTS):
    """the suction(t) table from EVENTS-B.md: rows of | t | s | t | s | ... |"""
    txt = md.read_text().split('## suction(t)')[1].split('##')[0]; pts = []
    for line in txt.splitlines():
        cells = [c.strip() for c in line.strip().strip('|').split('|')]
        if len(cells) < 2 or not cells[0].replace('.', '').isdigit(): continue
        nums = [float(c) for c in cells if c and c.replace('.', '').isdigit()]
        pts += list(zip(nums[0::2], nums[1::2]))
    return sorted(pts)


EV = dict(                                                                             # every time from EVENTS-B.md (re-timed)
    vac=[(1.50, 12.00), (15.00, 22.00)],                                               # the one vacuum runs in these spans
    pass1=(2.50, 12.00), pass2=(15.40, 22.00),                                         # nozzle in → canister out (pass 1), nozzle in → stop (pass 2)
    steps=[(0.37, 1), (1.11, 1), (1.84, 1), (2.58, 1), (3.32, 1), (4.06, 0), (4.79, 0), (5.53, 0), (6.27, 0), (7.00, 0), (7.74, 0), (8.48, 0),
           (9.22, 0), (9.95, 0), (10.69, 1), (11.43, 1), (15.11, 1), (15.85, 1), (16.59, 1), (17.32, 0), (18.06, 0), (18.80, 0), (19.54, 0),
           (20.27, 0), (21.01, 0), (21.75, 0)],                                        # (t, off-screen); only those inside a vacuum span sound
    swishes=[2.01, 2.59, 3.16, 3.74, 4.31, 4.89, 5.46, 6.04, 6.61, 7.19, 7.76, 8.34, 8.91, 9.49, 10.06, 10.64, 11.21, 11.79,
             15.24, 15.81, 16.39, 16.96, 17.54, 18.11, 18.69, 19.26, 19.84, 20.41, 20.99, 21.56],
    shuffle=(22.00, 22.45), cup_pop=22.25, peek=(22.10, 22.50), look=(23.30, 23.70),
    top=10.00, release=12.00, down=(12.00, 13.60), run2=15.00, hud=15.00, launch=19.00, jets=(19.60, 21.80),
    coughs=[(22.00, 0.5), (22.57, 1.0), (22.81, 1.0), (24.53, 1.5), (25.07, 0.5)], wheeze=(23.40, 24.25),
    cut=25.50, what=26.30,
    suction=read_suction(),
)
GAIN = dict(bed=0.27, crowd=1.0, vac=1.0, jets=1.0, coughs=1.0, jan=0.8, card=1.0)   # stem levels (teslur_stems.py)


def curve(n, pts):
    t = np.arange(n) / SR; ts, vs = zip(*pts); return np.interp(t, ts, vs)


def build(variant='B'):
    scene, card = Mix(END), Mix(END)
    N = scene.N; t = np.arange(N) / SR
    cut = EV['cut']

    # ── the livestream: a dark hype pulse (A minor, 120 BPM) and a faint crowd; both die at the cough
    B = 0.5; c0 = EV['coughs'][0][0]; bed = np.zeros(N)
    for k in range(int(c0 / B) + 1):
        s0 = int(k * B * SR); x = kick_tight(0.7)[: N - s0]; bed[s0:s0 + len(x)] += x * 0.5
        if k % 2: h = hat(vel=0.5)[: N - s0]; bed[s0:s0 + len(h)] += h * 0.4
    for k, (m, m2) in enumerate([(45, 57), (41, 53), (43, 55), (40, 52)] * 4):
        s0 = int(k * 4 * B * SR)
        if s0 >= N: break
        p = over(supersaw(m2, 4 * B, cut=1400), sub_bass(m - 12, 4 * B) * 0.8)[: N - s0]; bed[s0:s0 + len(p)] += p * 0.35
    i0 = int(c0 * SR); bed[i0:] = tape_stop(bed[i0:], 0.7)
    scene.bed(bed * 0.5 * GAIN['bed'])
    swell = curve(N, [(0, 0.5), (EV['top'] - 0.3, 0.6), (EV['top'] + 0.4, 1.4), (EV['release'] + 0.5, 1.1), (EV['launch'], 1.0), (EV['launch'] + 0.4, 2.0), (c0 + 0.3, 1.1), (c0 + 1.2, 0.0), (END, 0.0)])
    scene.bed((noise(END, 250, 2500) * 0.04 + crowd(END, 7) * 0.05) * swell * 0.8 * GAIN['crowd'], 1300)
    scene.add(crowd(1.6, 11) * np.sin(np.pi * tv(1.6) / 1.6), EV['top'] - 0.1, 0.3 * GAIN['crowd'])              # "ooh" as it hangs
    scene.add(crowd(1.2, 9) * np.sin(np.pi * tv(1.2) / 1.2) * np.linspace(1.0, 0.7, int(1.2 * SR)), EV['release'] + 0.15, 0.3 * GAIN['crowd'])   # "ohh" as it drops
    scene.add(over(*[pad(clap(0.8), i * 0.07 + 0.01 * (i % 3)) for i in range(18)]) * 0.5, EV['launch'] + 0.15, 0.25 * GAIN['crowd'], 0.1)   # a cheer at the launch
    scene.add(ui_tick(2600), EV['hud'], 0.12, 0.6)

    # ── THE vacuum: one motor for the car and the janitor — level = the suction curve, panned with him
    sc = np.clip(curve(N, EV['suction']), 0, 1)
    on = np.zeros(N)
    for a, b in EV['vac']: on = np.maximum(on, (t >= a) & (t < b + 0.12))
    rel = int((EV['release'] + 0.12) * SR)                                            # 12.00: it dies in 0.12 s
    lvl = np.clip(sc * 1.3, 0, 1) * on
    pan = curve(N, [(0, 0.95), (EV['pass1'][0], 0.9), (EV['pass1'][1], -0.9), (EV['run2'], -0.95), (EV['pass2'][0], -0.9), (EV['pass2'][1], 0.35), (END, 0.35)])
    motor = vac_motor(END, 1150, np.clip(0.55 + 0.45 * sc, 0, 1), roar=0.75, seed=44)
    body = vac_motor(END, 380, np.clip(sc, 0, 1), roar=0.9, seed=41) * 0.45          # the low suction the car hangs on
    v = (motor + body) * lvl * GAIN['vac']
    for a, b in EV['vac']:                                                            # hard stops: a 0.12 s collapse, then nothing
        s1 = int(b * SR); f = int(0.12 * SR); v[s1:s1 + f] *= np.linspace(1, 0, f) ** 2; v[s1 + f: int((b + 0.5) * SR)] = 0
    a_ = (pan + 1) * np.pi / 4; scene.L += v * np.cos(a_) * 0.3; scene.R += v * np.sin(a_) * 0.3
    scene.add(over(soft(noise(0.12, 300, 3000), None, None) * np.exp(-tv(0.12) * 30), glide(900, 300, 0.12) * 0.4), EV['release'], 0.18, -0.9)   # the motor cut out (pass 1)
    dd = EV['down'][1] - EV['down'][0]
    scene.add(noise(dd, 60, 600) * np.sin(np.pi * tv(dd) / dd), EV['down'][0], 0.22)  # the car rolling back down

    # ── the janitor's own sounds: steps and swishes while his vacuum runs, the stop, the cup's seal
    inside = lambda x: any(a <= x <= b for a, b in EV['vac'])
    seen = lambda x: any(a <= x <= b for a, b in (EV['pass1'], EV['pass2']))
    for st, o in EV['steps']:
        if inside(st): scene.add(pat(0.6), st, (0.22 if o else 0.45) * GAIN['jan'], float(np.interp(st, t, pan)))
    for sw in EV['swishes']:
        scene.add(brush_swish(0.35, 0.6), sw - 0.15, (0.25 if seen(sw) else 0.12) * GAIN['jan'], float(np.interp(sw, t, pan)))
    for sh in (EV['shuffle'][0] + 0.05, EV['shuffle'][1] - 0.1): scene.add(pat(0.4), sh, 0.3 * GAIN['jan'], 0.35)
    scene.add(tag_pop(520) * 0.6, EV['cup_pop'], 0.14 * GAIN['jan'], 0.35)

    # ── the launch, the jets, the cough (no suction left: the car chokes)
    scene.add(noise(0.9, 200, 6000) * np.exp(-tv(0.9) * 4) * np.minimum(1, tv(0.9) / 0.05), EV['launch'] - 0.1, 0.35 * GAIN['jets'], -0.2)
    j0, j1 = EV['jets']; J = jets(cut - j0, seed=43); jt = np.arange(len(J)) / SR + j0
    jg = np.clip((jt - j0) / 0.08, 0, 1) * np.where(jt < j1, 1.0, 0.0)
    w0, w1 = EV['wheeze']
    for ct, size in EV['coughs']: jg += np.exp(-((jt - ct) / 0.08) ** 2) * 0.5     # a choked flash of gas at every cough
    scene.add(J * np.clip(jg, 0, 1.2) * np.clip((cut - 0.02 - jt) / 0.02, 0, 1), j0, 0.22 * GAIN['jets'], -0.3)
    for i, (ct, size) in enumerate(EV['coughs']): scene.add(cough(size, seed=60 + i), ct, (0.5 + 0.15 * size) * GAIN['coughs'], -0.35)
    rr = np.random.default_rng(81)
    for k, wt in enumerate(np.sort(rr.uniform(w0, w1, 18))): scene.add(cough(0.3, seed=90 + k), wt, 0.32 * GAIN['coughs'], -0.4)
    wd = w1 - w0
    scene.add(vac_motor(wd, 300, np.linspace(0.5, 0.15, int(wd * SR)), roar=1.0, seed=82) * np.sin(np.pi * tv(wd) / wd), w0, 0.22 * GAIN['coughs'], -0.35)

    if variant == 'C':                                                                # the TESLUR robot: servos, harder feet, an idle hum
        for sw in EV['swishes']:
            g = 0.16 if seen(sw) else 0.08; p = float(np.interp(sw, t, pan))
            scene.add(servo(0.22), sw - 0.3, g * GAIN['jan'], p); scene.add(ui_tick(4200), sw, g * 0.6 * GAIN['jan'], p)
        for st, o in EV['steps']:
            if inside(st): scene.add(knock(0.5, 240), st, (0.12 if o else 0.25) * GAIN['jan'], float(np.interp(st, t, pan)))
        for ss in (EV['shuffle'][1], EV['peek'][1], EV['look'][1]):
            scene.add(servo(0.2), ss - 0.2, 0.18 * GAIN['jan'], 0.35); scene.add(ui_tick(3800), ss, 0.12 * GAIN['jan'], 0.35)
        scene.add(hum(118, cut - EV['look'][1]) * 0.6, EV['look'][1], 0.12 * GAIN['jan'], 0.35)

    # ── HARD CUT; TESLUR in silence; only "What?" speaks
    c = int(cut * SR); f = int(0.012 * SR)
    for ch in (scene.L, scene.R): ch[c:c + f] *= np.linspace(1, 0, f); ch[c + f:] = 0
    card.add(room(END - cut, 1.0, seed=9) * 0.2 * GAIN['card'], cut)
    card.add(whut(0.6, 270, seed=22), EV['what'], 0.75 * GAIN['card'])
    card.add(thup(0.6), EV['what'], 0.45 * GAIN['card'])
    out = Mix(END); out.L = scene.L + card.L; out.R = scene.R + card.R
    return out


if __name__ == '__main__':
    v = sys.argv[1] if len(sys.argv) > 1 else 'B'
    m = build(v)
    m.finish(str(HERE / f'配乐_teslur2_{v}_m14.wav'), END, END - 0.5, tau=0.35)
