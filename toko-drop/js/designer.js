import { CFG, EnemyType } from './enemy.js?v=33';
import { BULLET_CONFIG } from './bullet.js?v=33';

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

export function initDesigner({ onResume }) {
  loadCFG();
  let selectedType = EnemyType.GLOBBO;

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
    panel.style.display = 'none';
  }

  // ── Enemy list ────────────────────────────────────────────────────────────────
  function renderList() {
    const list = panel.querySelector('#d-list');
    list.innerHTML = '';
    for (const type of ALL_TYPES) {
      const item = document.createElement('div');
      item.className = 'dit' + (type === selectedType ? ' on' : '');
      item.innerHTML =
        `<span class="ddot" style="background:${toHex(CFG[type].color)}"></span>` +
        TYPE_NAMES[type];
      item.addEventListener('click', () => {
        selectedType = type;
        panel.querySelectorAll('.dit').forEach(el => el.classList.toggle('on', el === item));
        renderControls();
      });
      list.appendChild(item);
    }
  }

  // ── Controls ──────────────────────────────────────────────────────────────────
  function renderControls() {
    const el = panel.querySelector('#d-cnt');
    el.innerHTML = '';
    renderGameplay(el);
  }

  // ── Enemy tuning ──────────────────────────────────────────────────────────────
  function renderGameplay(el) {
    const cfg = CFG[selectedType];

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
