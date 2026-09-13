// The actual hub -> title -> route -> combat -> reward -> route path.
// State is read for assertions/choices. Only replay speed is set by the harness.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{let f=path.join(root,req.url.split('?')[0]);if(fs.existsSync(f)&&fs.statSync(f).isDirectory())f=path.join(f,'index.html');fs.readFile(f,(e,b)=>{res.writeHead(e?404:200,{'Content-Type':mime[path.extname(f)]||'application/octet-stream'});res.end(e?'missing':b);});});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base=process.env.SLAY_BASE_URL||`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch({executablePath:process.env.BROWSER_PATH||undefined,args:['--enable-unsafe-swiftshader']});
 try{for(const mobile of [false,true]){
  const p=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1280,height:720},hasTouch:mobile,isMobile:mobile});
  const errors=[],missing=[],figures=new Set();
  p.on('pageerror',e=>errors.push(e.message));
  p.on('response',r=>{if(r.url().includes('/slaykallio/')){if(r.status()>=400)missing.push(r.url());if(/\/figures\/.*\.png/.test(r.url())&&r.status()===200)figures.add(r.url());}});
  const tap=l=>mobile?l.tap():l.click();
  const idle=()=>p.waitForFunction(()=>!!window.__sk&&!__sk.busy(),null,{timeout:30000});
  await p.goto(base+'/');
  // the release pin arrives with versions.json, after the cabinets are drawn
  await p.waitForFunction(()=>[...document.querySelectorAll('a[data-game="slaykallio"]')].some(a=>a.href.includes('?release=')),null,{timeout:15000});
  await tap(p.getByRole('link',{name:'Play Slay Kallio',exact:true}));
  await p.waitForURL('**/slaykallio/?release=35');
  assert.equal(new URL(p.url()).searchParams.get('release'),'35','hub launches the current release URL');
  await p.waitForFunction(()=>document.querySelector('#ver')?.textContent==='v35');
  await p.goto(base+'/slaykallio/?seed=4');
  await p.waitForFunction(()=>!!window.__sk);
  assert.equal(await p.locator('#ver').innerText(),'v35');
  assert.equal(await p.locator('#roster .pick').count(),6);
  await p.waitForFunction(()=>!document.querySelector('#start').disabled);
  assert.equal(await p.evaluate(()=>__sk.debug.art()),'turf');
  assert.ok(figures.size>=23,'TURF figure images actually loaded');
  await p.screenshot({path:path.join(__dirname,mobile?'release-title-phone.png':'release-title-desktop.png')});
  await tap(p.locator('#start'));await idle();
  assert.equal(await p.evaluate(()=>__sk.state().phase),'map');
  await tap(p.locator('#nodes button').first());await idle();
  assert.equal(await p.evaluate(()=>__sk.state().phase),'fight');
  await p.waitForFunction(()=>__sk.arena.photo===true);
  assert.equal(await p.locator('body').getAttribute('data-backdrop'),'bg/turf-courtyard.jpg');
  assert.ok(await p.evaluate(()=>{
    const rs=[...document.querySelectorAll('.unit:not(.dead)')].map(e=>e.getBoundingClientRect()).sort((a,b)=>a.left-b.left);
    return rs.every((r,i)=>r.left>=0&&r.right<=innerWidth&&(!i||r.left>=rs[i-1].right));
  }),'labels have distinct horizontal lanes');
  if(mobile) assert.ok(await p.locator('#top').evaluate(e=>e.getBoundingClientRect().height<170),'phone HUD stays compact');
  await p.screenshot({path:path.join(__dirname,mobile?'release-fight-phone.png':'release-fight-desktop.png')});
  // Set only the pacing for the rest of the run, never its actions or state.
  await p.evaluate(()=>__sk.setSpeed(0));
  const first=await p.evaluate(()=>{const s=__sk.state();return s.hand.findIndex((c,i)=>c.target==='enemy'&&__sk.engine.canPlay(s,i));});
  assert.ok(first>=0);
  const before=await p.evaluate(()=>__sk.state().stats.cardsPlayed);
  await tap(p.locator(`#hand .card[data-i="${first}"]`));
  assert.equal(await p.evaluate(()=>__sk.state().stats.cardsPlayed),before,'one tap only selects');
  assert.equal(await p.locator('#card-inspect').isVisible(),true);
  assert.ok(await p.locator('#card-inspect p').evaluate(e=>parseFloat(getComputedStyle(e).fontSize)>=14));
  await p.screenshot({path:path.join(__dirname,mobile?'inspect-phone.png':'inspect-desktop.png')});
  await tap(p.locator('.unit.enemy:not(.dead) .hitbox').last());await idle();
  assert.equal(await p.evaluate(()=>__sk.state().stats.cardsPlayed),before+1,'one target action plays exactly one card');
  await tap(p.locator('#deckbtn'));
  const snap=await p.evaluate(()=>JSON.stringify(__sk.state()));
  await p.keyboard.press('1');await p.keyboard.press('e');
  assert.equal(await p.evaluate(()=>JSON.stringify(__sk.state())),snap,'deck blocks underlying play');
  await p.locator('#deck .close').focus();await p.keyboard.press('Enter');
  assert.equal(await p.locator('#deck').isVisible(),false);
  await p.waitForTimeout(350);
  await tap(p.locator('#deckbtn'));await tap(p.locator('#quit'));await tap(p.locator('#start'));await idle();
  assert.equal(await p.evaluate(()=>__sk.state().phase),'map');
  assert.equal(await p.evaluate(()=>__sk.state().stats.cardsPlayed),0);
  await tap(p.locator('#nodes button').first());await idle();
  for(let step=0;step<60;step++){
   await idle();
   const s=await p.evaluate(()=>{const s=__sk.state();return{phase:s.phase,plays:s.stats.cardsPlayed,i:s.hand.findIndex((c,i)=>__sk.engine.canPlay(s,i)),target:s.enemies.findIndex(e=>e.alive)};});
   if(s.phase==='map')break;
   if(s.phase==='reward'){await tap(p.locator('#options button').first());continue;}
   assert.equal(s.phase,'fight');
   if(s.i<0){await tap(p.locator('#end'));continue;}
   await tap(p.locator(`#hand .card[data-i="${s.i}"]`));
   await tap(p.locator('.unit.enemy:not(.dead) .hitbox').first());
  }
  await idle();
  assert.equal(await p.evaluate(()=>__sk.state().phase),'map','win, take reward and return to route');
  assert.ok(await p.evaluate(()=>__sk.state().stats.fights)>0);

  // A WHOLE ACT, tapped. One fight proves the fight screen; it says nothing
  // about the four panels between fights, and those are where a run actually
  // spends its choices. This walks act one to its boss through the same
  // buttons a player presses, preferring a span KIND it has not seen yet so
  // the route covers the map, an event, a rest and the card picker rather
  // than whatever the seed put first.
  const seen=new Set(['fight']);
  const PREF=['event','rest','elite','fight'];
  let ended='';
  for(let turn=0;turn<400;turn++){
   await idle();
   const s=await p.evaluate(()=>{const s=__sk.state();return{
     phase:s.phase,act:s.act,step:s.route?.step,
     kinds:(s.route?.steps[s.route.step]||[]).map(n=>n.kind),
     i:s.hand?s.hand.findIndex((c,i)=>__sk.engine.canPlay(s,i)):-1};});
   // A naive tapper plays the first playable card at the first living body,
   // so dying to the elite it deliberately walks into is an ORDINARY outcome
   // and not a failure of the walk. What the walk proves is that every panel
   // between fights opens and answers a real tap.
   if(s.phase==='won'||s.phase==='lost'){ended=s.phase;break;}
   if(s.act>=1){ended='act one cleared';break;}
   if(s.phase==='map'){
    assert.equal(await p.locator('#map').isVisible(),true,'the route panel is up on a map phase');
    const want=PREF.find(k=>!seen.has(k)&&s.kinds.includes(k))??s.kinds[0];
    seen.add(want);
    const btn=p.locator(`#nodes button.${want}`).first();
    assert.ok(await btn.evaluate(e=>e.getBoundingClientRect().height>=44),'a route pin is a real 44px target');
    await tap(btn);continue;
   }
   if(s.phase==='event'){
    seen.add('event');
    assert.equal(await p.locator('#event').isVisible(),true);
    assert.ok(await p.locator('#choices button').count()>=2,'an event offers a choice, not an OK button');
    await tap(p.locator('#choices button').first());continue;
   }
   if(s.phase==='rest'){
    seen.add('rest');
    assert.equal(await p.locator('#rest').isVisible(),true);
    await tap(p.locator('#restUp'));continue;       // the path that opens the picker
   }
   if(s.phase==='pick'){
    seen.add('pick');
    assert.equal(await p.locator('#pick').isVisible(),true);
    await tap(p.locator('#pick .list button').first());continue;
   }
   if(s.phase==='reward'){await tap(p.locator('#options button').first());continue;}
   assert.equal(s.phase,'fight');
   if(s.i<0){await tap(p.locator('#end'));continue;}
   await tap(p.locator(`#hand .card[data-i="${s.i}"]`));
   await tap(p.locator('.unit.enemy:not(.dead) .hitbox').first());
  }
  await idle();
  assert.ok(ended,'the walk reaches a resolution rather than running out of turns');
  for(const k of ['event','rest','pick'])assert.ok(seen.has(k),`the walk opened the ${k} panel`);
  assert.ok(await p.evaluate(()=>__sk.state().stats.fights)>1,'more than one fight was fought');

  assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);
  console.log(`PASS ${mobile?'touch':'desktop'}: title, images, photo, combat, reward, restart — and a whole act walked through ${[...seen].sort().join('/')} → ${ended}`);
  await p.close();
 }}finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
