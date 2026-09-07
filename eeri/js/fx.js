// EERI — visual feedback (the FX pack).
//
// **This module is deliberately peripheral.** Nothing in the game imports it
// yet; `dev/dev-menu.js` drives it through `dev.html`, and an effect is
// ported into `main.js` as an explicit call only once the owner has looked
// at it and approved it. That order is the whole point of the pack: feel is
// a thing you judge by watching, and a system that has to be rewritten to
// be judged never gets judged.
//
// Two rules it is built around, both from CLAUDE_HANDOFF.md:
//
//  1. **Do not rewrite working EERI systems to integrate this.** So this
//     file knows nothing about the player, the level, or the machine. It
//     takes "something happened at (x, y)" and draws it.
//  2. **No binary assets.** Particles are geometry and colour, like every
//     other thing this repo draws.
//
// THE SPLIT THAT MATTERS: three.js is **injected, not imported**. The spec
// (how many particles, what colour, how long they live) and the simulation
// (where they are this frame) are plain data and plain maths, so
// `test/fx-smoke.mjs` can run the whole thing in bare node with no browser
// and no GPU — the same trick that lets `test/rooms.mjs` prove a room. The
// THREE binding is a thin adapter bolted on by `attach()`.

// ---- the spec ------------------------------------------------------------
//
// One entry per event the game can produce. Tuning lives HERE and nowhere
// else — the dev menu edits this object live, which is what makes a look
// approvable in one sitting rather than one recompile at a time.
//
// `spread` is in world units/sec, `life` in seconds, `gravity` in u/s².
// Colours are palette roles resolved by the caller, so no effect invents a
// colour (ART_BRIEF §3.2, the make-or-break rule).

export const FX_SPEC = {
  // a bolt going in: small, bright, upward, gone fast. It must read at a
  // glance without ever competing with the thing you are running toward.
  pickup: {
    n: 8, life: 0.42, size: 0.11, spread: 2.6, up: 3.2, gravity: -6,
    colour: 'MACHINE', fade: 'out', spin: 6,
  },
  // a stomp: wide and flat, because the verb is downward force. The ring
  // sells the impact more than the count does.
  stomp: {
    n: 14, life: 0.34, size: 0.13, spread: 5.5, up: 1.4, gravity: -14,
    colour: 'STEEL1', fade: 'out', spin: 10, flat: true,
  },
  // digging: heavy, dull, falls back down. Dirt does not sparkle.
  dirt: {
    n: 18, life: 0.62, size: 0.16, spread: 3.4, up: 4.2, gravity: -18,
    colour: 'EARTH1', fade: 'out', spin: 3,
  },
  // brick: sharper and faster than dirt, and it keeps its edges
  brick: {
    n: 16, life: 0.7, size: 0.14, spread: 4.8, up: 5.0, gravity: -20,
    colour: 'EARTH2', fade: 'out', spin: 8,
  },
  // a heavy machine action — a girder landing. Few, big, slow: weight is
  // communicated by things moving SLOWLY, not by more of them.
  heavy: {
    n: 10, life: 0.85, size: 0.22, spread: 2.2, up: 1.6, gravity: -9,
    colour: 'STEEL2', fade: 'out', spin: 1.5,
  },
  // level clear: the only celebratory one, and the only one allowed to be
  // generous, because it happens once
  clear: {
    n: 30, life: 1.15, size: 0.15, spread: 6.5, up: 7.0, gravity: -10,
    colour: 'MACHINE', fade: 'out', spin: 5,
  },
};

// ---- the simulation, in plain numbers ------------------------------------

/**
 * A pool of particles with no renderer attached. Deterministic when given a
 * seeded rng, which is what lets the test assert exact behaviour instead of
 * "some particles probably existed".
 */
export class FXPool {
  constructor({ cap = 400, rng = Math.random } = {}) {
    this.cap = cap;
    this.rng = rng;
    this.live = 0;
    // struct-of-arrays: cheap to iterate, and trivially inspectable in a test
    this.x = new Float32Array(cap); this.y = new Float32Array(cap);
    this.vx = new Float32Array(cap); this.vy = new Float32Array(cap);
    this.t = new Float32Array(cap);  this.ttl = new Float32Array(cap);
    this.size = new Float32Array(cap); this.rot = new Float32Array(cap);
    this.spin = new Float32Array(cap); this.g = new Float32Array(cap);
    this.kind = new Array(cap).fill(null);
    this.dropped = 0;      // burst requests that did not fit — a real number
  }

  /** Emit one event's worth of particles at (x, y). Returns how many. */
  burst(kindName, x, y, scale = 1) {
    const s = FX_SPEC[kindName];
    if (!s) return 0;
    let made = 0;
    for (let i = 0; i < s.n; i++) {
      if (this.live >= this.cap) { this.dropped++; break; }
      const k = this.live++;
      const a = this.rng() * Math.PI * 2;
      const speed = s.spread * (0.35 + this.rng() * 0.65) * scale;
      this.x[k] = x; this.y[k] = y;
      this.vx[k] = Math.cos(a) * speed;
      // `flat` throws sideways rather than up — a stomp is not a fountain
      this.vy[k] = (s.flat ? Math.abs(Math.sin(a)) * 0.35 : 1) * s.up * (0.5 + this.rng() * 0.9) * scale;
      this.t[k] = 0;
      this.ttl[k] = s.life * (0.75 + this.rng() * 0.5);
      this.size[k] = s.size * (0.7 + this.rng() * 0.6) * scale;
      this.rot[k] = this.rng() * Math.PI * 2;
      this.spin[k] = (this.rng() - 0.5) * 2 * (s.spin ?? 0);
      this.g[k] = s.gravity;
      this.kind[k] = kindName;
      made++;
    }
    return made;
  }

  /** Advance, and compact the dead out of the live range. */
  update(dt) {
    for (let i = this.live - 1; i >= 0; i--) {
      this.t[i] += dt;
      if (this.t[i] >= this.ttl[i]) { this._swapDown(i); continue; }
      this.vy[i] += this.g[i] * dt;
      this.x[i] += this.vx[i] * dt;
      this.y[i] += this.vy[i] * dt;
      this.rot[i] += this.spin[i] * dt;
    }
    return this.live;
  }

  /** 1 → 0 across a particle's life; what a renderer scales/fades by. */
  fade(i) { return Math.max(0, 1 - this.t[i] / this.ttl[i]); }

  clear() { this.live = 0; this.dropped = 0; }

  _swapDown(i) {
    const last = --this.live;
    if (i === last) return;
    for (const a of ['x', 'y', 'vx', 'vy', 't', 'ttl', 'size', 'rot', 'spin', 'g']) {
      this[a][i] = this[a][last];
    }
    this.kind[i] = this.kind[last];
  }
}

// ---- event inference, for the dev layer ----------------------------------
//
// The dev pack does not hook the game. It samples `window.__eeri`'s debug
// state once a frame and reads events out of the DIFFERENCES — collected
// went up, so that was a pickup. That is what makes the pack zero-touch:
// nothing in `main.js` has to know the FX exist.
//
// It is a prototyping device and it is honest about being one. A poll can
// only see a net change, so two pickups in one frame read as one event; the
// production port replaces this with explicit calls at the source, which is
// exactly what CLAUDE_HANDOFF.md's "recommended next integration order"
// says to do once a look is approved.

/** A flat snapshot of everything the inferencer watches. Null-safe. */
export function sample(E) {
  if (!E || !E.debug) return null;
  const d = E.debug;
  const g = (fn, fb = null) => { try { const v = fn(); return v === undefined ? fb : v; } catch { return fb; } };
  return {
    collected: g(() => E.collected(), 0),
    stomps: g(() => d.stomps(), 0),
    bank: g(() => d.bank()?.remaining, null),
    wallHits: g(() => d.wall()?.hits, null),
    girder: g(() => d.girder()?.state, null),
    cleared: g(() => d.cleared(), false),
    site: g(() => E.site(), 0),
    mode: g(() => E.mode(), 'foot'),
    x: g(() => E.player?.x, 0),
    y: g(() => E.player?.y, 0),
    exc: g(() => d.excPos(), null),
    golden: g(() => d.counts()?.golden, null),
  };
}

/**
 * What changed between two samples, as a list of `{kind, x, y}`.
 *
 * A site change wipes the slate rather than firing everything at once:
 * every counter resets on a new level, and without this guard the first
 * frame of level 2 fired a dig, a stomp and a clear simultaneously.
 */
export function detect(prev, now) {
  if (!prev || !now) return [];
  if (prev.site !== now.site || prev.cleared === true) return [];
  const out = [];
  const at = (dx = 0, dy = 0.6) => ({ x: now.x + dx, y: now.y + dy });

  if (now.collected > prev.collected) out.push({ kind: 'pickup', ...at() });
  if (now.golden != null && prev.golden != null && now.golden > prev.golden) {
    out.push({ kind: 'pickup', ...at(0, 0.9), scale: 1.6 });
  }
  if (now.stomps > prev.stomps) out.push({ kind: 'stomp', ...at(0, 0.1) });
  if (now.bank != null && prev.bank != null && now.bank < prev.bank) {
    const e = now.exc || {};
    out.push({ kind: 'dirt', x: (e.x ?? now.x) + 2.2, y: (e.y ?? now.y) + 0.4 });
  }
  if (now.wallHits != null && prev.wallHits != null && now.wallHits > prev.wallHits) {
    const e = now.exc || {};
    out.push({ kind: 'brick', x: (e.x ?? now.x) + 2.6, y: (e.y ?? now.y) + 1.2 });
  }
  if (now.girder != null && prev.girder != null && now.girder !== prev.girder) {
    const e = now.exc || {};
    out.push({ kind: 'heavy', x: e.x ?? now.x, y: (e.y ?? now.y) + 0.5 });
  }
  if (now.cleared && !prev.cleared) out.push({ kind: 'clear', ...at(0, 1.4) });
  return out;
}

// ---- the THREE binding, injected -----------------------------------------

/**
 * Give a pool something to draw with. `THREE` and the `scene` come from the
 * caller so this module never imports three — that is what keeps the pool
 * testable in bare node.
 *
 * Returns `{ sync, dispose }`. Call `sync()` after `pool.update(dt)`.
 */
export function attach(pool, THREE, scene, palette = {}) {
  const geo = new THREE.PlaneGeometry(1, 1);
  const mat = new THREE.MeshBasicMaterial({
    vertexColors: true, transparent: true, depthWrite: false,
  });
  const mesh = new THREE.InstancedMesh(geo, mat, pool.cap);
  mesh.frustumCulled = false;
  mesh.count = 0;
  mesh.renderOrder = 6;          // over the playfield, under the HUD
  scene.add(mesh);

  const m4 = new THREE.Matrix4();
  const col = new THREE.Color();
  const FALLBACK = 0xffb01f;

  const sync = () => {
    mesh.count = pool.live;
    for (let i = 0; i < pool.live; i++) {
      const f = pool.fade(i);
      const s = pool.size[i] * (0.4 + f * 0.6);
      m4.makeRotationZ(pool.rot[i]);
      m4.scale(new THREE.Vector3(s, s, s));
      m4.setPosition(pool.x[i], pool.y[i], 0.35);
      mesh.setMatrixAt(i, m4);
      const spec = FX_SPEC[pool.kind[i]];
      const c = palette[spec?.colour] ?? FALLBACK;
      col.set(c).multiplyScalar(0.55 + f * 0.45);
      mesh.setColorAt(i, col);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  };

  const dispose = () => {
    scene.remove(mesh);
    geo.dispose(); mat.dispose(); mesh.dispose?.();
  };

  return { mesh, sync, dispose };
}
