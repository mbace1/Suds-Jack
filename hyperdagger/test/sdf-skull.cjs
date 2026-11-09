// Real WebGL compile, A/B render cost and player-entry/combat regression.
// NODE_PATH=<playwright modules> PLAYWRIGHT_CHROMIUM_EXECUTABLE=<chrome> node hyperdagger/test/sdf-skull.cjs
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path'), assert = require('assert/strict');
const root = path.resolve(__dirname, '../..');
const GAME=process.env.HD_GAME_PATH || 'hyperdagger';
const server = http.createServer((req,res) => {
  let file=path.join(root,decodeURIComponent(req.url.split('?')[0]));
  if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');
  if(!fs.existsSync(file)){res.writeHead(404);return res.end();}
  res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json'})[path.extname(file)]||'application/octet-stream');
  fs.createReadStream(file).pipe(res);
});
let browser;
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||undefined,
 args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
 const page=await browser.newPage({viewport:{width:640,height:480}});page.setDefaultTimeout(90000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(base+'/'+GAME+'/sdf-preview.html?benchmark');
 await page.waitForFunction(()=>window.__sdfStudy?.stats().frameTimes.length>=3,null,{timeout:90000});
 assert.equal(await page.evaluate(()=>window.__sdfStudy.objects()[1].root.name),'SDF skull');
 const output=process.env.HD_SDF_EVIDENCE;
 if(output){fs.mkdirSync(output,{recursive:true});await page.screenshot({path:path.join(output,'sdf-comparison.png'),timeout:90000});}
 const measurements={};
 if(!process.env.HD_SDF_SKIP_BENCHMARK) for(const mode of ['voxel','sdf']){
  await page.locator('#'+mode).click();
  await page.waitForFunction(m=>window.__sdfStudy.stats().mode===m&&window.__sdfStudy.stats().frameTimes.length>=18,mode,{timeout:180000});
  measurements[mode]=await page.evaluate(()=>{const a=window.__sdfStudy.stats().frameTimes.sort((a,b)=>a-b);return {frames:a.length,medianMs:a[Math.floor(a.length/2)],p95Ms:a[Math.floor(a.length*.95)]};});
 }
 if(!process.env.HD_SDF_SKIP_BENCHMARK) console.log('12 skulls, 640px wide study, synchronous GPU completion:',JSON.stringify(measurements));
 // A changing bite must reach the SDF material. The UI's rotate switch is exercised too.
 await page.locator('#compare').click();await page.locator('#rotate').click();
 await page.waitForFunction(()=>window.__sdfStudy.objects()[1].root.rotation.y!==0);
 assert.equal(await page.locator('#rotate').getAttribute('aria-pressed'),'true');
 // A plane behind the marched face must not cover it; a plane in front must.
 const depth=await page.evaluate(async(game)=>{
  const THREE=await import('/'+game+'/vendor/three.module.min.js');
  const {createSdfSkull}=await import('/'+game+'/js/sdf-skull.js?v=3');
  const r=window.__sdfStudy.renderer,scene=new THREE.Scene();
  const cam=new THREE.PerspectiveCamera(35,1,.1,20);cam.position.set(0,.4,5);cam.updateMatrixWorld();
  const skull=createSdfSkull();scene.add(skull);
  const plane=new THREE.Mesh(new THREE.PlaneGeometry(8,8),new THREE.MeshBasicMaterial({color:0x00ff00}));scene.add(plane);
  const target=new THREE.WebGLRenderTarget(16,16),pixels=new Uint8Array(4);
  function sample(z){plane.position.z=z;r.setRenderTarget(target);r.render(scene,cam);r.readRenderTargetPixels(target,8,8,1,1,pixels);return [...pixels];}
  const behind=sample(0),front=sample(2);r.setRenderTarget(null);
  target.dispose();plane.geometry.dispose();plane.material.dispose();skull.material.dispose();
  return {behind,front};
 },GAME);
 assert.ok(depth.behind[0]>depth.behind[1]*.7,'marched face in front of rear occluder');
 assert.ok(depth.front[1]>depth.front[0]*2,'front geometry occludes SDF');
 console.log('PASS surface-depth occlusion',JSON.stringify(depth));
 for(const variant of ['wraith','splitter','mini','dread']) {
  await page.locator('#variant').click();
  await page.waitForFunction(v=>window.__sdfStudy.objects()[1].root.userData.sdfVariant===v,variant);
  await page.waitForFunction(()=>window.__sdfStudy.objects()[1].root.material.uniforms.localToClip.value.elements[0]!==1);
 }
 console.log('PASS every skull profile renders through the study controls');
 assert.deepEqual(errors,[],'lab shader compilation/render errors');
 // The real game starts from its visible START, not debug.startGame.
 await page.goto(base+'/'+GAME+'/?assets=0&skull=sdf&season=ember');
 await page.waitForFunction(()=>window.__hd,null,{timeout:90000});
 await page.evaluate(()=>{localStorage.setItem('hyperDaggerSeenTips','1');window.__hd.debug.setOpt('perf','low');});
 await page.locator('.mn-start').click();
 await page.waitForFunction(()=>window.__hd.debug.getState().state==='playing');
 // Setup a stationary enemy on the reticle; shoot through the real mouse input.
 const info=await page.evaluate(()=>{
  const h=window.__hd;h.debug.setInvulnerable(true);h.debug.freezeDirector(true);
  const s=h.debug.spawnSkull();s.pos.copy(h.player.eyePos);s.pos.z-=4;s.maxSpeed=0;s.accel=0;s.spawnK=1;s.group.scale.setScalar(1);
  window.__sdfTarget=s;
  return {sdf:!!s.sdfRoot,radius:s.radius,hp:s.hp,voxels:s.deathVoxels().length};
 });
 await page.evaluate(()=>window.__hd.debug.spawnSplitter());
 assert.equal(await page.evaluate(()=>window.__hd.enemies.at(-1).sdfRoot.userData.sdfVariant),'splitter','splitter retains its own SDF profile');
 assert.equal(info.sdf,true);assert.equal(info.radius,.75);assert.equal(info.hp,1);assert.ok(info.voxels>0);
 await page.waitForFunction(()=>window.__sdfTarget.sdfRoot.material.uniforms.localToClip.value.elements[0]!==1);
 if(output)await page.screenshot({path:path.join(output,'sdf-game.png'),timeout:90000});
 await page.mouse.down();await page.waitForFunction(()=>!window.__hd.enemies.includes(window.__sdfTarget),null,{timeout:90000});await page.mouse.up();
 assert.equal(await page.evaluate(()=>window.__sdfTarget.sdfRoot),null,'death releases per-enemy SDF material');
 assert.deepEqual(errors,[],'game shader/runtime errors');
 // Explicit Classic overrides the saved preview choice.
 await page.goto(base+'/'+GAME+'/?assets=0&skull=classic&season=ember');await page.waitForFunction(()=>window.__hd,null,{timeout:90000});
 assert.equal(await page.evaluate(()=>!!window.__hd.debug.spawnSkull().sdfRoot),false);
 assert.deepEqual(errors,[]);
 console.log('PASS: compare/rotate controls, SDF shaders, real START → aim → held fire → kill, collision radius, voxel gibs, material disposal, default renderer');
 if(output&&!process.env.HD_SDF_SKIP_BENCHMARK)fs.writeFileSync(path.join(output,'measurements.json'),JSON.stringify(measurements,null,2));
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();server.close();});
