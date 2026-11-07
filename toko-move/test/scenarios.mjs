// SCENARIOS IN THE SCENE (v3.9; owner, 2026-11-06: "lots more art and scenarios
// in these styles") in bare node. A story card played at the stop brings its
// actor (scenes/stop/<fmt>/07-actor-<card>.webp, made by
// art/minimal-metro-look/make_actors.py); one played on foot brings a picture to
// the board (js/vignettes.js). This holds the casting, not the drawing — the
// drawing is held by eye on the contact sheet, which is the only gate a picture
// has:
//   · every actor is a card that is played AT THE STOP (a layer for a card that
//     never reaches the stop is art nobody sees), and both formats exist
//   · an actor stands clear of the card's box in each format, read off its own
//     pixels (the card covers the bottom of 9:16 and the lower right of 16:9)
//   · every card played on foot has a picture, and no picture is for a card
//     that does not exist
//
//   node toko-move/test/scenarios.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { CARDS, CALLBACKS } from '../js/cards.js';
import { VIGNETTES } from '../js/vignettes.js';

let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };
const at = f => new URL(f, import.meta.url);
const act = JSON.parse(fs.readFileSync(at('../scenes/stop/act1.json'), 'utf8')), actors = act.actors || [];
const all = [...CARDS, ...Object.values(CALLBACKS)], byId = new Map(all.map(c => [c.id, c]));
const where = id => byId.get(id)?.where;

ok(actors.length >= 12, `${actors.length} actors cast`);
const strays = actors.filter(id => where(id) !== 'stop');
ok(!strays.length, `every actor is a card played at the stop${strays.length ? ' (not: ' + strays.join(', ') + ')' : ''}`);
const missing = actors.flatMap(id => ['916', '169'].map(f => `scenes/stop/${f}/07-actor-${id}.webp`)).filter(p => !fs.existsSync(at('../' + p)));
ok(!missing.length, `both formats drawn for each (${actors.length * 2} layers)${missing.length ? '; missing ' + missing.join(', ') : ''}`);

// clear of the card: the actor's ink, measured with ffmpeg's own decoder (no
// image library in bare node): rows/columns with any opaque pixel
const CARD = { '916': { x0: 0.04, y0: 0.72, x1: 0.96, y1: 1 }, '169': { x0: 0.55, y0: 0.66, x1: 1, y1: 1 } };
const inkBox = (file, W, H) => {
  const raw = execFileSync('ffmpeg', ['-v', 'error', '-i', file, '-vf', `scale=${W / 4}:${H / 4},format=rgba,alphaextract`, '-f', 'rawvideo', '-pix_fmt', 'gray', '-'], { maxBuffer: 1 << 26 });
  const w = W / 4, h = H / 4; let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (raw[y * w + x] > 40) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  return { x0: x0 / w, y0: y0 / h, x1: (x1 + 1) / w, y1: (y1 + 1) / h };
};
let hasFfmpeg = true; try { execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' }); } catch { hasFfmpeg = false; }
if (hasFfmpeg) {
  const clash = [];
  for (const [fmt, [W, H]] of [['916', [1080, 1920]], ['169', [1920, 1080]]]) for (const id of actors) {
    const b = inkBox(at(`../scenes/stop/${fmt}/07-actor-${id}.webp`).pathname, W, H), c = CARD[fmt];
    const over = Math.max(0, Math.min(b.x1, c.x1) - Math.max(b.x0, c.x0)) * Math.max(0, Math.min(b.y1, c.y1) - Math.max(b.y0, c.y0));
    if (over > 0.002) clash.push(`${id}@${fmt}`);
  }
  ok(!clash.length, `every actor stands clear of the card in both formats${clash.length ? ' (under it: ' + clash.join(', ') + ')' : ''}`);
} else console.log('  (ffmpeg not on PATH: the card-clearance check is skipped)');

const walking = all.filter(c => c.where === 'walking').map(c => c.id);
const bare = walking.filter(id => !VIGNETTES.includes(id)), orphan = VIGNETTES.filter(id => !byId.has(id));
ok(walking.length >= 6 && !bare.length, `every card played on foot has a picture on the board (${walking.length})${bare.length ? '; none for ' + bare.join(', ') : ''}`);
ok(!orphan.length, `no picture for a card that does not exist${orphan.length ? ' (' + orphan.join(', ') + ')' : ''}`);
console.log(`scenarios: ${n} checks passed`);
