import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const read = p => fs.readFileSync(path.join(root,p),'utf8');
for (const p of ['dev.html','dev/dev-menu.js','dev/dev-menu.css','dev/runtime-fx.js','dev/production-fx-shim.js']) {
  assert.ok(fs.existsSync(path.join(root,p)), `${p} missing`);
}
const html=read('dev.html'), menu=read('dev/dev-menu.js'), fx=read('dev/runtime-fx.js');
assert.match(html, /src="\.\/index\.html"/, 'dev build must wrap the real production entry');
assert.match(html, /dev-menu\.js/, 'dev menu must load');
assert.match(menu, /__eeri/, 'menu must consume the existing debug seam');
assert.match(menu, /INVINCIBLE/); assert.match(menu, /HITBOXES/); assert.match(menu, /GIZMO LAB/);
assert.match(fx, /bank\.remaining/); assert.match(fx, /wall\.hits/); assert.match(fx, /stomps/); assert.match(fx, /AudioContext/);
console.log('EERI dev/FX pack: static contract OK');
