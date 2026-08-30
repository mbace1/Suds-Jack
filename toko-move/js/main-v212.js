// Toko Move v2.12 runtime — whole colored network remains visible; gameplay vehicles move on exact HSL paths.
import './main-v211.js?v=2';
import {LiveNetwork} from './live-network.js?v=1';
const BUILD_VERSION='2.12';
function mount(){const tm=window.__tm;if(!tm?.transit||!tm?.flow||!tm?.city){setTimeout(mount,50);return;}tm.version=BUILD_VERSION;tm.liveNetwork=new LiveNetwork(tm.transit,{vehiclesPerLine:2});const canvas=document.getElementById('map');const ctx=canvas?.getContext('2d');if(!canvas||!ctx)return;const draw=()=>{if(tm.liveNetwork&&tm.flow&&!document.body.classList.contains('transit-view')){const fit=tm.city.projectLatLon,dpr=tm.renderer?.dpr||window.devicePixelRatio||1;const graphFit=tm.flow.graph.fit(canvas.width,canvas.height);const project=(lat,lon)=>{const p=fit(lat,lon);return{x:graphFit.x(p.x),y:graphFit.y(p.y)};};tm.liveNetwork.draw(ctx,tm.flow.clock.tick,project,dpr);}requestAnimationFrame(draw);};requestAnimationFrame(draw);}
mount();
