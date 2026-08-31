import * as THREE from 'three';
import { Enemy } from './enemy.js?v=12';

// SKLTR v53-v56 — finished opening-world composition + signature transformation + enemy integration.
let scene=null,root=null,state='wire',transition=null;
const P={wire:{solid:0x020408,edge:0xa7f5ff,glow:0x2acfff},brutal:{solid:0x777064,edge:0x201b16,glow:0xe0c89a},bio:{solid:0x17102b,edge:0x75ffe6,glow:0xff58d6},physical:{solid:0x51565b,edge:0xe9e4d8,glow:0x93d9ff},kill:{solid:0x250404,edge:0xffc1b5,glow:0xff382c}};
function which(n=''){if(n.includes('TORTOISE'))return'brutal';if(n.includes('WASP'))return'bio';if(n.includes('MACHINE'))return'physical';if(n.includes('KILL')||n.includes('LAST'))return'kill';return'wire'}
function material(c,wire=false){return wire?new THREE.MeshBasicMaterial({color:c,wireframe:true,transparent:true,opacity:.72}):new THREE.MeshStandardMaterial({color:c,roughness:.82,metalness:.12})}
function addBox(g,x,z,w,h,d,p,wire=false){const geo=new THREE.BoxGeometry(w,h,d),m=new THREE.Mesh(geo,material(wire?p.edge:p.solid,wire));m.position.set(x,h/2,z);g.add(m);return m}
function line(g,a,b,p){const geo=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...a),new THREE.Vector3(...b)]);g.add(new THREE.Line(geo,new THREE.LineBasicMaterial({color:p.edge,transparent:true,opacity:.55})))}
function hound(g,p){
 // Low, fast approach corridor. Perimeter carries the spectacle; center remains combat-clean.
 for(let z=-58;z<=58;z+=8){line(g,[-18,.03,z],[18,.03,z],p)}
 for(const x of[-30,30])for(let z=-52;z<=52;z+=16){const h=5+((z+52)/16%3)*4;addBox(g,x,z,1.1,h,1.1,p,true);line(g,[x,h,z],[x*.72,.1,z*.82],p)}
 for(let i=0;i<6;i++){const z=-44+i*17;line(g,[-24,.2,z],[24,.2,z],p)}
 // Destination gate gives traversal a strong visual target.
 addBox(g,-13,52,1,12,1,p,true);addBox(g,13,52,1,12,1,p,true);line(g,[-13,12,52],[13,12,52],p);
}
function tortoise(g,p){
 // Two unmistakable lanes separated by a heavy central spine, with emplacement terraces.
 addBox(g,-29,0,9,12,76,p);addBox(g,29,0,9,17,76,p);addBox(g,0,0,8,7,52,p);
 for(const z of[-30,-10,12,32]){addBox(g,-17,z,12,2.2,8,p);addBox(g,17,z,12,3.3,8,p)}
 // Crossings through the spine are visually framed instead of random gaps.
 for(const z of[-24,4,30]){addBox(g,-6,z,4,.55,10,p);addBox(g,6,z,4,.55,10,p)}
 // Distant brutal skyline, asymmetric but sparse.
 addBox(g,-46,34,13,25,18,p);addBox(g,45,-30,15,33,20,p);addBox(g,2,49,38,10,7,p);
}
function wasp(g,p){for(let i=0;i<10;i++){const a=i/10*Math.PI*2,r=38+(i%2)*9,h=12+(i%4)*7;const m=addBox(g,Math.cos(a)*r,Math.sin(a)*r,1.5,h,1.5,p,true);m.rotation.z=Math.sin(a)*.18}for(let y=5;y<=26;y+=7){const t=new THREE.Mesh(new THREE.TorusGeometry(12+y*.65,.09,5,48),new THREE.MeshBasicMaterial({color:p.edge,transparent:true,opacity:.42}));t.position.y=y;t.rotation.x=Math.PI/2;g.add(t)}}
function machine(g,p){addBox(g,-39,0,8,16,76,p);addBox(g,39,0,8,22,76,p);for(let i=0;i<8;i++)addBox(g,-27+i*8,(i%2?30:-30),5,2+i*.65,10,p);addBox(g,0,48,60,11,8,p)}
function kill(g,p){for(let i=0;i<12;i++){const a=i/12*Math.PI*2,r=44;addBox(g,Math.cos(a)*r,Math.sin(a)*r,4,9+(i%4)*5,4,p,true)}}
function build(k,initial=false){if(!scene)return;const old=root;root=new THREE.Group();root.name='SKLTR_V56_FINISHED_WORLD';scene.add(root);const p=P[k];({wire:hound,brutal:tortoise,bio:wasp,physical:machine,kill}[k])(root,p);root.traverse(o=>{if(o.material){o.material.transparent=true;o.material.opacity=initial?o.material.opacity:.02}});root.scale.y=initial?1:.04;transition={old,next:root,t:initial?1:0,key:k};state=k}
function tick(){if(transition&&transition.t<1){transition.t=Math.min(1,transition.t+.018);const t=transition.t,e=1-Math.pow(1-t,3);transition.next.scale.y=.04+.96*e;transition.next.traverse(o=>{if(o.material)o.material.opacity=Math.min(o.material.wireframe?.72:1,.04+e)});if(transition.old){transition.old.scale.y=Math.max(.025,1-e*.97);transition.old.traverse(o=>{if(o.material)o.material.opacity=Math.max(0,1-e)})}if(t===1&&transition.old)scene.remove(transition.old)}requestAnimationFrame(tick)}tick();
const oldAdd=THREE.Scene.prototype.add;THREE.Scene.prototype.add=function(...o){const r=oldAdd.apply(this,o);if(this.isScene&&!scene){scene=this;queueMicrotask(()=>build('wire',true))}return r};
addEventListener('skltr-arena',e=>{const k=which(e.detail?.arena||'');if(k!==state)build(k)});

// v56: same role silhouette, world-specific surface language.
const baseUpdate=Enemy.prototype.update;
Enemy.prototype.update=function(...args){const r=baseUpdate.apply(this,args);const p=P[state];if(this.mesh){this.mesh.traverse(o=>{if(!o.material||o.userData?.v56skip)return;const mats=Array.isArray(o.material)?o.material:[o.material];for(const m of mats){if(!m.color)continue;if(!m.userData)m.userData={};if(m.userData.v56Original===undefined)m.userData.v56Original=m.color.getHex();if(this.boss)continue;if(state==='wire'){m.color.setHex(p.edge);if('wireframe'in m)m.wireframe=true}else if(state==='brutal'){m.color.setHex(this.type==='turret'?0x4a4339:0x756d60);if('wireframe'in m)m.wireframe=false}else if(state==='bio'){m.color.setHex(this.type==='flyer'?0xff58d6:0x75ffe6);if(m.emissive)m.emissive.setHex(0x16082a)}else if(state==='physical'){m.color.setHex(this.type==='chaser'?0x8c969c:0x59636b);if('wireframe'in m)m.wireframe=false}else{m.color.setHex(0xff8b78);if(m.emissive)m.emissive.setHex(0x3a0000)}}})}return r};
window._skltrWorld56=()=>({state,transition:transition?.t??1});
