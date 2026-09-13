import assert from 'node:assert/strict';
import { Hero } from '../js/hero.js';
import { HERO_STATES } from '../js/hero-state-contract.js';
import { DEFAULT_CHARACTER, CHARACTER_PROFILES, PRINCE_CLIPS, profileCoversAllStates, setCharacterProfile } from '../js/character-animation.js';

assert.equal(DEFAULT_CHARACTER, 'prince');
assert.deepEqual(CHARACTER_PROFILES, ['prince','classic']);
assert.equal(profileCoversAllStates(), true, 'default Prince profile must cover every gameplay state');
assert.deepEqual(HERO_STATES.filter(s => !PRINCE_CLIPS[s]), []);
assert.ok(PRINCE_CLIPS.run.length >= 8, 'default Prince run must use the eight-key Rotoscope 3.0 cycle');

const hero = new Hero(60, 176);
setCharacterProfile('prince');
for (const state of HERO_STATES) {
  hero.state = state;
  hero.f = 1;
  const pose = hero.pose();
  assert.equal(pose.length, 13, `${state} must resolve to a complete Prince pose`);
}
setCharacterProfile('classic');
hero.state = 'run'; hero.f = 1;
assert.equal(hero.pose().length, 13, 'classic secondary profile remains playable');

console.log(`Flash Prince character animation: ${HERO_STATES.length} Prince states covered; classic secondary retained`);
