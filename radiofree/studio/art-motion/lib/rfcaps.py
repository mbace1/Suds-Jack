"""House captions (style H) for any papercut film: build(SHOTS, CUT, path).

SHOTS = [(shot, line1_start, line2_start, y_centre, "line one [key]", "line two")]
— times are seconds after the shot's cut. Owner's rules: outline, central, one word
per shot lights ochre once its line has been read; line one fades in ~0.8 s after the
cut and never moves when line two joins; both are gone 0.35 s before the dissolve;
no line wider than 800 px (140 px side margins are what libass wraps a \\pos line at).
"""
import re
HEAD = """[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: H,Poppins ExtraBold,82,&H00FFFFFF,&H00FFFFFF,&H00000000,&H64000000,0,0,0,0,100,100,0,0,1,7,3,5,140,140,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
POP = "&H3AB8F2&"


def marked(line, pop):
    def sub(m):
        if pop: return r"{\t(500,650,\c" + POP + r"\fscx120\fscy120)\t(650,850,\fscx100\fscy100)}" + m.group(1) + r"{\c&HFFFFFF&}"
        return "{\\c" + POP + "}" + m.group(1) + "{\\c&HFFFFFF&}"
    return re.sub(r"\[([^\]]+)\]", sub, line)


def t(x): h = int(x // 3600); m = int(x % 3600 // 60); s = x % 60; return f"{h}:{m:02d}:{s:05.2f}"


def build(SHOTS, CUT, path):
    ev = []; last = len(CUT) - 2
    for i, a, b, y, l1, l2 in SHOTS:
        s0, s1 = CUT[i], CUT[i + 1] - (0.35 if i < last else 0.3)
        top = rf"{{\an8\pos(540,{y - 150})}}"
        ev.append((s0 + a, s0 + b, top + r"{\fad(280,0)}" + marked(l1, True)))
        if l2: ev.append((s0 + b, s1, rf"{{\an8\pos(540,{y - 150})\fad(0,260)}}" + marked(l1, False) + r"\N{\alpha&HFF&\t(0,280,\alpha&H00&)}" + marked(l2, True)))
        else: ev[-1] = (s0 + a, s1, ev[-1][2].replace(r"{\fad(280,0)}", r"{\fad(280,260)}"))
    open(path, 'w').write(HEAD + "".join(f"Dialogue: 0,{t(a)},{t(b)},H,,0,0,0,,{x}\n" for a, b, x in ev))
    print('captions ->', path)
