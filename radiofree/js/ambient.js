// Radio Free Helsinki — atmospheric cutaways assembled from cheap moving layers.

import { PAL } from './palette.js?v=37';
import { mix, shade, bayer } from './screen.js?v=37';
import { drawCentralStation } from './centralstation.js?v=54';
import { drawKatajanokka } from './katajanokka.js?v=40';
import { drawHakaniemi } from './hakaniemi.js?v=46';
import { drawMetro } from './metro.js?v=49';
import { drawRooftops } from './rooftops.js?v=50';
import { drawKallioNight } from './kallionight.js?v=51';
import { drawMannerheimRain } from './mannerheimrain.js?v=52';
import { drawPassersby, drawBroadcastFX } from './broadcastfx.js?v=54';

export const AMBIENT_KEYS = ['metro', 'mannerheimrain', 'centralstation', 'hakaniemi', 'katajanokka', 'rooftops', 'kallionight'];
const W = 128, H = 152;
const inkLo = d => mix(PAL.GREEN_DIM, PAL.AMBER_DIM, d);

function rain(scr, t, d, amount = 42, speed = 58, len = 4, alpha = 0.5) {
  for (let i = 0; i < amount; i++) {
    const x = (i * 31 + Math.floor(t * speed * 0.58)) % W, y = (i * 47 + Math.floor(t * speed)) % H;
    if (bayer(i & 3, (i >> 2) & 3) < 0.78) scr.px(x, y, 1, len, shade(inkLo(d), alpha));
  }
}
function metro(scr,t,d){drawMetro(scr,t,d);drawPassersby(scr,t,d,118);}
function mannerheimrain(scr,t,d){drawMannerheimRain(scr,t,d);drawPassersby(scr,t,d,114);}
function centralstation(scr,t,d){drawCentralStation(scr,t,d);rain(scr,t,d,18,30,2,.22);rain(scr,t,d,20,64,4,.42);}
function hakaniemi(scr,t,d){drawHakaniemi(scr,t,d);drawPassersby(scr,t,d,116);rain(scr,t,d,12,31,2,.16);}
function katajanokka(scr,t,d){drawKatajanokka(scr,t,d);drawPassersby(scr,t,d,119);rain(scr,t,d,10,28,2,.14);}
function rooftops(scr,t,d){drawRooftops(scr,t,d);}
function kallionight(scr,t,d){drawKallioNight(scr,t,d);drawPassersby(scr,t,d,117);rain(scr,t,d,16,38,2,.20);rain(scr,t,d,12,67,4,.34);}
const SCENES={metro,mannerheimrain,centralstation,hakaniemi,katajanokka,rooftops,kallionight};
export function drawAmbient(key,scr,t,decode=0){const fn=SCENES[key]||rooftops;fn(scr,t,Math.min(.28,decode*.28));drawBroadcastFX(scr,t,decode);scr.scanlines(PAL.INK,3);}
