import * as THREE from 'three';

// SKLTR v57-v60 — finish WASP LIFT + MACHINE YARD and connect all world states.
let scene=null,root=null,state='wire',phase=1,from='wire',to='wire';
const S={
 wire:{bg:0x000000,fog:0x000000,solid:0x020408,edge:0xa7f5ff,accent:0x2acfff},
 brutal:{bg:0xd1c5ad,fog:0xc9bfa9,solid:0x777064,edge:0x201b16,accent:0xe0c89a},
 bio:{bg:0x030013,fog:0x07031a,solid:0x161027,edge:0x75ffe6,accent:0xff58d6},
 physical:{bg:0x22272c,fog:0x2b3035,solid:0x51565b,edge:0xe9e4d8,accent:0x93d9ff},
 kill:{bg:0x080000,fog:0x120000,solid:0x250404,edge:0xffc1b5,accent:0xff382c}
};
function which(n=''){if(n.includes('TORTOISE'))return'brutal';if(n.includes('WASP'))return'bio';if(n.includes('MACHINE'))return'physical';if(n.includes('KILL')||n.includes('LAST'))return'kill';return'wire'}
function mat(c,wire=false,op=1){return wire?new THREE.MeshBasicMaterial({color:c,wireframe:true,transparent:true,opacity:op}):new THREE.MeshStandardMaterial({color:c,roughness:.78,metalness:.16,transparent:true,opacity:op})}
function box(g,x,y,z,w,h,d,p,wire=false){const q=new THREE.BoxGeometry(w,h,d),m=new THREE.Mesh(q,mat(wire?p.edge:p.solid,wire));m.position.set(x,y+h/2,z);g.add(m);return m}
function beam(g,a,b,p,op=.48){const geo=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...a),new THREE.Vector3(...b)]);g.add(new THREE.Line(geo,new THREE.LineBasicMaterial({color:p.edge,transparent:true,opacity:op})))}
function torus(g,x,y,z,r,p,ry=0,rx=Math.PI/2,op=.44){const m=new THREE.Mesh(new THREE.TorusGeometry(r,.1,5,56),new THREE.MeshBasicMaterial({color:p.edge,transparent:true,opacity:op}));m.position.set(x,y,z);m.rotation.set(rx,ry,0);g.add(m);return m}
function wasp(g,p){
 // Clear ground bowl; vertical spectacle lives outside core dodge space.
 for(let i=0;i<12;i++){const a=i/12*Math.PI*2,r=40+(i%3)*5,h=14+(i%4)*7;const m=box(g,Math.cos(a)*r,0,Math.sin(a)*r,1.4,h,1.4,p,true);m.rotation.z=Math.sin(a)*.22;beam(g,[Math.cos(a)*r,h,Math.sin(a)*r],[Math.cos(a)*24,.3,Math.sin(a)*24],p,.34)}
 for(const y of[5,11,18,26])torus(g,0,y,0,14+y*.55,p,y*.03);
 for(const x of[-22,22]){box(g,x,0,32,7,4,10,p);box(g,x,0,-32,7,7,10,p)}
 // vertical lift spine / clear destination
 box(g,0,0,48,3,28,3,p,true);torus(g,0,18,48,8,p,0,Math.PI/2,.7);
}
function machine(g,p){
 // Physical, navigable yard: perimeter walls, loading bays, conveyors, cranes and clear center.
 box(g,-41,0,0,8,14,78,p);box(g,41,0,0,8,21,78,p);box(g,0,0,45,62,11,8,p);box(g,0,0,-45,48,7,8,p);
 for(const x of[-28,-18,-8,8,18,28]){box(g,x,0,-29,7,2.2+(Math.abs(x)%3),11,p);box(g,x,0,29,7,3.2,11,p)}
 // gantries
 for(const z of[-18,8,28]){box(g,-30,0,z,3,10,3,p);box(g,30,0,z,3,10,3,p);box(g,0,9,z,61,2,2,p)}
 // industrial silhouette props
 box(g,-34,0,34,5,30,5,p,true);beam(g,[-34,30,34],[-8,30,34],p,.7);beam(g,[-8,30,34],[-16,19,34],p,.7);
 box(g,34,0,-34,5,24,5,p,true);beam(g,[34,24,-34],[10,24,-34],p,.7);
}
function fallback(g,p,k){if(k==='wire'){for(let z=-56;z<=56;z+=8)beam(g,[-18,.03,z],[18,.03,z],p);for(const x of[-30,30])for(let z=-48;z<=48;z+=16)box(g,x,0,z,1.2,7+(Math.abs(z)%18),1.2,p,true)}else if(k==='brutal'){box(g,-30,0,0,10,14,76,p);box(g,30,0,0,10,20,76,p);box(g,0,0,0,8,7,52,p)}else{for(let i=0;i<12;i++){const a=i/12*Math.PI*2;box(g,Math.cos(a)*44,0,Math.sin(a)*44,4,10+(i%4)*5,4,p,true)}}
function build(k){if(!scene)return;const old=root,p=S[k];root=new THREE.Group();root.name='SKLTR_V60_WORLD';scene.add(root);if(k==='bio')wasp(root,p);else if(k==='physical')machine(root,p);else fallback(root,p,k);root.scale.y=.035;root.traverse(o=>{if(o.material){o.material.transparent=true;o.material.opacity=Math.min(o.material.opacity??1,.03)}});from=state;to=k;state=k;phase=0;root.userData.old=old;scene.background=new THREE.Color(p.bg);scene.fog=new THREE.Fog(p.fog,30,k==='physical'?150:112);dispatchEvent(new CustomEvent('skltr-world-shift',{detail:{from,to}}))}
function tick(){if(root&&phase<1){phase=Math.min(1,phase+.014);const e=1-Math.pow(1-phase,3),old=root.userData.old;root.scale.y=.035+.965*e;root.traverse(o=>{if(o.material)o.material.opacity=Math.max(.03,Math.min(1,e))});if(old){old.scale.y=Math.max(.02,1-e*.98);old.rotation.y+=.0025*(1-e);old.traverse(o=>{if(o.material)o.material.opacity=Math.max(0,1-e)})}if(phase===1&&old){scene.remove(old);root.userData.old=null}}
 if(root&&state==='bio')root.rotation.y+=.00045;requestAnimationFrame(tick)}
const oldAdd=THREE.Scene.prototype.add;THREE.Scene.prototype.add=function(...o){const r=oldAdd.apply(this,o);if(this.isScene&&!scene){scene=this;queueMicrotask(()=>build('wire'))}return r};
addEventListener('skltr-arena',e=>{const k=which(e.detail?.arena||'');if(k!==state)build(k)});tick();
window._skltrWorld60=()=>({state,phase,from,to});
