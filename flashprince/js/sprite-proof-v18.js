import { Screen } from './screen.js';
import { Input } from './input.js';
import RUN from './run-v15-data.js';
import STOP from './stop-v15-data.js';
import {
  JUMP, LAND, JUMP_HOLD, JUMP_DX, JUMP_DY, LAND_HOLD, LAND_DX,
} from './action-v18-data.js';

const PAL = [
  '#05070a', '#172126', '#29343a', '#2a4665', '#d0d8d8', '#4f78a8',
  '#be704e', '#17191c', '#8fc8c0', '#518480', '#d6e8dc',
];
const CH = { S: 8, T: 9, P: 5, D: 3, K: 6, H: 7, L: 10 };
const GROUND_Y = 169;
const IDLE = STOP[STOP.length - 1];
const START_N = Math.min(6, RUN.length);
const RUN_HOLD = [5,4,3,3,4,3,3,4,5,4,3,3,4,3,3,4,5,4,3,3];

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

function drawSprite(screen, rle, x, y, face, sourceFacesRight = false) {
  for (const [sx, sy, code] of pixels(rle)) {
    const color = CH[code];
    const drawX = sourceFacesRight === (face > 0) ? sx : 31 - sx;
    if (color !== undefined) screen.rect(Math.round(x - 16) + drawX, Math.round(y - 44) + sy, 1, 1, color);
  }
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
    this.airMode = 'stand';
    this.resumeRun = false;
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
      else if (dir) { this.face = dir; this.go('start'); }
    } else if (this.state === 'start') {
      if (this.input.jumpPress) this.beginJump(true);
      else {
        const done = this.advance(5, START_N);
        this.x += (0.24 + this.frame * 0.12) * this.face;
        if (!dir) this.go('stop');
        else if (dir !== this.face) { this.nextFace = dir; this.go('reverseStop'); }
        else if (done) this.beginRun();
      }
    } else if (this.state === 'run') {
      if (this.input.jumpPress) this.beginJump(true);
      else {
        this.advanceRun();
        this.x += 1.22 * this.face;
        if (!dir) this.go('stop');
        else if (dir !== this.face) { this.nextFace = dir; this.go('reverseStop'); }
      }
    } else if (this.state === 'stop' || this.state === 'reverseStop') {
      const reversing = this.state === 'reverseStop';
      const done = this.advance(5, STOP.length);
      if (this.frame < 5) this.x += Math.max(0.12, 0.68 - this.frame * 0.12) * this.face;
      if (done) {
        if (reversing) { this.face = this.nextFace; this.go('start'); }
        else this.go('idle');
      }
    } else if (this.state === 'jump') {
      const scale = this.airMode === 'run' ? 1 : 0.18;
      if (this.advanceAction(JUMP_HOLD, JUMP_DX, JUMP_DY, scale)) {
        this.y = GROUND_Y;
        this.resumeRun = this.airMode === 'run' && dir === this.face;
        this.go('land');
      }
    } else if (this.state === 'land') {
      const scale = this.airMode === 'run' ? 1 : 0.15;
      if (this.advanceAction(LAND_HOLD, LAND_DX, null, scale)) {
        if (this.resumeRun && dir === this.face) this.beginRun();
        else this.go('idle');
      }
    }

    this.x = Math.max(34, Math.min(286, this.x));
    this.input.flush();
  }

  sprite() {
    if (this.state === 'start') return RUN[Math.min(this.frame, START_N - 1)];
    if (this.state === 'run') return RUN[this.frame];
    if (this.state === 'stop' || this.state === 'reverseStop') return STOP[this.frame];
    if (this.state === 'jump') return JUMP[this.frame];
    if (this.state === 'land') return LAND[this.frame];
    return IDLE;
  }

  paint() {
    const s = this.screen;
    s.clear(0);
    s.rect(0, 0, 320, GROUND_Y, 1);
    s.rect(0, GROUND_Y, 320, 23, 2);
    s.rect(0, GROUND_Y, 320, 2, 4);
    const actionFrame = this.state === 'jump' || this.state === 'land';
    drawSprite(s, this.sprite(), this.x, this.y, this.face, actionFrame);
    s.text('FLASH PRINCE — RASTER ACTION STUDY v18', 8, 8, 4, 6);
    s.text('RUN / PLANT / LONG JUMP / LAND', 8, 18, 4, 6);
    s.present();
  }

  snapshot() {
    return { version: 18, state: this.state, frame: this.frame, x: this.x, y: this.y, face: this.face };
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
