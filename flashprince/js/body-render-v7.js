// Shared high-fidelity cinematic body construction. Pose data supplies joints;
// this renderer supplies the actual character silhouette, clothing and depth.
export function renderBody(scr,hero,col,q){
 const face=hero.face||1,pt=a=>({x:hero.x+a[0]*face,y:hero.y+a[1]});
 const pel=pt(q.pel),sho=pt(q.sho),head=pt(q.head),kn=pt(q.kn),fn=pt(q.fn),kf=pt(q.kf),ff=pt(q.ff),en=pt(q.en),hn=pt(q.hn),ef=pt(q.ef),hf=pt(q.hf);
 const limb=(a,b,w0,w1,c)=>scr.limb(a.x,a.y,b.x,b.y,w0,w1,c);
 // rear limbs: darker and slightly slimmer, as in rotoscoped polygon figures.
 limb(pel,kf,3.9,3.0,col.far); limb(kf,ff,3.0,2.1,col.far);
 limb(sho,ef,3.0,2.2,col.far); limb(ef,hf,2.2,1.5,col.far);
 // pelvis/hips as a separate trouser mass rather than a single stick joint.
 scr.poly([pel.x-4.8*face,pel.y-2,pel.x+4.5*face,pel.y-2,pel.x+4.0*face,pel.y+3,pel.x-4.2*face,pel.y+3],col.legs);
 // tapered torso: broad shoulders, narrow waist, small neck break.
 const vx=sho.x-pel.x,vy=sho.y-pel.y,L=Math.hypot(vx,vy)||1,nx=-vy/L,ny=vx/L;
 const waist=3.4,chest=5.2;
 scr.poly([pel.x+nx*waist,pel.y+ny*waist,pel.x-nx*waist,pel.y-ny*waist,sho.x-nx*chest,sho.y-ny*chest,sho.x+nx*chest,sho.y+ny*chest],col.body);
 // shoulder yoke / shirt highlight gives a Flashback/PoP-like readable upper body.
 scr.poly([sho.x-5.0*face,sho.y-2,sho.x+4.4*face,sho.y-2,sho.x+3.2*face,sho.y+2,sho.x-4.0*face,sho.y+2],col.arms);
 // front leg and arm carry the brightest silhouette.
 limb(pel,kn,4.2,3.2,col.legs); limb(kn,fn,3.2,2.25,col.legs);
 limb(sho,en,3.25,2.35,col.arms); limb(en,hn,2.35,1.7,col.skin);
 // boots are angular, with heel/toe rather than flat rectangles.
 const boot=(p,c,front)=>scr.poly([p.x-2.8*face,p.y-2,p.x+4.8*face,p.y-2,p.x+6.2*face,p.y,p.x+5.2*face,p.y+2,p.x-2.8*face,p.y+2],front?c:col.far);
 boot(ff,col.legs,false);boot(fn,col.legs,true);
 // hands are compact polygon masses rather than dots.
 const hand=(p,c)=>scr.poly([p.x-1.6,p.y-1.6,p.x+1.7,p.y-1.2,p.x+2,p.y+1.1,p.x-.3,p.y+2,p.x-1.8,p.y+.8],c);
 hand(hn,col.skin);hand(hf,col.far);
 // neck + jawed head: longer face, smaller cranium than the old round mannequin.
 const neck={x:sho.x+1.0*face,y:sho.y-3};
 scr.poly([neck.x-1.7*face,neck.y-2,neck.x+1.7*face,neck.y-2,neck.x+1.3*face,neck.y+2,neck.x-1.4*face,neck.y+2],col.skin);
 scr.poly([head.x-3.3*face,head.y-4.5,head.x+2.0*face,head.y-4.5,head.x+4.1*face,head.y-1.5,head.x+3.3*face,head.y+2.4,head.x+1.2*face,head.y+4.1,head.x-2.5*face,head.y+3.3,head.x-3.8*face,head.y],col.skin);
 // swept hair cap + back wedge makes direction readable even at 320px.
 scr.poly([head.x-3.8*face,head.y-4.8,head.x+2.4*face,head.y-4.7,head.x+1.4*face,head.y-2.1,head.x-1.5*face,head.y-1.8,head.x-4.4*face,head.y+.2],col.hair);
 scr.poly([head.x-3.5*face,head.y-1.2,head.x-5.1*face,head.y+1.1,head.x-3.1*face,head.y+2.0],col.hair);
 // one-pixel face cue, deliberately subtle.
 scr.disc(head.x+2.1*face,head.y-.5,0.75,col.hair);
}
