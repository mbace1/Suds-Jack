// The Game of Life — the nature interludes.
// Picks an invitation to the real world, aware of the hour: daytime prompts
// send you outdoors, evening prompts hand you a poem or a painting instead.
// Poems come from the cross-cultural pool — any culture, in the UI language.

import { pickPoem } from './poems.js?v=11';

const DAY_PROMPTS = ['nat.day.1', 'nat.day.2', 'nat.day.3'];
const EVE_PROMPTS = ['nat.eve.1', 'nat.eve.2'];

// two invitations per season lead the daytime pool; the generic three follow
const SEASON_PROMPTS = {
  winter: ['nat.win.1', 'nat.win.2'],
  spring: ['nat.spr.1', 'nat.spr.2'],
  summer: ['nat.sum.1', 'nat.sum.2'],
  autumn: ['nat.aut.1', 'nat.aut.2'],
};

export function isEvening(date = new Date()) {
  const h = date.getHours();
  return h >= 18 || h < 5;
}

// meteorological seasons, northern hemisphere first (roadmap: configurable)
export function season(date = new Date()) {
  const m = date.getMonth();
  if (m === 11 || m <= 1) return 'winter';
  if (m <= 4) return 'spring';
  if (m <= 7) return 'summer';
  return 'autumn';
}

// idx rotates via storage.natureIdx so repeat visitors see fresh invitations
export function pickInterlude(idx, date = new Date()) {
  const s = season(date);
  if (isEvening(date)) {
    const key = EVE_PROMPTS[idx % EVE_PROMPTS.length];
    return {
      textKey: key,
      poem: key === 'nat.eve.1' ? pickPoem(idx, s) : null,  // a poem of the current season
      artNote: key === 'nat.eve.2',                         // art prompt adds painter suggestions
    };
  }
  const pool = [...SEASON_PROMPTS[s], ...DAY_PROMPTS];
  return { textKey: pool[idx % pool.length], poem: null, artNote: false };
}
