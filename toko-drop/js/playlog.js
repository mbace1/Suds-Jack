// playlog.js — v268. What a PERSON did, read off a real session.
//
// Every number this game had through v267 came from a bot: the soak, the
// campaign curve, the weapon table, the world rules. A bot has no clock of its
// own, never hesitates, picks up every pod it drives over and never closes the
// tab — so no bot can answer the questions the design actually turns on:
//   · where do people STOP (which is not the same event as dying)?
//   · do they go again — how long from the death screen to the next run?
//   · what is offered and never taken (weapon pods by family, gates)?
//   · where do they hesitate (the title, the campaign list)?
//   · where do they die (which world, what killed them)?
//
// LOCAL ONLY, like TURF v41's reader and the site's hub/playlog.js it writes
// through ("Local-only by design ... nothing is uploaded"). A run writes one
// compact line to the shared log, so Toko's counter can read a session back
// without learning anything about this game, and keeps its detail in its own
// store. No upload, no beacon, no consent prompt — there is nothing to consent
// to.
//
// summarise() is PURE — plain records in, a report out, no DOM, no clock, no
// storage — which is what lets scripts/playlog-check.mjs assert exact numbers
// over a scripted session in bare node.

export const STORE_KEY = 'tokoDropPlay.v1';
export const STORE_MAX = 400;

// ── the reader ──────────────────────────────────────────────────────────────
// `now` is injected (ms), `store` is { read(), write(records) }, `send` is the
// shared-log sink or null. main.js owns the hooks; this owns the arithmetic.
export function createReader({ now, store, send = null }) {
  let run = null;                 // the run in progress, or null
  let deathAt = null;             // when the last run ended (death screen or room result)
  let lastRunId = null, lastOutcome = null;
  const loadedAt = now();
  let titleFiled = false, pickOpenedAt = null;
  let seq = 0;

  const file = (rec, share = false) => {
    const all = store.read();
    all.push(rec);
    store.write(all.slice(-STORE_MAX));
    if (send && share) {
      try { send('tokodrop', rec.type, { mode: rec.mode, world: rec.world, wave: rec.wave, secs: rec.secs, outcome: rec.outcome ?? rec.reason }); } catch (_) {}
    }
    return rec;
  };
  const bump = (bag, k, n = 1) => { bag[k] = (bag[k] || 0) + n; };
  const snapshot = (extra = {}) => ({
    runId: run.id, mode: run.mode, melee: run.melee, room: run.room, goal: run.goal,
    world: run.world, wave: run.wave,
    secs: Math.round((now() - run.startedAt) / 1000),
    kills: run.kills, hits: run.hits,
    pods: { offered: { ...run.podsOffered }, taken: { ...run.podsTaken }, expired: run.podsExpired },
    gates: { offered: run.gatesOffered, dashed: run.gatesDashed },
    bosses: { met: run.bossesMet, beat: run.bossesBeat },
    ...extra,
  });

  return {
    // a run starts. `mode`: 'arcade' | 'campaign' | 'rush' | a cabinet name
    start({ mode, melee = false, room = null, goal = null, world = null, wave = 1 }) {
      if (run && !run.done) this.abandon('replaced');
      const t = now();
      if (!titleFiled) { titleFiled = true; file({ type: 'title', secs: +((t - loadedAt) / 1000).toFixed(1) }); }
      if (deathAt != null) {           // they went again: how long did it take?
        file({ type: 'restart', gapS: +((t - deathAt) / 1000).toFixed(1), after: lastRunId, afterOutcome: lastOutcome });
        deathAt = null;
      }
      run = { id: `${Math.round(t)}-${++seq}`, mode, melee, room, goal, world, wave, startedAt: t, done: false,
              kills: 0, hits: 0, podsOffered: {}, podsTaken: {}, podsExpired: 0,
              gatesOffered: 0, gatesDashed: 0, bossesMet: 0, bossesBeat: 0, shared: false };
      return run.id;
    },
    // what happened, as it happens
    wave(n, world) { if (run) { run.wave = n; if (world != null) run.world = world; } },
    kill(isBoss) { if (!run) return; run.kills++; if (isBoss) run.bossesBeat++; },
    hit() { if (run) run.hits++; },
    podOffered(fam) { if (run && fam) bump(run.podsOffered, fam); },
    podTaken(fam) { if (run && fam) bump(run.podsTaken, fam); },
    podExpired() { if (run) run.podsExpired++; },
    gateOffered() { if (run) run.gatesOffered++; },
    gateDashed() { if (run) run.gatesDashed++; },
    bossMet() { if (run) run.bossesMet++; },
    // the run ended by its own rules
    end({ outcome, killer = null, grade = null }) {
      if (!run || run.done) return null;
      run.done = true;
      const rec = file({ type: 'run', ...snapshot({ outcome, killer, grade }) }, true);
      lastRunId = run.id; lastOutcome = outcome;
      deathAt = now();                 // the death screen (or room result) is up
      run = null;
      return rec;
    },
    // the page went away with a run still going. Not "they lost": "they stopped".
    // The run is NOT closed: a pocketed phone comes back, and so does a page
    // restored from the back/forward cache — and a page that never comes back
    // never runs another line anyway. So this files what the run looked like at
    // that moment, and summarise() counts it as a quit only if that run never
    // reports again. Only a new run starting over a live one ('replaced') closes it.
    abandon(reason = 'leave') {
      if (!run || run.done) return null;
      const rec = file({ type: 'abandon', ...snapshot({ reason }) }, !run.shared);   // one shared line per run, however often it is hidden
      run.shared = true;
      if (reason === 'replaced') { run.done = true; run = null; }
      return rec;
    },
    // the campaign list: how long before a room is picked
    pickOpened() { pickOpenedAt = now(); },
    picked(room) {
      if (pickOpenedAt == null) return;
      file({ type: 'pick', room, secs: +((now() - pickOpenedAt) / 1000).toFixed(1) });
      pickOpenedAt = null;
    },
    get live() { return !!run && !run.done; },
    get runId() { return run ? run.id : null; },
    records: () => store.read(),
  };
}

// ── the report ──────────────────────────────────────────────────────────────
const median = xs => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b), m = s.length >> 1;
  return s.length % 2 ? s[m] : +((s[m - 1] + s[m]) / 2).toFixed(1);
};

/**
 * PURE. Records in, report out. The questions, in the order they matter:
 * quitting is ranked ABOVE dying, because a death is the game working and a
 * quit is the game losing them.
 */
export function summarise(records) {
  const runs = records.filter(r => r.type === 'run');
  // an abandon is a QUIT only if its run never reported again — a phone that
  // was pocketed and taken back out finished the same run, it did not quit it
  const finished = new Set(runs.map(r => r.runId));
  const lastAbandon = new Map();
  for (const r of records) if (r.type === 'abandon' && !finished.has(r.runId)) lastAbandon.set(r.runId, r);
  const quits = [...lastAbandon.values()];
  const plays = runs.length + quits.length;
  if (!plays) return { plays: 0, note: 'nobody has played yet' };

  const isDeath = o => o === 'died' || o === 'dead';
  const deaths = runs.filter(r => isDeath(r.outcome));
  // "went again" is a question about DEATHS: a cleared room followed by the
  // next room is the campaign working, not a player choosing to try again
  const restarts = records.filter(r => r.type === 'restart' && isDeath(r.afterOutcome));
  const titleWaits = records.filter(r => r.type === 'title').map(r => r.secs);
  const picks = records.filter(r => r.type === 'pick').map(r => r.secs);

  const by = (list, key) => { const o = {}; for (const r of list) { const k = r[key] ?? '—'; o[k] = (o[k] || 0) + 1; } return o; };
  const offered = {}, taken = {};
  let expired = 0, gatesOffered = 0, gatesDashed = 0, secs = 0, bossesMet = 0, bossesBeat = 0;
  for (const r of runs.concat(quits)) {
    for (const [k, v] of Object.entries(r.pods?.offered || {})) offered[k] = (offered[k] || 0) + v;
    for (const [k, v] of Object.entries(r.pods?.taken || {})) taken[k] = (taken[k] || 0) + v;
    expired += r.pods?.expired || 0;
    gatesOffered += r.gates?.offered || 0; gatesDashed += r.gates?.dashed || 0;
    bossesMet += r.bosses?.met || 0; bossesBeat += r.bosses?.beat || 0;
    secs += r.secs || 0;
  }
  const podsOffered = Object.values(offered).reduce((a, b) => a + b, 0);
  const podsTaken = Object.values(taken).reduce((a, b) => a + b, 0);
  // what was ON SCREEN and never taken — a family never offered was absent,
  // not refused, and calling those the same thing is how a report starts lying
  const neverTaken = Object.keys(offered).filter(k => !taken[k]).sort();
  // "one more go": a death followed by another run within 30 s
  const gaps = restarts.map(r => r.gapS);
  const cameBack = gaps.filter(g => g <= 30).length;

  const report = {
    plays, runs: runs.length, deaths: deaths.length, quits: quits.length,
    quitRate: +(quits.length / plays).toFixed(2),
    quitsByWorld: by(quits, 'world'),
    quitsByMode: by(quits, 'mode'),
    deathsByWorld: by(deaths, 'world'),
    killers: by(deaths.filter(d => d.killer), 'killer'),
    minutes: +(secs / 60).toFixed(1),
    restartGapMedianS: median(gaps),
    wentAgain: restarts.length, cameBackWithin30s: cameBack,
    titleWaitMedianS: median(titleWaits),
    campaignPickMedianS: median(picks),
    pods: { offered, taken, podsOffered, podsTaken, expired, takeRate: podsOffered ? +(podsTaken / podsOffered).toFixed(2) : null, neverTaken },
    gates: { offered: gatesOffered, dashed: gatesDashed, dashRate: gatesOffered ? +(gatesDashed / gatesOffered).toFixed(2) : null },
    bosses: { met: bossesMet, beat: bossesBeat },
  };
  report.headline = headlineFor(report);
  return report;
}

// The headline is an id and its numbers, so the game can say it in the
// player's language (lang.js 'pl_<id>'); `text` is the English, for the console
// and for the check. First match wins — the order IS the priority.
export const HEADLINES = {
  few:     (n) => `only ${n} play${n === 1 ? '' : 's'} so far — too few to say anything yet`,
  quit:    (q, n, where) => `stopped mid-run ${q} of ${n} times${where ? `, most in ${where}` : ''} — that is the thing to fix`,
  noAgain: (w, d) => `went again after only ${w} of ${d} deaths — the loop is not pulling them back`,
  pods:    (t, o) => `took ${t} of ${o} weapon pods offered — not worth the detour, or not seen`,
  gates:   (d, o) => `dashed ${d} of ${o} gates — the gates are not being read`,
  ok:      () => 'went again, took the kit, and did not walk away mid-run',
};
function headlineFor(r) {
  const h = (id, ...args) => ({ id, args, text: HEADLINES[id](...args) });
  if (r.plays < 3) return h('few', r.plays);
  if (r.quitRate >= 0.34) {
    const where = Object.entries(r.quitsByWorld).filter(([k]) => k !== '—').sort((a, b) => b[1] - a[1])[0];
    return h('quit', r.quits, r.plays, where ? where[0] : null);
  }
  if (r.deaths >= 3 && r.wentAgain < r.deaths / 2) return h('noAgain', r.wentAgain, r.deaths);
  if (r.pods.takeRate != null && r.pods.podsOffered >= 5 && r.pods.takeRate < 0.4) return h('pods', r.pods.podsTaken, r.pods.podsOffered);
  if (r.gates.dashRate != null && r.gates.offered >= 5 && r.gates.dashRate < 0.2) return h('gates', r.gates.dashed, r.gates.offered);
  return h('ok');
}

// ── the transport ───────────────────────────────────────────────────────────
// The site's shared log, loaded dynamically and allowed to fail: a nicety can
// never be the reason the game does not run (the Toko sting's rule).
export async function hubEmitter() {
  try {
    const mod = await import('../../hub/playlog.js');
    return (game, type, data) => mod.logPlay(game, type, data);
  } catch (_) {
    return null;
  }
}

// the game's own detail store — localStorage, wrapped so a blocked store
// (private mode, a full disk) degrades to in-memory instead of throwing
export function localStore(key = STORE_KEY) {
  let mem = [];
  return {
    read() { try { return JSON.parse(localStorage.getItem(key)) || mem; } catch (_) { return mem; } },
    write(v) { mem = v; try { localStorage.setItem(key, JSON.stringify(v)); } catch (_) {} },
  };
}
