// v60 acceptance: real menu -> START -> weapon kill -> death -> tap retry,
// in every player season with both renderers. Debug hooks only stage targets
// and shorten the clock; they never fire, kill, end or restart the run.
const { chromium } = require('playwright');
const http = require('node:http'), fs = require('node:fs'), path = require('node:path');
const assert = require('node:assert/strict');
const root = process.env.HD_SITE_ROOT || path.resolve(__dirname, '../..');
const server = http.createServer((req, res) => {
  let file = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  fs.readFile(file, (err, bytes) => {
    res.writeHead(err ? 404 : 200, { 'Content-Type': ({'.js':'text/javascript','.html':'text/html','.json':'application/json','.png':'image/png'})[path.extname(file)] || 'application/octet-stream' });
    res.end(err ? 'missing' : bytes);
  });
});
let browser;
(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined,
    args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage'] });
  console.log('Browser:',await browser.version(),'— software SwiftShader; no physical-device certification');
  for (const season of ['ember','inca','haul']) for (const renderer of ['classic','sdf']) {
    if(process.env.HD_LOOP_CASE && process.env.HD_LOOP_CASE!==`${season}/${renderer}`)continue;
    const context = await browser.newContext({viewport:{width:844,height:390},isMobile:true,hasTouch:true});
    const page = await context.newPage(); page.setDefaultTimeout(120000);
    const errors=[]; page.on('pageerror',e=>errors.push(e.message));
    page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
    await page.addInitScript(() => {
      localStorage.setItem('hyperDaggerSeenTips','1');
      localStorage.setItem('tokoSting','1');
      localStorage.setItem('hyperDaggerOpts',JSON.stringify({perf:'low'}));
      localStorage.setItem('hyperDaggerRunKind','free');
    });
    const base=`http://127.0.0.1:${server.address().port}`;
    if(season==='ember' && renderer==='classic'){
      await page.goto(base+'/#hyperdagger');
      await Promise.all([page.waitForURL('**/hyperdagger/'),page.locator('#cab-hyperdagger .actions a').first().tap()]);
      console.log('PASS Hub cabinet Play reaches the main /hyperdagger/ player route');
    }else await page.goto(`${base}/hyperdagger/${season==='ember'?'':'?assets=0'}`);
    await page.waitForFunction(()=>window.__hd);
    assert.match(await page.locator('#msg').innerText(), /v60/);
    await page.locator(`[data-season="${season}"]`).tap();
    await page.locator(`[data-renderer="${renderer}"]`).tap();
    assert.equal(await page.evaluate(()=>window.__hd.debug.getState().state),'menu');
    const start=await page.locator('#startBtn').boundingBox();
    if(!(start.y>=0 && start.y+start.height<=390)){
      if(process.env.HD_V60_EVIDENCE)await page.screenshot({path:path.join(process.env.HD_V60_EVIDENCE,`${season}-${renderer}-layout-failure.png`)});
    }
    assert.ok(start.y>=0 && start.y+start.height<=390,'START fits landscape: '+JSON.stringify(start));
    if(season==='ember'){
      await page.evaluate(()=>window.__hd.debug.setOpt('perf','high'));
      await page.waitForFunction(()=>window.__hd.debug.getMeshSkins().loaded.includes('skull'));
    }
    if(process.env.HD_V60_EVIDENCE){
      fs.mkdirSync(process.env.HD_V60_EVIDENCE,{recursive:true});
      await page.waitForTimeout(650); // capture the settled menu, after mnIn
      await page.screenshot({path:path.join(process.env.HD_V60_EVIDENCE,`${season}-${renderer}-menu.png`)});
    }
    await page.locator('#startBtn').tap();
    await page.waitForFunction(()=>window.__hd.debug.getState().state==='playing');
    await page.evaluate(() => {
      const h=window.__hd,d=h.debug;d.freezeDirector(true);d.setInvulnerable(true);
      const e=d.spawnSkull();e.spawnK=1;e.group.scale.setScalar(1);
      window.__loopTarget=e;
    });
    assert.equal(await page.evaluate(()=>!!window.__loopTarget.sdfRoot),renderer==='sdf');
    if(season==='ember'){
      if(renderer==='classic')await page.waitForFunction(()=>!!window.__loopTarget.meshRoot);
      else await page.evaluate(async()=>{for(let i=0;i<5;i++)await new Promise(r=>requestAnimationFrame(r))});
      assert.equal(await page.evaluate(()=>!!window.__loopTarget.meshRoot),renderer==='classic','loaded skin attaches only to Classic');
      console.log(`PASS ember/${renderer}: assets enabled, loaded skull skin ${renderer==='classic'?'attaches':'cannot replace SDF'}`);
    }
    await page.evaluate(()=>{window.__loopTarget.update=function(dt){this.baseUpdate(dt)};window.__hd.debug.setOpt('perf','low')});
    const cdp=await context.newCDPSession(page);
    if(season!=='haul') await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:640,y:260,id:7}]});
    const killed=await page.evaluate(async()=>{
      const h=window.__hd,d=h.debug,e=window.__loopTarget,cam=h.player.camera;
      const fwd=new cam.position.constructor();const t0=d.getState().gameTime;
      for(let i=0;i<4000 && e.alive && d.getState().gameTime-t0<12;i++){
        fwd.set(0,0,-1).applyQuaternion(cam.quaternion);
        e.pos.copy(cam.position).addScaledVector(fwd,5);e.group.position.copy(e.pos);e.group.lookAt(cam.position);
        await new Promise(r=>requestAnimationFrame(r));
      }
      return {dead:!e.alive,released:e.sdfRoot===null,kills:document.getElementById('kills')?.textContent};
    });
    if(season!=='haul') await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    assert.ok(killed.dead,`${season}/${renderer}: weapon kills target`);
    if(renderer==='sdf')assert.ok(killed.released,'shader released on kill');
    // Shorten the clock as setup, then let it expire normally. HAUL has
    // no draining clock: use the real left stick to walk off the convoy.
    await page.evaluate(season=>{
      const h=window.__hd;h.debug.setInvulnerable(false);
      if(season!=='haul')h.debug.setLife(.05);
    },season);
    if(season==='haul'){
      await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:180,y:260,id:8}]});
      await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:50,y:260,id:8}]});
    }
    await page.waitForFunction(()=>window.__hd.debug.getState().state==='dead');
    if(season==='haul')await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    assert.match(await page.locator('#msg').innerText(),/to retry/);
    const records=await page.evaluate(()=>({h:JSON.parse(localStorage.getItem('hyperDaggerHistory')||'[]'),t:localStorage.getItem('hyperDaggerSdfTestHistory'),daily:Object.keys(localStorage).filter(k=>k.startsWith('hyperDaggerDaily:'))}));
    assert.equal(records.h.length,1);assert.equal(records.t,null);assert.deepEqual(records.daily,[]);
    await page.waitForTimeout(750);
    await page.touchscreen.tap(400,180);
    await page.waitForFunction(()=>window.__hd.debug.getState().state==='playing');
    const retry=await page.evaluate(()=>({t:window.__hd.debug.getState().gameTime,saved:localStorage.getItem('hyperDaggerRenderer'),stuck:window.__hd.debug.inputObj().right.active}));
    assert.ok(retry.t<2);assert.equal(retry.saved,renderer);assert.equal(retry.stuck,false);
    assert.deepEqual(errors,[]);
    console.log(`PASS ${season}/${renderer}: v60 menu, START, weapon kill, simulation death, isolated free record, tap retry`);
    await context.close();
  }
})().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{if(browser)await browser.close();server.close()});
