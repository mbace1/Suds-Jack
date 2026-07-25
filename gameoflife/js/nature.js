// The Game of Life — the nature interludes.
// Picks an invitation to the real world, aware of the hour: daytime prompts
// send you outdoors, evening prompts hand you a poem or a painting instead.
// Poems come from the cross-cultural pool — any culture, in the UI language.

import { pickPoem } from './poems.js?v=29';

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

// meteorological seasons. `hemi` is 'n' or 's' — south of the equator the year
// is the same shape half a turn along, so the months simply shift by six.
export function season(date = new Date(), hemi = 'n') {
  const m = (date.getMonth() + (hemi === 's' ? 6 : 0)) % 12;
  if (m === 11 || m <= 1) return 'winter';
  if (m <= 4) return 'spring';
  if (m <= 7) return 'summer';
  return 'autumn';
}

// IANA zones that are unambiguously south of the equator. Only used to pick a
// FIRST-RUN default — it is a hint, not a claim, and the hub lets you flip it.
const SOUTHERN = [
  'Australia/', 'Antarctica/', 'Pacific/Auckland', 'Pacific/Chatham',
  'Pacific/Fiji', 'Pacific/Norfolk', 'Pacific/Noumea', 'Pacific/Guadalcanal',
  'Pacific/Port_Moresby', 'Pacific/Tongatapu', 'Pacific/Apia',
  'America/Argentina/', 'America/Sao_Paulo', 'America/Santiago',
  'America/Montevideo', 'America/Asuncion', 'America/La_Paz', 'America/Lima',
  'America/Punta_Arenas', 'Africa/Johannesburg', 'Africa/Windhoek',
  'Africa/Harare', 'Africa/Maputo', 'Africa/Lusaka', 'Africa/Gaborone',
  'Africa/Luanda', 'Indian/Antananarivo', 'Indian/Mauritius', 'Indian/Reunion',
  'Atlantic/Stanley',
];

export function guessHemisphere() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    return SOUTHERN.some(p => tz.startsWith(p)) ? 's' : 'n';
  } catch {
    return 'n';
  }
}

// idx rotates via storage.natureIdx so repeat visitors see fresh invitations
export function pickInterlude(idx, date = new Date(), hemi = 'n') {
  const s = season(date, hemi);
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
