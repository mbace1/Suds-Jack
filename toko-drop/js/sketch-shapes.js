// js/sketch-shapes.js — SKETCHBOOK, not roster (owner: "let's play with shapes
// more"). Candidate silhouettes for the arc-mover family (PROGRESSION_DESIGN
// §8.8), built so they can be LOOKED AT MOVING: an arc-mover is a movement
// before it is a shape, and a still frame cannot settle one.
//
// Nothing here is imported by the game. `shape-sketch.html` is its only host.
// If a candidate is chosen it gets rebuilt as a real EnemyType in enemy.js —
// this file is where it earns that, and it is deleted when the question closes.
//
// Two candidates, both asked for by the owner:
//   RIBBON — the body IS its own recent path. A squiggle you read as a line.
//   SLUG   — a long gel chain with a DAMAGE RULE: eat it from an end and it
//            shortens; hit it in the middle and it SPLITS into two slugs.
import * as THREE from 'three';
import { makeSatinMat } from './enemy.js?v=220';
import { TUNING } from './tuning.js?v=220';

const M = TUNING.movement;          // weaveSpeed 1.7 rad/s, weaveGain 1.6 u/s

// ── shared steering ───────────────────────────────────────────────────────────
// The arc is not decoration: it is `weave` from the real movement table — a
// serpentine laid across the heading, which is what makes SCHOOL bodies arc
// instead of beelining. Both candidates steer identically on purpose, so what
// the picture compares is SHAPE, not behaviour.
function steer(s, dt, target, speed, weave, turnRate = 2.2) {
  // A TURN-RATE LIMIT, which the shipped movement model does not have. The
  // first cut pointed the body straight at the target every frame, so when the
  // target crossed behind it the heading snapped 90 degrees in one step and
  // the ribbon rendered as a hard V — the trail was showing, honestly, that
  // the MOVEMENT had a corner in it. An arc-mover is defined by not being able
  // to turn instantly. This is a finding for the family, not a sketch detail:
  // whatever shape wins, SCHOOL needs a turn rate or it will not arc.
  const want = Math.atan2(target.z - s.z, target.x - s.x);
  s.phase += dt * M.weaveSpeed;
  // the serpentine is a heading OFFSET, not a sideways shove — that is what
  // makes the path itself curve instead of the body crabbing along a line
  const desired = want + Math.sin(s.phase) * 0.55 * weave;
  let d = desired - s.heading;
  while (d >  Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  const max = turnRate * dt;
  s.heading += Math.max(-max, Math.min(max, d));
  s.x += Math.cos(s.heading) * speed * dt;
  s.z += Math.sin(s.heading) * speed * dt;
  return s;
}

// ══ CANDIDATE 1 — RIBBON ══════════════════════════════════════════════════════
// The body is a tube swept along the positions it has just occupied, tapering
// to nothing at the tail. It has no rigid form at all: turn it and the whole
// silhouette changes, which is the point — you read the PATH, not the object.
//
// Known costs, worth stating before anyone falls in love with it:
//   • the geometry is rebuilt every frame (a TubeGeometry over a spline). At
//     one or two on screen that is nothing; at twenty it is a per-frame
//     allocation storm and would have to become a fixed-topology strip whose
//     vertices are rewritten, or a TSL job.
//   • it has no silhouette when it stops. A ribbon standing still is a stick.
//   • its hitbox is a question this sketch does NOT answer (see §8.8's "hitbox
//     shown in style") — hit-testing a curve is not hit-testing a sphere.
export function createRibbon(scene, {
  color = 0x66ddee, x = 0, z = 0, speed = 2.6, weave = 1.0,
  length = 22,          // trail samples held
  step = 0.30,          // metres between samples -> body is length*step long
  radius = 0.34,        // half-width at the widest point
} = {}) {
  const s = { x, z, phase: Math.random() * 6.28, heading: 0 };
  // SAMPLE BY DISTANCE, NOT BY FRAME. The first cut pushed a trail point every
  // frame: at 60 fps and 2.6 u/s that is a sample every 4 cm, so twenty-six of
  // them spanned one metre and the ribbon rendered as a crumpled leaf. The
  // body's LENGTH must be a design number (samples x step), not a function of
  // the frame rate — otherwise the shape changes on a slower phone.
  const trail = [];
  for (let i = 0; i < length; i++) trail.push(new THREE.Vector3(x, 0.35, z - i * step));
  const mat = makeSatinMat(color, 'blob', radius);
  let mesh = null;

  // Built as a STRIP, not a tube. The first cut used TubeGeometry and a
  // per-vertex taper: its Frenet frames twist through a hard turn and its ring
  // parameterisation does not match `curve.getPoint(t)`, so the body rendered
  // as a bent plank. A ribbon is two vertices per path point — a perpendicular
  // and a width — which is exact, cheap, and cannot twist.
  const SMOOTH = 3;                       // resampled points per trail sample
  const N = (length - 1) * SMOOTH + 1;
  const geo = new THREE.BufferGeometry();
  const verts = new Float32Array(N * 2 * 3);
  geo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
  const idx = [];
  for (let i = 0; i < N - 1; i++) {
    const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
    idx.push(a, b, c, b, d, c);           // two triangles per rung
  }
  geo.setIndex(idx);

  function rebuild() {
    // resample the trail through a spline so hard turns come out round
    const curve = new THREE.CatmullRomCurve3(trail, false, 'catmullrom', 0.5);
    const pts = curve.getSpacedPoints(N - 1);
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1);                       // 0 head, 1 tail
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(N - 1, i + 1)];
      let tx = b.x - a.x, tz = b.z - a.z;
      const tl = Math.hypot(tx, tz) || 1;
      tx /= tl; tz /= tl;
      const px = -tz, pz = tx;                     // perpendicular, in-plane
      // width: fattest just behind the head, to nothing at the tail
      const w = radius * Math.sin(Math.min(1, t * 6) * Math.PI / 2) * (1 - t * t);
      const y = 0.30 + Math.sin(t * Math.PI) * 0.10;   // a slight arch, to catch light
      verts[i * 6 + 0] = pts[i].x + px * w;
      verts[i * 6 + 1] = y;
      verts[i * 6 + 2] = pts[i].z + pz * w;
      verts[i * 6 + 3] = pts[i].x - px * w;
      verts[i * 6 + 4] = y;
      verts[i * 6 + 5] = pts[i].z - pz * w;
    }
    geo.attributes.position.needsUpdate = true;
    geo.computeVertexNormals();
    geo.computeBoundingSphere();
    if (!mesh) { mesh = new THREE.Mesh(geo, mat); mesh.material.side = THREE.DoubleSide; scene.add(mesh); }
  }
  rebuild();

  return {
    kind: 'ribbon',
    get position() { return { x: s.x, z: s.z }; },
    update(dt, target) {
      steer(s, dt, target, speed, weave);
      // `trail` holds COMMITTED samples only, each `step` from the last. An
      // earlier cut also dragged trail[0] to the live head on the frames
      // between commits — which reset the very distance the commit test
      // measures, so a sample was NEVER committed: one point wandered off
      // while the other twenty-one sat where they were seeded, and the mesh
      // drew the straight seed with a spike to the head. It looked like a
      // shape problem and was a bookkeeping one. The body now lags the head
      // by at most `step` (0.3 u), which is invisible.
      if (Math.hypot(s.x - trail[0].x, s.z - trail[0].z) >= step) {
        trail.pop();
        trail.unshift(new THREE.Vector3(s.x, 0.35, s.z));
      }
      rebuild();
    },
    removeFrom(sc) { if (mesh) sc.remove(mesh); geo.dispose(); mat.dispose?.(); },
  };
}

// ══ CANDIDATE 2 — GEL SLUG ════════════════════════════════════════════════════
// A chain of gel domes, head first, each following the one ahead at a fixed
// spacing — so it arcs as a body rather than as a point, and the tail whips
// where the head has been.
//
// THE RULE (the owner's, and the reason this is worth building at all):
//   hit an END segment  → that segment dies and the slug SHORTENS.
//   hit a MIDDLE segment → the slug SPLITS into two slugs.
// So spraying it is punished — you make two problems out of one — and the
// clean kill is positional: get to a head or a tail and eat it down the line.
// That is a movement problem, which is what this family is for.
//
// The head has to be legible or the rule is a coin flip, so it is the largest
// segment and the only one carrying the bright core; the tail tapers away.
export function createSlug(scene, {
  color = 0x88ff22, x = 0, z = 0, speed = 2.2, weave = 0.8,
  segments = 11, spacing = 0.50, headRadius = 0.46, tailRadius = 0.18,
} = {}) {
  const slugs = [];

  function makeSlug(pts, phase) {
    const s = { x: pts[0].x, z: pts[0].z, phase, heading: 0 };
    const n = pts.length;
    const segs = pts.map((p, i) => {
      const t = n > 1 ? i / (n - 1) : 0;
      const r = headRadius + (tailRadius - headRadius) * t;
      const geo = new THREE.SphereGeometry(r, 14, 11);
      // squash slightly along the body so the chain reads as ONE animal
      geo.scale(1.0, 0.82, 1.0);
      const mat = makeSatinMat(color, 'blob', r);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(p.x, r * 0.82, p.z);
      scene.add(mesh);
      return { mesh, mat, r, x: p.x, z: p.z };
    });
    // the head's eye — the ONE mark that says which end you must attack from
    const eyeGeo = new THREE.SphereGeometry(headRadius * 0.30, 10, 8);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const eye = new THREE.Mesh(eyeGeo, eyeMat);
    scene.add(eye);
    return { s, segs, eye, eyeGeo, eyeMat, dead: false };
  }

  slugs.push(makeSlug(
    Array.from({ length: segments }, (_, i) => ({ x, z: z + i * spacing })),
    Math.random() * 6.28));

  function updateOne(sl, dt, target) {
    steer(sl.s, dt, target, speed, weave);
    const head = sl.segs[0];
    head.x = sl.s.x; head.z = sl.s.z;
    // follow-the-leader: each segment is pulled to a fixed distance behind the
    // one ahead. No springs — a slug should not wobble like a rope.
    for (let i = 1; i < sl.segs.length; i++) {
      const a = sl.segs[i - 1], b = sl.segs[i];
      const dx = b.x - a.x, dz = b.z - a.z;
      const d = Math.hypot(dx, dz) || 1;
      b.x = a.x + (dx / d) * spacing;
      b.z = a.z + (dz / d) * spacing;
    }
    for (const g of sl.segs) g.mesh.position.set(g.x, g.r * 0.82, g.z);
    sl.eye.position.set(
      head.x + Math.cos(sl.s.heading) * head.r * 0.7,
      head.r * 1.05,
      head.z + Math.sin(sl.s.heading) * head.r * 0.7);
  }

  function dropSeg(sl, i) {
    const g = sl.segs[i];
    scene.remove(g.mesh); g.mesh.geometry.dispose(); g.mat.dispose?.();
  }
  function killSlug(sl) {
    for (let i = 0; i < sl.segs.length; i++) dropSeg(sl, i);
    scene.remove(sl.eye); sl.eyeGeo.dispose(); sl.eyeMat.dispose();
    sl.dead = true;
  }

  return {
    kind: 'slug',
    get count() { return slugs.filter(s => !s.dead).length; },
    get segmentCount() { return slugs.reduce((n, s) => n + (s.dead ? 0 : s.segs.length), 0); },
    /** nearest segment to a world point, across every live slug */
    pick(px, pz) {
      let best = null, bd = Infinity;
      for (const sl of slugs) {
        if (sl.dead) continue;
        sl.segs.forEach((g, i) => {
          const d = Math.hypot(g.x - px, g.z - pz);
          if (d < bd) { bd = d; best = { sl, i }; }
        });
      }
      return best;
    },
    /**
     * THE RULE. Returns what happened, so a caption can say it out loud.
     *   'shorten' — an end was eaten
     *   'split'   — the middle was hit; there are now two slugs
     *   'killed'  — the last segment went
     */
    hitSegment(sl, i) {
      const n = sl.segs.length;
      if (n <= 1) { killSlug(sl); return 'killed'; }
      if (i === 0 || i === n - 1) {
        dropSeg(sl, i);
        sl.segs.splice(i, 1);
        if (i === 0) {
          // the head died: the next segment inherits the eye and the lead
          sl.s.x = sl.segs[0].x; sl.s.z = sl.segs[0].z;
        }
        return 'shorten';
      }
      // MIDDLE: the hit segment is destroyed and the two halves become two
      // animals. The tail half is REVERSED — its old rear end is now its head,
      // which is the whole cost of the mistake: a new head, pointed at you.
      dropSeg(sl, i);
      const front = sl.segs.slice(0, i);
      const back  = sl.segs.slice(i + 1).reverse();
      for (const g of [...front, ...back]) { scene.remove(g.mesh); g.mesh.geometry.dispose(); g.mat.dispose?.(); }
      scene.remove(sl.eye); sl.eyeGeo.dispose(); sl.eyeMat.dispose();
      sl.dead = true;
      for (const half of [front, back]) {
        if (!half.length) continue;
        slugs.push(makeSlug(half.map(g => ({ x: g.x, z: g.z })), Math.random() * 6.28));
      }
      return 'split';
    },
    hitAt(px, pz) {
      const p = this.pick(px, pz);
      return p ? this.hitSegment(p.sl, p.i) : null;
    },
    /** the end nearest a point — what a player who is PLAYING IT RIGHT aims at */
    hitNearestEnd(px, pz) {
      let best = null, bd = Infinity;
      for (const sl of slugs) {
        if (sl.dead) continue;
        for (const i of [0, sl.segs.length - 1]) {
          const g = sl.segs[i];
          const d = Math.hypot(g.x - px, g.z - pz);
          if (d < bd) { bd = d; best = { sl, i }; }
        }
      }
      return best ? this.hitSegment(best.sl, best.i) : null;
    },
    hitMiddle() {
      const sl = slugs.find(s => !s.dead && s.segs.length >= 3);
      return sl ? this.hitSegment(sl, Math.floor(sl.segs.length / 2)) : null;
    },
    update(dt, target) { for (const sl of slugs) if (!sl.dead) updateOne(sl, dt, target); },
    removeFrom() { for (const sl of slugs) if (!sl.dead) killSlug(sl); },
  };
}
