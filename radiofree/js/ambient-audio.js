// RFH scene audio policy. Kept separate from visual scene renderers.
import { initAmbient, setAmbient, pulse, stopAmbient } from './ambiences.js?v=61';
const FAMILY={metro:'rail',mannerheimrain:'rail',centralstation:'rail',hakaniemi:'city',katajanokka:'harbour',rooftops:'rooftop',kallionight:'city',pasila:'rail',merihaka:'harbour',toolo:'rail',sornainen:'city',kauppatori:'harbour',transitinterior:'interior'};
export function startSceneAudio(){initAmbient();}
export function enterScene(key,intensity=.5){initAmbient();setAmbient(FAMILY[key]||'city',intensity);}
export function scenePulse(key){const k=FAMILY[key]||'city';if(k==='rail')pulse('tram');else if(k==='interior')pulse('metro');else pulse('city');}
export function endScene(){stopAmbient();}
