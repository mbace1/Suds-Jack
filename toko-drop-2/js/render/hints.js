// hints.js — the first-time tags (v115; sim/teach.js decides them): STEP OUT! over a giant gathering for its slam,
// CLEAR THE LANE! over a ram's lit lane, each a line of text as DASH THROUGH! is (render/pickups.js labelTexture),
// beating as it does, and only while the game is playing (`playing`, set by main.js each frame as the pickups' is).
// Reads the world, never writes it; the counts are this browser's (`load`, and `k.dirty` for main.js to store).
import { TUNING } from '../tuning.js?v=136';
import { create, update } from '../sim/teach.js?v=136';
import { labelTexture, sprite, setPicture } from './pickups.js?v=136';
import { t as say } from '../ui.js?v=136';

const T = TUNING, MAX = 4;

export class HintView {
  constructor(scene) {
    this.scene = scene; this.playing = true; this.k = create();
    this.tags = Array.from({ length: MAX }, () => { const s = sprite(6); scene.add(s); return s; });
  }
  // this browser's counts so far (main.js, at a run's start: toko2.hintSlam / toko2.hintRam)
  load(counts) { this.k = create(counts); }
  reset() { this.k.live.clear(); for (const s of this.tags) s.visible = false; }
  sync(w, alpha, time) {
    const H = T.hints, P = T.pickups.label, tags = w ? update(this.k, w, this.playing) : [];
    let i = 0;
    if (this.playing) for (const g of tags) {
      if (i >= MAX) break;
      const s = this.tags[i++], L = H[g.kind], tex = labelTexture(say(L.say), L.color, L.glow);
      setPicture(s, tex); s.visible = true;
      s.scale.set(P.h * tex.userData.aspect, P.h, 1);
      s.position.set(g.x, g.y, g.z);
      s.material.opacity = H.alpha[0] + H.alpha[1] * Math.sin(time * H.rate);
    }
    for (; i < MAX; i++) this.tags[i].visible = false;
  }
  // what the smoke reads: how many tags are up
  debug() { return this.tags.filter((s) => s.visible).length; }
}
