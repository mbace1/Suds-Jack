// Flash Prince — explicit legal movement-state graph.
// Mirrors the cinematic move vocabulary in hero.js and gives the playtest
// harness a single source of truth for transition regressions.

import { assertTransitionTable } from '../../game-core/state-machine.js';

export const HERO_STATES = [
  'wake','stand','standArmed','turn','step','run','skid','crouch','crouchIdle',
  'standUp','roll','gather','gatherRun','air','fall','land','landHard','hang',
  'pullUp','drawGun','holster','fire','fireLow','crouchArmed','hurt','dead',
];

export const HERO_TRANSITIONS = {
  wake: ['stand'],
  stand: ['turn','step','crouch','gather','drawGun','hurt','fall','hang','dead'],
  standArmed: ['turn','step','crouch','gather','holster','fire','hurt','fall','hang','dead'],
  turn: ['stand','standArmed','step','crouch','gather','hurt','fall','hang','dead'],
  step: ['stand','standArmed','step','run','turn','crouch','gather','hurt','fall','hang','dead'],
  run: ['skid','roll','gatherRun','fall','hurt','dead'],
  skid: ['stand','standArmed','step','turn','crouch','gather','fall','hurt','dead'],
  crouch: ['crouchIdle','crouchArmed','hurt','dead'],
  crouchIdle: ['standUp','roll','crouch','hurt','fall','dead'],
  crouchArmed: ['standUp','roll','crouch','fireLow','hurt','fall','dead'],
  standUp: ['stand','standArmed','hurt','fall','dead'],
  roll: ['crouchIdle','crouchArmed','fall','hurt','dead'],
  gather: ['air','hurt','fall','dead'],
  gatherRun: ['air','hurt','fall','dead'],
  air: ['air','hang','land','landHard','fall','hurt','dead'],
  fall: ['fall','hang','land','landHard','hurt','dead'],
  land: ['stand','standArmed','step','hurt','fall','dead'],
  landHard: ['stand','standArmed','hurt','dead'],
  hang: ['pullUp','fall','hurt','dead'],
  pullUp: ['stand','hurt','fall','dead'],
  drawGun: ['standArmed','hurt','fall','dead'],
  holster: ['stand','hurt','fall','dead'],
  fire: ['standArmed','fire','hurt','dead'],
  fireLow: ['crouchArmed','fireLow','hurt','dead'],
  hurt: ['stand','standArmed','dead'],
  dead: ['dead'],
};

assertTransitionTable(HERO_TRANSITIONS, HERO_STATES);

export function validateHeroTransition(from, to) {
  if (from === to) return true;
  return HERO_TRANSITIONS[from]?.includes(to) ?? false;
}
