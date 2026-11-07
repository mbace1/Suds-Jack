// THE MOMENTS (v3.12; the owner's approved exterior art, PR #632, 21 scenes)
// in bare node:
//   · the approved art is untouched: every image matches the inventory's own
//     sha256 list (art/approved-exteriors/ASSET-SHA256.json)
//   · every approved scene is a moment, in exactly the formats it was approved
//     in (five are landscape only, and no portrait is invented for them)
//   · the game's copies (scenes/moments/<fmt>/<id>.webp) ARE the approved crops:
//     the same size, decoded within compression of them (PSNR), against a
//     control (two different scenes read far below the bar)
//   · the four open-perspectives scenes carry their pack's crop boxes and
//     faces; every face and kept point lies in its crop, clear of the card
//   · the beats: a handover with a place of its own where there is one, the
//     generic ones elsewhere; a tram stop when a tram is boarded, the
//     Kalasatama platform for its metro, the stairs down for the others; the
//     old trams, the night and the weather keep the game's own scenes; and
//     every scene shipped is reachable from some beat
//
//   node toko-move/test/moments.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import * as M from '../js/moments.js';

let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };
const at = f => new URL(f, import.meta.url);
const ART = '../art/', INV = JSON.parse(fs.readFileSync(at(ART + 'approved-exteriors/APPROVED-ART.json'), 'utf8'));
const ids = Object.keys(M.MOMENTS);

const sums = JSON.parse(fs.readFileSync(at(ART + 'approved-exteriors/ASSET-SHA256.json'), 'utf8'));
const changed = Object.entries(sums).filter(([f, h]) => crypto.createHash('sha256').update(fs.readFileSync(at(ART + f))).digest('hex') !== h).map(([f]) => f);
ok(Object.keys(sums).length >= 100 && !changed.length, `the approved art is untouched (${Object.keys(sums).length} images against the inventory's checksums)${changed.length ? '; changed: ' + changed.slice(0, 3).join(', ') : ''}`);

const variantOf = id => INV.variants.find(v => v.pack === M.MOMENTS[id].src[0] && v.scene_variant === M.MOMENTS[id].src[1]);
const unused = INV.variants.filter(v => !ids.some(id => variantOf(id) === v)).map(v => `${v.pack}/${v.scene_variant}`);
const wrongFmt = ids.filter(id => { const v = variantOf(id); return !v || JSON.stringify(M.MOMENTS[id].fmts) !== JSON.stringify(['169', ...(v.portrait ? ['916'] : [])]); });
ok(INV.variants.length === 21 && ids.length === 21 && !unused.length && !wrongFmt.length, `every one of the ${INV.variants.length} approved scenes is a moment, in the formats it was approved in (${ids.filter(id => M.MOMENTS[id].fmts.length === 1).length} landscape only)${unused.length ? '; unused: ' + unused.join(', ') : ''}${wrongFmt.length ? '; formats: ' + wrongFmt.join(', ') : ''}`);

const OP = ART + 'sunny-open-perspectives/', meta = JSON.parse(fs.readFileSync(at(OP + 'crop-metadata.json'), 'utf8')), compose = fs.readFileSync(at(OP + 'sources/compose.py'), 'utf8');
const faceOf = s => { const m = new RegExp(`'${s}':\\{'face':(\\[[\\d,]+\\]|None)`).exec(compose); return m && m[1] !== 'None' ? JSON.parse(m[1]).slice(0, 2) : null; };
const measured = ids.filter(id => M.MOMENTS[id].crop), off = measured.filter(id => { const s = M.MOMENTS[id].src[1];
  return ['169', '916'].some(f => JSON.stringify(meta[s]?.crops?.[f]?.box) !== JSON.stringify(M.MOMENTS[id].crop[f])) || (faceOf(s) && JSON.stringify(faceOf(s)) !== JSON.stringify(M.MOMENTS[id].at)); });
ok(measured.length === 4 && !off.length, `the open-perspectives scenes carry their pack's crop boxes and courier faces${off.length ? '; not: ' + off.join(', ') : ''}`);
const CARD = { '916': p => p[1] > 0.72, '169': p => p[0] > 0.55 && p[1] > 0.66 };
const bad = ids.flatMap(id => M.MOMENTS[id].fmts.flatMap(f => [M.faceIn(id, f), M.keepIn(id, f)].filter(p => p.some(v => v < 0 || v > 1) || CARD[f](p)).map(() => `${id}@${f}`)));
ok(!bad.length, `every face and kept point is inside its crop and clear of the card${bad.length ? ' (not: ' + [...new Set(bad)].join(', ') + ')' : ''}`);

let hasFfmpeg = true; try { execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' }); } catch { hasFfmpeg = false; }
if (hasFfmpeg) {
  const size = file => execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', file]).toString().trim();
  const raw = (file, wh) => execFileSync('ffmpeg', ['-v', 'error', '-i', file, '-vf', `scale=${wh.replace(',', ':')}`, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { maxBuffer: 1 << 27 });
  const psnr = (a, b) => { let e = 0; for (let i = 0; i < a.length; i++) { const d = a[i] - b[i]; e += d * d; } return 10 * Math.log10(255 * 255 / (e / a.length)); };
  const read = [], wrong = [];
  for (const id of ids) for (const f of M.MOMENTS[id].fmts) {
    const v = variantOf(id), src = at(ART + (f === '169' ? v.landscape : v.portrait)).pathname, game = at(`../scenes/moments/${f}/${id}.webp`).pathname;
    if (!fs.existsSync(game) || size(game) !== size(src)) { wrong.push(`${id}@${f} size`); continue; }
    const q = psnr(raw(game, size(src)), raw(src, size(src))); read.push(q); if (q < 34) wrong.push(`${id}@${f} ${q.toFixed(1)} dB`);
  }
  const extra = ['169', '916'].flatMap(f => fs.readdirSync(at(`../scenes/moments/${f}/`)).map(x => x.replace('.webp', '')).filter(x => !M.MOMENTS[x]?.fmts.includes(f)).map(x => `${f}/${x}`));
  const s = size(at(ART + variantOf('kiosk').landscape).pathname), ctl = psnr(raw(at('../scenes/moments/169/kiosk.webp').pathname, s), raw(at(ART + variantOf('doorway').landscape).pathname, s));
  ok(ctl < 20, `the ruler tells two scenes apart (kiosk against the doorway: ${ctl.toFixed(1)} dB)`);
  ok(read.length === 37 && !wrong.length && !extra.length, `the game's ${read.length} pictures are the approved crops (${Math.min(...read).toFixed(1)}–${Math.max(...read).toFixed(1)} dB), and nothing else ships${wrong.length ? '; not: ' + wrong.join(', ') : ''}${extra.length ? '; extra: ' + extra.join(', ') : ''}`);
} else console.log('  (ffmpeg not on PATH: the fidelity check is skipped)');

// the beats
const job = { to: 'kamppi', cargo: 'documents' }, D = (to, i) => ({ to, contents: `thing${i}` });
ok(M.pickupMoment('rautatientori', job, '916', true) === 'station' && M.pickupMoment('ruoholahti', job, '169', true) === 'canal' && M.pickupMoment('ooppera', job, '916', true) === 'park',
  'a handover with a place of its own: the station at Rautatientori, the canal at Ruoholahti, the lakeside park at the park stops');
const harbour = f => new Set(Array.from({ length: 30 }, (_, i) => M.deliveryMoment(D('kauppatori', i), f, true)));
ok([...harbour('169')].sort().join() === 'ferry,harbour-handoff,quay' && [...harbour('916')].join() === 'ferry', 'at the harbour: the market quay, the close quay, the ferry — upright, the ferry (the other two are landscape only)');
const anyway = (fn, f) => new Set(Array.from({ length: 60 }, (_, i) => fn(i, f)));
ok([...anyway(i => M.deliveryMoment(D(`p${i}`, i), '916', true))].sort().join() === 'bench,cyclist,doorway' && [...anyway(i => M.pickupMoment(`p${i}`, { ...job, to: `q${i}` }, '169', true))].sort().join() === 'bench,kiosk,stop-handoff',
  'anywhere else a delivery is a doorway, a cyclist or the bench, and a pickup a kiosk, the bench or the tram stop');
const ride = (from, model, i) => ({ kind: 'ride', from, to: `t${i}`, model, line: { id: `l${i}` } });
ok([...anyway(i => M.boardMoment(ride('kamppi', 'artic', i), '169', true))].sort().join() === [...M.BOARD_TRAM].sort().join() && !anyway(i => M.boardMoment(ride('kamppi', 'artic', i), '916', true)).has('stop-handoff'),
  'boarding a tram is a tram stop, five ways (four upright)');
ok([...anyway(i => M.boardMoment(ride('kalasatama', 'metro', i), '916', true))].sort().join() === [...M.BOARD_METRO_KALASATAMA].sort().join() && anyway(i => M.boardMoment(ride('hakaniemi', 'metro', i), '169', true)).has('stairs') && M.boardMoment(ride('hakaniemi', 'metro', 1), '916', true) === null,
  'a metro at Kalasatama boards at the open-air platform (four ways); elsewhere the stairs down, landscape only');
ok(['museum', 'nr1', 'nr2'].every(m => M.boardMoment(ride('kamppi', m, 1), '169', true) === null), 'the old trams keep their own pictures');
ok(M.pickupMoment('kamppi', job, '169', false) === null && M.deliveryMoment(D('kamppi', 1), '916', false) === null && M.boardMoment(ride('kamppi', 'artic', 1), '169', false) === null, 'at night or in weather, no moment: the art is sunny');
ok(M.deliveryMoment(D('eira', 3), '916', true) === M.deliveryMoment(D('eira', 3), '916', true), 'the same drop is always the same picture');
const reach = new Set([...Object.values(M.HANDOFF_AT).flat(), ...M.PICKUP, ...M.DELIVERY, ...M.BOARD_TRAM, ...M.BOARD_METRO_KALASATAMA, ...M.BOARD_METRO]);
ok(ids.every(id => reach.has(id)), `every scene shipped is reachable from some beat${ids.filter(id => !reach.has(id)).length ? ' (never: ' + ids.filter(id => !reach.has(id)).join(', ') + ')' : ''}`);
console.log(`moments: ${n} checks passed`);
