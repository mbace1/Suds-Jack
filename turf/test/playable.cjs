const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.BROWSER_PATH?{executablePath:process.env.BROWSER_PATH}:{})});
 try {for(const mode of ['keyboard','touch']){
  const page=await browser.newPage({viewport:mode==='touch'?{width:390,height:640}:{width:1280,height:800},hasTouch:mode==='touch',isMobile:mode==='touch'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  async function activate(selector){const el=page.locator(selector).first();if(mode==='keyboard'){await el.focus();await page.keyboard.press('Enter');}else await el.tap();}
  await page.goto((process.env.TURF_BASE_URL||'http://127.0.0.1:8767')+'/turf/');
  await page.locator('#titleStart:not([disabled])').waitFor();await activate('#titleStart');
  await page.waitForFunction(()=>window.__turf.state());
  if(mode==='touch') await page.evaluate(()=>document.addEventListener('touchstart',e=>e.preventDefault(),{capture:true,passive:false}));
  // Debug state is SETUP only. Every action below uses a production control.
  await page.evaluate(()=>{const s=__turf.state();s.fullCover.clear();s.partialCover.clear();s.hazards.clear();s.reinforcements=[];s.win={mode:'eliminate'};
   s.units.forEach(u=>{if(u.faction==='player'){u.hp=u.maxHp=100;u.xp=19;}else if(u.uid!=='e0')u.hp=0;});
   const p=s.units.find(u=>u.uid==='p1'),e=s.units.find(u=>u.uid==='e0');Object.assign(p,{x:6,y:6,ammo:0,momentum:3,abilities:['steady','overwatch']});Object.assign(e,{x:6,y:4,hp:60,maxHp:60});});
  await activate('[data-control="unit-p1"]');
  await activate('[data-control="reload"]');
  assert(await page.evaluate(()=>{const p=__turf.state().units.find(u=>u.uid==='p1');return p.ammo>0&&p.actedAction&&!p.actedMove;}),'reload must spend exactly the action');
  await activate('#endTurnBtn');await page.waitForFunction(()=>__turf.state().round===2,{},{timeout:30000});
  await page.evaluate(()=>{const s=__turf.state(),p=s.units.find(u=>u.uid==='p1'),e=s.units.find(u=>u.uid==='e0');Object.assign(p,{x:6,y:6});Object.assign(e,{x:6,y:5});});
  await activate('[data-control="unit-p1"]');
  const before=await page.evaluate(()=>__turf.state().log.filter(e=>e.type==='attack').length);
  assert.match(await page.locator('#targets').innerText(),/Attack:.*%.*dmg/);
  await activate('#targets button');
  assert.equal(await page.evaluate(()=>__turf.state().log.filter(e=>e.type==='attack').length),before+1,'normal target control must attack once');
  await page.evaluate(()=>{const s=__turf.state(),p=s.units.find(u=>u.uid==='p1');p.momentum=3;p.actedAction=false;});
  await activate('[data-control="unit-p1"]');await activate('[data-control="ability-overwatch"]');
  assert.match(await page.locator('#fieldGuide').innerText(),/Overwatch ready/);
  await activate('#targets button');assert(await page.evaluate(()=>__turf.state().overwatch.has('p1')),'self ability must resolve');
  // Set up an adjacent, guaranteed lethal shot and a level-up reward.
  await page.evaluate(()=>{const s=__turf.state(),p=s.units.find(u=>u.uid==='p1'),e=s.units.find(u=>u.uid==='e0');Object.assign(p,{actedMove:false,actedAction:false,momentum:3,ammo:6,x:6,y:6,xp:19});Object.assign(e,{x:6,y:5,hp:1});s.overwatch.clear();});
  await activate('[data-control="unit-p1"]');
  await activate('[data-control="ability-steady"]');
  assert.match(await page.locator('#targets').innerText(),/Steady:/);
  await activate('#targets button');await page.locator('#result:not([hidden])').waitFor();
  assert.equal(await page.evaluate(()=>__turf.state().result),'win');
  assert(await page.locator('.offerBtn').count(),'victory must expose actual skill choices');
  for(let guard=0;await page.locator('.offerBtn').count();guard++){assert(guard<12);await activate('.offerBtn');}
  await activate('#resultAgain');assert.equal(await page.evaluate(()=>__turf.sequence().index),1);
  // A loss must allow a fresh run, without retaining the prior encounter.
  await page.evaluate(()=>{__turf.state().units.filter(u=>u.faction==='player').forEach(u=>u.hp=0);});
  await activate('#endTurnBtn');await page.locator('#result:not([hidden])').waitFor();
  assert.equal(await page.evaluate(()=>__turf.state().result),'lose');
  await page.waitForTimeout(320);await activate('#resultAgain');assert.equal(await page.evaluate(()=>__turf.sequence().index),0);
  assert(await page.evaluate(()=>__turf.state().units.some(u=>u.faction==='player'&&u.hp>0)));
  assert.deepEqual(errors,[]);
  await page.screenshot({path:`turf/test/playable-${mode}.png`});
  console.log('PASS',mode,'reload, ability aim/resolve, attack, victory, skill pick, continue, defeat, retry');await page.close();
 }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
