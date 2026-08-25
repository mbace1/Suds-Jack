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
  // The parcel run. One thing, followed across more than one layer, and the
  // only goal whose progress is measured in LEGS rather than in a count.
  escort: {
    needs: 'payload',
    // ONE test, and it is the arrival. The first cut also asked that
    // `parcel.leg` had reached `legs.length`, which can never happen:
    // `advance()` stops at the last leg by design, so a two-leg load tops out
    // at leg 1 and the goal was unreachable on every board. Measured as 0 wins
    // in 10 while the handover itself worked 7 times.
    done: g => (g.delivered?.size ?? 0) > 0,
    read: (g, goal) => {
      const p = g.parcel;
      const legs = p?.legs?.length ?? goal.legs ?? 2;
      if (!p) return { have: 0, want: legs, text: 'the load has not been handed over yet' };
      if (g.delivered?.size) return { have: legs, want: legs, text: `${goal.what ?? 'the load'} is there` };
      const on = p.layer === 'roads' ? 'by road' : 'on the metro';
      return { have: p.leg, want: legs, text: `leg ${p.leg + 1} of ${legs}, ${on}` };
    },
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
export const CAPABILITIES = new Set(['delivery', 'clock', 'crowding', 'payload']);

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

  {
    id: 'rush',
    mode: 'mission',
    order: 2,
    layer: 'roads',
    title: 'The Rush',
    brief:
      'Cars, not trains. You lay the roads and nothing else — every driver picks '
      + 'their own way and will not be told otherwise. Room runs out before time does.',
    length: 420,
    clock: { unit: 60, units: ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00'], cycle: 7, cycleWord: 'morning', upgradeEvery: 105 },
    board: { w: 860, h: 600, maxStations: 14, minGap: 96, margin: 60, firstStation: 10 },
    spawn: {
      // Tuned by measurement, and the measurement said something useful: cars
      // never become the constraint however many you grant. The number in
      // flight is set by DEMAND against how fast a road can clear — grant
      // thirty and twenty sit idle. So the dial that matters here is traffic,
      // and the pressure arrives as buildings backing up rather than as a
      // pretty tailback.
      base: 0.5, ramp: 700, cap: 0.7,
      stationEvery: [26, 34], specialsAfter: 200, specialChance: 0.12,
      bursts: [],
    },
    // ROOM is the resource, not frequency: squares of road, and cars to fill
    // them. No lines, no carriages. Running out of road is the real defeat —
    // the estate that goes up next has no way out of it.
    resources: { road: 34, cars: 20, bridge: 3 },
    // 190, and 85 was the first guess being far too kind. A deterministic
    // player joining each new building to the nearest road it already owns
    // wins 12 boards in 16 at 190 and reaches it at 4:56 of the 7:00 — so the
    // last third of the morning is still doing work, which 85 (won at 2:41)
    // was not. Past 210 the wins fall away, and they fall away for the wrong
    // reason: the clock, rather than the town outgrowing its roads.
    goals: [{ type: 'deliver', n: 190 }],
    fail: { overcrowd: 50 },
    giveUp: 60,
  },

  {
    id: 'transfer',
    mode: 'mission',
    order: 3,
    // BOTH layers, running at once. Not a toggle between two boards: the trains
    // call while the cars drive, both feeding the same platforms, and the city
    // you are not looking at keeps needing you. That is the owner's call, and
    // it is the only version where handing a load over costs anything —
    // stopping the world to deal with the parcel would make the transfer a
    // cutscene rather than a decision.
    layers: ['metro', 'roads'],
    title: 'The Handover',
    brief:
      'One load, two networks. The metro takes it as far as the interchange and a van has to '
      + 'take it on from there — while the rest of the city carries on wanting things.',
    length: 480,
    clock: { unit: 60, units: ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00'], cycle: 8, cycleWord: 'shift', upgradeEvery: 120 },
    board: { w: 860, h: 600, maxStations: 16, minGap: 92, margin: 56, firstStation: 11 },
    spawn: {
      // ordinary traffic keeps coming, because the parcel competing for the
      // same trains is the whole tension. Quieter than the endless city: two
      // networks to keep up with is already work.
      base: 0.34, ramp: 320, cap: 1.0,
      stationEvery: [20, 26], specialsAfter: 150, specialChance: 0.15,
      bursts: [],
    },
    // both layers' resources in one purse, because they are one mission
    resources: { lines: 3, trains: 3, tunnels: 2, road: 30, cars: 12, bridge: 2 },
    // A LOAD, not a passenger: it names the layer for each leg, so the metro
    // may carry it to the interchange and only a van may take it on. `at` is
    // when it turns up — late enough that there is a city to move it through.
    parcel: { at: 45, label: 'the load', legs: 3 },
    // TWO goals, and the second one is the mission. Escort alone was won at 74
    // seconds of eight minutes: a well-joined network moves one load almost at
    // once, so "get the load there" is a tutorial rather than a shift. The
    // delivery target is what makes neglect cost something — you cannot build
    // one corridor for the parcel and let the rest of the city rot, which is
    // the entire reason both layers run at the same time.
    // 120, measured. Swept against the escort: at 120 the seven boards that get
    // the load through are the seven that win, so the mission is decided by the
    // handover and not by the counter — which is what it is about. At 160 two
    // more are lost to the target instead, and at 240 only two survive at all.
    goals: [{ type: 'escort', what: 'the load' }, { type: 'deliver', n: 120 }],
    fail: { overcrowd: 45 },
    giveUp: 55,
  },
];

export const byId = id => MISSIONS.find(m => m.id === id);
export const campaign = () => MISSIONS.filter(m => m.order != null).sort((a, b) => a.order - b.order);

for (const m of MISSIONS) validate(m);
