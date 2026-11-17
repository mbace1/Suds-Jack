// transit.js — the view of a world change (sim/worlds.js; owner, 2026-10-23:
// "the grid should turn into a drain hole like vortex and suck the
// character down. Only to end up in a concrete looking floor ... a drainage
// hole appears, and then a new world is revealed. The main character who is
// a droplet, gets dropped into a new place").
//
// The sim says when (w.trans, the hero's sink and fall, the events); this
// says how it looks, all of it read off the sim's clock so a skip or a slow
// frame cannot put the two out of step:
//
//   worldOut   the floor winds up round the hole (floor.js `swirl`): world
//              1's whole grid turns into a vortex; on the driveway an iron
//              drain rises out of the slab where the boss died and only the
//              slab round it turns. The hole opens as the droplet is drawn in
//   (sink)     the droplet shrinks into the hole (actors.js), and the screen
//              goes dark after it
//   worldIn    the next world is under the dark, its floor not there yet
//   (fall)     the light comes back on the droplet falling out of the dark
//   worldLand  it lands with a splash, and the floor RUNS OUT of it, as the
//              grid ran out of the drop in the start intro; the world's name
//
// Every number is TUNING.worlds.view.
const smooth = (t) => { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t); };

export class Transit {
  constructor(T, { scenery, juice, ui, t }) {
    this.T = T; this.scenery = scenery; this.juice = juice; this.ui = ui; this.t = t;
    this.kind = null; this.at = { x: 0, z: 0 };
    this.landAt = -1;    // the sim's time at the landing, while the floor runs out
    this.dim = 0;        // frames the next world's set is drawn under the dark before it is hidden (v74)
    const el = (this.fade = document.createElement('div'));
    el.style.cssText = 'position:fixed;inset:0;background:#000;opacity:0;pointer-events:none;z-index:3';
    document.body.appendChild(el);
  }

  onEvent(e, floor, w) {
    const V = this.T.worlds.view;
    if (e.type === 'worldOut') {
      this.kind = e.kind; this.at = { x: e.x, z: e.z }; this.landAt = -1;
      floor.swirl.at.value.set(e.x, e.z);
    } else if (e.type === 'worldIn') {
      // the new floor (main.js has just built it) is not there until the droplet lands on it
      floor.reveal.r.value = 0; floor.reveal.front.value = 0; floor.reveal.at.value.set(e.x, e.z);
      this.scenery.showDrain(0, 0, 0);
      // and nothing round it: the lawn and the walls come with the floor — but
      // not before the set has been DRAWN once, under the dark (v74): a set is
      // a dozen new materials, and three compiles each on its first draw, so
      // that draw goes in the black frame where it costs nothing to see rather
      // than on the frame the floor's reveal shows it (measured: 0.4-2.4 s
      // under SwiftShader, once per landing). `dim` counts the frames to wait
      this.dim = 2;
    } else if (e.type === 'worldLand') {
      this.landAt = w.time;
      floor.reveal.front.value = 1;
      // the splash: a ring out over the floor, and the light of it
      const J = this.T.juice.ring;
      this.juice.waves.push({ x: e.x, z: e.z, r0: 0.3, r1: V.splashRing, life: J.life * 1.6, max: J.life * 1.6, hex: 0xffffff });
      this.juice.flashes.push({ x: e.x, y: 0.4, z: e.z, r: 1.4, life: 0.22, max: 0.22, hex: 0xffffff });
      this.ui.banner(this.t(`world${e.world}`), V.banner);
    }
  }

  // once a frame, off the sim's clock
  frame(w, floor) {
    const V = this.T.worlds.view, P = this.T.worlds.trans, tr = w?.trans;
    // v74: drawn once under the dark, then hidden until the reveal — never after the landing (v125: `dim` counts
    // frames, and a frame that steps the sim past the landing, a debug advance's, hid the new world's set for good)
    if (this.dim > 0 && --this.dim === 0 && this.landAt < 0 && !tr?.landed) this.scenery.group.visible = false;
    // v125 (the state audit): where the world change is, read off the sim's clock — for an agent or a test, one
    // field in place of w.trans, landAt, dim and the fade's opacity: 'out' (the pull, the sink, the dark), 'fall',
    // 'land' (landed, the world not yet going), 'reveal' (the floor still running out), 'idle'
    this.phase = tr ? (!tr.swapped ? 'out' : !tr.landed ? 'fall' : 'land') : this.landAt >= 0 ? 'reveal' : 'idle';
    let dark = 0;
    if (tr && !tr.swapped) {
      const t = tr.t, drain = tr.kind === 'drain';
      // the floor winds up over the pull and the sink, the hole opens behind it
      floor.swirl.k.value = smooth(t / (P.pull + P.sink * 0.5));
      floor.swirl.r.value = drain ? V.drainSwirl : Math.hypot(w.hx, w.hz) * 1.05;
      floor.swirl.hole.value = (drain ? V.drainHole : V.vortexHole) * smooth((t - P.pull * 0.25) / (P.pull * 0.75 + P.sink * 0.5));
      if (drain) this.scenery.showDrain(tr.x, tr.z, smooth(t / V.drainRise));
      dark = smooth((t - P.pull - P.sink * 0.4) / (P.sink * 0.6 + P.dark * 0.6));
    } else if (tr && tr.swapped) {
      // the light comes back on the droplet as it falls
      dark = 1 - smooth((tr.t - tr.swapAt) / (P.fall * V.lightUp));
      floor.swirl.k.value = 0; floor.swirl.hole.value = 0;
    }
    if (this.landAt >= 0 && w) {
      const u = Math.max(0, (w.time - this.landAt) / V.reveal);
      floor.reveal.r.value = u >= 1 ? 1e4 : Math.hypot(w.hx, w.hz) * 1.3 * (1 - (1 - u) * (1 - u));
      if (u > V.sceneryAt) this.scenery.group.visible = true;
      if (u >= 1) { floor.reveal.front.value = 0; this.landAt = -1; }
    }
    this.fade.style.opacity = dark.toFixed(3);
  }

  // a run ended or restarted: nothing of a transition left on screen
  reset(floor) {
    this.landAt = -1; this.kind = null; this.dim = 0; this.phase = 'idle';
    this.fade.style.opacity = '0';
    if (floor) { floor.swirl.k.value = 0; floor.swirl.hole.value = 0; floor.reveal.r.value = 1e4; floor.reveal.front.value = 0; }
    this.scenery.showDrain(0, 0, 0);
    this.scenery.group.visible = true;
  }
}
