// The Game of Life — offline gate.  node gameoflife/test/offline.cjs
//
// Does the app actually work with the network gone? Loads with ?sw=1 to opt the
// service worker in over http, waits for it to take control, kills the server
// AND sets the browser offline, then reloads and drives a whole experience.
const { chromium } = require('playwright');
const http = require('http'); const fs = require('fs'); const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');   // repo root
const MIME = { '.html':'text/html','.js':'text/javascript','.md':'text/plain',
               '.webmanifest':'application/manifest+json','.png':'image/png' };
let served = 0;
const server = http.createServer((req,res)=>{
  const u=req.url.split('?')[0];
  const p=path.join(ROOT,u==='/'?'index.html':u);
  fs.readFile(p,(e,d)=>{
    if(e){res.writeHead(404);res.end();return;}
    served++;
    res.writeHead(200,{'Content-Type':MIME[path.extname(p)]||'application/octet-stream'});
    res.end(d);
  });
});

(async()=>{
  await new Promise(r=>server.listen(0,r));
  const port = server.address().port;
  const URL=`http://localhost:${port}/gameoflife/index.html?sw=1`;
  const b=await chromium.launch();
  const ctx=await b.newContext({viewport:{width:390,height:844}});
  const pg=await ctx.newPage();
  const errs=[];
  pg.on('pageerror',e=>errs.push(String(e)));

  await pg.goto(URL,{waitUntil:'networkidle'});
  // wait for the worker to install and take control
  const controlled = await pg.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready;
    for (let i = 0; i < 60 && !navigator.serviceWorker.controller; i++) {
      await new Promise(r => setTimeout(r, 100));
    }
    return { scope: reg.scope, controlled: !!navigator.serviceWorker.controller };
  });
  console.log('worker:', JSON.stringify(controlled));
  const cached = await pg.evaluate(async () => {
    const names = await caches.keys();
    const c = await caches.open(names[0]);
    return { cache: names[0], entries: (await c.keys()).length };
  });
  console.log('precached:', JSON.stringify(cached));
  console.log('requests served by the network so far:', served);

  // ── now cut the network entirely ──
  await ctx.setOffline(true);
  await new Promise(r => server.close(r));
  const before = served;

  await pg.reload({waitUntil:'load'});
  const hub = await pg.evaluate(()=>({
    title: document.querySelector('h1')?.textContent ?? null,
    card: document.querySelector('.card h2')?.textContent ?? null,
    offering: document.querySelectorAll('.card').length,
  }));
  console.log('OFFLINE hub:', JSON.stringify(hub));

  // and a whole experience, offline, including its nature invitation text
  await pg.evaluate(()=>__gol.debug.start('pando'));
  await pg.waitForTimeout(300);
  const exp = await pg.evaluate(()=>({
    text: (document.querySelector('.exp-text')?.textContent ?? '').slice(0,40),
    canvas: !!document.querySelector('.pixel-screen'),
  }));
  console.log('OFFLINE experience:', JSON.stringify(exp));

  // deep link, offline
  await pg.goto(`http://localhost:${port}/gameoflife/index.html#eel`,{waitUntil:'load'}).catch(e=>console.log('nav err', e.message.slice(0,40)));
  await pg.waitForTimeout(400);
  const deep = await pg.evaluate(()=>(document.querySelector('.exp-text')?.textContent??'').slice(0,30));
  console.log('OFFLINE deep link:', JSON.stringify(deep));

  let bad = 0;
  const check = (name, ok) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`); if (!ok) bad++; };
  check('the worker takes control', controlled.controlled);
  check('the shell is precached', cached.entries > 30);
  check('the hub renders with the network gone', hub.title === 'The Game of Life' && hub.offering === 1);
  check('an experience runs offline', exp.canvas && exp.text.length > 10);
  check('a deep link works offline', deep.length > 10);
  check('nothing reached the network while offline', served - before === 0);
  check('no page errors', errs.length === 0);
  if (errs.length) console.log(errs.slice(0, 3).join('\n'));
  await b.close();
  process.exit(bad ? 1 : 0);
})().catch(e=>{console.error('FAILED', e); process.exit(1);});
