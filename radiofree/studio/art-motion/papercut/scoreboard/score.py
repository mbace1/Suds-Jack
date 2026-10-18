"""The Scoreboard (Nordic 2) — the cue sheet. The RFH series bed (stems.py: 112 BPM, A minor) and the library's
sounds against the plan's events (pipeline/plan.mjs), so the Finnish and Japanese masters — longer where their lines
need it — are scored by this same file. The board is the instrument: every score change is a flip-card clack, a
court's verdict lands on a rubber stamp (a dull chip for COURTS, a bright one for SATIRE), and the DENMARK card's
spin runs on into the sting, because the film ends before anyone has ruled.

    uv run --with numpy --with soundfile python papercut/scoreboard/score.py <events.json> <out.wav> [<report.json> <stems>]
"""
import sys, json
from pathlib import Path
sys.path[:0] = [str(Path(__file__).resolve().parents[2] / 'pipeline' / 'sound'), str(Path(__file__).resolve().parents[2] / 'lib')]
from mix import Session
from stems import RFH, bed, accent, sting, motif
from sfx import whoosh, swish, pop, chip, tick, tap, slap, foley, stinger, WHOOSH
from rfsound import stamp, gavel, card_flip, blip, thump

EV = json.load(open(sys.argv[1])); OUT = sys.argv[2]
REP = sys.argv[3] if len(sys.argv) > 3 else None; STEMS = sys.argv[4] if len(sys.argv) > 4 else None
END = EV['end']; s = Session(END + 0.5, RFH)
Q = EV['cues']; c = lambda k: Q[k]
S = [EV[f's{i}'] for i in range(1, 6)]
quiet = [(q['t0'], q['t1']) for q in EV.get('quiet', [])]

# ── the music: the groove from the first stamp to the sting, lighter under the question, full from the bench
bed(s, c('sb_bill.stamp'), S[1], quiet, level=1)
bed(s, S[1], END - 0.6, quiet)
for cp in EV['captions']:
    last = max(w['t'] for w in EV['words'] if w['caption'] == cp['id'])
    s.duck(cp['t0'], last + 0.4, -3.5, why=f'caption {cp["id"]} reveal')
for i, t in enumerate(S[1:]): s.fx(whoosh('short', 'in'), t - WHOOSH['short'] * 0.8, 0.35, 0, at=t, name=f'cut {i + 2}')

# ── shot 1 · the bill: the phone rises and talks; the AI stamp and the BANNED band; the mask swings in, and its "?"
s.fx(foley('paper', 'tap', 0.7), S[0], 0.45, 0, name='the open: the room, a sheet settling'); motif(s, S[0] + 0.05, g=0.3)
s.fx(whoosh('mid', 'in'), c('sb_bill.phone'), 0.5, -0.3, name='the phone rises')
for i in range(4): s.fx(blip(1320 + 120 * (i % 2)), c('sb_bill.phone') + 0.5 + i * 0.22, 0.25, -0.3, name='its voice')
s.fx(stamp(), c('sb_bill.stamp'), 0.8, -0.3, name='AI'); s.fx(foley('paper', 'slide'), c('sb_bill.stamp') + 0.25, 0.55, -0.2, name='the BANNED band')
s.fx(swish(), c('sb_bill.mask') - 0.9, 0.4, 0.5, name='the mask swings in')
s.fx(pop(1.3), c('sb_bill.mask'), 0.5, 0.5, name='"satire": the question mark'); accent(s, c('sb_bill.mask'), S[0], 0.25, name='the question')

# ── shot 2 · the bench: the board's bulbs come on one by one; on "courts" the gavel
for i in range(8): s.fx(tick(i % 4, down=False), c('sb_bench.lights') + i * 0.15, 0.22, -0.6 + i * 0.17, name=f'bulbs {i + 1}')
s.fx(gavel(), c('sb_bench.gavel'), 0.9, 0.3, name='"courts": the gavel'); s.fx(thump(), c('sb_bench.gavel'), 0.35, 0.3)

# ── shot 3 · courts have ruled before: the pear strip pinned up; GUILTY and COURTS 1; the ad; PROTECTED and SATIRE 1
s.fx(swish(), c('sb_before.pear'), 0.35, -0.4, name='the pear strip rises'); s.fx(foley('paper', 'drop'), c('sb_before.pear') + 0.3, 0.55, -0.4, name='pinned up')
s.fx(stamp(), c('sb_before.guilty'), 0.75, -0.4, name='GUILTY'); s.fx(chip(False), c('sb_before.guilty') + 0.02, 0.35, -0.4)
s.fx(card_flip(), c('sb_before.guilty') + 0.05, 0.7, -0.3, name='COURTS 1')
s.fx(foley('paper', 'slide'), c('sb_before.ad'), 0.5, 0.4, name='the ad poster')
s.fx(stamp(), c('sb_before.protected'), 0.75, 0.4, name='PROTECTED'); s.fx(chip(True), c('sb_before.protected') + 0.02, 0.4, 0.4)
s.fx(card_flip(), c('sb_before.protected') + 0.05, 0.7, 0.3, name='SATIRE 1'); accent(s, c('sb_before.protected'), S[0], 0.22, name='protected')

# ── shot 4 · AI fakes: the phone talks; NO and COURTS 2; the speaker's voice; YES and SATIRE 2
s.fx(whoosh('mid', 'in'), c('sb_fakes.phone'), 0.45, -0.4, name='the phone rises')
for i in range(3): s.fx(blip(1250 + 110 * (i % 2)), c('sb_fakes.phone') + 0.5 + i * 0.2, 0.22, -0.4, name='the fake voice')
s.fx(stamp(), c('sb_fakes.no'), 0.75, -0.4, name='NO'); s.fx(chip(False), c('sb_fakes.no') + 0.02, 0.35, -0.4)
s.fx(card_flip(), c('sb_fakes.no') + 0.05, 0.7, -0.3, name='COURTS 2')
s.fx(swish(), c('sb_fakes.no') + 0.3, 0.3, 0.4, name='the speaker rises')
s.fx(stamp(), c('sb_fakes.yes'), 0.75, 0.4, name='YES'); s.fx(chip(True), c('sb_fakes.yes') + 0.02, 0.4, 0.4)
s.fx(card_flip(), c('sb_fakes.yes') + 0.05, 0.7, 0.3, name='SATIRE 2'); accent(s, c('sb_fakes.yes'), S[0], 0.22, name='yes')

# ── shot 5 · the decider: the DENMARK row slides in; the gavel lifts; on "decider" the card spins and does not stop
s.fx(foley('wood', 'slide'), c('sb_decider.row'), 0.55, 0, name='the DENMARK row slides in'); s.fx(foley('card', 'drop'), c('sb_decider.row') + 0.45, 0.45)
s.fx(foley('wood', 'tap', 0.5), c('sb_decider.row') + 0.4, 0.3, 0.4, name='the gavel lifts')
s.fx(card_flip(), c('sb_decider.decider'), 0.75, 0.2, name='"decider": the card starts to spin')
k = 1
while c('sb_decider.decider') + k / 9 < END - 0.7:                                     # the spin: a clack a turn, fading under the answer
    t = c('sb_decider.decider') + k / 9; s.fx(tick(k % 4, down=False), t, 0.28 * max(0.25, 1 - k / 30), 0.2, name='spin'); k += 1
accent(s, c('sb_decider.decider'), S[0], 0.28, name='the decider')
motif(s, S[4] + 0.2, g=0.4)
sting(s, END - 0.6)

cues = [(k, v) for k, v in Q.items()] + [(f's{i + 1}', t) for i, t in enumerate(S)]
exempt = {}
s.render(OUT, ring_from=END - 0.45, tau=0.35, end=END, cues=cues, exempt=exempt, quiet=quiet, stems_dir=STEMS, report=REP)
