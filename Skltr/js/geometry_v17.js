import * as THREE from 'three';

export function buildCombatGeometry(scene) {
  if (scene.getObjectByName('SKLTR_V17_GEOMETRY')) return;
  const root=new THREE.Group();root.name='SKLTR_V17_GEOMETRY';scene.add(root);
  const mat=new THREE.MeshStandardMaterial({color:0x263449,emissive:0x07121f,roughness:.78,metalness:.22});
  const edgeMat=new THREE.LineBasicMaterial({color:0x72d9ff,transparent:true,opacity:.42});
  const box=(x,z,w,h,d)=>{const g=new THREE.BoxGeometry(w,h,d),m=new THREE.Mesh(g,mat);m.position.set(x,h*.5,z);root.add(m);const e=new THREE.LineSegments(new THREE.EdgesGeometry(g),edgeMat);e.position.copy(m.position);root.add(e);};
  // HOUND RUN — broad loop and low dash gates.
  box(-31,-22,12,.7,2.2);box(-31,-8,12,.7,2.2);box(-38,-15,2.2,.7,12);box(-24,-15,2.2,.7,12);box(-31,-29,7,1,5);box(-31,-1,7,1,5);
  // TORTOISE HEIGHTS — staggered firing terraces + sightline breaker.
  box(18,-19,9,1,6);box(27,-12,10,1.8,7);box(17,-5,8,2.6,6);box(8,-12,2.2,1.35,10);box(31,-22,5,.8,9);box(7,-23,7,1.2,5);
  // WASP LIFT — ascending chain and drop/air-dash routes.
  box(-10,20,7,1,7);box(-2,27,7,2,7);box(7,22,7,3,7);box(13,31,6,4,6);box(-15,31,5,1.6,5);box(3,36,5,2.6,5);
  // MACHINE YARD — diagonal islands with fast central cut-through.
  box(24,24,8,1.4,8);box(-20,34,9,1.8,7);box(1,39,5,.8,13);
}

// Loaded before main.js. Capture the first real THREE.Scene as main begins populating it,
// then restore the prototype immediately so normal scene behavior is untouched.
const originalAdd=THREE.Scene.prototype.add;
THREE.Scene.prototype.add=function(...objects){
  const result=originalAdd.apply(this,objects);
  if(this.isScene&&!this.getObjectByName('SKLTR_V17_GEOMETRY')){
    THREE.Scene.prototype.add=originalAdd;
    queueMicrotask(()=>buildCombatGeometry(this));
  }
  return result;
};
