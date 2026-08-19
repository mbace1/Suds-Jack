import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(ROOT, 'game.js'), 'utf8');
const index = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

const listeners = new Map();
let raf = null;
let now = 0;

const makeElement = () => ({
  textContent: '',
  innerHTML: '',
  className: '',
  style: {},
  classList: {
    names: new Set(),
    add(name) { this.names.add(name); },
    remove(name) { this.names.delete(name); },
    contains(name) { return this.names.has(name); }
  },
  addEventListener(type, fn) { this.listeners ||= new Map(); this.listeners.set(type, fn); },
  querySelector() { return null; }
});

const gradient = { addColorStop() {} };
const draw = new Proxy({
  createRadialGradient: () => gradient,
  setTransform() {}, save() {}, restore() {}, translate() {},
  fillRect() {}, strokeRect() {}, beginPath() {}, moveTo() {}, lineTo() {},
  closePath() {}, stroke() {}, arc() {}, fillText() {}
}, {
  get(target, key) { return key in target ? target[key] : () => {}; },
  set(target, key, value) { target[key] = value; return true; }
});

const canvas = makeElement();
canvas.getContext = () => draw;
const score = makeElement();
const best = makeElement();
const lives = makeElement();
const wave = makeElement();
const play = makeElement();
const glitch = makeElement();
const overlayTag = makeElement();
const overlaySub = makeElement();
const overlayHowto = makeElement();
const overlayHint = makeElement();
const overlay = makeElement();
overlay.classList.add('show');
overlay.querySelector = selector => ({
  '.tag': overlayTag,
  '.sub': overlaySub,
  '.howto': overlayHowto,
  '.hint': overlayHint
}[selector]);

const elements = { c: canvas, score, best, lives, wave, overlay, play, glitch };
const storage = new Map();
const sandbox = {
  console,
  Math,
  Date,
  setTimeout,
  clearTimeout,
  innerWidth: 1280,
  innerHeight: 720,
  devicePixelRatio: 1,
  document: { getElementById: id => elements[id] },
  navigator: { getGamepads: () => [] },
  localStorage: {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, String(value))
  },
  matchMedia: () => ({ matches: false }),
  requestAnimationFrame: fn => { raf = fn; },
  addEventListener: (type, fn) => listeners.set(type, fn)
};
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(source, sandbox, { filename: 'game.js' });

const frame = () => {
  assert.equal(typeof raf, 'function', 'game keeps a requestAnimationFrame loop');
  const next = raf;
  raf = null;
  now += 1000 / 60;
  next(now);
};
const frames = count => { for (let i = 0; i < count; i++) frame(); };
const key = code => {
  listeners.get('keydown')({ code, preventDefault() {} });
  listeners.get('keyup')({ code });
};

frames(1800);
let state = sandbox.__sudz.state();
assert.equal(state.mode, 'title');
assert.equal(state.slices, 31, 'terrain recycles to a fixed slice budget');
assert.ok(state.things.length < 12, 'title objects leave the horizon instead of accumulating forever');
assert.ok(state.things.some(thing => thing.depth > 0.2), 'title objects advance toward the player');

key('Enter');
state = sandbox.__sudz.state();
assert.equal(state.mode, 'play', 'Enter starts through the public input path');
assert.equal(state.things.length, 1, 'a run starts with one readable orb');
const firstDepth = state.things[0].depth;

frames(60);
state = sandbox.__sudz.state();
const firstOrb = state.things.find(thing => thing.kind === 'orb' && thing.lane === 4);
assert.ok(firstOrb && firstOrb.depth > firstDepth + 0.12, 'the opening orb travels down the mesh');

frames(270);
state = sandbox.__sudz.state();
assert.ok(state.score >= 100, 'the opening orb reaches the player and scores');
assert.ok(state.things.every(thing => thing.depth < 1.06), 'passed objects are removed');

for (let i = 0; i < 240 && sandbox.__sudz.state().mode === 'play'; i++) {
  if (i % 45 === 0 && sandbox.__sudz.state().player.onGround) key('Space');
  frame();
}
state = sandbox.__sudz.state();
assert.ok(state.wave >= 2 || state.mode === 'over', 'survival advances into explicit waves');

for (let i = 0; i < 7200 && sandbox.__sudz.state().mode === 'play'; i++) frame();
state = sandbox.__sudz.state();
assert.equal(state.mode, 'over', 'three collisions end the run');
assert.equal(state.lives, 0);
assert.ok(overlay.classList.contains('show'), 'game over returns a visible restart surface');
assert.equal(play.textContent, 'PLAY AGAIN');

key('Enter');
state = sandbox.__sudz.state();
assert.equal(state.mode, 'play', 'Enter restarts after game over');
assert.equal(state.lives, 3);
assert.equal(state.wave, 1);

assert.match(index, /game\.js\?v=51/);
assert.match(index, /hub\/shell\.js\?v=17/);
assert.match(index, /id="wave"/);

console.log('Suds Jack core gate: 19 checks passed');
