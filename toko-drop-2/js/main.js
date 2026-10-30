// main.js — boot, the loop, the states, and the wiring between them.
//
// One renderer path: WebGPURenderer, which falls back to WebGL 2 by itself
// when the device has no WebGPU. `?webgl` forces the fallback, so both paths
// can be checked on any device. The HUD label says which one is running.
//
// The rules live in sim/ and run on a fixed step; this file feeds them input,
// hands their events to the view and the sound, and draws in between steps.
import * as THREE from 'three/webgpu';
import { TUNING } from './tuning.js?v=65';
import { buildFloor } from './render/floor.js?v=65';
import { fitCamera, screenToWorld, screenDown } from './render/view.js?v=65';
import * as worldsSim from './sim/worlds.js?v=65';
import { shapeAt as shiftShape } from './sim/floorshift.js?v=65';
import * as reshapeSim from './sim/reshape.js?v=65';
import { Scenery } from './render/scenery.js?v=65';
import { Transit } from './render/transit.js?v=65';
import { Splats } from './render/splats.js?v=65';
import { Actors } from './render/actors.js?v=65';
import { GEL_TIME } from './render/gel.js?v=65';
import { studioEnvironment } from './render/env.js?v=65';
import { Specimen } from './render/specimen.js?v=65';
import { createWorld, step, api as simApi } from './sim/world.js?v=65';
import { stage as stagePk } from './sim/pickups.js?v=65';
import { Input } from './input.js?v=65';
import { UI, t, timeText, LANGS, getLang, setLang, goalText, bossName } from './ui.js?v=65';
import { Announcer } from './announcer.js?v=65';
import { rooms as campaignRooms, isOpen as roomOpen, better as betterGrade } from './sim/director/campaign.js?v=65';
import { levelShape, slots as regionSlots } from './sim/shape.js?v=65';
import { Sound } from './audio.js?v=65';
import { Music, worldWant, cueFor, renderMusicWav } from './music.js?v=65';
import { Intro, CUES as INTRO } from './intro/intro.js?v=65';
import { scheduleIntroSfx, renderIntroSfxWav } from './intro/sfx.js?v=65';
import { Readout } from './readout.js?v=65';
import { Meter, device } from './meter.js?v=65';
import * as record from './record.js?v=65';

const T = TUNING;
const params = new URLSearchParams(location.search);
const stage = document.getElementById('stage');

// three reports its own failures (a shader that will not compile on this GPU,
// a validation error, a lost device) through console.error and carries on,
// so on a phone they would be a black or frozen screen with no message.
// Same output as three's default, plus the fault box.
THREE.setConsoleFunction((level, message, ...rest) => {
  const trace = rest[0];
  if (trace && trace.isStackTrace) console[level](trace.getError(message));
  else console[level](message, ...rest);
  if (level === 'error') window.__fault?.(message);
});

// The page's own near-black follows the tuned clear colour once we are up.
const voidHex = '#' + new THREE.Color(T.render.clearColor).getHexString();
document.documentElement.style.setProperty('--void', voidHex);
document.querySelector('meta[name="theme-color"]')?.setAttribute('content', voidHex);

const renderer = new THREE.WebGPURenderer({ antialias: true, forceWebGL: params.has('webgl') });
renderer.setPixelRatio(Math.min(devicePixelRatio, T.render.maxPixelRatio));
stage.appendChild(renderer.domElement);
await renderer.init();

const backend = renderer.backend.isWebGPUBackend ? 'webgpu' : 'webgl2';
document.getElementById('backend').textContent = ` · ${backend}`;

const scene = new THREE.Scene();
scene.background = new THREE.Color(T.render.clearColor);
// 1.x's light: white ambient and one sun. The gels are the only lit things.
scene.add(new THREE.AmbientLight(0xffffff, T.light.ambient));
const sun = new THREE.DirectionalLight(0xffffff, T.light.sun.intensity);
sun.position.set(...T.light.sun.position);
scene.add(sun);
// what the jelly reflects (render/env.js): 2.0's, 1.x had nothing to reflect
if (T.env.on) { scene.environment = studioEnvironment(); scene.environmentIntensity = T.env.intensity; }

const splats = new Splats(scene);
const store = {
  num(k) { try { return Number(localStorage.getItem(k)) || 0; } catch { return 0; } },
  str(k) { try { return localStorage.getItem(k) || ''; } catch { return ''; } },
  set(k, v) { try { localStorage.setItem(k, String(v)); } catch { /* private mode */ } },
};
// the goo (render/goo.js) is on unless the title's SPLATTER switch says off
// (localStorage toko2.goo); ?goo=off|on overrides it for a link, as ?gels does
let urlGoo = ['on', 'off'].includes(params.get('goo')) ? params.get('goo') : null;
const gooOn = () => (urlGoo ?? store.str('toko2.goo')) !== 'off';
const actors = new Actors(scene, splats, { goo: gooOn() });
const scenery = new Scenery(scene, T);   // the curb and the lawn, the sewer's walls (render/scenery.js)
const camera = new THREE.PerspectiveCamera();
const camRest = new THREE.Vector3();
// the ground the screen shows round the followed point (measureSeen)
const seen = { x0: 0, x1: 0, z0: 0, z1: 0, ok: false };
// one ray onto the floor, shared by measureSeen and the pointer
const _ray = new THREE.Raycaster(), _plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), _hit = new THREE.Vector3(), _ndc = new THREE.Vector2();
// the point a bigger world's camera follows (zero while the whole arena is
// on screen): the hero, eased, kept from showing more than T.camera.follow.edge
// past the floor's edge
const camAt = new THREE.Vector3();
let trauma = 0;
// 1.x's shake: trauma adds up to 1 and decays; the camera moves by its square
const shake = (amount) => { if (!reduceMotion()) trauma = Math.min(1, trauma + amount); };
// REDUCE MOTION (1.x v81): OPTIONS' choice (toko2.motion), else the device's
const reduceMotion = () => { const m = store.str('toko2.motion'); return m ? m === 'on' : matchMedia('(prefers-reduced-motion: reduce)').matches; };

// ── the arena: 1.x's size for the screen's shape, chosen at each run start
// (never mid-run), with the floor made to match ──────────────────────────
let arenaName = null, arena = null, floor = null;
let state = 'menu', mode = 'arcade', world = null, acc = 0, pendingDash = false, dyingT = 0;
const screenArena = () => (stage.clientWidth >= stage.clientHeight ? 'landscape' : 'portrait');
// The view's TURN (owner, 2026-10-23: "as long as the orientation is
// right"). 1.x picks the arena once a run, so a phone turned mid-run used to
// show its landscape arena as a thin strip across an upright screen. Now
// the world turns a quarter instead (render/view.js), so the arena lies along
// the screen's long side again. Which way: the way that keeps the world
// where it was on the glass, read off the screen's orientation angle as it
// was when the arena was picked (an unknown angle turns it clockwise). The
// sticks, the keys and the pad turn with it (toWorld), so up is still up.
let turn = 0, angle0 = 0;
const screenAngle = () => {
  try { const a = screen.orientation?.angle ?? window.orientation; return typeof a === 'number' ? a : 0; } catch { return 0; }
};
function useArena(name) {
  if (name === arenaName && viewWorld === 1 && !boundsFloor && !roomFloor) return;
  arenaName = name; arena = T.arena[name]; angle0 = screenAngle();
  useWorld(1, arena.hx, arena.hz);
}
// the floor of world n (sim/worlds.js), at its size: the view's half of a
// world change. A world past the first is bigger than the screen, and the
// camera follows (viewBox)
let viewWorld = 1, boundsFloor = false, roomFloor = false, shiftOpen = null;   // shiftOpen: a shift world's floor, whole (useWorld)   // roomFloor: a campaign room's floor is down (useRoom)
// world n's floor (render/floor.js), per the title's WORLDS look (v23):
// STREET is the driveway and the sewer with their lawn and walls; NEON is
// two abstract floors in the grid's own language, with 1.x's rail. The look
// is kept in toko2.worlds; ?worlds=street|neon overrides it for a link
const FLOOR_STYLE = { street: ['grid', 'concrete', 'sewer'], neon: ['grid', 'hex', 'tide'] };
// worlds 4-9 have one floor each, whichever look the first three wear (v28)
for (const L of Object.values(FLOOR_STYLE)) L.push('cistern', 'boiler', 'river', 'ice', 'deep', 'core');
const WORLD_LOOKS = ['street', 'neon'];
let urlWorlds = WORLD_LOOKS.includes(params.get('worlds')) ? params.get('worlds') : null;
const worldsLook = () => urlWorlds ?? (WORLD_LOOKS.includes(store.str('toko2.worlds')) ? store.str('toko2.worlds') : 'street');
function useWorld(n, hx, hz) {
  viewWorld = n; boundsFloor = false; roomFloor = false;
  if (floor) { scene.remove(floor.group); floor.dispose(); }
  actors.setArena(hx, hz);
  const WD = T.worlds.list[n - 1];
  // a world whose walls close in for its challenge (v37, `squeeze`) is built with bounds, at its full size
  // a world whose floor moves for a wave (v44, sim/floorshift.js) is built able to take
  // the shift's shape — the shader fixes each part's kind — and opened out to the whole
  // floor until the shift is on (shiftOpen), so the floor never rebuilds mid-wave
  shiftOpen = WD?.shift ? { slots: [0, 1, 2, 3].map((i) => { const p = WD.shift.parts[i]; return !p ? [0, 0, 0, 0] : p.kind === 'rect' ? [1, hx, hz, 0] : [2, 0, 0, 1e4]; }), combine: WD.shift.combine === 'intersect' ? 1 : 0 } : null;
  floor = buildFloor(T, hx, hz, actors.light.texture, { style: FLOOR_STYLE[worldsLook()][n - 1] ?? 'grid', film: actors.gooKit.film, bounds: !!WD?.squeeze,
    region: WD?.shift ? regionSlots(shiftShape({ hx, hz }, WD.shift, 0)) : null, regionRail: WD?.rail });
  if (shiftOpen) floor.setRegion(shiftOpen);
  floorFull = { hx, hz };
  if (WD?.rail != null) floor.setRail(WD.rail);
  scene.add(floor.group);
  // STREET's driveway and sewer stand their lawn and walls; every other floor, NEON's too, a surround (v43)
  scenery.build(n, hx, hz, { look: worldsLook() });
  camAt.set(0, 0, 0);
  resize();
}
// SURVIVAL's floor (sim/reshape.js): the grid built at its biggest, with
// the walls wherever they are now (floor.js `bounds`), its light map as big
let survivalMax = null;
let floorFull = null;   // a world floor's own size, which its walls close in from (squeezeFrame)
function useSurvival() {
  survivalMax = reshapeSim.maxSize(arenaName);
  const { hx, hz } = survivalMax;
  viewWorld = 1; boundsFloor = true; roomFloor = false; shiftOpen = null;
  if (floor) { scene.remove(floor.group); floor.dispose(); }
  actors.setArena(hx, hz);
  floor = buildFloor(T, hx, hz, actors.light.texture, { style: 'grid', bounds: true, film: actors.gooKit.film });
  scene.add(floor.group);
  scenery.build(1, hx, hz);
  camAt.set(0, 0, 0);
  resize();
}
// the walls as they are, where SURVIVAL's floor is bigger than them
function arenaBox() {
  if (!world || !boundsFloor) return floor.arena;
  return new THREE.Box3(new THREE.Vector3(-world.hx, 0, -world.hz), new THREE.Vector3(world.hx, T.floor.railHeight, world.hz));
}
let fitHx = 0, fitHz = 0;   // the walls the camera was last fitted to

// what the camera fits: the whole arena, or on a bigger world's floor, a
// box the size of the run's own 1.x arena, which it then carries round
// after the hero (camAt) — so the bodies are the size they were in world 1
function viewBox() {
  const A = T.arena[arenaName];
  if (!world || (world.hx <= A.hx + 1e-6 && world.hz <= A.hz + 1e-6)) return null;
  return new THREE.Box3(new THREE.Vector3(-A.hx, 0, -A.hz), new THREE.Vector3(A.hx, T.floor.railHeight, A.hz));
}

function resize() {
  const w = Math.max(1, stage.clientWidth), h = Math.max(1, stage.clientHeight);
  renderer.setSize(w, h, false);
  if (!floor) return;
  if (state === 'menu' && screenArena() !== arenaName) return useArena(screenArena());
  turn = 0;
  if (screenArena() !== arenaName) {
    const phi = (((angle0 - screenAngle()) % 360) + 360) % 360;
    turn = phi === 270 ? 3 : 1;
  }
  // a turned arena takes the tilt of the screen it is now on: it lies along
  // that screen's long side, as that screen's own arena would
  following = viewBox();
  fitCamera(camera, following ?? arenaBox(), w / h, { ...T.camera, tiltDeg: T.arena[screenArena()].tiltDeg }, turn, { w, h });
  fitHx = world?.hx ?? 0; fitHz = world?.hz ?? 0;
  camRest.copy(camera.position);
  measureSeen();
}
// how far the ground the screen shows reaches from the followed point, each
// way (v48): the middle of each screen edge cast onto the floor. The view box
// is fitted to the screen's narrow side, so on a phone held upright it does
// not reach the long side's edges, and a clamp that assumed it did let the
// camera show a quarter of a screen of void past the sewer's end
function measureSeen() {
  camera.updateMatrixWorld();
  seen.x0 = seen.z0 = Infinity; seen.x1 = seen.z1 = -Infinity; seen.ok = true;
  for (const [nx, ny] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
    _ray.setFromCamera(_ndc.set(nx, ny), camera);
    if (!_ray.ray.intersectPlane(_plane, _hit)) { seen.ok = false; return; }
    seen.x0 = Math.min(seen.x0, _hit.x); seen.x1 = Math.max(seen.x1, _hit.x);
    seen.z0 = Math.min(seen.z0, _hit.z); seen.z1 = Math.max(seen.z1, _hit.z);
  }
}
let following = null;   // the box the camera carries when it follows; null when the whole arena is on screen

// the bodies a following camera has left off the screen, as arrows on its
// edge (ui.drawSticks): where the line from the middle of the screen to the
// body leaves it, `inset` px in, fainter the further off it is
const _pv = new THREE.Vector3(), _pips = [];
function offscreen() {
  const W = innerWidth, H = innerHeight, P = T.camera.pips, cx = W / 2, cy = H / 2;
  _pips.length = 0;
  for (const g of world.gels) {
    if (!g.alive || g.state !== 'active') continue;
    _pv.set(g.x, 0.5, g.z).project(camera);
    if (Math.abs(_pv.x) <= 1 && Math.abs(_pv.y) <= 1) continue;
    const sx = ((_pv.x + 1) / 2) * W, sy = ((1 - _pv.y) / 2) * H, dx = sx - cx, dy = sy - cy;
    const k = Math.min((W / 2 - P.inset) / Math.max(1e-6, Math.abs(dx)), (H / 2 - P.inset) / Math.max(1e-6, Math.abs(dy)));
    const off = Math.max(Math.abs(_pv.x), Math.abs(_pv.y)) - 1;
    _pips.push({ x: cx + dx * k, y: cy + dy * k, a: Math.atan2(dy, dx), hex: T.species[g.kind].color, big: g.isBoss || g.heavy || g.r > 0.9, alpha: Math.max(P.minAlpha, 1 - off * P.fade) });
    if (_pips.length >= P.max) break;
  }
  return _pips;
}

// the followed point this frame: the hero, eased, held so the view shows at
// most `edge` of what lies past the floor (the curb and the lawn beyond it)
function follow(dt, a) {
  if (!following || !world) { camAt.set(0, 0, 0); return; }
  const F = T.camera.follow, A = T.arena[arenaName], h = world.hero;
  // the followed point may go only so far that the screen's bottom and sides
  // show no more than `edge` past the floor; its top looks out past the far
  // end in any perspective view, which is where the world's surround stands,
  // so that side keeps the old rule. A floor shorter than the screen that way
  // stays centred
  const [dx, dz] = screenDown(turn), ox = world.hx - A.hx + F.edge, oz = world.hz - A.hz + F.edge;
  const side = (lo, hi, oLo, oHi, upLo, upHi) => { if (!seen.ok) return [oLo, oHi]; const a = upLo ? oLo : lo, b = upHi ? oHi : hi; return a > b ? [(a + b) / 2, (a + b) / 2] : [a, b]; };
  const [x0, x1] = side(-world.hx - F.edge - seen.x0, world.hx + F.edge - seen.x1, -ox, ox, dx === 1, dx === -1);
  const [z0, z1] = side(-world.hz - F.edge - seen.z0, world.hz + F.edge - seen.z1, -oz, oz, dz === 1, dz === -1);
  const tx = Math.max(x0, Math.min(x1, h.px + (h.x - h.px) * a)), tz = Math.max(z0, Math.min(z1, h.pz + (h.z - h.pz) * a));
  const k = 1 - Math.exp(-dt / F.tau);
  camAt.x += (tx - camAt.x) * k; camAt.z += (tz - camAt.z) * k;
}

// ── state ──────────────────────────────────────────────────────────
// Every mode the sim runs, each with its best score. The title offers only
// ARCADE and HARDCADE for now (ui.js TITLE_MODES; owner, 2026-10-22: "forget
// survival for now"), but SURVIVAL still runs from here, as
// __toko.start('survival') does, and keeps its best.
const MODES = ['arcade', 'hardcade', 'survival', 'campaign'];
// v52: HEAT scores keep their own bests — 1.x's streak scores (`toko2.best.*`)
// were another scale, and stay in storage untouched, but are no longer shown
const bestKey = (m) => `toko2.heat.best.${m}`;
const bests = () => Object.fromEntries(MODES.map((m) => [m, store.num(bestKey(m))]));
// The title's two test switches (owner, 2026-10-22: "the pushing dash should
// be tested as it may be a better dynamic, allowing for more bullet sponge
// enemies", then "likely we want dashes that go through and do damage in the
// end"): the dash, PUSH (TUNING.hero.push) or CUT (TUNING.hero.cut), and
// every non-boss gel's hit points ×1, ×2 or ×3. PUSH is what the test began
// with, so it is what a first run gets. 1.x's PASS has left the switch
// (owner, 2026-10-22: PUSH and CUT in the menu) but not the game: it is the
// sim's own dash, createWorld's default, the base 1.x's dash levels build on.
// A browser that saved it, as v7's 'pass' or v6's toko2.dashPass (no longer
// read), plays PUSH.
const DASHES = ['push', 'cut'], HP_STEPS = [1, 2, 3];
const tests = () => {
  const hp = store.num('toko2.gelHp'), d = store.str('toko2.dash');
  return { dash: DASHES.includes(d) ? d : 'push', hp: HP_STEPS.includes(hp) ? hp : 1 };
};
const showTitle = (keep = false) => ui.title(bests(), sound.on, input.source, tests(), keep);
// a switch flipped: redraw the menu it is on (OPTIONS, or the title)
const refreshMenu = () => (ui.inOptions ? ui.openOptions() : showTitle(true));
// PLAY RECORD (OPTIONS, v61): the record as text a person can paste into a
// message — the clipboard first, else the phone's share sheet, else a file
let lost = [], recordSaid = null;
// the copy command the clipboard API replaced: inside another site's frame the
// API is blocked unless that frame is allowed clipboard-write, and itch's frame
// is not (v64, measured in scripts/itch-check.mjs); this one needs only the tap
function copyByCommand(text) {
  const t = document.createElement('textarea');
  t.value = text; t.readOnly = true; t.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0';
  document.body.append(t); t.select(); t.setSelectionRange(0, text.length);
  let ok = false;
  try { ok = document.execCommand('copy'); } catch { /* no copy command here */ }
  t.remove();
  return ok;
}
async function shareRecord() {
  const list = record.read(store);
  if (!list.length) { recordSaid = 'recordEmpty'; refreshMenu(); return; }
  const text = record.pack(list, new Date());
  let copied = false;
  try { await navigator.clipboard.writeText(text); copied = true; } catch { copied = copyByCommand(text); }
  if (copied) recordSaid = 'recordCopied';
  else {
    try { await navigator.share({ title: 'Toko Drop 2.0 · play record', text }); recordSaid = 'recordShared'; }
    catch (e) {
      if (e?.name === 'AbortError') recordSaid = null;   // the share sheet was closed
      else {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' })); a.download = 'toko-drop-play-record.txt';
        document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        recordSaid = 'recordSaved';
      }
    }
  }
  refreshMenu();
}
// how this attempt was played, for its entry: the input, which way up, and
// (v63, js/meter.js) how the phone ran it
const meter = new Meter();
const recordHow = () => ({
  input: input.source, screen: arenaName, date: new Date(), frames: meter.summary(), letGos: input.letGos,
  device: device({ ua: navigator.userAgent, touchPoints: navigator.maxTouchPoints, width: renderer.domElement.width, height: renderer.domElement.height,
    ratio: renderer.getPixelRatio(), backend, gels: actors.gels, goo: gooOn() }),
});
// a room or a run left from the pause menu goes in the record as a quit (js/record.js)
function recordQuit() {
  if (!world || world.over || (state !== 'paused' && state !== 'play')) return;
  record.add(store, record.entryFor(world, mode, lost, recordHow(), true), T.record.cap);
}

const input = new Input(document);
const sound = new Sound();
// VOLUME (1.x v81): toko2.volume, 0..1 in quarters; a v23 SOUND OFF (toko2.mute) reads as 0
const VOLUMES = [0, 0.25, 0.5, 0.75, 1];
const savedVolume = () => { const v = store.str('toko2.volume'); return v !== '' ? Math.max(0, Math.min(1, Number(v))) : store.num('toko2.mute') === 1 ? 0 : 1; };
sound.setVolume(savedVolume());
const next = (list, v) => list[(list.findIndex((x) => Math.abs(x - v) < 1e-6) + 1) % list.length];
// the music (v58, music.js): on the sound's context, under its master, so VOLUME
// and the sound's mute reach it too; OPTIONS' MUSIC (toko2.music) scales it alone
const music = new Music();
music.setVolume(store.str('toko2.music') !== '' ? Math.max(0, Math.min(1, Number(store.str('toko2.music')))) : 1);
// the announcer (1.x v109): off until OPTIONS turns it on, with its own volume
const announcer = new Announcer();
announcer.on = store.str('toko2.announcer') === 'on';
announcer.volume = store.str('toko2.annVolume') !== '' ? Number(store.str('toko2.annVolume')) : 1;
addEventListener('pointerdown', () => sound.unlock(), { once: true });
addEventListener('keydown', () => sound.unlock(), { once: true });

const ui = new UI({
  // a start from the title plays the intro film first; AGAIN after a run does not (owner, 2026-10-24)
  onStart: (m) => start(m, { intro: true }),
  // the title's HARD switch: ARCADE becomes HARDCADE (toko2.hard)
  hard: () => store.str('toko2.hard') === 'on',
  onHard: () => { store.set('toko2.hard', store.str('toko2.hard') === 'on' ? 'off' : 'on'); showTitle(true); },
  onResume: () => resume(),
  onPause: () => pause(),
  onAgain: () => start(mode, { room: lastRoom }),
  onMenu: () => { recordQuit(); toMenu(); },
  onSound: () => { sound.setVolume(sound.volume > 0 ? 0 : 1); store.set('toko2.volume', sound.volume); refreshMenu(); },
  onVolume: () => { sound.setVolume(next(VOLUMES, sound.volume)); store.set('toko2.volume', sound.volume); sound.unlock(); sound.event?.({ type: 'pickup', kind: 'score' }); refreshMenu(); },
  onMusic: () => { music.setVolume(next(VOLUMES, music.volume)); store.set('toko2.music', music.volume); sound.unlock(); refreshMenu(); },
  onAnnouncer: () => { announcer.on = !announcer.on; store.set('toko2.announcer', announcer.on ? 'on' : 'off'); if (announcer.on) announcer.say('start'); else announcer.stop(); refreshMenu(); },
  onAnnVolume: () => { announcer.volume = next(VOLUMES.slice(1), announcer.volume); store.set('toko2.annVolume', announcer.volume); announcer.last = -1e9; announcer.say('clear'); refreshMenu(); },
  onMotion: () => { store.set('toko2.motion', reduceMotion() ? 'off' : 'on'); if (reduceMotion()) trauma = 0; refreshMenu(); },
  onLang: () => { setLang(LANGS[(LANGS.indexOf(getLang()) + 1) % LANGS.length]); refreshMenu(); },
  onDash: () => { store.set('toko2.dash', DASHES[(DASHES.indexOf(tests().dash) + 1) % DASHES.length]); refreshMenu(); },
  onGelHp: () => { const h = tests().hp; store.set('toko2.gelHp', HP_STEPS[(HP_STEPS.indexOf(h) + 1) % HP_STEPS.length]); refreshMenu(); },
  gels: () => gels(), onGels: () => flipGels(),
  goo: () => gooOn(), onGoo: () => flipGoo(),
  worlds: () => worldsLook(), onWorlds: () => flipWorlds(),
  onSpecimen: (kind, box) => specimen.show(kind, box),
  onTitle: (keep) => (world?.room ? toMenu() : showTitle(keep)),
  onCampaign: () => showCampaign(),
  onRoom: (id) => startRoom(id),
  optionsState: () => ({ sound: sound.on, volume: sound.volume, music: music.volume, announcer: announcer.on, annVolume: announcer.volume, reduceMotion: reduceMotion(), test: tests(),
    ...((list) => ({ records: list.length, frames: record.lastFrames(list) }))(record.read(store)), recordSaid }),
  onRecord: () => shareRecord(),
  onBack: () => { if (state === 'paused') resume(); else if (state === 'over') toMenu(); },
});
// the view of a world change: the swirl, the dark, the fall, the floor running out (render/transit.js)
const transit = new Transit(T, { scenery, juice: actors.juice, ui, t });
// the GOT YOU card's live gel (render/specimen.js)
const specimen = new Specimen(T, actors, scene.environment);

// The title's GELS switch (render/sdf.js): 'classic' meshes or 'sdf' fields,
// localStorage toko2.gels. ?gels=sdf|classic overrides it for a link, until
// the menu changes it (then the URL loses it, so a reload agrees with the
// menu). It takes effect at run start; the menu also redraws the world left
// behind the title in the new style. The HUD label says ' · sdf' while on.
const GELS = ['classic', 'sdf'];
let urlGels = GELS.includes(params.get('gels')) ? params.get('gels') : null;
const gels = () => urlGels ?? (GELS.includes(store.str('toko2.gels')) ? store.str('toko2.gels') : 'classic');
const setLabel = () => { document.getElementById('backend').textContent = ` · ${backend}${actors.gels === 'sdf' ? ' · sdf' : ''}`; };
function flipGels() {
  const g = gels() === 'sdf' ? 'classic' : 'sdf';
  store.set('toko2.gels', g);
  if (urlGels) { urlGels = null; const u = new URL(location.href); u.searchParams.delete('gels'); history.replaceState(history.state, '', u); }
  actors.setGels(g); setLabel(); refreshMenu();
}
actors.setGels(gels()); setLabel();
function flipWorlds() {
  store.set('toko2.worlds', worldsLook() === 'neon' ? 'street' : 'neon');
  if (urlWorlds) { urlWorlds = null; const u = new URL(location.href); u.searchParams.delete('worlds'); history.replaceState(history.state, '', u); }
  refreshMenu();   // it takes effect at the next world change
}
function flipGoo() {
  const on = !gooOn();
  store.set('toko2.goo', on ? 'on' : 'off');
  if (urlGoo) { urlGoo = null; const u = new URL(location.href); u.searchParams.delete('goo'); history.replaceState(history.state, '', u); }
  actors.setGoo(on); actors.gooKit.render(renderer); floor.setFilm(actors.gooKit.film); splats.clear(); refreshMenu();
}
// ?fps: the frame-time line beside the version; ?bench: the fixed 24-body scene (readout.js)
let lastDash = null;   // the sim's last dash event, for the readout's flick line
const readout = new Readout({ renderer, backend, actors, input, lastDash: () => lastDash, on: params.has('fps') || params.has('bench') });

useArena(screenArena());
new ResizeObserver(resize).observe(stage);

// ── the start intro (intro/intro.js): it plays before every ARCADE or
// HARDCADE run started from the title, and never before a retry (owner,
// 2026-10-24: "every time you start the game from the start menu, not when you
// retry after a run"). ?intro plays it on every start; ?nointro (the smoke)
// never. Any press skips it, except in its first moments, which still belong to
// the press that started it.
const intro = new Intro({
  scene, actors, ui, T,
  floor: () => floor, arena: () => arena, camera: () => camera, cameraRest: () => camRest,
  aspect: () => Math.max(1, stage.clientWidth) / Math.max(1, stage.clientHeight),
});
let introT0 = 0, introSfx = null, introSkip = false, introStamp = 0;
let introOff = params.has('nointro');
const introWanted = (asked) => !introOff && (asked || params.has('intro'));
const skipIntro = (e) => { if (state === 'intro' && e.timeStamp - introStamp > 350) introSkip = true; };
addEventListener('pointerdown', skipIntro);
addEventListener('keydown', skipIntro);
const padPressed = () => { for (const p of navigator.getGamepads?.() ?? []) if (p?.buttons.some((b) => b.pressed)) return true; return false; };

function toMenu() {
  transit.reset(floor);
  state = 'menu'; input.enabled = false; ui.setHud(false);
  useArena(screenArena());
  showTitle();
}

function start(m, { intro: asked = false, room = null } = {}) {
  debug.hold = false; debug.freeCam = false;
  mode = MODES.includes(m) ? m : 'arcade';
  if (mode === 'campaign' && !room) room = lastRoom;
  if (mode === 'campaign' && !room) { showCampaign(); return; }
  lastRoom = room;
  useArena(screenArena());
  const test = tests();
  // toko2.gateUsed: this browser has dashed a gate, so the DASH THROUGH! tag
  // is not shown again (1.x's tokoDropGateUsed, main.js:5310, 11166)
  // ?world=2 or 3 starts the run in a later world (a test on the phone)
  const startWorld = Math.max(1, Math.min(T.worlds.list.length, Number(params.get('world')) || 1));
  const turnRoom = arenaName === 'portrait';   // a room lies along the phone, either way up
  world = createWorld({ seed: (Math.random() * 2 ** 32) >>> 0, mode, arena, shape: arenaName, world: mode === 'campaign' ? 1 : startWorld, dashMode: test.dash, hpMult: test.hp, gateUsed: store.num('toko2.gateUsed') === 1,
    room: mode === 'campaign' ? { ...room, turn: turnRoom } : null });
  lost = []; meter.reset(); input.resetCounts();
  if (world.room) useRoom(world);
  else if (world.world > 1) useWorld(world.world, world.hx, world.hz);
  if (world.shapeT) useSurvival();
  splats.clear(); actors.reset(); trauma = 0; transit.reset(floor);
  acc = 0; pendingDash = false;
  sound.unlock();
  actors.setGels(gels()); setLabel();
  ui.hide();
  if (mode !== 'campaign' && introWanted(asked)) {
    state = 'intro'; input.enabled = false; ui.setHud(false);
    ui.bannerEl.hidden = true; ui._bannerT = 0;          // nothing left over from a run before it
    introSkip = false; introStamp = performance.now(); introT0 = performance.now() + 40;
    intro.begin();
    introSfx = sound.ctx && !capture.on ? scheduleIntroSfx(sound.ctx, sound.master, sound.ctx.currentTime + 0.04) : null;
    return;
  }
  go();
}
// the run itself starts: straight from the title, or at the end of the intro
function go() {
  if (state === 'intro') { introSfx?.stop(); introSfx = null; intro.finish(); }
  state = 'play'; input.enabled = true;
  ui.hide(); ui.setHud(true);
  ui.banner(world?.room ? `${world.room.hard ? `${t('hardTag')} · ` : ''}${world.room.level.name} · ${goalText(world.room)}` : mode.toUpperCase(), world?.room ? 1.8 : 1.2);
  announcer.say('start');
}

// ── THE CAMPAIGN (sim/director/campaign.js) ─────────────────────────
// progress is one object in localStorage, a room's best grade by id (1.x tokoDropCampaign)
// and the HARD CAMPAIGN's (v49, the title's HARD switch) is another, its own grades
const CAMPAIGN_KEY = 'toko2.campaign', HARD_KEY = 'toko2.campaign.hard';
const hardOn = () => store.str('toko2.hard') === 'on';
const campaignProgress = (hard = false) => { try { return JSON.parse(store.str(hard ? HARD_KEY : CAMPAIGN_KEY) || '{}') || {}; } catch { return {}; } };
let lastRoom = null;   // AGAIN replays it
const levels = new Map();
async function loadLevel(id) {
  if (!levels.has(id)) levels.set(id, fetch(new URL(`../levels/${id}.json?v=65`, import.meta.url)).then((r) => { if (!r.ok) throw new Error(`levels/${id}.json ${r.status}`); return r.json(); }));
  return levels.get(id);
}
// the list the room screen draws: worlds, their rooms, open or not, best grades
async function campaignList() {
  // a HARD room opens when the one before it is past F on the HARD route AND it is itself past F on the normal one
  const hard = hardOn(), p = campaignProgress(hard), normal = hard ? campaignProgress(false) : null, all = campaignRooms();
  const lv = await Promise.all(all.map((r) => loadLevel(r.id).catch(() => null)));   // each room's level: its name, what it asks, its chart
  return T.campaign.worlds.map((wd, wi) => {
    const mine = all.filter((r) => r.world === wi), rail = `#${wd.rail.toString(16).padStart(6, '0')}`;
    return { name: wd.name, rail, open: roomOpen(mine[0].index, p, normal),
      rooms: mine.map((r) => ({ ...r, level: lv[r.index], name: lv[r.index]?.name ?? r.id.toUpperCase(), d: lv[r.index]?.plan?.d ?? 1, rail,
        hard, open: roomOpen(r.index, p, normal), grade: p[r.id]?.grade ?? null, best: p[r.id]?.pts ?? null })) };
  });
}
// the campaign's end (v54): what every room paid, then the rooms
function campaignDone(p, hard, played) {
  const all = campaignRooms(), tally = { S: 0, A: 0, B: 0, C: 0 };
  for (const r of all) { const g = p[r.id]?.grade; if (g in tally) tally[g]++; }
  const pts = all.reduce((n, r) => n + (p[r.id]?.pts || 0), 0);
  ui.campaignDone({ hard, tally, pts, rooms: all.length }, () => showCampaign(played));
}
async function showCampaign(played = null) {
  if (world && state !== 'menu') { state = 'menu'; input.enabled = false; ui.setHud(false); }
  const list = await campaignList();
  if (played) {
    const flat = list.flatMap((wd) => wd.rooms), i = flat.findIndex((r) => r.id === played.id);
    played.next = played.grade !== 'F' && flat[i + 1]?.open ? flat[i + 1].id : played.id;
  }
  ui.campaign(list, played);
}
async function startRoom(id) {
  const r = campaignRooms().find((x) => x.id === id);
  if (!r) return;
  const level = await loadLevel(id);
  start('campaign', { room: { id, goal: r.goal, kills: r.kills, world: r.world, level, hard: hardOn() } });
}
// a room's floor: its box, and when it is not a rectangle its shape (render/floor.js `region`)
function useRoom(w) {
  shiftOpen = null;   // a room's floor moves by its own region (ch.moving), not a world's shift
  viewWorld = 1; boundsFloor = false; roomFloor = true;
  const hx = w.hx, hz = w.hz, sh = w.region?.shape;
  if (floor) { scene.remove(floor.group); floor.dispose(); }
  actors.setArena(hx, hz);
  const WD = T.campaign.worlds[w.room.world], rail = WD?.rail;
  floor = buildFloor(T, hx, hz, actors.light.texture, { style: 'grid', film: actors.gooKit.film, region: sh ? regionSlots(sh) : null, regionRail: rail, colors: WD?.base ? { base: WD.base, gridHi: WD.gridHi } : null });
  if (rail != null) floor.setRail(rail);
  scene.add(floor.group);
  scenery.build(1, hx, hz);
  camAt.set(0, 0, 0);
  resize();
}

// a campaign world's rule, as the view draws it (sim/rules.js): the rail
// flashes while a sweep or an updraft is coming, and THE VOID's dark closes
// in round the hero — the far side of the room goes black, as 1.x's fog did
const darkEl = Object.assign(document.createElement('div'), { id: 'dark' });
darkEl.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:1;opacity:0';
document.body.appendChild(darkEl);
const _hp = new THREE.Vector3(), _hq = new THREE.Vector3();
function ruleFrame() {
  const S = world?.rule, WD = world?.room ? T.campaign.worlds[world.room.world] : world ? T.worlds.list[world.world - 1] : null;
  if (!S || !WD || state === 'menu') { if (darkEl.style.opacity !== '0') darkEl.style.opacity = '0'; return; }
  if (WD.rail != null) floor.setRail(WD.rail, S.warnT > 0 ? 0.35 + 0.45 * Math.abs(Math.sin(S.warnT * 14)) : 0);
  if (S.kind === 'dark') {
    const D = T.campaign.rules.dark, k = S.dark * (reduceMotion() ? 0.45 : 1), h = world.hero;
    // world units to pixels at the hero, so the dark's radii are the room's
    _hp.set(h.x, 0, h.z).project(camera); _hq.set(h.x + 1, 0, h.z).project(camera);
    const W = innerWidth, H = innerHeight, px = (_hp.x * 0.5 + 0.5) * W, py = (0.5 - _hp.y * 0.5) * H, unit = Math.abs(_hq.x - _hp.x) * 0.5 * W;
    const far = Math.max(W, H) * 1.2, near = D.near * unit, rim = D.far * unit;
    const r0 = near + (far - near) * (1 - k), r1 = rim + (far * 1.4 - rim) * (1 - k);
    darkEl.style.background = `radial-gradient(circle at ${px.toFixed(0)}px ${py.toFixed(0)}px, rgba(0,0,0,0) ${r0.toFixed(0)}px, rgba(1,1,4,0.94) ${Math.max(r0 + 1, r1).toFixed(0)}px)`;
    darkEl.style.opacity = '1';
  } else if (darkEl.style.opacity !== '0') darkEl.style.opacity = '0';
}

function pause() { if (state !== 'play') return; state = 'paused'; input.enabled = false; ui.pause(T.species[world?.killedBy] ? world.killedBy : null); }
function resume() { if (state !== 'paused') return; state = 'play'; input.enabled = true; ui.hide(); }
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });

function finish() {
  state = 'over'; input.enabled = false;
  ui.setHud(false);
  // the play record (js/record.js, v61): every finished room and run, on this phone only
  record.add(store, record.entryFor(world, mode, lost, recordHow()), T.record.cap);
  // a room: its grade is kept; a clear goes back to the rooms, a death to the death screen
  const R = world.roomResult;
  if (R) {
    const hard = !!world.room.hard, p = campaignProgress(hard), was = p[R.id]?.grade;
    // v54: the campaign's end — every room past F on this route, for the first time
    const cleared = (q) => campaignRooms().every((r) => q[r.id]?.grade && q[r.id].grade !== 'F'), doneBefore = cleared(p);
    // the best: a better grade, or a better score (v51: a room is graded on its
    // score; `pts` is a v51 score — an older save's numbers were another scale)
    const val = R.score, old = p[R.id];
    const better = !was || betterGrade(R.grade, was) || (R.grade !== 'F' && !(old?.pts >= val));
    if (better) { p[R.id] = { grade: betterGrade(was ?? 'F', R.grade) ? was : R.grade, pts: R.grade === 'F' ? old?.pts ?? null : Math.max(val, old?.pts ?? 0), kills: R.kills }; store.set(hard ? HARD_KEY : CAMPAIGN_KEY, JSON.stringify(p)); }
    if (R.outcome === 'clear' && R.grade !== 'F') {
      const played = { id: R.id, name: world.room.level.name, grade: R.grade, kills: R.kills, value: val };
      if (!doneBefore && cleared(p)) { campaignDone(p, hard, played); return; }
      showCampaign(played); return;
    }
  }
  const k = bestKey(mode), best = store.num(k), newBest = world.score > best;
  if (newBest) store.set(k, world.score);
  ui.results({
    won: !!world.won,
    room: R ? { ...world.room, name: world.room.level.name, grade: R.grade, outcome: R.outcome, why: R.why, value: R.score } : null,
    mode, score: world.score, best: Math.max(best, world.score), newBest,
    time: timeText(world.time), gotYou: world.killedBy ? T.species[world.killedBy]?.name : null, gotYouKind: !world.won && T.species[world.killedBy] ? world.killedBy : null,
    kills: world.kills, grazes: world.grazes,
  });
}

let podDown = { tick: -1, text: '' };   // this step's pod knock-down, for the dash's banner
// SURVIVAL's floor, each frame: the walls where the sim has them, the rail
// on them, the warning while the next size is coming, and the camera refitted
// while they move
function survivalFrame() {
  const S = world.shapeT, B = floor.bounds, R = T.survival.reshape;
  B.cur.value.set(world.hx, world.hz);
  if (S?.to && S.phase !== 'hold') B.next.value.set(S.to.hx, S.to.hz); else B.next.value.set(world.hx, world.hz);
  B.warn.value = !S ? 0 : S.phase === 'warn' ? Math.min(1, S.t / 0.25) : S.phase === 'move' ? 1 - S.t / R.move : 0;
  floor.border.scale.set(world.hx / survivalMax.hx, 1, world.hz / survivalMax.hz);
  if (world.hx !== fitHx || world.hz !== fitHz) resize();
}

// a world's walls closing in for its challenge (sim/challenge.js squeeze, v37):
// the same floor bounds SURVIVAL draws, on the world's own floor; the camera
// keeps its place
function squeezeFrame() {
  const Z = world.squeeze, B = floor.bounds, S = T.waves.trial.squeeze;
  B.cur.value.set(world.hx, world.hz);
  if (Z && Z.phase !== 'hold') B.next.value.set(Z.to.hx, Z.to.hz); else B.next.value.set(world.hx, world.hz);
  B.warn.value = !Z ? 0 : Z.phase === 'warn' ? Math.min(1, Z.t / 0.25) : Z.phase === 'move' ? 1 - Z.t / S.move : 0;
  if (floorFull) floor.border.scale.set(world.hx / floorFull.hx, 1, world.hz / floorFull.hz);
}

// what the announcer calls, off the sim's events (1.x main.js:2607-11424)
function announce(e) {
  if (!announcer.on) return;
  if (e.type === 'wave') announcer.say(e.kind === 'boss' ? 'boss' : 'wave', e.wave);
  else if (e.type === 'clear') announcer.say('clear');
  else if (e.type === 'hurt' && e.lives > 0) announcer.say('ouch');
  else if (e.type === 'over') announcer.say('gameover');
  // HEAT (v51): the announcer calls the multiplier as it climbs (it called every fifth kill of the streak)
  else if (e.type === 'heat' && e.up && e.mult >= 3) { announcer.say('streak'); ui.heatPop(e.mult); }
  else if (e.type === 'heat' && e.hit) ui.heatPop(1, true);
  else if (e.type === 'heal') ui.banner(`${t(e.n === 1 ? 'lifeBack' : 'livesBack')} +${e.n}`, 1.2);   // HARDCADE's one (v62), ARCADE's all
  else if (e.type === 'bank') ui.banner(`${t('banked')} +${e.n.toLocaleString('en-US')}`, 0.9);
  else if (e.type === 'potLost') ui.banner(`${t('potLost')} −${e.n.toLocaleString('en-US')}`, 1.1);
  else if (e.type === 'pickup') announcer.say(e.kind === 'score' ? 'money' : e.kind === 'scoremult' ? 'mult' : 'prize');
  else if (e.type === 'bounty') announcer.say('bounty');
  else if (e.type === 'bountyPaid') announcer.say('money');
  else if (e.type === 'phase') announcer.say('phase');
  else if (e.type === 'worldLand') announcer.say('world');
}

function onEvent(e) {
  if (e.type === 'dash') lastDash = e;
  if (e.type === 'hurt' && world) lost.push([world.wave, e.by ?? '?']);   // the play record's lives lost (js/record.js)
  if (e.type === 'worldIn') { useWorld(e.world, e.hx, e.hz); splats.clear(); actors.goo?.clear(); }   // the next world's floor, under the falling droplet; the last one's puddles went down the drain with it
  if (e.type.startsWith('world')) transit.onEvent(e, floor, world);
  if (e.type === 'reshape') shake(T.survival.reshape.shake);
  if (e.type === 'shift') shake(T.survival.reshape.shake);
  if (e.type === 'reshaped') splats.prune(e.hx, e.hz);
  debug.counts[e.type] = (debug.counts[e.type] || 0) + 1;
  sound.event(e);
  const cue = cueFor(e);   // the music's answer (music.js): a rule's warning and hit, a hit's flinch, the stings
  if (cue) music.cue(cue[0], cue[1]);
  announce(e);
  input.feel?.(e);
  actors.onEvent(e, world);
  const K = T.shake;
  if (e.type === 'kill') shake(K.kill + K.killPerRadius * e.r + (e.r >= T.death.big ? K.bigKill : 0));
  else if (e.type === 'hurt') { shake(K.hurt); ui.vignette(); }
  else if (e.type === 'over') shake(T.heroLook.deathShake);
  else if (e.type === 'dashBoom') shake(e.shake ?? T.hero.dashBoom.shake);
  else if (e.type === 'shake') shake(e.amount);
  else if (e.type === 'lobLand') shake(T.death.lobSplash.shake);
  else if (e.type === 'milestone') ui.banner(e.score.toLocaleString('en-US'), 1.2);
  // a boss's act change or the surviving twin's rage: 1.x's 1.1 s popup (main.js:10398-10407); the 0.3 shake comes as its own event
  else if (e.type === 'phase') ui.banner(e.label ?? 'BOSS PHASE!', e.dur ?? 1.1);
  else if (e.type === 'wave') ui.banner(`${t('wave')} ${e.wave}${e.label ? ` · ${e.label}` : ''}`, e.dur ?? 1.4);
  // a boss wave's clear comes a beat after its fight's banner: it joins it rather than writing over it (v42)
  else if (e.type === 'clear' && world?.fight?.done) ui.banner(`${bossName(world.fight.kind)} ${t('bossDown')} · ${world.fight.grade} · +${(world.fight.bonus + e.bonus).toLocaleString('en-US')}`, 2.2);
  else if (e.type === 'clear') ui.banner(`${t('wave')} ${e.wave} ${t('clear')} +${e.bonus.toLocaleString('en-US')}`, e.dur ?? 1.0);
  // a challenge wave (v36): what it asks, over the wave's own banner, and how it went
  else if (e.type === 'trial') ui.banner(`${t('wave')} ${e.wave} · ${t('trial')}: ${t(`trial_${e.kind}`)}`, 2.2);
  // a boss wave's fight over (v42): the boss, its grade and what it paid
  else if (e.type === 'bossDown') ui.banner(`${bossName(e.kind)} ${t('bossDown')} · ${e.grade} · +${e.bonus.toLocaleString('en-US')}`, 2.2);
  // a world's floor about to move for a wave (v44, sim/floorshift.js)
  else if (e.type === 'shiftWarn') ui.banner(t(`shift_${e.kind}`), 2.0);
  else if (e.type === 'trialEnd') ui.banner(e.met ? `${t('trialMet')} +${e.bonus.toLocaleString('en-US')}` : t('trialMissed'), 1.6);
  else if (e.type === 'curtainWarn') ui.banner(`${String(e.style || '').toUpperCase()} ${t('curtain')}`, e.t ?? 1.1);
  else if (e.type === 'weapon') {
    const text = e.down ? `${e.fam.toUpperCase()} ${t('podDown')}` : e.up ? `${e.fam.toUpperCase()} ${t('podUp')}` : `${e.fam.toUpperCase()} ${t('pod')}`;
    if (e.down) podDown = { tick: world.tick, text };
    ui.banner(text, 1.2);
  }
  // 1.x's pickup banners (main.js:4439, 11171, 11189, 11197), which overwrite one another as 1.x's did
  else if (e.type === 'gateDash') { if (e.banner) ui.banner(t(e.dud ? 'dud' : 'greenRush'), e.banner); }
  else if (e.type === 'gateChain') ui.banner(`${t('gateChain')} ×${e.n}! +${e.pay.toLocaleString('en-US')}`, e.banner);
  else if (e.type === 'bountyPaid') ui.banner(`${t('bounty')} +${e.pay.toLocaleString('en-US')}!`, e.banner);
  // one hit that knocks down both a level-2 pod and a level-2 dash (hero.js
  // hurtHero) says both in one banner, rather than the second hiding the first
  else if (e.type === 'dashLevel') ui.banner(e.down ? (podDown.tick === world.tick ? `${podDown.text} · ${t('dashDown')}` : t('dashDown')) : `${t('dashUp')} · LV${e.level}`, 1.2);
  else if (e.type === 'gateUsed') store.set('toko2.gateUsed', 1);
}

// the music's say this frame (music.js): the title's on the menus, the run's
// own while it plays (worldWant: its song, its heat's level, a boss, the
// rule), ducked while paused, and nothing under the intro, while a run dies
// (its sting has the floor) or on its results
const MUSIC_TITLE = { song: 'title', level: 3, lull: false, boss: false, urgent: false, dark: 0, pan: 0, fade: null };
const MUSIC_QUIET = { song: null, fade: null };
function musicFrame() {
  if (sound.ctx && !music.ctx) music.attach(sound.ctx, sound.master);
  if (!music.ctx) return;
  const run = world && (state === 'play' || state === 'paused');
  music.set(state === 'menu' ? MUSIC_TITLE : run ? worldWant(world) : MUSIC_QUIET);
  music.set({ duck: state === 'paused', silent: sound.volume <= 0 });
  music.frame();
}

// screen-axis input → the world. The camera looks down with the far edge at
// the top, so screen-down is +z (unless the view is turned: screenToWorld);
// the mouse aims at the floor under it, and
// a cursor within the hero's own radius gives no aim (1.x main.js:9228-9237).
function toWorld(inp) {
  const [mx, mz] = screenToWorld(turn, inp.mx, inp.my), [ax, az] = screenToWorld(turn, inp.ax, inp.ay);
  const out = { mx, mz, ax, az, aim: inp.aim, fire: inp.fire, dash: false };
  if (inp.source === 'keys' && input.mouse.seen && world) {
    const r = renderer.domElement.getBoundingClientRect();
    _ndc.set(((input.mouse.x - r.left) / r.width) * 2 - 1, -((input.mouse.y - r.top) / r.height) * 2 + 1);
    _ray.setFromCamera(_ndc, camera);
    if (_ray.ray.intersectPlane(_plane, _hit)) {
      const dx = _hit.x - world.hero.x, dz = _hit.z - world.hero.z, d = Math.hypot(dx, dz);
      if (d > T.hero.radius) { out.ax = dx / d; out.az = dz / d; out.aim = true; }
    }
  }
  return out;
}

// a simple bot (shoot the nearest gel, back away from it): look checks and the intro film's tail
function botInput(w) {
  const h = w.hero; let near = null, nd = Infinity;
  for (const g of w.gels) { if (g.state !== 'active') continue; const d = Math.hypot(g.x - h.x, g.z - h.z); if (d < nd) { nd = d; near = g; } }
  return near
    ? { mx: -(near.x - h.x) / nd - h.x / w.hx, mz: -(near.z - h.z) / nd - h.z / w.hz, ax: (near.x - h.x) / nd, az: (near.z - h.z) / nd, aim: true, fire: true, dash: false }
    : { mx: 0, mz: 0, ax: 1, az: 0, aim: true, fire: true, dash: false };
}

// The intro's review film is captured frame by frame from the real game:
// capture.on stops the animation loop, and debug.capFrame(seconds) draws the
// frame at that time since the run was started (the intro, then the run under
// the bot). debug.introWav(seconds) renders the intro's cues offline.
const capture = { on: false, bot: false, t0: 0 };

// ── the loop ───────────────────────────────────────────────────────
const debug = {
  THREE, renderer, scene, camera, backend, input, ui, actors,
  get arena() { return arenaBox(); }, splats,
  frames: 0, ready: false, counts: {},
  announcer, music, get world() { return world; }, get state() { return state; }, get turn() { return turn; }, get lastDash() { return lastDash; },
  floor: () => floor,
  get following() { return !!following; }, get viewWorld() { return viewWorld; }, get floorStyle() { return floor?.style; }, camAt, scenery, transit,
  arenaFor: (n, shape) => worldsSim.arenaFor(n, shape),
  // the run straight to its world's boss wave, the floor emptied (the smoke's
  // boss-fight check, v42), and the bosses put down by hand
  bossWave() {
    if (!world || !world.dir || world.room) return false;
    for (const g of world.gels) g.alive = false;
    world.gels = []; world.dir.queue = []; world.dir.gapT = 1e-9;
    world.dir.wave = (worldsSim.on(world) ? world.world : 1) * T.waves.rhythm.bossEvery - 1;
    return true;
  },
  killBosses() { let n = 0; for (const g of world?.gels ?? []) if (g.alive && g.isBoss) { simApi.kill(world, g); n++; } return n; },
  // straight on to the next world, as if its boss had just been cleared
  // (the smoke and the look checks; ?world= starts a run there instead)
  nextWorld() {
    if (!world || world.trans || !worldsSim.on(world) || world.world >= worldsSim.last()) return false;
    for (const g of world.gels) g.alive = false;
    world.gels = []; world.dir.queue = []; world.dir.gapT = 0; world.dir.wave = world.world * T.waves.rhythm.bossEvery;
    world.events.length = 0;
    worldsSim.begin(world);
    for (const e of world.events) onEvent(e);   // outside a step, so its events are handed on here
    return true;
  },
  // stop and restart the drawing: the smoke's flick is thrown with the loop
  // stopped, so each touch event is delivered on its own rather than
  // coalesced behind a slow software-GPU frame
  loop(on) { capture.on = !on; },
  start, pause, resume, toMenu, specimen,
  // ?nointro, switched at run time: the smoke turns the film back on to check it plays from the title only
  get nointro() { return introOff; }, set nointro(v) { introOff = !!v; }, room: (id) => startRoom(id), get rule() { return world?.rule ?? null; },
  // the GELS style ('classic' | 'sdf'), for the smoke and the captures; the readout
  get gels() { return actors.gels; }, setGels(g) { urlGels = GELS.includes(g) ? g : null; actors.setGels(gels()); setLabel(); }, readout,
  // Look checks for one species (test/lookshot.mjs): a quiet arena with only
  // these bodies in it, the hero standing below them.
  showcase(kinds, { spacing = 4, heroZ = 0.6 } = {}) {
    start('arcade');
    world.director = { step() {} };
    const n = kinds.length;
    kinds.forEach((k, i) => simApi.spawn(world, k, (i - (n - 1) / 2) * spacing, 0, { appear: false }));
    world.hero.x = 0; world.hero.z = world.hz * heroZ; world.hero.px = 0; world.hero.pz = world.hero.z;
    debug.hold = true;                 // the run only moves when idle() says so
    return world.gels.map((g) => ({ id: g.id, kind: g.kind, x: g.x, z: g.z, r: g.r }));
  },
  // step the run with the hero standing still (optionally shooting at `aimAt`)
  idle(seconds, aimAt = null) {
    const n = Math.round(seconds / T.sim.dt);
    for (let i = 0; i < n && !world.over; i++) {
      const h = world.hero, a = aimAt ? Math.atan2(aimAt.z - h.z, aimAt.x - h.x) : 0;
      step(world, { mx: 0, mz: 0, ax: Math.cos(a), az: Math.sin(a), aim: !!aimAt, fire: !!aimAt, dash: false });
      for (const e of world.events) onEvent(e);
      actors.stepFx(T.sim.dt, i * T.sim.dt); splats.step(T.sim.dt); actors.goo?.render(renderer);
    }
  },
  // step the run under one fixed input (a look check of a dash, say): `inp`
  // is the sim's input, and its `dash` is an edge, so only the first step dashes
  act(inp, seconds) {
    const n = Math.round(seconds / T.sim.dt);
    for (let i = 0; i < n && !world.over; i++) {
      step(world, { mx: 0, mz: 0, ax: 1, az: 0, aim: false, fire: false, ...inp, dash: i === 0 ? (typeof inp.dash === 'object' ? inp.dash : !!inp.dash) : false });
      for (const e of world.events) onEvent(e);
      actors.stepFx(T.sim.dt, i * T.sim.dt); splats.step(T.sim.dt); actors.goo?.render(renderer);
    }
  },
  // the goo (render/goo.js), for the smoke and the look checks: drops alive,
  // 1.x's puddles on the floor, and the film round (x, z) read back
  async gooAt(x, z) {
    const g = actors.goo;
    return { on: !!g, drops: g ? g.n : 0, splats: splats.s.filter((p) => p.on).length, ...(g ? await g.film.probe(renderer, x, z) : { wet: 0, dry: 0, covered: 0 }) };
  },
  // Look checks: one of every pickup round the hero (sim/pickups.js stage),
  // drawn from the next frame on
  stagePickups() { return world ? stagePk(world) : null; },
  // the campaign's end screen as the saves stand (v54), for the smoke and look checks
  campaignDone(hard = false) { campaignDone(campaignProgress(hard), hard, null); },
  freeCam: false, hold: false,
  intro, INTRO,
  capBegin(m = 'arcade') { capture.on = true; capture.bot = true; start(m, { intro: true }); introT0 = 0; last = 0; return state; },
  capFrame(t) { frame(t * 1000, 1 / 30); return { state, t }; },
  // a song rendered offline (music.js renderMusicWav), as base64 WAV: the review films and marketing cuts
  async musicWav(id, o) { const b = await renderMusicWav(id, o); let s = ''; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000)); return btoa(s); },
  async introWav(seconds = INTRO.end + 0.5) { const b = await renderIntroSfxWav(seconds, T.audio.master); let s = ''; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000)); return btoa(s); },
  // Look checks: run the game ahead under a simple bot (shoot the nearest
  // gel, back away from it) with every event handled, so a screenshot can be
  // of the middle of a fight rather than its first second.
  advance(seconds) {
    if (!world) return;
    const n = Math.round(seconds / T.sim.dt);
    for (let i = 0; i < n && !world.over; i++) {
      const h = world.hero; let near = null, nd = Infinity;
      for (const g of world.gels) { if (g.state !== 'active') continue; const d = Math.hypot(g.x - h.x, g.z - h.z); if (d < nd) { nd = d; near = g; } }
      const inp = near
        ? { mx: -(near.x - h.x) / nd - h.x / world.hx, mz: -(near.z - h.z) / nd - h.z / world.hz, ax: (near.x - h.x) / nd, az: (near.z - h.z) / nd, aim: true, fire: true, dash: false }
        : { mx: 0, mz: 0, ax: 1, az: 0, aim: true, fire: true, dash: false };
      step(world, inp);
      for (const e of world.events) onEvent(e);
      if (i % 4 === 0) { actors.stepFx(T.sim.dt * 4, i * T.sim.dt); splats.step(T.sim.dt * 4); }
      // the goo's film catches up in half-second steps: a step a frame here
      // would queue hundreds of GPU passes ahead of the next real frame
      if (i % 30 === 29) actors.goo?.render(renderer, 0.5);
    }
  },
};
window.__toko = debug;

let last = performance.now();
toMenu();
function frame(now, dtFixed) {
  const wall = now - last, dt = dtFixed ?? Math.min(0.1, wall / 1000), time = now / 1000;
  last = now;
  GEL_TIME.value = time;
  ui.pollPad(); ui.tick(dt);
  const inp = input.read(null);
  let introT = 0;

  if (state === 'intro') {
    introT = (now - introT0) / 1000;
    if (introT >= INTRO.end || introSkip || (!capture.on && introT > 0.35 && padPressed())) go();
  }
  if (state === 'intro') {
    // the run is built but holds still: the intro owns the screen
  } else if (state === 'play' && debug.hold) {
    // a look check: hold still
  } else if (state === 'play') {
    if (inp.pause) pause();
    else {
      // a flick's direction is the screen's; the sim wants the world's
      if (inp.dash && typeof inp.dash === 'object' && !pendingDash) {
        const [dx, dz] = screenToWorld(turn, inp.dash.dirX, inp.dash.dirY);
        pendingDash = { kind: inp.dash.kind, sL: inp.dash.sL, sV: inp.dash.sV, dx, dz };
      } else pendingDash ||= inp.dash;
      const w = capture.bot ? botInput(world) : toWorld(inp);
      acc += dt;
      let steps = 0;
      while (acc >= T.sim.dt && steps < T.sim.maxSteps && !world.over) {
        w.dash = pendingDash; pendingDash = false;
        step(world, w);
        for (const e of world.events) onEvent(e);
        acc -= T.sim.dt; steps++;
      }
      if (steps === T.sim.maxSteps) acc = Math.min(acc, T.sim.dt);   // a slow frame drops its backlog, not the game
      meter.frame(wall, steps * T.sim.dt);   // the play record's frame times (js/meter.js)
      if (world.over) { state = 'dying'; dyingT = T.flow.deathBeat; input.enabled = false; }
    }
  } else if (state === 'paused') {
    if (inp.pause) resume();
  } else if (state === 'dying') {
    if ((dyingT -= dt) <= 0) finish();
  }

  if (world) {
    const a = state === 'play' ? acc / T.sim.dt : 1;
    actors.pickups.playing = state === 'play';   // 1.x drew its gate and bounty tags only while playing (main.js:5893, 6018)
    actors.sync(world, a, time);
    // a look check's hold freezes the effects too: they move only when idle() steps them
    if (state !== 'paused' && !(state === 'play' && debug.hold)) { actors.stepFx(dt, time); splats.step(dt); }
    const h = world.hero;
    floor.setPlayer(h.px + (h.x - h.px) * a, h.pz + (h.z - h.pz) * a);
    if (world.ch?.moving && world.region) floor.setRegion?.(regionSlots(world.region.shape));   // a campaign room's floor that moves (sim/shape.js)
    // an arcade world's floor moving for a wave (v44), and whole again after it
    else if (shiftOpen) floor.setRegion?.(world.shift?.phase === 'on' && world.region ? regionSlots(world.region.shape) : shiftOpen);
    ui.hud(world);
  } else { floor.setPlayer(0, 0); actors.light.clear(); }
  transit.frame(world, floor);
  if (world && boundsFloor) survivalFrame();
  else if (world && floor.bounds && !world.room) squeezeFrame();
  ruleFrame();
  musicFrame();
  trauma = Math.max(0, trauma - T.shake.decay * dt);
  const m = trauma * trauma, A = T.shake.amp, F = T.shake.freq;
  follow(dt, world && state === 'play' ? acc / T.sim.dt : 1);
  if (!debug.freeCam) camera.position.set(camRest.x + camAt.x + Math.sin(time * F[0]) * m * A[0], camRest.y + Math.sin(time * F[1]) * m * A[1], camRest.z + camAt.z + Math.sin(time * F[2]) * m * A[2]);
  if (state === 'intro') intro.frame(introT, world);   // after sync: the intro poses the hero
  ui.drawSticks(input, following && world && state === 'play' ? offscreen() : null);
  actors.light.render(renderer);   // the arena's light map, which the floor reads
  if (actors.goo) { actors.goo.render(renderer); floor.setFilm(actors.goo.film); }   // the goo's film steps (render/goo.js), and the floor reads where it now is
  renderer.render(scene, state === 'intro' ? intro.cam : camera);
  if (state === 'paused' || state === 'over') specimen.render(renderer, time); else specimen.hide();   // the GOT YOU card's gel, over its box
  readout.frame(now, state, world);
  debug.frames++;
}
renderer.setAnimationLoop(() => { if (!capture.on) frame(performance.now()); });
debug.ready = true;
try { sessionStorage.removeItem('toko2.reloads'); } catch (e) { /* private mode */ }   // the game came up: index.html's reload count starts again
if (params.has('bench')) debug.bench = readout.bench(debug);
