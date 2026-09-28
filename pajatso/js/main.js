// PACHI PIT — boot, the loop, and the wiring between the engine (which knows
// the rules and the physics), the view (which knows what things look like),
// the HUD (which knows what to press) and the speakers.

import * as THREE from 'three';
import { Engine } from './engine.js?v=7';
import { Eye, QUALITY } from './view/render.js?v=7';
import { Room } from './view/room.js?v=7';
import { Machine, edgeZ, M, bx, by } from './view/machine.js?v=7';
import { Hud } from './hud.js?v=7';
import { bindInput } from './input.js?v=7';
import { sfx, initAudio, setMuted, isMuted } from './audio.js?v=7';
import { CHARMS, DEALS } from './data.js?v=7';

const params = new URLSearchParams(location.search);
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode: nothing kept */ } },
};
const BEST = 'pachiPit.best';

const newSeed = () => (params.get('seed') ? Number(params.get('seed')) : (Date.now() % 1e9)) >>> 0;
let engine = new Engine({ seed: newSeed() });
const eye = new Eye(document.getElementById('gl'), { quality: params.get('px') ?? store.get('pachiPit.px', matchMedia('(pointer: coarse)').matches ? 'crisp' : 'fine') });
const room = new Room(eye.scene, eye.env);
const machine = new Machine(eye.scene, eye.env);
setMuted(store.get('pachiPit.muted', false));

let paused = false, started = params.has('skip'), ending = null;
const fx = { bandit: 0, win: 0, shake: 0, lookUp: false, dim: 1 };
let lookUpT = 0, ringT = 0;

const $ = id => document.getElementById(id);
// a thumb feels the machine: short buzzes where a phone can, silent where not,
// and off with the sound
const buzz = p => { try { if (!isMuted() && navigator.vibrate) navigator.vibrate(p); } catch { /* not a phone */ } };

// ── what the HUD and the input can do ──────────────────────────────────
const actions = {
  turn(st) { if (ending) return; eye.turnTo(st); },
  startShift() {
    if (engine.phase === 'due') { eye.turnTo('atm'); return; }
    if (engine.startShift()) { machine.pullLever(); machine.emptyTray(); sfx.lever(); }
  },
  deposit(n) { if (engine.deposit(n)) sfx.deposit(); else sfx.deny(); },
  settle() { engine.settle(); },
  buy(i) { if (engine.buy(i)) sfx.buy(); else sfx.deny(); },
  sell(i) { if (engine.sell(i)) sfx.beep(); },
  reroll() { if (engine.reroll()) sfx.beep(); else sfx.deny(); },
  pick(i) { if (engine.pickDeal(i)) { sfx.beep(); setTimeout(() => eye.turnTo('machine'), 500); } },
  setPower(p) { engine.setPower(p); },
  nudgePower(d) { engine.setPower(engine.power + d); },
  fireDown() { initAudio(); engine.hold(true); engine.fire(); },
  fireUp() { engine.hold(false); },
  mute() { setMuted(!isMuted()); store.set('pachiPit.muted', isMuted()); $('mute').textContent = isMuted() ? '×' : '♪'; },
  pause() { if (!started || ending) return; paused ? resume() : pause(); },
  restart() { restart(); },
  endless() { $('end').hidden = true; ending = null; engine.continueEndless(); eye.turnTo('door'); },
  voice() { sfx.voice(); },
};
const hud = new Hud(actions);
$('mute').textContent = isMuted() ? '×' : '♪';

const input = bindInput(eye.renderer.domElement, {
  blocked: () => !started || paused || !!ending,
  station: () => eye.station,
  phase: () => engine.phase,
  turn: actions.turn,
  hold: on => { if (on) initAudio(); engine.hold(on); },
  tap: () => engine.fire(),
  lever: () => actions.startShift(),
  nudgePower: actions.nudgePower,
  deposit: actions.deposit,
  settleOrDeposit: () => { if (engine.phase === 'due') actions.settle(); else actions.deposit(Infinity); },
  buy: actions.buy, reroll: actions.reroll, pick: actions.pick,
  nav: d => hud.nav(eye.station, d),
  activate: () => hud.activate(eye.station),
  pause: actions.pause, mute: actions.mute,
  look: (x, y) => eye.parallax.set(x, y),
  padConfirm: () => { if (!started) begin(); else if (paused) resume(); else if (ending) document.querySelector('#end .big')?.click(); },
});

function pause() { paused = true; engine.hold(false); $('paused').hidden = false; $('resume').focus(); }
function resume() { paused = false; $('paused').hidden = true; }
$('resume').addEventListener('click', resume);
$('restart').addEventListener('click', () => { resume(); restart(); });
const QNAMES = Object.keys(QUALITY);
const qLabel = () => { $('quality').textContent = `PIXELS: ${eye.quality.toUpperCase()}`; };
qLabel();
$('quality').addEventListener('click', () => {
  eye.setQuality(QNAMES[(QNAMES.indexOf(eye.quality) + 1) % QNAMES.length]);
  store.set('pachiPit.px', eye.quality); qLabel();
});

// keep a phone's screen awake through a shift; a refusal changes nothing
let wake = null;
async function stayAwake() {
  try { if (!wake && navigator.wakeLock) { wake = await navigator.wakeLock.request('screen'); wake.addEventListener?.('release', () => { wake = null; }); } } catch { wake = null; }
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && started) stayAwake(); });

function begin() {
  started = true;
  $('title').hidden = true;
  initAudio();
  stayAwake();
  eye.turnTo('machine');
}
$('start').addEventListener('click', begin);
if (started) $('title').hidden = true;

function restart() {
  engine = new Engine({ seed: params.get('seed') ? newSeed() + Math.floor(Math.random() * 1e6) : newSeed() });
  machine.emptyTray();
  machine.falling.length = 0;
  ending = null;
  $('end').hidden = true;
  eye.fall = 0;
  eye.turnTo('machine');
  hud.sig = {};
}

// ── a 3D point on the screen, for the floating numbers ─────────────────
const _v = new THREE.Vector3();
function toScreen(x, y, z) {
  _v.set(x, y, z).project(eye.camera);
  return [(_v.x * 0.5 + 0.5) * innerWidth, (-_v.y * 0.5 + 0.5) * innerHeight, _v.z < 1];
}
const trayPoint = () => toScreen(0, M.TRAY_Y + 0.03, edgeZ() + 0.06);
let trayAcc = 0, trayAccT = 0;

// ── what happened in the machine, as sound and light ───────────────────
function onEvent(ev) {
  switch (ev.t) {
    case 'launch': sfx.launch(); buzz(6); break;
    case 'tick': if (ev.what === 'windmill') sfx.windmill(); else sfx.tick(ev.v, ev.x); break;
    case 'pocket': {
      sfx.pocket(ev.kind); buzz(ev.kind === 'start' ? 22 : 14);
      const p = engine.board.L.byId[ev.pocket];
      if (p && eye.station === 'machine') {
        const [sx, sy] = toScreen(bx(p.x), by(p.y + 3), M.BOARD_Z);
        const label = { start: 'SPIN', tulip: `+${engine.rules.tulipPay}`, pocket: '+2¢', attacker: `+${4}` }[ev.kind] ?? '';
        hud.pop(sx, sy, ev.stamped && ev.stamped !== 'copper' ? `${label} ${ev.stamped.toUpperCase()}` : label, ev.stamped === 'silver' || ev.stamped === 'gold' ? 'silver' : '');
      }
      break;
    }
    case 'tulip': sfx.tulip(ev.open); break;
    case 'warp': sfx.warp(); break;
    case 'foul': sfx.foul(); hud.toast('FOUL', 'too weak to clear the rail — it rolls back', 'red', 900); break;
    case 'rattle': sfx.rattle(); eye.shake = 0.3; break;
    case 'land': case 'tumble': sfx.clink(); break;
    case 'hopper': sfx.hopper(); break;
    case 'stroke': sfx.stroke(); break;
    case 'collect': {
      const c = engine.pusher; void c;
      machine.spill(ev.x, ev.kind, ev.value);
      sfx.spill(ev.value);
      if (ev.value >= 5) buzz(ev.value >= 25 ? [20, 30, 20] : 12);
      trayAcc += ev.value; trayAccT = 0.35;
      break;
    }
    case 'gutter': sfx.gutter(); break;
    case 'reelStop': sfx.reelStop(); break;
    case 'reach': sfx.reach(); fx.win = 0.4; buzz(30); break;
    case 'spinEnd':
      if (ev.outcome === 'miss') sfx.miss();
      else if (ev.outcome !== 'seven' && ev.outcome !== 'mask') {
        sfx.win(ev.outcome); fx.win = 1;
        hud.toast(`${ev.outcome.toUpperCase()} ×3`, 'coins into the hopper — the pusher still has to give them to you', 'green', 1600);
      }
      break;
    case 'fever':
      sfx.fever(); fx.win = 1.5; buzz([40, 50, 40, 50, 90]);
      hud.toast('FEVER!', `${ev.drops} free coins · the gate is open · SHOOT RIGHT ▸`, 'big', 2600, true);
      break;
    case 'feverEnd': sfx.feverEnd(); break;
    case 'bandit':
      room.grab(ev.trapped); sfx.bandit(ev.trapped); fx.bandit = 1.6; buzz([90, 60, 140]);
      hud.toast(ev.trapped ? 'CAUGHT!' : `BANDIT −${ev.took}¢`, ev.trapped ? 'the mousetrap got his hand' : 'three Tokos: a hand comes down for your wallet', 'red', 2400, true);
      if (eye.station === 'machine') { lookUpT = 1.5; eye.turnTo('up'); }
      break;
    case 'shiftStart':
      // the very first shift of a run says how to hold the handle
      if (ev.deadline === 1 && ev.shift === 1) hud.toast('SHIFT 1', hud.touch ? 'drag the power into the green WAY · hold FIRE' : 'power into the green WAY (← →) · hold SPACE', '', 3600, true);
      else hud.toast(`SHIFT ${ev.shift}`, `${ev.drops} coins on the house`, '', 1200);
      break;
    case 'shiftEnd': {
      sfx.powerDown();
      const it = ev.interest ? ` · interest +${ev.interest}` : '';
      hud.toast(`+${ev.tray.value}¢`, `this shift${it}`, 'green', 2200, true);
      break;
    }
    case 'due': hud.toast('THE DEBT IS DUE', `${engine.debt} — turn to the ATM`, 'big', 2600, true); break;
    case 'deposit': break;
    case 'paid':
      sfx.lock(); buzz([20, 40, 20]);
      hud.toast('PAID', `padlock ${ev.deadline} is on the floor`, 'green', 2200, true);
      setTimeout(() => eye.turnTo('door'), 700);
      break;
    case 'ring': ringT = 0.01; break;
    case 'deal': hud.toast(DEALS.find(d => d.id === ev.id)?.name ?? 'DEAL', 'done', '', 1400, true); break;
    case 'prize': hud.toast('PRIZE!', ev.charm ? CHARMS.find(c => c.id === ev.charm)?.name : `+${ev.coins}¢`, 'big', 2400, true); sfx.win('coin'); break;
    case 'pawned': hud.toast('PAWNED', CHARMS.find(c => c.id === ev.charm)?.name ?? '', 'red', 1600, true); break;
    case 'fell': finish('fell'); break;
    case 'won': finish('won'); break;
  }
}

function finish(kind) {
  ending = kind;
  engine.hold(false);
  const best = Math.max(store.get(BEST, 0) || 0, engine.stats.value);
  store.set(BEST, best);
  if (kind === 'fell') {
    sfx.fall();
    eye.turnTo('machine');
    setTimeout(() => { fallingT = 0.001; }, 500);
    setTimeout(() => hud.end('fell', engine, best), 2600);
  } else {
    sfx.door();
    eye.turnTo('door');
    setTimeout(() => hud.end('won', engine, best), 2800);
  }
}
let fallingT = 0;

// ── the arcade's corner ─────────────────────────────────────────────────
// The shell puts HOME in the top-left corner and, under a thumb, a Toko button
// beside it; the deadline starts where the last of them ends, and upright the
// debt row runs full width underneath. MEASURED, not reserved: a fixed 104px
// fitted the branch's shell and sat the live site's newer one, which has the
// Toko button, on top of the deadline.
function corner() {
  let right = 0, bottom = 0;
  for (const b of document.querySelectorAll('.arcade-home, .arcade-toko')) {
    const r = b.getBoundingClientRect();
    if (r.width && r.top < 90) { right = Math.max(right, r.right); bottom = Math.max(bottom, r.bottom); }
  }
  const css = document.documentElement.style;
  if (right) { css.setProperty('--corner', `${Math.ceil(right) + 10}px`); css.setProperty('--corner-b', `${Math.ceil(bottom) + 4}px`); }
  else { css.removeProperty('--corner'); css.removeProperty('--corner-b'); }
}
new MutationObserver(corner).observe(document.body, { childList: true });
addEventListener('toko:seat', () => requestAnimationFrame(corner));
addEventListener('resize', corner);
corner();

// ── the layout: which way the screen is, and what the HUD leaves free ───
// The insets are RESERVED per layout, not measured off whichever panel is up,
// or the machine would lurch every time the lever turned into the handle.
function layout() {
  const wide = innerWidth / innerHeight >= 1.15 && innerWidth >= 640;
  document.body.classList.toggle('wide', wide);
  document.body.classList.toggle('tall', !wide);
  const top = (document.getElementById('top').getBoundingClientRect().bottom || 60) + (wide ? 6 : 36);
  eye.setInsets('machine', top, wide ? 64 : 236);
  // the other stations fit above their own panel
  const st = eye.station;
  if (st !== 'machine' && st !== 'up') {
    const panel = document.getElementById(`p-${st}`);
    const r = panel && !panel.hidden ? panel.getBoundingClientRect() : null;
    // wide: the panel is a column on the right and the station stands left of
    // it; tall: the panel is at the bottom and the station stands above it
    if (wide) eye.setInsets(st, top, 64, r && r.width ? innerWidth - r.left + 10 : 0);
    else eye.setInsets(st, top, r && r.height ? innerHeight - r.top + 6 : 64, 0);
  }
}

// ── the loop ───────────────────────────────────────────────────────────
let lastT = performance.now(), time = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.1, (now - lastT) / 1000);
  lastT = now;
  if (paused) { eye.render(time); return; }
  time += dt;
  input.tick(dt);
  if (started && !ending) engine.update(dt);
  else if (ending) engine.update(dt * 0.3);
  for (const ev of engine.drain()) onEvent(ev);
  fx.bandit = Math.max(0, fx.bandit - dt); fx.win = Math.max(0, fx.win - dt * 1.5);
  if (lookUpT > 0) { lookUpT -= dt; if (lookUpT <= 0 && eye.station === 'up') eye.turnTo('machine'); }
  fx.lookUp = eye.station === 'up';
  if (ringT > 0 && engine.phase === 'phone') { ringT -= dt; if (ringT <= 0) { sfx.ring(); ringT = 2.2; } }
  if (trayAccT > 0) {
    trayAccT -= dt;
    if (trayAccT <= 0 && trayAcc > 0 && eye.station === 'machine') {
      const [sx, sy] = trayPoint();
      hud.pop(sx, sy - 20, `+${trayAcc}¢`, trayAcc >= 5 ? 'silver' : '');
      trayAcc = 0;
    } else if (trayAccT <= 0) trayAcc = 0;
  }
  if (fallingT > 0) { fallingT += dt; eye.fall = Math.min(8, fallingT * fallingT * 3); }
  eye.shake = Math.max(eye.shake, engine.board.shake);
  layout();
  machine.update(engine, dt, time);
  room.update(engine, dt, time, fx);
  eye.update(dt, time);
  eye.render(time);
  hud.update(engine, eye.station === 'up' ? 'machine' : eye.station, dt);
}
requestAnimationFrame(frame);
addEventListener('resize', () => eye.resize());

// ── the seam the browser gate drives ───────────────────────────────────
window.__pp = {
  get engine() { return engine; },
  eye, room, machine, hud, THREE,
  pause, resume,
  get paused() { return paused; },
  get started() { return started; },
  get ending() { return ending; },
  debug: {
    begin,
    // run the machine forward without waiting for frames: a sandbox with no
    // GPU renders this at a few frames a second, so the gate drives time
    advance(s) { const step = 1 / 30; for (let t = 0; t < s; t += step) { engine.update(step); for (const ev of engine.drain()) onEvent(ev); } },
    turn: st => eye.turnTo(st),
    station: () => eye.station,
    frameCount: () => eye.renderer.info.render.frame,
  },
};
