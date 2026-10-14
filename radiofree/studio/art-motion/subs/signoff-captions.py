"""The station's sign-off lettering, burned over the 3.0 s clay ident (Toko at the mic, ON AIR).
Owner, 2026-10-14: Radio Free Helsinki is run by Toko from Helsinki, so it can speak on local and
global agendas while keeping a free radio running here. The ident leaves its top band dark for this."""
from pathlib import Path
HEAD = """[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Big,Poppins ExtraBold,104,&H00FFFFFF,&H00FFFFFF,&H00000000,&H64000000,0,0,0,0,100,100,2,0,1,7,3,8,0,0,0,1
Style: Mid,Poppins ExtraBold,60,&H00FFFFFF,&H00FFFFFF,&H00000000,&H64000000,0,0,0,0,100,100,0,0,1,5,2,8,0,0,0,1
Style: Small,Poppins ExtraBold,40,&H003AB8F2,&H003AB8F2,&H00000000,&H64000000,0,0,0,0,100,100,3,0,1,4,2,8,0,0,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
ev = [
 ("0:00:00.45", "0:00:03.00", "Big", r"{\pos(540,250)\fad(200,250)\fscx112\fscy112\t(0,160,\fscx100\fscy100)}{\c&H7F02F0&}●{\c&HFFFFFF&} RADIO FREE\NHELSINKI"),
 ("0:00:01.05", "0:00:03.00", "Mid", r"{\pos(540,520)\fad(240,250)}Toko, from Helsinki"),
 ("0:00:01.45", "0:00:03.00", "Small", r"{\pos(540,610)\fad(240,250)}LOCAL · GLOBAL · FREE RADIO"),
]
Path(__file__).with_name('signoff.ass').write_text(HEAD + "".join(f"Dialogue: 0,{a},{b},{s},,0,0,0,,{t}\n" for a, b, s, t in ev))
print('signoff.ass')
