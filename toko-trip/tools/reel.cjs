// The promo reel: 15 s at 24 fps, frame-stepped through __tt.debug.capture/step
// so it is smooth on a machine that renders two frames a second.
//   NODE_PATH=$(npm root -g) node toko-trip/tools/reel.cjs . /tmp/frames
//   ffmpeg -framerate 24 -i /tmp/frames/f%04d.png -c:v libx264 -pix_fmt yuv420p reel.mp4
// Needs an ffmpeg with libx264 (pip install imageio-ffmpeg carries one).
const http=require('http'),fs=require('fs'),path=require('path');
const {chromium}=require('playwright');
const ROOT=process.argv[2]||path.resolve(__dirname,"..",".."), OUT=process.argv[3], LIMIT=+(process.argv[4]||1e9);
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.mp3':'audio/mpeg'};
const FPS=24, DT=1000/FPS;
(async()=>{
  const server=http.createServer((req,res)=>{let p=decodeURIComponent(new URL(req.url,'http://x').pathname);
    if(p.endsWith('/'))p+='index.html';const f=path.join(ROOT,p);
    if(!fs.existsSync(f)||fs.statSync(f).isDirectory()){res.writeHead(404);return res.end();}
    res.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream'});
    fs.createReadStream(f).pipe(res);}).listen(0);
  const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
  const page=await browser.newPage({viewport:{width:1280,height:720}});
  let n=0;
  const errs=[];page.on('pageerror',e=>errs.push(String(e)));page.on('crash',()=>console.log('PAGE CRASH at',n));page.on('console',m=>{if(m.type()==='error')console.log('console:',m.text().slice(0,200));});
  await page.addInitScript(()=>{for(const m of ['linearRampToValueAtTime','setValueAtTime','exponentialRampToValueAtTime','setTargetAtTime']){const o=AudioParam.prototype[m];AudioParam.prototype[m]=function(v,t,...r){return o.call(this,v,Math.max(0,+t||0),...r);};}});
  await page.goto(`http://127.0.0.1:${server.address().port}/toko-trip/`,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__tt&&window.__tt.renderer&&window.__tt.debug,null,{timeout:180000}); await page.waitForTimeout(2000); await page.evaluate(()=>window.__tt.debug.capture(true));
  await page.addStyleTag({content:'#hints,#XRButton,#ui,#mood-name,a[href*="hub"],.hub-home,[class*="shell"],button,.arcade-home,.arcade-touch{display:none!important}'});
  await page.evaluate(()=>{const d=window.__tt.debug; d.resetNews(); d.setComfort('time',0);});
  for(let i=0;i<24;i++) await page.evaluate(()=>window.__tt.debug.step(1/24));   // settle
  const frame=async()=>{ if(n%10===0){const m=await page.evaluate(()=>{const i=window.__tt.renderer.info;return {heap:performance.memory?Math.round(performance.memory.usedJSHeapSize/1e6):0,tex:i.memory?.textures,geo:i.memory?.geometries};});console.log('f',n,JSON.stringify(m));} await page.evaluate(()=>window.__tt.debug.step(1/24)); await page.screenshot({path:`${OUT}/f${String(n++).padStart(4,'0')}.png`}); if(n>=LIMIT) throw 'limit'; };
  const ease=u=>u*u*(3-2*u);
  try{
    // A — golden hour from behind the chair; the sea moves, a gust comes through
    await page.evaluate(()=>{window.__tt.setMood(0,true); window.__tt.debug.setTide(0.25);});
    for(let i=0;i<30;i++) await page.evaluate(()=>window.__tt.debug.step(1/24));
    await page.evaluate(()=>window.__tt.debug.gustNow());
    const A=120;
    for(let i=0;i<A;i++){ const u=ease(i/(A-1));
      await page.evaluate(([u])=>{const tt=window.__tt,c=tt.chair,fx=Math.sin(c.yaw),fz=Math.cos(c.yaw);
        const d=1.6-0.5*u; tt.debug.stand(-fx*d,-fz*d,c.yaw+Math.PI-0.25+0.5*u,-0.24+0.06*u);},[u]);
      await frame(); }
    // B — the postcard: sitting in the chair, leaning over to read it
    const B=60;
    for(let i=0;i<B;i++){ const u=ease(i/(B-1));
      await page.evaluate(([u])=>{const tt=window.__tt,d=tt.debug,p=d.postcard.position;
        // from the seat's side of the table, so the rig stands on the deck
        const L=Math.hypot(p.x,p.z)||1, k=0.56-0.16*u, x=p.x-p.x/L*k, z=p.z-p.z/L*k, h=0.62-0.14*u;
        const eyeY=(d.standY(x,z,3)??0)+h;
        d.stand(x,z,Math.atan2(p.x-x,p.z-z)+Math.PI,-Math.atan2(eyeY-p.y,k),h);},[u]);
      await frame(); }
    await page.evaluate(()=>window.__tt.debug.stand(0,0,0,0,1.5));
    // C — tap: dusk, the surf glows, the mouse sweeps the water
    await page.evaluate(()=>window.__tt.debug.postcardAct());
    for(let i=0;i<6;i++) await page.evaluate(()=>window.__tt.debug.step(1/24));
    const base=await page.evaluate(()=>{const tt=window.__tt,c=tt.camera; return {x:c.position.x,z:c.position.z,yaw:tt.chair.yaw+Math.PI};});
    await page.evaluate(()=>{window.__tt.debug.verdict.visible=false;});
    const C=190;
    for(let i=0;i<C;i++){ const u=i/(C-1);
      await page.evaluate(([b,u])=>{window.__tt.debug.stand(b.x,b.z,b.yaw+0.45-0.9*u,-0.22);
        window.__tt.debug.verdict.visible = u>0.72;},[base,u]);
      const mx=640+Math.sin(u*Math.PI*3.2)*360, my=470+Math.cos(u*Math.PI*2.1)*70;
      await page.mouse.move(mx,my);
      await frame(); }
  }catch(e){ if(e!=='limit') throw e; }
  console.log('frames',n,'errors',errs.slice(0,3));
  await browser.close();server.close();
})();
