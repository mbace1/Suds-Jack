// What a mission is, and what a mission may ask for.
//
// The owner's direction (ROADMAP.md) turns almost every constant in this game
// into a per-mission variable: the clock rate, the transport space, the board,
// the win condition, the fail rule, and eventually which layers are in play. So
// the numbers live HERE and the sim owns none of its own. If a tuning value can
// be found in sim.js, world.js or lines.js, it is in the wrong file.
//
// The test that this format is right is `endless`: the game as it shipped at v2,
// expressed entirely as data. It has to play the same. If it does not, the
// format is missing something rather than the mission being wrong.

export const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const HOURS = ['21:00', '22:00', '23:00', '00:00', '01:00', '02:00', '03:00', '04:00', '05:00', '06:00'];

// ── what a goal can be ──────────────────────────────────────────────────
// Five kinds, because a mission may state any of them. `needs` is the honest
// part: a goal declares the capability it depends on, the mission is validated
// against what the sim can actually do, and a mission asking for something that
// does not exist yet FAILS LOUDLY at load. The alternative — a goal that simply
// never completes — is a mission that looks playable and cannot be finished.

export const GOALS = {
  deliver: {
    needs: 'delivery',
    done: (g, goal) => g.score >= goal.n,
    // just the target: the number delivered is already the biggest thing on the
    // strip, and "4 delivered … 4/220 delivered" said it twice
    read: (g, goal) => ({ have: g.score, want: goal.n, text: `target ${goal.n}` }),
  },
  survive: {
    needs: 'clock',
    done: (g, goal) => g.time >= goal.t,
    read: (g, goal) => ({
      have: Math.min(g.time, goal.t), want: goal.t,
      text: `${fmt(Math.max(0, goal.t - g.time))} to hold out`,
    }),
  },
  // keep a line from being crossed for the whole mission. Broken is sticky:
  // once crossed it stays broken, or "hold the line" would mean "be tidy at the
  // final whistle", which is a different and much easier game.
  hold: {
    needs: 'crowding',
    done: (g, goal) => g.time >= goal.t && !g.holdBroken,
    read: (g, goal) => ({
      have: g.holdBroken ? 0 : 1, want: 1,
      text: g.holdBroken ? 'the line was crossed' : `holding — ${fmt(Math.max(0, goal.t - g.time))} left`,
    }),
  },
  // the parcel run. Needs cargo, which does not exist yet.
  escort: {
    needs: 'payload',
    done: (g, goal) => g.escorted?.has(goal.what),
    read: (g, goal) => ({ have: 0, want: 1, text: `get ${goal.what} to ${goal.to}` }),
  },
  // the money layers. Needs an economy, which does not exist yet.
  budget: {
    needs: 'money',
    done: (g, goal) => g.money >= goal.n,
    read: (g, goal) => ({ have: g.money ?? 0, want: goal.n, text: `${g.money ?? 0}/${goal.n}` }),
  },
};

// Ceil to whole seconds FIRST, then split. Two bugs live here and the fix is
// the same for both: flooring the minutes off a raw float while ceiling the
// seconds separately printed "1:60" for 119.4s, and rounding instead of ceiling
// makes a countdown show 1:59 while there is still a whole two minutes to run.
// Ceil the total, then divide.
export const clockFmt = s => {
  const t = Math.max(0, Math.ceil(s));
  return `${(t / 60) | 0}:${String(t % 60).padStart(2, '0')}`;
};
const fmt = clockFmt;

// What this build of the sim can actually do. Grows as layers arrive; a goal
// naming anything outside it is refused rather than quietly impossible.
export const CAPABILITIES = new Set(['delivery', 'clock', 'crowding']);

export function validate(m, caps = CAPABILITIES) {
  const bad = [];
  for (const goal of m.goals || []) {
    const spec = GOALS[goal.type];
    if (!spec) { bad.push(`unknown goal type "${goal.type}"`); continue; }
    if (!caps.has(spec.needs)) bad.push(`goal "${goal.type}" needs ${spec.needs}, which this build does not have`);
  }
  if (m.length != null && m.length <= 0) bad.push('length must be positive or null');
  if (!m.clock?.unit) bad.push('a mission needs a clock');
  if (bad.length) throw new Error(`mission "${m.id}": ${bad.join('; ')}`);
  return m;
}

// ── the missions ────────────────────────────────────────────────────────

export const MISSIONS = [
  {
    id: 'endless',
    mode: 'endless',
    order: null,                    // not on the campaign spine
    title: 'The City',
    brief: 'No end and no target. The city grows until you cannot keep up with it.',
    length: null,
    clock: { unit: 8, units: DAYS, cycle: 7, cycleWord: 'week', upgradeEvery: 56 },
    board: { w: 860, h: 600, maxStations: 26, minGap: 88, margin: 52, firstStation: 12 },
    spawn: {
      base: 0.45, ramp: 210, cap: 1.9,
      stationEvery: [13, 19], specialsAfter: 55, specialChance: 0.2,
      bursts: [],
    },
    resources: { lines: 3, trains: 3, tunnels: 2 },
    goals: [],
    fail: { overcrowd: 45 },
    // how long somebody waits for a shape no line reaches before walking away.
    // null would mean they never do, which is Mini Metro's behaviour and the
    // thing PLAYTEST.md measured as an invisible loss.
    giveUp: 45,
  },

  {
    id: 'festival',
    mode: 'mission',
    order: 1,
    title: 'The Festival',
    brief:
      'The festival closes at midnight and the whole field walks to the nearest stops at once. '
      + 'You have until dawn, and the hour before midnight to get ready for it.',
    length: 600,
    // an hour a minute, so the clock face tells the story on its own: you can
    // see midnight coming for three units before it lands
    clock: { unit: 60, units: HOURS, cycle: 10, cycleWord: 'night', upgradeEvery: 120 },
    board: { w: 860, h: 600, maxStations: 18, minGap: 88, margin: 52, firstStation: 12 },
    spawn: {
      // a quiet night, deliberately: at the first tuning the ordinary traffic
      // was 76% of everyone who turned up, so the festival — the entire premise
      // — was a detail inside a normal evening. Now the crowd is most of it.
      base: 0.2, ramp: 900, cap: 0.15,
      stationEvery: [22, 30], specialsAfter: 120, specialChance: 0.16,
      // midnight. The crowd does not appear at the festival — it WALKS, so it
      // lands spread across the four nearest stops, which is what makes the
      // shape of your network before midnight the thing that decides the night.
      bursts: [{ at: 180, n: 240, spread: 6, label: 'The festival is out. Everyone is walking to a stop.' }],
    },
    resources: { lines: 4, trains: 4, tunnels: 2 },
    // 220 is measured, not guessed. Across eight seeds a player who keeps
    // every stop connected delivers 235-383 of the 439 who turn up (median
    // 326), and a player who draws nothing delivers none. So the target sits
    // just under the worst good board: competent play wins anywhere, sloppy
    // play does not, and the last hour is still doing work.
    goals: [{ type: 'deliver', n: 220 }],
    // NO SUDDEN DEATH, and this is the mission's whole argument. A crowd
    // jamming the stops IS the festival — ending the run for it contradicts the
    // premise, and tuned the other way it killed every seed at exactly t=240,
    // sixty seconds after the burst, because nothing on earth clears thirty
    // people off a six-capacity platform in a minute. The gauge still fills and
    // still warns; it just costs you the people rather than the night.
    fail: { overcrowd: null },
    // longer on a festival night: the whole point is that the crowd is stuck
    // for a while, and people walking away from a party they cannot leave is
    // the failure the mission is about
    giveUp: 70,
  },
];

export const byId = id => MISSIONS.find(m => m.id === id);
export const campaign = () => MISSIONS.filter(m => m.order != null).sort((a, b) => a.order - b.order);

for (const m of MISSIONS) validate(m);
