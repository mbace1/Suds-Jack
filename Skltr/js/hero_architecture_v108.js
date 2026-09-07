import * as THREE from 'three';

// SKLTR v105-v132 — authored hero architecture that is also gameplay geometry.
// three-bvh-csg currently requires Three >=0.179 while SKLTR runs 0.167, so this
// pass uses CSG-ready primitive assemblies and immediately registers them with the
// existing three-mesh-bvh layer. v132 adds low vault rails as actual traversal tests.
let scene=null,state='wire';
const PAL={
  wire:{solid:0x06131d,edge:0x9cefff,rough:.34,metal:.30},
  brutal:{solid:0x746d62,edge:0x241f1a,rough:.94,metal:.03},
  bio:{solid:0x21103a,edge:0x75ffe6,rough:.40,metal:.30},
  physical:{solid:0x586169,edge:0xe8e3d8,rough:.60,metal:.52},
  kill:{solid:0x3a0608,edge:0xffb2a6,rough:.48,metal:.28}
};
function worldFor(n=''){if(n.includes('TORTOISE'))return'brutal';if(n.includes('WASP'))return'bio';if(n.includes('MACHINE'))return'physical';if(n.includes('KILL')||n.includes('LAST'))return'kill';return'wire'}
function mesh(root,geo,x,y,z,p,ry=0){const m=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:p.solid,roughness:p.rough,metalness:p.metal}));m.position.set(x,y,z);m.rotation.y=ry;m.castShadow=m.receiveShadow=true;m.userData.skltrHeroSolid=1;root.add(m);const e=new THREE.LineSegments(new THREE.EdgesGeometry(geo),new THREE.LineBasicMaterial({color:p.edge,transparent:true,opacity:.42}));e.position.copy(m.position);e.rotation.copy(m.rotation);root.add(e);return m}
function box(r,x,y,z,w,h,d,p,ry=0){return mesh(r,new THREE.BoxGeometry(w,h,d),x,y+h*.5,z,p,ry)}
function rail(r,x,z,w,d,p,ry=0){const q=box(r,x,0,z,w,.72,d,p,ry);q.userData.skltrJumpRail=1;return q}
function arch(r,x,z,w,h,thick,p,ry=0){const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=ry;r.add(g);box(g,-w*.5+thick*.5,0,0,thick,h,thick,p);box(g,w*.5-thick*.5,0,0,thick,h,thick,p);box(g,0,h-thick,0,w,thick,thick,p);return g}
function aperture(r,x,z,w,h,d,p,ry=0){const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=ry;r.add(g);const side=Math.max(1.2,w*.22),beam=1.5;box(g,-w*.5+side*.5,0,0,side,h,d,p);box(g,w*.5-side*.5,0,0,side,h,d,p);box(g,0,h-beam,0,w,beam,d,p);return g}
function build(k){if(!scene)return;const base=scene.getObjectByName('SKLTR_V60_WORLD');if(!base){requestAnimationFrame(()=>build(k));return}const old=base.getObjectByName('SKLTR_V108_HERO');if(old)base.remove(old);const r=new THREE.Group();r.name='SKLTR_V108_HERO';base.add(r);const p=PAL[k];
 if(k==='wire'){
   arch(r,0,-19,18,8,1.4,p,0);arch(r,-24,19,13,6.5,1.2,p,.32);arch(r,24,25,13,8,1.2,p,-.32);
   rail(r,0,8,10,1.25,p);box(r,0,0,37,18,2.4,3.2,p);box(r,-35,0,-4,4,10,4,p);box(r,35,0,6,4,12,4,p);
 }else if(k==='brutal'){
   aperture(r,-17,-6,18,8,3.6,p,.08);aperture(r,19,16,16,10,4.2,p,-.14);
   rail(r,1,8,12,1.4,p,.08);box(r,-31,0,29,10,13,8,p,.10);box(r,32,0,-26,12,17,9,p,-.08);box(r,0,0,-35,24,3.2,5,p);
 }else if(k==='bio'){
   for(const a of[-.7,0,.7]){const x=Math.sin(a)*29,z=Math.cos(a)*25-5;arch(r,x,z,11,11,1.25,p,a)}
   rail(r,0,9,9,1.15,p);for(const x of[-31,31]){const q=mesh(r,new THREE.CylinderGeometry(2.4,3.7,15,7),x,7.5,20,p);q.rotation.z=x<0?.14:-.14}
 }else if(k==='physical'){
   arch(r,-24,-18,17,10,2,p,.12);arch(r,25,20,20,12,2.2,p,-.12);
   rail(r,0,8,14,1.5,p);box(r,0,0,-34,30,4,6,p);box(r,-37,0,9,7,16,9,p);box(r,38,0,-5,8,19,9,p);
 }else{
   for(let i=0;i<6;i++){const a=i/6*Math.PI*2,x=Math.cos(a)*33,z=Math.sin(a)*33;const q=box(r,x,0,z,5,13+(i%2)*5,8,p,-a);q.rotation.z=(i%2?1:-1)*.08}
   rail(r,0,0,10,1.35,p);aperture(r,0,-24,15,9,4,p,0);aperture(r,0,25,15,9,4,p,Math.PI);
 }
 queueMicrotask(()=>window._skltrBVH96?.refresh?.());
}
const oldAdd=THREE.Scene.prototype.add;THREE.Scene.prototype.add=function(...o){const out=oldAdd.apply(this,o);if(this.isScene&&!scene){scene=this;queueMicrotask(()=>build(state))}return out};
addEventListener('skltr-world-shift',e=>{state=e.detail?.to||state;queueMicrotask(()=>build(state))});
addEventListener('skltr-arena',e=>{const k=worldFor(e.detail?.arena||'');if(k!==state){state=k;queueMicrotask(()=>build(k))}});
window._skltrArchitecture108=()=>({state,solids:scene?.getObjectByName('SKLTR_V108_HERO')?.children.filter(o=>o.isMesh).length||0,csgReady:true});
