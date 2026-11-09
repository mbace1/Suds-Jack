// The paused counter must have its built dialogue URLs even on its first
// offline opening, before any online conversation has runtime-cached them.
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {execFileSync}=require('node:child_process'),assert=require('node:assert/strict');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'hd-counter-precache-'));
try {
  const write=(p,s)=>{const f=path.join(root,p);fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,s)};
  write('hyperdagger/index.html',`<script type="module" src="../toko/js/chat.js?v=26"></script>`);
  write('toko/js/chat.js',`await import('./dialogue.js' + new URL(import.meta.url).search);`);
  write('toko/js/dialogue.js',`await import('./dialogue.fi.js' + new URL(import.meta.url).search);`);
  write('toko/js/dialogue.fi.js',`export const text='TERVE';`);
  write('hyperdagger/sw.js','const PRECACHE = [\n];\n');
  execFileSync(process.execPath,[path.resolve(__dirname,'../../scripts/hd-shell.mjs'),root]);
  const sw=fs.readFileSync(path.join(root,'hyperdagger/sw.js'),'utf8');
  for(const name of ['chat','dialogue','dialogue.fi']) assert.ok(sw.includes(`../toko/js/${name}.js?v=26`),`${name} inherits the URL token`);
  assert.ok(!sw.includes("dialogue.js'"),'no untokened substitute for a tokened dialogue request');
  console.log('PASS first offline counter opening precaches inherited dialogue/language URLs');
} finally {fs.rmSync(root,{recursive:true,force:true})}
