import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = p => fs.readFileSync(new URL(p, import.meta.url), 'utf8');
const html = read('../index.html');
const main = read('../js/main.js');
const versions = read('../VERSIONS.md');
const hub = JSON.parse(read('../../hub/versions.json'));

const top = versions.match(/^## v([^\s]+) —/m)?.[1];
assert.ok(top, 'VERSIONS.md has a top version');
assert.match(html, new RegExp(`class="versionHero"[\\s\\S]*?v${top.replace('.', '\\.')}`), 'opening screen shows top version prominently');
assert.match(main, new RegExp(`BUILD_VERSION=['"]${top.replace('.', '\\.')}['"]`), 'runtime version matches VERSIONS.md');
assert.equal(hub.tokomove?.v, top, 'hub version matches VERSIONS.md');
assert.equal(hub.tokomove?.n, Math.round(Number(top) * 1000), 'hub numeric version matches visible version');

console.log(`Toko Move version sync: v${top}`);
