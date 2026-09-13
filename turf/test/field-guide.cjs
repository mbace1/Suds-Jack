const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
 const browser = await chromium.launch({headless:true, ...(process.env.BROWSER_PATH ? {executablePath:process.env.BROWSER_PATH} : {})});
 try {
  for (const touch of [false,true]) {
   const page = await browser.newPage({viewport:touch?{width:390,height:844}:{width:1280,height:800},hasTouch:touch,isMobile:touch});
   const errors=[]; page.on('pageerror', e=>errors.push(e.message));
   await page.goto((process.env.TURF_BASE_URL || 'http://127.0.0.1:8767') + '/turf/');
   await page.locator('#titleStart:not([disabled])').waitFor();
   await page.locator('#titleStart')[touch?'tap':'click']();
   await page.locator('#title').waitFor({state:'hidden'});
   await page.locator('.unitBtn').first()[touch?'tap':'click']();
   assert.match(await page.locator('#fieldGuide').innerText(),/Tap a highlighted tile/);
   // Inspect available tiles to choose a real screen target; movement goes
   // through the canvas input, never the debug command.
   await page.locator('#zoomFit')[touch?'tap':'click']();
   const pt=await page.evaluate(()=>{
    const s=window.__turf.state(),l=window.__turf.layout();
    const tile=[...s.moveTiles.keys()].map(k=>k.split(',').map(Number)).find(([x,y])=>!s.units.some(u=>u.hp>0&&u.x===x&&u.y===y));
    const rect=document.getElementById('board').getBoundingClientRect();
    const selected=s.units.find(u=>u.uid===s.selected);
    return {uid:selected.uid, x:rect.left+(l.originX+(tile[0]-tile[1])*16)*rect.width/l.width,
      y:rect.top+(l.originY+(tile[0]+tile[1])*8)*rect.height/l.height};
   });
   if(touch) await page.touchscreen.tap(pt.x,pt.y); else await page.mouse.click(pt.x,pt.y);
   await page.waitForFunction(uid=>window.__turf.state().units.find(u=>u.uid===uid).actedMove,pt.uid);
   assert.doesNotMatch(await page.locator('#fieldGuide').innerText(),/2 · Tap a highlighted tile/);
   // Keyboard navigation also follows the production input path.
   await page.keyboard.press('Escape');
   await page.locator('.unitBtn').first()[touch?'tap':'click']();
   await page.locator('#endTurnBtn')[touch?'tap':'click']();
   await page.waitForFunction(()=>window.__turf.state().round>1 || window.__turf.state().result,{},{timeout:30000});
   assert.equal(errors.length,0,errors.join('\n'));
   await page.screenshot({path:`turf/test/field-guide-${touch?'touch':'desktop'}.png`});
   console.log('PASS',touch?'touch':'desktop','start, select, board movement, cancel, end turn, enemy resolution');
   await page.close();
  }
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
