// WHAT A PERSON DID, AS OPPOSED TO WHAT A BOT DID.
//
// Every number this project has ever quoted came from a bot. balance.mjs says
// whether an encounter is winnable by a player who ignores every system;
// smoke.mjs says the rules are obeyed. Neither can answer GDD §9's exit
// criterion — that the fight is "fun/tense to play through repeatedly" —
// because a bot has no clock, never hesitates, never misreads a telegraph and
// never closes the tab. This module reads those four things off a real session.
//
// It is a READER, exactly like anim.js: the engine stays pure and knows nothing
// about it. It hangs off the animator's `onEvent`, which is the ONE cursor over
// state.log — anim.js's own header says why a second cursor is a bug, so this
// takes the existing one rather than opening another.
//
// LOCAL ONLY, and that is not a footnote. It writes through the site's own
// `hub/playlog.js`, whose contract is already "Local-only by design ... nothing
// is uploaded". A note the player chooses to send carries a summary with it;
// nothing leaves the browser on its own. The import is DYNAMIC and swallowed on
// failure, the same rule the Toko sting follows: a nicety may never be the
// reason a game does not open, so if the hub module is missing this keeps its
// records in memory and the game plays on.
//
// The four questions, and how each is actually measured:
//
//  1. WHERE DID THEY HESITATE?  `armed()` starts a clock when the board becomes
//     the player's to act on; the next command stops it. That gap is a decision.
//     Bots report zero and a person reports the truth about legibility.
//
//  2. WHAT DID THEY NEVER USE?  An affordance is counted when it is OFFERED and
//     again when it is TAKEN. A skill nobody picks, an aim panel nobody opens
//     and a FIT button nobody presses are three different design facts, and all
//     three are invisible to a green suite.
//
//  3. DID THE TELEGRAPH LAND?  Before each player move the incoming total on
//     that operator is known; after it, so is the new one. A move that ENDS on
//     a higher incoming total is a step into danger, which is often correct. A
//     move that ends on a LETHAL total is the case the whole telegraph exists to
//     prevent, so it is counted separately. Neither is a verdict on the player:
//     a rising count is the game working, and a lethal one is a question.
//
//  4. WHERE DID THEY STOP?  A closed tab mid-encounter is the loudest signal
//     this game gets and it has been invisible since Milestone 1. `abandon()`
//     files the encounter, the round and what the board looked like.
//
// `summarise` is pure and takes plain records, which is what lets test/smoke.mjs
// assert exact numbers over a scripted session in bare node.

const GAME = 'turf';

// The log entry types that are a PLAYER's decision. An enemy-turn entry is not
// one of theirs, and a hazard or a pickup is a consequence rather than a choice.
export const KIND_OF = { move: 'move', attack: 'attack', ability: 'ability', reload: 'reload' };

// ---------------------------------------------------------------- the recorder

export function createPlaylog({ emit = null, now = () => Date.now() } = {}) {
  const records = [];
  let sink = emit;
  let run = null;          // the encounter in progress
  let armedAt = null;      // when the board last became actionable
  let pending = null;      // incoming totals read just before a command lands
  let cursor = 0;          // how far through state.log this reader has counted

  const send = (type, data) => {
    const rec = { at: new Date(now()).toISOString(), game: GAME, type, ...data };
    records.push(rec);
    if (sink) { try { sink(GAME, type, data); } catch { /* never break play */ } }
    return rec;
  };

  // An affordance is two counters, never one: offering Cleave nine times and
  // having it used once is a different fact from never offering it at all.
  const offer = key => { if (run) run.offered[key] = (run.offered[key] || 0) + 1; };
  const take = key => { if (run) run.taken[key] = (run.taken[key] || 0) + 1; };

  return {
    /**
     * The shared store arrives on a dynamic import, after the first few events
     * may already have happened. Setting it here replays nothing on purpose:
     * a record's value is the session it belongs to, and back-filling a store
     * with events it was not running for is how a log starts lying about when.
     */
    setEmitter(fn) { sink = fn; },

    /** Start of an encounter. `id` is the encounter, `index` its place in the run. */
    begin(id, index = 0) {
      run = {
        id, index, startedAt: now(), rounds: 1,
        decisions: [], offered: {}, taken: {},
        commands: 0, cancels: 0,
        intoDanger: 0, intoLethal: 0,
        finished: false,
      };
      cursor = 0;
      send('encounter-begin', { encounter: id, index });
    },

    /**
     * The board is the player's again — a turn opened, a command finished
     * resolving, or an operator was selected. Starts the decision clock. Calling
     * it twice without a command in between keeps the FIRST time, because the
     * decision began when the board went quiet, not when it was last repainted.
     */
    armed() { if (run && armedAt === null) armedAt = now(); },

    /** The board is not theirs: the enemy phase, an overlay, a running clip. */
    disarmed() { armedAt = null; },

    /**
     * Read the incoming totals for the player's units. Called with the map
     * incomingThreats() returns, just BEFORE a command, so the same call after
     * it can say whether the move walked into something.
     */
    watch(threats, uid) {
      if (!run || !threats) return;
      const t = threats.get(uid);
      pending = { uid, total: t ? t.total : 0, lethal: !!(t && t.lethal) };
    },

    /**
     * A command landed. `kind` is move / attack / ability / reload / endTurn.
     * Closes the decision clock and, for a move, compares the incoming total
     * against what `watch` read a moment ago.
     */
    command(kind, threatsAfter = null, hpOf = null) {
      if (!run) return;
      run.commands++;
      take(kind);
      if (armedAt !== null) {
        run.decisions.push({ kind, ms: Math.max(0, now() - armedAt) });
        armedAt = null;
      }
      if (kind === 'move' && pending && threatsAfter) {
        const t = threatsAfter.get(pending.uid);
        const total = t ? t.total : 0;
        // Lethal is measured on the TOTAL, the same way the board's badge
        // measures it: two rivals each taking half your health is the case a
        // per-attack marker hides.
        const hp = hpOf ? hpOf(pending.uid) : null;
        if (total > pending.total) run.intoDanger++;
        if (hp != null && total >= hp && pending.total < hp) run.intoLethal++;
      }
      pending = null;
    },

    /** A cancel. Churn per command is the comprehension proxy. */
    cancelled() { if (run) { run.cancels++; armedAt = now(); } },

    /** Something was put in front of the player. See `offer` above. */
    offered(key, n = 1) { for (let i = 0; i < n; i++) offer(key); },

    /** Something was used that is not a command (FIT, zoom, AUTO, the aim panel). */
    used(key) { take(key); },

    /**
     * Walk state.log from wherever this reader last stopped and count the
     * player's own commands, ONCE each.
     *
     * This exists because the first live session counted three moves for one
     * tap: main.js's onChange runs several times per action and the freshest
     * log entry stays the same across all of them, so a reader that looked at
     * "the last entry" counted it again on every repaint and reported a median
     * decision time a fifth of the truth. A cursor is the fix, and it belongs
     * HERE rather than in main.js so a gate in bare node can hold it.
     *
     * `isPlayerActor` decides whose command an entry is, because the log does
     * not say: the enemy phase appends its own attack entries, and `state.turn`
     * has already flipped by the time some of them land.
     */
    observe(log, { isPlayerActor, threats = null, hpOf = null } = {}) {
      if (!run || !log) return 0;
      if (log.length < cursor) cursor = 0;     // a new encounter reset the list
      let counted = 0;
      for (; cursor < log.length; cursor++) {
        const e = log[cursor];
        const kind = e && KIND_OF[e.type];
        if (!kind) continue;
        if (isPlayerActor && !isPlayerActor(e)) continue;
        this.command(kind, threats, hpOf);
        counted++;
      }
      return counted;
    },

    /** Fold one engine log entry. Wired to the animator's single cursor. */
    onEvent(e) {
      if (!run || !e) return;
      if (e.type === 'enemy-turn') { armedAt = null; }
      if (e.type === 'round') run.rounds = e.round || run.rounds + 1;
    },

    /** Round advanced (main.js knows this before the log does). */
    round(n) { if (run && n > run.rounds) run.rounds = n; },

    /** The encounter ended by its own rules. */
    finish(result) {
      if (!run || run.finished) return;
      run.finished = true;
      const rec = summariseRun(run, now());
      send('encounter', { ...rec, result });
      run = null; armedAt = null; pending = null;
    },

    /**
     * The tab went away with an encounter still running. This is the record the
     * project has never had: not "they lost" but "they stopped", which is a
     * different sentence about the same board.
     */
    abandon(reason = 'leave') {
      if (!run || run.finished) return;
      run.finished = true;
      send('abandon', { ...summariseRun(run, now()), reason });
      run = null; armedAt = null; pending = null;
    },

    /** Whether an encounter is currently open (so pagehide knows to file one). */
    get live() { return !!run && !run.finished; },

    /** Everything recorded this session, for the console and the gate. */
    records: () => records.slice(),
  };
}

// One encounter, flattened to the numbers worth keeping.
function summariseRun(run, at) {
  const ms = run.decisions.map(d => d.ms).sort((a, b) => a - b);
  return {
    encounter: run.id,
    index: run.index,
    seconds: Math.round((at - run.startedAt) / 1000),
    rounds: run.rounds,
    commands: run.commands,
    cancels: run.cancels,
    medianDecideMs: median(ms),
    slowestDecideMs: ms.length ? ms[ms.length - 1] : 0,
    intoDanger: run.intoDanger,
    intoLethal: run.intoLethal,
    offered: { ...run.offered },
    taken: { ...run.taken },
  };
}

const median = xs => (!xs.length ? 0
  : xs.length % 2 ? xs[(xs.length - 1) / 2]
  : Math.round((xs[xs.length / 2 - 1] + xs[xs.length / 2]) / 2));

// ------------------------------------------------------------------ the report

/**
 * PURE. Takes the records (this session's, or everything hub/playlog.js has
 * kept) and answers the four questions. No DOM, no clock, no storage — which is
 * what lets the gate assert exact numbers over a scripted session.
 *
 * `neverUsed` is the interesting half and deliberately lists what was OFFERED
 * and not taken, rather than every key in the catalogue: a skill the run never
 * put on screen was not declined, it was absent, and calling those the same
 * thing is how a report starts lying.
 */
export function summarise(records) {
  const runs = records.filter(r => r.type === 'encounter');
  const quits = records.filter(r => r.type === 'abandon');
  const all = runs.concat(quits);
  if (!all.length) {
    return { encounters: 0, plays: 0, wins: 0, losses: 0, quits: 0, note: 'nobody has played yet' };
  }
  const offered = {}, taken = {};
  let commands = 0, cancels = 0, intoDanger = 0, intoLethal = 0, seconds = 0;
  const decide = [];
  for (const r of all) {
    commands += r.commands || 0; cancels += r.cancels || 0;
    intoDanger += r.intoDanger || 0; intoLethal += r.intoLethal || 0;
    seconds += r.seconds || 0;
    if (r.medianDecideMs) decide.push(r.medianDecideMs);
    for (const [k, v] of Object.entries(r.offered || {})) offered[k] = (offered[k] || 0) + v;
    for (const [k, v] of Object.entries(r.taken || {})) taken[k] = (taken[k] || 0) + v;
  }
  const neverUsed = Object.keys(offered).filter(k => !taken[k]).sort();
  const perEncounter = {};
  for (const r of all) {
    const e = perEncounter[r.encounter] || (perEncounter[r.encounter] = { played: 0, won: 0, lost: 0, quit: 0 });
    e.played++;
    if (r.type === 'abandon') e.quit++;
    else if (r.result === 'win') e.won++;
    else e.lost++;
  }
  decide.sort((a, b) => a - b);
  return {
    encounters: Object.keys(perEncounter).length,
    plays: all.length,
    wins: runs.filter(r => r.result === 'win').length,
    losses: runs.filter(r => r.result && r.result !== 'win').length,
    quits: quits.length,
    seconds,
    medianDecideMs: median(decide),
    commands, cancels,
    cancelsPerCommand: commands ? Math.round((cancels / commands) * 100) / 100 : 0,
    intoDanger, intoLethal,
    offered, taken, neverUsed,
    perEncounter,
    // The one line worth reading first. Quitting is ranked above losing on
    // purpose: a loss is the game working and a quit is the game losing them.
    headline: headlineFor(quits.length, all.length, intoLethal, neverUsed),
  };
}

function headlineFor(quits, plays, intoLethal, neverUsed) {
  if (plays < 3) return 'too few plays to say anything yet';
  if (quits / plays >= 0.34) return `stopped mid-encounter ${quits} of ${plays} times — that is the thing to fix`;
  if (intoLethal > 0) return `walked into a lethal forecast ${intoLethal} ${intoLethal === 1 ? 'time' : 'times'} — the telegraph is not landing`;
  if (neverUsed.length >= 3) return `${neverUsed.length} offered things were never used: ${neverUsed.slice(0, 4).join(', ')}`;
  return 'played through without quitting, misreading a lethal, or ignoring the kit';
}

// --------------------------------------------------------------- the card

/**
 * The report as WORDS, and pure — no DOM, no clock — so the gate asserts the
 * wording in bare node exactly as it asserts the numbers above.
 *
 * It exists because the report was a `console.table` and this game is played on
 * a PHONE. A reading nobody can reach is a reading that does not exist: the
 * owner's own playtests are mobile, and "open the console" is the step that
 * ended the loop v41 was built to close.
 *
 * Every line is written to be readable by someone who did not build the game,
 * and two of them are written to avoid blaming the player for the board:
 * a move that ends under MORE fire is usually correct (you closed distance to
 * shoot), and something offered-and-declined may be a bad skill rather than a
 * bad decision. The wording says so rather than implying a score.
 */
export function reportLines(summary) {
  if (!summary || !summary.plays) {
    return { ready: false, headline: 'nothing recorded yet — play a block and come back', lines: [], encounters: [] };
  }
  const s = summary;
  const lines = [];
  const outcomes = [
    s.wins ? `${s.wins} won` : null,
    s.losses ? `${s.losses} lost` : null,
    s.quits ? `${s.quits} stopped part-way` : null,
  ].filter(Boolean);
  lines.push({
    label: 'blocks played', value: `${s.plays}${outcomes.length ? ` — ${outcomes.join(', ')}` : ''}`,
    note: s.quits ? 'stopping is the loudest signal this game gets' : null,
  });
  if (s.seconds) lines.push({ label: 'time on the board', value: clock(s.seconds) });
  if (s.medianDecideMs) {
    lines.push({
      label: 'reading the board', value: `${secs(s.medianDecideMs)} a turn, typically`,
      note: 'the clock only runs while the board is yours — a long one is a legibility fact, not a slow player',
    });
  }
  if (s.commands) {
    lines.push({
      label: 'second thoughts', value: `${s.cancelsPerCommand} cancels per command`,
      note: s.cancelsPerCommand >= 0.4 ? 'high: something is being offered that is hard to read' : null,
    });
  }
  lines.push({
    label: 'moves into fire',
    value: s.intoDanger
      ? `${s.intoDanger}${s.intoLethal ? `, and ${s.intoLethal} into a LETHAL forecast` : ''}`
      : 'none',
    note: s.intoLethal
      ? 'a lethal one is the case the telegraph exists to prevent — that is the bug to chase'
      : 'closing distance under fire is usually the right move',
  });
  lines.push({
    label: 'offered and never used',
    value: s.neverUsed && s.neverUsed.length ? s.neverUsed.join(', ') : 'nothing — the whole kit got used',
    note: s.neverUsed && s.neverUsed.length
      ? 'could be a weak option or an unreadable button; only you know which'
      : null,
  });
  const encounters = Object.entries(s.perEncounter || {}).map(([id, e]) => ({ id, ...e }));
  // summarise()'s own headline is written for a reader with a sample and says
  // "too few plays" under three. On the card that is the first thing a player
  // sees after their FIRST block, and it reads as a shrug at what they just did.
  // The numbers under it are real on play one; only the PATTERN is not — so the
  // early line says exactly that and summarise() is left alone, because it is
  // pure, gated, and read by the console and the bots too.
  const headline = s.plays < 3
    ? `${s.plays === 1 ? 'one block' : `${s.plays} blocks`} in — the numbers below are real, the pattern is not yet`
    : s.headline;
  return { ready: true, headline, lines, encounters };
}

/**
 * The same card as one block of plain text, for handing back. The loop this
 * closes is: play, copy, paste — which is the whole reason a card exists rather
 * than a console call.
 */
export function reportText(summary, { version = '' } = {}) {
  const card = reportLines(summary);
  const out = [`TURF${version ? ` ${version}` : ''} — session reading (local only)`, card.headline, ''];
  for (const l of card.lines) out.push(`${l.label}: ${l.value}`);
  if (card.encounters.length) {
    out.push('', 'per block:');
    for (const e of card.encounters) {
      const bits = [e.won && `${e.won} won`, e.lost && `${e.lost} lost`, e.quit && `${e.quit} stopped`].filter(Boolean);
      out.push(`  ${e.id} — played ${e.played}${bits.length ? ` (${bits.join(', ')})` : ''}`);
    }
  }
  return out.join('\n');
}

// A duration a person reads without converting. Sub-ten-second decisions keep
// one decimal because the difference between 0.8s and 2.4s is the finding.
const secs = ms => (ms < 10000 ? `${Math.round(ms / 100) / 10}s` : `${Math.round(ms / 1000)}s`);
const clock = s => (s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`);

// ---------------------------------------------------------------- the transport

/**
 * The site's shared local play log, loaded dynamically and allowed to fail.
 * hub/playlog.js's own header invites this: "Games can report richer events."
 * Using it rather than a second store is what lets Toko's counter read a TURF
 * session back later without learning anything about TURF.
 */
export async function hubEmitter() {
  try {
    const mod = await import('../../hub/playlog.js');
    return (game, type, data) => mod.logPlay(game, type, data);
  } catch {
    return null;   // in-memory only; the game does not care and must not break
  }
}
