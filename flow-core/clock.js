// The deterministic clock.
//
// Simulation runs on WHOLE INTEGER TICKS and nothing else. Render interpolates
// between them. This is the single decision that makes seeded replay possible:
// if agent positions accumulated a floating-point `dt`, a seed would reproduce
// the events but not the movement, and the contract test would fail
// intermittently on frame-rate alone — the most expensive kind of bug to chase.
//
// So: real time goes in, whole ticks come out, and the simulation never sees a
// float. Speed and pause change how many ticks a second buys, never the size
// of one.

export const TICK_MS = 100;              // 10 ticks a second
export const TICKS_PER_DAY = 600;        // one "day" is a minute of real time

export class Clock {
  constructor({ ticksPerDay = TICKS_PER_DAY } = {}) {
    this.tick = 0;
    this.ticksPerDay = ticksPerDay;
    this.paused = true;                  // planning pauses time (brief, Draw)
    this.speed = 1;                      // 1 | 2 | 4
    this.acc = 0;
    this.maxCatchUp = 8;                 // a backgrounded tab must not fast-forward
  }

  get day() { return Math.floor(this.tick / this.ticksPerDay); }
  get dayProgress() { return (this.tick % this.ticksPerDay) / this.ticksPerDay; }

  setPaused(p) { this.paused = !!p; if (this.paused) this.acc = 0; }
  setSpeed(s) { this.speed = s; }

  // Feed real milliseconds, get the number of whole ticks to run. The
  // remainder stays in the accumulator, so no time is invented or lost.
  pending(ms) {
    if (this.paused) return 0;
    this.acc += ms * this.speed;
    let n = Math.floor(this.acc / TICK_MS);
    this.acc -= n * TICK_MS;
    if (n > this.maxCatchUp) { this.acc = 0; n = this.maxCatchUp; }
    return n;
  }

  advance() { this.tick += 1; return this.tick; }

  // Render-side only. Never let this reach the simulation.
  alpha() { return this.paused ? 0 : this.acc / TICK_MS; }
}
