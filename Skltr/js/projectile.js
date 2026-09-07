import * as THREE from 'three';
import { C } from './shared.js?v=12';

// v20: projectiles communicate ownership and danger through shape as well as color.
const CAP = 600;
export class ProjectilePool {
  constructor(scene) {
    this.scene = scene; this.active = []; this.free = [];
    const geo = new THREE.SphereGeometry(0.16, 8, 6);
    for (let i = 0; i < CAP; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: C.shot, transparent: true, opacity: 1 });
      const mesh = new THREE.Mesh(geo, mat); mesh.visible = false; scene.add(mesh);
      this.free.push({ mesh, mat });
    }
  }
  spawn(x,y,z,dx,dy,dz,o) {
    const p=this.free.pop(); if(!p) return null;
    p.x=x;p.y=y;p.z=z;p.px=x;p.py=y;p.pz=z;p.dx=dx;p.dy=dy;p.dz=dz;
    p.speed=o.speed;p.life=o.life??3;p.fromPlayer=!!o.fromPlayer;p.damage=o.damage;p.r=o.r||0.35;
    p.pierce=o.pierce||0;p.crit=!!o.crit;p.hitSet=null;p.age=0;
    p.baseScale=(o.scale||1)*(p.crit?1.5:1)*(p.fromPlayer?0.9:1.35);
    p.mat.color.setHex(o.color??(o.fromPlayer?C.shot:C.eshot)); p.mat.opacity=p.fromPlayer?0.9:1;
    p.mesh.scale.setScalar(p.baseScale); p.mesh.position.set(x,y,z); p.mesh.visible=true;
    this.active.push(p); return p;
  }
  recycle(i){const p=this.active[i];p.mesh.visible=false;this.active.splice(i,1);this.free.push(p);}
  update(dt){
    for(let i=this.active.length-1;i>=0;i--){
      const p=this.active[i]; p.age+=dt; p.px=p.x;p.py=p.y;p.pz=p.z;
      p.x+=p.dx*p.speed*dt;p.y+=p.dy*p.speed*dt;p.z+=p.dz*p.speed*dt;p.mesh.position.set(p.x,p.y,p.z);
      if(!p.fromPlayer){
        const pulse=1+Math.sin(p.age*18)*0.13; p.mesh.scale.set(p.baseScale*pulse,p.baseScale*pulse,p.baseScale*(1.65+p.speed*0.025));
        p.mesh.rotation.x+=dt*5;p.mesh.rotation.y+=dt*7;
      } else p.mesh.scale.setScalar(p.baseScale);
      p.life-=dt; if(p.life<=0||p.y<-25||Math.abs(p.x)>140||Math.abs(p.z)>140)this.recycle(i);
    }
  }
  clear(){for(let i=this.active.length-1;i>=0;i--)this.recycle(i);}
}
