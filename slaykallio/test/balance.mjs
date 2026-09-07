// Slay Kallio — is the RUN shaped, and is any character stranded?
//   node slaykallio/test/balance.mjs [seeds]
//
// This is a measuring tool, not a gate. `core.mjs` answers "do the rules do
// what they say"; this answers the question the rules cannot: does the run
// escalate, and can every character get through it. It never fails a build,
// because its job is telling DULL from BROKEN — the same reason turf keeps
// `balance.mjs` beside `smoke.mjs`.
//
// What it found on its first run, and why the encounter list looks the way it
// does: the run was FLAT. Every character arrived at the boss on 91-99% HP and
// 100% of losses were the final encounter — five free fights and one coin
// flip. Cutting the post-fight heal did not fix it (losses stayed at the boss,
// you just arrived poorer); the middle fights simply could not threaten
// anybody, and escorting the bigger enemies is what fixed it.
//
// HONEST LIMITS, so nobody reads more into a column than is there:
//   - The bot is not a player. It plays the highest-value card it can afford
//     and always takes the first reward offered, so a character whose mechanic
//     rewards HOLDING a hand is measured by a bot that empties it.
//   - RARE cards are close to invisible: they only appear if drafted, and the
//     bot drafts blind. Moving Encore from 4 to 3 per card changed nothing at
//     all — not one win, not one loss — which says the measurement cannot see
//     that card rather than that the change was safe.
//   - A difference of a few points across 150 seeds is noise. Do not tune on it.

import { CHARACTERS, ENCOUNTERS, RULES } from '../js/data.js';
import { createRun, startRun, botRun, botTurn, chooseReward } from '../js/engine.js';

const SEEDS = Number(process.argv[2]) || 150;
const chars = Object.keys(CHARACTERS);

// ── win rate, and WHERE the run ends ─────────────────────────────────────
const rates = {};
const losses = {};
for (const ch of chars) {
  let wins = 0;
  for (let seed = 1; seed <= SEEDS; seed++) {
    const s = botRun(startRun(createRun({ seed, character: ch })));
    if (s.phase === 'won') wins++;
    else losses[s.encounter] = (losses[s.encounter] || 0) + 1;
  }
  rates[ch] = wins / SEEDS;
}

console.log(`\n── win rate over ${SEEDS} seeds ──`);
for (const ch of chars) {
  const pct = Math.round(rates[ch] * 100);
  console.log(`  ${ch.padEnd(10)} ${String(pct).padStart(3)}%  ${'█'.repeat(Math.round(pct / 3))}`);
}
const lo = Math.min(...Object.values(rates)), hi = Math.max(...Object.values(rates));
console.log(`  spread ${Math.round((hi - lo) * 100)} points`);

// ── the curve: what each fight actually costs ────────────────────────────
const arrive = ENCOUNTERS.map(() => []);
for (const ch of chars) {
  for (let seed = 1; seed <= SEEDS; seed++) {
    const s = startRun(createRun({ seed, character: ch }));
    let guard = 0, seen = -1;
    while ((s.phase === 'fight' || s.phase === 'reward') && guard++ < 400) {
      if (s.phase === 'reward') { chooseReward(s, 0); continue; }
      if (s.encounter !== seen) { seen = s.encounter; arrive[seen].push(s.hero.hp / s.hero.maxHp); }
      botTurn(s);
    }
  }
}
console.log(`\n── HP on ARRIVING at each fight (the curve) ──`);
ENCOUNTERS.forEach((e, i) => {
  const a = arrive[i];
  if (!a.length) return;
  const pct = Math.round(a.reduce((x, y) => x + y, 0) / a.length * 100);
  console.log(`  ${String(i + 1)}. ${e.kallio.name.padEnd(26)} ${String(pct).padStart(3)}%  ${'█'.repeat(Math.round(pct / 3))}`);
});

console.log(`\n── where runs END ──`);
const total = Object.values(losses).reduce((a, b) => a + b, 0);
ENCOUNTERS.forEach((e, i) => {
  const n = losses[i] || 0;
  if (n) console.log(`  fight ${i + 1}: ${n} losses (${Math.round(n / total * 100)}% of all deaths)`);
});
console.log(`  survived to the end: ${chars.length * SEEDS - total} of ${chars.length * SEEDS}`);

// ── the two readings that matter ─────────────────────────────────────────
const lastShare = (losses[ENCOUNTERS.length - 1] || 0) / Math.max(1, total);
console.log(`\n── reading ──`);
console.log(lastShare > 0.95
  ? `  FLAT: ${Math.round(lastShare * 100)}% of all deaths are the last fight. The run is a warm-up plus a coin flip.`
  : `  SHAPED: the last fight is ${Math.round(lastShare * 100)}% of deaths, so the middle of the run costs something.`);
console.log(lo < 0.15
  ? `  STRANDED: ${chars.find(c => rates[c] === lo)} wins ${Math.round(lo * 100)}% — below what a bot should manage.`
  : `  every character finishes runs (worst is ${Math.round(lo * 100)}%).`);
console.log(`  post-fight heal is ${RULES.healAfterFight}; raising it flattens the curve fastest.\n`);
