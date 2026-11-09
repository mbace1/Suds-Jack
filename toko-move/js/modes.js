// Toko Move — THE DAILY AND THE WEEK ON THE JOURNEY (v3.6, ACT1.md §12).
//
// The real-time game's two shared shapes, now played as card journeys:
//   · ?daily — today's shift, the same for everyone: MEDIUM's rules on the
//     date's seed, with no memory and no regulars' standing, so nothing on
//     this device makes it a different shift from anybody else's. The first
//     finish stands (daily.js's record, shared with ?classic's).
//   · ?week — five shifts, Monday to Friday, the euros banked towards the
//     rent (week.js). Its own key, so a ?classic week (scored in points) is
//     never mixed in; a reload mid-shift is the clock-out, as it always was.
// `&classic` keeps the real-time versions (boot.js).
import * as Runs from './runs.js?v=6';
import { dateKey, dailySeed, dailyNumber, dateLabel } from './daily.js?v=2';
import * as W from './week.js?v=4';
import { MISSIONS, MISSION_BY_ID, missionRun, loadMissions, doneCount, PERK_ORDER } from './missions.js?v=5';

const ls = () => { try { return globalThis.localStorage; } catch { return null; } };
// the journey's week lives beside ?classic's under its own key
export function weekStore(s = ls()) {
  return { getItem: k => { try { return s?.getItem(`${k}3`) ?? null; } catch { return null; } },
    setItem: (k, v) => { try { s?.setItem(`${k}3`, v); } catch {} }, removeItem: k => { try { s?.removeItem(`${k}3`); } catch {} } };
}
// TODAY'S ERRAND (v3.17): one mission a day, the same for everyone — its own
// record beside the daily's (the daily's helpers, on their own key)
export function errandStore(s = ls()) {
  return { getItem: k => { try { return s?.getItem(`${k}Errand`) ?? null; } catch { return null; } },
    setItem: (k, v) => { try { s?.setItem(`${k}Errand`, v); } catch {} }, removeItem: k => { try { s?.removeItem(`${k}Errand`); } catch {} } };
}
// the errand a day deals: the missions in turn, from the daily's own count
export const errandOf = key => MISSIONS[((dailyNumber(key) % MISSIONS.length) + MISSIONS.length) % MISSIONS.length];
// Which shift this visit is. `date=YYYY-MM-DD` pins a daily (testers, and a
// shared "try yesterday's"); otherwise it is today, by the device's clock.
export function resolveMode(params, now = new Date(), s = ls()) {
  if (params.has('daily')) {
    const d = /^\d{4}-\d\d-\d\d$/.test(params.get('date') || '') ? new Date(`${params.get('date')}T12:00:00`) : now;
    const key = dateKey(d), number = dailyNumber(key), label = dateLabel(key);
    return { mode: 'daily', key, number, label, seed: dailySeed(key), run: { ...Runs.BY_ID.medium, id: 'daily', name: `DAILY ${number}`, title: label } };
  }
  if (params.has('week')) {
    const store = weekStore(s), week = W.resume(store), t = W.today(week);
    return { mode: 'week', week, store, day: t, seed: t.seed, run: { ...Runs.BY_ID.medium, id: 'week', name: t.name, title: `Week ${week.seed}` } };
  }
  // today's errand: the day's mission, the day's seed, every perk in the pool (the same for everyone)
  if (params.has('errand')) {
    const d = /^\d{4}-\d\d-\d\d$/.test(params.get('date') || '') ? new Date(`${params.get('date')}T12:00:00`) : now;
    const key = dateKey(d), number = dailyNumber(key), label = dateLabel(key), m = errandOf(key);
    return { mode: 'mission', errand: true, key, number, label, mission: m, run: missionRun(Runs.BY_ID[m.base || 'medium'], m, PERK_ORDER.length - 3), seed: dailySeed(`errand:${key}`) };
  }
  // a mission (v3.14, missions.js): ?mission=<id>, played on MEDIUM's city with its own steps
  const m = MISSION_BY_ID[params.get('mission')];
  if (m) return { mode: 'mission', mission: m, run: missionRun(Runs.BY_ID[m.base || 'medium'], m, doneCount(loadMissions(s))), seed: Number(params.get('seed')) || null };
  return { mode: 'run', run: Runs.resolveRun(params), seed: Number(params.get('seed')) || null };
}
// The line you send: the grid, the euros, and where to play it.
export function dailyShare(m, results, target, euros, url = '') {
  const grid = Array.from({ length: target }, (_, i) => ({ ok: '🟩', late: '🟨' })[results[i]] || '⬛').join('');
  return [`Toko Move · Daily ${m.number} · ${m.label}`, `${grid} · €${euros}`, url || null].filter(Boolean).join('\n');
}
// The errand's line: the mission, a square a job (lost ones dark), the euros, the build.
export function errandShare(m, { results, target, score, lost, perks }, url = '') {
  const grid = Array.from({ length: target }, (_, i) => ({ ok: '🟩', late: '🟨' })[results[i]] || (lost ? '🟥' : '⬛')).join('');
  return [`Toko Move · Errand ${m.number} · ${m.label}`, `${m.mission.name} ${grid} · €${score}${perks?.length ? ` · ${perks.join(', ')}` : ''}`, url || null].filter(Boolean).join('\n');
}
export { W };
