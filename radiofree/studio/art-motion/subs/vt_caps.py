"""v4 (owner, 15 Oct 2026: "still unclear — testing on whose behalf? what exactly, military AI?"): say WHO
tests (Britain's government), WHAT (new AI like ChatGPT), WHY (cyberattack and bioweapon risks), and
name the two companies the White House asked (OpenAI and Anthropic, Politico 24.9; treated alike).
One idea per half so every caption fits its reading budget.
v3 (owner, 15 Oct 2026: "define agree — with what?"): say what the companies choose — to show
new AI to Britain first — and that no law makes them; "agree" is gone.
v2 (owner, 15 Oct 2026: "confusing … work on the message directness"): one plain sentence per
shot — the testing happens only if the companies agree; the White House asked two of them to stop;
it lasted 17 days; it is back, still only if they agree; the punch: optional.
House captions for "On the Same Voluntary Terms" (film 2, style H, lib/rfcaps.py, every break by hand).
The words are the pre-production review's fixes, exactly: single captions for shots 1 and 3, the hold "lasted"
17 days (not "the testers waited"), and NO quote marks around "same voluntary terms" (a paraphrase is never quoted)."""
import sys
from pathlib import Path
for _d in (Path(__file__).resolve().parent, Path(__file__).resolve().parents[1]): sys.path.insert(0, str(_d / 'lib'))
from rfcaps import build
B = 60 / 112; SHOT = 12
CUT = [k * SHOT * B for k in range(6)] + [5 * SHOT * B + 10 * B]
SHOTS = [
 (0, 0.80, 0.80, 380, "Britain's government tests\\Nnew AI, like ChatGPT,\\N[before] it is released.", ""),
 (1, 0.80, 3.00, 380, "It checks for cyberattack\\Nand bioweapon risks.", "[No law] makes AI companies\\Nshare it."),
 (2, 0.80, 0.80, 380, "Then the White House asked\\NOpenAI and Anthropic to\\N[stop sharing] new AI\\Nwith Britain's testers.", ""),
 (3, 0.80, 3.00, 380, "The hold lasted\\N[17 days].", "No official reason\\Nwas given."),
 (4, 0.80, 0.80, 400, "Now testing is back.\\NIt's still up to\\Nthe [companies].", ""),
 (5, 0.80, 2.60, 400, "AI safety testing\\Nin Britain:", "[optional]."),
]
build(SHOTS, CUT, str(Path(__file__).with_name('vt_H.ass')), manual=True)
