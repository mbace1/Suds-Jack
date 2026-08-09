import { Screen } from './screen.js';
import { Input } from './input.js?v=20';
import {
  IDLE, START, RUN, STOP, STAND_JUMP, STAND_LAND, RUN_JUMP, RUN_LAND, STOP_HOLD,
  STAND_JUMP_HOLD, STAND_JUMP_DX, STAND_JUMP_DY, STAND_LAND_HOLD, STAND_LAND_DX,
  RUN_JUMP_HOLD, RUN_JUMP_DX, RUN_JUMP_DY, RUN_LAND_HOLD, RUN_LAND_DX,
} from './motion-v20-data.js';
import {
  STAND_TURN, RUN_TURN, STAND_TURN_HOLD, RUN_TURN_HOLD, RUN_TURN_DX,
  STAND_TURN_FLIP, RUN_TURN_FLIP,
} from './turn-v21-data.js';

const PAL = [
  '#05070a', '#0d171c', '#26343c', '#39477e', '#c8d2cc', '#7378c9',
  '#d17f61', '#522f1c', '#9a6a2a', '#61451e', '#bcc1ca', '#b8345f',
  '#eea67e', '#1c1715', '#8f93de', '#bf8b39',
];
const CH = { S: 8, T: 9, P: 5, D: 3, K: 6, H: 7, L: 10, M: 11, N: 12, O: 13, Q: 14, J: 15 };
const GROUND_Y = 169;
const START_N = 6;
// v23 changes artwork only; the approved v19 cadence and movement stay locked.
const RUN_HOLD = [5,4,3,3,4,3,3,4,5,4,3,3,4,3,3,4,5,4,3,3];
const RUN_SPEED = 1.22;
const LOCKED_RUN_SIGNATURE = '7df439ed';

function runSignature() {
  let hash = 2166136261;
  const source = `${RUN.join('|')}|${START.slice(0, START_N).join('|')}|${RUN_HOLD.join(',')}|${START_N}|${RUN_SPEED}`;
  for (const char of source) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

if (runSignature() !== LOCKED_RUN_SIGNATURE) throw new Error('Approved Flash Prince run changed');

function unpack(rle) {
  let out = '', i = 0;
  while (i < rle.length) {
    const count = parseInt(rle[i++], 36);
    out += rle[i++].repeat(count);
  }
  return out;
}

const PIXELS = new Map();
function pixels(rle) {
  if (PIXELS.has(rle)) return PIXELS.get(rle);
  const raw = unpack(rle), out = [];
  for (let i = 0; i < raw.length; i++) if (raw[i] !== '.') out.push([i % 32, (i / 32) | 0, raw[i]]);
  PIXELS.set(rle, out);
  return out;
}

const UPSCALED = new Map();
function scale2(source, width, height) {
  const out = new Array(width * height * 4);
  const at = (x, y) => source[Math.max(0, Math.min(height - 1, y)) * width + Math.max(0, Math.min(width - 1, x))];
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const e = at(x, y), b = at(x, y - 1), d = at(x - 1, y), f = at(x + 1, y), h = at(x, y + 1);
    const p = (y * 2 * width * 2) + x * 2;
    out[p] = d === b && d !== h && b !== f ? d : e;
    out[p + 1] = b === f && b !== d && f !== h ? f : e;
    out[p + width * 2] = d === h && d !== b && h !== f ? d : e;
    out[p + width * 2 + 1] = h === f && d !== h && b !== f ? f : e;
  }
  return out;
}

function upscaleCanvas(rle) {
  if (UPSCALED.has(rle)) return UPSCALED.get(rle);
  let grid = [...unpack(rle)], width = 32, height = 44;
  grid = scale2(grid, width, height); width *= 2; height *= 2;
  grid = scale2(grid, width, height); width *= 2; height *= 2;
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  const context = canvas.getContext('2d'), image = context.createImageData(width, height);
  for (let i = 0; i < grid.length; i++) {
    const color = CH[grid[i]];
    if (color === undefined) continue;
    const hex = PAL[color], p = i * 4;
    image.data[p] = parseInt(hex.slice(1, 3), 16);
    image.data[p + 1] = parseInt(hex.slice(3, 5), 16);
    image.data[p + 2] = parseInt(hex.slice(5, 7), 16);
    image.data[p + 3] = 255;
  }
  context.putImageData(image, 0, 0); UPSCALED.set(rle, canvas); return canvas;
}

function drawSprite(screen, rle, x, y, face, sourceFacesRight = false) {
  for (const [sx, sy, code] of pixels(rle)) {
    const color = CH[code];
    const drawX = sourceFacesRight === (face > 0) ? sx : 31 - sx;
    if (color !== undefined) screen.rect(Math.round(x - 16) + drawX, Math.round(y - 44) + sy, 1, 1, color);
  }
}

function drawUpscaledSprite(screen, rle, x, y, face, sourceFacesRight = false) {
  const d = screen.dctx, image = upscaleCanvas(rle), left = screen.ox + (x - 16) * screen.scale;
  const top = screen.oy + (y - 44) * screen.scale, width = 32 * screen.scale, height = 44 * screen.scale;
  const flip = sourceFacesRight !== (face > 0);
  d.save(); d.imageSmoothingEnabled = true;
  if (flip) { d.translate(left + width, top); d.scale(-1, 1); d.drawImage(image, 0, 0, width, height); }
  else d.drawImage(image, left, top, width, height);
  d.restore();
}

export class MotionStudy {
  constructor() {
    this.screen = new Screen(document.querySelector('#screen'));
    this.screen.setPalette(PAL);
    this.input = new Input(this.screen);
    this.x = 72;
    this.y = GROUND_Y;
    this.face = 1;
    this.state = 'idle';
    this.frame = 0;
    this.tick = 0;
    this.nextFace = 1;
    this.turnFromFace = 1;
    this.airMode = 'stand';
    this.resumeRun = false;
    this.renderMode = 'classic';
    try { if (localStorage.getItem('flashPrinceRender') === 'upscale') this.renderMode = 'upscale'; } catch {}
    const menu = document.querySelector('#control-menu');
    for (const [mode, label] of [['classic', 'CLASSIC PIXELS'], ['upscale', '4× UPSCALE']]) {
      const button = document.createElement('button'); button.dataset.render = mode; button.textContent = label; menu?.append(button);
    }
    document.querySelectorAll('[data-render]').forEach(button => button.addEventListener('click', () => {
      this.renderMode = button.dataset.render;
      try { localStorage.setItem('flashPrinceRender', this.renderMode); } catch {}
      document.querySelector('#control-menu')?.classList.remove('open');
    }));
    this.acc = 0;
    this.last = performance.now();
    requestAnimationFrame(t => this.loop(t));
  }

  go(state) {
    this.state = state;
    this.frame = 0;
    this.tick = 0;
  }

  advance(rate, max, loop = false) {
    this.tick++;
    if (this.tick < rate) return false;
    this.tick = 0;
    if (loop) {
      this.frame = (this.frame + 1) % max;
      return false;
    }
    if (this.frame >= max - 1) return true;
    this.frame++;
    return false;
  }

  advanceRun() {
    this.tick++;
    const hold = RUN_HOLD[this.frame % RUN.length] || 4;
    if (this.tick >= hold) {
      this.tick = 0;
      this.frame = (this.frame + 1) % RUN.length;
    }
  }

  advanceAction(holds, dx, dy = null, xScale = 1) {
    const index = this.frame;
    const hold = holds[index] || 3;
    this.x += ((dx[index] || 0) / hold) * this.face * xScale;
    if (dy) this.y += (dy[index] || 0) / hold;
    this.tick++;
    if (this.tick < hold) return false;
    this.tick = 0;
    if (index >= holds.length - 1) return true;
    this.frame++;
    return false;
  }

  beginRun() {
    this.state = 'run';
    this.frame = START_N % RUN.length;
    this.tick = 0;
  }

  beginTurn(state, nextFace) {
    this.turnFromFace = this.face;
    this.nextFace = nextFace;
    this.go(state);
  }

  advanceTurn(holds, flipFrame, dx = null) {
    const index = this.frame;
    const hold = holds[index] || 4;
    this.face = index < flipFrame ? this.turnFromFace : this.nextFace;
    if (dx) this.x += ((dx[index] || 0) / hold) * this.face;
    this.tick++;
    if (this.tick < hold) return false;
    this.tick = 0;
    if (index >= holds.length - 1) return true;
    this.frame++;
    return false;
  }

  beginJump(running) {
    const dir = this.input.dir;
    if (dir) this.face = dir;
    this.airMode = running ? 'run' : 'stand';
    this.resumeRun = running;
    this.go('jump');
    this.input.consume('jump');
  }

  step() {
    this.input.poll();
    const dir = this.input.dir;

    if (this.state === 'idle') {
      if (this.input.jumpPress) this.beginJump(false);
      else if (dir && dir !== this.face) this.beginTurn('standTurn', dir);
      else if (dir) this.go('start');
    } else if (this.state === 'standTurn') {
      if (this.advanceTurn(STAND_TURN_HOLD, STAND_TURN_FLIP)) {
        this.face = this.nextFace;
        if (dir === this.face) this.go('start');
        else if (dir) this.beginTurn('standTurn', dir);
        else this.go('idle');
      }
    } else if (this.state === 'start') {
      if (this.input.jumpPress) this.beginJump(true);
      else {
        const done = this.advance(5, START_N);
        this.x += (0.24 + this.frame * 0.12) * this.face;
        if (!dir) this.go('stop');
        else if (dir !== this.face) this.beginTurn('runTurn', dir);
        else if (done) this.beginRun();
      }
    } else if (this.state === 'run') {
      if (this.input.jumpPress) this.beginJump(true);
      else {
        this.advanceRun();
        this.x += RUN_SPEED * this.face;
        if (!dir) this.go('stop');
        else if (dir !== this.face) this.beginTurn('runTurn', dir);
      }
    } else if (this.state === 'runTurn') {
      if (this.advanceTurn(RUN_TURN_HOLD, RUN_TURN_FLIP, RUN_TURN_DX)) {
        this.face = this.nextFace;
        if (dir === this.face) this.beginRun();
        else if (dir) this.beginTurn('standTurn', dir);
        else this.go('idle');
      }
    } else if (this.state === 'stop') {
      const done = this.advanceAction(STOP_HOLD, []);
      if (this.frame < 6) this.x += Math.max(0.08, 0.62 - this.frame * 0.1) * this.face;
      if (done) this.go('idle');
    } else if (this.state === 'jump') {
      const running = this.airMode === 'run';
      const holds = running ? RUN_JUMP_HOLD : STAND_JUMP_HOLD;
      const dx = running ? RUN_JUMP_DX : STAND_JUMP_DX;
      const dy = running ? RUN_JUMP_DY : STAND_JUMP_DY;
      if (this.advanceAction(holds, dx, dy)) {
        this.y = GROUND_Y;
        this.resumeRun = this.airMode === 'run' && dir === this.face;
        this.go('land');
      }
    } else if (this.state === 'land') {
      const running = this.airMode === 'run';
      const holds = running ? RUN_LAND_HOLD : STAND_LAND_HOLD;
      const dx = running ? RUN_LAND_DX : STAND_LAND_DX;
      if (this.advanceAction(holds, dx)) {
        if (this.resumeRun && dir === this.face) this.beginRun();
        else this.go('idle');
      }
    }

    this.x = Math.max(34, Math.min(286, this.x));
    this.input.flush();
  }

  sprite() {
    if (this.state === 'standTurn') return STAND_TURN[this.frame];
    if (this.state === 'runTurn') return RUN_TURN[this.frame];
    if (this.state === 'start') return START[Math.min(this.frame, START_N - 1)];
    if (this.state === 'run') return RUN[this.frame];
    if (this.state === 'stop') return STOP[this.frame];
    if (this.state === 'jump') return (this.airMode === 'run' ? RUN_JUMP : STAND_JUMP)[this.frame];
    if (this.state === 'land') return (this.airMode === 'run' ? RUN_LAND : STAND_LAND)[this.frame];
    return IDLE[0];
  }

  paint() {
    const s = this.screen;
    s.clear(0);
    s.rect(0, 0, 320, GROUND_Y, 1);
    s.rect(0, GROUND_Y, 320, 23, 2);
    s.rect(0, GROUND_Y, 320, 2, 4);
    const frame = this.sprite();
    const sourceFacesRight = true;
    if (this.renderMode === 'classic') drawSprite(s, frame, this.x, this.y, this.face, sourceFacesRight);
    s.text('FLASH PRINCE — UNIFIED CHARACTER v23', 8, 8, 4, 6);
    s.text(`LOCKED TIMING / UNIFIED ART — ${this.renderMode === 'upscale' ? '4X' : 'PIXEL'}`, 8, 18, 4, 6);
    s.present();
    if (this.renderMode === 'upscale') drawUpscaledSprite(s, frame, this.x, this.y, this.face, sourceFacesRight);
  }

  snapshot() {
    return { version: 23, state: this.state, frame: this.frame, x: this.x, y: this.y, face: this.face, nextFace: this.nextFace, airMode: this.airMode, renderMode: this.renderMode, runSignature: LOCKED_RUN_SIGNATURE };
  }

  loop(time) {
    this.acc += Math.min(80, time - this.last);
    this.last = time;
    while (this.acc >= 16.666) { this.step(); this.acc -= 16.666; }
    this.paint();
    requestAnimationFrame(t => this.loop(t));
  }
}

const game = new MotionStudy();
window.__fpProof = { state: () => game.snapshot() };
