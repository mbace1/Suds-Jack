// The Game of Life — the nature interludes.
// Picks an invitation to the real world, aware of the hour: daytime prompts
// send you outdoors, evening prompts hand you a poem or a painting instead.
// Poems come from the cross-cultural pool — any culture, in the UI language.

import { pickPoem } from './poems.js?v=9';

const DAY_PROMPTS = ['nat.day.1', 'nat.day.2', 'nat.day.3'];
const EVE_PROMPTS = ['nat.eve.1', 'nat.eve.2'];

export function isEvening(date = new Date()) {
  const h = date.getHours();
  return h >= 18 || h < 5;
}

// idx rotates via storage.natureIdx so repeat visitors see fresh invitations
export function pickInterlude(idx, date = new Date()) {
  if (isEvening(date)) {
    const key = EVE_PROMPTS[idx % EVE_PROMPTS.length];
    return {
      textKey: key,
      poem: key === 'nat.eve.1' ? pickPoem(idx) : null,  // poem prompt embeds a poem from the pool
      artNote: key === 'nat.eve.2',                      // art prompt adds painter suggestions
    };
  }
  return { textKey: DAY_PROMPTS[idx % DAY_PROMPTS.length], poem: null, artNote: false };
}
