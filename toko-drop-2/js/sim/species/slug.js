// slug.js — SLUG, 1.x's v251 arc-mover (a tester in the real waves from
// wave 2): a green gel slug, a chain of eleven squat domes, head first, that
// steers with a turn-rate limit and hurts to touch anywhere along its length.
// It has no gun. Its point is a DAMAGE RULE (owner, v251): eat it from an END
// and it shortens; hit it in the MIDDLE and it splits in two, the back half
// reversed so its old tail is a head. Spraying makes two problems out of one;
// the clean kill is positional.
//
// 1.x js/enemy.js at v268: the constructor 973-990, `_arcSteer` 1266-1288,
// `_buildChain` / `_placeChain` 1290-1334, `_slugHit` 1335-1364, `_slugCut`
// 1366-1385, `hitTest` / `touches` 1441-1459, hit() 1605, the movement branch
// 1704-1710, the squash spring 2721-2781; main.js spawns a split's second
// animal (10622-10633) and routes its contact sites to the body (the bullet
// test 10649-10652, contact 10894). Every number is tuning/species/slug.js.
//
// THE STEER (enemy.js:1272-1288), each step, from wherever the swarm forces
// (its SCHOOL role: world.js runs them before this step, as 1.x
// main.js:10239-10360 ran them before e.update) and last step's crowd and
// knock left the head:
//   want    = the angle from the head to the hero
//   phase  += dt · weaveHz;  desired = want + sin(phase) · weaveAmp
//   heading += clamp(desired − heading, ±turnRate · dt)   (wrapped to ±π)
//   the head steps speed · dt along the heading; if the arena wall clamps
//   that step, the heading bends a further turnRate · dt · wallBend.
// THE CHAIN (enemy.js:1322-1331): then every segment is pulled to exactly
// `spacing` behind the one ahead, along the line between them — no springs.
// Only the head is held by the walls.
//
// HITTING IT (enemy.js:1444-1451): a point of radius r touches the first
// segment (head first) within its own r + r. That serves a hero bullet, the
// dash's cut (hero.js asks hitTest) and contact (the core's reach, 1.x
// `touches(px, pz, PLAYER_RADIUS)`). The segment a bullet touched decides the
// rule (enemy.js:1339-1364): the head or the tail → that segment dies and the
// chain is one shorter (the head shot off, the next one is the head); the
// middle → the front keeps the head and the back, reversed, becomes a second
// slug; a chain of one dies. v253 bounds it: a chain shorter than minSplit
// only shortens, and a body born from a split never splits again. Every
// rebuild re-tapers the radii to the new length and closes any gap. The hp is
// the chain: one a segment, so the core's one hit a bullet lands exactly where
// the rule leaves it. A WARDEN's aura blocks before 1.x's hit() ran, so a
// shielded slug loses nothing.
//
// THE DASH (enemy.js:1366-1385, v253): 1.x's one dash that cut bodies — the
// NEX DEUS cabinet's (main.js:9978 `nexdeusMode`; v253's commit: "_slugCut()
// stays as NEX DEUS's rule", the classic dash only passes through) — ATE a
// slug: every segment within its r + the hero's radius + 0.35 of the hero is
// gone and the animal closes the gap, shorter; never a split, one bite a dash;
// eaten whole, it died to the dash then and there (main.js:10170-10175). 1.x
// took the bite in its dash loop, before the bodies moved (main.js:10153 runs
// before the swarm forces 10231 and e.update 10366), from the chain as the
// last frame left it. It is the slug's answer to 2.0's CUT dash, and it is
// taken at the same moment: hero.js asks hitTest in the hero's step, before
// any body has stepped, and that ask is the bite. hero.js then takes its hit
// of hp (TUNING.hero.cut.hits) — which knows nothing of segments and would
// kill a chain of two the cut only half crossed — so the bite parks the hp out
// of its reach and this step puts it back to the chain; eaten whole, the hp is
// left at 0 and hero.js's hit is the kill. Any other hp it loses outside a
// bullet is 1.x's hit() with no segment recorded: the one nearest the impact,
// under the rule — a gate's laser at the beam's crossing (`g.hitAt`, which
// sim/pickups.js zap() records; a death there is 'env'), a shove at dash
// level 1 at the hero.
//
// Its squash spring is 1.x's non-blob one, 0.18 / 0.90 a step (the slug is not
// a BLOB_TYPE), kicked −0.4 by a hit; it squashes the head only. The core runs
// its blob spring and its −0.75 kick before this step, so the step takes them
// back — exactly: the core's spring is linear in the kicks it was handed — and
// runs 1.x's in their place, after the movement, as 1.x did.
//
// It writes the head itself (1.x set group.position from the clamped step),
// so nothing from outside is lost: the forces and the crowd moved g.x before
// it reads it, and a knock (the PUSH dash's shove, measured from the head) is
// integrated by the core after it, through the same wall clamp. A split's
// second animal comes into being inside the bullet test; 1.x built it the next
// frame, after the dash loop, the swarm forces and every body's update but
// before the bullet test and contact (main.js:10622-10633). So it is neither
// hit nor touching on the step it was born; on the next it can be shot and
// touched but not cut, and it holds where it was laid (the forces are undone:
// it was not on the floor for them); it walks from the step after.
//
// Two middle hits on one slug in one step are 1.x's too: it kept one list of
// split points a body (`_splitPts`, main.js:10626 reads one per body), so the
// second overwrote the first and that first back half never came into being —
// its segments were gone. A SPREAD or SHOTGUN volley across a slug does that.
import { TUNING } from '../../tuning.js?v=62';

const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

export default {
  init(w, g, api, o = {}) {
    const S = api.S(g), A = S.arc, C = S.chain, s = g.s;
    s.heading = Math.atan2(-g.z, -g.x);                          // at the arena's centre (1.x enemy.js:980)
    s.phase = w.rng.range(A.phase0[0], A.phase0[1]);            // (1.x enemy.js:980)
    s.noSplit = !!o.noSplit;                                     // 1.x _noSplit: born from a split (main.js:10632)
    s.born = o.chain ? w.tick : -1;                              // a split's half: not on the floor until the next step
    s.hitSeg = -1;                                               // 1.x _hitSeg: the segment the last hitTest touched
    s.bitten = -1;                                               // the dash whose bite it has taken
    s.cutTick = -1;                                              // the step a dash bit it (its hp parked until its own step)
    s.ate = false;                                               // that bite took at least one segment
    s.stepTick = -1;                                             // the step it last stepped in: a hitTest before it this step is the dash's
    s.event = null;                                              // 1.x _slugEvent: 'shorten' | 'split' | 'cut'
    s.splits = 0;                                                // halves it has thrown off (tests, the look)
    s.half = null;                                               // the last half it split off (a second split the same step re-lays it)
    s.bent = false;                                              // the wall clamped this step's move
    s.sq = g.sq; s.sqTick = -1;                                  // the squash spring as this step last left it
    // a fresh slug lies straight back along its heading (1.x enemy.js:984-985);
    // a split's half is the points it was handed, head first
    const pts = o.chain ?? Array.from({ length: C.segments }, (_, k) => ({
      x: g.x - Math.cos(s.heading) * k * C.spacing, z: g.z - Math.sin(s.heading) * k * C.spacing,
    }));
    s.chain = [];
    lay(w, g, S, pts);
    g.maxHp = C.segments;                                        // the whole animal
    g.faceX = Math.cos(s.heading); g.faceZ = Math.sin(s.heading);
  },

  step(w, g, dt, api) {
    const S = api.S(g), A = S.arc, s = g.s, h = w.hero;
    s.stepTick = w.tick;
    let sqV = takeBackCoreSpring(w, g, S, api), kick = 0;

    // the dash bit it in the hero's step (hitTest, below): its hp comes back
    // to the chain the bite left. hero.js kicked a gel's −0.75 with its hit;
    // a bite takes 1.x's −0.4, and one that ate nothing takes none
    // (enemy.js:1377-1379)
    if (s.cutTick === w.tick) {
      s.cutTick = -1;
      g.hp = s.chain.length;
      kick += (s.ate ? S.hitSquash : 0) - api.T.gel.sq.hit;
    } else if (g.hp < s.chain.length) {
      // hp it lost outside a bullet since its last step (hero.js ran first
      // this step; a gate's laser at the end of the last): 1.x's hit() at the
      // impact. The core kicked −0.75 with it; the slug takes −0.4
      kick += S.hitSquash - api.T.gel.sq.hit;
      outside(w, g, S, api);
      if (!g.alive) return;
    }

    // a split's half, on its first step: 1.x built it after every body had
    // moved (main.js:10622-10633), so it holds where it was laid — whatever
    // the forces did is undone — and its spring waits too; it walks next step
    if (s.born === w.tick - 1) {
      g.x = s.chain[0].x; g.z = s.chain[0].z;
      g.sqV = sqV + kick; g.sq = s.sq; s.sqTick = w.tick;
      return;
    }

    // the steer (1.x enemy.js:1274-1281)
    const want = Math.atan2(h.z - g.z, h.x - g.x);
    s.phase += dt * A.weaveHz;
    const desired = want + Math.sin(s.phase) * A.weaveAmp;
    let d = desired - s.heading;
    while (d > Math.PI) d -= TAU;
    while (d < -Math.PI) d += TAU;
    const max = A.turnRate * dt;
    s.heading += clamp(d, -max, max);
    // the step, and the wall (1.x enemy.js:1282-1287). 1.x clamped at the CFG
    // radius; the core's own clamp stands a body at g.r, so the bend is asked
    // of the same wall the body is held by (for any but an elite, the same)
    const spd = api.speed(g);
    const nx = g.x + Math.cos(s.heading) * spd * dt;
    const nz = g.z + Math.sin(s.heading) * spd * dt;
    const bx = w.hx - g.r, bz = w.hz - g.r;
    const cx = clamp(nx, -bx, bx), cz = clamp(nz, -bz, bz);
    s.bent = cx !== nx || cz !== nz;
    if (s.bent) s.heading += A.turnRate * dt * A.wallBend;      // on a wall: bend off it
    g.x = cx; g.z = cz;
    g.faceX = Math.cos(s.heading); g.faceZ = Math.sin(s.heading);

    // the chain follows (1.x _placeChain, enemy.js:1322-1331)
    s.chain[0].x = g.x; s.chain[0].z = g.z;
    follow(s.chain, S.chain.spacing);

    // 1.x's squash spring, after the movement (enemy.js:2728-2731)
    const Q = S.squash;
    const v = (sqV + kick - (s.sq - 1) * Q.spring) * Q.damp;
    g.sqV = v;
    g.sq = s.sq = clamp(s.sq + v, Q.min, Q.max);
    s.sqTick = w.tick;
  },

  // A bullet: the rule, at the segment it touched (1.x enemy.js:1339-1364).
  // The core then takes one hit of hp and kills it at 0, so the hp is left one
  // over the chain it leaves (or at one, for a chain of one).
  onHit(w, g, b, api) {
    if (g.shield) return;                                        // the aura blocks before 1.x's hit() (main.js:10700-10716)
    const S = api.S(g), s = g.s, dmg = api.T.bullets.heroDamage;
    let i = s.hitSeg; s.hitSeg = -1;
    if (!(i >= 0 && i < s.chain.length)) i = nearest(s.chain, b.x, b.z);
    if (rule(w, g, S, api, i) === 'die') g.hp = dmg;
    else g.hp += dmg;
    g.sqV += S.hitSquash - api.T.gel.sq.hit;                     // the core adds its −0.75 next; 1.x's slug took −0.4 (enemy.js:1340)
  },

  // the body, segment by segment, head first (1.x enemy.js:1444-1451). Asked
  // before its own step this step, it is the hero's dash asking (hero.js runs
  // before the bodies; the bullet test after them, and nothing else asks),
  // and a touch is the bite — unless that dash kills it outright (dash level
  // 1 on a body that is not a boss: hero.js kills it whole, so nothing is
  // eaten and it dies where its head is). Not gated on `h.dash > 0`: hero.js
  // has already counted the dash's last step off when it cuts on it (0.18 s
  // is 11 steps; on the 11th h.dash is below 0), so a slug first crossed on
  // that step would take the cut's hits as hp — and SPLIT under the rule.
  hitTest(w, g, x, z, r) {
    const s = g.s, ch = s.chain, h = w.hero;
    if (s.born === w.tick) return false;                         // a split's half: not on the floor yet
    const dashAsk = s.stepTick !== w.tick;
    if (dashAsk && s.born === w.tick - 1) return false;          // … nor for the dash loop that ran before 1.x built it
    for (let i = 0; i < ch.length; i++) {
      if (Math.hypot(ch[i].x - x, ch[i].z - z) < ch[i].r + r) {
        s.hitSeg = i;
        if (dashAsk && x === h.x && z === h.z && (g.isBoss || !(h.dashLevel >= 1))) bite(w, g, TUNING.species[g.kind]);
        return true;
      }
    }
    return false;
  },

  // contact is the same body, at the core's contact reach (1.x enemy.js:1459,
  // main.js:10894 `e.touches(px, pz, PLAYER_RADIUS)`)
  touches(w, g) {
    const s = g.s, h = w.hero;
    if (!TUNING.species[g.kind].contact || s.born === w.tick) return false;
    for (const c of s.chain) if (Math.hypot(c.x - h.x, c.z - h.z) < c.r + TUNING.gel.contactRadius) return true;
    return false;
  },
};

// Lay the chain from points, head first (1.x _buildChain, enemy.js:1294-1321):
// the head is the body's position, the radii taper from head to tail over the
// length it has now, hp is its length, and the gaps close.
// The head is kept inside the arena: a chain is laid straight back from where
// it spawned and can run past a wall, so a segment that becomes a head (a shot
// took the head, a split, a bite) can stand outside it. The core contains every
// body at its radius (1.x contained none, species-a.md §10.4.4), so the head is
// put on the wall's line here rather than past it until the next step's clamp.
function lay(w, g, S, pts) {
  const C = S.chain, n = pts.length, ch = g.s.chain;
  if (n) { const bx = w.hx - g.r, bz = w.hz - g.r; pts[0] = { x: clamp(pts[0].x, -bx, bx), z: clamp(pts[0].z, -bz, bz) }; }
  ch.length = 0;
  for (let i = 0; i < n; i++) {
    const t = n > 1 ? i / (n - 1) : 0;
    ch.push({ x: pts[i].x, z: pts[i].z, r: C.headR + (C.tailR - C.headR) * t });
  }
  g.x = ch[0].x; g.z = ch[0].z;
  g.hp = n;
  follow(ch, C.spacing);
}

// every segment exactly `spacing` behind the one ahead (1.x enemy.js:1324-1329)
function follow(ch, spacing) {
  for (let i = 1; i < ch.length; i++) {
    const a = ch[i - 1], b = ch[i];
    const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz) || 1;
    b.x = a.x + (dx / d) * spacing;
    b.z = a.z + (dz / d) * spacing;
  }
}

function nearest(ch, x, z) {
  let best = 0, bd = Infinity;
  for (let k = 0; k < ch.length; k++) { const d = Math.hypot(ch[k].x - x, ch[k].z - z); if (d < bd) { bd = d; best = k; } }
  return best;
}

// THE RULE (1.x _slugHit, enemy.js:1346-1363) on segment i. Returns 'die'
// (a chain of one: the caller kills it), 'shorten' or 'split'.
function rule(w, g, S, api, i) {
  const s = g.s, ch = s.chain, n = ch.length;
  if (n <= 1) return 'die';
  ch[0].x = g.x; ch[0].z = g.z;                                  // the head is where the body is now
  const pts = ch.map((c) => ({ x: c.x, z: c.z }));
  if (i === 0 || i === n - 1 || n < S.chain.minSplit || s.noSplit) {
    pts.splice(i, 1);
    lay(w, g, S, pts);
    s.event = 'shorten';
    return 'shorten';
  }
  const front = pts.slice(0, i), back = pts.slice(i + 1).reverse();
  lay(w, g, S, front);
  s.event = 'split'; s.splits++;
  // 1.x kept ONE list of split points a body (`_splitPts`, enemy.js:1362) and
  // built the second animal from it the next frame (main.js:10626-10627), so
  // a second split of the same body in the same frame — two pellets of a
  // SPREAD or SHOTGUN volley across it — OVERWROTE the first: that first back
  // half never came into being, and its segments were simply gone. The half
  // this body split off this step is that list; a second split re-lays it as
  // the newer back half, from its own new head (1.x's constructor, enemy.js:980).
  const prev = s.half;
  if (prev && prev.alive && prev.s.born === w.tick) {
    prev.s.heading = Math.atan2(-back[0].z, -back[0].x);
    lay(w, prev, S, back);
    prev.faceX = Math.cos(prev.s.heading); prev.faceZ = Math.sin(prev.s.heading);
    return 'split';
  }
  // the second animal (1.x main.js:10625-10633): its own head, the parent's
  // pace (× swift, which 1.x baked into _speedMult) and fire clock, an
  // ordinary body (no variant, no affix) that never splits. 1.x's split
  // ignores the child valve (the valve, main.js:10608-10620, is SPLITTA's
  // and the MINIs' list only).
  s.half = api.spawn(w, g.kind, back[0].x, back[0].z, {
    child: true, chain: back, noSplit: true,
    speedMult: g.speedMult * (g.affix === 'swift' ? api.T.variants.swiftSpeed : 1), intervalMult: g.intervalMult,
  });
  return 'split';
}

// The dash's cut EATS (1.x _slugCut, enemy.js:1372-1385, from main.js:10171):
// every segment within its r + the hero's radius + 0.35 of the hero, from the
// chain as the last step left it; the rest close the gap. One bite a dash.
// hero.js takes its hit of hp next: eaten whole, the hp is left at 0 so that
// hit kills it (to the dash, at once, as 1.x's onKill); otherwise the hp is
// parked out of that hit's reach until the slug's own step sets it to the
// chain (a chain of two the cut only half crossed lives on as one).
function bite(w, g, S) {
  const s = g.s, h = w.hero, ch = s.chain, n = ch.length;
  if (s.bitten === h.dashId) return;
  s.bitten = h.dashId;
  const R = TUNING.hero.radius + S.cut.pad, keep = [];
  for (const c of ch) if (!(Math.hypot(c.x - h.x, c.z - h.z) < c.r + R)) keep.push({ x: c.x, z: c.z });
  s.cutTick = w.tick;
  s.ate = keep.length < n;
  if (!keep.length) { g.hp = 0; return; }
  if (s.ate) { lay(w, g, S, keep); s.event = 'cut'; }
  g.hp = Infinity;
}

// hp lost outside a bullet (step, above): 1.x hit() with no segment recorded,
// the one nearest the impact (enemy.js:1342-1345), once a point of hp. The
// impact is where the core recorded it (`g.hitAt`: a gate's laser, at the
// beam's crossing, last step's end — and a death there is the laser's, 'env');
// with none recorded it is the hero (a shove at dash level 1)
function outside(w, g, S, api) {
  const s = g.s, h = w.hero, ch = s.chain, n = ch.length;
  const at = g.hitAt && g.hitAt.tick >= w.tick - 1 ? g.hitAt : null;
  g.hitAt = null;
  const px = at ? at.x : h.x, pz = at ? at.z : h.z, src = at ? at.by : 'dash';
  ch[0].x = g.x; ch[0].z = g.z;                                  // the head is where the body is now
  let k = n - g.hp;
  g.hp = n;
  while (k-- > 0 && g.alive) {
    if (rule(w, g, S, api, nearest(s.chain, px, pz)) === 'die') api.kill(w, g, src);
  }
}

// The velocity the squash spring was handed this step, before the core's own
// spring ran on it: the core did sqV' = (sqV − (sq − 1)·k)·c on what this
// step wrote last time plus any kicks since (a hit, a shockwave), so
// sqV = sqV'/c + (sq − 1)·k, exactly. On a body's first step there is nothing
// to take back: both springs hold a body at rest still. (toro.js does the same.)
function takeBackCoreSpring(w, g, S, api) {
  const s = g.s;
  if (s.sqTick !== w.tick - 1) { s.sq = g.sq; return g.sqV; }
  const [k, c] = api.T.gel.sq[S.family === 'cube' ? 'cube' : 'blob'];   // the core's choice (world.js gelStep)
  return g.sqV / c + (s.sq - 1) * k;
}
