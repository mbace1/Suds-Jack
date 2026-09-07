// Every Japanese string in the counter, beside the English it came from.
//
//   node scripts/ja-review.mjs [out.html]
//
// The Japanese pack is a DRAFT — written to match Toko's register rather than
// translated line by line, and written by someone who does not speak Japanese
// as a first language. That is fine as a starting point and not fine as a
// shipping state, so this exists to make a native read cheap: one page, every
// pair, grouped the way the counter is built, with the questions a reviewer
// actually needs to answer stated at the top.
//
// It reads the live modules rather than a copy, so a line changed in
// dialogue.ja.js is changed here the next time this runs. Regenerate it
// whenever the pack moves.

import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TOKO = path.join(HERE, '..', 'toko', 'js');
const d = await import(pathToFileURL(path.join(TOKO, 'dialogue.js')).href);

const OUT = process.argv[2] || path.join(HERE, '..', 'toko', 'ja-review.html');

// ── pull the pairs ────────────────────────────────────────────────────────
// Everything is read twice, once per language, through the same accessors the
// counter uses — so what is on this page is what a player is shown, not what
// the source file happens to contain.
const pairs = [];
const add = (group, note, en, ja) => {
  const flat = v => (Array.isArray(v) ? v.join('\n') : String(v ?? ''));
  pairs.push({ group, note, en: flat(en), ja: flat(ja) });
};

function bothWays(fn) {
  d.setLang('en'); const en = fn();
  d.setLang('ja'); const ja = fn();
  d.setLang('en');
  return [en, ja];
}

// the greetings and the asides
for (const key of ['GREETING', 'LATE', 'BACK_FROM', 'RETURNING', 'NOTED', 'REMEMBERED',
  'ASIDES', 'MISSES', 'CRY_A', 'SEEN_NOTHING', 'SEEN_SOMETHING',
  'CHANGED_NONE', 'CHANGED_YOURS', 'ABOUT_UNKNOWN', 'FAVE_UNKNOWN']) {
  const [en, ja] = bothWays(() => d.L(key));
  if (en === undefined) continue;
  const rows = Array.isArray(en[0]) ? en.map((_, i) => [en[i], ja[i]]) : [[en, ja]];
  rows.forEach(([e, j], i) => add('greetings', rows.length > 1 ? `${key} ${i + 1}` : key, e, j));
}

// every topic: his question in your mouth, and his answer
for (const t of d.TOPICS) {
  const [en, ja] = bothWays(() => d.say(t));
  add('topics', `${t.id} — you say`, en.q, ja.q);
  add('topics', `${t.id} — he says`, en.a, ja.a);
  if (t.asks) {
    for (let i = 0; i < t.asks.length; i++) {
      const [e, j] = bothWays(() => d.sayOption(t, i));
      add('topics', `${t.id} — your answer ${i + 1}`, e.q, j.q);
      if (e.a) add('topics', `${t.id} — his reply ${i + 1}`, e.a, j.a);
    }
  }
}

// the chrome: buttons, placeholders, the four delivery answers
const UI_KEYS = ['CUE', 'CUE_FROM', 'TALK', 'HINT', 'LEAVE', 'SEND', 'PARSE_PH', 'NOTE_PH',
  'NOTE_PH_ABOUT', 'NOTE_LABEL', 'NOTE_LABEL_ABOUT', 'TELL', 'STICKER', 'NOTHING_SAID',
  'EMPTY_BOX', 'MORE', 'NO_FLOOR', 'SND_ON', 'SND_OFF', 'SND_LABEL_ON', 'SND_LABEL_OFF',
  'TALK_TO', 'SAY_TO', 'SENT', 'SENT_BLIND', 'QUEUED', 'OFF'];
for (const k of UI_KEYS) {
  const [en, ja] = bothWays(() => d.u(k));
  add('chrome', k, en, ja);
}

// what he says about each cabinet, and about somebody else's games
const [gEn, gJa] = bothWays(() => d.L('GAME_NOTES'));
for (const id of Object.keys(gEn)) add('games', id, gEn[id], gJa[id]);

const [fEn, fJa] = bothWays(() => d.L('FAVOURITES'));
fEn.forEach((f, i) => add('favourites', `${f.name} (${f.when})`, f.a, (fJa[i] || {}).a));

const [cEn, cJa] = bothWays(() => d.L('CHANGED'));
cEn.forEach((c, i) => add('changed', `${c.when} · ${c.game}`, c.what, (cJa[i] || {}).what));

// ── the page ──────────────────────────────────────────────────────────────
const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const GROUPS = [
  ['greetings', 'Greetings and asides', 'The first thing anyone reads, and the lines he says into a silence.'],
  ['topics', 'The conversation', 'Each topic is TWO voices: the question is in the PLAYER\'s mouth, the answer is Toko\'s. They should not sound alike.'],
  ['chrome', 'Buttons and labels', 'Not Toko talking — the furniture. Short, plain, and consistent with the rest of the site.'],
  ['games', 'What he says about each cabinet', ''],
  ['favourites', 'Games he did not make', 'Titles are proper nouns and should stay as the Japanese release used them.'],
  ['changed', 'The what-got-fixed log', ''],
];

const rows = g => pairs.filter(p => p.group === g).map(p => `
      <tr>
        <th scope="row">${esc(p.note)}</th>
        <td class="en" lang="en">${esc(p.en).replace(/\n/g, '<br>')}</td>
        <td class="ja" lang="ja">${esc(p.ja).replace(/\n/g, '<br>')}</td>
      </tr>`).join('');

const html = `<title>Toko Midori — the Japanese, for review</title>
<style>
  /* Black and magenta is the brand's whole palette (see toko/BRAND.md), so
     this page borrows it rather than inventing a look: magenta marks what a
     reviewer must act on and nothing else. Light ground by default because
     this is a document people mark up, often on a phone in daylight. */
  :root {
    --bg: #fbfbfc; --panel: #f2f2f5; --ink: #17171d; --dim: #62626f;
    --line: #dedee4; --hot: #c2005f; --rule: #17171d;
  }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) {
      --bg: #0c0c10; --panel: #16161c; --ink: #e9e9ef; --dim: #9696a3;
      --line: #2b2b34; --hot: #ff5aa8; --rule: #e9e9ef;
    }
  }
  :root[data-theme="dark"] {
    --bg: #0c0c10; --panel: #16161c; --ink: #e9e9ef; --dim: #9696a3;
    --line: #2b2b34; --hot: #ff5aa8; --rule: #e9e9ef;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; background: var(--bg); color: var(--ink);
    font: 16px/1.65 ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
    -webkit-text-size-adjust: 100%;
  }
  /* Japanese needs its own stack or it lands in whatever the OS has spare and
     the two columns stop looking like the same document. */
  .ja, [lang="ja"] {
    font-family: "Hiragino Kaku Gothic ProN", "Hiragino Sans", "Yu Gothic",
      "Noto Sans JP", "Meiryo", ui-sans-serif, system-ui, sans-serif;
    line-height: 1.85;
  }
  code, th[scope="row"] {
    font-family: ui-monospace, SFMono-Regular, "Courier New", monospace;
  }
  .wrap { max-width: 1060px; margin: 0 auto; padding: 48px 22px 96px; display: grid; gap: 0; }
  header { border-bottom: 3px solid var(--rule); padding-bottom: 18px; margin-bottom: 26px; }
  h1 { font-size: clamp(24px, 4.2vw, 34px); line-height: 1.2; margin: 0 0 8px; letter-spacing: -.01em; text-wrap: balance; }
  .sub { color: var(--dim); margin: 0; max-width: 62ch; }
  .sub b { color: var(--ink); font-weight: 600; }

  .ask { background: var(--panel); padding: 22px 24px; margin: 0 0 8px; border-left: 4px solid var(--hot); }
  .ask h2 { margin: 0 0 12px; font-size: 12px; letter-spacing: .16em; text-transform: uppercase; color: var(--hot); border: 0; padding: 0; }
  .ask ol { margin: 0; padding-left: 22px; display: grid; gap: 10px; }
  .ask li { max-width: 68ch; }
  .ask b { font-weight: 650; }

  h2 { font-size: 18px; margin: 46px 0 2px; padding-top: 20px; border-top: 2px solid var(--line); display: flex; align-items: baseline; gap: 10px; }
  h2 .n { color: var(--dim); font-weight: 400; font-size: 13px; font-variant-numeric: tabular-nums; }
  .why { color: var(--dim); margin: 0 0 16px; font-size: 14px; max-width: 68ch; }

  .scroll { overflow-x: auto; }
  table { border-collapse: collapse; width: 100%; font-size: 14.5px; }
  thead th { text-align: left; font-size: 11px; letter-spacing: .14em; text-transform: uppercase; color: var(--dim); font-weight: 600; padding: 0 12px 8px; border-bottom: 1px solid var(--line); }
  tbody th, tbody td { text-align: left; vertical-align: top; padding: 13px 12px; border-bottom: 1px solid var(--line); }
  tbody th[scope="row"] { color: var(--dim); font-weight: 400; white-space: nowrap; font-size: 11.5px; width: 1%; padding-top: 15px; }
  td.en { color: var(--dim); width: 40%; }
  td.ja { width: 44%; }
  tbody tr:hover td, tbody tr:hover th { background: var(--panel); }

  @media (max-width: 680px) {
    thead { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
    tbody tr { display: grid; gap: 2px; padding: 14px 0; border-bottom: 1px solid var(--line); }
    tbody th, tbody td { display: block; width: auto; border: 0; padding: 0; }
    tbody th[scope="row"] { padding-bottom: 4px; }
    td.en { font-size: 13.5px; }
  }
</style>
<div class="wrap">
  <header>
    <h1>Toko Midori — the Japanese, for review</h1>
    <p class="sub">Every Japanese line in the counter beside the English it came from.
    <b>${pairs.length} pairs.</b> The Japanese is a draft: written to match Toko's register
    rather than translated line by line, and written by someone who does not speak it. That is
    a fine starting point and a bad shipping state.</p>
  </header>

  <section class="ask">
    <h2>What we need from you</h2>
    <ol>
      <li><b>The register.</b> Toko is blunt, unhurried and a little rude — clipped English,
      shouted in capitals. The draft uses plain form and <code>お前</code> throughout. Is that
      the right voice for a masked artist talking to a stranger, or does it land as hostile
      rather than direct? If it is wrong it is wrong everywhere, so say it once and all of it
      changes.</li>
      <li><b>Anything that reads as translated.</b> Not "is it correct" — is it something a
      person would actually say.</li>
      <li><b>The two voices.</b> In each topic the <i>question</i> is the player speaking and
      the <i>answer</i> is Toko. They should not sound like the same person.</li>
      <li><b>Titles and names.</b> Anything with a Japanese release should use the name people
      know it by.</li>
    </ol>
    <p class="why" style="margin-top:14px">The label on the left of each row is its address in
    the source — quoting it back (<code>mask — he says</code>) is enough for us to find the
    line.</p>
  </section>

  ${GROUPS.map(([g, title, why]) => {
    const n = pairs.filter(p => p.group === g).length;
    if (!n) return '';
    return `<h2>${esc(title)} <span class="n">${n} pairs</span></h2>
  ${why ? `<p class="why">${esc(why)}</p>` : ''}
  <div class="scroll"><table>
    <thead><tr><th scope="col">Where</th><th scope="col">English (source)</th><th scope="col">Japanese (draft)</th></tr></thead>
    <tbody>${rows(g)}
    </tbody>
  </table></div>`;
  }).join('\n')}
</div>
`;

writeFileSync(OUT, html);
console.log(`${path.relative(process.cwd(), OUT)}: ${pairs.length} pairs`);
