// readout.js — `?fps`: one line of frame times beside the version, in both gel
// styles, so a phone screenshot carries the numbers a comparison needs; and
// `?bench`: a fixed scene of 24 bodies, measured the same way, its result
// left on screen. SwiftShader cannot say what a phone does; this can.
//
//   SDF · webgpu · 1830×824@2 · 24 gels (24 sdf) · p50 16.7 · p95 18.9 · max 41 ms · cap 60 Hz · sim 1.00x · 31 draws
//
//   p50/p95/max  frame intervals over the last 300 frames (max shows hitches
//                apart from the steady cost)
//   cap          the refresh the browser allows: the fastest 5% of frames
//                (Safari's 60 Hz on a ProMotion iPad, Low Power Mode's 30)
//   sim          game time over wall time while playing: a slow frame drops
//                its backlog (TUNING.sim.maxSteps), and that shows here
//   draws        the main pass's draw calls, read right after it
//   flick        (v18) the aim stick's last let-go as js/flick.js read it —
//                its stroke in px and peak px/ms, and the dash it bought —
//                or what it was instead (a let-go, a tap: no dash)
// The window restarts on every state change and skips a run's first 2 s.

const RING = 300, SKIP = 2, EVERY = 0.5;

export class Readout {
  constructor({ renderer, backend, actors, input, lastDash, on }) {
    this.r = renderer; this.backend = backend; this.actors = actors; this.input = input; this.lastDash = lastDash; this.on = !!on;
    this.dt = new Float32Array(RING); this.n = 0; this.i = 0;
    this.last = 0; this.shown = 0; this.state = null; this.since = 0;
    this.sim0 = null; this.wall0 = 0; this.ratio = null; this.result = null;
    if (!this.on) return;
    const el = (this.el = document.createElement('div'));
    el.id = 'fps';
    el.style.cssText = 'position:fixed;z-index:5;pointer-events:none;right:max(12px,env(safe-area-inset-right));' +
      'bottom:calc(max(10px,env(safe-area-inset-bottom)) + 18px);font-size:11px;letter-spacing:.04em;color:var(--ink);opacity:.82;' +
      'text-align:right;max-width:calc(100vw - 24px);white-space:normal;line-height:1.35;text-shadow:0 0 3px #000';
    document.body.appendChild(el);
  }

  // a fresh window: a new state, a new style, a bench starting to measure
  restart(now) { this.n = 0; this.i = 0; this.sim0 = null; this.ratio = null; void now; }

  // once a frame, right after the main render
  frame(now, state, world) {
    if (!this.on) return;
    if (state !== this.state) { this.state = state; this.since = now; this.restart(now); }
    const dt = now - this.last; this.last = now;
    const draws = this.r.info.render.drawCalls;
    if (state === 'play' && (now - this.since) / 1000 < SKIP) { this.sim0 = null; return; }
    if (dt > 0 && dt < 2000) { this.dt[this.i] = dt; this.i = (this.i + 1) % RING; this.n = Math.min(RING, this.n + 1); }
    if (state === 'play' && world) {
      if (this.sim0 === null) { this.sim0 = world.time; this.wall0 = now; }
      else if (now > this.wall0) this.ratio = (world.time - this.sim0) / ((now - this.wall0) / 1000);
    }
    if (this.result || (now - this.shown) / 1000 < EVERY) return;
    this.shown = now;
    this.el.textContent = this.line(draws, state === 'play' && !this.holding ? this.ratio : null);
  }

  stats() {
    const a = Array.from(this.dt.subarray(0, this.n)).sort((x, y) => x - y), q = (p) => a[Math.min(a.length - 1, Math.floor(p * a.length))];
    return a.length ? { p50: q(0.5), p95: q(0.95), max: a[a.length - 1], cap: 1000 / q(0.05), n: a.length } : null;
  }

  line(draws, ratio) {
    const c = this.r.domElement, A = this.actors, s = this.stats();
    let sdf = 0;
    for (const v of A.views.values()) if (v.sdf) sdf++;
    const f = (x) => x.toFixed(1);
    return [
      A.gels.toUpperCase(), this.backend, `${c.width}×${c.height}@${+this.r.getPixelRatio().toFixed(2)}`,
      `${A.views.size} gels (${sdf} sdf)`,
      s ? `p50 ${f(s.p50)} · p95 ${f(s.p95)} · max ${Math.round(s.max)} ms · cap ${Math.round(s.cap)} Hz` : 'measuring',
      `sim ${ratio == null ? '-' : ratio.toFixed(2) + 'x'}`, `${draws} draws`, this.flick(),
    ].filter(Boolean).join(' · ');
  }

  flick() {
    const g = this.input?.lastGesture, d = this.lastDash?.();
    if (!g) return '';
    if (g.kind !== 'flick') return `${g.kind}: no dash`;
    const dash = d?.kind === 'flick' ? ` → ${d.d.toFixed(1)} u at ${Math.round(d.v)} u/s` : '';
    return `flick ${Math.round(g.lenPx)} px ${g.pxPerMs.toFixed(2)} px/ms${dash}`;
  }

  // ?bench: 24 wave-one bodies in a fixed grid, the run held still, a short
  // burst of fire every second so hits and dents are in it; 2 s to warm up,
  // 10 s measured, and the result stays on screen
  async bench(debug, { warm = 2, measure = 10 } = {}) {
    if (!this.on) return null;
    const kinds = ['globbo', 'yela', 'spittor', 'fanner'];
    debug.showcase(Array.from({ length: 24 }, (_, i) => kinds[i % 4]));
    const w = debug.world, cols = 6, rows = 4, sx = Math.min(3.4, (w.hx * 2 - 4) / cols), sz = Math.min(3.0, (w.hz * 2 - 6) / rows);
    const grid = w.gels.map((g, i) => [((i % cols) - (cols - 1) / 2) * sx, (Math.floor(i / cols) - (rows - 1) / 2) * sz - w.hz * 0.15]);
    // the same 24 every second: back in their places, and too tough to die
    const place = () => w.gels.forEach((g, i) => { g.x = g.px = grid[i][0]; g.z = g.pz = grid[i][1]; g.hp = 1e9; });
    place();
    this.holding = true;
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const poke = () => {
      const h = w.hero; let near = null, nd = Infinity;
      for (const g of w.gels) { const d = Math.hypot(g.x - h.x, g.z - h.z); if (d < nd) { nd = d; near = g; } }
      debug.idle(0.05, near ? { x: near.x, z: near.z } : null);
      place();
    };
    this.el.textContent = `BENCH · warming up ${warm} s`;
    for (let s = 0; s < warm; s++) { poke(); await sleep(1000); }
    this.restart(performance.now());
    for (let s = 0; s < measure; s++) { poke(); await sleep(1000); if (this.el) this.el.textContent = `BENCH · ${s + 1}/${measure} s · ` + this.line(this.r.info.render.drawCalls, null); }
    this.result = `BENCH ${measure} s · ` + this.line(this.r.info.render.drawCalls, null);
    this.el.textContent = this.result;
    return this.result;
  }
}
