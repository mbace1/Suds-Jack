// The catalogue and its targeting. Pure — grid.js only, no DOM, no combat.js.
//
// WHY THE SPLIT. combat.js already owns "what a hit does" (the roll, the
// knockback, the hazard a shoved body lands in) and it is the file the
// bare-node gate leans on hardest. Duplicating any of that here would give
// this game two damage pipelines, which is the third-copy bug the hazard
// work already paid for once. So: this module answers WHO an ability can be
// used on and WHETHER it can be afforded, combat.js does the doing.
//
// WHY ABILITIES COST MOMENTUM. Through v24 momentum bought a flat +1 damage
// because there was nothing else to spend it on — an economy with one
// product. Costing abilities in it closes the loop the game took from Metal
// Slug Tactics: you MOVE to afford the thing you then do. A unit that stands
// still can still swing, and that is the point — the ordinary attack is
// always available, the interesting ones are not.
//
// WHY ONLY THE PLAYER HAS THEM. Enemy variety is `behaviour` (ai.js), and it
// is expressed entirely through where an enemy chooses to stand, which the
// telegraph can draw. An enemy kit would have to telegraph "and then it will
// Cleave", and a board carrying six such promises at once is not full
// information, it is a wall of text. Same reasoning as the sync cut in v24:
// symmetric on paper, unreadable in play.
import { manhattan, hasLOS, inBounds, unitAt, key } from './grid.js?v=2';

export function abilitiesFor(unit, defs) {
  if (!unit || !defs) return [];
  // Faction first, because `role` is shared: enemies are melee/ranged/control
  // too, and matching on role alone quietly handed the whole rival roster a
  // kit. Caught by the gate rather than by a playtest, which is the only
  // reason it is not in the shipped build.
  if (unit.faction !== 'player') return [];
  // A per-unit `abilities` list wins over the role default when one exists —
  // the seam for giving one operator a signature move later without
  // restructuring anything.
  if (unit.abilities) return defs.filter(a => unit.abilities.includes(a.id));
  return defs.filter(a => a.role === unit.role);
}

// Momentum is the only currency, and `actedAction` the only other gate: an
// ability IS your action, never an extra one.
export function canAfford(unit, ability) {
  return !unit.actedAction && (unit.momentum || 0) >= ability.cost;
}

// Why a button is greyed out, in the player's words rather than a boolean.
// A cost you cannot pay and a turn you already spent are different problems
// with different fixes, and a disabled button that says neither teaches
// nothing.
export function whyNot(unit, ability) {
  if (unit.actedAction) return 'already acted';
  const have = unit.momentum || 0;
  if (have < ability.cost) return `needs ${ability.cost} momentum, has ${have}`;
  return null;
}

// Everything this ability could be aimed at from where the unit stands.
// Returns unit uids for the targeted shapes and {x,y} tiles for the placed
// ones; 'self' returns a single sentinel so the UI can treat all three the
// same way. Never mutates.
export function abilityTargets(state, unit, ability) {
  const reach = ability.range || 1;
  switch (ability.shape) {
    case 'self':
      return [{ self: true }];
    case 'adjacent-all': {
      // One "target": everyone adjacent. Empty when nobody is, which is what
      // stops Cleave being usable into thin air.
      const hits = state.units.filter(u =>
        u.hp > 0 && u.faction !== unit.faction && manhattan(unit, u) <= 1);
      return hits.length ? [{ all: hits.map(u => u.uid) }] : [];
    }
    case 'empty-tile': {
      const out = [];
      for (let dx = -reach; dx <= reach; dx++) {
        for (let dy = -reach; dy <= reach; dy++) {
          if (Math.abs(dx) + Math.abs(dy) > reach || (!dx && !dy)) continue;
          const x = unit.x + dx, y = unit.y + dy;
          if (!inBounds(state.grid, x, y)) continue;
          // Nothing may already occupy it — a body, either kind of cover, or
          // a hazard. Dropping a crate onto an open stairwell would quietly
          // delete the most interesting tile on the board.
          if (unitAt(state, x, y)) continue;
          if (state.fullCover.has(key(x, y)) || state.partialCover.has(key(x, y))) continue;
          if (state.hazards && state.hazards.has(key(x, y))) continue;
          out.push({ x, y });
        }
      }
      return out;
    }
    default: {
      const range = ability.range || (unit.weapon ? unit.weapon.range : 1);
      return state.units
        .filter(u => u.hp > 0 && u.faction !== unit.faction
          && manhattan(unit, u) <= range && hasLOS(state, unit, u))
        .map(u => ({ uid: u.uid }));
    }
  }
}

export function findAbility(defs, id) {
  return (defs || []).find(a => a.id === id) || null;
}
