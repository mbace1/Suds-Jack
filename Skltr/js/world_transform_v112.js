import * as THREE from 'three';

// SKLTR v111-v112 — arena-to-arena transformation becomes a silhouette change,
// not just a palette swap. These mega-shapes stay outside the combat core; hero
// architecture_v108 owns the gameplay solids.
let scene=null,root=null,state='wire',phase=1;
const PAL={wire:[0x9cefff,0x07131b],brutal:[0x2a241e,0xb9aa92],bio:[0x75ffe6,0x31134f],physical:[0xe8e3d8,0x56616a],kill:[0xff3c2e,0x310204]};
function worldFor(n=''){if(n.includes('TORTOISE'))return'brutal';if(n.includes('WASP'))return'bio';if(n.includes('MACHINE'))return'physical';if(n.includes('KILL')||n.includes('LAST'))return'kill';return'wire'}
function mat(c,wire=false,op=.42){return wire?new THREE.MeshBasicMaterial({color:c,wireframe:true,transparent:true,opacity:op,side:THREE.DoubleSide}):new THREE.MeshStandardMaterial({color:c,roughness:.8,metalness:.1,transparent:true,opacity:op,side:THREE.DoubleSide})}
function add(g,geo,c,pos=[0,0,0],rot=[0,0,0],wire=false,op=.42){const m=new THREE.Mesh(geo,mat(c,wire,op));m.position.set(...pos);m.rotation.set(...rot);g.add(m);return m}
function build(k){if(!scene)return;const old=root,[a,b]=PAL[k];root=new THREE.Group();root.name='SKLTR_V112_WORLD_TRANSFORM';scene.add(root);
 if(k==='wire'){for(const r of[62,78,96])add(root,new THREE.TorusGeometry(r,.18,5,80),a,[0,14,0],[Math.PI/2,r*.004,0],true,.28);for(const x of[-55,55])add(root,new THREE.BoxGeometry(2,42,2),a,[x,21,-20],[],true,.32)}
 else if(k==='brutal'){add(root,new THREE.BoxGeometry(150,7,26),b,[0,42,-54],[0,0,.05],false,.28);add(root,new THREE.BoxGeometry(36,58,22),a,[-60,29,32],[0,.12,0],false,.34);add(root,new THREE.BoxGeometry(28,45,30),a,[58,22,-26],[0,-.08,0],false,.34)}
 else if(k==='bio'){for(let i=0;i<7;i++){const q=add(root,new THREE.TorusGeometry(38+i*5,1.2,7,64,Math.PI*1.15),i%2?a:b,[0,13+i*2,0],[Math.PI/2,i*.38,i*.17],true,.30);q.userData.spin=(i%2?1:-1)*.0008}add(root,new THREE.IcosahedronGeometry(19,1),b,[0,52,-62],[0,0,0],true,.25)}
 else if(k==='physical'){for(const x of[-62,-32,32,62]){add(root,new THREE.BoxGeometry(5,48,5),b,[x,24,-48],[],false,.30);add(root,new THREE.BoxGeometry(30,4,4),a,[x+(x<0?12:-12),44,-48],[],false,.28)}for(const z of[-58,58])add(root,new THREE.CylinderGeometry(11,13,34,12),b,[52,17,z],[],false,.25)}
 else{for(let i=0;i<11;i++){const ang=i/11*Math.PI*2,q=add(root,new THREE.ConeGeometry(4,42,4),a,[Math.cos(ang)*74,24,Math.sin(ang)*74],[0,-ang,(i%2?1:-1)*.22],false,.36);q.userData.pulse=i*.7}add(root,new THREE.TorusGeometry(58,.9,6,72),a,[0,18,0],[Math.PI/2,0,0],true,.42)}
 root.scale.set(1,.02,1);root.userData.old=old;phase=0;state=k;
}
function tick(){if(root&&phase<1){phase=Math.min(1,phase+.018);const e=1-Math.pow(1-phase,3);root.scale.y=.02+.98*e;const old=root.userData.old;if(old){old.scale.multiplyScalar(.996);old.rotation.y+=.006*(1-e);old.traverse(o=>{if(o.material)o.material.opacity=Math.max(0,(o.material.opacity||0)-.018)});if(phase===1){scene.remove(old);root.userData.old=null}}}if(root){root.children.forEach(o=>{if(o.userData.spin)o.rotation.z+=o.userData.spin;if(o.userData.pulse!==undefined)o.scale.setScalar(1+Math.sin(performance.now()*.002+o.userData.pulse)*.035)})}requestAnimationFrame(tick)}
const oldAdd=THREE.Scene.prototype.add;THREE.Scene.prototype.add=function(...o){const out=oldAdd.apply(this,o);if(this.isScene&&!scene){scene=this;queueMicrotask(()=>build(state))}return out};
addEventListener('skltr-world-shift',e=>{const k=e.detail?.to||state;if(k!==state)build(k)});addEventListener('skltr-arena',e=>{const k=worldFor(e.detail?.arena||'');if(k!==state)build(k)});tick();
window._skltrWorldTransform112=()=>({state,phase,objects:root?.children.length||0});
