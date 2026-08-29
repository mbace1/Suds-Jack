import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = p => fs.readFileSync(new URL(p, import.meta.url), 'utf8');
const html = read('../index.html');
const runtime = read('../js/main-v210.js');
const versions = read('../VERSIONS.md');
const hub = JSON.parse(read('../../hub/versions.json'));

const top = versions.match(/^## v([^\s]+) —/m)?.[1];
assert.ok(top, 'VERSIONS.md has a top version');
assert.match(html, new RegExp(`class="versionHero"[\\s\\S]*?v${top.replace('.', '\\.')}`), 'opening screen shows top version prominently');
assert.match(runtime, new RegExp(`BUILD_VERSION=['"]${top.replace('.', '\\.')}['"]`), 'runtime entry version matches VERSIONS.md');
assert.equal(hub.tokomove?.v, top, 'hub version matches VERSIONS.md');
const [major, minor = '0'] = top.split('.');
const expectedNumeric = Number(major) * 1000 + Number(minor);
assert.equal(hub.tokomove?.n, expectedNumeric, 'hub numeric version matches visible version');
assert.match(html,/main-v210\.js/, 'public page loads the current runtime entry');
console.log(`Toko Move version sync: v${top}`);
