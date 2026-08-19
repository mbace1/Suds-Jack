// Betterment — authoritative game rules layered over the stable Kindling care core.
//
// The old care module remains responsible for the small, proven acts: checking a
// goal, mood, breathing, fuel, lifetime care and the 04:00 day key. This module
// owns the Betterment rules that sit above those acts:
//   - five care points tends the daily Fire, regardless of goal-list length
//   - optional progressive goal tiers pay bonus Flames/Bond without more Fire
//   - two consecutive completely missed care-days Kindle the active companion
//   - companion/lineage state lives in the same local `kindlingState` object
//
// Nothing here creates a second save, account, server or background obligation.

import { S, save, dayKey, caredToday, stage, FULL_DAY } from './state.js?v=10';

const DAY_MS = 86400000;
const FLAMES_PER_FUEL = 20;
const BASE_BOND_PER_CARE = 20;

const clean = value => String(value || '').trim().toLowerCase();

function dayNumber(key) {
  if (!key) return 0;
  const [y, m, d] = key.split('-').map(Number);
  return Date.UTC(y, m - 1, d) / DAY_MS;
}

function dayDistance(a, b) {
  if (!a || !b) return 0;
  return Math.max(0, Math.round(dayNumber(b) - dayNumber(a)));
}

function companionName(generation) {
  return generation <= 1 ? 'Ember' : `Ember ${generation}`;
}

function makeCompanion(generation = 1) {
  const today = dayKey();
  return {
    id: `ember-${Date.now().toString(36)}-${generation}`,
    name: companionName(generation),
    species: 'ember',
    generation,
    bornDay: today,
    startKept: S.kept || 0,
    startBondXp: totalBondXp(),
    alive: true,
  };
}

function ensureMeta() {
  const today = dayKey();
  let changed = false;
  if (!S.betterment || typeof S.betterment !== 'object') {
    // First activation starts a fresh grace day. Old inactivity must never
    // retroactively Kindle a companion when this ruleset first appears.
    S.betterment = {
      v: 2,
      activatedDay: today,
      lastCareDay: today,
      companion: null,
      lineage: [],
      kindling: { event: null },
      bonus: { date: today, done: [] },
      bonusBondXp: 0,
    };
    changed = true;
  }

  const m = S.betterment;
  if (!Number.isFinite(m.v) || m.v < 2) { m.v = 2; changed = true; }
  if (!m.activatedDay) { m.activatedDay = today; changed = true; }
  if (!m.lastCareDay) { m.lastCareDay = today; changed = true; }
  if (!Array.isArray(m.lineage)) { m.lineage = []; changed = true; }
  if (!m.kindling || typeof m.kindling !== 'object') { m.kindling = { event: null }; changed = true; }
  if (!m.bonus || typeof m.bonus !== 'object') { m.bonus = { date: today, done: [] }; changed = true; }
  if (!Array.isArray(m.bonus.done)) { m.bonus.done = []; changed = true; }
  if (!Number.isFinite(m.bonusBondXp)) { m.bonusBondXp = 0; changed = true; }
  if (m.bonus.date !== today) { m.bonus = { date: today, done: [] }; changed = true; }

  if (!m.companion) {
    const generation = Math.max(1, m.lineage.length + 1);
    m.companion = makeCompanion(generation);
    changed = true;
  } else {
    if (!m.companion.species) { m.companion.species = 'ember'; changed = true; }
    if (!Number.isFinite(m.companion.generation)) { m.companion.generation = Math.max(1, m.lineage.length + 1); changed = true; }
    if (!Number.isFinite(m.companion.startKept)) { m.companion.startKept = S.kept || 0; changed = true; }
    if (!Number.isFinite(m.companion.startBondXp)) { m.companion.startBondXp = totalBondXp(); changed = true; }
    if (m.companion.alive == null) { m.companion.alive = true; changed = true; }
  }

  if (changed) save();
  return m;
}

// Base care already increments S.kept once. Treat those units as +20 Bond XP,
// then keep optional-tier Bond separately so bonus play never distorts the core
// lifetime-care counter or creature growth thresholds.
export function totalBondXp() {
  const bonus = Number(S.betterment?.bonusBondXp) || 0;
  return (Number(S.kept) || 0) * BASE_BOND_PER_CARE + bonus;
}

const meta = ensureMeta();

function resetBonusDay() {
  const today = dayKey();
  if (meta.bonus.date !== today) {
    meta.bonus = { date: today, done: [] };
    save();
  }
}

export function observeCare() {
  const today = dayKey();
  // `lastKept` changes only when a qualifying act pays for the first time that
  // day, so it is the cleanest signal that the danger should reset.
  if (S.lastKept === today && meta.lastCareDay !== today) {
    meta.lastCareDay = today;
    save();
    return true;
  }
  return false;
}

function completedMissedDaysRaw() {
  // The care-day stored in lastCareDay itself was cared for (or is the initial
  // grace day). Only complete days strictly between it and today are missed.
  return Math.max(0, dayDistance(meta.lastCareDay, dayKey()) - 1);
}

export function missedCareDays() {
  observeCare();
  return completedMissedDaysRaw();
}

export function fireProgress() {
  return { done: Math.min(FULL_DAY, caredToday()), target: FULL_DAY };
}

export function activeCompanion() {
  return meta.companion;
}

export function lineage() {
  return meta.lineage;
}

export function kindlingEvent() {
  return meta.kindling.event?.pending ? meta.kindling.event : null;
}

export function isCompanionPresent() {
  return !!meta.companion?.alive && !kindlingEvent();
}

function archiveCurrentCompanion() {
  if (!meta.companion?.alive) return null;
  const today = dayKey();
  const currentBond = totalBondXp();
  const ancestor = {
    ...meta.companion,
    alive: false,
    kindledDay: today,
    stage: stage().id,
    careUnits: Math.max(0, (S.kept || 0) - (meta.companion.startKept || 0)),
    bondXp: Math.max(0, currentBond - (meta.companion.startBondXp || 0)),
    fate: 'kindled',
  };
  meta.lineage.push(ancestor);
  meta.companion = { ...meta.companion, alive: false };
  meta.kindling.event = {
    pending: true,
    day: today,
    companionId: ancestor.id,
    name: ancestor.name,
    generation: ancestor.generation,
    species: ancestor.species,
    stage: ancestor.stage,
    bondXp: ancestor.bondXp,
  };
  save();
  return ancestor;
}

export function evaluateKindling() {
  resetBonusDay();
  observeCare();
  if (!kindlingEvent() && meta.companion?.alive && completedMissedDaysRaw() >= 2) {
    archiveCurrentCompanion();
  }
  const missed = completedMissedDaysRaw();
  return {
    missed,
    warning: missed === 1 && !!meta.companion?.alive,
    event: kindlingEvent(),
    companion: meta.companion,
  };
}

export function wakeNextCompanion() {
  const generation = Math.max(meta.lineage.length + 1, (meta.companion?.generation || 0) + 1);
  meta.companion = makeCompanion(generation);
  meta.lastCareDay = dayKey();
  if (meta.kindling.event) meta.kindling.event.pending = false;
  save();
  return meta.companion;
}

const PROGRESSIVE = [
  {
    id: 'pushups-10',
    matches: ['do 10 push-ups', '10 push-ups'],
    tiers: [
      { id: '20', label: 'Feeling good? Reach 20 push-ups total', flames: 20, bondXp: 40 },
      { id: '30', label: 'One more tier: reach 30 push-ups total', flames: 20, bondXp: 60 },
    ],
  },
  {
    id: 'read-10',
    matches: ['read for 10 min', 'read for 10 minutes'],
    tiers: [
      { id: '20', label: 'Keep going: reach 20 minutes total', flames: 20, bondXp: 40 },
      { id: '30', label: 'One more tier: reach 30 minutes total', flames: 20, bondXp: 60 },
    ],
  },
  {
    id: 'walk-10',
    matches: ['take a short walk', 'walk for 10 min', 'walk for 10 minutes'],
    tiers: [
      { id: '20', label: 'Keep walking: reach 20 minutes total', flames: 20, bondXp: 40 },
      { id: '30', label: 'One more tier: reach 30 minutes total', flames: 20, bondXp: 60 },
    ],
  },
];

export function progressiveTemplate(taskOrText) {
  const text = clean(typeof taskOrText === 'string' ? taskOrText : taskOrText?.text);
  return PROGRESSIVE.find(t => t.matches.includes(text)) || null;
}

function bonusKey(taskId, templateId, tierId) {
  return `${taskId}:${templateId}:${tierId}`;
}

export function nextProgressiveTier(task) {
  resetBonusDay();
  if (!task || !S.sheet.done.includes(task.id)) return null;
  const template = progressiveTemplate(task);
  if (!template) return null;
  for (let index = 0; index < template.tiers.length; index++) {
    const tier = template.tiers[index];
    if (!meta.bonus.done.includes(bonusKey(task.id, template.id, tier.id))) {
      return { ...tier, index, templateId: template.id };
    }
  }
  return null;
}

export function progressiveOpportunities() {
  return S.tasks.flatMap(task => {
    const tier = nextProgressiveTier(task);
    return tier ? [{ task, tier }] : [];
  });
}

export function completeProgressiveTier(taskId) {
  resetBonusDay();
  const task = S.tasks.find(t => t.id === taskId);
  const tier = nextProgressiveTier(task);
  if (!task || !tier) return null;
  const key = bonusKey(task.id, tier.templateId, tier.id);
  if (meta.bonus.done.includes(key)) return null;

  meta.bonus.done.push(key);
  S.fuel += tier.flames / FLAMES_PER_FUEL;
  meta.bonusBondXp += tier.bondXp;
  save();
  return { task, tier, flames: tier.flames, bondXp: tier.bondXp };
}

export const progressiveTemplates = PROGRESSIVE.map(t => ({
  id: t.id,
  matches: [...t.matches],
  tiers: t.tiers.map(x => ({ ...x })),
}));

// Exposed intentionally for the repo smoke gate and future combat/lineage modules.
export const betterment = meta;
