"""The text pipeline's back half: sidecar subtitles and the text checks, from the copy file and a master's report.

    python3 pipeline/text/text.py <copy.json> <report.json> <outdir> [--air]

report.json is what pipeline/render.mjs wrote for one master (one burned-in language): every caption's measured
widths, box and window. This writes, for that master:
  - <film>.<lang>.srt and .vtt for EVERY language in the copy, on this master's timeline;
  - text-checks.json: each check, pass / warn / FAIL, and why.
Exit status 1 if anything FAILs. --air is the broadcast build: an unread language (native_read false) FAILs
instead of warning, because no line goes to air without a native read.
"""
import json, sys, re
from pathlib import Path

RATE = {'en': 20, 'fi': 17, 'ja': 6}           # must match pipeline/text/captions.js
WIDTH = 800
SIDE = {'en': 42, 'fi': 42, 'ja': 16}          # sidecar line length: the usual 42 Latin characters; 16 for Japanese
TAIL = 0.8


def plain(text, lang):
    s = re.sub(r'\s*/\s*', ' ', text.replace('[', '').replace(']', '')).strip()
    return re.sub(r'\s+', '', s) if lang == 'ja' else s


def read_time(text, lang): return 1 + len(plain(text, lang)) / RATE[lang]


def side_lines(text, lang):
    """a subtitle is at most two lines: reflow the caption's words (Japanese: its marked segments) to fit"""
    units = text.replace('[', '').replace(']', '').replace('/', ' ').split()
    joiner = '' if lang == 'ja' else ' '
    lines, cur = [], ''
    for u in units:
        nxt = (cur + joiner + u) if cur else u
        if len(nxt) > SIDE[lang] and cur: lines.append(cur); cur = u
        else: cur = nxt
    if cur: lines.append(cur)
    if len(lines) > 2:                         # still three: balance two lines by length instead
        s = joiner.join(units); best = None
        for i in range(1, len(units)):
            a, b = joiner.join(units[:i]), joiner.join(units[i:]); d = abs(len(a) - len(b))
            if best is None or d < best[0]: best = (d, [a, b])
        lines = best[1]
    return lines


def ts(t, sep):
    h, m, s = int(t // 3600), int(t % 3600 // 60), t % 60
    return f"{h:02d}:{m:02d}:{int(s):02d}{sep}{int(round((s - int(s)) * 1000)) % 1000:03d}"


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]; air = '--air' in sys.argv
    copy, rep, out = json.load(open(args[0])), json.load(open(args[1])), Path(args[2]); out.mkdir(parents=True, exist_ok=True)
    film, master = copy['film'], rep['lang']; win = {c['id']: (c['t0'], c['t1']) for c in rep['captions']}
    checks = []
    def check(name, ok, why, warn=False): checks.append({'check': name, 'result': 'pass' if ok else ('warn' if warn else 'FAIL'), 'why': why})

    # the copy is complete: every line in every language (a fallback to English is a warning, never silent)
    for c in copy['captions']:
        for L in copy['langs']: check(f'copy {c["id"]}.{L}', bool(c['text'].get(L)), 'present' if c['text'].get(L) else 'missing')
        check(f'copy {c["id"]} source', bool(c.get('source')), c.get('source', 'no source note')[:80])
        pops = [L for L in copy['langs'] if '[' not in c['text'].get(L, '')]
        check(f'copy {c["id"]} pop word', not pops, 'every language marks one' if not pops else f'no [pop] in {pops}', warn=True)
    for k, v in copy.get('ui', {}).items():
        miss = [L for L in copy['langs'] if L not in v]
        check(f'copy ui.{k}', not miss, 'all languages' if not miss else f'falls back to English in {miss}', warn=True)

    # the message (owner, 18 Oct, on two films: "messaging too unclear"): ONE argument, the question asked by the first
    # caption and answered by the last, at most three facts between — and a fact that does not answer it is cut
    arg = copy.get('argument', ''); nw = len(arg.split()); roles = [c.get('role') for c in copy['captions']]
    check('message: argument', bool(arg), f'{nw} words: {arg[:90]}' if arg else 'no "argument" in copy.json: write the film as one sentence before any caption')
    if arg: check('message: one sentence', nw <= 35, f'{nw} words (at most 35)', warn=True)
    check('message: roles', all(r in ('setup', 'evidence', 'punchline') for r in roles), ' → '.join(map(str, roles)))
    check('message: asked first', roles[:1] == ['setup'] and roles.count('setup') == 1, 'the first caption is the one setup' if roles[:1] == ['setup'] else f'the first caption is {roles[:1]}')
    check('message: answered last', roles[-1:] == ['punchline'] and roles.count('punchline') == 1, 'the last caption is the one punchline' if roles[-1:] == ['punchline'] else f'the last caption is {roles[-1:]}')
    ev = roles.count('evidence'); check('message: three facts at most', ev <= 3, f'{ev} evidence captions (at most 3)')
    if rep['captions']: t0 = min(c['t0'] for c in rep['captions']); check(f'message: question early {master}', t0 <= 1.5, f'the first caption is up at {t0:.2f} s (by 1.5 s)', warn=True)

    # the burned-in captions, as measured with the real fonts
    for c in rep['captions']:
        cid = f'{master}:{c["id"]}'
        check(f'width {cid}', max(c['widths']) <= WIDTH, f'widest line {max(c["widths"])} px (limit {WIDTH})')
        check(f'safe zone {cid}', c['inSafe'] and not c['inRail'], f'box {c["box"]}' + (' in the right rail' if c['inRail'] else ''))
        check(f'reading time {cid}', c['shown'] + 1e-6 >= c['read'], f'on screen {c["shown"]:.2f} s, needs {c["read"]:.2f} s ({len(c["plain"])} chars at {RATE[master]}/s + 1 s)')
        check(f'last word {cid}', c['t1'] - c['lastWord'] + 1e-6 >= TAIL, f'last word up {c["t1"] - c["lastWord"]:.2f} s (at least {TAIL})')
        check(f'key detail {cid}', not c['covers'], 'covers nothing the shot needs' if not c['covers'] else f'covers {c["covers"]}')
        if c.get('busy'): check(f'scrim {cid}', True, f'picture behind: edge {c["busy"]["edge"]} → scrim {round(c["busy"]["busy"] * 0.72, 2)}')
    for k, u in rep.get('ui', {}).items(): check(f'ui {master}:{k}', u['ok'], f'"{u["text"]}" spans x {u["x0"]}–{u["x1"]}')
    for h in rep.get('holds', []): check(f'hold {master}:{h["caption"]}', True, f'the picture holds {h["extra"]} s before {h["beat"]} so the line can be read')

    # native reads
    for L in copy['langs']:
        nr = copy.get('native_read', {}).get(L, False)
        check(f'native read {L}', nr, 'read by a native speaker' if nr else 'NOT yet read by a native speaker', warn=not air)

    # sidecars: every language on this master's timeline
    for L in copy['langs']:
        srt, vtt = [], ['WEBVTT', '']
        for i, c in enumerate(copy['captions'], 1):
            t0, t1 = win[c['id']]; lines = side_lines(c['text'][L], L)
            srt += [str(i), f'{ts(t0, ",")} --> {ts(t1, ",")}', *lines, '']
            vtt += [f'{ts(t0, ".")} --> {ts(t1, ".")}', *lines, '']
            if L != master:
                need = read_time(c['text'][L], L)
                check(f'sidecar {L}:{c["id"]}', t1 - t0 + 1e-6 >= need, f'{t1 - t0:.2f} s on this master, {L} needs {need:.2f} s', warn=True)
            check(f'sidecar lines {L}:{c["id"]}', len(lines) <= 2 and all(len(x) <= SIDE[L] for x in lines), ' | '.join(lines), warn=True)
        (out / f'{film}.{master}-master.{L}.srt').write_text('\n'.join(srt), encoding='utf-8')
        (out / f'{film}.{master}-master.{L}.vtt').write_text('\n'.join(vtt), encoding='utf-8')

    (out / 'text-checks.json').write_text(json.dumps(checks, ensure_ascii=False, indent=1), encoding='utf-8')
    bad = [c for c in checks if c['result'] == 'FAIL']; warn = [c for c in checks if c['result'] == 'warn']
    for c in bad + warn: print(f"  {c['result']:4}  {c['check']}: {c['why']}")
    print(f'text: {len(checks) - len(bad) - len(warn)} pass, {len(warn)} warn, {len(bad)} FAIL  ({master} master)')
    sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main()
