// THE SKINS (v2.69, art bible §1/§3, MUTATORS.md). A skin is only colour, so
// what can go wrong with one is colour: a line that vanishes into the paper, two
// lines that read as one, a line that reads as the player, a key the board reads
// that one skin forgot. The bible states its own floors and this holds them.
//
//   node toko-move/test/skin.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { DAY, NIGHT_SKIN, SNOW, SKINS, DAY_TRAM_INK, TOKO_CYAN, CORAL, skinFor, inkFor, applySkin } from '../js/skin.js';

let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };

// ── colour arithmetic (sRGB → linear → XYZ D65 → L*a*b*)
const rgb = h => { const m = /^#?([0-9a-f]{6})$/i.exec(h); assert.ok(m, `not a hex colour: ${h}`); const v = parseInt(m[1], 16); return [v >> 16 & 255, v >> 8 & 255, v & 255]; };
const lin = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const lum = h => { const [r, g, b] = rgb(h).map(lin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const lab = h => {
  const [r, g, b] = rgb(h).map(lin);
  const X = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047, Y = 0.2126 * r + 0.7152 * g + 0.0722 * b, Z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883;
  const f = t => t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116;
  return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))];
};
const dE = (a, b) => { const [p, q] = [lab(a), lab(b)]; return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]); };

// ── 1. every day line holds 3:1 on the paper (bible §1)
for (const [fam, ink] of Object.entries(DAY_TRAM_INK)) ok(contrast(ink, DAY.paper) >= 3, `day tram ${fam} ${ink} is ${contrast(ink, DAY.paper).toFixed(2)}:1 on paper — under 3:1 it vanishes`);
ok(contrast(DAY.metro, DAY.paper) >= 3, `day metro ${DAY.metro} under 3:1 on paper`);
// and on the snow paper, which is lighter — so it can only be easier, but say so
for (const ink of Object.values(SNOW.tram)) ok(contrast(ink, SNOW.paper) >= 3, `snow tram ${ink} under 3:1 on snow paper`);

// ── 2. no two day lines closer than dE76 18 (bible §1: "min dE 18")
const inks = Object.entries(DAY_TRAM_INK);
let worst = { d: Infinity };
for (let i = 0; i < inks.length; i++) for (let j = i + 1; j < inks.length; j++) {
  const d = dE(inks[i][1], inks[j][1]); if (d < worst.d) worst = { d, a: inks[i][0], b: inks[j][0] };
}
ok(worst.d >= 18, `day trams ${worst.a} and ${worst.b} are dE ${worst.d.toFixed(1)} apart — they read as one line`);

// ── 3. cyan belongs to the courier (bible §1: "No line, vehicle or water uses it")
for (const [fam, ink] of [...inks, ['metro', DAY.metro]]) ok(dE(ink, TOKO_CYAN) >= 18, `day ${fam} ${ink} is dE ${dE(ink, TOKO_CYAN).toFixed(1)} from the courier's cyan`);
for (const k of ['water', 'waterFill', 'waterEdge']) for (const s of [DAY, SNOW]) ok(dE(s[k], TOKO_CYAN) >= 18, `${s.id} ${k} reads as the courier`);
// coral is UI-only: no tram is drawn in it
for (const [fam, ink] of inks) ok(dE(ink, CORAL) >= 13, `day tram ${fam} is too close to the warning coral`);

// ── 4. every key the board reads exists on every skin
const core = fs.readFileSync(new URL('../js/core-v212.js', import.meta.url), 'utf8');
const keys = [...new Set(core.match(/\bSK\.[a-zA-Z]+(?:\.[a-zA-Z]+)?/g).map(k => k.slice(3)))];
ok(keys.length >= 15, `core reads only ${keys.length} skin keys — the scan is broken`);
for (const s of Object.values(SKINS)) for (const k of keys) {
  const v = k.split('.').reduce((o, p) => o?.[p], s);
  ok(v != null && v !== '', `skin ${s.id} has no ${k} — the board would draw undefined`);
}

// ── 5. which skin a run wears
ok(skinFor() === DAY, 'no mutator is the Day skin (MUTATORS.md: "Default (no mutator) is the Day skin")');
ok(skinFor({ mutator: 'night' }) === NIGHT_SKIN, 'the Night mutator wears Night');
ok(skinFor({ mutator: 'snow' }) === SNOW, 'the Snow Day mutator wears Snow');
ok(skinFor({ weather: { id: 'snow' } }) === SNOW, 'a city day that snows wears Snow');
ok(skinFor({ weather: { id: 'rain' } }) === DAY, 'rain is still Day');
ok(skinFor({ mutator: 'disruption' }) === DAY, 'Disruption is Day with a grey line (bible §1)');
ok(skinFor({ skin: 'night', mutator: 'snow' }) === NIGHT_SKIN, 'an explicit ?skin= wins for a link');
ok(skinFor({ skin: 'bogus' }) === DAY, 'an unknown ?skin= falls back to Day');

// ── 6. snow is the day paper about 6% lighter, lines unchanged (MUTATORS.md §4)
{ const d = lab(SNOW.paper)[0] - lab(DAY.paper)[0]; ok(d > 0.5 && d < 6, `snow paper L* is ${d.toFixed(1)} over day — "about 6% lighter"`); }
ok(SNOW.tram === DAY.tram && SNOW.metro === DAY.metro, 'snow keeps the day line colours');

// ── 7. a line's ink
ok(inkFor(DAY, { name: '2' }) === DAY_TRAM_INK['2'], 'tram 2 takes its family ink');
ok(inkFor(DAY, { name: '1H' }) === DAY_TRAM_INK['1'], 'a variant takes its family ink');
ok(inkFor(DAY, { name: 'M1', mode: 'SUBWAY' }) === DAY.metro, 'the metro takes the skin metro');
ok(inkFor(NIGHT_SKIN, { name: 'M1', mode: 'SUBWAY' }) === '#ff6a3d', 'the night metro lifts to #ff6a3d (bible)');
ok(inkFor(DAY, { name: '2' }, 'abcdef') === '#abcdef', 'a GTFS route_color still wins');
ok(inkFor(DAY, { name: '2' }, 'nope') === DAY_TRAM_INK['2'], 'a malformed route_color is ignored');
{ const t = { layers: [{ id: 'a', name: '4' }, { id: 'b', name: 'M2', mode: 'SUBWAY' }], pack: { lines: [] } };
  applySkin(t, DAY); ok(t.layers[0].colour === DAY_TRAM_INK['4'] && t.layers[1].colour === DAY.metro, 'applySkin recolours every layer');
  applySkin(t, NIGHT_SKIN); ok(t.layers[1].colour === NIGHT_SKIN.metro, 'and re-skins cleanly'); }

// ── 8. the ring's colours (bible §4: navy, mint on night, coral late)
ok(DAY.ring === '#233d4d' && NIGHT_SKIN.ring === '#7ad3b0', 'the ring is navy by day and mint by night');
ok(/RING_LATE=30;/.test(core) && /p<RING_LATE\?SK_CORAL:SK\.ring/.test(core), 'the ring turns coral under 30% (paintHud)');

console.log(`  skin: ${n} checks · worst day pair ${worst.a}/${worst.b} dE ${worst.d.toFixed(1)}`);
