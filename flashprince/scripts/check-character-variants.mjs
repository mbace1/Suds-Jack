import { ANIM, sheetKey, characterVariant } from '../js/sprite.js';

const bodyStates = ['stand', 'run', 'gather', 'airUp', 'land', 'hang', 'mantle'];
for (const name of bodyStates) {
  if (sheetKey(name) !== 'body') throw new Error(`${name}: default body routing changed`);
  if (sheetKey(name, 'classicBody') !== 'classicBody') throw new Error(`${name}: Courier body routing changed`);
}

for (const [name, anim] of Object.entries(ANIM)) {
  if (anim.sheet !== 'sword') continue;
  if (sheetKey(name) !== 'sword') throw new Error(`${name}: default weapon routing changed`);
  if (sheetKey(name, 'classicBody') !== 'classicSword') throw new Error(`${name}: Courier weapon frame mixes characters`);
  if (sheetKey(name, 'foe') !== 'foe') throw new Error(`${name}: foe routing changed`);
}

if (sheetKey('legacyRun', 'classicBody') !== null) throw new Error('locked v18 run must bypass image sheets');

if (characterVariant('conrad') !== undefined) throw new Error('default character must use the default sheet');
if (characterVariant('classic') !== 'classicBody') throw new Error('Courier must use its complete sheet');
if (characterVariant('legacy') !== 'classicBody') throw new Error('archive non-run actions must use the complete Courier sheet');

for (const name of ['crouch', 'crouchLow', 'rise', 'stepUp', 'collect']) {
  if (ANIM[name].ground !== 47) throw new Error(`${name}: row-17 feet must anchor on source pixel 47`);
}

console.log('character variants ok — body, weapon, low floor and locked run stay separate');
