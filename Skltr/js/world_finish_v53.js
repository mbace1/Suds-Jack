import * as THREE from 'three';
import { Enemy } from './enemy.js?v=12';

// v53-v56: authored hero arenas, traversal metamorphosis and enemy/world integration.
let scene,hero,current='wire',transition=0;
const P={wire:[0x071019,0x8fefff],brutal:[0x8e8778,0x211d18],bio:[0x160d2c,0x73ffe5],physical:[0x50555a,0xe7e3d8],kill:[0x250303,0xffc5b8]};
const M=(c,r=.82,metal=.08)=>new THREE.MeshStandardMaterial({color:c,roughness:r,metalness:metal});
function addBox(g,x,y,z,w,h,d,c){const q=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),M(c));q.position.set(x,y+h/2,z);g.add(q);return q}
function line(g,a,b,c){const geo=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...a),new THREE.Vector3(...b)]);g.add(new THREE.Line(geo,new THREE.LineBasicMaterial({color:c,transparent:true,opacity:.7})))}
function hound(g){const [c,e]=P.wire;for(let side of[-1,1])for(let z=-55;z<=55;z+=11){const x=side*(34+((z/11)&1)*5);line(g,[x,0,z],[x,9+(Math.abs(z)%4),z+7],e)}for(let z=-42;z<=42;z+=14){line(g,[-27,.05,z],[27,.05,z],e)}for(let i=0;i<6;i++){const a=i/6*Math.PI*2;addBox(g,Math.cos(a)*55,-3,Math.sin(a)*55,2,20+i*3,2,c)}}
function tortoise(g){const [c,e]=P.brutal;addBox(g,-37,0,0,14,15,74,c);addBox(g,37,0,0,14,21,74,c);for(let z of[-29,-9,12,31]){addBox(g,-18,0,z,12,4+(z+30)/12,9,c);addBox(g,18,0,z,12,10-(z+30)/18,9,c)}addBox(g,0,0,-47,54,8,10,c);addBox(g,0,0,47,44,12,10,c);for(let z of[-34,0,34]){line(g,[-29,1,z],[29,1,z],e)}}
function enemyTint(key){const pair=P[key]||P.wire;for(const e of scene?.children||[]){void e}return pair}
function build(key){if(!scene)return;if(hero)scene.remove(hero);hero=new THREE.Group();hero.name='SKLTR_FINISHED_WORLD';scene.add(hero);if(key==='wire')hound(hero);else if(key==='brutal')tortoise(hero);current=key;hero.scale.y=.04;transition=1;enemyTint(key)}
const oldAdd=THREE.Scene.prototype.add;THREE.Scene.prototype.add=function(...x){const r=oldAdd.apply(this,x);if(this.isScene&&!scene){scene=this;queueMicrotask(()=>build('wire'))}return r};
addEventListener('skltr-world-art',e=>{const next=e.detail?.state||'wire';build(next)});
// Enemy surface language changes with reality while silhouette remains untouched.
const oldUpdate=Enemy.prototype.update;Enemy.prototype.update=function(...a){const r=oldUpdate.apply(this,a);if(this.mesh){const [base,edge]=P[current]||P.wire;this.mesh.traverse(o=>{if(o.isMesh&&o.material&&!o.userData.v56){o.userData.v56=true;o.material=o.material.clone()}if(o.isMesh&&o.material){o.material.color?.lerp(new THREE.Color(base),.025);if(o.material.emissive)o.material.emissive.lerp(new THREE.Color(edge),.012)}})}return r};
function tick(){if(hero&&transition>0){hero.scale.y+=(1-hero.scale.y)*.07;hero.children.forEach((o,i)=>{if(o.isMesh){o.rotation.y+=Math.sin(i*1.7)*.0005*transition}});transition*=.982;if(transition<.02)transition=0}requestAnimationFrame(tick)}tick();
