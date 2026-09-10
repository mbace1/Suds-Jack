import {GLTFLoader} from './vendor/GLTFLoader.js?v=185';
import * as T from './vendor/three.module.min.js?v=185';
const base=new URL('./assets/',import.meta.url);
export function loadArt({scene,rider,deck,body,environment,renderer,host}){
 const mobile=new URLSearchParams(location.search).get('quality')==='mobile'||(new URLSearchParams(location.search).get('quality')!=='desktop'&&(matchMedia('(pointer:coarse)').matches||innerWidth<700));
 const quality=mobile?'mobile':'desktop',loader=new GLTFLoader();let hipRest=null,mixer=null,clips={},current='',model=null,disposed=false,wasAir=false,landing=0;
 host.dataset.art='loading';host.dataset.quality=quality;
 if(mobile){renderer.setPixelRatio(Math.min(devicePixelRatio,1.25));scene.traverse(o=>{if(o.isDirectionalLight&&o.shadow)o.shadow.mapSize.set(1024,1024)})}
 const footRest={};const resources=[];const extraTextures=[];
 const textureLoader=new T.TextureLoader();
 function texture(name){const t=textureLoader.load(new URL('textures/'+name,base).href);extraTextures.push(t);return t}
 const fabricNormal=texture('fabric-normal'+(mobile?'-mobile':'')+'.png?v=2');const fabricRough=texture('fabric-rough'+(mobile?'-mobile':'')+'.png?v=2');

 const ready=fetch(new URL('manifest.json?v=2',base)).then(r=>{if(!r.ok)throw Error('Art manifest unavailable');return r.json()}).then(async manifest=>{
  await Promise.all(['warehouse','skater','board'].map(async name=>{
   const gltf=await loader.loadAsync(new URL(manifest.models[name][quality],base).href);if(disposed){gltf.scene.traverse(disposeObject);return}
   resources.push(gltf.scene);gltf.scene.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;if(o.material.map)o.material.map.anisotropy=mobile?2:4;if(o.material.name.startsWith('Jacket')){o.material.normalMap=fabricNormal;o.material.normalScale.set(.18,.18);o.material.roughnessMap=fabricRough;o.material.needsUpdate=true}}});
   if(name==='warehouse'){scene.add(gltf.scene);environment.visible=false;const decal=texture('decals.png?v=2');decal.colorSpace=T.SRGBColorSpace;const sign=new T.Mesh(new T.PlaneGeometry(9,4.5),new T.MeshBasicMaterial({map:decal,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2}));sign.position.set(-28.75,4,3);sign.rotation.y=Math.PI/2;gltf.scene.add(sign)}
   if(name==='skater'){model=gltf.scene;rider.add(model);body.visible=false;mixer=new T.AnimationMixer(model);for(const clip of gltf.animations){const name=clip.name.split('|').pop();clips[name]=mixer.clipAction(clip)}hipRest=model.getObjectByName('hips')?.position.clone();model.updateWorldMatrix(true,true);for(const side of ['l','r']){const foot=model.getObjectByName('foot_'+side);footRest[side]=rider.getWorldQuaternion(new T.Quaternion()).invert().multiply(foot.getWorldQuaternion(new T.Quaternion()))}host.dataset.clips=Object.keys(clips).join(',')}
   if(name==='board'){for(const child of deck.children)child.visible=false;deck.add(gltf.scene)}
  }));host.dataset.art='ready';return true;
 }).catch(e=>{host.dataset.art='fallback';console.warn('CONCRETE: using available procedural art.',e);return false});
 function disposeObject(o){if(o.isMesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material]){for(const v of Object.values(m))if(v?.isTexture)v.dispose();m.dispose()}}}
 // Visual-only two-bone IK. Physics and collision remain authoritative.
 const position=o=>o.getWorldPosition(new T.Vector3());
 function aim(bone,child,target){const start=position(bone),old=position(child).sub(start).normalize(),want=target.clone().sub(start).normalize();const delta=new T.Quaternion().setFromUnitVectors(old,want),world=bone.getWorldQuaternion(new T.Quaternion());world.premultiply(delta);const parent=bone.parent.getWorldQuaternion(new T.Quaternion()).invert();bone.quaternion.copy(parent.multiply(world));bone.updateWorldMatrix(false,true)}
 function ik(a,b,c,target,pole){if(!a||!b||!c)return;model.updateWorldMatrix(true,true);const p=position(a),p2=position(b),p3=position(c),l1=p.distanceTo(p2),l2=p2.distanceTo(p3),dir=target.clone().sub(p),dist=T.MathUtils.clamp(dir.length(),.01,l1+l2-.001);dir.normalize();const side=pole.clone().sub(p).addScaledVector(dir,-pole.clone().sub(p).dot(dir)).normalize();const cos=T.MathUtils.clamp((dist*dist+l1*l1-l2*l2)/(2*dist*l1),-1,1);const elbow=p.clone().addScaledVector(dir,l1*cos).addScaledVector(side,l1*Math.sqrt(1-cos*cos));aim(a,b,elbow);aim(b,c,p.clone().addScaledVector(dir,dist))}
 function update(dt,s){if(!mixer||!model)return;if(wasAir&&!s.air)landing=.2;wasAir=s.air;landing=Math.max(0,landing-dt);
  const state=s.bail>.35?'bail':s.bail>0?'recover':s.grab>0?'grab':s.flip>0?'kickflip':s.grinding>=0?'grind':s.air?(s.vy>4?'ollie':'air'):landing>0?'land':s.speed<.2?'idle':s.throttle>0&&s.speed<10?'push':'coast';
  if(state!==current&&clips[state]){const old=clips[current];clips[state].reset().fadeIn(.12).play();old?.fadeOut(.12);current=state}host.dataset.pose=state;mixer.update(dt);if(hipRest)model.getObjectByName('hips').position.copy(hipRest);model.rotation.z=s.bail>0?Math.min(1,s.bail/.35)*.8:s.steer*-.07;
  const bone=name=>model.getObjectByName(name);
  if(s.grab>0){const hips=bone('hips');if(hips){model.updateWorldMatrix(true,true);const lowered=hips.getWorldPosition(new T.Vector3());lowered.y-=.62;hips.position.copy(hips.parent.worldToLocal(lowered))}model.updateWorldMatrix(true,true);const target=deck.localToWorld(new T.Vector3(.17,.16,0));ik(bone('upper_arm_r'),bone('forearm_r'),bone('hand_r'),target,rider.localToWorld(new T.Vector3(.6,.6,.2)));host.dataset.grabError=position(bone('hand_r')).distanceTo(target).toFixed(3)}
  if((!s.air||s.grab>0)&&s.bail<=0&&state!=='push'){for(const [side,x,z]of [['l',-.14,.3],['r',.14,-.3]]){const target=rider.localToWorld(new T.Vector3(x,.28,z));ik(bone('thigh_'+side),bone('shin_'+side),bone('foot_'+side),target,rider.localToWorld(new T.Vector3(x,.5,z+.5)));const foot=bone('foot_'+side);const desired=rider.getWorldQuaternion(new T.Quaternion()).multiply(footRest[side]);foot.quaternion.copy(foot.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(desired));host.dataset.footError=position(foot).distanceTo(target).toFixed(3)}}
 }
 return {ready,update,mobile,dispose(){disposed=true;mixer?.stopAllAction();for(const t of extraTextures)t.dispose();for(const r of resources){r.removeFromParent();r.traverse(disposeObject)}}};
}
