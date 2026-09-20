const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{const b=await chromium.launch({headless:true,...(process.env.BROWSER_PATH?{executablePath:process.env.BROWSER_PATH}:{})});try{
 const p=await b.newPage();await p.addInitScript(()=>{window.testPad={connected:true,axes:[0,0],buttons:Array.from({length:16},()=>({pressed:false,value:0}))};Object.defineProperty(navigator,'getGamepads',{value:()=>[window.testPad]});});
 async function press(i){await p.evaluate(i=>{testPad.buttons[i]={pressed:true,value:1}},i);await p.waitForTimeout(100);await p.evaluate(i=>{testPad.buttons[i]={pressed:false,value:0}},i);await p.waitForTimeout(100);}
 await p.goto((process.env.TURF_BASE_URL||'http://127.0.0.1:8767')+'/turf/');await p.locator('#titleStart:not([disabled])').waitFor();await press(0);await p.waitForFunction(()=>__turf.state());
 await p.evaluate(()=>{__turf.state().units.find(u=>u.uid==='p0').slots=1;__turf.finish('win');});
 assert(await p.locator('.offerBtn').count());await press(15);await press(0);assert.equal(await p.locator('.offerBtn').count(),0);
 await press(0);assert.equal(await p.evaluate(()=>__turf.sequence().index),1);
 await p.evaluate(()=>__turf.finish('lose'));await p.waitForTimeout(350);await press(0);assert.equal(await p.evaluate(()=>__turf.sequence().index),0);
 console.log('PASS simulated gamepad: start, navigate skill choices, choose, continue, retry');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exit(1)});
