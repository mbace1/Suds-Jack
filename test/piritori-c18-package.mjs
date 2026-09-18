// Check the complete packaged file set and bytes, not only release labels.
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,lstatSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,relative,isAbsolute,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(process.argv[2] || fileURLToPath(new URL('../piritori-c17/',import.meta.url)));
const receiptPath=resolve(root,'release.json');
assert.ok(lstatSync(receiptPath).isFile(),'release receipt must be a regular file');
const receipt=JSON.parse(readFileSync(receiptPath,'utf8'));
assert.match(receipt.build,/^C\.\d+(?:\.\d+)*$/,'valid build marker');
assert.match(receipt.source_commit,/^[a-f0-9]{40}$/,'pinned source commit');
assert.match(receipt.tested_source_head,/^[a-f0-9]{40}$/,'pinned tested source');
assert.equal(typeof receipt.physical_devices_verified,'boolean','device acceptance must be explicit');
const html=readFileSync(resolve(root,'web/crew-run/index.html'),'utf8');
for(const [name,re] of [
 ['title',/<title>Piritori · Night Shift (C\.\d+(?:\.\d+)*)<\/title>/],
 ['header',/<h1>NIGHT SHIFT <span>(C\.\d+(?:\.\d+)*)<\/span><\/h1>/],
 ['About',/<summary>About this build \/ test fixtures<\/summary><p>(C\.\d+(?:\.\d+)*) —/]
]) assert.equal(html.match(re)?.[1],receipt.build,`${name} must match release.json`);
const entry=new URL(receipt.entry,'https://package.invalid/cabinet/');
assert.equal(entry.origin,'https://package.invalid','entry must stay on the package origin');
assert.equal(entry.pathname,'/cabinet/web/crew-run/','entry must stay inside this cabinet');
assert.equal(entry.searchParams.get('campaign'),'1','preserve campaign bridge');
assert.equal(entry.searchParams.get('release'),receipt.build.slice(2),'entry release token must match build');
const versions=readFileSync(resolve(root,'VERSIONS.md'),'utf8').split(/\r?\n/);
assert.ok(versions.includes(`Source head: ${receipt.source_commit}.`),'VERSIONS source must match receipt');
assert.ok(versions.includes(`Tested source head: ${receipt.tested_source_head}.`),'VERSIONS tested source must match receipt');
assert.ok(receipt.sha256 && Object.keys(receipt.sha256).length,'receipt must contain file hashes');
const files=[];
function walk(dir){
 for(const item of readdirSync(dir,{withFileTypes:true})){
  const file=resolve(dir,item.name),path=relative(root,file).split(sep).join('/');
  if(item.isDirectory())walk(file);
  else{
   assert.ok(item.isFile(),`no links or special files in package: ${path}`);
   if(path!=='release.json')files.push(path);
  }
 }
}
walk(root);
assert.deepEqual(Object.keys(receipt.sha256).sort(),files.sort(),'receipt must cover every cabinet file except itself');
for(const [path,expected] of Object.entries(receipt.sha256)){
 const file=resolve(root,path),rel=relative(root,file);
 assert.ok(rel && rel!=='..' && !rel.startsWith('..'+sep) && !isAbsolute(rel),`path stays inside cabinet: ${path}`);
 assert.match(expected,/^[a-f0-9]{64}$/);
 assert.equal(createHash('sha256').update(readFileSync(file)).digest('hex'),expected,`receipt hash: ${path}`);
}
console.log(`${receipt.build}: identity, local route, provenance and all ${files.length} package hashes passed`);
