// Renderer selection is exercised through real mouse, touch, keyboard and pad input.
const {chromium}=require('playwright');
const http=require('http'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
const ROOT=path.resolve(__dirname,'../..'),GAME=process.env.HD_GAME_PATH||'hyperdagger';
const server=http.createServer((req,res)=>{let p=path.join(ROOT,decodeURIComponent(req.url.split('?')[0]));if(fs.existsSync(p)&&fs.statSync(p).isDirectory())p=path.join(p,'index.html');if(!fs.existsSync(p)){res.writeHead(404);return res.end();}res.setHeader('Content-Type',({'.js':'text/javascript','.html':'text/html','.json':'application/json'})[path.extname(p)]||'application/octet-stream');fs.createReadStream(p).pipe(res);});
let browser;
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||undefined,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
 const base='http://127.0.0.1:'+server.address().port,errors=[];
 const page=await browser.newPage({viewport:{width:844,height:540}});page.setDefaultTimeout(90000);
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.addInitScript(()=>{localStorage.setItem('hyperDaggerSeenTips','1');localStorage.setItem('hyperDaggerOpts',JSON.stringify({perf:'low'}));});
 await page.goto(base+'/'+GAME+'/?assets=0&skull=classic');await page.waitForFunction(()=>window.__hd);
 assert.equal(await page.locator('[data-renderer=classic]').getAttribute('aria-pressed'),'true');
 await page.locator('[data-renderer=sdf]').click();
 assert.equal(await page.locator('[data-renderer=sdf]').getAttribute('aria-pressed'),'true');
 assert.equal(await page.evaluate(()=>window.__hd.debug.getState().state),'menu','selection cannot start a run');
 await page.reload();await page.waitForFunction(()=>window.__hd);
 assert.equal(await page.locator('[data-renderer=sdf]').getAttribute('aria-pressed'),'true','saved choice survives reload');
 await page.keyboard.press('r');assert.equal(await page.locator('[data-renderer=classic]').getAttribute('aria-pressed'),'true');
 await page.keyboard.press('r');await page.locator('#startBtn').click();await page.waitForFunction(()=>window.__hd.debug.getState().state==='playing');
 const roster=await page.evaluate(async(game)=>{
  const {Skull,Wraith,Splitter,MiniSkull,DreadSkull,Watcher,Totem}=await import('/'+game+'/js/enemy.js?v=113');
  const THREE=await import('/'+game+'/vendor/three.module.min.js');
  const scene=new THREE.Scene();
  return [Skull,Wraith,Splitter,MiniSkull,DreadSkull,Watcher,Totem].map(C=>{const e=new C(scene,new THREE.Vector3(0,2,0),20);const r={variant:e.sdfRoot?.userData.sdfVariant,hp:e.hp,radius:e.radius,score:e.score};e.remove(scene);return r;});
 },GAME);
 assert.deepEqual(roster.map(e=>e.variant),['skull','wraith','splitter','mini','dread','watcher','totem']);
 assert.deepEqual(roster.map(e=>e.hp),[1,2,4,1,8,4,25]);assert.deepEqual(roster.map(e=>e.radius),[.75,.75,1.05,.45,1.3,.85,1.7]);
 console.log('PASS seven distinct SDF profiles; original HP and collision radii');
 if(process.env.HD_SDF_EVIDENCE){fs.mkdirSync(process.env.HD_SDF_EVIDENCE,{recursive:true});await page.goto(base+'/'+GAME+'/?assets=0&skull=sdf');await page.waitForFunction(()=>window.__hd);await page.screenshot({path:path.join(process.env.HD_SDF_EVIDENCE,'menu.png'),timeout:90000});}
 const ctx=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
 const touch=await ctx.newPage();touch.setDefaultTimeout(90000);touch.on('pageerror',e=>errors.push(e.message));
 await touch.goto(base+'/'+GAME+'/?assets=0&skull=classic');await touch.waitForFunction(()=>window.__hd);
 await touch.locator('[data-renderer=sdf]').tap();assert.equal(await touch.locator('[data-renderer=sdf]').getAttribute('aria-pressed'),'true');
 const box=await touch.locator('[data-renderer=sdf]').boundingBox();assert.ok(box.height>=44);
 assert.equal(await touch.evaluate(()=>window.__hd.debug.getState().state),'menu');
 await touch.evaluate(()=>{window.__pad={id:'sdf-test',index:0,connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};navigator.getGamepads=()=>[window.__pad];});
 await touch.evaluate(()=>{window.__pad.buttons[13]={pressed:true,value:1};});
 await touch.waitForFunction(()=>document.querySelector('[data-renderer=classic]').getAttribute('aria-pressed')==='true');
 await touch.evaluate(()=>{window.__pad.buttons[13]={pressed:false,value:0};});
 assert.deepEqual(errors,[]);
 console.log('PASS real menu: mouse, persisted reload, R, START, portrait touch, 44px target, gamepad down');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();server.close();});
