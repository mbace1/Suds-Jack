// The clay cut: an episode's sets rendered as stop motion, with the studio's
// caption cards and wipes laid over the top.
//
// Time is quantised to TWELVE exposures a second before anything looks at it,
// so every set, every caption word and every camera move changes on the same
// beat — the thing that makes stop motion look like stop motion. The encoder
// holds each exposure for two frames of a 24 fps file.

import { makeStage } from './engine.js';
import { boilAll } from './clay.js';
import { timeline, caption, wipe, WIPE } from '../film.js';
import { beginFrame, W, H } from '../paper.js';

export const EXPOSURES = 12;

export function makeClayFilm(ep) {
  const stage = makeStage({ width: W, height: H });
  const tl = timeline(ep);
  const built = new Map();
  const out = document.createElement('canvas'); out.width = W; out.height = H;
  const ctx = out.getContext('2d');
  const shotAt = (t) => tl.shots.find((s) => t < s.start + s.dur) || tl.shots[tl.shots.length - 1];

  function set(i) {
    if (!built.has(i)) { const b = tl.shots[i].build(stage); stage.scene.add(b.group); built.set(i, b); }
    return built.get(i);
  }

  return {
    tl, canvas: out, stage,
    /** draw the exposure that covers time t; returns the exposure number */
    frame(t) {
      const f = Math.floor(t * EXPOSURES + 1e-6), tq = f / EXPOSURES;
      const shot = shotAt(tq), lt = tq - shot.start, b = set(shot.i);
      for (const [i, o] of built) o.group.visible = i === shot.i;
      b.update(lt, f);
      const c = b.camera(lt);
      stage.shoot(c.pos, c.look, c);
      boilAll(b.group, f);
      stage.render(f);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(stage.renderer.domElement, 0, 0);
      beginFrame();
      caption(ctx, shot, lt, ep.meta.desk);
      const next = tl.shots[shot.i + 1];
      if (lt < WIPE / 2 && shot.i > 0) wipe(ctx, 0.5 + lt / WIPE, shot.i);
      else if (next && shot.dur - lt < WIPE / 2) wipe(ctx, 0.5 - (shot.dur - lt) / WIPE, next.i);
      return f;
    },
  };
}
