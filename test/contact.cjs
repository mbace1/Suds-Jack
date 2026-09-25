#!/usr/bin/env node
// Turn two runs of shoot.cjs into something a person can read in one look:
// a contact sheet, a triptych of everything that moved, and a summary that
// leads with WHAT CHANGED rather than with a pass mark.
//
//   node test/contact.cjs --base shots/base --head shots/head --out shots/out
//   node test/contact.cjs --head shots/head --out shots/out        (no compare)
//
// The sheet is laid out in HTML and photographed in the same Chromium the
// shots came from, rather than blitted with pngjs. Labels are the whole point
// of a contact sheet — twenty-four unlabelled thumbnails are a mood board —
// and CSS does typography that hand-poked pixels do not.
//
// ONLY `boot` SHOTS ARE DIFFED, and that restriction is the difference
// between a signal and a slot machine. Measured over two runs of an IDENTICAL
// tree: `play` shots moved on 15 of 24 cabinets and by as much as 65%, while
// `boot` moved on 7 and never by more than 3.5%. A single frame of a running
// game is not a comparable artifact — the games animate, and the harness
// cannot photograph the same instant twice. A tool that cries wolf on half
// its rows is one everybody mutes, so `play` shots go on the sheet, where a
// person can see what the game looks like, and are never counted as changed.
// The regressions that actually slip through silently — a blank cabinet, a
// broken catalogue, a missing HOME button, a layout that collapsed — all show
// on the boot frame anyway.
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const { chromium } = require('playwright');

const args = process.argv.slice(2);
const argv = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const BASE = argv('--base', '') ? path.resolve(argv('--base')) : null;
const HEAD = path.resolve(argv('--head', 'shots/head'));
const OUT = path.resolve(argv('--out', 'shots/out'));
// The floor under which a boot frame's difference is the harness rather than
// the game. Measured, not guessed: across two runs of an identical tree the
// worst boot shot moved 3.5% (Powder, whose menu animates behind the card) and
// the rest sat under 1.5%. 4% clears all of it while still catching anything
// structural — a blank page, a collapsed layout, a missing button.
const NOISE = +argv('--threshold', 0.04);

function chromePath() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  try { const p = chromium.executablePath(); if (fs.existsSync(p)) return p; } catch { /* fall through */ }
  const home = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (home && fs.existsSync(home)) {
    for (const d of fs.readdirSync(home).filter(n => /^chromium-\d+$/.test(n)).sort().reverse()) {
      const p = path.join(home, d, 'chrome-linux', 'chrome');
      if (fs.existsSync(p)) return p;
    }
  }
  return undefined;
}

const readReport = d => {
  try { return JSON.parse(fs.readFileSync(path.join(d, 'report.json'), 'utf8')); }
  catch { return null; }
};
const dataUri = f => 'data:image/png;base64,' + fs.readFileSync(f).toString('base64');

function compare(baseFile, headFile, diffFile) {
  // pixelmatch ships ESM-first in v6; require() still resolves the CJS build
  // in v5. Take whichever this tree has rather than pinning the workflow to one.
  let pixelmatch = require('pixelmatch');
  if (pixelmatch && pixelmatch.default) pixelmatch = pixelmatch.default;
  const a = PNG.sync.read(fs.readFileSync(baseFile));
  const b = PNG.sync.read(fs.readFileSync(headFile));
  if (a.width !== b.width || a.height !== b.height) return { verdict: 'resized', ratio: 1 };
  const diff = new PNG({ width: a.width, height: a.height });
  const n = pixelmatch(a.data, b.data, diff.data, a.width, a.height, { threshold: 0.12, includeAA: false });
  const ratio = n / (a.width * a.height);
  if (ratio > NOISE) fs.writeFileSync(diffFile, PNG.sync.write(diff));
  return { verdict: ratio > NOISE ? 'changed' : 'same', ratio };
}

const pct = r => (r * 100 < 0.01 ? '<0.01' : (r * 100).toFixed(2)) + '%';

function html(title, body) {
  return `<!doctype html><meta charset="utf-8"><style>
  :root{color-scheme:dark}
  body{margin:0;background:#0b0b0f;color:#e8e6e3;font:13px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace}
  h1{font-size:15px;letter-spacing:.14em;text-transform:uppercase;color:#9ad;margin:0 0 4px}
  .sub{color:#8d8c92;margin:0 0 18px}
  .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
  .cell{background:#131319;border:1px solid #23232c;border-radius:5px;overflow:hidden}
  .cell img{width:100%;display:block;background:#000}
  .cap{display:flex;justify-content:space-between;gap:8px;padding:6px 8px;font-size:11px}
  .id{color:#e8e6e3}.st{color:#8d8c92}
  .changed{border-color:#c8a03a}.changed .st{color:#c8a03a}
  .blank{border-color:#c05a5a}.blank .st{color:#c05a5a}
  .trip{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:0 0 16px}
  .trip figcaption{font-size:11px;color:#8d8c92;padding:4px 2px}
  .trip img{width:100%;display:block;border:1px solid #23232c;border-radius:4px;background:#000}
  .row{margin:0 0 22px}
  .rowhead{color:#c8a03a;font-size:12px;letter-spacing:.08em;margin:0 0 6px}
  .wrap{padding:20px 22px}
  </style><div class="wrap"><h1>${title}</h1>${body}</div>`;
}

async function shoot(page, markup, file, width) {
  await page.setViewportSize({ width, height: 800 });
  await page.setContent(markup, { waitUntil: 'load' });
  await page.waitForTimeout(250);
  await page.screenshot({ path: file, fullPage: true });
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const head = readReport(HEAD);
  if (!head) { console.error(`no report.json in ${HEAD}`); process.exit(1); }
  const base = BASE ? readReport(BASE) : null;

  const rows = [];
  for (const g of head) {
    for (const s of g.shots) {
      const hf = path.join(HEAD, s.file);
      const r = { id: g.id, name: s.name, file: s.file, head: hf, status: g.status,
        colours: s.colours, errors: g.errors.length, verdict: base ? 'new' : 'n/a', ratio: 0 };
      // a running game cannot be photographed at the same instant twice, so
      // its `play` frame is shown and never compared — see the header
      if (s.name !== 'boot') r.verdict = 'uncompared';
      else if (base) {
        const bf = path.join(BASE, s.file);
        if (fs.existsSync(bf)) {
          const df = path.join(OUT, s.file.replace(/\.png$/, '--diff.png'));
          const c = compare(bf, hf, df);
          r.verdict = c.verdict; r.ratio = c.ratio;
          r.base = bf;
          if (c.verdict !== 'same') r.diff = fs.existsSync(df) ? df : null;
        }
      }
      rows.push(r);
    }
  }
  // gone entirely: a cabinet that rendered on base and does not here
  const gone = base ? base.filter(b => !head.some(h => h.id === b.id)).map(b => b.id) : [];

  const moved = rows.filter(r => r.verdict === 'changed' || r.verdict === 'resized')
    .sort((a, b) => b.ratio - a.ratio);
  const broken = rows.filter(r => r.status !== 'ok');

  const browser = await chromium.launch({ executablePath: chromePath(), args: ['--no-sandbox'] });
  const page = await browser.newPage();

  // the whole floor, every head shot, labelled
  const cells = rows.map(r => {
    const cls = r.status !== 'ok' ? 'blank' : (r.verdict === 'changed' || r.verdict === 'resized') ? 'changed' : '';
    const st = r.status !== 'ok' ? r.status.toUpperCase()
      : r.verdict === 'changed' ? pct(r.ratio) : r.verdict === 'resized' ? 'RESIZED'
      : r.verdict === 'new' ? 'new' : r.verdict === 'uncompared' ? 'in play' : '';
    return `<div class="cell ${cls}"><img src="${dataUri(r.head)}">
      <div class="cap"><span class="id">${r.id} · ${r.name}</span><span class="st">${st}</span></div></div>`;
  }).join('');
  const sub = base ? `${rows.length} shots · ${moved.length} moved · threshold ${pct(NOISE)}`
    : `${rows.length} shots · no base to compare against`;
  await shoot(page, html('The floor', `<p class="sub">${sub}</p><div class="grid">${cells}</div>`),
    path.join(OUT, 'sheet.png'), 1500);

  // and a triptych for each thing that actually moved
  let changedFile = null;
  if (moved.length) {
    const trips = moved.slice(0, 14).map(r => `<div class="row">
      <div class="rowhead">${r.id} · ${r.name} — ${r.verdict === 'changed' ? pct(r.ratio) + ' of pixels' : r.verdict}</div>
      <div class="trip">
        <figure style="margin:0"><img src="${r.base ? dataUri(r.base) : ''}"><figcaption>base</figcaption></figure>
        <figure style="margin:0"><img src="${dataUri(r.head)}"><figcaption>head</figcaption></figure>
        <figure style="margin:0"><img src="${r.diff ? dataUri(r.diff) : ''}"><figcaption>diff</figcaption></figure>
      </div></div>`).join('');
    changedFile = path.join(OUT, 'changed.png');
    await shoot(page, html('What moved', `<p class="sub">base · head · diff, biggest first</p>${trips}`),
      changedFile, 1180);
  }
  await browser.close();

  // the summary a PR comment is built from
  const lines = [];
  // only frames that actually HAD a base counterpart were compared. Counting
  // `new` ones here reported "0 of 24" for a run where three were checked and
  // twenty-one had nothing to check against — a denominator that flatters.
  const compared = rows.filter(r => r.verdict === 'same' || r.verdict === 'changed' || r.verdict === 'resized').length;
  const fresh = rows.filter(r => r.verdict === 'new').length;
  const uncompared = rows.filter(r => r.verdict === 'uncompared').length;
  lines.push(base
    ? `**${moved.length} of ${compared} boot frames moved.**` +
      (fresh ? `  \n<sub>${fresh} frames had no counterpart on the base and were not compared.</sub>` : '') +
      (uncompared ? `  \n<sub>${uncompared} in-play frames are on the sheet but not compared — a running game cannot be photographed at the same instant twice, so diffing one would report noise as news.</sub>` : '')
    : `**${rows.length} shots, no base to compare.**`);
  if (broken.length) lines.push(`\n⚠️ **did not render:** ${broken.map(b => `\`${b.id}\` (${b.status})`).join(', ')}`);
  if (gone.length) lines.push(`\n⚠️ **no longer on the floor:** ${gone.map(g => `\`${g}\``).join(', ')}`);
  if (moved.length) {
    lines.push('\n| cabinet | shot | moved |', '|---|---|---|');
    for (const r of moved.slice(0, 20)) {
      lines.push(`| \`${r.id}\` | ${r.name} | ${r.verdict === 'changed' ? pct(r.ratio) : r.verdict} |`);
    }
    if (moved.length > 20) lines.push(`\n…and ${moved.length - 20} more.`);
  } else if (base) {
    lines.push('\nNothing moved. Every cabinet renders exactly as it does on the base branch.');
  }
  const summary = lines.join('\n');
  fs.writeFileSync(path.join(OUT, 'summary.md'), summary + '\n');
  fs.writeFileSync(path.join(OUT, 'result.json'), JSON.stringify(
    { total: rows.length, moved: moved.length, broken: broken.map(b => b.id), gone,
      rows: rows.map(({ base: _b, head: _h, diff: _d, ...r }) => r) }, null, 1));

  console.log(summary);
  console.log(`\nsheet: ${path.join(OUT, 'sheet.png')}${changedFile ? `\nchanged: ${changedFile}` : ''}`);
}

main().catch(e => { console.error('contact.cjs failed:', e); process.exit(1); });
