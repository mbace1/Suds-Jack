// Original cinematic-platformer body construction. Pose data supplies joints;
// this renderer supplies silhouette, clothing volume and depth.
export function renderBody(scr,hero,col,q){
 const face=hero.face||1,pt=a=>({x:hero.x+a[0]*face,y:hero.y+a[1]});
 const pel=pt(q.pel),sho=pt(q.sho),head=pt(q.head),kn=pt(q.kn),fn=pt(q.fn),kf=pt(q.kf),ff=pt(q.ff),en=pt(q.en),hn=pt(q.hn),ef=pt(q.ef),hf=pt(q.hf);
 const limb=(a,b,w0,w1,c)=>scr.limb(a.x,a.y,b.x,b.y,w0,w1,c);
 // Rear side recedes strongly so crossed limbs remain readable at low resolution.
 limb(pel,kf,3.5,2.55,col.far);limb(kf,ff,2.55,1.8,col.far);limb(sho,ef,2.65,1.95,col.far);limb(ef,hf,1.95,1.35,col.far);
 // Compact hips and high-waisted trouser block.
 scr.poly([pel.x-4.4*face,pel.y-3,pel.x+4.5*face,pel.y-3,pel.x+4.0*face,pel.y+3,pel.x-4.0*face,pel.y+3],col.legs);
 // Athletic torso with a clear ribcage-to-waist taper.
 const vx=sho.x-pel.x,vy=sho.y-pel.y,L=Math.hypot(vx,vy)||1,nx=-vy/L,ny=vx/L;
 scr.poly([pel.x+nx*3.0,pel.y+ny*3.0,pel.x-nx*3.0,pel.y-ny*3.0,sho.x-nx*5.5,sho.y-ny*5.5,sho.x+nx*5.5,sho.y+ny*5.5],col.body);
 // Short jacket/shirt hem and shoulder plane create costume shape instead of anatomy tubes.
 scr.poly([pel.x-3.6*face,pel.y-4,pel.x+3.5*face,pel.y-4,pel.x+4.0*face,pel.y-1,pel.x-3.9*face,pel.y-1],col.arms);
 scr.poly([sho.x-5.5*face,sho.y-2.5,sho.x+5.0*face,sho.y-2.5,sho.x+3.9*face,sho.y+2.0,sho.x-4.4*face,sho.y+2.0],col.arms);
 // Front limbs are heavier/brighter than rear limbs.
 limb(pel,kn,4.0,3.0,col.legs);limb(kn,fn,3.0,2.05,col.legs);limb(sho,en,3.1,2.2,col.arms);limb(en,hn,2.2,1.55,col.skin);
 // Calf/boot shapes are angular and directional.
 const boot=(p,c,front)=>scr.poly([p.x-3.0*face,p.y-2,p.x+3.5*face,p.y-2,p.x+6.5*face,p.y-.5,p.x+5.4*face,p.y+2,p.x-3.0*face,p.y+2],front?c:col.far);
 boot(ff,col.legs,false);boot(fn,col.legs,true);
 const hand=(p,c)=>scr.poly([p.x-1.7,p.y-1.4,p.x+1.5,p.y-1.2,p.x+2.0,p.y+.8,p.x+.2,p.y+2.0,p.x-1.8,p.y+.8],c);hand(hn,col.skin);hand(hf,col.far);
 // Small neck, longer jaw and swept hair produce a more human rotoscope silhouette.
 const neck={x:sho.x+.8*face,y:sho.y-3};scr.poly([neck.x-1.6*face,neck.y-2,neck.x+1.6*face,neck.y-2,neck.x+1.25*face,neck.y+2,neck.x-1.3*face,neck.y+2],col.skin);
 scr.poly([head.x-3.1*face,head.y-4.6,head.x+1.8*face,head.y-4.5,head.x+3.9*face,head.y-2.0,head.x+3.5*face,head.y+1.6,head.x+1.3*face,head.y+4.2,head.x-2.2*face,head.y+3.5,head.x-3.7*face,head.y+.2],col.skin);
 scr.poly([head.x-3.8*face,head.y-4.9,head.x+2.1*face,head.y-4.7,head.x+.8*face,head.y-2.0,head.x-2.0*face,head.y-1.7,head.x-4.5*face,head.y+.1],col.hair);
 scr.poly([head.x-3.4*face,head.y-1.0,head.x-5.2*face,head.y+1.4,head.x-3.0*face,head.y+2.2],col.hair);
 scr.disc(head.x+2.0*face,head.y-.6,.65,col.hair);
}