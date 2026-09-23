// What changed in the HSL feed since the pack we ship — said in NAMES, so a
// failed refresh tells you what to do about it.
//
// The nightly refresh failed every run from 2026-09-12 to 2026-09-23 with one
// line of output: "full feed must resolve every delivery anchor: toolontori".
// True, and useless: the feed had renamed or dropped a stop, and nothing
// printed what it was called NOW, so twelve days of runs each said the same
// thing to nobody. This prints the stop names and line names that are gone
// and that are new between two packs, and the refresh workflow runs it
// whether or not validation passed. An alias in helsinki-anchors.js is then
// one line, read off the log, rather than a guess about a real network.
//
//   node scripts/hsl-diff.mjs <committed.json> <fresh.json>
import fs from 'node:fs';

const [, , a, b] = process.argv;
if (!a || !b) { console.error('usage: hsl-diff.mjs <old pack> <new pack>'); process.exit(2); }
const load = p => JSON.parse(fs.readFileSync(p, 'utf8'));
export function diffPacks(oldPack, newPack) {
  const names = pack => new Set((pack.stops || []).map(s => s.name));
  const lines = pack => new Set((pack.lines || []).map(l => `${l.mode}:${l.name}`));
  const on = names(oldPack), nn = names(newPack), ol = lines(oldPack), nl = lines(newPack);
  const gone = [...on].filter(n => !nn.has(n)).sort(), added = [...nn].filter(n => !on.has(n)).sort();
  const linesGone = [...ol].filter(n => !nl.has(n)).sort(), linesAdded = [...nl].filter(n => !ol.has(n)).sort();
  return { stops: { old: on.size, new: nn.size, gone, added }, lines: { old: ol.size, new: nl.size, gone: linesGone, added: linesAdded } };
}
if (import.meta.url === `file://${process.argv[1]}`) {
  const d = diffPacks(load(a), load(b));
  const line = (label, arr) => `${label}: ${arr.length ? arr.join(' ; ') : '—'}`;
  console.log(`stops ${d.stops.old} → ${d.stops.new}`);
  console.log(line('  gone', d.stops.gone));
  console.log(line('  new ', d.stops.added));
  console.log(`lines ${d.lines.old} → ${d.lines.new}`);
  console.log(line('  gone', d.lines.gone));
  console.log(line('  new ', d.lines.added));
  if (process.env.GITHUB_STEP_SUMMARY) {
    const md = `### HSL feed vs the shipped pack\n\n| | shipped | feed |\n|---|---|---|\n| stops | ${d.stops.old} | ${d.stops.new} |\n| lines | ${d.lines.old} | ${d.lines.new} |\n\n**Stop names gone:** ${d.stops.gone.join(', ') || '—'}\n\n**Stop names new:** ${d.stops.added.join(', ') || '—'}\n\n**Lines gone:** ${d.lines.gone.join(', ') || '—'}\n\n**Lines new:** ${d.lines.added.join(', ') || '—'}\n`;
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md);
  }
}
