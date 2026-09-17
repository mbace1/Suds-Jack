// Mutation checks: the release gate must reject plausible invalid packages.
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync,symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
const root=mkdtempSync(resolve(tmpdir(),'c18-receipt-'));
const gate=fileURLToPath(new URL('./piritori-c18-package.mjs',import.meta.url));
const sha='a'.repeat(40),html='<title>Piritori · Night Shift C.18</title><h1>NIGHT SHIFT <span>C.18</span></h1><summary>About this build / test fixtures</summary><p>C.18 — Fixture</p>';
function setup(){
 rmSync(root,{recursive:true,force:true});mkdirSync(resolve(root,'web/crew-run'),{recursive:true});
 writeFileSync(resolve(root,'web/crew-run/index.html'),html);
 writeFileSync(resolve(root,'VERSIONS.md'),`Source head: ${sha}.\nTested source head: ${sha}.\n`);
 const receipt={build:'C.18',source_commit:sha,tested_source_head:sha,physical_devices_verified:false,entry:'web/crew-run/?campaign=1&release=18',sha256:{}};
 for(const path of ['VERSIONS.md','web/crew-run/index.html'])receipt.sha256[path]=createHash('sha256').update(readFileSync(resolve(root,path))).digest('hex');
 writeFileSync(resolve(root,'release.json'),JSON.stringify(receipt));
}
function entry(value){const path=resolve(root,'release.json'),r=JSON.parse(readFileSync(path));r.entry=value;writeFileSync(path,JSON.stringify(r));}
const cases=[
 ['valid',()=>{},null],
 ['unlisted runtime',()=>writeFileSync(resolve(root,'web/crew-run/new-runtime.js'),'export {};'),/receipt must cover every cabinet file/],
 ['external origin',()=>entry('https://attacker.invalid/web/crew-run/?campaign=1&release=18'),/entry must stay on the package origin/],
 ['outside cabinet',()=>entry('/web/crew-run/?campaign=1&release=18'),/entry must stay inside this cabinet/],
 ['stale provenance',()=>writeFileSync(resolve(root,'VERSIONS.md'),'Source and tested head: stale.\n'),/VERSIONS source must match receipt/],
 ['stale bytes',()=>writeFileSync(resolve(root,'web/crew-run/index.html'),html+' '),/receipt hash:/],
 ['stale About',()=>writeFileSync(resolve(root,'web/crew-run/index.html'),html.replace('<p>C.18 —','<p>C.17.1 —')),/About must match release.json/],
 ['symlink',()=>symlinkSync(resolve(root,'VERSIONS.md'),resolve(root,'linked.md')),/no links or special files/],
];
try{
 for(const [name,mutate,error] of cases){
  setup();mutate();const run=spawnSync(process.execPath,[gate,root],{encoding:'utf8',timeout:10000});
  assert.ifError(run.error);
  if(error){assert.notEqual(run.status,0,`${name} must fail`);assert.match(run.stderr,error);}
  else assert.equal(run.status,0,run.stderr);
  console.log(`PASS ${name}`);
 }
}finally{rmSync(root,{recursive:true,force:true});}
