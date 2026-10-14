"""The three series' sound palettes (SOUND.md), built from the series voices in rfsound.py.

    from rfseries import *
    s = Doodle()            # or Coxon(), Toko()
    s.fx(stamp(), 9.107)    # a picture-synced effect, at its second
    s.note(fm_ep(62), s.at(1, 4))     # music, on the series' own beat: shot 1, beat 4
    s.render(out_wav, ring_from=T_HIT + 1.3)

The PICTURE runs on the house grid — 112 BPM, twelve beats a shot, the last shot ten — so CUT,
END and T_HIT never change. Each series picks its own tempo from the four whose beat lands on
every cut (84, 112, 140, 168: 9, 12, 15 or 18 beats a shot); `at(shot, beat)` counts in it.
Picture-synced effects are placed in SECONDS (copied out of the old scores, or an events list),
never in a series' beats, so a tempo change can never move a hit.

Two buses so the music can be treated as music (tape-stopped, filtered, ducked) without the
effects going with it; each has its own reverb send; render() pours both into one Mix, glues
it (a look-ahead compressor, so finish()'s loudnorm can stay linear), trims the peak and calls
the house finish(): −14 LUFS integrated, −2 dBTP, the tail rung out from the last hit.
"""
from rfsound import *

PB = 60 / 112                       # the picture's beat
SHOT_S = 12 * PB                    # 6.4286 s
CUT = [k * 12 * PB for k in range(6)]        # evaluated exactly as the old scores do, so every second matches
END = CUT[5] + 10 * PB              # 37.5 s
T_HIT = CUT[5] + 3.0                # the last hit in every film
CAPS = [(0.80, 3.00)] * 5 + [(0.70, 2.20)]   # caption halves appear this long after each cut (rfcaps)


def pop(shot, half, caps=None):
    """when the keyword on caption half 0/1 of a shot pops: +0.5 s after its line appears (rfcaps \\t(500,650))"""
    return CUT[shot] + (caps or CAPS)[shot][half] + 0.5


class Score:
    BPM = 112
    VERB = dict(t60=1.4, lo=150, hi=7000, pre=0.015, g=0.3)
    GLUE = dict(thresh=-16.0, ratio=2.5)       # thresholds are dB below the mix's own peak
    LIMIT = dict(ratio=8.0, look=0.003, rel=0.08)   # threshold found per score in render()
    PLR = 11.3                                      # loudnorm goes dynamic past 12 dB
    EQ = dict(fc=3000.0, db=0.0, hp=35.0)      # the series' tilt on the MUSIC bus
    PEAK = 1.0

    def __init__(self, dur=END + 0.5):
        self.B = 60 / self.BPM; self.dur = dur
        self.mus, self.mwet, self.sfx, self.fwet = (Bus(dur) for _ in range(4))

    def at(self, shot, beat=0.0): return CUT[shot] + beat * self.B

    def snap(self, t, div=4, win=0.15):
        """the first point of this series' grid (1/div beat) inside [t, t+win] — for a caption accent
        that should sit in the groove AND inside the keyword's pop; t + 0.05 if none"""
        g = self.B / div; k = np.ceil((t - 1e-6) / g) * g
        return k if k <= t + win else t + 0.05

    def note(self, sig, t, g=1.0, pan=0.0, wet=0.2):
        self.mus.add(sig, t, g, pan)
        if wet: self.mwet.add(sig, t, g * wet, pan)

    def fx(self, sig, t, g=1.0, pan=0.0, wet=0.0):
        self.sfx.add(sig, t, g, pan)
        if wet: self.fwet.add(sig, t, g * wet, pan)

    def music_span(self, t0, t1, fn):
        """process the music (and its reverb send) between t0 and t1 — a tape stop, a filter"""
        self.mus.span(t0, t1, fn); self.mwet.span(t0, t1, fn)

    def lead_in(self, t, d=0.7, g=0.3, gap=0.05):
        """a riser that stops just SHORT of the hit it leads to, so the hit's attack stays its own"""
        x = riser(d); f = int(0.03 * SR); x[-f:] *= np.linspace(1, 0, f); self.note(x, t - d - gap, g, 0, 0.3)

    def render(self, out, ring_from, tau=1.0, end=END):
        """pour, verb, glue, then the LIGHTEST limiter that gets the peak-to-loudness ratio under
        PLR — measured on a simulation of finish()'s own soft clip, peak and tail — so the house
        loudnorm stays in linear mode (−14 LUFS, −2 dBTP without its dynamic limiter pumping)"""
        if self.EQ.get('db') or self.EQ.get('hp'):
            for b in (self.mus, self.mwet): b.L = shelf(b.L, **self.EQ); b.R = shelf(b.R, **self.EQ)
        m = Mix(self.dur)
        self.mus.into(m); self.sfx.into(m)
        self.mwet.verb(m, **self.VERB); self.fwet.verb(m, **self.VERB)
        trim(m, 1.0); glue(m, **self.GLUE)
        L0, R0 = m.L.copy(), m.R.copy()
        tried = []
        for thr in (None, -2, -3, -4, -5, -6, -7, -8, -9, -10, -11, -12, -14):
            m.L, m.R = L0.copy(), R0.copy(); trim(m, 1.0)
            if thr is not None: glue(m, thresh=thr, **self.LIMIT)
            trim(m, self.PEAK)
            x = np.tanh(np.stack([m.L, m.R], 1) * 1.2) / 1.2; x /= np.abs(x).max() / 0.89; e = int(end * SR); x = x[:e]
            t0 = int(ring_from * SR); x[t0:] *= np.exp(-np.arange(e - t0) / SR / tau)[:, None]; fd = int(0.3 * SR); x[-fd:] *= np.linspace(1, 0, fd)[:, None]
            plr = true_peak(x) - bs1770(x); tried.append(f'{thr}:{plr:.1f}')
            if plr <= self.PLR: break
        print('  limiter threshold (dB below peak) : predicted PLR ->', '  '.join(tried))
        m.finish(out, end, ring_from, tau)


# ═══ DOODLE — Big Tech, papercut: the launch video, undercut ════════════════════════════════
class Doodle(Score):
    """140 BPM, D major souring to D minor. Fifteen beats a shot = three bars of 4/4 and a 3/4
    BREAK bar before every cut, where the hook lives (an edit-led ad cuts a bar short, and the
    hook in the break is the jingle's moment). FM e-piano, marimba, a saw pluck, a sub bass,
    claps on 2 and 4, hats, a supersaw stab; success chimes up a fifth, error bonks down a third."""
    BPM = 140
    VERB = dict(t60=1.3, lo=250, hi=9500, pre=0.022, g=0.32, seed=21)     # a bright plate
    GLUE = dict(thresh=-14.0, ratio=2.5)
    EQ = dict(fc=2500.0, db=4.0, hp=40.0)                                  # the gloss
    BRIGHT = [(50, (62, 66, 69, 76)), (45, (61, 64, 69, 73)), (47, (62, 66, 71, 74)), (43, (62, 67, 71, 74))]   # D(add9) A Bm G
    SOUR = [(50, (62, 65, 69, 74)), (45, (61, 64, 69, 73)), (46, (62, 65, 70, 74)), (43, (62, 67, 70, 74))]     # Dm A Bb Gm
    HOOK = [(0, 74), (0.5, 78), (1, 81), (1.5, 78), (2, 76), (2.5, 79)]       # D F# A F# E G … lands on F# at the cut
    LAND = 78

    @staticmethod
    def bar_of(b): return min(3, int(b // 4))

    def ep_chord(self, t, notes, d=0.6, vel=0.6, g=0.22, wet=0.3):
        for i, n in enumerate(notes): self.note(fm_ep(n, d, vel), t, g, -0.3 + 0.2 * i, wet)

    def arp(self, shot, b0, b1, chords, g=0.16, inst='ep', vel=0.45, wet=0.3):
        """the hold-music arpeggio: eighths up and down the chord, quiet — accompaniment, never a lead"""
        IDX = [0, 1, 2, 3, 2, 1, 2, 1]
        b = b0
        while b < b1 - 1e-9:
            _, ch = chords[self.bar_of(b)]; n = ch[IDX[int(round(b * 2)) % 8]]
            sig = fm_ep(n, 0.22, vel) if inst == 'ep' else marimba(n + 12, 0.2, vel)
            self.note(sig, self.at(shot, b), g, 0.35 * np.sin(b * 1.7), wet); b += 0.5

    def bass(self, shot, b0, b1, chords, every=0.5, g=0.26):
        b = b0
        while b < b1 - 1e-9:
            root = chords[self.bar_of(b)][0]
            self.note(sub_bass(root, min(every * self.B * 0.85, 0.5)), self.at(shot, b), g * (1 if b % 1 == 0 else 0.7), 0, 0); b += every

    def groove(self, shot, b0, b1, level, chords, g=1.0):
        """level 1: hats + kick on one; 2: + claps on 2 and 4, a second kick, an eighth bass;
        3: four on the floor, open hats on the off-beat, sixteenth shaker. The 3/4 break bar keeps
        only hats and claps (no kick), so the hook has the floor."""
        b = b0
        while b < b1 - 1e-9:
            t = self.at(shot, b); bar = self.bar_of(b); inbar = b - 4 * bar; brk = bar == 3
            if level >= 1 and b % 0.5 == 0: self.note(hat(vel=0.8 if b % 1 else 0.5), t, 0.6 * g, 0.25, 0.05)
            if not brk:
                if level >= 1 and inbar == 0: self.note(kick_tight(), t, 0.6 * g, 0, 0)
                if level >= 2 and inbar in (1, 3): self.note(clap(), t, 0.55 * g, 0, 0.35)
                if level == 2 and inbar == 2.5: self.note(kick_tight(0.8), t, 0.5 * g, 0, 0)
                if level >= 3 and inbar in (1, 2, 3): self.note(kick_tight(0.9), t, 0.5 * g, 0, 0)
                if level >= 3 and b % 1 == 0.5: self.note(hat(True, 0.6), t, 0.32 * g, -0.25, 0.1)
                if level >= 3 and b % 0.25 == 0: self.note(hat(vel=0.35), t, 0.22 * g, -0.4, 0)
            elif level >= 2 and inbar in (1, 2): self.note(clap(0.8), t, 0.45 * g, 0, 0.4)
            b += 0.25
        if level >= 2: self.bass(shot, b0, min(b1, 12), chords, 0.5)
        elif level >= 0: self.bass(shot, b0, min(b1, 12), chords, 4.0, 0.2)

    def stab(self, t, notes=(62, 66, 69, 74, 76), d=0.5, g=0.28, cut=4200):
        for i, n in enumerate(notes): self.note(supersaw(n, d, cut=cut, r=0.35, seed=i), t, g, -0.4 + 0.2 * i, 0.45)

    def hit(self, t, size=1.0, chord=(62, 66, 69, 74, 76), sparkle_=True):
        """the launch hit: a tight kick, a clap, a supersaw stab, a success chime"""
        self.note(kick_tight(), t, 0.75 * size, 0, 0); self.note(clap(), t, 0.65 * size, 0, 0.4)
        self.stab(t, chord, 0.35 + 0.5 * size, 0.22 * size)
        if sparkle_: self.note(sparkle(86), t + 0.02, 0.35 * size, 0.2, 0.5)

    def hook(self, shot, mood='bright', g=0.34):
        """the jingle in the break bar (beats 12–14½) landing on the next cut. 'sour' flattens the
        F# to F and sags the landing; 'brightest' doubles it an octave up on marimba."""
        HOOK = [(b, n - 1 if (mood in ('sour', 'sourest') and n in (78, 66)) else n) for b, n in self.HOOK]
        sag = {'sour': -0.25, 'sourest': -0.5}.get(mood, 0.0)
        land = (self.LAND - 1 if mood in ('sour', 'sourest') else self.LAND) + sag
        for i, (b, n) in enumerate(HOOK):
            t = self.at(shot, 12 + b); bend = sag * i / len(HOOK)
            self.note(pluck(n + bend, 0.18), t, g, 0.15, 0.35); self.note(fm_ep(n + bend, 0.2, 0.7), t, g * 0.45, -0.15, 0.3)
            if mood == 'brightest': self.note(marimba(n + 12, 0.2, 0.9), t, g * 0.5, 0.35, 0.35)
        if shot < 5:
            t = self.at(shot + 1, 0)
            self.note(pluck(land, 0.5), t, g, 0.15, 0.4); self.note(fm_ep(land, 0.7, 0.7), t, g * 0.5, -0.15, 0.4)
            if mood == 'brightest': self.note(marimba(land + 12, 0.4, 0.9), t, g * 0.5, 0.35, 0.4)


# ═══ COXON — US politics and AI risk, papercut: the institution, taking itself seriously ═══
class Coxon(Score):
    """84 BPM, C minor. Nine beats a shot = two bars of 4/4 and a PICKUP beat, which is where the
    snare rolls into the next cut — the drum roll before an announcement, on every shot. Low brass
    chorale (trombones, no vibrato), timpani, a parade snare, a concert bass drum, a fife a hair
    sharp for the wry part, a tower bell for the city."""
    BPM = 84
    VERB = dict(t60=1.9, lo=160, hi=5000, pre=0.035, g=0.3, seed=31)      # a stone chamber
    GLUE = dict(thresh=-22.0, ratio=1.6, rel=0.3)                          # dynamics are the point
    EQ = dict(fc=4000.0, db=-1.5, hp=30.0)                                 # a touch darker: wool and stone
    CH = {'Cm': (36, 48, 55, 60, 63), 'Ab': (44, 48, 56, 60, 63), 'Fm': (41, 48, 56, 60, 65), 'G': (43, 47, 55, 62, 67),
          'C': (36, 48, 55, 64, 67), 'Cm_lo': (24, 36, 43, 48, 51), 'Db': (37, 49, 56, 61, 65)}

    def chorale(self, t, chord, d=2.0, dyn=0.4, g=0.5, voices=None, wet=0.5):
        notes = self.CH[chord] if isinstance(chord, str) else chord
        for i, n in enumerate(notes[:voices] if voices else notes):
            self.note(trombone(n, d, dyn), t, g * (0.85 if i == 0 else 1.0), -0.45 + 0.9 * i / max(1, len(notes) - 1), wet)

    def roll_into(self, t, d=0.7, v0=0.1, v1=0.8, g=0.6, timp=None):
        """a snare (and optionally timpani) roll that ARRIVES at t — the beat before a cut"""
        self.note(snare_roll(d, v0, v1, seed=int(t * 10)), t - d, g * 1.35, 0.15, 0.25)
        if timp is not None: self.note(timp_roll(timp, d, v0, v1 * 0.8, seed=int(t * 10)), t - d, g * 0.9, -0.15, 0.3)

    def ruff(self, t, g=0.5, pan=0.1):
        for dt, v in ((-0.07, 0.35), (-0.035, 0.45), (0, 1.0)): self.note(field_snare(v), t + dt, g * 1.3, pan, 0.25)

    def march(self, shot, b0, b1, level=1, g=1.0):
        """the processional. level 1: a soft bass drum on 1 and 3, a rim tick on 2 and 4;
        2: the bass drum firmer and the snare on 2 and 4 with a ruff; 3: + an eighth-note
        cadence on the snare and timpani on the one"""
        b = b0
        while b < b1 - 1e-9:
            t = self.at(shot, b); inbar = b % 4
            if inbar in (0, 2): self.note(bass_drum(0.35 if level == 1 else 0.6), t, (0.38 if level == 1 else 0.5) * g, 0, 0.25)
            if level == 1 and inbar in (1, 3): self.note(rim(0.5), t, 0.6 * g, 0.2, 0.3)
            if level >= 2 and inbar in (1, 3): self.ruff(t, 0.4 * g)
            if level >= 3:
                if inbar % 1 == 0.5: self.note(field_snare(0.35), t, 0.45 * g, 0.1, 0.2)
                if inbar == 0: self.note(timpani(36, 1.5, 0.5), t, 0.4 * g, -0.1, 0.3)
            b += 0.5

    def fife_line(self, t0, notes, g=0.5, pan=0.25, wet=0.45):
        """notes = [(beat offset, midi, length in beats)]; a 0-length note is a grace flick"""
        for b, n, L in notes:
            self.note(fife(n, max(0.05, L * self.B * 0.92)), t0 + b * self.B, g, pan, wet)

    def hit(self, t, size=1.0, timp=36, crash_=True):
        """a civic hit: bass drum, timpani, a snare accent, a crash when it matters"""
        self.note(bass_drum(), t, 0.8 * size, 0, 0.3); self.note(timpani(timp, 2.2, 0.9), t, 0.6 * size, -0.15, 0.35)
        self.note(field_snare(1.0), t, 0.6 * size, 0.15, 0.3)
        if crash_: self.note(crash(2.5, 0.8), t, 0.5 * size, 0.3, 0.3)


# ═══ TOKO — everyday life, observed, claymation: the room, the hands ═══════════════════════
class Toko(Score):
    """168 BPM in 3/4, F major: a small kitchen waltz, felt one-in-a-bar. Eighteen beats a shot =
    six bars (a bar is two picture beats, so the old music-box-on-every-other-beat lands on every
    downbeat); the last shot is five bars. Felt piano, music box, kalimba, plucked upright bass,
    brushes, with room tone and a little vinyl under everything. Gadgets in this world (a toy, a
    camera) speak through a tiny speaker — they are the only thin, electronic sounds in the room.

    Reusable for any Toko film from an events list: Toko().events([(t, 'tram'), (t, 'tag'), ...])
    places the FOLEY by name at those seconds; waltz() lays the band under it."""
    BPM = 168
    VERB = dict(t60=0.65, lo=120, hi=4500, pre=0.008, g=0.3, seed=41)     # a small furnished room
    GLUE = dict(thresh=-22.0, ratio=1.5, rel=0.3)
    EQ = dict(fc=5000.0, db=-2.0, hp=35.0)                                 # warm: the top rolled off a little
    CH = {'F': (41, (57, 60, 65)), 'Bb': (46, (58, 62, 65)), 'C': (36, (55, 60, 64)), 'C7': (36, (58, 60, 64)),
          'Dm': (38, (57, 62, 65)), 'Gm': (43, (58, 62, 67)), 'Gm7': (43, (58, 62, 65)), 'Am': (45, (57, 60, 64)),
          'A7': (45, (55, 61, 64)), 'Fmaj7': (41, (57, 60, 64)), 'Bb/F': (41, (58, 62, 65)), 'Dm/C': (36, (57, 62, 65))}
    FOLEY = {
        'tram': lambda: tram(4.0), 'led': lambda: toy_blip(2093), 'ding': toy_ding, 'swivel': lambda: servo(0.5),
        'tag': tag_pop, 'flag': lambda: tag_pop(1100), 'pat': pat, 'paw': paw, 'knock': knock, 'sit': sit,
        'lamp': lamp_click, 'rustle': lambda: rustle(0.5) * 0.6, 'card': lambda: card() * 0.5,
    }

    def bar(self, shot, k, beat=0.0): return self.at(shot, 3 * k + beat)

    def waltz(self, shot, k0, chords, level=2, g=1.0, bass_alt=True, bass=None):
        """the band, one bar per chord from bar k0: bass on one (the fifth on alternate bars, or
        the line given in `bass`), felt chords on two and three (level 1: two only), brushes swept
        with taps on two and three (level 2)"""
        for i, name in enumerate(chords):
            if name is None: continue
            root, ch = self.CH[name]; k = k0 + i; t = self.bar(shot, k)
            bn = root + (7 if (bass_alt and k % 2 == 1 and level >= 2) else 0)
            if bn > 45: bn -= 12
            if bass is not None: bn = bass[i]
            self.note(upright(bn, 0.9 if level >= 2 else 1.5, 0.75), t, 0.45 * g, -0.1, 0.15)
            for bt, v in ((1, 0.42), (2, 0.34)) if level >= 2 else ((1, 0.36),):
                for j, n in enumerate(ch): self.note(felt_piano(n, self.B * 0.85, v), t + bt * self.B, 0.24 * g, -0.2 + 0.2 * j, 0.25)
            if level >= 2:
                self.note(brush_swish(3 * self.B * 0.95, 0.6), t, 0.3 * g, 0.3, 0.2)
                for bt in (1, 2): self.note(brush_tap(0.45), t + bt * self.B, 0.4 * g, 0.3, 0.2)

    def box(self, t, m, g=0.42, cents=0.0, pan=0.3):
        self.note(music_box(m, cents), t, g, pan, 0.35)

    def tune(self, shot, k0, notes, g=0.42):
        """music-box notes as (bar, beat, midi), counted from bar k0 of a shot"""
        for k, bt, n in notes: self.box(self.bar(shot, k0 + k, bt), n, g)

    def run_down(self, times, notes, g=0.42):
        """the spring giving out: each note later than the last and flatter"""
        for i, (t, n) in enumerate(zip(times, notes)): self.box(t, n, g * (1 - 0.1 * i), -12 * i - 3 * i * i)

    def hold(self, t, notes, d=2.5, vel=0.42, g=0.32, bass=None):
        """a held, pedalled felt chord (and the bass under it)"""
        for j, n in enumerate(notes): self.note(felt_piano(n, d, vel), t + 0.012 * j, g, -0.3 + 0.15 * j, 0.35)
        if bass is not None: self.note(upright(bass, d, 0.7), t, 0.55, -0.1, 0.15)

    def chatter(self, t, n=6, f0=680, g=0.3, pan=0.3):
        """a gadget's babble: syllables with a voice's shape and no words, out of a tiny speaker"""
        for i in range(n):
            self.fx(toy_voice(f0 * (1 + 0.25 * np.sin(i * 1.7)), ['i', 'a', 'e', 'o'][i % 4], 0.11), t + i * 0.13, g, pan, 0.15)

    def beds(self, rain_=1.0, room_=1.0, vinyl_=1.0):
        """the room under everything: room tone, a record's surface, rain on the window (each optional)"""
        if room_: self.sfx.bed(room(self.dur, room_), 600)
        if vinyl_: self.sfx.bed(vinyl(self.dur, 4.0, vinyl_), 300)
        if rain_: self.sfx.bed(rain(self.dur, 9, rain_), 700)

    def events(self, evs, g=1.0):
        """place FOLEY by name at picture seconds: [(t, 'tram'), (t, 'lamp', 0.8), …] (optional gain, pan)"""
        for e in evs:
            t, kind = e[0], e[1]; gg = e[2] if len(e) > 2 else 1.0; pan = e[3] if len(e) > 3 else 0.0
            self.fx(self.FOLEY[kind](), t, gg * g, pan, 0.15)
