const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
fs.mkdirSync('option-c/.dream-loop',{recursive:true});
(async()=>{const core=await import('./core.js');
 const s=core.create();assert.equal(core.move(s,'e1',1,1),null);assert.equal(core.attack(s,'scout','anchor'),null);assert.equal(core.move(s,'scout',3,5),null);
 assert(core.move(s,'scout',2,5));assert.equal(core.move(s,'scout',2,4),null);assert(core.endTurn(s));assert.equal(core.endTurn(s),false);core.nextRound(s);assert.equal(s.round,2);assert(!core.unit(s,'scout').moved);
 const b=await chromium.launch({headless:true,...(process.env.BROWSER_PATH?{executablePath:process.env.BROWSER_PATH}:process.platform==='win32'?{executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}:{})});
 try {for(const touch of [false,true]){
  const p=await b.newPage({viewport:touch?{width:390,height:844}:{width:1600,height:1000},hasTouch:touch,isMobile:touch});const errors=[];p.on('pageerror',e=>errors.push(e.message));
  const click=async sel=>{const el=p.locator(sel).first();await el[touch?'tap':'click']();};
  await p.goto(process.env.C_URL||'http://127.0.0.1:8766/option-c/');await p.locator('#loading').waitFor({state:'hidden'});
  for(let turn=0;turn<15;turn++){
   for(const id of ['scout','anchor']){
    let s=await p.evaluate(()=>__c.snapshot());if(s.result)break;const u=core.unit(s,id);if(u.hp<=0)continue;await click(`[data-id="${id}"]`);
    let best=null;for(const pos of [{x:u.x,z:u.z,cost:0},...core.reachable(s,u)])for(const e of s.units.filter(v=>v.team&&v.hp>0)){
     const f=core.forecast({...u,...pos},e);const threat=s.units.filter(v=>v.team&&v.hp>0).filter(v=>core.dist(v,pos)<5).length;
     const score=(f?f.damage*10+(f.damage>=e.hp?60:0):0)-core.dist(pos,e)*2-pos.cost*.1-threat;
     if(!best||score>best.score)best={pos,e,f,score};
    }
    if(best?.pos.cost){const pt=await p.evaluate(({x,z})=>__c.screen(x,z),best.pos);await p[touch?'touchscreen':'mouse'][touch?'tap':'click'](pt.x,pt.y);await p.waitForFunction(()=>!document.querySelector('#end').disabled);s=await p.evaluate(()=>__c.snapshot());assert.equal(core.unit(s,id).x,best.pos.x,'board move x');assert.equal(core.unit(s,id).z,best.pos.z,'board move z');}
    s=await p.evaluate(()=>__c.snapshot());const actor=core.unit(s,id),targets=s.units.filter(v=>v.team&&v.hp>0).map(v=>({v,f:core.forecast(actor,v)})).filter(v=>v.f).sort((a,b)=>(b.f.damage>=b.v.hp)-(a.f.damage>=a.v.hp)||b.f.damage-a.f.damage);
    if(targets.length){await click(`[data-target="${targets[0].v.id}"]`);await p.waitForFunction(()=>!document.querySelector('#end').disabled||__c.snapshot().result);}
   }
   const s=await p.evaluate(()=>__c.snapshot());if(s.result)break;await click('#end');await p.waitForFunction(()=>__c.snapshot().turn==='player'||__c.snapshot().result,{},{timeout:20000});
  }
  const final=await p.evaluate(()=>__c.snapshot());assert.equal(final.result,'victory');assert(final.log.some(e=>e.type==='move'));assert(final.log.some(e=>e.type==='attack'));await p.screenshot({path:`option-c/.dream-loop/victory-${touch?'touch':'mouse'}.png`});
  await click('#restart');assert.equal((await p.evaluate(()=>__c.snapshot())).round,1);
  for(let i=0;i<25;i++){if((await p.evaluate(()=>__c.snapshot())).result)break;await click('#end');await p.waitForFunction(()=>__c.snapshot().turn==='player'||__c.snapshot().result,{},{timeout:20000});}
  assert.equal((await p.evaluate(()=>__c.snapshot())).result,'defeat');await click('#restart');assert.equal((await p.evaluate(()=>__c.snapshot())).result,null);assert.deepEqual(errors,[]);
  console.log('PASS',touch?'touch':'mouse','real board move, attack, enemy turn, victory, defeat, restart',final.round,'rounds');await p.close();
 }}finally{await b.close();}
})().catch(e=>{console.error(e);process.exit(1)});
