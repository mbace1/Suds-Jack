// EERI — the dev pack's contract gate.
//
// A STATIC test, on purpose. The dev menu is a browser thing and this file
// never opens a browser: what it checks is the *contract between the pack
// and the game*, which is exactly the part that rots silently.
//
// The pack works by reading `window.__eeri`. Nothing in `main.js` knows the
// pack exists, so nothing in `main.js` will ever fail when a hook the pack
// depends on is renamed — the dev menu just quietly shows dashes and the
// FX quietly stop firing, and you lose an afternoon before you notice. This
// file is that missing failure.
//
// It also holds the pack to CLAUDE_HANDOFF.md's hard rule — *"the pack is
// deliberately peripheral"* — by asserting the shipping game does not
// import it, and that `dev.html` wraps `index.html` rather than copying it.
//
// Run: node eeri/test/dev-menu.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const EERI = path.join(HERE, '..');
const read = (p) => fs.readFileSync(path.join(EERI, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(EERI, p));

let pass = 0, fail = 0;
const ok = (name, cond, note = '') => {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fail++; console.log(`  FAIL ${name}${note ? ' → ' + note : ''}`); }
};

console.log('\nthe pack is where it says it is');

for (const f of [
  'dev.html', 'dev/dev-menu.js', 'dev/dev-menu.css', 'dev/README.md',
  'js/fx.js', 'js/audio-fx.js', 'test/fx-smoke.mjs',
  'assets/fx/README.md', 'assets/audio/README.md',
]) ok(f, exists(f));

console.log('\nit is peripheral, and stays that way');

{
  // Real import statements only. An earlier cut of this check matched any
  // mention of the path and so failed on the COMMENT in main.js that
  // explains why the scene handle is exported — which is the opposite of
  // what the rule is for: the comment is how the next reader learns the
  // pack is peripheral.
  const main = read('js/main.js');
  const imports = [...main.matchAll(/^\s*import\s[^;]*?from\s+'([^']+)'/gm)].map((m) => m[1]);
  const leaked = imports.filter((i) => /dev-menu|(^|\/)fx\.js|audio-fx\.js/.test(i));
  ok(`the shipping game imports nothing from the pack${leaked.length ? ' — ' + leaked.join(', ') : ''}`,
    leaked.length === 0);
  const index = read('index.html');
  ok('index.html loads nothing from dev/', !index.includes('dev/'));
}

{
  const dev = read('dev.html');
  // The whole reason dev.html is a wrapper: a copy drifts. This repo has
  // paid for that three times in other files, so it is asserted rather
  // than remembered.
  ok('dev.html frames index.html rather than copying it',
    /<iframe[^>]+src="\.\/index\.html/.test(dev));
  ok('…and skips the title screen, since it is a feel harness',
    /index\.html\?skip/.test(dev));
}

console.log('\nthe hooks the pack reads still exist');

{
  // Every debug hook the pack touches, checked against main.js's own export.
  // A rename here is a real break in the pack and shows up nowhere else.
  const main = read('js/main.js');
  const NEEDED = [
    'press', 'release', 'setPos', 'excPos', 'bank', 'girder', 'wall',
    'stomps', 'robots', 'vents', 'counts', 'cleared', 'rooms',
    'goSite', 'goLab', 'tris', 'camera',
  ];
  const missing = NEEDED.filter((h) => !new RegExp(`^\\s+${h}:`, 'm').test(main));
  ok(`main.js still exports every debug hook the pack reads${missing.length ? ' — missing: ' + missing.join(', ') : ''}`,
    missing.length === 0);

  for (const top of ['player', 'audio', 'mode:', 'site:', 'collected:']) {
    ok(`__eeri still carries ${top.replace(':', '')}`, main.includes(top));
  }
  // the one handle the pack needed adding — a place to put a particle
  ok('__eeri exposes THREE and the scene for the pack to draw into',
    /THREE,\s*scene,/.test(main));
}

console.log('\nthe pack reads the game, and never writes it');

{
  const menu = read('dev/dev-menu.js');
  // The dev layer may drive input and jump levels — those are the debug
  // hooks the test gates already use. What it must never do is reach into
  // gameplay state and set it, because then the thing being judged is no
  // longer the thing that ships.
  const writes = [...menu.matchAll(/\bE\.(player|level|exc)\.\w+\s*=[^=]/g)].map((m) => m[0]);
  ok(`the menu never assigns into game state${writes.length ? ' — ' + writes.join(', ') : ''}`,
    writes.length === 0);
  ok('every call into the game is wrapped so a missing hook cannot throw',
    menu.includes('call(fn)') && menu.includes('catch'));
}

console.log('\nno binary assets, per the handoff');

{
  for (const dir of ['assets/fx', 'assets/audio']) {
    const files = fs.readdirSync(path.join(EERI, dir));
    const binary = files.filter((f) => /\.(wav|mp3|ogg|m4a|aac|flac)$/i.test(f));
    ok(`${dir} ships no binary audio${binary.length ? ' — ' + binary.join(', ') : ''}`,
      binary.length === 0);
  }
  const afx = read('js/audio-fx.js');
  ok('the audio kit is synthesised, not sampled',
    afx.includes('createOscillator') && !/fetch\(|decodeAudioData/.test(afx));
  ok('…and routes everything through one master gain',
    (afx.match(/connect\(this\.ctx\.destination\)/g) || []).length === 1);
}

console.log('\nthe FX modules stay node-testable');

{
  // This is what lets fx-smoke.mjs run with no browser. Stating it as a
  // check means the next person to reach for a top-level three import gets
  // told why they cannot, instead of just breaking the gate.
  for (const f of ['js/fx.js', 'js/audio-fx.js']) {
    const src = read(f);
    ok(`${f} does not import three at module level`,
      !/^import .*from 'three'/m.test(src));
    ok(`${f} touches no DOM at module level`,
      !/^(?!.*\/\/).*\b(document|window)\./m.test(src.split('export')[0]));
  }
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
