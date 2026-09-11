import * as T from './vendor/three.module.min.js';
import {Reflector} from './vendor/Reflector.js';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';
import {create,unit,reachable,move,attack,forecast,intent,endTurn,nextRound,covers,N} from './core.js';
const $=id=>document.getElementById(id),canvas=$('scene');
$('home').href=new URL('../#optionc',location.href).href;
let state=create(),busy=false,angle=.48,zoom=1,clock=0;
const world=new T.Scene();world.background=new T.Color('#09121b');
const renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
const camera=new T.OrthographicCamera(-10,10,7,-7,.1,100);
const look=new T.Vector3(.45,.0,-.20),ray=new T.Raycaster(),pointer=new T.Vector2();
world.add(new T.HemisphereLight(0xc2dcec,0x364550,1.8));
world.add(new T.AmbientLight(0xb1c2cc,.35));
const moon=new T.DirectionalLight(0xb6d5f0,2.6);moon.position.set(-6,12,6);moon.castShadow=true;moon.shadow.mapSize.set(2048,2048);Object.assign(moon.shadow.camera,{left:-9,right:9,top:9,bottom:-9,near:.1,far:35});moon.shadow.bias=-.0002;moon.shadow.normalBias=.025;world.add(moon);
const rim=new T.DirectionalLight(0x8bb9c9,.8);rim.position.set(8,6,-9);world.add(rim);
const pitch=1.12,coord=v=>(v-4)*pitch;
const materialCache=new Map();
function mat(color,roughness=.65,metalness=0){const key=`${color}/${roughness}/${metalness}`;if(!materialCache.has(key))materialCache.set(key,new T.MeshStandardMaterial({color,roughness,metalness}));return materialCache.get(key);}
const materials={dark:mat('#172027'),steel:mat('#3b454b',.35,.7),rust:mat('#623b2d',.6,.5),trim:mat('#7c8b8e'),black:mat('#080e13'),amber:new T.MeshBasicMaterial({color:0xffc66b}),teal:mat('#287c7d',.54),orange:mat('#a95628',.65)};
function box(w,h,d,x,y,z,m,parent=world){const geometry=new T.BoxGeometry(w,h,d);if(m.map){const p=geometry.attributes.position,n=geometry.attributes.normal,uv=geometry.attributes.uv;for(let i=0;i<p.count;i++){const nx=Math.abs(n.getX(i)),ny=Math.abs(n.getY(i));uv.setXY(i,(nx>.5?p.getZ(i):p.getX(i))*.55,(ny>.5?p.getZ(i):p.getY(i))*.55);}uv.needsUpdate=true;}const mesh=new T.Mesh(geometry,m);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
function cyl(r,h,x,y,z,m,parent=world){const mesh=new T.Mesh(new T.CylinderGeometry(r,r,h,20),m);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
function line(points,color=0x9deacc,opacity=1){const g=new T.BufferGeometry().setFromPoints(points);return new T.Line(g,new T.LineBasicMaterial({color,transparent:true,opacity}));}
const tiles=[],actors=new Map(),highlights=new T.Group(),arrows=new T.Group(),particles=[];
world.add(highlights,arrows);
const plane=new T.Plane(new T.Vector3(0,1,0),0);
function cameraFit(){const w=innerWidth,h=innerHeight;renderer.setSize(w,h,false);const ratio=w/h;const size=Math.max(w<700?17:10.8,(w<700?15.8:13.8)/ratio)/zoom;camera.left=-size*ratio/2;camera.right=size*ratio/2;camera.top=size/2;camera.bottom=-size/2;camera.updateProjectionMatrix();camera.position.set(Math.sin(angle)*18,15,Math.cos(angle)*18);camera.lookAt(look);}
window.addEventListener('resize',cameraFit);cameraFit();
function canvasLabel(text,w=256,h=128){const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d');ctx.fillStyle='#c1b99c';ctx.font='bold 74px Arial';ctx.textAlign='center';ctx.fillText(text,w/2,95);const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;return new T.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false,opacity:.4});}
function vegetation(x,z){const g=new T.Group();g.position.set(x,0,z);world.add(g);for(let i=0;i<7;i++){const a=i*2.4,height=.11+(i%3)*.065;const stem=box(.018,height,.018,Math.sin(a)*.1,height/2,Math.cos(a)*.1,mat(i%2?'#494a27':'#666047'),g);stem.rotation.z=Math.sin(a)*.4;for(let j=1;j<3;j++){const leaf=box(.085,.009,.03,Math.sin(a)*.1+((j%2)-.5)*.08,height*j/3,Math.cos(a)*.1,mat('#716e35'),g);leaf.rotation.z=.5;}}}
async function build(){
 const tex=await new T.TextureLoader().loadAsync('./assets/concrete.webp');tex.colorSpace=T.SRGBColorSpace;tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
 const surface=new T.MeshStandardMaterial({color:0xc4d0d9,map:tex,bumpMap:tex,bumpScale:.025,roughnessMap:tex,roughness:.9,metalness:.08});
 // Convolved area-light environment supplies broad wet highlights; the planar
 // pass above it still reflects the actual moving figures and lamp geometry.
 const studio=new T.Scene();studio.background=new T.Color(.16,.22,.28);
 for(const x of [-4,4]){const card=new T.Mesh(new T.PlaneGeometry(1.7,5),new T.MeshBasicMaterial({color:new T.Color(5.0,2.1,.45),side:T.DoubleSide}));card.position.set(x,4,-3);card.lookAt(0,0,0);studio.add(card);}
 const sky=new T.Mesh(new T.PlaneGeometry(10,6),new T.MeshBasicMaterial({color:new T.Color(.6,.9,1.2),side:T.DoubleSide}));sky.position.set(-5,7,5);sky.lookAt(0,0,0);studio.add(sky);
 const pmrem=new T.PMREMGenerator(renderer),environment=pmrem.fromScene(studio,.025);surface.envMap=environment.texture;surface.envMapIntensity=.65;surface.metalness=.3;surface.roughness=.8;surface.bumpScale=.095;pmrem.dispose();
 const wallmat=surface.clone();wallmat.color.setHex(0xffffff);wallmat.roughness=1;wallmat.metalness=.02;
 wallmat.envMapIntensity=.10;
 // Keep concrete's microstructure without multiplying the already-dark scan twice.
 wallmat.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\n diffuseColor.rgb *= 1.8;');};
 box(10.4,.65,10.4,0,-.36,0,wallmat);
 for(let z=0;z<N;z++)for(let x=0;x<N;x++){const tile=box(pitch-.018,.055,pitch-.018,coord(x),-.028,coord(z),surface);tile.userData={tile:true,x,z};tiles.push(tile);}
 for(let i=0;i<9;i++){box(pitch-.014,1.65,.18,coord(i),.825,-5.12,wallmat);box(pitch-.014,.10,.27,coord(i),1.68,-5.12,wallmat);}
 box(.18,1.65,1.9,-5.12,.825,-4.25,wallmat);
 // Back wall shutter, electrical cabinet, drainpipes and wall-mounted lamps.
 box(1.8,1.45,.10,.2,.73,-4.99,materials.black);
 for(let j=0;j<20;j++)box(1.77,.039,.065,.2,.08+j*.069,-4.90,materials.steel);
 for(const x of [-.75,1.15])box(.075,1.52,.1,x,.75,-4.89,materials.dark);
 box(.65,.88,.32,-2.85,.46,-4.80,materials.steel);box(.07,.2,.04,-2.65,.57,-4.61,materials.black);
 for(const x of [-4.65,-1.45,2.2]){cyl(.065,1.85,x,.91,-4.91,materials.steel);for(const y of [.3,1.2])cyl(.085,.055,x,y,-4.91,materials.dark);}
 for(const x of [-3.9,3.5]){
  box(.07,.5,.09,x,1.4,-4.90,materials.dark);box(.25,.18,.22,x,1.61,-4.75,materials.amber);box(.32,.055,.30,x,1.74,-4.75,materials.dark);
  const light=new T.PointLight(0xffa94d,16,7,2);light.position.set(x,1.48,-4.35);world.add(light);
 }
 const label=new T.Mesh(new T.PlaneGeometry(.65,.35),canvasLabel('A3'));label.position.set(-4.25,1.15,-5.005);world.add(label);
 // Paired cells form solid cover. End caps and feet make real volumes, not billboards.
 for(let i=0;i<covers.length;i+=2){const a=covers[i],b=covers[i+1],x=(coord(a[0])+coord(b[0]))/2,z=coord(a[1]);
  const profile=new T.Shape();profile.moveTo(-1.08,.03);profile.lineTo(-1.01,.70);profile.lineTo(-.86,.74);profile.lineTo(-.79,.71);profile.lineTo(-.71,.745);profile.lineTo(.64,.745);profile.lineTo(.70,.70);profile.lineTo(.83,.73);profile.lineTo(1.02,.70);profile.lineTo(1.09,.03);profile.closePath();
  const geometry=new T.ExtrudeGeometry(profile,{depth:.32,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.035,bevelThickness:.025});const m=new T.Mesh(geometry,wallmat);m.position.set(x,0,z-.16);m.castShadow=m.receiveShadow=true;world.add(m);
  for(const dx of [-.83,.83])box(.2,.12,.57,x+dx,.06,z,wallmat);
  for(let chip=0;chip<4;chip++){const rubble=box(.08,.045,.07,x-.8+chip*.5,.025,z+.27+(chip%2)*.1,wallmat);rubble.rotation.y=chip;}
 }
 for(const [x,z] of [[-4.4,1.0],[-4.1,.78],[4.55,2.1]]){cyl(.20,.58,x,.3,z,materials.rust);for(const y of [.12,.49,.59])cyl(.208,.028,x,y,z,materials.dark);}
 for(const [x,z] of [[3.0,-4.6],[3.55,-4.5]]){box(.52,.48,.5,x,.25,z,mat('#645441'));for(let j=0;j<4;j++)box(.10,.49,.02,x-.20+j*.13,.26,z+.26,mat('#968068'));}
 // Drainage grate and subtle puddle patches receive live specular light.
 box(.65,.02,.45,4.45,.01,3.25,materials.black);for(let i=0;i<10;i++)box(.035,.015,.40,4.17+i*.06,.025,3.25,materials.steel);
 const wetShader={uniforms:T.UniformsUtils.clone(Reflector.ReflectorShader.uniforms),vertexShader:Reflector.ReflectorShader.vertexShader.replace('varying vec4 vUv;','varying vec4 vUv; varying vec2 vSurface;').replace('vUv = textureMatrix','vSurface = uv; vUv = textureMatrix'),fragmentShader:`uniform sampler2D tDiffuse;uniform sampler2D surfaceMap;varying vec4 vUv;varying vec2 vSurface;void main(){float n=texture2D(surfaceMap,vSurface*5.0).r;vec4 uv=vUv;uv.xy+=vec2(n-.35)*.009*uv.w;vec3 reflection=texture2DProj(tDiffuse,uv).rgb;float wetness=smoothstep(.15,.42,n);gl_FragColor=vec4(reflection,.12+wetness*.25);#include <tonemapping_fragment>\n#include <colorspace_fragment>}`.replace(';#include',';\n#include')};
 wetShader.uniforms.surfaceMap={value:tex};
 const mirror=new Reflector(new T.PlaneGeometry(10.07,10.07),{textureWidth:512,textureHeight:512,multisample:0,shader:wetShader});mirror.rotation.x=-Math.PI/2;mirror.position.y=.007;mirror.material.transparent=true;mirror.material.depthWrite=false;world.add(mirror);
 const reflect=mirror.onBeforeRender;let reflectionAt=0;mirror.onBeforeRender=function(...args){if(performance.now()-reflectionAt<50)return;reflectionAt=performance.now();reflect.apply(this,args);};
 for(let i=0;i<15;i++)vegetation(-4.8+i*.67,-4.76+(i%3)*.11);
 // Submit stationary geometry by shared material. The original hundreds of
 // tiny grass and wall meshes made software rendering stall enemy turns.
 world.updateMatrixWorld(true);const batches=new Map();
 world.traverse(o=>{if(o.isMesh&&o!==mirror&&!Array.isArray(o.material)){const key=o.material;const list=batches.get(key)||[];list.push(o);batches.set(key,list);}});
 for(const [material,meshes] of batches){if(meshes.length<2)continue;const copies=meshes.map(o=>(o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone()).applyMatrix4(o.matrixWorld));const geometry=mergeGeometries(copies,false);for(const g of copies)g.dispose();if(!geometry)continue;const merged=new T.Mesh(geometry,material);merged.castShadow=meshes.some(o=>o.castShadow);merged.receiveShadow=meshes.some(o=>o.receiveShadow);for(const o of meshes){o.removeFromParent();o.geometry.dispose();}world.add(merged);}
 const data=await fetch('./assets/training-figure.json').then(r=>r.json());
 for(const u of state.units){const group=new T.Group();world.add(group);const parts={};
  for(const p of data){const geom=new T.BufferGeometry();geom.setAttribute('position',new T.Float32BufferAttribute(p.vertices,3));geom.setAttribute('normal',new T.Float32BufferAttribute(p.normals,3));
   const material=/jacket|Arm|Forearm|pack|collar/.test(p.name)?(u.team?materials.orange:materials.teal):/head|Hand/.test(p.name)?mat('#77513b'):/helmet/.test(p.name)?mat(u.team?'#9e5b34':'#49797b',.4,.2):/visor/.test(p.name)?materials.black:materials.dark;
   const mesh=new T.Mesh(geom,material);mesh.position.fromArray(p.position);mesh.userData.rest=mesh.position.clone();mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);parts[p.name]=mesh;
  }
  group.position.set(coord(u.x),0,coord(u.z));group.rotation.y=u.team?0:Math.PI;group.userData.id=u.id;group.scale.setScalar(.85);actors.set(u.id,{group,parts,flash:0});
 }
 $('loading').hidden=true;refresh();previous=performance.now();animate();
}
function clear(group){for(const m of [...group.children]){group.remove(m);m.geometry?.dispose();m.material?.dispose();}}
function tileOutline(x,z,color,fill=false){const px=coord(x),pz=coord(z),r=.53;const outline=line([new T.Vector3(px-r,.02,pz-r),new T.Vector3(px+r,.02,pz-r),new T.Vector3(px+r,.02,pz+r),new T.Vector3(px-r,.02,pz+r),new T.Vector3(px-r,.02,pz-r)],color,.65);highlights.add(outline);if(fill){const m=new T.Mesh(new T.PlaneGeometry(1.04,1.04),new T.MeshBasicMaterial({color,transparent:true,opacity:.08,depthWrite:false}));m.rotation.x=-Math.PI/2;m.position.set(px,.012,pz);highlights.add(m);}}
const badges=new Map();
for(const u of state.units){const el=document.createElement('div');el.className='actor-label';el.dataset.team=u.team;document.body.append(el);badges.set(u.id,el);}
function refresh(){
 for(const u of state.units){const el=badges.get(u.id),selected=unit(state,state.selected),f=selected?forecast(selected,u):null;el.hidden=u.hp<=0;el.textContent=`${u.name} · ${u.hp}/${u.max}${u.team&&f&&!selected.acted?' · −'+f.damage:''}`;el.classList.toggle('targetable',!!(u.team&&f&&!selected.acted&&!busy));}
 clear(highlights);clear(arrows);const selected=unit(state,state.selected);
 if(selected?.hp>0){const ring=new T.Mesh(new T.RingGeometry(.32,.36,48),new T.MeshBasicMaterial({color:0xa3ffcf,side:T.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.set(coord(selected.x),.025,coord(selected.z));highlights.add(ring);
  if(!busy&&!selected.moved&&!state.result)for(const p of reachable(state,selected))tileOutline(p.x,p.z,0x99e7c7,true);
 }
 if(!busy&&!state.result)for(const enemy of state.units.filter(u=>u.team&&u.hp>0)){const plan=intent(state,enemy);if(!plan)continue;const target=unit(state,plan.target),start=new T.Vector3(coord(enemy.x),.06,coord(enemy.z)),end=new T.Vector3(coord(target.x),.06,coord(target.z)),direction=end.clone().sub(start);const len=Math.min(direction.length()-.3,1.6);direction.normalize();if(len>0){const a=new T.ArrowHelper(direction,start,len,0xef9b4b,.22,.14);arrows.add(a);}}
 const focus=document.activeElement?.dataset.id; $('crew').replaceChildren();
 for(const u of state.units.filter(v=>!v.team)){const btn=document.createElement('button');btn.className='unit';btn.dataset.id=u.id;btn.setAttribute('aria-pressed',String(u.id===state.selected));btn.disabled=busy||u.hp<=0||!!state.result;
  btn.innerHTML=`<strong>${u.name.toUpperCase()}</strong><p>HP ${u.hp} / ${u.max}</p><div class="track"><div class="fill" style="width:${u.hp/u.max*100}%"></div></div><span>${u.hp<=0?'DOWN':`MOVE ${u.moved?'USED':u.speed} · ACT ${u.acted?'USED':'1'}`}</span>`;
  activate(btn,()=>select(u.id));$('crew').append(btn);
 }
 $('targets').replaceChildren();if(selected&&!selected.acted&&!busy&&!state.result)for(const e of state.units.filter(v=>v.team&&v.hp>0)){const f=forecast(selected,e);if(!f)continue;const btn=document.createElement('button');btn.dataset.target=e.id;btn.textContent=`${f.melee?'Strike':'Shoot'} ${e.name} · ${f.damage} dmg${f.cover?' · cover':''}`;activate(btn,()=>shoot(e.id));$('targets').append(btn);}
 $('end').disabled=busy||!!state.result;$('round').textContent=`ROUND ${String(state.round).padStart(2,'0')}`;$('turn').textContent=state.result?'COMPLETE':state.turn==='enemy'?'ENEMY TURN':'YOUR TURN';
 if(state.result&&!busy){$('result').hidden=false;$('resultTitle').textContent=state.result==='victory'?'YARD SECURED':'CREW DOWN';$('resultText').textContent=state.result==='victory'?`Completed in ${state.round} rounds. The test is ready to replay.`:'Try moving into cover before ending your turn.';}
 if(focus)document.querySelector(`[data-id="${focus}"]`)?.focus({preventScroll:true});
}
function activate(el,fn){let last=-1000;for(const type of ['pointerup','touchend','click'])el.addEventListener(type,e=>{if(el.disabled||e.type==='click'&&e.detail!==0)return;e.preventDefault();if(performance.now()-last<280)return;last=performance.now();fn();});}
function select(id){if(busy||state.result)return;state.selected=id;refresh();$('hint').textContent=`${unit(state,id).name}: tap a mint tile to move, or choose an attack.`;}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function showMove(event){if(!event)return;const a=actors.get(event.id);const route=line([a.group.position.clone().setY(.07),...event.path.map(p=>new T.Vector3(coord(p.x),.07,coord(p.z)))],0xb9ffdb);world.add(route);for(const step of event.path){const from=a.group.position.clone(),to=new T.Vector3(coord(step.x),0,coord(step.z));a.group.rotation.y=Math.atan2(to.x-from.x,to.z-from.z);const start=performance.now();await new Promise(resolve=>{function stepFrame(now){const t=Math.min(1,(now-start)/150);a.group.position.lerpVectors(from,to,t);a.group.position.y=Math.sin(t*Math.PI)*.035;a.parts.leftLeg.rotation.x=Math.sin(t*Math.PI*2)*.35;a.parts.rightLeg.rotation.x=-Math.sin(t*Math.PI*2)*.35;if(t<1)requestAnimationFrame(stepFrame);else resolve();}requestAnimationFrame(stepFrame);});}a.parts.leftLeg.rotation.x=a.parts.rightLeg.rotation.x=0;world.remove(route);route.geometry.dispose();route.material.dispose();}
async function showShot(e){if(!e)return;const a=actors.get(e.id),b=actors.get(e.target),from=a.group.position.clone().add(new T.Vector3(0,.58,0)),to=b.group.position.clone().add(new T.Vector3(0,.52,0));a.group.rotation.y=Math.atan2(to.x-from.x,to.z-from.z);
 const tracer=line([from,to],0xffda9c);if(!e.melee)world.add(tracer);a.group.position.add(new T.Vector3(0,0,0));b.flash=.3;
 for(let i=0;i<9;i++){const dot=new T.Mesh(new T.SphereGeometry(.018,4,3),new T.MeshBasicMaterial({color:i%2?0xffc47e:0xccd1c8}));dot.position.copy(to);world.add(dot);particles.push({mesh:dot,v:new T.Vector3(Math.sin(i*7)*1.4,.8+i*.06,Math.cos(i*7)*1.4),life:.32});}
 $('hint').textContent=`${unit(state,e.id).name} ${e.melee?'strikes':'shoots'} ${unit(state,e.target).name}: ${e.damage} damage${e.down?' · down':''}.`;
 await sleep(130);world.remove(tracer);tracer.geometry.dispose();tracer.material.dispose();
 if(e.down){b.group.rotation.z=-Math.PI/2;b.group.position.y=.14;}await sleep(120);
}
async function shoot(id){if(busy||state.result)return;const e=attack(state,state.selected,id);if(!e)return;busy=true;refresh();await showShot(e);busy=false;refresh();}
async function walk(x,z){if(busy||state.result)return;const e=move(state,state.selected,x,z);if(!e){$('hint').textContent='Choose an unoccupied highlighted tile.';return;}busy=true;refresh();await showMove(e);busy=false;refresh();$('hint').textContent='Position set. Choose an attack, or keep your action.';}
async function enemyTurn(){if(busy||!endTurn(state))return;busy=true;refresh();for(const e of state.units.filter(u=>u.team&&u.hp>0)){if(state.result)break;const p=intent(state,e);if(!p)continue;await showMove(move(state,e.id,p.to.x,p.to.z));await showShot(attack(state,e.id,p.target));await sleep(160);}nextRound(state);busy=false;refresh();}
activate($('end'),enemyTurn);activate($('restart'),()=>{state=create();busy=false;$('result').hidden=true;for(const u of state.units){const a=actors.get(u.id);a.group.position.set(coord(u.x),0,coord(u.z));a.group.rotation.set(0,u.team?0:Math.PI,0);a.flash=0;}refresh();$('hint').textContent='Select a unit. Move. Take a shot.';});
activate($('rotate'),()=>{angle+=Math.PI/2;cameraFit();});activate($('out'),()=>{zoom=Math.max(.65,zoom-.15);cameraFit();});activate($('in'),()=>{zoom=Math.min(1.8,zoom+.15);cameraFit();});
let down=null,lastTap=0;canvas.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY,angle};canvas.setPointerCapture(e.pointerId);});canvas.addEventListener('pointermove',e=>{if(down&&Math.hypot(e.clientX-down.x,e.clientY-down.y)>10){angle=down.angle+(e.clientX-down.x)*.006;cameraFit();}});canvas.addEventListener('pointerup',e=>{if(!down)return;const click=Math.hypot(e.clientX-down.x,e.clientY-down.y)<10;down=null;lastTap=performance.now();if(click){boardTap(e.clientX,e.clientY);}});canvas.addEventListener('pointercancel',()=>down=null);
canvas.addEventListener('touchend',e=>{if(performance.now()-lastTap<300)return;const t=e.changedTouches[0];if(t){e.preventDefault();boardTap(t.clientX,t.clientY);}},{passive:false});
canvas.addEventListener('wheel',e=>{e.preventDefault();zoom=T.MathUtils.clamp(zoom-e.deltaY*.001,.65,1.8);cameraFit();},{passive:false});
function boardTap(x,y){if(busy||state.result)return;pointer.set(x/innerWidth*2-1,-y/innerHeight*2+1);ray.setFromCamera(pointer,camera);const hit=ray.intersectObjects([...actors.values()].map(a=>a.group),true).find(h=>{let p=h.object;while(p&&!p.userData.id)p=p.parent;return p&&unit(state,p.userData.id).hp>0;});
 if(hit){let p=hit.object;while(!p.userData.id)p=p.parent;const u=unit(state,p.userData.id);if(!u.team)select(u.id);else shoot(u.id);return;}
 const at=new T.Vector3();if(ray.ray.intersectPlane(plane,at))walk(Math.round(at.x/pitch+4),Math.round(at.z/pitch+4));}
window.addEventListener('keydown',e=>{if(e.target.closest('button'))return;if(e.key==='1')select('scout');if(e.key==='2')select('anchor');if(e.key==='Enter'){e.preventDefault();enemyTurn();}});
let previous=performance.now(),frames=0,elapsed=0,fps=0;
function animate(now=performance.now()){requestAnimationFrame(animate);const realDt=(now-previous)/1000,dt=Math.min(.05,realDt);previous=now;clock+=dt;frames++;elapsed+=realDt;if(elapsed>=1){fps=Math.round(frames/elapsed);$('perf').textContent=`C.02 · ${fps} FPS · ${renderer.info.render.calls} draws`;frames=0;elapsed=0;}
 for(const u of state.units){const a=actors.get(u.id);if(!a)continue;if(u.hp>0){a.parts.jacket.scale.y=1+Math.sin(clock*2+u.x)*.008;a.flash=Math.max(0,a.flash-dt);a.parts.jacket.rotation.z=Math.sin(a.flash*45)*a.flash*.6;}}
 for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.life-=dt;p.v.y-=dt*4;p.mesh.position.addScaledVector(p.v,dt);if(p.life<=0){world.remove(p.mesh);p.mesh.geometry.dispose();p.mesh.material.dispose();particles.splice(i,1);}}
 for(const u of state.units){const a=actors.get(u.id);if(!a||u.hp<=0)continue;const p=a.group.position.clone().add(new T.Vector3(0,1.15,0)).project(camera);badges.get(u.id).style.transform=`translate(-50%,-100%) translate(${(p.x+1)*innerWidth/2}px,${(1-p.y)*innerHeight/2}px)`;}
 renderer.render(world,camera);
}
window.__c={snapshot:()=>structuredClone(state),metrics:()=>({fps,draws:renderer.info.render.calls,geometries:renderer.info.memory.geometries}),screen:(x,z)=>{const v=new T.Vector3(coord(x),.03,coord(z)).project(camera);return {x:(v.x+1)*innerWidth/2,y:(1-v.y)*innerHeight/2};}};
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();$('loading').hidden=false;$('loading').textContent='Graphics interrupted. Reload to restore the yard.';});
build().catch(e=>{$('loading').hidden=false;$('loading').textContent='Unable to load the yard: '+e.message;console.error(e);});
