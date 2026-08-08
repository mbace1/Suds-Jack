// Deterministic goal sets make the Daily comparable while The Part can still
// build each spot from the node seed. A goal only reads session metrics; it
// never reaches into rendering or physics.

export function hashSeed(value) {
  let h = 2166136261;
  for (const ch of String(value)) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function rng(seed) {
  let s = (typeof seed === 'number' ? seed : hashSeed(seed)) >>> 0;
  return () => {
    s += 0x6D2B79F5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function utcDay(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function createMetrics() {
  return {
    score: 0,
    bestMult: 1,
    bestGrind: 0,
    bestManual: 0,
    tricks: 0,
    fakies: 0,
    rails: new Set(),
    bails: 0,
  };
}

const templates = [
  {
    id: 'score',
    make: d => ({ target: Math.round((6500 + d * 9500) / 500) * 500, read: m => m.score, unit: 'pts' }),
  },
  {
    id: 'combo',
    make: d => ({ target: 4 + Math.round(d * 4), read: m => m.bestMult, prefix: 'chain ×' }),
  },
  {
    id: 'grind',
    make: d => ({ target: +(1.8 + d * 2.2).toFixed(1), read: m => m.bestGrind, prefix: 'grind ', unit: 's', decimals: 1 }),
  },
  {
    id: 'manual',
    make: d => ({ target: +(1.5 + d * 2.5).toFixed(1), read: m => m.bestManual, prefix: 'manual ', unit: 's', decimals: 1 }),
  },
  {
    id: 'tricks',
    make: d => ({ target: 5 + Math.round(d * 7), read: m => m.tricks, unit: 'tricks' }),
  },
  {
    id: 'rails',
    make: d => ({ target: d > 0.66 ? 4 : 3, read: m => m.rails.size, prefix: 'rails ', unit: 'different' }),
  },
  {
    id: 'fakie',
    make: d => ({ target: d > 0.72 ? 2 : 1, read: m => m.fakies, unit: 'fakie landings' }),
  },
];

function format(v, decimals) {
  if (decimals != null) return Number(v).toFixed(decimals);
  return Math.floor(v).toLocaleString();
}

export class GoalSet {
  constructor(goals, required = 2) {
    this.goals = goals;
    this.required = Math.min(required, goals.length);
  }

  status(metrics) {
    return this.goals.map(goal => {
      const value = goal.read(metrics);
      const done = value >= goal.target;
      const prefix = goal.prefix || '';
      const unit = goal.unit ? ` ${goal.unit}` : '';
      return {
        id: goal.id,
        done,
        value,
        target: goal.target,
        label: `${prefix}${format(Math.min(value, goal.target), goal.decimals)} / ${format(goal.target, goal.decimals)}${unit}`,
      };
    });
  }

  completed(metrics) {
    return this.status(metrics).filter(goal => goal.done).length;
  }

  passed(metrics) {
    return this.completed(metrics) >= this.required;
  }
}

export function makeGoalSet(seed, difficulty = 0, options = {}) {
  const d = Math.max(0, Math.min(1, difficulty));
  const quota = options.quota || 1;
  if (options.boss) {
    const target = Math.round(((18000 + d * 14000) * quota) / 500) * 500;
    return new GoalSet([{ id: 'rival', target, read: m => m.score, prefix: 'beat ', unit: 'pts' }], 1);
  }

  const random = rng(seed);
  const pool = templates.slice();
  const goals = [];
  while (goals.length < 3 && pool.length) {
    const index = Math.floor(random() * pool.length);
    const template = pool.splice(index, 1)[0];
    const goal = { id: template.id, ...template.make(d) };
    if (goal.id === 'score') goal.target = Math.round(goal.target * quota / 500) * 500;
    goals.push(goal);
  }
  return new GoalSet(goals, 2);
}
