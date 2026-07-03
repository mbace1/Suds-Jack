import * as THREE from 'three';
import { CFG, EnemyType, Enemy, GOO_TIME, applySatinValues } from './enemy.js?v=56';
import { BULLET_CONFIG } from './bullet.js?v=56';
import { t } from './lang.js?v=56';
import { TUNING, applyMaterialPreset } from './tuning.js?v=56';

// Sentinel for the non-enemy SETTINGS page in the pause-menu list.
const SETTINGS_PAGE = 'settings';

// ── Material sliders (shared across every enemy page) ────────────────────────
// material.* edits restyle already-spawned enemies via applySatinValues().
const MATERIAL_ROWS = [
  ['material.sss',          'SSS Glow',      0,  1.5, 0.05],
  ['material.roughness',    'Roughness',     0,  1,   0.01],
  ['material.clearcoat',    'Clearcoat',     0,  1,   0.02],
  ['material.sheen',        'Sheen',         0,  1,   0.02],
  ['material.transmission', 'Transmission',  0,  0.9, 0.02],
];

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
  };
  return tester;
}
function testerSpawn(type) {
  const T = ensureTester();
  if (T.specimen) T.specimen.removeFrom(T.scene);
  T.type = type;
  T.specimen = new Enemy(T.scene, type, 0, 0, 1, 1);
  T.respawnT = 0;
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
    if (!s.alive && !s._dying) {
      T.respawnT += dt;
      if (T.respawnT > 1.1) testerSpawn(T.type);
    }
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
}

function getPath(obj, path) { return path.split('.').reduce((o, k) => o?.[k], obj); }
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
  data._bulletSpeed = BULLET_CONFIG.enemySpeed;
  localStorage.setItem('tokoCFG', JSON.stringify(data));
}

function loadCFG() {
  const raw = localStorage.getItem('tokoCFG');
  if (!raw) return;
  try {
    const saved = JSON.parse(raw);
    for (const [k, v] of Object.entries(saved)) {
      if (k === '_bulletSpeed') { BULLET_CONFIG.enemySpeed = v; continue; }
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
  function show() {
    renderList();
    renderControls();
    panel.style.display = 'flex';
  }

  function hide() {
    testerStop(); // specimen + its render loop end with the menu
    panel.style.display = 'none';
  }

  // ── Menu list: SETTINGS page, then the enemy-tuning pages ─────────────────────
  function renderList() {
    const list = panel.querySelector('#d-list');
    list.innerHTML = '';

    const addItem = (key, html) => {
      const item = document.createElement('div');
      item.className = 'dit' + (key === selectedType ? ' on' : '');
      item.innerHTML = html;
      item.addEventListener('click', () => {
        selectedType = key;
        panel.querySelectorAll('.dit').forEach(el => el.classList.toggle('on', el === item));
        renderControls();
      });
      list.appendChild(item);
    };

    addItem(SETTINGS_PAGE, `<span style="width:9px;flex-shrink:0">⚙</span>${t('settings')}`);

    const div = document.createElement('div');
    div.className = 'ddiv';
    list.appendChild(div);
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

  // ── Controls ──────────────────────────────────────────────────────────────────
  function renderControls() {
    const el = panel.querySelector('#d-cnt');
    el.innerHTML = '';
    if (selectedType === SETTINGS_PAGE) { testerStop(); renderSettings(el); }
    else renderGameplay(el);
  }

  // ── Material presets/sliders + TUNING JSON round-trip (shared section) ────────
  function renderMaterialAndExport(el) {
    // Material preset chips (v90) — apply a named look onto TUNING.material
    // and restyle every gel enemy (specimen included) instantly.
    el.appendChild(sec('MATERIAL PRESETS'));
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
        renderControls(); // refresh the material sliders to the preset values
      });
      presetRow.appendChild(b);
    }
    el.appendChild(presetRow);

    for (const [path, label, min, max, step] of MATERIAL_ROWS) {
      el.appendChild(slider(label, min, max, step, getPath(TUNING, path), v => {
        setPath(TUNING, path, v);
        saveTuning(path, v);
        applySatinValues();
      }));
    }

    // Copy / paste the whole TUNING JSON (geometry & spawn-time values included
    // — those apply to newly spawned enemies).
    el.appendChild(sec('EXPORT / IMPORT'));
    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:10px';
    const out = document.createElement('textarea');
    out.className = 'dout';
    out.style.display = 'block'; // always visible here — it's also the paste target
    const copyBtn = document.createElement('button');
    copyBtn.className = 'dbtn dxbtn';
    copyBtn.textContent = 'COPY TUNING JSON';
    copyBtn.addEventListener('click', () => {
      out.value = JSON.stringify(TUNING, null, 2);
      out.select();
    });
    const applyBtn = document.createElement('button');
    applyBtn.className = 'dbtn';
    applyBtn.textContent = 'APPLY PASTED JSON';
    applyBtn.addEventListener('click', () => {
      try {
        const merge = (dst, src, prefix) => {
          for (const [k, v] of Object.entries(src)) {
            if (v && typeof v === 'object' && !Array.isArray(v) && dst[k] && typeof dst[k] === 'object') {
              merge(dst[k], v, `${prefix}${k}.`);
            } else if (k in dst) {
              dst[k] = v;
              if (typeof v === 'number') saveTuning(`${prefix}${k}`, v);
            }
          }
        };
        merge(TUNING, JSON.parse(out.value), '');
        renderControls(); // refresh sliders to the imported values
      } catch (_) {
        out.value = '// paste valid TUNING JSON above, then APPLY\n' + out.value;
      }
    });
    const labBtn = document.createElement('button');
    labBtn.className = 'dbtn';
    labBtn.textContent = 'OPEN FULL LAB ↗';
    labBtn.addEventListener('click', () => window.open('enemy-lab.html', '_blank'));
    btnRow.appendChild(copyBtn);
    btnRow.appendChild(applyBtn);
    btnRow.appendChild(labBtn);
    el.appendChild(btnRow);
    el.appendChild(out);
  }

  // ── Settings page (moved here from the title screen in v81) ───────────────────
  function renderSettings(el) {
    el.appendChild(sec('AUDIO'));
    el.appendChild(slider(t('volume'), 0, 100, 5, Math.round(settings.getVolume() * 100), v => {
      settings.setVolume(v / 100);
    }));

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
        s.hit(s.position.x + Math.cos(a), s.position.z + Math.sin(a));
      }
    });
    mkDbg('KILL', () => { if (T.specimen && T.specimen.alive) T.specimen.destroy(); });
    mkDbg('RESPAWN', () => testerSpawn(selectedType));
    el.appendChild(dbgRow);

    function cfgSlider(label, min, max, step, key) {
      return slider(label, min, max, step, cfg[key], v => { CFG[selectedType][key] = v; saveCFG(); });
    }

    el.appendChild(sec('MOVEMENT'));
    el.appendChild(cfgSlider('Move Speed', 0, 12, 0.1, 'speed'));

    el.appendChild(sec('COMBAT'));
    el.appendChild(cfgSlider('HP', 1, 20, 1, 'hp'));
    if (selectedType === EnemyType.BAMBU || selectedType === EnemyType.PYRA) {
      const row = document.createElement('div');
      row.className = 'drow';
      const lbl = document.createElement('span');
      lbl.className = 'dlbl'; lbl.textContent = 'Hitbox Radius';
      const val = document.createElement('span');
      val.style.flex = '1'; val.style.fontSize = '11px'; val.style.color = '#444';
      val.textContent = 'computed from geometry';
      row.appendChild(lbl); row.appendChild(val);
      el.appendChild(row);
    } else {
      el.appendChild(cfgSlider('Hitbox Radius', 0.15, 2.5, 0.05, 'radius'));
      el.appendChild(note('(live — affects collision; visual size changes on next spawn)'));
    }

    if (cfg.fireInterval !== null) {
      el.appendChild(sec('FIRING'));
      el.appendChild(cfgSlider('Fire Interval (s)', 0.05, 10, 0.05, 'fireInterval'));
    }

    el.appendChild(sec('GLOBAL — ALL ENEMIES'));
    el.appendChild(slider('Bullet Speed', 1, 20, 0.5, BULLET_CONFIG.enemySpeed, v => {
      BULLET_CONFIG.enemySpeed = v; saveCFG();
    }));

    el.appendChild(mkExport());
    renderMaterialAndExport(el);
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

  function mkExport() {
    const wrap = document.createElement('div');
    wrap.style.marginTop = '28px';

    const btn = document.createElement('button');
    btn.className = 'dbtn dxbtn'; btn.textContent = 'EXPORT CFG';

    const out = document.createElement('textarea');
    out.className = 'dout'; out.readOnly = true;

    btn.addEventListener('click', () => {
      const lines = Object.entries(EnemyType).map(([name, type]) => {
        const c  = CFG[type];
        const col = '0x' + c.color.toString(16).padStart(6, '0');
        const bc  = c.bulletColor != null
          ? '0x' + c.bulletColor.toString(16).padStart(6, '0') : 'null';
        const fi = c.fireInterval !== null ? c.fireInterval.toFixed(2) : 'null';
        return `  [EnemyType.${name}]: { color: ${col}, radius: ${c.radius.toFixed(2)}, speed: ${c.speed.toFixed(1)}, hp: ${c.hp}, bulletColor: ${bc}, fireInterval: ${fi} },`;
      });
      out.value = `export const CFG = {\n${lines.join('\n')}\n};\n\n// BULLET_CONFIG.enemySpeed: ${BULLET_CONFIG.enemySpeed}`;
      out.style.display = 'block';
      out.select();
    });

    wrap.appendChild(btn); wrap.appendChild(out);
    return wrap;
  }

  return { show, hide };
}
