// Radio Free Helsinki — atmospheric cutaways assembled from cheap moving layers.

import { PAL } from './palette.js?v=62';
import { mix, shade, bayer } from './screen.js?v=62';
import { drawCentralStation } from './centralstation.js?v=62';
import { drawKatajanokka } from './katajanokka.js?v=62';
import { drawHakaniemi } from './hakaniemi.js?v=62';
import { drawMetro } from './metro.js?v=62';
import { drawRooftops } from './rooftops.js?v=62';
import { drawKallioNight } from './kallionight.js?v=62';
import { drawMannerheimRain } from './mannerheimrain.js?v=62';
import { drawPasila } from './pasila.js?v=62';
import { drawMerihaka } from './merihaka.js?v=62';
import { drawToolo } from './toolo.js?v=62';
import { drawKalasatama } from './kalasatama.js?v=62';
import { drawKauppatori } from './kauppatori.js?v=62';
import { drawTransitInterior } from './transitinterior.js?v=62';
import { stateForStory, drawSceneState } from './sceneweather.js?v=62';
import { drawPassersby, drawBroadcastFX } from './broadcastfx.js?v=62';

export const AMBIENT_KEYS=['metro','mannerheimrain','centralstation','hakaniemi','katajanokka','rooftops','kallionight','pasila','merihaka','toolo','kalasatama','kauppatori','transitinterior'];
const W=128,H=152, inkLo=d=>mix(PAL.GREEN_DIM,PAL.AMBER_DIM,d);
// Rain sits OVER a scene and catches light, so it washes a hot ink in at a real
// opacity. It used to be `shade(inkLo(d), alpha)` — a multiply, not a wash — so
// every drop was drawn darker than the night it was falling through.
function rain(scr,t,d,amount=42,speed=58,len=4,alpha=.5){const col=mix(PAL.GREEN_HOT,PAL.AMBER_HOT,d);for(let i=0;i<amount;i++){const x=(i*31+Math.floor(t*speed*.58))%W,y=(i*47+Math.floor(t*speed))%H;if(bayer(i&3,(i>>2)&3)<.78)scr.wash(x,y,1,len,col,alpha*.6);}}
function metro(scr,t,d){drawMetro(scr,t,d);drawPassersby(scr,t,d,118);} function mannerheimrain(scr,t,d){drawMannerheimRain(scr,t,d);drawPassersby(scr,t,d,114);} function centralstation(scr,t,d){drawCentralStation(scr,t,d);rain(scr,t,d,18,30,2,.22);rain(scr,t,d,20,64,4,.42);} function hakaniemi(scr,t,d){drawHakaniemi(scr,t,d);drawPassersby(scr,t,d,116);rain(scr,t,d,12,31,2,.16);} function katajanokka(scr,t,d){drawKatajanokka(scr,t,d);drawPassersby(scr,t,d,119);rain(scr,t,d,10,28,2,.14);} function rooftops(scr,t,d){drawRooftops(scr,t,d);} function kallionight(scr,t,d){drawKallioNight(scr,t,d);drawPassersby(scr,t,d,117);rain(scr,t,d,16,38,2,.20);rain(scr,t,d,12,67,4,.34);} function pasila(scr,t,d){drawPasila(scr,t,d);drawPassersby(scr,t,d,120);} function merihaka(scr,t,d){drawMerihaka(scr,t,d);drawPassersby(scr,t,d,121);} function toolo(scr,t,d){drawToolo(scr,t,d);drawPassersby(scr,t,d,122);} function kalasatama(scr,t,d){drawKalasatama(scr,t,d);drawPassersby(scr,t,d,123);} function kauppatori(scr,t,d){drawKauppatori(scr,t,d);drawPassersby(scr,t,d,124);} function transitinterior(scr,t,d){drawTransitInterior(scr,t,d);}
const SCENES={metro,mannerheimrain,centralstation,hakaniemi,katajanokka,rooftops,kallionight,pasila,merihaka,toolo,kalasatama,kauppatori,transitinterior};
// `now` is threaded through for ONE reason: the time-of-day grade only runs
// after dark, so a gate that cannot pick the hour can only ever test the state
// the machine happens to be in — which is how a pass that blacked out every
// scene at dusk shipped and stayed shipped.
export function drawAmbient(key,scr,t,decode=0,story=null,seed=0,now=new Date()){const fn=SCENES[key]||rooftops,d=Math.min(.28,decode*.28);fn(scr,t,d);drawSceneState(scr,t,d,stateForStory(story,key,seed,now));drawBroadcastFX(scr,t,decode);scr.scanlines(PAL.INK,3);}
