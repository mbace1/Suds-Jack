// blister.js — how BLISTER looks: BUBBLA's look (a gel inside a clear
// bubble that thins with each hit and is gone while popped), at a boss's size,
// with the boss ring under it.
import bubbla from './bubbla.js?v=63';
import { auraBuild, auraUpdate, auraReset } from './bossaura.js?v=63';

export default {
  build(ctx) { return { ...bubbla.build(ctx), ...auraBuild(ctx) }; },
  update(v, g, w, time, grow) { bubbla.update(v, g, w, time, grow); auraUpdate(v, g, time); },
  reset(v) { bubbla.reset(v); auraReset(v); },
};
