import { ANIM, sheetKey } from '../js/sprite.js';

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
console.log('character variants ok — body, weapon and locked run stay separate');
