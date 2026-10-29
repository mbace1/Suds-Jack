// angler.js — how ANGLER looks: GLOWA's look (a dark gel nearly the colour
// of THE DEEP, holding out a lure on a stalk where the sim says it is), at a
// boss's size, with the boss ring under it.
import glowa from './glowa.js?v=59';
import { auraBuild, auraUpdate, auraReset } from './bossaura.js?v=59';

export default {
  build(ctx) { return { ...glowa.build(ctx), ...auraBuild(ctx) }; },
  update(v, g, w, time, grow) {
    glowa.update(v, g, w, time, grow);
    v.lure.scale.multiplyScalar(1.8);
    auraUpdate(v, g, time);
  },
  reset(v) { glowa.reset(v); auraReset(v); },
};
