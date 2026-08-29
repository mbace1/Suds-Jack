// Radio Free Helsinki — compact animated bulletin package.
// The live feed now uses the same low-res Helsinki scene system as the art pass.
// Every bulletin opens on moving city art; studio/graphic cuts are brief accents.

import { Anchor } from './anchor.js?v=37';
import { Graphic } from './graphic.js?v=37';
import { PixelScreen } from './screen.js?v=37';
import { drawAmbient, AMBIENT_KEYS } from './ambient.js?v=49';
import { preferredScenes } from './editorialmap.js?v=46';

const BEATS = [
  { shot: 'broll', len: 7.0 },
  { shot: 'anchor', len: 2.6 },
  { shot: 'broll', len: 6.0 },
  { shot: 'graphic', len: 2.4 },
];
const CUT_FLASH = 0.12;

function ensureCompactPresentation() {
  if (document.getElementById('rfh-compact-v47')) return;
  const style = document.createElement('style');
  style.id = 'rfh-compact-v47';
  style.textContent = `
    .post-media{height:min(76vh,680px)!important;flex:1 1 auto!important;min-height:0}
    .post-caption{flex:0 0 auto!important;max-height:24vh!important;overflow:hidden!important;padding:7px 14px 8px!important;background:linear-gradient(to top,rgba(4,7,10,.98),rgba(4,7,10,.82))}
    .tag{font-size:8px!important;margin-bottom:2px!important;opacity:.75}
    .head{font-size:14px!important;line-height:1.15!important;margin-bottom:4px!important;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
    .bulletin{font-size:11px!important;line-height:1.25!important;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
    .bulletin-line+ .bulletin-line{display:none!important}
    .fiction{display:none!important}
    .decode-btn,.decode-box,.tally{display:none!important}
    .rail{bottom:8px!important}.rail-btn{width:42px!important;min-height:42px!important}.rail-btn .lbl{display:none!important}
    .pkg-shot canvas{width:100%;height:100%;object-fit:contain;image-rendering:pixelated}
    @media(max-height:620px){.post-media{height:72vh!important}.post-caption{max-height:28vh!important}}
  `;
  document.head.appendChild(style);
}

class AmbientFootage {
  constructor(host, story, seed = 0) {
    this.story = story;
    this.seed = seed;
    this.t = seed * 1.37;
    this.live = false;
    this.decoded = false;
    this.scr = new PixelScreen(host, 128, 152);
    const preferred = preferredScenes(story, AMBIENT_KEYS);
    this.scene = preferred.length ? preferred[seed % preferred.length] : AMBIENT_KEYS[seed % AMBIENT_KEYS.length];
    this.renderStatic();
  }
  sync() {}
  goLive() { this.live = true; }
  goIdle() { this.live = false; }
  update(dt) { if (this.live) this.t += dt; }
  draw() { drawAmbient(this.scene, this.scr, this.t, 0); }
  renderStatic() { drawAmbient(this.scene, this.scr, this.t, 0); }
  destroy() { this.scr.canvas.remove(); }
}

export class Package {
  constructor(host, story, sector, seed = 0) {
    ensureCompactPresentation();
    this.story = story; this.sector = sector; this.seed = seed; this.live = false; this._decoded = false;
    this.drawn = { anchor: null, graphic: null };
    host.innerHTML = '';
    const root = document.createElement('div'); root.className = 'pkg';
    const a = document.createElement('div'); a.className = 'pkg-shot on';
    const b = document.createElement('div'); b.className = 'pkg-shot';
    const g = document.createElement('div'); g.className = 'pkg-shot';
    const flash = document.createElement('div'); flash.className = 'pkg-cut';
    root.append(a,b,g,flash); host.appendChild(root);
    this.photo = new AmbientFootage(a, story, seed);
    this.root = root; this.flash = flash; this.layers = { broll:a, anchor:b, graphic:g };
    this.shot='broll'; this.beat=0; this.clock=0; this.flashT=0;
  }
  get decoded(){return false;} set decoded(v){this._decoded=false;} get anchor(){return this.drawn&&this.drawn.anchor;}
  ensure(kind){if(this.drawn[kind])return this.drawn[kind];const Cls=kind==='graphic'?Graphic:Anchor;const sh=new Cls(this.layers[kind],this.story,this.sector,this.seed);sh.decoded=false;if(this.live)sh.goLive();sh.paint();this.drawn[kind]=sh;return sh;}
  release(){for(const k of ['anchor','graphic']){if(!this.drawn[k])continue;this.drawn[k].destroy();this.drawn[k]=null;this.layers[k].innerHTML='';}}
  show(shot,immediate=false){this.shot=shot;for(const[k,el]of Object.entries(this.layers)){if(immediate)el.style.transition='none';el.classList.toggle('on',k===shot);}if(immediate){void this.root.offsetWidth;for(const el of Object.values(this.layers))el.style.transition='';}}
  cutTo(shot){if(shot===this.shot)return;if(shot!=='broll')this.ensure(shot);this.show(shot);this.flashT=CUT_FLASH;}
  goLive(){this.live=true;this.root.classList.add('live');this.photo.goLive();this.beat=0;this.clock=0;this.show('broll',true);for(const k of ['anchor','graphic'])if(this.drawn[k])this.drawn[k].goLive();}
  goIdle(){this.live=false;this.root.classList.remove('live');this.photo.goIdle();this.flashT=0;this.flash.style.opacity='0';this.show('broll',true);this.release();}
  update(dt,mouth=0){this.photo.update(dt,mouth);for(const k of ['anchor','graphic'])if(this.drawn[k])this.drawn[k].update(dt,mouth);if(this.flashT>0){this.flashT=Math.max(0,this.flashT-dt);this.flash.style.opacity=String((this.flashT/CUT_FLASH)*.42);}if(!this.live)return;this.clock+=dt;const b=BEATS[this.beat];if(this.clock>=b.len){this.clock-=b.len;this.beat=(this.beat+1)%BEATS.length;this.cutTo(BEATS[this.beat].shot);}}
  draw(){if(this.shot==='broll'){this.photo.draw();return;}const sh=this.drawn[this.shot];if(sh)sh.draw();}
  renderStatic(){this.photo.renderStatic();}
  destroy(){this.photo.destroy();this.release();this.root.remove();}
}
