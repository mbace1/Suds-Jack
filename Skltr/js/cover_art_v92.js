import * as THREE from 'three';

// SKLTR v89-v92 — authored cover art layer.
// The collision boxes are now the source of truth for visible tactical cover too,
// so art and interaction cannot drift apart again.
let scene=null,root=null,state='wire';
const skins=[];
const PAL={
 wire:{base:0x07131b,edge:0x9cefff,accent:0x32d9ff,rough:.35,metal:.30},
 brutal:{base:0x81796e,edge:0x241f1a,accent:0xe1bd76,rough:.93,metal:.03},
 bio:{base:0x21103a,edge:0x75ffe6,accent:0xff58d6,rough:.42,metal:.35},
 physical:{base:0x586169,edge:0xe8e3d8,accent:0x93d9ff,rough:.58,metal:.54},
 kill:{base:0x3a0608,edge:0xffb2a6,accent:0xff382c,rough:.48,metal:.30}
};
function worldFor(n=''){if(n.includes('TORTOISE'))return'brutal';if(n.includes('WASP'))return'bio';if(n.includes('MACHINE'))return'physical';if(n.includes('KILL')||n.includes('LAST'))return'kill';return'wire'}
function build(){
 if(!scene||root)return;const boxes=window._skltrGeometry?.boxes;if(!boxes?.length){requestAnimationFrame(build);return;}
 root=new THREE.Group();root.name='SKLTR_V92_COVER_ART';scene.add(root);
 boxes.forEach(([x,z,w,h,d],i)=>{
   const g=new THREE.BoxGeometry(w+.06,h+.06,d+.06);
   const m=new THREE.MeshStandardMaterial({color:PAL[state].base,roughness:PAL[state].rough,metalness:PAL[state].metal,emissive:0x000000});
   const mesh=new THREE.Mesh(g,m);mesh.position.set(x,h*.5,z);mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData.coverIndex=i;root.add(mesh);
   const edgeMat=new THREE.LineBasicMaterial({color:PAL[state].edge,transparent:true,opacity:.42});
   const edge=new THREE.LineSegments(new THREE.EdgesGeometry(g),edgeMat);edge.position.copy(mesh.position);root.add(edge);
   skins.push({mesh,edge,flash:0});
 });
 recolor();
}
function recolor(){const p=PAL[state];for(const s of skins){s.mesh.material.color.setHex(p.base);s.mesh.material.roughness=p.rough;s.mesh.material.metalness=p.metal;s.edge.material.color.setHex(p.edge)}}
function hit(e){const s=skins[e.detail?.index];if(s)s.flash=1}
function tick(){for(const s of skins){if(s.flash>0){s.flash=Math.max(0,s.flash-.065);const p=PAL[state];s.mesh.material.emissive.setHex(p.accent);s.mesh.material.emissiveIntensity=s.flash*1.7;s.edge.material.opacity=.42+s.flash*.5;s.mesh.scale.setScalar(1+s.flash*.012)}else{s.mesh.material.emissiveIntensity=0;s.edge.material.opacity=.42;s.mesh.scale.setScalar(1)}}requestAnimationFrame(tick)}
const oldAdd=THREE.Scene.prototype.add;THREE.Scene.prototype.add=function(...o){const r=oldAdd.apply(this,o);if(this.isScene&&!scene){scene=this;queueMicrotask(build)}return r};
addEventListener('skltr-arena',e=>{const k=worldFor(e.detail?.arena||'');if(k!==state){state=k;recolor()}});
addEventListener('skltr-cover-hit',hit);
tick();
window._skltrCoverArt92=()=>({state,count:skins.length});
