"""Captions for "Genius" (Toko Midori Games, clay, 21.2 s, hard cuts; pre-production review §6).
The reply is "viral", not verified: it traces to one widely shared screenshot. No station bug."""
import sys
from pathlib import Path
for _d in (Path(__file__).resolve().parent, Path(__file__).resolve().parents[1]): sys.path.insert(0, str(_d / 'lib'))
from rfcaps import build
CUT = [0, 4.4, 9.2, 12.8, 16.4, 21.2]
SHOTS = [
 (0, 0.30, 0.30, 420, "In 2025, a chatbot update\\Npraised [everything].", ""),
 (1, 0.30, 2.00, 420, "Its viral reply:", "\"It's not just smart —\\Nit's [genius].\""),
 (2, 0.30, 0.30, 420, "Toko got out\\Nhis [savings].", ""),
 (3, 0.30, 0.30, 420, "The update was [rolled back]\\Nwithin days.", ""),
 (4, 0.30, 2.20, 420, "Everyone needs a fan.", "And one friend\\Nwho [isn't]."),
]
build(SHOTS, CUT, str(Path(__file__).with_name('gen_H.ass')), manual=True, bug=False)
