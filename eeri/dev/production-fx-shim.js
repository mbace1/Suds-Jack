// Optional one-line production preview shim.
// Add <script type="module" src="./dev/production-fx-shim.js?v=1"></script>
// to eeri/index.html to preview the extra FX/SFX without the dev menu.
// Remove the script tag to return to the untouched v14 presentation.
import { RuntimeFX } from './runtime-fx.js?v=1';

const canvas = document.createElement('canvas');
canvas.id = 'eeri-runtime-fx';
Object.assign(canvas.style, { position:'fixed', inset:'0', width:'100%', height:'100%', pointerEvents:'none', zIndex:'7' });
document.body.appendChild(canvas);
const fx = new RuntimeFX({ canvas, frame:null, getGame:()=>window.__eeri || null });
window.__eeriRuntimeFX = fx;
