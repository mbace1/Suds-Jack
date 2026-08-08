import { drawCinematicFigureV9 } from './cinematic-actions-v9.js';
import { C } from './palette.js';

// v10 silhouette correction pass. The goal is not extra decoration: it is to
// break the consistent puppet outline and give each motion family a distinct,
// photographed human contour at the game's native 320x192 resolution.
const RUN=new Set(['run','runStart','landRun','runStop']);
const LOW=new Set(['crouch','crouchIdle','crouchWalk','roll','lowMantle']);
const AIR=new Set(['air','fall','gather','gatherRun']);
const HANG=new Set(['ledgeCatch','hang','shimmy','pullUp','climbDown']);
function px(scr,x,y,w,h,c){scr.rect(Math.round(x),Math.round(y),w,h,c)}
export function drawCinematicFigureV10(scr,h,col){
  drawCinematicFigureV9(scr,h,col);
  const f=h.face||1,x=h.x,y=h.y,n=h.f||0,s=h.state;
  // Costume breakup follows the pose family rather than a fixed torso anchor.
  // This deliberately changes apparent body shape between actions.
  let chest=y-28,hip=y-16;
  if(RUN.has(s)){chest=y-27-(n%8<4?1:0);hip=y-15;}
  if(LOW.has(s)){chest=y-19;hip=y-9;}
  if(AIR.has(s)){chest=y-27;hip=y-15;}
  if(HANG.has(s)){chest=y-24;hip=y-9;}
  // Bright shirt wedge + dark trouser waist creates the long-leg/compact-torso
  // read that was missing in v9.
  scr.poly([x-f*4,chest-4,x+f*5,chest-3,x+f*4,hip-3,x-f*3,hip-4],C.SUIT_HI);
  px(scr,x-4,hip-3,8,3,C.DARK);px(scr,x-f,hip-3,2,2,C.EDGE);
  // Facing shoulder is broad on contacts and narrows in passing/flight frames.
  const reach=RUN.has(s)?((n>>1)&1?7:5):LOW.has(s)?4:6;
  scr.poly([x+f*1,chest-8,x+f*reach,chest-6,x+f*(reach-1),chest-3,x+f*2,chest-4],C.SUIT);
  // Hip/upper-leg clusters change per phase, hiding the invariant skeletal joint.
  if(RUN.has(s)){
    const a=((n/2)|0)%4;
    if(a===0||a===3) scr.poly([x-f*3,hip,x+f*2,hip,x+f*7,y-7,x+f*4,y-6],C.SUIT);
    else scr.poly([x-f*2,hip,x+f*3,hip,x-f*5,y-8,x-f*7,y-9],C.SUIT);
  } else if(LOW.has(s)) scr.poly([x-f*5,hip,x+f*5,hip,x+f*7,y-5,x-f*3,y-5],C.SUIT);
  // Head is intentionally tiny and directional: forehead/nose/jaw pixels make
  // facing readable without turning the face into a modern sprite portrait.
  const hy=chest-11;px(scr,x-f*2,hy-3,4,2,C.HAIR);px(scr,x+f*2,hy,2,1,C.SKIN);px(scr,x+f*3,hy+1,1,2,C.SKIN);px(scr,x+f*1,hy+3,2,1,C.DARK);
  // State-specific silhouette accents. These are the high-value contour pixels
  // visible in side-by-side motion: heel strike, flight toe, hanging shoulders.
  if(RUN.has(s)){const phase=((n/2)|0)%4;if(phase===0)px(scr,x+f*8,y-2,5,2,C.SUIT);if(phase===2)px(scr,x-f*9,y-5,5,2,C.SUIT);}
  if(AIR.has(s)){px(scr,x+f*7,y-9,4,2,C.SUIT);px(scr,x-f*6,y-5,4,2,C.SUIT);}
  if(HANG.has(s)){px(scr,x-5,chest-9,10,2,C.SUIT_HI);px(scr,x+f*5,chest-10,2,5,C.SKIN);}
}
