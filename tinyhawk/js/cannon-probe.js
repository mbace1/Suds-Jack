import * as THREE from 'three';
import * as CANNON from 'cannon-es';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x070910);
const camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.1, 300);
camera.position.set(13, 10, 18);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight); renderer.setPixelRatio(Math.min(2, devicePixelRatio));
document.body.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xc9e6ff, 0x202030, 2.3));
const sun = new THREE.DirectionalLight(0xffffff, 2.8); sun.position.set(8, 16, 10); scene.add(sun);

const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -22, 0) });
world.broadphase = new CANNON.SAPBroadphase(world);
world.solver.iterations = 12;
const groundMat = new CANNON.Material('concrete');
const wheelMat = new CANNON.Material('board');
world.addContactMaterial(new CANNON.ContactMaterial(groundMat, wheelMat, { friction: 0.55, restitution: 0.03 }));

const mat = new THREE.MeshStandardMaterial({ color: 0x252a36, roughness: 0.7, metalness: 0.05 });
const edge = new THREE.MeshStandardMaterial({ color: 0x7df3ff, roughness: 0.35 });
function addBox(size, pos, rotZ = 0, visualMat = mat) {
  const body = new CANNON.Body({ mass: 0, material: groundMat });
  body.addShape(new CANNON.Box(new CANNON.Vec3(size.x/2,size.y/2,size.z/2)));
  body.position.set(pos.x,pos.y,pos.z); body.quaternion.setFromEuler(0,0,rotZ); world.addBody(body);
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(size.x,size.y,size.z), visualMat);
  mesh.position.copy(pos); mesh.rotation.z = rotZ; scene.add(mesh); return body;
}
addBox(new THREE.Vector3(34,1,20), new THREE.Vector3(0,-0.5,0));
addBox(new THREE.Vector3(10,1,12), new THREE.Vector3(-9,2.1,0), Math.PI/9, edge);
addBox(new THREE.Vector3(10,1,12), new THREE.Vector3(9,2.1,0), -Math.PI/9, edge);
addBox(new THREE.Vector3(4,0.35,7), new THREE.Vector3(0,1.35,-5), 0, edge);

const board = new CANNON.Body({ mass: 2.4, material: wheelMat, angularDamping: 0.92, linearDamping: 0.08 });
board.addShape(new CANNON.Box(new CANNON.Vec3(0.55,0.12,1.35)));
world.addBody(board);
const boardMesh = new THREE.Mesh(new THREE.BoxGeometry(1.1,0.24,2.7), new THREE.MeshStandardMaterial({color:0xf2c84b,roughness:0.45})); scene.add(boardMesh);
const bird = new THREE.Mesh(new THREE.IcosahedronGeometry(0.72,1), new THREE.MeshStandardMaterial({color:0x7f93ff,roughness:0.5})); bird.position.y=0.9; boardMesh.add(bird);

const keys = new Set(); addEventListener('keydown',e=>{keys.add(e.code); if(e.code==='KeyR')reset();}); addEventListener('keyup',e=>keys.delete(e.code));
function reset(){board.position.set(0,2.2,7);board.velocity.set(0,0,-7);board.angularVelocity.set(0,0,0);board.quaternion.setFromEuler(0,0,0);}
reset();
let grounded=false, coyote=0;
board.addEventListener('collide', e=>{ if(e.contact.ni.y > 0.45 || e.contact.ni.y < -0.45){grounded=true;coyote=0.09;} });

let last=performance.now(); const readout=document.getElementById('readout');
function frame(now){
  requestAnimationFrame(frame); const dt=Math.min(1/30,(now-last)/1000); last=now; grounded=false; coyote=Math.max(0,coyote-dt);
  const push=(keys.has('KeyW')?1:0)-(keys.has('KeyS')?1:0); const turn=(keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0);
  const fwd=new CANNON.Vec3(0,0,-1); board.quaternion.vmult(fwd,fwd); fwd.y=0; fwd.normalize();
  board.applyForce(fwd.scale(push*34), board.position);
  board.angularVelocity.y += turn * 2.4 * dt;
  if(keys.has('Space') && (grounded||coyote>0)){board.velocity.y=Math.max(board.velocity.y,8.8);keys.delete('Space');coyote=0;}
  world.step(1/120,dt,8);
  boardMesh.position.copy(board.position); boardMesh.quaternion.copy(board.quaternion);
  camera.position.lerp(new THREE.Vector3(board.position.x+12,board.position.y+8,board.position.z+14),0.05); camera.lookAt(board.position.x,board.position.y,board.position.z-3);
  readout.textContent=`speed ${board.velocity.length().toFixed(1)} · grounded ${grounded||coyote>0?'yes':'no'} · fixed 120 Hz`;
  renderer.render(scene,camera);
}
requestAnimationFrame(frame);
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
