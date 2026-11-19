// lines.mjs — a room's score lines from bot play (v51: a room is graded on its
// score, js/sim/director/campaign.js). Shared by room-tiers.mjs, which writes
// them, and room-eval.mjs, which measures a room against them, so the two can
// never draw them differently.
//
//   S  the sharp bot's median score among its clears
//   A  the average bot's median
//   B  the average bot's weaker quarter
//   C  "a small but still challenging score" (owner, 2026-10-27): the rough
//      bot's median, or the average bot's weakest tenth if that is lower — a
//      clear that only just lived through the room is under it, and an F
// A HARD room the average bot rarely clears takes its lines from how the
// sharp bot spreads. Every line sits at least `gap` below the one above, and
// they are rounded to two figures, so they read as targets.
const pct = (a, p) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.max(0, Math.round(p * (s.length - 1))))] : null; };
const nice = (v) => { if (!(v > 0)) return 0; const k = 10 ** Math.max(0, Math.floor(Math.log10(v)) - 1); return Math.round(v / k) * k; };

export function scoreLines({ sharp, average, rough }, { seeds, gap = 0.1 } = {}) {
  if (!sharp.length) return null;
  const enough = (a) => a.length >= Math.max(3, seeds * 0.25);
  const S = pct(sharp, 0.5);
  const A = enough(average) ? pct(average, 0.5) : pct(sharp, 0.25);
  const B = enough(average) ? pct(average, 0.25) : pct(sharp, 0.1);
  const lowAvg = enough(average) ? pct(average, 0.1) : pct(sharp, 0.02);
  const C = enough(rough) ? Math.min(pct(rough, 0.5), lowAvg) : lowAvg;
  const L = { S: nice(S) };
  L.A = nice(Math.min(A, L.S * (1 - gap)));
  L.B = nice(Math.min(B, L.A * (1 - gap)));
  L.C = nice(Math.min(C, L.B * (1 - gap)));
  // two figures can round two lines together: push the lower one down
  for (const [hi, lo] of [['S', 'A'], ['A', 'B'], ['B', 'C']]) if (L[lo] >= L[hi]) L[lo] = nice(L[hi] * (1 - gap));
  return L;
}

// the grade a score stands at against lines (as campaign.js grade())
export const gradeOf = (L, score) => (score >= L.S ? 'S' : score >= L.A ? 'A' : score >= L.B ? 'B' : score >= L.C ? 'C' : 'F');

// what the curve should look like (CAMPAIGN_PLAN.md step 3): for each band of
// difficulty, the share of runs the average and the rough bot should get
// through. A room outside its band is reported (room-tiers.mjs, room-eval.mjs,
// lines-diff.mjs). Moved here in v56 from the two copies those scripts kept.
export const BANDS = [
  { d: [1, 3], average: [0.9, 1], rough: [0.6, 1] },
  { d: [4, 6], average: [0.75, 1], rough: [0.25, 0.95] },
  // the average bot aims almost perfectly, so past the middle of the curve a
  // room being too easy shows in the rough bot, not in it
  { d: [7, 8], average: [0.6, 1], rough: [0, 0.6] },
  { d: [9, 10], average: [0.4, 0.9], rough: [0, 0.3] },
];
export const bandOf = (d) => BANDS.find((b) => d >= b.d[0] && d <= b.d[1]);
