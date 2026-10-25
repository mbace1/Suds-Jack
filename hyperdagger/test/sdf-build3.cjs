// SDF geometry contracts plus real START → shot → persistent wound → kill.
const {chromium}=require('playwright'),http=require('http'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
const ROOT=path.resolve(__dirname,'../..'),GAME=process.env.HD_GAME_PATH||'hyperdagger';
const server=http.createServer((req,res)=>{let p=path.join(ROOT,decodeURIComponent(req.url.split('?')[0]));if(fs.existsSync(p)&&fs.statSync(p).isDirectory())p=path.join(p,'index.html');if(!fs.existsSync(p)){res.writeHead(404);return res.end();}res.setHeader('Content-Type',({'.js':'text/javascript','.html':'text/html','.json':'application/json'})[path.extname(p)]||'application/octet-stream');fs.createReadStream(p).pipe(res);});let browser;
(async()=>{
await new Promise(r=>server.listen(0,'127.0.0.1',r));
browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||undefined,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
let p=await browser.newPage({viewport:{width:640,height:480}});p.setDefaultTimeout(90000);const errors=[];p.on('pageerror',e=>{errors.push(e.message);console.error('PAGE:',e.message)});p.on('console',m=>{if(m.type()==='error'){errors.push(m.text());console.error('CONSOLE:',m.text())}});
await p.addInitScript(()=>{localStorage.setItem('hyperDaggerOpts',JSON.stringify({perf:'low'}));localStorage.setItem('hyperDaggerSeenTips','1');localStorage.setItem('hyperDaggerRunKind','daily');localStorage.setItem('hyperDaggerHi','0');localStorage.setItem('hyperDaggerHistory','[{"t":123,"mode":"sentinel"}]');});
const base=process.env.HD_BASE_URL||'http://127.0.0.1:'+server.address().port;
await p.goto(base+'/'+GAME+'/sdf-preview.html');await p.waitForFunction(()=>window.__sdfStudy);
const proof=await p.evaluate(async game=>{
 const T=await import('/'+game+'/vendor/three.module.min.js');const sdf=await import('/'+game+'/js/sdf-skull.js?v=3');
 const r=window.__sdfStudy.renderer,target=new T.WebGLRenderTarget(32,32),scene=new T.Scene();scene.background=new T.Color(0,1,0);
 const camera=new T.PerspectiveCamera(35,1,.1,20);camera.position.set(0,.54,5);camera.updateMatrixWorld();
 const mesh=sdf.createSdfSkull();scene.add(mesh);const pixel=new Uint8Array(4);
 function sample(){r.setRenderTarget(target);r.render(scene,camera);r.readRenderTargetPixels(target,16,16,1,1,pixel);return [...pixel];}
 const before=sample();sdf.carveSdfImpact(mesh,mesh.localToWorld(new T.Vector3(0,.4,.6)),new T.Vector3(0,0,-1),3);mesh.material.uniforms.flash.value=0;const after=sample();
 for(let i=0;i<10;i++)sdf.carveSdfImpact(mesh,new T.Vector3(i*.01,.54,1),new T.Vector3(0,0,-1));
 const cap=mesh.material.uniforms.woundCount.value;scene.remove(mesh);mesh.material.dispose();
 const variants={};
 for(const variant of ['watcher','totem']){const m=sdf.createSdfSkull({variant});m.material.uniforms.eyeColor.value.setRGB(.8,.1,.025);scene.add(m);camera.position.set(0,variant==='totem'?1.9:0,6);camera.updateMatrixWorld();m.material.uniforms.charge.value=0;const idle=sample();m.material.uniforms.charge.value=1;const charged=sample();variants[variant]={idle,charged,offset:m.position.y};scene.remove(m);m.material.dispose();}
 r.setRenderTarget(null);target.dispose();return {before,after,cap,variants};
},GAME);
assert.ok(proof.before[0]>proof.before[1]*.7);assert.ok(proof.after[1]>proof.after[0]*2,'hole reveals the green background, not a painted dent');assert.equal(proof.cap,6);
for(const v of Object.values(proof.variants))assert.notDeepEqual(v.idle,v.charged,'charge changes actual rendered core');
console.log('PASS CSG hole opens through the body, six-cut cap, Watcher/Totem charged render:',JSON.stringify(proof));
// Exercise gallery buttons to compile/render the new forms in the player study.
for(let i=0;i<6;i++)await p.locator('#variant').click();await p.waitForFunction(()=>window.__sdfStudy.objects()[1].root.userData.sdfVariant==='totem');
if(process.env.HD_SDF_EVIDENCE){fs.mkdirSync(process.env.HD_SDF_EVIDENCE,{recursive:true});await p.screenshot({path:path.join(process.env.HD_SDF_EVIDENCE,'totem.png'),timeout:90000});}
// Recycle the software-GPU process between shader-contract and game phases.
await browser.close();
browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||undefined,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
p=await browser.newPage({viewport:{width:480,height:400}});p.setDefaultTimeout(90000);
p.on('pageerror',e=>{errors.push(e.message);console.error('PAGE:',e.message)});p.on('console',m=>{if(m.type()==='error'){errors.push(m.text());console.error('CONSOLE:',m.text())}});
await p.addInitScript(()=>{localStorage.setItem('hyperDaggerOpts',JSON.stringify({perf:'low'}));localStorage.setItem('hyperDaggerSeenTips','1');localStorage.setItem('hyperDaggerRunKind','daily');localStorage.setItem('hyperDaggerHi','0');localStorage.setItem('hyperDaggerHistory','[{"t":123,"mode":"sentinel"}]');});
console.log('opening game',GAME);await p.goto(base+'/'+GAME+'/?assets=0&skull=sdf&season=void&mode=hyper&sdfTest=1');await p.waitForFunction(()=>window.__hd);await p.evaluate(()=>{localStorage.setItem('hyperDaggerSeenTips','1');localStorage.setItem('hyperDaggerRunKind','daily');localStorage.setItem('hyperDaggerHi','0');localStorage.setItem('hyperDaggerHistory','[{"t":123,"mode":"sentinel"}]');window.__hd.debug.setOpt('perf','low')});await p.locator('#startBtn').click();await p.waitForFunction(()=>window.__hd.debug.getState().state==='playing');
await p.evaluate(()=>{const h=window.__hd;window.__arenaTypes=h.enemies.map(e=>e.type);for(const e of h.enemies)e.remove(e.group.parent);h.enemies.length=0;h.debug.setInvulnerable(true);h.debug.freezeDirector(true);h.debug.spawnWatcher();const e=h.enemies.at(-1);e.pos.copy(h.player.eyePos);e.pos.z-=4;e.hp=40;e.spawnK=1;e.group.scale.setScalar(1);e.fireT=.3;window.__target=e;window.__testScene=e.group.parent;});
assert.deepEqual(await p.evaluate(()=>window.__arenaTypes),['watcher','totem'],'START opens the actual test encounter');
await p.waitForFunction(()=>window.__target.sdfRoot.material.uniforms.charge.value>.6);
await p.waitForFunction(()=>window.__hd.orbs.active.length>=3);console.log('PASS real Watcher volley');
await p.evaluate(()=>{const e=window.__target,h=window.__hd;e.pos.copy(h.player.eyePos);e.pos.z-=4;e.vel.set(0,0,0);});
await p.mouse.down();await p.waitForFunction(()=>window.__target.sdfRoot.material.uniforms.woundCount.value>0);await p.mouse.up();
console.log('PASS held-fire wound');
assert.ok(await p.evaluate(()=>window.__target.hp<40),'real fire reaches damage and shader wound path');
if(process.env.HD_SDF_EVIDENCE)await p.screenshot({path:path.join(process.env.HD_SDF_EVIDENCE,'wounded-watcher.png'),timeout:90000});
// Reset only encounter setup; prove the real projectile still produces death.
await p.evaluate(()=>{const e=window.__target,h=window.__hd;e.hp=1;e.pos.copy(h.player.eyePos);e.pos.z-=4;e.vel.set(0,0,0);});
await p.mouse.down();await p.waitForFunction(()=>!window.__hd.enemies.includes(window.__target));await p.mouse.up();assert.equal(await p.evaluate(()=>window.__target.sdfRoot),null);console.log('PASS Watcher kill');
// Setup a Totem shortly before its own emission; its real update/director acts.
await p.evaluate(async game=>{const T=await import('/'+game+'/vendor/three.module.min.js');const {Totem}=await import('/'+game+'/js/enemy.js?v=113');const h=window.__hd,t=new Totem(window.__testScene,new T.Vector3(8,0,-8),1);t.spawnK=1;t.group.scale.setScalar(1);t.spawnTimer=.25;t.ringTimer=.25;h.enemies.push(t);window.__totem=t;h.debug.freezeDirector(false);},GAME);
await p.waitForFunction(()=>window.__totem.spawnTimer>.5 && window.__hd.enemies.some(e=>e!==window.__totem&&e.sdfRoot?.userData.sdfVariant==='skull'));
assert.equal(await p.evaluate(()=>window.__totem.sdfRoot.userData.sdfVariant),'totem');
const floorProof=await p.evaluate(async game=>{
 const T=await import('/'+game+'/vendor/three.module.min.js');
 const floor=window.__testScene.children.find(o=>o.material?.uniforms?.uSdfInlays);
 const material=floor.material.clone();material.uniforms.uGlow.value=.6;material.uniforms.uPulse.value=0;material.uniforms.uRed.value=0;
 material.uniforms.map.value=new T.DataTexture(new Uint8Array([255,255,255,255]),1,1);material.uniforms.map.value.needsUpdate=true;
 const scene=new T.Scene(),mesh=new T.Mesh(floor.geometry,material);scene.add(mesh);
 const cam=new T.OrthographicCamera(-.5,.5,.5,-.5,.1,30),angle=Math.PI/6;const x=7.6*Math.cos(angle),z=7.6*Math.sin(angle);cam.position.set(x,10,z);cam.lookAt(x,0,z);
 const r=new T.WebGLRenderer(),rt=new T.WebGLRenderTarget(32,32),pixel=new Uint8Array(4);r.setRenderTarget(rt);
 const samples=[];for(const v of [0,1]){material.uniforms.uSdfInlays.value=v;r.render(scene,cam);r.readRenderTargetPixels(rt,16,16,1,1,pixel);samples.push([...pixel]);}
 material.uniforms.map.value.dispose();material.dispose();rt.dispose();r.dispose();return samples;
},GAME);
assert.notDeepEqual(floorProof[0],floorProof[1],'SDF inlay changes the rendered floor, not only the flag');
console.log('PASS Totem emits SDF skulls and floor engraving pixel control',JSON.stringify(floorProof));
await p.evaluate(()=>window.__hd.debug.setLife(.01));
await p.waitForFunction(()=>window.__hd.debug.getState().state==='dead');
const records=await p.evaluate(()=>({classic:localStorage.getItem('hyperDaggerHi'),test:localStorage.getItem('hyperDaggerSdfTest:hyper'),history:localStorage.getItem('hyperDaggerHistory'),daily:Object.keys(localStorage).filter(k=>k.startsWith('hyperDaggerDaily:'))}));
assert.equal(records.classic,'0');assert.ok(Number(records.test)>0);assert.equal(JSON.parse(records.history)[0].mode,'sentinel');assert.equal(records.daily.length,0);
console.log('PASS natural timeout writes separate test records and no daily score');
assert.deepEqual(errors,[]);console.log('PASS real START → held fire → Watcher wound → kill/dispose; no shader/runtime errors');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();server.close()});
