// THE MOMENTS (v3.12; the owner's art pack, PR #632, "Perfect all approved")
// in bare node:
//   · the approved pack is untouched: every image matches the pack's own
//     sha256 list (pixel-asset-sha256.json)
//   · the game's copies (scenes/moments/<fmt>/<id>.webp) ARE the approved crops:
//     the same size, and decoded within compression of them (PSNR, against a
//     control: a different scene of the pack reads far below the bar)
//   · js/moments.js agrees with the pack: its crop boxes are crop-metadata.json's,
//     its faces are sources/compose.py's, and every face and kept point lies in
//     its crop, clear of the card
//   · the beats: the kiosk at a pickup, the doorway or the cyclist at a delivery
//     (both seen, the same drop always the same), the platform only for a metro
//     boarded at Kalasatama, and nothing on the night shift (the pack is sunny)
//
//   node toko-move/test/moments.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { MOMENTS, faceIn, keepIn, pickupMoment, deliveryMoment, metroMoment } from '../js/moments.js';

let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };
const at = f => new URL(f, import.meta.url);
const PACK = '../art/sunny-open-perspectives/';
const ids = Object.keys(MOMENTS);

const sums = JSON.parse(fs.readFileSync(at(PACK + 'pixel-asset-sha256.json'), 'utf8'));
const changed = Object.entries(sums).filter(([f, h]) => crypto.createHash('sha256').update(fs.readFileSync(at(PACK + f))).digest('hex') !== h).map(([f]) => f);
ok(Object.keys(sums).length >= 25 && !changed.length, `the approved pack is untouched (${Object.keys(sums).length} images against its own checksums)${changed.length ? '; changed: ' + changed.join(', ') : ''}`);
ok(JSON.parse(fs.readFileSync(at(PACK + 'approval-record.json'), 'utf8')).approved_scenes.every(s => ids.includes(s)) && ids.length === 4, `every approved scene is a moment (${ids.join(', ')})`);

const meta = JSON.parse(fs.readFileSync(at(PACK + 'crop-metadata.json'), 'utf8'));
const compose = fs.readFileSync(at(PACK + 'sources/compose.py'), 'utf8');
const faceOf = id => { const m = new RegExp(`'${id}':\\{'face':(\\[[\\d,]+\\]|None)`).exec(compose); return m && m[1] !== 'None' ? JSON.parse(m[1]).slice(0, 2) : null; };
const off = ids.filter(id => ['169', '916'].some(f => JSON.stringify(meta[id]?.crops?.[f]?.box) !== JSON.stringify(MOMENTS[id].crop[f])) || (faceOf(id) && JSON.stringify(faceOf(id)) !== JSON.stringify(MOMENTS[id].at)));
ok(!off.length, `js/moments.js has the pack's crop boxes and courier faces${off.length ? '; not for ' + off.join(', ') : ''}`);
ok(faceOf('cyclist') === null, 'the cyclist scene has no face (the courier is seen from behind), and its origin is the parcel instead');
const CARD = { '916': p => p[1] > 0.72, '169': p => p[0] > 0.55 && p[1] > 0.66 };
const bad = ids.flatMap(id => ['169', '916'].flatMap(f => [faceIn(id, f), keepIn(id, f)].filter(p => p.some(v => v < 0 || v > 1) || CARD[f](p)).map(() => `${id}@${f}`)));
ok(!bad.length, `every face and kept point is inside its crop and clear of the card${bad.length ? ' (not: ' + bad.join(', ') + ')' : ''}`);

let hasFfmpeg = true; try { execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' }); } catch { hasFfmpeg = false; }
if (hasFfmpeg) {
  const raw = (file, w, h) => execFileSync('ffmpeg', ['-v', 'error', '-i', file, '-vf', `scale=${w}:${h}`, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { maxBuffer: 1 << 26 });
  const size = file => execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', file]).toString().trim();
  const psnr = (a, b) => { let e = 0; for (let i = 0; i < a.length; i++) { const d = a[i] - b[i]; e += d * d; } return 10 * Math.log10(255 * 255 / (e / a.length)); };
  const read = [], wrong = [];
  for (const id of ids) for (const [f, w, h] of [['169', 1024, 576], ['916', 576, 1024]]) {
    const game = at(`../scenes/moments/${f}/${id}.webp`).pathname, src = at(`${PACK}crops/${id}-${f}.png`).pathname;
    if (!fs.existsSync(game) || size(game) !== `${w},${h}`) { wrong.push(`${id}@${f}`); continue; }
    const q = psnr(raw(game, w, h), raw(src, w, h)); read.push(q); if (q < 35) wrong.push(`${id}@${f} ${q.toFixed(1)} dB`);
  }
  const ctl = psnr(raw(at('../scenes/moments/169/kiosk.webp').pathname, 1024, 576), raw(at(`${PACK}crops/doorway-169.png`).pathname, 1024, 576));
  ok(ctl < 20, `the ruler tells two scenes apart (kiosk against the doorway: ${ctl.toFixed(1)} dB)`);
  ok(!wrong.length, `the game's moments are the approved crops, both formats (${Math.min(...read).toFixed(1)}–${Math.max(...read).toFixed(1)} dB)${wrong.length ? '; not: ' + wrong.join(', ') : ''}`);
} else console.log('  (ffmpeg not on PATH: the fidelity check is skipped)');

ok(pickupMoment(false) === 'kiosk' && pickupMoment(true) === null, 'a job taken by day is handed over at the kiosk; the night shift keeps its stop');
const drops = Array.from({ length: 40 }, (_, i) => ({ to: `place${i}`, contents: `thing${i % 7}` })), got = new Set(drops.map(d => deliveryMoment(d, false)));
ok(got.has('doorway') && got.has('cyclist') && got.size === 2, 'a delivery is at a doorway or with a cyclist at the steps, and both happen');
ok(drops.every(d => deliveryMoment(d, false) === deliveryMoment({ ...d }, false)) && drops.every(d => deliveryMoment(d, true) === null), 'the same drop is always the same picture, and none at night');
const ride = (from, model) => ({ kind: 'ride', from, model });
ok(metroMoment(ride('kalasatama', 'metro'), false) === 'metro' && !metroMoment(ride('hakaniemi', 'metro'), false) && !metroMoment(ride('kalasatama', 'artic'), false) && !metroMoment(ride('kalasatama', 'metro'), true),
  'the open-air platform is for a metro boarded at Kalasatama only, and by day');
console.log(`moments: ${n} checks passed`);
