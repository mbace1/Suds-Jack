import { drawCinematicFigureV8 } from './cinematic-actions-v8.js';
import { C } from './palette.js';

// v9 keeps the v8 traced-action drawings and adds costume/face information at
// the same 320x192 scale. These are hard pixel clusters, not antialiased detail.
export function drawCinematicFigureV9(scr,hero,col){
  // Small ground contact before the body helps every planted pose read with
  // the weight of Flashback's rotoscope without soft shadows.
  if(!['air','fall','hang','ledgeCatch','pullUp','shimmy','climbDown'].includes(hero.state)){
    scr.veil([hero.x-7,hero.y-1,hero.x+8,hero.y-1,hero.x+5,hero.y+1,hero.x-5,hero.y+1],C.VOID,.38);
  }
  drawCinematicFigureV8(scr,hero,col);

  const f=hero.face||1,x=hero.x,y=hero.y;
  const crouched=['crouch','crouchIdle','crouchWalk','roll'].includes(hero.state);
  const hanging=['hang','ledgeCatch','shimmy','pullUp','climbDown'].includes(hero.state);
  const airborne=['air','fall'].includes(hero.state);
  // Approximate garment anchors follow state height so detail stays attached
  // while the underlying v8 body renderer owns the exact limb silhouette.
  const torsoY=y-(hanging?23:crouched?18:airborne?24:25);
  const hipY=y-(hanging?8:crouched?8:airborne?14:16);

  // Belt, buckle and asymmetric jacket seam: three tiny clusters are enough to
  // turn a generic mannequin into a designed game character.
  scr.rect(x-4,hipY-1,8,1,C.DARK);
  scr.rect(x-f,hipY-1,2,2,C.EDGE);
  scr.line(x+f,torsoY-5,x+f*2,hipY-4,C.EDGE,1);
  scr.rect(x-f*4,torsoY-7,2,4,C.SUIT);

  // Shoulder pad / sleeve break catches light on the facing side.
  scr.poly([x+f*2,torsoY-10,x+f*6,torsoY-8,x+f*5,torsoY-5,x+f*2,torsoY-6],C.SUIT_HI);

  // Head-level pixels: hair edge, eye and jaw shadow. Keep them sparse enough
  // that they survive pixel scaling rather than becoming facial noise.
  const headY=torsoY-10;
  scr.rect(x+f*2,headY,1,1,C.HAIR);
  scr.rect(x+f*3,headY+2,1,1,C.HAIR);
  scr.rect(x-f*2,headY-3,3,1,C.HAIR);

  // Boot toe highlight during grounded movement makes stride contacts visibly
  // alternate, which improves animation readability even before more frames.
  if(!hanging&&!airborne){
    const phase=((hero.f||0)>>1)&1;
    scr.rect(x+f*(phase?6:-5),y-2,3,1,C.EDGE);
  }
}
