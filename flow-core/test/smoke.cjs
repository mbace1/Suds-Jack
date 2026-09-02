// Toko Move daylight smoke gate — catch existing HSL services on real Helsinki geography.
const { chromium } = require('playwright');
const http = require('http'); const fs = require('fs'); const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
const s = http.createServer((req, res) => { let p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0])); if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html'); if (!fs.existsSync(p)) { res.writeHead(404); return res.end('no'); } res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(res); });
let pass=0,fail=0; const ok=(n,c,d)=>{c?(pass++,console.log('  ok   '+n)):(fail++,console.log('  FAIL '+n+(d?' → '+d:'')));};
const PHONE={width:390,height:780};
s.listen(0,'127.0.0.1',async()=>{const base='http://127.0.0.1:'+s.address().port,b=await chromium.launch(),p=await b.newPage({viewport:PHONE}),errs=[];p.on('pageerror',e=>errs.push('pageerror: '+e.message));p.on('console',m=>{if(m.type()==='error')errs.push('console: '+m.text());});
 await p.goto(base+'/toko-move/'); await p.waitForTimeout(1000);
 ok('boots with no errors',errs.length===0,errs.slice(0,2).join(' | '));
 ok('delivery handle is exposed',await p.evaluate(()=>!!window.__tm?.challenge));
 ok('real Helsinki graph is active',await p.evaluate(()=>{const ids=new Set([...window.__tm.flow.graph.nodes.keys()]),city=window.__tm.city;return ['pasila','toolontori','hakaniemi','kamppi','rautatientori','sornainen','kalasatama','kauppatori'].every(x=>ids.has(x))&&city?.source?.exactGeometry===true&&city.nodes.every(n=>Number.isFinite(n.lat)&&Number.isFinite(n.lon)&&n.hslStopId);}));
 ok('the shift opens on the dispatch board with no job forced on the player',await p.evaluate(()=>{const ch=window.__tm.challenge;return !ch.active&&ch.activeTrip===null&&(ch.offers?.length||0)>=2;}));
 ok('all source transit layers remain visible',await p.evaluate(()=>window.__tm.transit.layers.length>20&&window.__tm.transit.layers.every(l=>l.visible)));
 await p.click('#play'); await p.waitForTimeout(450);
 ok('clock runs after start',await p.evaluate(()=>!window.__tm.flow.clock.paused));
 // v2.12 replaced v2.11's auto-assigned job with a dispatch board: take an offer
 // first, and only then does the network become a set of catch choices.
 ok('the dispatch board offers a real choice',await p.evaluate(()=>document.querySelectorAll('.jobOffer').length>=2));
 await p.click('.jobOffer button, .jobOffer'); await p.waitForTimeout(400);
 ok('taking an offer makes it the active job, still waiting on a catch',await p.evaluate(()=>{const ch=window.__tm.challenge;return !!ch.active&&ch.waitingForCatch===true&&ch.activeTrip===null;}));
 await p.waitForSelector('.catchChoice',{timeout:15000}).catch(()=>{});
 ok('catch choices are visible',await p.evaluate(()=>document.querySelectorAll('.catchChoice').length>=1));
 // The choices render DISABLED and stay that way until a compatible vehicle
 // actually reaches this hub going the right way — that gate is the whole game,
 // so the test waits it out at speed rather than clicking a dead button.
 await p.click('#speed'); await p.click('#speed');
 // The rule is that a catch is GATED on a compatible vehicle actually being
 // here going the right way — not that you always have to wait first. Asserting
 // "everything is disabled the instant you take a job" only held while catches
 // were nearly unreachable, and it went red the moment the vehicles were given
 // a speed that matches the clock. So watch the gate work in BOTH directions
 // instead: it must refuse at some point, and it must open at some point.
 let sawClosed=false, sawOpen=false;
 // kept SHORT on purpose: the first job's deadline is about 130 ticks, and an
 // observation loop long enough to be thorough spends that deadline before the
 // catch below can commit — which is exactly what happened on the first cut.
 for(let i=0;i<10 && !(sawClosed&&sawOpen);i++){
   const n=await p.evaluate(()=>[...document.querySelectorAll('.catchChoice')].filter(b=>!b.disabled).length);
   if(n===0)sawClosed=true; else sawOpen=true;
   await p.waitForTimeout(120);
 }
 ok('catch is refused while no compatible vehicle is here',sawClosed);
 await p.waitForSelector('.catchChoice:not([disabled])',{timeout:60000});
 ok('and opens when one does arrive',sawOpen||await p.evaluate(()=>document.querySelectorAll('.catchChoice:not([disabled])').length>=1));
 const before=await p.evaluate(()=>window.__tm.flow.routes.drawn.length); await p.click('.catchChoice:not([disabled])'); await p.waitForTimeout(250);
 ok('catch commits an existing HSL service plan',await p.evaluate(()=>{const ch=window.__tm.challenge;return !!ch.activeTrip&&!ch.waitingForCatch&&Array.isArray(ch.activeTrip.legs)&&ch.activeTrip.legs.length>=1;}));
 ok('catching creates no player-drawn line',await p.evaluate(n=>window.__tm.flow.routes.drawn.length===n,before));
 ok('fixed services come from HSL tram + metro',await p.evaluate(()=>{const rs=window.__tm.flow.routes.list.filter(r=>r.fixed);return rs.some(r=>r.mode==='metro'&&(r.label==='M1'||r.label==='M2'))&&rs.some(r=>r.mode==='tram'&&['2','3','4','5','6','7','8H','8T','9','13'].includes(r.label))&&!rs.some(r=>['T','R','M'].includes(r.label));}));
 ok('gameplay HUD identifies HSL network rather than line budget',await p.evaluate(()=>document.getElementById('lines').textContent.includes('HSL')));
 ok('large visible version matches runtime',await p.evaluate(()=>document.querySelector('.versionHero')?.textContent.includes(`v${window.__tm.version}`)));
 ok('no horizontal phone overflow',await p.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1));
 const small=await p.$$eval('button',bs=>bs.filter(x=>{const r=x.getBoundingClientRect();return r.width>0&&(r.width<44||r.height<44);}).map(x=>x.id||x.textContent.trim().slice(0,16)));ok('controls clear 44px',small.length===0,small.join(', '));
 ok('no encounter layer in daylight product',await p.evaluate(()=>!document.getElementById('fight')));
 ok('the board crops to the played city, not the whole pack',await p.evaluate(()=>{const b=window.__tm.board;if(!b)return false;return (b.n-b.s)<0.09&&(b.e-b.w)<0.11;}));
 ok('every delivery anchor sits inside the board',await p.evaluate(()=>{const b=window.__tm.board,r=window.__tm.city.resolved;return Object.values(r).every(st=>!st||(st.lat>b.s&&st.lat<b.n&&st.lon>b.w&&st.lon<b.e));}));
 ok('tram services no longer share one colour',await p.evaluate(()=>{const t=window.__tm.transit.layers.filter(l=>l.mode==='TRAM');return new Set(t.map(l=>l.colour)).size>=10;}));
 ok('still no errors after catch',errs.length===0,errs.slice(0,2).join(' | '));
 await p.close();await b.close();s.close();console.log(`\n  ${pass} passed, ${fail} failed\n`);process.exit(fail?1:0);});
