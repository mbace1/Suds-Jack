"""Series music as stems (PRODUCTION-STANDARD.md, "The sound pipeline" 3): a series has a fixed key, tempo and room,
and its music comes as three parts a score places against the picture's events — never re-written per film.

    RFH      Radio Free Helsinki: 112 BPM (the house picture grid), A minor, Am–F–C–G; a bright, short plate.
    bed()    the groove, written as three stems (drums, bass, keys) so a film can drop or duck any of them;
             it starts on a beat the score chooses and STOPS for any `quiet` span — the music answers the edit
    motif()  the station's call (G C G, the sign-off's three notes) on the series' plucked voice
    accent() one note from the chord under a moment (a pop word): the bed's colour, never a new tune
    sting()  the end: the call, landing on a stamp and a ringing chime

Doodle, Coxon and Toko (lib/rfseries.py) keep their own writing; they can be poured through the same Session.
"""
from sfx import RFH_CALL
from rfsound import kick_tight, hat, clap, sub_bass, pluck, marimba, chime, stamp


class RFH:
    BPM = 112
    KEY = 'A minor'
    VERB = dict(t60=1.1, lo=220, hi=9000, pre=0.018, g=0.26, seed=51)    # a bright, short plate
    GLUE = dict(thresh=-15.0, ratio=2.5)
    EQ = dict(fc=2800.0, db=2.0, hp=38.0)                                 # a little gloss on the music bus
    # (bass root, keys voicing) — voice-led: the top moves by step, the bass carries the change
    CHORDS = [(33, (57, 60, 64)), (29, (57, 60, 65)), (36, (55, 60, 64)), (31, (55, 59, 62))]   # Am  F  C  G
    B = 60 / 112


def chord_at(t, t0, S=RFH):
    """the chord under time t, for a bed started at t0 (one chord a bar)"""
    return S.CHORDS[int(max(0, t - t0) // (4 * S.B)) % len(S.CHORDS)]


def bed(s, t0, t1, quiet=(), level=2, S=RFH, g=1.0):
    """the groove from t0 to t1, beat by beat on the series grid. level 1: kick on 1 and 3, hats; level 2 (the
    default): kick on every beat, claps on 2 and 4, an eighth pluck on the off-beat. No beat starts inside `quiet`."""
    B = S.B; k = 0
    while True:
        tb = t0 + k * B
        if tb >= t1 - 1e-6: break
        beat = k % 4; k += 1
        if any(q0 <= tb < q1 for q0, q1 in quiet): continue
        root, keys = chord_at(tb, t0, S)
        if level >= 2 or beat in (0, 2): s.note(kick_tight(0.55), tb, 0.5 * g, 0, 0, stem='drums', name='kick')
        if tb + B / 2 < t1 and not any(q0 <= tb + B / 2 < q1 for q0, q1 in quiet):
            s.note(hat(vel=0.35), tb + B / 2, 0.35 * g, 0.3, 0.05, stem='drums', name='hat')
            if level >= 2:
                for i, n in enumerate(keys): s.note(pluck(n + 12, 0.22, 0.8), tb + B / 2 + i * 0.012, 0.15 * g, (i - 1) * 0.4, 0.25, stem='keys', name='pluck')
        if level >= 2 and beat in (1, 3): s.note(clap(0.3), tb, 0.22 * g, -0.2, 0.15, stem='drums', name='clap')
        s.note(sub_bass(root, B * 0.9), tb, 0.45 * g, 0, 0, stem='bass', name='bass')


def motif(s, t, step=None, g=0.5, S=RFH):
    """the station's call, G C G, on marimba: three notes `step` apart (an eighth by default)"""
    step = step or S.B / 2
    for i, n in enumerate(RFH_CALL): s.note(marimba(n, 0.5 if i == 2 else 0.25, 0.8), t + i * step, g, (i - 1) * 0.3, 0.3, stem='motif', name='motif')


def accent(s, t, t0, g=0.3, S=RFH, name='accent'):
    """one marimba note from the chord under t (its top note, an octave up): colour for a pop word"""
    _, keys = chord_at(t, t0, S); s.note(marimba(keys[-1] + 12, 0.35, 0.7), t, g, 0.2, 0.3, stem='motif', name=name)


def sting(s, t, S=RFH):
    """the end: the call a sixteenth apart, landing on a stamp with a chime ringing over it"""
    step = S.B / 4
    for i, n in enumerate(RFH_CALL): s.note(marimba(n, 0.3, 0.85), t - (3 - i) * step, 0.45, (i - 1) * 0.3, 0.3, stem='motif', name='sting')
    s.note(stamp(), t, 0.7, 0, 0.2, stem='drums', name='sting stamp'); s.note(chime(RFH_CALL[-1] + 2, 1.2), t, 0.3, 0, 0.4, stem='motif', name='sting chime')
