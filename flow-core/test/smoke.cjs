// Toko Move daylight smoke gate — Central Helsinki delivery challenge.
const { chromium } = require('playwright');
const http = require('http'); const fs = require('fs'); const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
const s = http.createServer((req, res) => {
  let p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
  if (!fs.existsSync(p)) { res.writeHead(404); return res.end('no'); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
let pass = 0, fail = 0;
const ok = (n, c, d) => { c ? (pass++, console.log('  ok   ' + n)) : (fail++, console.log('  FAIL ' + n + (d ? ' → ' + d : ''))); };
const PHONE = { width: 390, height: 780 };
s.listen(0, '127.0.0.1', async () => {
  const base = 'http://127.0.0.1:' + s.address().port;
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: PHONE });
  const errs = [];
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await p.goto(base + '/toko-move/'); await p.waitForTimeout(500);
  ok('boots with no errors', errs.length === 0, errs.slice(0, 2).join(' | '));
  ok('delivery handle is exposed', await p.evaluate(() => !!window.__tm && !!window.__tm.challenge));
  ok('Central Helsinki graph is active', await p.evaluate(() => {
    const ids = new Set([...window.__tm.flow.graph.nodes.keys()]);
    return ['pasila','toolontori','hakaniemi','kamppi','rautatientori','sornainen','kalasatama','kauppatori'].every(x => ids.has(x));
  }));
  ok('first A to B job exists', await p.evaluate(() => {
    const j = window.__tm.challenge.active;
    return !!j && Array.isArray(j.stops) && j.stops.length >= 2 && j.stops[0] !== j.stops[1];
  }));
  ok('pickup and destination pins exist', await p.evaluate(() => {
    const ms = window.__tm.debug.markers();
    return ms.some(x => x.id.startsWith('pickup:')) && ms.some(x => x.id.startsWith('job:'));
  }));
  await p.click('#play'); await p.waitForTimeout(300);
  ok('clock runs after start', await p.evaluate(() => !window.__tm.flow.clock.paused));
  ok('map paints', await p.evaluate(() => {
    const c = document.getElementById('map'), g = c.getContext('2d').getImageData(0,0,c.width,c.height).data;
    const first=[g[0],g[1],g[2]].join(); for(let i=4;i<g.length;i+=4) if([g[i],g[i+1],g[i+2]].join()!==first) return true; return false;
  }));
  const drew = await p.evaluate(() => {
    const r = window.__tm.flow.addRoute('tram', ['toolontori','rautatientori','hakaniemi','kallionkirkko']); return !r.error;
  });
  ok('a Helsinki line can be drawn', drew);
  ok('fixed metro/tram/rail skeleton exists', await p.evaluate(() => {
    const rs=window.__tm.flow.routes.list.filter(r=>r.fixed);
    return rs.some(r=>r.mode==='metro') && rs.some(r=>r.mode==='tram') && rs.some(r=>r.label==='R');
  }));
  await p.click('#pause'); await p.waitForTimeout(250);
  const t1=await p.evaluate(()=>window.__tm.flow.clock.tick); await p.waitForTimeout(350); const t2=await p.evaluate(()=>window.__tm.flow.clock.tick);
  ok('pause freezes simulation', t1===t2, `${t1} → ${t2}`);
  ok('editing works while paused', await p.evaluate(() => {
    const f=window.__tm.flow,n=f.routes.drawn.length,r=f.addRoute('tram',['rautatientori','senaatintori','kauppatori']); return !r.error && f.routes.drawn.length===n+1;
  }));
  await p.click('#pause');
  ok('HUD describes delivery game', await p.evaluate(() => document.getElementById('done').textContent.includes('/10') && document.getElementById('reach').textContent.includes('→')));
  ok('no horizontal phone overflow', await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
  const small=await p.$$eval('button',bs=>bs.filter(x=>{const r=x.getBoundingClientRect();return r.width>0&&(r.width<44||r.height<44);}).map(x=>x.id||x.textContent.trim().slice(0,16)));
  ok('controls clear 44px', small.length===0, small.join(', '));
  ok('no encounter layer in daylight product', await p.evaluate(() => !document.getElementById('fight')));
  ok('still no errors after play', errs.length===0, errs.slice(0,2).join(' | '));
  await p.close(); await b.close(); s.close();
  console.log(`\n  ${pass} passed, ${fail} failed\n`); process.exit(fail?1:0);
});
