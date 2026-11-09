// A season picked in the test arena's PAUSE menu must leave every URL pin
// before the normal season starts. Real controls; normal records are sentinels.
const { chromium }=require('playwright');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=process.env.HD_SITE_ROOT||path.resolve(__dirname,'../..');
const server=http.createServer((req,res)=>{
 let f=path.join(root,decodeURIComponent(req.url.split('?')[0]));
 if(fs.existsSync(f)&&fs.statSync(f).isDirectory())f=path.join(f,'index.html');
 fs.readFile(f,(e,b)=>{res.writeHead(e?404:200,{'Content-Type':({'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png'})[path.extname(f)]||'application/octet-stream'});res.end(e?'missing':b)});
});
let browser;
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||undefined,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
 for(const season of ['ember','inca','haul']){
  const ctx=await browser.newContext({viewport:{width:844,height:390},isMobile:true,hasTouch:true});
  const p=await ctx.newPage();p.setDefaultTimeout(90000);const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.addInitScript(()=>{
   if(sessionStorage.getItem('exitSeed'))return;sessionStorage.setItem('exitSeed','1');
   localStorage.setItem('hyperDaggerSeenTips','1');localStorage.setItem('hyperDaggerRenderer','sdf');
   localStorage.setItem('hyperDaggerRunKind','daily');localStorage.setItem('hyperDaggerOpts',JSON.stringify({perf:'low'}));
   const records={hyperDaggerHiHyper:'777',hyperDaggerHiTruckV58:'888',hyperDaggerHistory:'[{"t":42,"mode":"sentinel"}]',hyperDaggerRunLog:'[{"t":42,"cause":"sentinel"}]',hyperDaggerDailyBest:'[]'};
   records['hyperDaggerDaily:'+new Date().toISOString().slice(0,10)+':haul:truck']='999';
   for(const [k,v]of Object.entries(records))localStorage.setItem(k,v);
  });
  const readRecords=()=>p.evaluate(()=>Object.fromEntries(Object.keys(localStorage).filter(k=>/^(hyperDaggerHi|hyperDaggerHistory|hyperDaggerRunLog|hyperDaggerDaily)/.test(k)).sort().map(k=>[k,localStorage.getItem(k)])));
  await p.goto(`http://127.0.0.1:${server.address().port}/hyperdagger/?assets=0`);
  await p.waitForFunction(()=>window.__hd);const before=await readRecords();
  await Promise.all([p.waitForURL(/sdfTest=1/),p.locator('[data-sdf-arena]').tap()]);
  await p.waitForFunction(()=>window.__hd);await p.locator('#startBtn').tap();
  await p.waitForFunction(()=>window.__hd.debug.getState().state==='playing');
  await p.locator('#pauseBtn').tap();
  await p.locator(`#msg button.season[data-season="${season}"]`).waitFor();
  await Promise.all([p.waitForURL(u=>!u.searchParams.has('sdfTest')),p.locator(`#msg button.season[data-season="${season}"]`).tap()]);
  await p.waitForFunction(()=>window.__hd);
  assert.equal(new URL(p.url()).search,'','all test-only URL pins are removed');
  assert.equal(await p.evaluate(()=>window.__hd.debug.getState().state),'menu');
  assert.equal(await p.locator('.mn-season.on').getAttribute('data-season'),season);
  assert.deepEqual(await readRecords(),before,'leaving the test run changes no normal/daily record');
  await p.locator('#startBtn').tap();await p.waitForFunction(()=>window.__hd.debug.getState().state==='playing');
  const state=await p.evaluate(()=>({mode:window.__hd.debug.getState().mode,convoy:!!window.__hd.debug.getConvoy()}));
  assert.equal(state.mode,season==='haul'?'truck':'hyper');assert.equal(state.convoy,season==='haul');
  assert.deepEqual(await readRecords(),before);assert.deepEqual(errors,[]);
  console.log(`PASS test-arena START → pause → ${season}: clean URL, selected menu, correct rules/floor, normal and daily records untouched`);
  await ctx.close();
 }
})().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{if(browser)await browser.close();server.close()});
