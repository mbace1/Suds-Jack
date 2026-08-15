import { RuntimeFX } from './runtime-fx.js?v=1';

const root = document.getElementById('eeri-dev-root');
const frame = document.getElementById('eeri-dev-frame');
const canvas = document.getElementById('eeri-dev-fx');
const getGame = () => {
  try { return frame.contentWindow?.__eeri || null; } catch (_) { return null; }
};

root.innerHTML = `
<button id="eeri-dev-tab" aria-expanded="false">DEV</button>
<section id="eeri-dev-panel" hidden>
  <div class="eeri-dev-head"><div class="eeri-dev-title">EERI DEV</div><div id="eeri-dev-status" class="eeri-dev-status">BOOTING</div></div>
  <div class="eeri-dev-section">
    <div class="eeri-dev-label">Level</div>
    <div class="eeri-dev-grid"><button class="eeri-dev-btn" data-site="0">LEVEL 1</button><button class="eeri-dev-btn" data-site="1">LEVEL 2</button><button class="eeri-dev-btn" data-site="2">LEVEL 3</button><button class="eeri-dev-btn" data-act="restart">RESTART</button><button class="eeri-dev-btn" data-act="lab">GIZMO LAB</button><button class="eeri-dev-btn" data-act="reload">RELOAD</button></div>
  </div>
  <div class="eeri-dev-section">
    <div class="eeri-dev-label">Warp / machine</div>
    <div class="eeri-dev-grid"><button class="eeri-dev-btn" data-act="back10">−10</button><button class="eeri-dev-btn" data-act="forward10">+10</button><button class="eeri-dev-btn" data-act="checkpoint">CHECKPOINT</button><button class="eeri-dev-btn" data-act="machine">TO MACHINE</button><button class="eeri-dev-btn" data-act="tame">TAME</button><button class="eeri-dev-btn" data-act="dig">DIG 1×</button></div>
  </div>
  <div class="eeri-dev-section">
    <div class="eeri-dev-label">Debug</div>
    <div class="eeri-dev-grid two"><button class="eeri-dev-btn" data-toggle="invincible">INVINCIBLE</button><button class="eeri-dev-btn" data-toggle="hitboxes">HITBOXES</button><button class="eeri-dev-btn" data-toggle="fx" data-on="true">EXTRA FX</button><button class="eeri-dev-btn" data-toggle="sfx" data-on="true">EXTRA SFX</button></div>
  </div>
  <div class="eeri-dev-section">
    <div class="eeri-dev-label">FX / sound test</div>
    <div class="eeri-dev-grid"><button class="eeri-dev-btn" data-preview="dust">DIRT</button><button class="eeri-dev-btn" data-preview="metal">STOMP</button><button class="eeri-dev-btn" data-preview="brick">IMPACT</button><button class="eeri-dev-btn" data-preview="spark">PICKUP</button><button class="eeri-dev-btn" data-preview="confetti">CLEAR</button><button class="eeri-dev-btn" data-act="copy">COPY STATE</button></div>
  </div>
  <div class="eeri-dev-section"><div class="eeri-dev-label">Live state</div><pre id="eeri-dev-readout">Waiting for window.__eeri…</pre></div>
</section>`;

const tab = document.getElementById('eeri-dev-tab');
const panel = document.getElementById('eeri-dev-panel');
const status = document.getElementById('eeri-dev-status');
const readout = document.getElementById('eeri-dev-readout');
const fx = new RuntimeFX({ canvas, frame, getGame });
const toggles = { invincible:false, hitboxes:false, fx:true, sfx:true };

function setToggle(name, value) {
  toggles[name] = value;
  const b = root.querySelector(`[data-toggle="${name}"]`); if (b) b.dataset.on = String(value);
  if (name === 'hitboxes') fx.setHitboxes(value);
  if (name === 'fx') fx.setEnabled(value);
  if (name === 'sfx') fx.setSfx(value);
  fx.sfx.ui();
}

tab.addEventListener('click', () => {
  panel.hidden = !panel.hidden; tab.setAttribute('aria-expanded', String(!panel.hidden)); fx.sfx.ui();
});

root.addEventListener('click', async (e) => {
  const b=e.target.closest('button'); if(!b || b===tab) return;
  const g=getGame(); fx.sfx.ensure(); fx.sfx.ui();
  if (b.dataset.toggle) { setToggle(b.dataset.toggle, !toggles[b.dataset.toggle]); return; }
  if (b.dataset.preview) {
    const kind=b.dataset.preview; fx.emit(innerWidth*.5, innerHeight*.5, kind, kind==='confetti'?45:18);
    ({dust:()=>fx.sfx.dig(),metal:()=>fx.sfx.stomp(),brick:()=>fx.sfx.wall(),spark:()=>fx.sfx.pickup(),confetti:()=>fx.sfx.clear()})[kind]?.(); return;
  }
  if (!g) return;
  if (b.dataset.site != null) { await g.debug.goSite(Number(b.dataset.site)); return; }
  switch (b.dataset.act) {
    case 'restart': await g.debug.goSite(g.site()); break;
    case 'lab': await g.debug.goLab(); break;
    case 'reload': frame.contentWindow.location.reload(); break;
    case 'back10': g.debug.setPos(g.player.x-10,g.player.y+1); break;
    case 'forward10': g.debug.setPos(g.player.x+10,g.player.y+1); break;
    case 'checkpoint': { const c=g.debug.checkpoint(); if(c) g.debug.setPos(c.x,c.y+1); break; }
    case 'machine': { const m=g.debug.excPos(); if(m) g.debug.setPos(m.x-2,m.y+1); break; }
    case 'tame': g.exc?.tame?.(); break;
    case 'dig': g.debug.dig?.(); break;
    case 'copy': {
      const state = collect(g); await navigator.clipboard?.writeText(JSON.stringify(state,null,2));
      b.textContent='COPIED'; setTimeout(()=>b.textContent='COPY STATE',700); break;
    }
  }
});

function collect(g) {
  const d=g.debug;
  return {
    site:g.site?.(), mode:g.mode?.(), player:{x:+g.player.x.toFixed(2),y:+g.player.y.toFixed(2),vx:+g.player.vx.toFixed(2),vy:+g.player.vy.toFixed(2),grounded:g.player.grounded},
    counts:d.counts?.(), machine:d.machine?.(), bank:d.bank?.(), girder:d.girder?.(), wall:d.wall?.(), checkpoint:d.checkpoint?.(), flag:d.flag?.(),
    stomps:d.stomps?.(), cleared:d.cleared?.(), camera:d.camera?.(), triangles:d.tris?.(), robots:d.robots?.(), vents:d.vents?.(),
  };
}

function loop() {
  const g=getGame();
  status.textContent = g ? 'READY' : 'BOOTING';
  if (g) {
    if (toggles.invincible && g.player) g.player.mercyT = Math.max(g.player.mercyT || 0, .02);
    readout.textContent = JSON.stringify(collect(g), null, 2);
  }
  requestAnimationFrame(loop);
}
loop();
