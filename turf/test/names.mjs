// Bare-node gate for the crew-name generator — pure data + a pure function,
// same discipline as smoke.mjs's engine checks.
import assert from 'node:assert/strict';
import { randomName, POOLS } from '../js/names.js';
import { makeRng } from '../js/rng.js';

let pass = 0;
function check(name, fn) {
  fn();
  pass++;
  console.log(`  ok  ${name}`);
}

console.log('pools');
check('every pool is non-empty and has no duplicate entries', () => {
  for (const [key, list] of Object.entries(POOLS)) {
    if (Array.isArray(list)) {
      assert.ok(list.length > 0, key);
      assert.equal(new Set(list).size, list.length, `${key} has a duplicate`);
    } else {
      // NICKNAME: { small, big, neutral }
      for (const [tag, sub] of Object.entries(list)) {
        assert.ok(sub.length > 0, `${key}.${tag}`);
        assert.equal(new Set(sub).size, sub.length, `${key}.${tag} has a duplicate`);
      }
    }
  }
});

console.log('randomName');
check('same seed produces the same name every time', () => {
  const a = randomName(makeRng(1));
  const b = randomName(makeRng(1));
  assert.deepEqual(a, b);
});
check('different seeds eventually diverge', () => {
  const names = new Set();
  for (let seed = 0; seed < 50; seed++) names.add(randomName(makeRng(seed)).full);
  assert.ok(names.size > 10, `only ${names.size} distinct names across 50 seeds`);
});
check('first/last always resolve to a real pool entry', () => {
  for (let seed = 0; seed < 30; seed++) {
    const n = randomName(makeRng(seed));
    assert.ok(POOLS.FIRST_MALE.includes(n.first) || POOLS.FIRST_FEMALE.includes(n.first), n.first);
    assert.ok(POOLS.LAST.includes(n.last), n.last);
  }
});
check('withNickname: false never attaches a nickname', () => {
  for (let seed = 0; seed < 20; seed++) {
    const n = randomName(makeRng(seed), { withNickname: false });
    assert.equal(n.nickname, null);
    assert.equal(n.full, `${n.first} ${n.last}`);
  }
});
check('withNickname: true always attaches one from a real pool', () => {
  const all = [...POOLS.NICKNAME.small, ...POOLS.NICKNAME.big, ...POOLS.NICKNAME.neutral, ...POOLS.NICKNAME.handle];
  for (let seed = 0; seed < 20; seed++) {
    const n = randomName(makeRng(seed), { withNickname: true });
    assert.ok(all.includes(n.nickname), n.nickname);
    assert.equal(n.full, `${n.first} "${n.nickname}" ${n.last}`);
  }
});
check('a build hint mostly draws its own literal pool, but can draw the mismatch or a handle', () => {
  let literal = 0, mismatch = 0, neutral = 0, handle = 0;
  for (let seed = 0; seed < 400; seed++) {
    const n = randomName(makeRng(seed), { build: 'big', withNickname: true });
    if (POOLS.NICKNAME.big.includes(n.nickname)) literal++;
    else if (POOLS.NICKNAME.small.includes(n.nickname)) mismatch++;
    else if (POOLS.NICKNAME.handle.includes(n.nickname)) handle++;
    else neutral++;
  }
  assert.ok(literal > mismatch, `literal (${literal}) should outweigh the ironic mismatch (${mismatch})`);
  assert.ok(mismatch > 0, 'the "big guy called Smalls" mismatch should occur at least once in 400 draws');
  assert.ok(neutral > 0, 'the neutral pool should still show up');
  assert.ok(handle > 0, 'the internet-handle register (catlady05) should show up too');
});

console.log(`\n${pass} checks passed`);
