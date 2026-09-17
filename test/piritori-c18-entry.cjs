// Exercise the real Hub link and UI on a frozen candidate or the public site.
// Isolated browser storage only. No feedback forms or account writes.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const base=process.env.HUB_BASE_URL||'http://127.0.0.1:8781/';
const out=process.env.C18_ENTRY_OUTPUT||'/tmp/c18-entry';
fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader','--use-angle=swiftshader']});
 const results=[];
 try{
  for(const spec of [{name:'phone',width:412,height:915},{name:'landscape',width:844,height:390}]){
   const context=await browser.newContext({viewport:{width:spec.width,height:spec.height},hasTouch:true,isMobile:true,locale:'en-US'});
   await context.addInitScript(()=>localStorage.setItem('tokoSting','1'));
   const page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   const tap=async locator=>{await locator.scrollIntoViewIfNeeded();await locator.tap();};
   const idle=()=>page.waitForFunction(()=>window.fightModule&&!fightModule.metrics().busy&&!fightModule.metrics().layoutPaused,null,{timeout:90000});
   try{
    await page.goto(new URL('#optionc-lab',base).href);
    const play=page.locator('#cab-optionc-lab a.play');
    await play.waitFor({state:'visible',timeout:60000});
    assert.equal(await page.locator('#cab-optionc').count(),0,'removed C.08 cabinet must stay absent');
    const href=await play.getAttribute('href'),entry=new URL(href,base);
    assert.ok(entry.pathname.endsWith('/piritori-c17/web/crew-run/'),'real campaign cabinet, not a test fixture');
    assert.equal(entry.searchParams.get('campaign'),'1');
    assert.equal(entry.searchParams.get('release'),'18');
    await tap(play);
    await page.waitForURL(url=>url.pathname===entry.pathname&&url.searchParams.get('release')==='18',{timeout:60000});
    await idle();
    assert.equal(await page.locator('h1 span').textContent(),'C.18');
    await tap(page.locator('#crew-deploy'));await idle();
    assert.equal(await page.locator('#crew-screen').isVisible(),false,'deployment enters the battle');
    await page.screenshot({path:`${out}/${spec.name}-battle.png`,timeout:90000});
    const pixels=await page.evaluate(()=>new Promise((resolve,reject)=>{
     const first=fightModule.metrics().renderedFrames,deadline=performance.now()+20000;
     function sample(){
      if(fightModule.metrics().renderedFrames<=first){
       if(performance.now()>deadline)return reject(Error('No new scene frame'));
       return requestAnimationFrame(sample);
      }
      try{
       const gl=document.getElementById('scene').getContext('webgl2');
       if(!gl||gl.isContextLost())throw Error('Scene graphics context unavailable');
       if(gl.getParameter(gl.FRAMEBUFFER_BINDING)!==null)throw Error('Wrong framebuffer');
       const data=new Uint8Array(gl.drawingBufferWidth*gl.drawingBufferHeight*4);
       gl.readPixels(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight,gl.RGBA,gl.UNSIGNED_BYTE,data);
       if(gl.getError()!==gl.NO_ERROR)throw Error('Pixel readback failed');
       let lit=0,bright=0,n=0;const colors=new Set();
       for(let i=0;i<data.length;i+=64){const r=data[i],g=data[i+1],b=data[i+2],v=(r+g+b)/3;if(v>12)lit++;if(v>32)bright++;colors.add([r>>4,g>>4,b>>4].join(','));n++;}
       resolve({lit:lit/n,bright:bright/n,colors:colors.size});
      }catch(e){reject(e);}
     }
     requestAnimationFrame(sample);
    }));
    assert.ok(pixels.lit>.15&&pixels.bright>.03&&pixels.colors>32,'actual scene pixels, not DOM labels');
    const moves=await page.evaluate(()=>fightModule.metrics().history.filter(h=>h.type==='move').length);
    await tap(page.locator('[data-action=move]'));
    await tap(page.locator('#choices [data-cell]').first());
    await tap(page.locator('#commit-preview'));await idle();
    assert.equal(await page.evaluate(()=>fightModule.metrics().history.filter(h=>h.type==='move').length),moves+1,'UI confirms and commits a move');
    const round=await page.locator('#round').textContent();
    await tap(page.locator('#end'));await idle();
    assert.notEqual(await page.locator('#round').textContent(),round,'enemy turn returns to the next player round');
    await tap(page.locator('#help'));
    const about=page.locator('#help-dialog details').filter({has:page.locator('summary', {hasText:'About this build / test fixtures'})});
    assert.match(await about.locator('p').textContent(),/^C\.18 —/);
    await tap(page.getByRole('button',{name:'Retreat with standing crew',exact:true}));
    assert.equal(await page.locator('dialog[open]').count(),1);
    await tap(page.locator('#confirm-retreat'));await idle();
    await page.locator('#crew-next').waitFor({state:'visible',timeout:60000});
    await page.screenshot({path:`${out}/${spec.name}-aftermath.png`,timeout:90000});
    await tap(page.locator('#crew-next'));await idle();
    assert.ok(await page.locator('#crew-deploy').isVisible(),'aftermath returns to preparation');
    assert.deepEqual(errors,[],'no JavaScript page errors along the actual route');
    results.push({view:spec.name,entry:entry.href,build:'C.18',pixels,loop:'Hub → prepare → deploy → confirmed move → next round → retreat → aftermath → prepare',errors});
    fs.writeFileSync(`${out}/results.json`,JSON.stringify(results,null,2));
    console.log(JSON.stringify(results.at(-1)));
   }catch(e){
    fs.writeFileSync(`${out}/${spec.name}-failure.json`,JSON.stringify({url:page.url(),message:e.message,errors},null,2));
    await page.screenshot({path:`${out}/${spec.name}-failure.png`,timeout:30000}).catch(()=>{});
    throw e;
   }finally{await context.close();}
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
