#!/usr/bin/env node
// Structural regression gate for the contextual Toko menu.
// This cannot replace a visual-browser pass; it makes the invariants that
// prevent the known overlap regression explicit and cheap to check in CI.
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const fix=fs.readFileSync(path.join(root,'js/chat-layout-fix.js'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const must=[
  ['layout module loaded',/chat-layout-fix\.js\?v=1/],
  ['body uses explicit grid rows',/grid-template-rows:minmax\(150px,1fr\)/],
  ['transcript has protected height',/min-height:150px !important/],
  ['mobile transcript has protected height',/min-height:160px !important/],
  ['menu is bounded',/max-height:126px/],
  ['mobile menu is bounded',/max-height:118px/],
  ['runtime overlap check exists',/const overlaps=b\.top<a\.bottom-1/],
  ['runtime readable-height check exists',/a\.height<135/],
  ['runtime status is inspectable',/dataset\.layoutOk/],
];
let failed=0;
for(const[name,re]of must){const src=name==='layout module loaded'?html:fix;if(!re.test(src)){console.error('FAIL:',name);failed++}else console.log('ok:',name)}
if(failed)process.exit(1);
console.log('chat layout guard contract: PASS');
