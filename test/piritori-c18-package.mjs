// Check the actual packaged bytes, not only a release/version label.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve, relative, isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(process.argv[2] || fileURLToPath(new URL('../piritori-c17/',import.meta.url)));
const receipt=JSON.parse(readFileSync(resolve(root,'release.json'),'utf8'));
assert.match(receipt.build,/^C\.\d+(?:\.\d+)*$/,'valid build marker');
assert.match(receipt.source_commit,/^[a-f0-9]{40}$/,'pinned source commit');
assert.equal(typeof receipt.physical_devices_verified,'boolean','device acceptance must be explicit');
const html=readFileSync(resolve(root,'web/crew-run/index.html'),'utf8');
for(const [name,re] of [
 ['title',/<title>Piritori · Night Shift (C\.\d+(?:\.\d+)*)<\/title>/],
 ['header',/<h1>NIGHT SHIFT <span>(C\.\d+(?:\.\d+)*)<\/span><\/h1>/],
 ['About',/<summary>About this build \/ test fixtures<\/summary><p>(C\.\d+(?:\.\d+)*) —/]
]) assert.equal(html.match(re)?.[1],receipt.build,`${name} must match release.json`);
const entry=new URL(receipt.entry,'https://package.invalid/');
assert.equal(entry.pathname,'/web/crew-run/','release must launch the real crew entry');
assert.equal(entry.searchParams.get('campaign'),'1','preserve campaign bridge');
assert.equal(entry.searchParams.get('release'),receipt.build.slice(2),'entry release token must match build');
assert.ok(receipt.sha256 && Object.keys(receipt.sha256).length,'receipt must contain file hashes');
assert.ok(receipt.sha256['web/crew-run/index.html'],'receipt must cover the player entry');
for(const [path,expected] of Object.entries(receipt.sha256)){
 const file=resolve(root,path),rel=relative(root,file);
 assert.ok(rel && rel!=='..' && !rel.startsWith('../') && !isAbsolute(rel),`path stays inside cabinet: ${path}`);
 assert.match(expected,/^[a-f0-9]{64}$/);
 assert.equal(createHash('sha256').update(readFileSync(file)).digest('hex'),expected,`receipt hash: ${path}`);
}
console.log(`${receipt.build}: identity, route and ${Object.keys(receipt.sha256).length} package hashes passed`);
