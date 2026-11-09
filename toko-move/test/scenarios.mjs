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
//   · (v3.11) every interior layer the car can ask for exists, and the rain in
//     the window falls one way — measured, with the old two-way plate as control
//
//   node toko-move/test/scenarios.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { CARDS, CALLBACKS } from '../js/cards.js';
import { VIGNETTES } from '../js/vignettes.js';
import * as J from '../js/journey.js';
import { buildRealHelsinki } from '../js/real-helsinki.js';

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
// MORE PLACES (v3.10): every place the network names stands in front of its
// own landmark, in both formats, and the weather that lies on the stop is drawn
const net = J.network(buildRealHelsinki(JSON.parse(fs.readFileSync(at('../cities/helsinki.json'), 'utf8'))));
const places = [...net.nodes.keys()], bare2 = places.filter(id => !['916', '169'].every(f => act.land?.[id]?.[f] && fs.existsSync(at(`../scenes/stop/${f}/01b-land-${id}.webp`))));
ok(places.length >= 20 && !bare2.length, `every one of the ${places.length} places has its landmark in both formats${bare2.length ? '; none for ' + bare2.join(', ') : ''}`);
const ferries = Object.entries(act.land || {}).filter(([, v]) => v['916']?.ferry).map(([k]) => k);
ok(ferries.includes('olympiaterminaali') && ferries.includes('lansiterminaali'), `both ferry terminals carry the bobbing ferry (${ferries.join(', ')})`);
const wx = act.wx || [], wxMissing = wx.flatMap(w => ['916', '169'].map(f => `05b-wx-${w}`).filter((x, i) => !fs.existsSync(at(`../scenes/stop/${['916', '169'][i]}/${x}.webp`))));
ok(wx.includes('snow') && wx.includes('rain') && !wxMissing.length, `the weather lies on the stop: ${wx.join(', ')}, both formats`);
// MORE INTERIORS (v3.11): every layer the car can ask for is drawn — the metro
// by day, the rush car, and the window in every weather play.js lists
const src = fs.readFileSync(at('../js/play.js'), 'utf8');
const winWx = Object.fromEntries([...(src.match(/const WINDOW_WX = \{([^}]*)\}/)?.[1] || '').matchAll(/(\w+): \[([^\]]*)\]/g)].map(([, k, v]) => [k, v.match(/'(\w+)'/g).map(x => x.slice(1, -1))]));
const want = ['01-outside-tile', '02-car', '03-people', '04-courier', '03-people-rush', '04-courier-rush'].map(l => `metro/${l}`)
  .concat(['tram/03-people-rush', 'tram/04-courier-rush'], Object.entries(winWx).flatMap(([sc, ws]) => ws.map(w => `${sc}/01-outside-tile-${w}`)));
const gone = want.flatMap(l => ['916', '169'].map(f => l.replace('/', `/${f}/`))).filter(l => !fs.existsSync(at(`../scenes/${l}.webp`)));
ok(winWx.tram?.includes('rain') && winWx.night?.includes('snow') && !gone.length, `the metro, the rush car and the window's weather are drawn, both formats (${want.length * 2} layers)${gone.length ? '; missing ' + gone.join(', ') : ''}`);
// ...and the rain falls ONE way (owner, 2026-11-07: "Rain seems to be falling into 2
// different directions here"). The window is a tile whose two halves once were
// mirror images, rain included. The slant of a streak is read off the image
// gradient — Σgx·gy over Σ|gx·gy| in the sky, per half: + is down-and-left, − the
// other way — and the painted plate it came from is the control: the same ruler
// has to SEE its two directions, or a pass here means nothing.
if (hasFfmpeg) {
  const slant = file => {
    const [W, H] = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', file]).toString().trim().split(',').map(Number);
    const raw = execFileSync('ffmpeg', ['-v', 'error', '-i', file, '-f', 'rawvideo', '-pix_fmt', 'gray', '-'], { maxBuffer: 1 << 27 });
    const half = [[0, 0], [0, 0]], y1 = Math.floor(H * 0.42);
    for (let y = 1; y < y1; y++) for (let x = 1; x < W - 1; x++) {
      const p = (raw[y * W + x + 1] - raw[y * W + x - 1]) * (raw[(y + 1) * W + x] - raw[(y - 1) * W + x]); half[x < W / 2 ? 0 : 1][0] += p; half[x < W / 2 ? 0 : 1][1] += Math.abs(p);
    }
    return { m: half.map(([s_, a]) => (a ? s_ / a : 0)), e: (half[0][1] + half[1][1]) / (W * y1) };
  };
  const ctl = slant(at('../art/minimal-metro-look/_prev/night-916-tile-painted.webp').pathname);
  ok(ctl.m[0] > 0.5 && ctl.m[1] < -0.5, `the ruler sees the old window's two directions (${ctl.m.map(v => v.toFixed(2)).join(' / ')})`);
  const bad = [], read = [];
  // the day's rain variant, and the night window, which always rains (the night run is always 'clear')
  for (const [sc, l] of [['tram', '01-outside-tile-rain'], ['night', '01-outside-tile']]) for (const f of ['916', '169']) {
    const r = slant(at(`../scenes/${sc}/${f}/${l}.webp`).pathname); read.push(`${sc}@${f} ${r.m.map(v => v.toFixed(2)).join('/')}`);
    if (!(r.m[0] > 0.5 && r.m[1] > 0.5)) bad.push(sc + '@' + f);
  }
  ok(!bad.length, `the rain in every window falls one way, down and to the left (${read.join(' · ')})`);
  // and the night's snow and fog are made from the DRIED plate: no painted rain left under them
  const dry = ['snow', 'fog'].map(w => slant(at(`../scenes/night/916/01-outside-tile-${w}.webp`).pathname)), wet = slant(at('../art/minimal-metro-look/_prev/night-916-tile-painted.webp').pathname);
  ok(dry.every(r => Math.abs(r.m[0]) < 0.4 && Math.abs(r.m[1]) < 0.4), `a snowy or foggy night has no painted rain under it (slant ${dry.map(r => r.m.map(v => v.toFixed(2)).join('/')).join(', ')} against the plate's ${wet.m.map(v => v.toFixed(2)).join('/')})`);
}
console.log(`scenarios: ${n} checks passed`);
