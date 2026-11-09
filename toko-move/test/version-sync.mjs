import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL(p,import.meta.url),'utf8');
const html=read('../index.html'),runtime=read('../js/core-v212.js'),versions=read('../VERSIONS.md'),hub=JSON.parse(read('../../hub/versions.json'));
const top=versions.match(/^## v([^\s]+) —/m)?.[1];
assert.ok(top,'VERSIONS.md has a top version');
assert.match(html,new RegExp(`class="versionHero"[\\s\\S]*?v${top.replace('.','\\.')}`),'opening screen shows top version prominently');
assert.match(runtime,new RegExp(`BUILD_VERSION=['"]${top.replace('.','\\.')}['"]`),'runtime entry version matches VERSIONS.md');
// The hub advertises what is LIVE; VERSIONS.md records what has landed in the
// tree. Those are two different events and demanding equality forces one of two
// bugs: either the hub claims a build nobody can play, or a landed release
// cannot be logged until deploy day. Only one direction is ever wrong, and it is
// the one that actually shipped on main — hub said 2.12.2 while the tree was
// 2.11, advertising a version that never existed. So: the hub may lag, never lead.
const key=v=>{const[a,b='0']=String(v).split('.');return Number(a)*1000+Number(b);};
assert.ok(hub.tokomove?.v,'hub lists a Toko Move version');
assert.ok(key(hub.tokomove.v)<=key(top),`hub advertises v${hub.tokomove.v} but the tree only holds v${top} — that is a version nobody can play`);
assert.equal(hub.tokomove?.n,key(hub.tokomove.v),'hub numeric version matches its own visible version');
// v3.0: the page loads boot.js, which picks the card journey (play.js) for the
// bare address and the real-time game (main-v212.js) for ?classic and the
// tester links; both have to be in the chain and say the same number
assert.match(html,/js\/boot\.js/,'public page loads the boot entry');
const boot=read('../js/boot.js'),play=read('../js/play.js');
assert.match(boot,/main-v212\.js/,'boot keeps the v2.12 runtime entry for ?classic');
assert.match(boot,/play\.js/,'boot loads the v3 journey');
assert.match(play,new RegExp(`BUILD_VERSION = ['"]${top.replace('.','\\.')}['"]`),'the v3 stage version matches VERSIONS.md');
assert.doesNotMatch(html,/main-v21[01]\.js/,'the superseded v2.10/v2.11 wrappers are out of the runtime chain');
const composer=read('../js/main-v212.js');
assert.match(composer,/route-choice\.js/,'the v2.12 runtime includes route-choice guidance');
// BUILD_VERSION is declared in the core and echoed by the composer; both are
// published on window.__tm, and a disagreement means the title screen and the
// object the tests drive are reporting different builds.
assert.match(composer,new RegExp(`BUILD_VERSION=['\"]${top.replace('.','\\.')}['\"]`),'composer version matches VERSIONS.md');
console.log(`Toko Move version sync: v${top}`);