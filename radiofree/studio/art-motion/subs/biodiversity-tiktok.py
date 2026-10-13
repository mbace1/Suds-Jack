"""TikTok-style caption tests for The Biodiversity Fund (owner: "imitate TikTok, central, stay
a bit longer ... without blocking important pic details").

Every shot gets its two narrator lines as one centred block that holds until the cut: the
first line lands early, the second joins it mid-shot. The block's height is placed per shot
in a band where nothing that matters is (listed in SAFE), which also keeps it out of
TikTok's own bottom and right-hand UI. Three styles: A outline, B box, C word-pop.
"""
import sys
B = 60 / 112; CUT = [k * 6 * B for k in range(6)] + [30 * B + 4 * B]
# (shot, first-line start, second-line start, y centre of the block, line 1, line 2)
SHOTS = [
 (0, 0.15, 1.55, 1160, "In March, the council in Muhos voted yes.", "Outside, it rained. One resident appealed."),
 (1, 0.60, 1.70, 420, "In September, Doodle promised €13 billion.", "Part of it for local biodiversity."),
 (2, 0.15, 1.55, 640, "Then the forest at Muhos came down.", "About 330 hectares, by the company's own count."),
 (3, 0.15, 1.55, 700, "The biodiversity was stacked neatly.", "Above 200 hectares, the law asks for an assessment first."),
 (4, 0.15, 1.55, 880, "On 7 October, the regulator said stop.", "Until the impact assessment is done."),
 (5, 0.10, 0.95, 615, "About a hundred came to Doodle's door.", "Fifty thousand signed an initiative to parliament."),
]
SAFE = {0: "between the council window and the residents' heads", 1: "below the strings, after the cheque has passed",
        2: "the sky over the treetops, under the counter", 3: "the sky over the clearing, above the pile and its tag",
        4: "over the letter's filler lines, clear of its header and the stamp", 5: "between the initiative card and the Doodle sign"}
def t(x): h = int(x // 3600); m = int(x % 3600 // 60); s = x % 60; return f"{h}:{m:02d}:{s:05.2f}"
HEAD = """[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: A,Poppins ExtraBold,82,&H00FFFFFF,&H00FFFFFF,&H00000000,&H64000000,0,0,0,0,100,100,0,0,1,7,3,5,80,80,0,1
Style: B,Poppins ExtraBold,72,&H00000000,&H00000000,&H00FFFFFF,&H00FFFFFF,0,0,0,0,100,100,0,0,3,18,0,5,90,90,0,1
Style: C,Poppins ExtraBold,82,&H00FFFFFF,&H00FFFFFF,&H00000000,&H64000000,0,0,0,0,100,100,0,0,1,7,3,5,80,80,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
def build(style):
    ev = []
    for i, a, b, y, l1, l2 in SHOTS:
        s0, s1 = CUT[i], CUT[i + 1] - 0.08
        if style in 'AB':
            # line 1 alone, then lines 1+2 together, both holding to the cut; a small pop on entry
            pop = r"{\fscx112\fscy112\t(0,120,\fscx100\fscy100)}"
            ev.append((s0 + a, s0 + b, style, rf"{{\an5\pos(540,{y - 60})}}{pop}{l1}"))
            ev.append((s0 + b, s1, style, rf"{{\an5\pos(540,{y})}}{l1}\N{pop}{l2}"))
        else:
            # word by word: each new word lands yellow and a little large, then settles white
            words = (l1 + " / " + l2).split(" "); n = len(words); t0 = s0 + a; dt = max(0.12, (s0 + b + 0.9 - t0) / n)
            for k in range(n):
                shown = [w for w in words[:k + 1]]; last = shown[-1]
                body = " ".join(w if w != "/" else r"\N" for w in shown[:-1]).replace(r" \N ", r"\N")
                tail = "" if last == "/" else (" " if shown[:-1] else "") + r"{\c&H00D4FF&\fscx115\fscy115\t(0,140,\c&HFFFFFF&\fscx100\fscy100)}" + last
                end = s1 if k == n - 1 else t0 + (k + 1) * dt
                ev.append((t0 + k * dt, end, 'C', rf"{{\an5\pos(540,{y})}}" + body + tail))
    return HEAD + "".join(f"Dialogue: 0,{t(a)},{t(b)},{st},,0,0,0,,{txt}\n" for a, b, st, txt in ev)
for s in 'ABC': open(f'tiktok_{s}.ass', 'w').write(build(s))
print('ok', CUT[-1])
