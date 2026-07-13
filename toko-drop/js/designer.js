import * as THREE from 'three';
import { CFG, EnemyType, Enemy, GOO_TIME, applySatinValues } from './enemy.js?v=95';
import { t } from './lang.js?v=95';
import { TUNING, applyMaterialPreset } from './tuning.js?v=95';

// Sentinel for the non-enemy SETTINGS page in the pause-menu list.
const SETTINGS_PAGE = 'settings';

// ── In-menu enemy tester (v93) ────────────────────────────────────────────────
// A self-contained mini three.js world embedded in the pause menu: the chosen
// enemy spawns as a live specimen (current CFG + TUNING applied) chasing a
// ghost target, with HIT/KILL debug buttons. Entirely separate scene — zero
// contact with wave state, scoring, or collisions; paused-game safe.
let tester = null;
function ensureTester() {
  if (tester) return tester;
  const canvas = document.createElement('canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.setSize(520, 260, false);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x07071a);
  scene.add(new THREE.AmbientLight(0xffffff, 0.45));
  const sun = new THREE.DirectionalLight(0xffffff, 1.3);
  sun.position.set(8, 20, 10);
  scene.add(sun);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(26, 18),
    new THREE.MeshBasicMaterial({ color: 0x0d0d24 }));
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);
  const grid = new THREE.GridHelper(24, 18, 0x222248, 0x15152e);
  grid.position.y = 0.01;
  scene.add(grid);
  const camera = new THREE.PerspectiveCamera(45, 2, 0.1, 60);
  camera.position.set(0, 6.2, 7.6);
  camera.lookAt(0, 0.7, 0);
  tester = {
    canvas, renderer, scene, camera,
    specimen: null, type: null, t: 0, respawnT: 0, running: false, last: 0,
    ghost: { x: 3, z: 0 },              // fake player the specimen reacts to
    stubBullets: { spawnDir() {} },     // firing behaviors no-op safely
    fx: [],                             // droplets/splats so HIT/KILL show VFX
    splatDone: false,
    dropGeo: new THREE.SphereGeometry(1, 7, 5),
  };
  return tester;
}
// Goo droplet burst inside the tester scene (mirrors the in-game splatter).
function testerBurst(x, y, z, color, n, power) {
  const T = ensureTester();
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(T.dropGeo, new THREE.MeshBasicMaterial({ color }));
    const a = Math.random() * Math.PI * 2;
    const sp = (2 + Math.random() * 3) * power;
    m.position.set(x, y, z);
    m.scale.setScalar(0.09 + Math.random() * 0.08);
    T.scene.add(m);
    T.fx.push({ m, vx: Math.cos(a) * sp, vy: 2.5 + Math.random() * 3.5, vz: Math.sin(a) * sp, life: 1.0, splat: false });
  }
}
// Flat splat decal that fades out (death mark).
function testerSplat(x, z, color, size) {
  const T = ensureTester();
  const m = new THREE.Mesh(new THREE.CircleGeometry(size, 16),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5, depthWrite: false }));
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, 0.02, z);
  T.scene.add(m);
  T.fx.push({ m, vx: 0, vy: 0, vz: 0, life: 2.2, splat: true });
}
function testerSpawn(type) {
  const T = ensureTester();
  if (T.specimen) T.specimen.removeFrom(T.scene);
  T.type = type;
  T.specimen = new Enemy(T.scene, type, 0, 0, 1, 1);
  T.respawnT = 0;
  T.splatDone = false;
}
function testerLoop(ts) {
  const T = tester;
  if (!T || !T.running) return;
  requestAnimationFrame(testerLoop);
  const dt = Math.min(0.05, (ts - T.last) / 1000 || 0.016);
  T.last = ts;
  T.t += dt;
  GOO_TIME.value += dt; // keep goo wobble alive while the game clock is paused
  T.ghost.x = Math.sin(T.t * 0.5) * 4;
  T.ghost.z = Math.cos(T.t * 0.65) * 2.6;
  const s = T.specimen;
  if (s) {
    if (s.alive) s.update(dt, T.ghost, T.stubBullets, 11, 7);
    s.updateDeath(dt);
    // Drain the enemy's queued FX (death chunks, BAMBU/PYRA hit chunks) into
    // the tester's droplet system so HIT/KILL actually splatter here.
    if (s.chunks && s.chunks.length) {
      for (const c of s.chunks) testerBurst(c.x, c.y, c.z, CFG[s.type].color, 1, 1.1);
      s.chunks.length = 0;
    }
    if (s._hitChunks && s._hitChunks.length) {
      for (const c of s._hitChunks) testerBurst(c.x, c.y, c.z, c.color, 1, 0.8);
      s._hitChunks.length = 0;
    }
    if (!s.alive && !T.splatDone) {
      T.splatDone = true;
      testerSplat(s.position.x, s.position.z, CFG[s.type].color, 0.9 + s.radius);
    }
    if (!s.alive && !s._dying) {
      T.respawnT += dt;
      if (T.respawnT > 1.1) testerSpawn(T.type);
    }
  }
  // Droplet physics: gravity, floor squash-stop, shrink out.
  for (let i = T.fx.length - 1; i >= 0; i--) {
    const f = T.fx[i];
    f.life -= dt;
    if (!f.splat) {
      f.vy -= 12 * dt;
      f.m.position.x += f.vx * dt;
      f.m.position.y = Math.max(0.04, f.m.position.y + f.vy * dt);
      f.m.position.z += f.vz * dt;
      if (f.m.position.y <= 0.05) { f.vx *= 0.5; f.vz *= 0.5; f.vy = 0; }
      f.m.scale.multiplyScalar(Math.max(0, Math.min(1, f.life * 2.2)) ** 0.08);
    } else {
      f.m.material.opacity = 0.5 * Math.max(0, f.life / 2.2);
    }
    if (f.life <= 0) { T.scene.remove(f.m); f.m.material.dispose(); T.fx.splice(i, 1); }
  }
  T.renderer.render(T.scene, T.camera);
}
function testerStart() {
  const T = ensureTester();
  if (T.running) return;
  T.running = true;
  T.last = performance.now();
  requestAnimationFrame(testerLoop);
}
function testerStop() {
  if (!tester) return;
  tester.running = false;
  if (tester.specimen) { tester.specimen.removeFrom(tester.scene); tester.specimen = null; tester.type = null; }
  for (const f of tester.fx) { tester.scene.remove(f.m); f.m.material.dispose(); }
  tester.fx.length = 0;
}

function setPath(obj, path, v) {
  const ks = path.split('.'); const last = ks.pop();
  const target = ks.reduce((o, k) => o?.[k], obj);
  if (target && typeof target === 'object') target[last] = v;
}
// Persistence stores only the paths the user actually touched (not the whole
// TUNING object), so future default changes in tuning.js aren't shadowed by
// stale saved copies of values the user never edited.
function loadTuningEdits() {
  try { return JSON.parse(localStorage.getItem('tokoTUNING')) || {}; }
  catch (_) { return {}; }
}

const TYPE_NAMES = {
  [EnemyType.GLOBBO]:      'GLOBBO',
  [EnemyType.SPITTOR]:     'SPITTOR',
  [EnemyType.FANNER]:      'FANNER',
  [EnemyType.WEEVA]:       'WEEVA',
  [EnemyType.SPLITTA]:     'SPLITTA',
  [EnemyType.YELA_CUBE]:   'YELA CUBE',
  [EnemyType.ORANGE_CUBE]: 'ORANGE CUBE',
  [EnemyType.SLUDGE_CUBE]: 'SLUDGE CUBE',
  [EnemyType.REDD_CUBE]:   'REDD CUBE',
  [EnemyType.PURP_CUBE]:   'PURP CUBE',
  [EnemyType.REDD_MINI]:   'REDD MINI',
  [EnemyType.PURP_MINI]:   'PURP MINI',
  [EnemyType.TORO]:        'TORO',
  [EnemyType.BAMBU]:       'BAMBU',
  [EnemyType.PYRA]:        'PYRA',
  [EnemyType.OMEGA]:       'OMEGA (boss)',
  [EnemyType.BOTFLY]:      'BOTFLY',
  [EnemyType.WARDEN]:      'WARDEN',
  [EnemyType.BULWARK]:     'BULWARK',
  [EnemyType.SIREN]:       'SIREN',
};

const ALL_TYPES = Object.values(EnemyType);

function toHex(n) { return '#' + (n ?? 0).toString(16).padStart(6, '0'); }
function fmt(v, step) { return step < 1 ? v.toFixed(2) : Math.round(v).toString(); }

function saveCFG() {
  const data = {};
  for (const [k, v] of Object.entries(CFG)) {
    data[k] = { color: v.color, radius: v.radius, speed: v.speed, hp: v.hp,
                bulletColor: v.bulletColor, fireInterval: v.fireInterval };
  }
  localStorage.setItem('tokoCFG', JSON.stringify(data));
}

function loadCFG() {
  const raw = localStorage.getItem('tokoCFG');
  if (!raw) return;
  try {
    const saved = JSON.parse(raw);
    for (const [k, v] of Object.entries(saved)) {
      // v104: `_bulletSpeed` from old saves is deliberately IGNORED. The global
      // Bullet Speed slider (removed in v103) persisted it, and a stale low
      // value kept restoring on boot — enemy bullets crawled and expired
      // mid-arena with no visible way to fix it. Bullets always use the
      // built-in speed now.
      if (k === '_bulletSpeed') continue;
      const type = +k;
      if (!CFG[type]) continue;
      for (const field of ['color', 'radius', 'speed', 'hp', 'bulletColor', 'fireInterval']) {
        if (v[field] !== undefined) CFG[type][field] = v[field];
      }
    }
  } catch (_) { /* ignore corrupt data */ }
}

const CSS = `
  #dsgn {
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(4, 4, 14, 0.94);
    display: none; flex-direction: column;
    font-family: monospace; color: #bbb;
    z-index: 50; user-select: none;
  }
  #dsgn .dh {
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 18px; height: 50px;
    border-bottom: 1px solid #141428; flex-shrink: 0;
  }
  #dsgn .dtitle { font-size: 14px; font-weight: bold; letter-spacing: 4px; color: #8888aa; }
  #dsgn .dbody { display: flex; flex: 1; overflow: hidden; min-height: 0; }
  #dsgn .dlist {
    width: 170px; overflow-y: auto; border-right: 1px solid #141428;
    padding: 6px 0; flex-shrink: 0;
  }
  #dsgn .dit {
    display: flex; align-items: center; gap: 9px;
    padding: 7px 14px; cursor: pointer;
    font-size: 11px; letter-spacing: 1px; color: #555; transition: color .1s;
  }
  #dsgn .dit:hover { color: #aaa; }
  #dsgn .dit.on   { color: #fff; background: rgba(255,255,255,.04); }
  #dsgn .ddot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
  #dsgn .ddiv { border-bottom: 1px solid #141428; margin: 6px 0; }
  #dsgn .dgroup {
    font-size: 8px; letter-spacing: 3px; color: #2e2e50;
    padding: 8px 14px 3px;
  }
  #dsgn .dcnt { flex: 1; overflow-y: auto; padding: 16px 24px 32px; }
  #dsgn .dsec {
    font-size: 9px; letter-spacing: 3px; color: #2e2e50;
    margin: 20px 0 10px; padding-bottom: 5px; border-bottom: 1px solid #0e0e1e;
  }
  #dsgn .dsec:first-child { margin-top: 4px; }
  #dsgn .drow { display: flex; align-items: center; gap: 10px; margin-bottom: 11px; }
  #dsgn .dlbl { width: 148px; font-size: 11px; color: #666; flex-shrink: 0; }
  #dsgn .dval { width: 40px; text-align: right; font-size: 11px; color: #888; flex-shrink: 0; }
  #dsgn input[type=range] { flex: 1; accent-color: #00ccaa; cursor: pointer; height: 3px; }
  #dsgn input[type=color] {
    width: 32px; height: 22px; border: 1px solid #1e1e38;
    border-radius: 3px; cursor: pointer; padding: 1px; background: #000;
  }
  #dsgn .dnote { font-size: 10px; color: #333; margin: -4px 0 10px 158px; }
  #dsgn .dbtn {
    background: none; border: 1px solid #1e1e38; color: #666;
    font-family: monospace; font-size: 11px; letter-spacing: 2px;
    padding: 5px 14px; cursor: pointer; border-radius: 2px;
  }
  #dsgn .dbtn:hover { color: #ccc; border-color: #444; }
  #dsgn .dxbtn { border-color: #00ccaa44; color: #00ccaa; background: #00ccaa0d; }
  #dsgn .dxbtn:hover { background: #00ccaa1a; }
  #dsgn .dout {
    margin-top: 10px; width: 100%; height: 150px;
    background: #020208; border: 1px solid #141428;
    color: #00ccaa; font-family: monospace; font-size: 9.5px;
    padding: 8px; resize: vertical; display: none;
  }
`;

export function initDesigner({ onResume, settings }) {
  loadCFG();
  // Re-apply persisted TUNING edits (touched paths only) onto the defaults.
  const tuningEdits = loadTuningEdits();
  for (const [p, v] of Object.entries(tuningEdits)) setPath(TUNING, p, v);
  const saveTuning = (path, v) => {
    tuningEdits[path] = v;
    localStorage.setItem('tokoTUNING', JSON.stringify(tuningEdits));
  };
  // Opens on SETTINGS — players pausing mid-run mostly want volume/motion;
  // the enemy-tuning pages are one tap away in the same list.
  let selectedType = SETTINGS_PAGE;

  // ── Inject styles ─────────────────────────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  // ── Build panel ───────────────────────────────────────────────────────────────
  // This doubles as the real pause menu, so it's framed as one (PAUSED) rather
  // than a raw dev tool — the enemy-tuning list/sliders stay for now (revisit
  // separately); the VISUAL tab (shader-uniform tuning) was removed since
  // real players pausing mid-run have no use for a Specular Sharpness slider.
  const panel = document.createElement('div');
  panel.id = 'dsgn';
  panel.innerHTML = `
    <div class="dh">
      <span class="dtitle">PAUSED</span>
      <button class="dbtn" id="d-reset">↺  RESET</button>
      <button class="dbtn" id="d-resume">✕  RESUME</button>
    </div>
    <div class="dbody">
      <div class="dlist" id="d-list"></div>
      <div class="dcnt"  id="d-cnt"></div>
    </div>
  `;
  document.body.appendChild(panel);

  panel.querySelector('#d-reset').addEventListener('click', () => {
    localStorage.removeItem('tokoCFG');
    localStorage.removeItem('tokoTUNING');
    location.reload();
  });

  panel.querySelector('#d-resume').addEventListener('click', () => {
    hide(); onResume();
  });

  // ── Public ────────────────────────────────────────────────────────────────────
  function show(label = 'PAUSED') {
    panel.querySelector('.dtitle').textContent = label; // "OPTIONS" when opened from the title
    selectedType = SETTINGS_PAGE; // always land on the simple settings view
    renderList();
    renderControls();
    panel.style.display = 'flex';
  }

  function hide() {
    testerStop(); // specimen + its render loop end with the menu
    panel.style.display = 'none';
  }

  // ── Enemy list (tester mode only) ─────────────────────────────────────────────
  function renderList() {
    const list = panel.querySelector('#d-list');
    list.innerHTML = '';

    const addItem = (key, html) => {
      const item = document.createElement('div');
      item.className = 'dit' + (key === selectedType ? ' on' : '');
      item.innerHTML = html;
      item.addEventListener('click', () => {
        selectedType = key;
        if (key === SETTINGS_PAGE) { renderList(); }
        panel.querySelectorAll('.dit').forEach(el => el.classList.toggle('on', el === item));
        renderControls();
      });
      list.appendChild(item);
    };

    addItem(SETTINGS_PAGE, `<span style="width:9px;flex-shrink:0">←</span>${t('settings')}`);
    const grp = document.createElement('div');
    grp.className = 'dgroup';
    grp.textContent = 'ENEMIES';
    list.appendChild(grp);
    for (const type of ALL_TYPES) {
      addItem(type,
        `<span class="ddot" style="background:${toHex(CFG[type].color)}"></span>` +
        TYPE_NAMES[type]);
    }
  }

  // ── Controls: settings view hides the sidebar; tester view shows it ───────────
  function renderControls() {
    const el = panel.querySelector('#d-cnt');
    const list = panel.querySelector('#d-list');
    el.innerHTML = '';
    if (selectedType === SETTINGS_PAGE) {
      list.style.display = 'none';
      testerStop();
      renderSettings(el);
    } else {
      list.style.display = '';
      renderGameplay(el);
    }
  }

  // ── Material presets/sliders + TUNING JSON round-trip (shared section) ────────
  // ── Shared "LOOK" section: one-tap gel styles + a single feedback button ─────
  function renderLook(el) {
    el.appendChild(sec('LOOK — CHANGES EVERY ENEMY'));
    const presetRow = document.createElement('div');
    presetRow.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;margin-bottom:6px';
    for (const name of Object.keys(TUNING.material.presets)) {
      const b = document.createElement('button');
      b.className = 'dbtn';
      b.textContent = name.toUpperCase();
      b.addEventListener('click', () => {
        applyMaterialPreset(name);
        for (const k of ['sss', 'roughness', 'clearcoat', 'sheen', 'transmission']) {
          saveTuning(`material.${k}`, TUNING.material[k]);
        }
        applySatinValues();
      });
      presetRow.appendChild(b);
    }
    el.appendChild(presetRow);
    el.appendChild(note('tap a style — the enemy above (and the whole game) changes instantly'));

    // One button for development feedback: copies the current numbers so they
    // can be pasted into a message ("this is how I tuned it").
    el.appendChild(sec('FEEDBACK'));
    const copyBtn = document.createElement('button');
    copyBtn.className = 'dbtn dxbtn';
    copyBtn.textContent = 'COPY MY SETTINGS';
    copyBtn.addEventListener('click', async () => {
      const cfgOut = {};
      for (const [name, type] of Object.entries(EnemyType)) {
        const c = CFG[type];
        cfgOut[name] = { speed: +c.speed.toFixed(2), hp: c.hp,
                         fireInterval: c.fireInterval === null ? null : +c.fireInterval.toFixed(2) };
      }
      const M = TUNING.material;
      const text = JSON.stringify({
        enemies: cfgOut,
        look: { sss: M.sss, roughness: M.roughness, clearcoat: M.clearcoat, sheen: M.sheen, transmission: M.transmission },
      }, null, 1);
      try { await navigator.clipboard.writeText(text); copyBtn.textContent = 'COPIED ✓'; }
      catch (_) { prompt('Copy this:', text); }
      setTimeout(() => { copyBtn.textContent = 'COPY MY SETTINGS'; }, 1500);
    });
    el.appendChild(copyBtn);
    el.appendChild(note('copies your tuned numbers to the clipboard — paste them into feedback'));
  }

  // ── Settings page (moved here from the title screen in v81) ───────────────────
  function renderSettings(el) {
    el.appendChild(sec('AUDIO'));
    el.appendChild(slider(t('volume'), 0, 100, 5, Math.round(settings.getVolume() * 100), v => {
      settings.setVolume(v / 100);
    }));
    // v137: the announcer has its own loudness — independent of the master.
    el.appendChild(slider(t('annVolume'), 0, 100, 5, Math.round(settings.getAnnVol() * 100), v => {
      settings.setAnnVol(v / 100);
    }));

    // GAME SHOW (v109): SMASH TV door-rush mode + the arcade announcer.
    el.appendChild(sec('GAME SHOW'));
    const toggleRow = (label, get, set, onH, offH, onColor, onBorder) => {
      const row = document.createElement('div');
      row.className = 'drow';
      const lbl = document.createElement('span');
      lbl.className = 'dlbl'; lbl.textContent = label;
      const btn = document.createElement('button');
      btn.className = 'dbtn';
      const hint = document.createElement('div');
      hint.className = 'dnote';
      const paint = () => {
        const on = get();
        btn.textContent = on ? t('on') : t('off');
        btn.style.color = on ? onColor : '#666';
        btn.style.borderColor = on ? onBorder : '#1e1e38';
        hint.textContent = on ? onH : offH;
      };
      paint();
      btn.addEventListener('click', () => { set(!get()); paint(); });
      row.appendChild(lbl); row.appendChild(btn);
      el.appendChild(row);
      el.appendChild(hint);
    };
    toggleRow(t('smashTV'), settings.getSmash, settings.setSmash,
      t('smashOnH'), t('smashOffH'), '#ffdd66', '#ffcc4466');
    toggleRow(t('announcer'), settings.getAnnouncer, settings.setAnnouncer,
      t('annOnH'), t('annOffH'), '#ff88dd', '#ff66cc66');
    toggleRow(t('introVoice'), settings.getIntroVoice, settings.setIntroVoice,
      t('introOnH'), t('introOffH'), '#ffdd44', '#ffcc4466');

    el.appendChild(sec('MOTION'));
    {
      const row = document.createElement('div');
      row.className = 'drow';
      const lbl = document.createElement('span');
      lbl.className = 'dlbl'; lbl.textContent = t('reduceMotion');
      const btn = document.createElement('button');
      btn.className = 'dbtn';
      const hint = document.createElement('div');
      hint.className = 'dnote';
      const paint = () => {
        const on = settings.getReduceMotion();
        btn.textContent = on ? t('on') : t('off');
        btn.style.color = on ? '#ffbb88' : '#666';
        btn.style.borderColor = on ? '#ff884466' : '#1e1e38';
        hint.textContent = on ? t('reduceMotionOnH') : t('reduceMotionOffH');
      };
      paint();
      btn.addEventListener('click', () => { settings.setReduceMotion(!settings.getReduceMotion()); paint(); });
      row.appendChild(lbl); row.appendChild(btn);
      el.appendChild(row);
      el.appendChild(hint);
    }

    el.appendChild(sec('ENEMY TESTER'));
    {
      const btn = document.createElement('button');
      btn.className = 'dbtn dxbtn';
      btn.textContent = 'OPEN ENEMY TESTER →';
      btn.addEventListener('click', () => {
        selectedType = ALL_TYPES[0];
        renderList();
        renderControls();
      });
      el.appendChild(btn);
      el.appendChild(note('watch any enemy up close, poke it, and tweak how it plays'));
    }

    el.appendChild(sec('PERFORMANCE'));
    {
      const row = document.createElement('div');
      row.className = 'drow';
      const lbl = document.createElement('span');
      lbl.className = 'dlbl'; lbl.textContent = t('perfMode');
      const btn = document.createElement('button');
      btn.className = 'dbtn';
      const hint = document.createElement('div');
      hint.className = 'dnote';
      const paint = () => {
        const on = settings.getPerf();
        btn.textContent = on ? t('on') : t('off');
        btn.style.color = on ? '#88ffbb' : '#666';
        btn.style.borderColor = on ? '#44cc8866' : '#1e1e38';
        hint.textContent = on ? t('perfOnH') : t('perfOffH');
      };
      paint();
      btn.addEventListener('click', () => { settings.setPerf(!settings.getPerf()); paint(); });
      row.appendChild(lbl); row.appendChild(btn);
      el.appendChild(row);
      el.appendChild(hint);
    }

  }

  // ── Enemy page: live specimen tester + tuning sliders ────────────────────────
  function renderGameplay(el) {
    const cfg = CFG[selectedType];

    // Specimen viewport — the selected enemy runs live in its own mini scene.
    const T = ensureTester();
    T.canvas.style.cssText =
      'width:100%;max-width:520px;display:block;border:1px solid #141428;border-radius:4px;margin-bottom:8px';
    el.appendChild(T.canvas);
    if (T.type !== selectedType || !T.specimen) testerSpawn(selectedType);
    testerStart();
    const dbgRow = document.createElement('div');
    dbgRow.style.cssText = 'display:flex;gap:10px;margin-bottom:14px';
    const mkDbg = (label, fn) => {
      const b = document.createElement('button');
      b.className = 'dbtn';
      b.textContent = label;
      b.addEventListener('click', fn);
      dbgRow.appendChild(b);
    };
    mkDbg('HIT', () => {
      const s = T.specimen;
      if (s && s.alive) {
        const a = Math.random() * Math.PI * 2;
        const ix = s.position.x + Math.cos(a), iz = s.position.z + Math.sin(a);
        s.hit(ix, iz);
        testerBurst(ix, s.fxY + 0.1, iz, CFG[selectedType].color, 4, 0.8); // impact spark
      }
    });
    mkDbg('KILL', () => { if (T.specimen && T.specimen.alive) T.specimen.destroy(); });
    mkDbg('RESPAWN', () => testerSpawn(selectedType));
    el.appendChild(dbgRow);

    function cfgSlider(label, min, max, step, key) {
      return slider(label, min, max, step, cfg[key], v => { CFG[selectedType][key] = v; saveCFG(); });
    }

    // Three plain-language knobs — everything else was dev noise.
    el.appendChild(sec('TWEAK THIS ENEMY'));
    if (cfg.speed > 0) el.appendChild(cfgSlider('Speed', 0, 12, 0.1, 'speed'));
    el.appendChild(cfgSlider('Health (hits to kill)', 1, 20, 1, 'hp'));
    if (cfg.fireInterval !== null) {
      el.appendChild(cfgSlider('Seconds between attacks', 0.05, 10, 0.05, 'fireInterval'));
    }
    el.appendChild(note('changes apply to the real game too — RESET (top) restores everything'));

    renderLook(el);
  }

  // ── DOM helpers ───────────────────────────────────────────────────────────────
  function sec(label) {
    const d = document.createElement('div');
    d.className = 'dsec'; d.textContent = label;
    return d;
  }

  function note(text) {
    const d = document.createElement('div');
    d.className = 'dnote'; d.textContent = text;
    return d;
  }

  function slider(label, min, max, step, value, onChange) {
    const row = document.createElement('div');
    row.className = 'drow';

    const lbl = document.createElement('span');
    lbl.className = 'dlbl'; lbl.textContent = label;

    const inp = document.createElement('input');
    inp.type = 'range'; inp.min = min; inp.max = max; inp.step = step; inp.value = value;

    const val = document.createElement('span');
    val.className = 'dval'; val.textContent = fmt(+value, step);

    inp.addEventListener('input', () => {
      const v = parseFloat(inp.value);
      val.textContent = fmt(v, step);
      onChange(v);
    });

    row.appendChild(lbl); row.appendChild(inp); row.appendChild(val);
    return row;
  }

  return { show, hide };
}
