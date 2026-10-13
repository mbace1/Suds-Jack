"""TikTok-style caption tests for The Biodiversity Fund (owner: "imitate TikTok, central, stay
a bit longer ... without blocking important pic details").

Every shot gets its two narrator lines as one centred block that holds until the cut: the
first line lands early, the second joins it mid-shot. The block's height is placed per shot
in a band where nothing that matters is (listed in SAFE), which also keeps it out of
TikTok's own bottom and right-hand UI. Three test styles: A outline, B box, C word-pop — and H, the house style the owner chose
("outline with occasionally pops on important words"): A, with the one word per shot
that carries it, in [brackets], landing ochre-yellow and large, then settling.
"""
import sys
B = 60 / 112; SHOT = 12                         # v4: ten beats a shot (eras_bdf.js), the ending eight
CUT = [k * SHOT * B for k in range(6)] + [5 * SHOT * B + 10 * B]
# (shot, first-line start, second-line start, y centre of the block, line 1, line 2)
SHOTS = [
 (0, 0.80, 3.00, 1160, "In March, the council in Muhos [voted yes].", "Outside, it rained. One resident appealed."),
 (1, 0.90, 3.00, 420, "In September, Doodle promised €13 billion.", "Part of it for local [biodiversity]."),
 (2, 0.80, 3.00, 640, "Then the forest at Muhos came down.", "About [330 hectares], by the company's own count."),
 (3, 0.80, 3.00, 700, "The biodiversity was [stacked neatly].", "Above 200 hectares, the law asks for an assessment first."),
 (4, 0.80, 3.00, 880, "On 7 October, the regulator said [stop].", "Until the impact assessment is done."),
 (5, 0.70, 2.60, 615, "About a hundred came to Doodle's door.", "[Fifty thousand] signed an initiative to parliament."),
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
Style: H,Poppins ExtraBold,82,&H00FFFFFF,&H00FFFFFF,&H00000000,&H64000000,0,0,0,0,100,100,0,0,1,7,3,5,80,80,0,1
Style: C,Poppins ExtraBold,82,&H00FFFFFF,&H00FFFFFF,&H00000000,&H64000000,0,0,0,0,100,100,0,0,1,7,3,5,80,80,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
POP = "&H3AB8F2&"                                  # the film's ochre, pushed toward TikTok yellow
def marked(line, pop):
    """[word] -> coloured. pop=True: the word starts white with the rest of the line and only lights up
    (ochre, a little larger, then settling) after 0.5 s, once the line has been read — v4, owner:
    "some text pops in first. Hard to read". pop=False: already lit, still."""
    import re
    def sub(m):
        if pop: return r"{\t(500,650,\c" + POP + r"\fscx120\fscy120)\t(650,850,\fscx100\fscy100)}" + m.group(1) + r"{\c&HFFFFFF&}"
        return "{\\c" + POP + "}" + m.group(1) + "{\\c&HFFFFFF&}"
    return re.sub(r"\[([^\]]+)\]", sub, line)
plain = lambda line: line.replace("[", "").replace("]", "")
def build(style):
    ev = []
    for i, a, b, y, l1, l2 in SHOTS:
        s0, s1 = CUT[i], CUT[i + 1] - (0.35 if i < 5 else 0.3)   # v4: gone before the dissolve, never straddling two pictures
        if style == 'H':
            fade = r"{\fad(280,0)}"
            # anchored at the TOP of the block, so line one stays exactly where it was when line two joins
            ev.append((s0 + a, s0 + b, 'H', rf"{{\an8\pos(540,{y - 150})}}" + fade + marked(l1, True)))
            ev.append((s0 + b, s1, 'H', rf"{{\an8\pos(540,{y - 150})\fad(0,260)}}" + marked(l1, False) + r"\N{\alpha&HFF&\t(0,280,\alpha&H00&)}" + marked(l2, True)))
            continue
        l1, l2 = plain(l1), plain(l2)
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
for s in 'ABCH': open(f'tiktok_{s}.ass', 'w').write(build(s))
print('ok', CUT[-1])
