import { P } from './proj.js';
import { COL } from './palette.js';

export const S_MIN = -2.0;   // inner sidewalk edge (just shy of the mailbox lane)
export const S_MAX =  5.2;   // far edge of the road
const STEER_S  = 4.6;        // lanes/sec at full lock
const MERCY    = 1.6;

export class Player {
  constructor() {
    this.alive = false;
    this.baseSpeed = 5.5;     // forward units/sec
    this.speed = 0;
    this.s = 0; this.f = 0;
    this._mercy = 0; this._lean = 0; this._wheel = 0;
  }
  get invincible() { return this._mercy > 0; }
  reset() { this.alive = true; this._mercy = 0; this.s = 0; this.f = 0; this._lean = 0; }
  setBaseSpeed(v) { this.baseSpeed = v; }
  crash() { if (this.invincible || !this.alive) return false; this._mercy = MERCY; return true; }

  update(dt, steer, throttle) {
    if (!this.alive) return;
    this.speed = Math.max(this.baseSpeed * 0.5, this.baseSpeed * (1 + 0.4 * throttle));
    this.f += this.speed * dt;
    this.s += steer * STEER_S * dt;
    this.s = Math.max(S_MIN, Math.min(S_MAX, this.s));
    this._lean += ((steer * 0.5) - this._lean) * Math.min(1, dt * 10);
    this._wheel += this.speed * dt * 3;
    if (this._mercy > 0) this._mercy -= dt;
  }

  draw(ctx, scrollF) {
    if (!this.alive) return;
    // Blink during mercy frames
    if (this._mercy > 0 && Math.floor(this._mercy * 14) % 2 === 0) return;

    const b = P(this.s, this.f, 0, scrollF);
    const lean = this._lean * 6;

    // shadow
    ctx.fillStyle = COL.shadow;
    ctx.beginPath(); ctx.ellipse(b.x, b.y + 1, 13, 6, 0, 0, Math.PI * 2); ctx.fill();

    // wheels (viewed from behind, roughly in line going up)
    const wob = Math.sin(this._wheel) * 0.6;
    ctx.fillStyle = COL.wheel;
    for (const dy of [-2, -18]) {
      ctx.beginPath(); ctx.ellipse(b.x + lean * (dy < -10 ? 1.4 : 1), b.y + dy, 6, 8, 0, 0, Math.PI * 2); ctx.fill();
    }
    // frame
    ctx.strokeStyle = COL.bike; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(b.x + lean, b.y - 2); ctx.lineTo(b.x + lean * 1.4, b.y - 18); ctx.stroke();
    ctx.strokeStyle = COL.bikeDark; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(b.x + lean * 1.5 - 7, b.y - 20); ctx.lineTo(b.x + lean * 1.5 + 7, b.y - 20); ctx.stroke();

    // rider
    const rx = b.x + lean * 1.7, ry = b.y - 26 + wob;
    ctx.fillStyle = COL.jersey;                              // torso
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(rx - 8, ry - 6, 16, 18, 4) : ctx.rect(rx - 8, ry - 6, 16, 18); ctx.fill();
    ctx.fillStyle = COL.skin;                                // head
    ctx.beginPath(); ctx.arc(rx, ry - 12, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = COL.helmet;                              // helmet
    ctx.beginPath(); ctx.arc(rx, ry - 13, 7.5, Math.PI, Math.PI * 2); ctx.fill();
    ctx.fillRect(rx - 7.5, ry - 14, 15, 3);
  }

  hide() { this.alive = false; }
}
