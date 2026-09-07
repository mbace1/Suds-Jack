const games=[
 {id:'flashprince',name:'Flash Prince',path:'../flashprince/',canvas:'#screen',keys:['ArrowRight','ArrowUp','KeyH'],source:'../flashprince/js/movement-hero.js',must:['runStart','gatherRun','ledgeCatch','lowMantle']},
 {id:'tinyhawk',name:'Tiny Hawk',path:'../tinyhawk/',canvas:'canvas',keys:['KeyW','Space','ArrowRight'],source:'../tinyhawk/js/skater.js',must:['grounded','grind','manual','ollie']},
 {id:'hyperdagger',name:'Hyper Dagger',path:'../hyperdagger/',canvas:'canvas',keys:['KeyW','Space','Mouse0'],source:'../hyperdagger/js/main.js',must:['requestAnimationFrame','gamepad','pointer']},
];
const report=document.querySelector('#report'),frame=document.querySelector('#game');
const out=(cls,msg)=>{const d=document.createElement('div');d.className=`row ${cls}`;d.textContent=msg;report.appendChild(d);};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function staticCheck(g){
 try{const t=await fetch(g.source,{cache:'no-store'}).then(r=>{if(!r.ok)throw Error(r.status);return r.text();});
  const missing=g.must.filter(x=>!t.includes(x));
  if(missing.length) out('warn',`${g.name}: source contract missing ${missing.join(', ')}`); else out('pass',`${g.name}: source contract present`);
 }catch(e){out('fail',`${g.name}: source fetch failed (${e.message})`);}
}
async function runtimeCheck(g){
 frame.src=g.path+`?playtest=${Date.now()}`;
 await new Promise(resolve=>{const timer=setTimeout(resolve,5000);frame.onload=()=>{clearTimeout(timer);resolve();};});
 await wait(1200);
 let doc,win; try{doc=frame.contentDocument;win=frame.contentWindow;}catch{out('fail',`${g.name}: iframe not same-origin`);return;}
 const canvas=doc?.querySelector(g.canvas);
 if(!canvas){out('fail',`${g.name}: no render canvas`);return;} out('pass',`${g.name}: canvas ${canvas.width||canvas.clientWidth}×${canvas.height||canvas.clientHeight}`);
 let errors=0; const old=win.onerror; win.onerror=()=>{errors++;return false;};
 for(const code of g.keys.filter(k=>k!=='Mouse0')){
  win.dispatchEvent(new KeyboardEvent('keydown',{code,key:code,bubbles:true})); await wait(90); win.dispatchEvent(new KeyboardEvent('keyup',{code,key:code,bubbles:true}));
 }
 try{canvas.dispatchEvent(new PointerEvent('pointerdown',{button:0,clientX:canvas.clientWidth*0.65,clientY:canvas.clientHeight*0.5,bubbles:true}));canvas.dispatchEvent(new PointerEvent('pointerup',{button:0,bubbles:true}));}catch{}
 const before=performance.now(); let rafs=0; await new Promise(res=>{const end=performance.now()+500;function tick(){rafs++;if(performance.now()<end)requestAnimationFrame(tick);else res();}requestAnimationFrame(tick);});
 const hz=Math.round(rafs/((performance.now()-before)/1000));
 out(errors?'fail':'pass',`${g.name}: input smoke ${errors?'raised '+errors+' errors':'clean'} · parent RAF ~${hz}Hz`); win.onerror=old;
}
(async()=>{out('warn','Scope locked: no Eeri, no Toko Drop.');for(const g of games){await staticCheck(g);await runtimeCheck(g);}out('pass','Three-game pass complete.');})();
