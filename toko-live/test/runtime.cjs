// Toko Live browser/runtime gate.
// Drives the real chat input and canvas shell; no debug hook performs the action under test.
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const MIME = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.md':'text/plain','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'};
let failures = 0;
const check = (name, cond, detail='') => { console.log(`${cond?'PASS':'FAIL'}  ${name}${detail?` — ${detail}`:''}`); if(!cond) failures++; };

const server = http.createServer((req,res)=>{
  const clean=req.url.split('?')[0].replace(/^\/Suds-Jack(?=\/|$)/,'')||'/';
  let p=path.join(ROOT, clean==='/'?'index.html':clean);
  if(fs.existsSync(p)&&fs.statSync(p).isDirectory()) p=path.join(p,'index.html');
  fs.readFile(p,(err,data)=>{if(err){res.writeHead(404);res.end();return}res.writeHead(200,{'Content-Type':MIME[path.extname(p)]||'application/octet-stream'});res.end(data)});
});

async function ask(page, text, expectProject){
  const input=page.locator('.toko-chat .tc-say-row input');
  const user=page.locator('.toko-chat .tc-you');
  const toko=page.locator('.toko-chat .tc-me');
  const u0=await user.count(), t0=await toko.count();
  await input.fill(text);
  await input.press('Enter');
  await page.waitForFunction(n=>document.querySelectorAll('.toko-chat .tc-me').length>n,t0,{timeout:3000});
  await page.waitForTimeout(500);
  const u1=await user.count(), t1=await toko.count();
  const reply=(await toko.nth(t1-1).textContent()||'').trim();
  check(`one user turn: ${text}`,u1===u0+1,`${u0}→${u1}`);
  check(`one Toko reply: ${text}`,t1===t0+1,`${t0}→${t1}`);
  if(expectProject) check(`reply resolves ${expectProject}`,reply.toUpperCase().includes(expectProject),reply.slice(0,120));
  return reply;
}

(async()=>{
  await new Promise(r=>server.listen(0,r));
  const base=`http://127.0.0.1:${server.address().port}`;
  const browser=await chromium.launch();
  const page=await browser.newPage({viewport:{width:1280,height:800}});
  const pageErrors=[]; const local404=[];
  page.on('pageerror',e=>pageErrors.push(String(e)));
  page.on('response',r=>{if(r.url().startsWith(base)&&r.status()>=400)local404.push(`${r.status()} ${r.url()}`)});
  await page.goto(`${base}/Suds-Jack/toko-live/`,{waitUntil:'networkidle'});
  await page.waitForSelector('.toko-chat .tc-say-row input',{timeout:5000});

  check('visible build marker is v45',(await page.title()).includes('v45')&&(await page.locator('#state-label').textContent()||'').includes('V45'));
  check('no page exceptions',pageErrors.length===0,pageErrors.join(' | '));
  check('no local 404s',local404.length===0,local404.join(' | '));

  const painted=await page.locator('#toko-stage').evaluate(c=>{const x=c.getContext('2d').getImageData(0,0,c.width,c.height).data;for(let i=3;i<x.length;i+=4)if(x[i])return true;return false});
  check('Toko canvas paints',painted);

  const desktop=await page.evaluate(()=>{const talk=document.querySelector('.talk').getBoundingClientRect(), stage=document.querySelector('.stage').getBoundingClientRect(), input=document.querySelector('.tc-say-row input').getBoundingClientRect();return{talkW:talk.width,stageW:stage.width,inputH:input.height}});
  check('desktop conversation area is larger than stage',desktop.talkW>desktop.stageW,`${Math.round(desktop.talkW)}px vs ${Math.round(desktop.stageW)}px`);
  check('desktop input touch target >=44px',desktop.inputH>=44,`${desktop.inputH}px`);

  await ask(page,'Where are we with Tiny Hawk?','TINY HAWK');
  await ask(page,'whats nxt for toko drp','TOKO DROP');
  await ask(page,'What do you think about Betterment?','BETTERMENT');
  await ask(page,'What did we decide about Eeri?','EERI');

  await page.setViewportSize({width:390,height:844});
  await page.waitForTimeout(150);
  const mobile=await page.evaluate(()=>{const talk=document.querySelector('.talk').getBoundingClientRect(),stage=document.querySelector('.stage').getBoundingClientRect(),input=document.querySelector('.tc-say-row input').getBoundingClientRect();const btn=document.querySelector('.tc-menu button')?.getBoundingClientRect();return{talkH:talk.height,stageH:stage.height,inputH:input.height,buttonH:btn?.height||0,vh:innerHeight}});
  check('mobile conversation receives >=68% viewport',mobile.talkH>=mobile.vh*.68,`${Math.round(mobile.talkH)}/${mobile.vh}`);
  check('mobile stage <=32% viewport',mobile.stageH<=mobile.vh*.32,`${Math.round(mobile.stageH)}/${mobile.vh}`);
  check('mobile input touch target >=44px',mobile.inputH>=44,`${mobile.inputH}px`);
  if(mobile.buttonH) check('mobile prompt touch target >=40px',mobile.buttonH>=40,`${mobile.buttonH}px`);

  await browser.close(); server.close();
  console.log(`\n${failures?`FAIL ${failures}`:'PASS'} — Toko Live runtime gate`);
  process.exitCode=failures?1:0;
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
