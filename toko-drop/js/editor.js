// editor.js — the level editor, mounted OVER the real game.
//
// v237 (LEVEL_EDITOR_DESIGN.md §3/§5, owner's three requirements). It is not
// a page of its own: index.html?editor boots the ordinary game and then mounts
// this on top of it. The arena you tap is the real floor under the real
// camera, the ghosts are drawn into the real scene, and PLAY hands the level
// to the real spawn pump. Rebuild-on-real-code is the settled principle here
// (v216 rebuilt the enemy lab for the same reason) and an editor that is not
// the game would lie about where things land.
//
// Layout is the owner's: drop-downs along the TOP (enemies / pickups / rules /
// level), the arena in the middle (tap to place), a scrollable 0.1s timeline
// along the BOTTOM. Touch-first: choose-then-tap, no dragging on the arena
// (dragging fights page scroll on a phone); the timeline scrolls natively.
//
// main.js gives this a small hooks object and gets back a small API. The
// editor never reaches into game state directly — everything it needs from
// the game arrives through hooks, and everything it asks of the game goes
// back through them. window.__ed is the same API, for the gate and the console.

import * as THREE from 'three';
import * as L from './level.js?v=192';
import { TUNING } from './tuning.js?v=192';

const STORE_KEY = 'tokoDropLevels';
const ZOOMS = [30, 60, 120, 240];          // px per second on the timeline
const PICK_R = 1.25;                        // world units: tap this close to select
const TAP_PX = 14, TAP_MS = 500;            // a tap, as opposed to a scroll

const CSS = `
  #tded { position: fixed; inset: 0; pointer-events: none; z-index: 40;
    font-family: monospace; color: #cfd0e0; user-select: none; -webkit-user-select: none; }
  #tded * { box-sizing: border-box; }
  #tded .ed-top, #tded .ed-bot { pointer-events: auto; position: absolute; left: 0; right: 0;
    background: rgba(4,4,14,0.92); border-color: #1a1a30; }
  #tded .ed-top { top: 0; padding: 6px 8px 6px 58px; display: flex; flex-wrap: wrap; gap: 6px; align-items: center;
    border-bottom: 1px solid; min-height: 44px; }
  #tded .ed-bot { bottom: 0; border-top: 1px solid; padding: 4px 8px 6px; display: flex; flex-direction: column; gap: 4px; }
  #tded select, #tded button, #tded input { font: inherit; font-size: 12px; letter-spacing: 1px; color: #dde;
    background: #0e0e1e; border: 1px solid #2a2a48; border-radius: 4px; padding: 0 10px; min-height: 36px; }
  #tded select { max-width: 42vw; }
  #tded button { cursor: pointer; }
  #tded button:active { background: #1a1a34; }
  #tded button.on { color: #ffdd44; border-color: #ffdd4488; }
  #tded button.warn { color: #ff7788; }
  #tded input[type=number] { width: 72px; }
  #tded .ed-tool { font-size: 11px; color: #ffdd44; letter-spacing: 1px; margin-left: auto; text-align: right; }
  #tded .ed-status { font-size: 11px; color: #8a8ab0; letter-spacing: 1px; display: flex; gap: 12px; flex-wrap: wrap; align-items: center; min-height: 18px; }
  #tded .ed-status b { color: #cfd0e0; font-weight: normal; }
  #tded .ed-insp { display: none; gap: 6px; align-items: center; font-size: 11px; flex-wrap: wrap; }
  #tded .ed-insp.on { display: flex; }
  #tded .ed-insp .who { color: #ffdd44; letter-spacing: 1px; margin-right: 4px; }
  #tded .ed-tlrow { display: flex; gap: 6px; align-items: stretch; }
  #tded .ed-tl { flex: 1; overflow-x: auto; overflow-y: hidden; touch-action: pan-x; border: 1px solid #1a1a30;
    border-radius: 4px; background: #07070f; height: 64px; }
  #tded .ed-tl canvas { display: block; height: 62px; }
  #tded .ed-tlbtns { display: flex; flex-direction: column; gap: 4px; }
  #tded .ed-tlbtns button { min-height: 29px; padding: 0 8px; }
  #tded .ed-play { font-weight: bold; color: #66ffcc; border-color: #66ffcc66; min-width: 44px; }
  #tded .ed-modal { pointer-events: auto; position: absolute; inset: 0; background: rgba(0,0,0,0.7);
    display: none; align-items: center; justify-content: center; padding: 16px; }
  #tded .ed-modal.on { display: flex; }
  #tded .ed-card { background: #0b0b18; border: 1px solid #2a2a48; border-radius: 6px; padding: 14px;
    width: min(560px, 100%); max-height: 90vh; display: flex; flex-direction: column; gap: 10px; }
  #tded .ed-card h3 { margin: 0; font-size: 12px; letter-spacing: 3px; color: #8888aa; font-weight: normal; }
  #tded .ed-card textarea { font: 11px/1.4 monospace; color: #cfd0e0; background: #06060e; border: 1px solid #2a2a48;
    border-radius: 4px; min-height: 200px; padding: 8px; resize: vertical; }
  #tded .ed-card .row { display: flex; gap: 6px; flex-wrap: wrap; }
  #tded .ed-card .list { display: flex; flex-direction: column; gap: 4px; max-height: 50vh; overflow-y: auto; }
  #tded .ed-card .list button { text-align: left; }
  #tded .ed-err { color: #ff7788; font-size: 11px; white-space: pre-wrap; }
  #tded .ed-hint { color: #55557a; font-size: 10px; letter-spacing: 1px; }
`;

const ENEMY_SKIP = /_MINI$/;   // spawned by their parents' deaths, not by a level

export function initEditor(hooks) {
  const { scene, camera, renderer, arena, EnemyType, CFG, pickups } = hooks;

  // ── state ─────────────────────────────────────────────────────────────
  let level = L.newLevel('UNTITLED');
  let playhead = 0;
  let zoom = 1;                       // index into ZOOMS
  let tool = null;                    // { kind:'enemy', name } | { kind:'pickup', id } | null
  let selected = -1;                  // index into level.spawns
  let moveArmed = false;
  let dirty = false;
  let active = false;                 // the editor UI is up and owns taps
  let inRun = false;                  // a level is being played right now
  let lastResult = null;
  let banner = '';

  const enemyNames = Object.keys(EnemyType).filter(n => !ENEMY_SKIP.test(n));
  const rushNames = Object.keys(TUNING.rush?.pool ?? {});
  const ctx = { typeNames: new Set(Object.keys(EnemyType)), pickupIds: new Set(pickups.map(p => p.id)) };
  const pickupColor = Object.fromEntries(pickups.map(p => [p.id, p.color]));

  // ── DOM ───────────────────────────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);
  const root = document.createElement('div');
  root.id = 'tded';
  root.innerHTML = `
    <div class="ed-top">
      <select id="ed-enemy"></select>
      <select id="ed-pickup"></select>
      <select id="ed-rules"></select>
      <select id="ed-level"></select>
      <span class="ed-tool" id="ed-tool"></span>
    </div>
    <div class="ed-bot">
      <div class="ed-status" id="ed-status"></div>
      <div class="ed-insp" id="ed-insp">
        <span class="who" id="ed-who"></span>
        <button id="ed-tm">−0.1s</button><button id="ed-tp">+0.1s</button>
        <button id="ed-move">MOVE ⤢</button>
        <button id="ed-del" class="warn">DELETE</button>
        <button id="ed-desel">✕</button>
      </div>
      <div class="ed-tlrow">
        <div class="ed-tl" id="ed-tl"><canvas id="ed-tlc"></canvas></div>
        <div class="ed-tlbtns">
          <button class="ed-play" id="ed-play" title="play from the playhead">▶</button>
          <button id="ed-home" title="playhead to 0">⏮</button>
        </div>
        <div class="ed-tlbtns">
          <button id="ed-zin">+</button>
          <button id="ed-zout">−</button>
        </div>
      </div>
    </div>
    <div class="ed-modal" id="ed-modal"><div class="ed-card" id="ed-card"></div></div>
  `;
  document.body.appendChild(root);
  root.style.display = 'none';
  const $ = id => root.querySelector('#' + id);
  const elEnemy = $('ed-enemy'), elPickup = $('ed-pickup'), elRules = $('ed-rules'), elLevel = $('ed-level');
  const elTool = $('ed-tool'), elStatus = $('ed-status'), elInsp = $('ed-insp'), elWho = $('ed-who');
  const elTl = $('ed-tl'), tlc = $('ed-tlc'), tctx = tlc.getContext('2d');
  const elModal = $('ed-modal'), elCard = $('ed-card');

  // Menus: a <select> is the one drop-down that is native, keyboardable and
  // touch-friendly everywhere. Each one's first option is its own label, so
  // it reads as a menu heading when nothing is armed.
  function fillSelect(el, label, items) {
    el.innerHTML = '';
    const o0 = document.createElement('option');
    o0.value = ''; o0.textContent = label; el.appendChild(o0);
    for (const [v, txt] of items) {
      const o = document.createElement('option'); o.value = v; o.textContent = txt; el.appendChild(o);
    }
    el.value = '';
  }
  function refreshMenus() {
    const names = level.rules.mode === 'rush' && rushNames.length ? rushNames : enemyNames;
    fillSelect(elEnemy, 'ENEMIES ▾', names.map(n => [n, n]));
    fillSelect(elPickup, 'PICKUPS ▾', pickups.map(p => [p.id, p.label ?? p.id.toUpperCase()]));
    fillSelect(elRules, 'RULES ▾', [
      ...L.MODES.map(m => ['mode:' + m, `MODE: ${m.toUpperCase()}${level.rules.mode === m ? ' ●' : ''}`]),
      ...Object.keys(L.ARENAS).map(a => ['arena:' + a, `ARENA: ${a.toUpperCase()}${level.arena === a ? ' ●' : ''}`]),
      ['duration', `DURATION: ${L.fmtT(level.duration)}s…`],
    ]);
    fillSelect(elLevel, `LEVEL: ${level.name} ▾`, [
      ['new', 'NEW'], ['save', 'SAVE' + (dirty ? ' •' : '')], ['load', 'LOAD…'], ['rename', 'RENAME…'],
      ['export', 'EXPORT JSON…'], ['import', 'IMPORT JSON…'], ['clear', 'CLEAR SPAWNS'], ['leave', 'LEAVE EDITOR'],
    ]);
    if (tool?.kind === 'enemy') elEnemy.value = tool.name;
    if (tool?.kind === 'pickup') elPickup.value = tool.id;
  }
  elEnemy.addEventListener('change', () => { setTool(elEnemy.value ? { kind: 'enemy', name: elEnemy.value } : null); });
  elPickup.addEventListener('change', () => { setTool(elPickup.value ? { kind: 'pickup', id: elPickup.value } : null); });
  elRules.addEventListener('change', () => {
    const v = elRules.value; elRules.value = '';
    if (v.startsWith('mode:')) { level.rules.mode = v.slice(5); markDirty(); }
    else if (v.startsWith('arena:')) { level.arena = v.slice(6); markDirty(); hooks.enter(level); }
    else if (v === 'duration') {
      const d = parseFloat(prompt('Level duration in seconds', String(level.duration)) ?? '');
      if (Number.isFinite(d) && d > 0) { level.duration = Math.min(3600, L.quantize(d)); for (const s of level.spawns) s.t = Math.min(s.t, level.duration); markDirty(); }
    }
    refreshAll();
  });
  elLevel.addEventListener('change', () => {
    const v = elLevel.value; elLevel.value = '';
    ({ new: newLevel, save: save, load: showLoad, rename: rename, export: showExport, import: showImport,
       clear: clearSpawns, leave: leave })[v]?.();
  });

  function setTool(t) {
    tool = t; moveArmed = false;
    if (t) selected = -1;
    if (t?.kind !== 'enemy') elEnemy.value = '';
    if (t?.kind !== 'pickup') elPickup.value = '';
    refreshAll();
  }
  function markDirty() { dirty = true; banner = ''; }

  // ── the level ─────────────────────────────────────────────────────────
  function setLevel(lv) {
    level = lv; selected = -1; tool = null; moveArmed = false; dirty = false;
    playhead = Math.min(playhead, level.duration);
    hooks.enter(level);
    refreshAll();
  }
  function newLevel() {
    if (dirty && !confirm('Discard unsaved changes?')) return;
    setLevel(L.newLevel('UNTITLED'));
  }
  function clearSpawns() {
    if (!level.spawns.length || !confirm(`Remove all ${level.spawns.length} spawns?`)) return;
    level.spawns = []; selected = -1; markDirty(); refreshAll();
  }
  function rename() {
    const n = prompt('Level name', level.name);
    if (n && n.trim()) { level.name = n.trim().toUpperCase().slice(0, 40); level.id = L.slugify(level.name); markDirty(); refreshAll(); }
  }
  function readStore() { try { return JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); } catch (e) { return {}; } }
  function writeStore(s) { try { localStorage.setItem(STORE_KEY, JSON.stringify(s)); return true; } catch (e) { return false; } }
  function save() {
    const errs = L.validate(level, ctx);
    if (errs.length) { showText('CANNOT SAVE', errs.join('\n')); return false; }
    const s = readStore(); s[level.id] = L.serialize(level);
    if (!writeStore(s)) { showText('CANNOT SAVE', 'localStorage refused the write'); return false; }
    dirty = false; banner = `SAVED ${level.name}`; refreshAll(); return true;
  }
  function load(id) {
    if (id === '__example') { setLevel(JSON.parse(JSON.stringify(L.EXAMPLE_LEVEL))); return true; }
    const txt = readStore()[id];
    if (!txt) return false;
    try { setLevel(L.parse(txt, ctx)); return true; }
    catch (e) { showText('CANNOT LOAD', e.message); return false; }
  }
  function leave() {
    if (dirty && !confirm('Leave with unsaved changes?')) return;
    close(); hooks.leave();
  }

  // ── modals ────────────────────────────────────────────────────────────
  function openModal(html) { elCard.innerHTML = html; elModal.classList.add('on'); }
  function closeModal() { elModal.classList.remove('on'); }
  elModal.addEventListener('click', e => { if (e.target === elModal) closeModal(); });
  function showText(title, body) {
    openModal(`<h3>${title}</h3><div class="ed-err">${esc(body)}</div><div class="row"><button id="ed-mclose">CLOSE</button></div>`);
    elCard.querySelector('#ed-mclose').onclick = closeModal;
  }
  function showLoad() {
    const s = readStore();
    const ids = Object.keys(s);
    openModal(`<h3>LOAD</h3><div class="list" id="ed-ll"></div><div class="row"><button id="ed-mclose">CLOSE</button></div>`);
    const list = elCard.querySelector('#ed-ll');
    const add = (id, txt, del) => {
      const row = document.createElement('div'); row.className = 'row';
      const b = document.createElement('button'); b.textContent = txt; b.style.flex = '1';
      b.onclick = () => { if (dirty && !confirm('Discard unsaved changes?')) return; if (load(id)) closeModal(); };
      row.appendChild(b);
      if (del) { const d = document.createElement('button'); d.className = 'warn'; d.textContent = '✕';
        d.onclick = () => { if (!confirm(`Delete "${txt}"?`)) return; const st = readStore(); delete st[id]; writeStore(st); showLoad(); };
        row.appendChild(d); }
      list.appendChild(row);
    };
    add('__example', `${L.EXAMPLE_LEVEL.name}  (built in)`, false);
    // v239: the levels that ship in levels/ — the same files the Godot port
    // syncs, so a level loaded from here plays on both builds.
    for (const bid of L.BUNDLED) {
      const row = document.createElement('div'); row.className = 'row';
      const b = document.createElement('button'); b.textContent = `${bid}  (bundled)`; b.style.flex = '1';
      b.onclick = async () => {
        if (dirty && !confirm('Discard unsaved changes?')) return;
        try { setLevel(await hooks.fetchLevel(bid)); closeModal(); }
        catch (e) { showText('CANNOT LOAD', e.message); }
      };
      row.appendChild(b); list.appendChild(row);
    }
    for (const id of ids) {
      let name = id; try { name = JSON.parse(s[id]).name || id; } catch (e) {}
      add(id, name, true);
    }
    elCard.querySelector('#ed-mclose').onclick = closeModal;
  }
  function showExport() {
    const txt = L.serialize(level);
    openModal(`<h3>EXPORT — ${esc(level.name)}</h3><textarea id="ed-ta" readonly></textarea>
      <div class="row"><button id="ed-copy">COPY</button><button id="ed-mclose">CLOSE</button><span class="ed-hint" id="ed-ch"></span></div>`);
    const ta = elCard.querySelector('#ed-ta'); ta.value = txt;
    elCard.querySelector('#ed-copy').onclick = async () => {
      try { await navigator.clipboard.writeText(txt); elCard.querySelector('#ed-ch').textContent = 'copied'; }
      catch (e) { ta.focus(); ta.select(); elCard.querySelector('#ed-ch').textContent = 'select + copy by hand'; }
    };
    elCard.querySelector('#ed-mclose').onclick = closeModal;
  }
  function showImport() {
    openModal(`<h3>IMPORT</h3><textarea id="ed-ta" placeholder="paste a level JSON here"></textarea>
      <div class="ed-err" id="ed-ierr"></div>
      <div class="row"><button id="ed-iload">LOAD</button><button id="ed-mclose">CLOSE</button></div>`);
    elCard.querySelector('#ed-iload').onclick = () => {
      const r = importText(elCard.querySelector('#ed-ta').value);
      if (r === true) closeModal(); else elCard.querySelector('#ed-ierr').textContent = r;
    };
    elCard.querySelector('#ed-mclose').onclick = closeModal;
  }
  function importText(text) {
    try { setLevel(L.parse(text, ctx)); dirty = true; refreshAll(); return true; }
    catch (e) { return e.message; }
  }
  const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

  // ── ghosts in the scene ───────────────────────────────────────────────
  // One marker per spawn, drawn into the real scene so it sits on the real
  // floor under the real camera. Brightness says WHEN relative to the
  // playhead: now = solid, ahead = half, behind = faint.
  const ghosts = new THREE.Group();
  ghosts.name = 'editor-ghosts';
  scene.add(ghosts);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.06, 6, 32),
    new THREE.MeshBasicMaterial({ color: 0xffdd44, transparent: true, opacity: 0.95 }));
  ring.rotation.x = Math.PI / 2; ring.visible = false; ring.position.y = 0.05;
  ghosts.add(ring);
  const origin = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.7, 24),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, side: THREE.DoubleSide }));
  origin.rotation.x = -Math.PI / 2; origin.position.y = 0.03;
  ghosts.add(origin);
  const sphereGeo = new THREE.SphereGeometry(1, 10, 8);
  const octaGeo = new THREE.OctahedronGeometry(0.45);
  let markers = [];
  function refreshMarkers() {
    for (const m of markers) { ghosts.remove(m); m.material.dispose(); }
    markers = [];
    level.spawns.forEach((s, i) => {
      let m;
      if (s.kind === 'pickup') {
        m = new THREE.Mesh(octaGeo, new THREE.MeshBasicMaterial({ color: pickupColor[s.id] ?? 0xffffff, transparent: true }));
        m.position.set(s.px, 0.6, s.pz);
      } else {
        const cfg = CFG[EnemyType[s.type]] ?? { radius: 0.6, color: 0xffffff };
        const r = Math.max(0.3, cfg.radius * (s.boss ? 1.5 : 1));
        m = new THREE.Mesh(sphereGeo, new THREE.MeshBasicMaterial({ color: cfg.color, transparent: true }));
        m.scale.setScalar(r); m.position.set(s.px, r, s.pz);
      }
      m.userData.i = i;
      ghosts.add(m); markers.push(m);
    });
    paintMarkers();
  }
  function paintMarkers() {
    for (const m of markers) {
      const s = level.spawns[m.userData.i];
      const d = s.t - playhead;
      m.material.opacity = Math.abs(d) < 0.05 ? 0.95 : d > 0 ? 0.45 : 0.14;
    }
    const s = level.spawns[selected];
    ring.visible = !!s;
    if (s) { const r = s.kind === 'pickup' ? 0.8 : Math.max(0.3, (CFG[EnemyType[s.type]]?.radius ?? 0.6) * (s.boss ? 1.5 : 1)) + 0.25;
      ring.scale.setScalar(r); ring.position.set(s.px, 0.05, s.pz); }
    ghosts.visible = active && !inRun;
  }

  // ── tapping the arena ─────────────────────────────────────────────────
  const raycaster = new THREE.Raycaster();
  const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const _hit = new THREE.Vector3(), _ndc = new THREE.Vector2(), _pt = { x: 0, z: 0 };
  function screenToWorld(cx, cy) {
    const r = renderer.domElement.getBoundingClientRect();
    _ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(_ndc, camera);
    if (!raycaster.ray.intersectPlane(floorPlane, _hit)) return null;
    arena.clamp(_hit.x, _hit.z, 0.5, _pt);
    return { x: Math.round(_pt.x * 100) / 100, z: Math.round(_pt.z * 100) / 100 };
  }
  function tapAt(cx, cy) {
    if (!active || inRun) return null;
    const w = screenToWorld(cx, cy);
    if (!w) return null;
    // moving a selected spawn wins over everything else
    if (moveArmed && level.spawns[selected]) {
      const s = level.spawns[selected]; s.px = w.x; s.pz = w.z; moveArmed = false; markDirty(); refreshAll();
      return { moved: selected };
    }
    // a tap near an existing spawn selects it (nearest within PICK_R)
    let best = -1, bestD = PICK_R;
    level.spawns.forEach((s, i) => { const d = Math.hypot(s.px - w.x, s.pz - w.z); if (d < bestD) { bestD = d; best = i; } });
    if (best >= 0) { selected = best === selected ? -1 : best; moveArmed = false; refreshAll(); return { selected }; }
    if (!tool) { selected = -1; refreshAll(); return null; }
    const spawn = tool.kind === 'pickup'
      ? { t: playhead, kind: 'pickup', id: tool.id, px: w.x, pz: w.z }
      : { t: playhead, type: tool.name, px: w.x, pz: w.z };
    selected = L.addSpawn(level, spawn);
    markDirty(); refreshAll();
    return { added: selected, spawn: level.spawns[selected] };
  }
  // Capture phase, so this sees the touch before input.js's window listener
  // does. That listener preventDefault()s every touch outside its UI list,
  // which suppresses the synthesised click — so the arena tap is detected
  // here from raw start/end pairs, the same way hub/shell.js had to.
  let down = null;
  const onDown = (x, y, target) => { if (!active || inRun || root.contains(target)) { down = null; return; } down = { x, y, t: performance.now() }; };
  const onUp = (x, y) => {
    if (!down) return;
    const d = down; down = null;
    if (Math.hypot(x - d.x, y - d.y) > TAP_PX || performance.now() - d.t > TAP_MS) return;
    tapAt(x, y);
  };
  window.addEventListener('touchstart', e => { const t = e.changedTouches[0]; if (t) onDown(t.clientX, t.clientY, e.target); }, { capture: true, passive: true });
  window.addEventListener('touchend',   e => { const t = e.changedTouches[0]; if (t) onUp(t.clientX, t.clientY); }, { capture: true, passive: true });
  window.addEventListener('mousedown',  e => { if (e.button === 0) onDown(e.clientX, e.clientY, e.target); }, true);
  window.addEventListener('mouseup',    e => { if (e.button === 0) onUp(e.clientX, e.clientY); }, true);

  // ── inspector ─────────────────────────────────────────────────────────
  $('ed-tm').onclick = () => { if (selected >= 0) { selected = L.nudge(level, selected, -L.STEP); markDirty(); refreshAll(); } };
  $('ed-tp').onclick = () => { if (selected >= 0) { selected = L.nudge(level, selected, +L.STEP); markDirty(); refreshAll(); } };
  $('ed-del').onclick = () => { if (selected >= 0) { L.removeSpawn(level, selected); selected = -1; markDirty(); refreshAll(); } };
  $('ed-move').onclick = () => { moveArmed = !moveArmed; refreshAll(); };
  $('ed-desel').onclick = () => { selected = -1; moveArmed = false; refreshAll(); };

  // ── timeline ──────────────────────────────────────────────────────────
  function pxPerSec() { return ZOOMS[zoom]; }
  function drawTimeline() {
    const pps = pxPerSec();
    const W = Math.ceil(level.duration * pps) + 40, H = 62;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (tlc.width !== W * dpr || tlc.height !== H * dpr) { tlc.width = W * dpr; tlc.height = H * dpr; tlc.style.width = W + 'px'; }
    tctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    tctx.clearRect(0, 0, W, H);
    const x0 = 20, xOf = t => x0 + t * pps;
    // past is darker than future
    tctx.fillStyle = 'rgba(255,255,255,0.03)'; tctx.fillRect(x0, 0, playhead * pps, H);
    // ticks: 0.1s minor (when there is room), 1s major, labels every 1 or 5s
    tctx.strokeStyle = '#1e1e36'; tctx.lineWidth = 1;
    if (pps >= 60) { tctx.beginPath(); for (let t = 0; t <= level.duration + 1e-6; t += L.STEP) { const x = Math.round(xOf(t)) + 0.5; tctx.moveTo(x, H - 8); tctx.lineTo(x, H); } tctx.stroke(); }
    const labelEvery = pps >= 60 ? 1 : 5;
    tctx.strokeStyle = '#34345a'; tctx.fillStyle = '#6a6a90'; tctx.font = '9px monospace'; tctx.textAlign = 'center';
    tctx.beginPath();
    for (let t = 0; t <= level.duration + 1e-6; t += 1) { const x = Math.round(xOf(t)) + 0.5; tctx.moveTo(x, H - 16); tctx.lineTo(x, H); }
    tctx.stroke();
    for (let t = 0; t <= level.duration + 1e-6; t += labelEvery) tctx.fillText(t + 's', xOf(t), 9);
    // end of level
    tctx.strokeStyle = '#66ffcc66'; tctx.beginPath(); const xe = Math.round(xOf(level.duration)) + 0.5; tctx.moveTo(xe, 0); tctx.lineTo(xe, H); tctx.stroke();
    // spawns: enemies on the lower lane, pickups on the upper; stacked cells get a count
    const cells = new Map();
    level.spawns.forEach((s, i) => { const k = L.fmtT(s.t) + (s.kind === 'pickup' ? 'p' : 'e'); (cells.get(k) ?? cells.set(k, []).get(k)).push(i); });
    for (const [, idxs] of cells) {
      const s0 = level.spawns[idxs[0]];
      const isP = s0.kind === 'pickup';
      const x = xOf(s0.t), y = isP ? 22 : 38;
      const col = isP ? pickupColor[s0.id] ?? 0xffffff : (CFG[EnemyType[s0.type]]?.color ?? 0xffffff);
      const sel = idxs.includes(selected);
      tctx.fillStyle = '#' + col.toString(16).padStart(6, '0');
      tctx.globalAlpha = s0.t < playhead - 1e-6 ? 0.45 : 1;
      tctx.beginPath();
      if (isP) { tctx.moveTo(x, y - 5); tctx.lineTo(x + 5, y); tctx.lineTo(x, y + 5); tctx.lineTo(x - 5, y); tctx.closePath(); }
      else tctx.arc(x, y, s0.boss ? 6 : 4.5, 0, Math.PI * 2);
      tctx.fill();
      if (sel) { tctx.strokeStyle = '#ffdd44'; tctx.lineWidth = 2; tctx.stroke(); }
      if (idxs.length > 1) { tctx.fillStyle = '#fff'; tctx.font = 'bold 9px monospace'; tctx.fillText(String(idxs.length), x + 8, y + 3); }
      tctx.globalAlpha = 1;
    }
    // playhead
    const xp = Math.round(xOf(playhead)) + 0.5;
    tctx.strokeStyle = '#ff5566'; tctx.lineWidth = 2; tctx.beginPath(); tctx.moveTo(xp, 0); tctx.lineTo(xp, H); tctx.stroke();
    tctx.fillStyle = '#ff5566'; tctx.beginPath(); tctx.moveTo(xp - 5, 0); tctx.lineTo(xp + 5, 0); tctx.lineTo(xp, 7); tctx.closePath(); tctx.fill();
  }
  function setPlayhead(t, scroll = true) {
    playhead = Math.min(level.duration, L.quantize(t));
    if (scroll) {
      const x = 20 + playhead * pxPerSec();
      if (x < elTl.scrollLeft + 30 || x > elTl.scrollLeft + elTl.clientWidth - 30) elTl.scrollLeft = Math.max(0, x - elTl.clientWidth / 2);
    }
    refreshAll();
  }
  // A tap on the strip sets the playhead; a drag scrolls (native, pan-x).
  // click survives here because the strip is inside #tded, which input.js
  // leaves alone — so no preventDefault, so the browser synthesises it.
  tlc.addEventListener('click', e => {
    const r = tlc.getBoundingClientRect();
    setPlayhead((e.clientX - r.left - 20) / pxPerSec(), false);
  });
  $('ed-home').onclick = () => setPlayhead(0);
  $('ed-zin').onclick = () => { zoom = Math.min(ZOOMS.length - 1, zoom + 1); refreshAll(); };
  $('ed-zout').onclick = () => { zoom = Math.max(0, zoom - 1); refreshAll(); };
  $('ed-play').onclick = () => play();

  function play() {
    if (!active || inRun) return false;
    const errs = L.validate(level, ctx);
    if (errs.length) { showText('CANNOT PLAY', errs.join('\n')); return false; }
    inRun = true; banner = ''; lastResult = null;
    root.style.display = 'none';
    paintMarkers();
    hooks.play(JSON.parse(JSON.stringify(level)), playhead);
    return true;
  }

  // ── keyboard ──────────────────────────────────────────────────────────
  window.addEventListener('keydown', e => {
    if (!active || inRun) return;
    const tag = e.target?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    const big = e.shiftKey ? 1 : L.STEP;
    if (e.code === 'ArrowLeft')  { setPlayhead(playhead - big); e.preventDefault(); }
    else if (e.code === 'ArrowRight') { setPlayhead(playhead + big); e.preventDefault(); }
    else if (e.code === 'Delete' || e.code === 'Backspace') { if (selected >= 0) { L.removeSpawn(level, selected); selected = -1; markDirty(); refreshAll(); } }
    else if (e.code === 'Escape') { if (elModal.classList.contains('on')) closeModal(); else if (selected >= 0 || tool) { selected = -1; setTool(null); } }
    else if (e.code === 'Enter') { play(); }
    else if (e.code === 'KeyS' && (e.ctrlKey || e.metaKey)) { save(); e.preventDefault(); }
  });

  // ── status ────────────────────────────────────────────────────────────
  function refreshStatus() {
    const n = level.spawns.length, ne = level.spawns.filter(s => s.kind !== 'pickup').length;
    const parts = [
      `<b>${L.fmtT(playhead)}s</b> / ${L.fmtT(level.duration)}s`,
      `${ne} enem${ne === 1 ? 'y' : 'ies'} · ${n - ne} pickup${n - ne === 1 ? '' : 's'}`,
      `${level.rules.mode.toUpperCase()} · arena ${String(level.arena).toUpperCase()}`,
    ];
    if (banner) parts.push(`<b>${esc(banner)}</b>`);
    if (lastResult) parts.push(`<b>LAST RUN: ${lastResult.outcome.toUpperCase()}</b> · ${lastResult.kills} kills · ${lastResult.score} pts · ${L.fmtT(lastResult.time)}s`);
    elStatus.innerHTML = parts.join(' <span style="color:#33334a">|</span> ');
    elTool.textContent = moveArmed ? 'TAP WHERE IT SHOULD STAND'
      : tool ? `TAP TO PLACE ${tool.kind === 'pickup' ? tool.id.toUpperCase() : tool.name} @ ${L.fmtT(playhead)}s`
      : 'PICK SOMETHING ABOVE, THEN TAP THE ARENA';
    const s = level.spawns[selected];
    elInsp.classList.toggle('on', !!s);
    if (s) elWho.textContent = `${s.kind === 'pickup' ? s.id.toUpperCase() : s.type} @ ${L.fmtT(s.t)}s (${s.px}, ${s.pz})`;
    $('ed-move').classList.toggle('on', moveArmed);
  }
  function refreshAll() { refreshMenus(); refreshStatus(); refreshMarkers(); drawTimeline(); }

  // ── open / close ──────────────────────────────────────────────────────
  function open(lv) {
    if (lv) level = lv;
    active = true; inRun = false;
    root.style.display = '';
    hooks.enter(level);
    refreshAll();
  }
  function close() { active = false; root.style.display = 'none'; ghosts.visible = false; }
  // main.js calls this when a level run ends, either way — the level is still
  // here, the playhead is where it was, and the result sits in the status line.
  function onRunEnd(result) {
    inRun = false; lastResult = result; active = true;
    root.style.display = '';
    hooks.enter(level);
    refreshAll();
  }

  window.addEventListener('resize', () => { if (active) drawTimeline(); });

  const api = {
    open, close, onRunEnd, play, save, load, importText,
    loadBundled: async id => { setLevel(await hooks.fetchLevel(id)); return true; },
    exportText: () => L.serialize(level),
    newLevel: name => setLevel(L.newLevel(name || 'UNTITLED')),
    level: () => level,
    setPlayhead, playhead: () => playhead,
    arm: (kind, id) => setTool(kind === 'enemy' ? { kind, name: id } : kind === 'pickup' ? { kind, id } : null),
    tapAt, screenToWorld,
    select: i => { selected = i; refreshAll(); },
    active: () => active, inRun: () => inRun, lastResult: () => lastResult,
    setDuration: d => { level.duration = L.quantize(d); markDirty(); refreshAll(); },
    setMode: m => { level.rules.mode = m; markDirty(); refreshAll(); },
  };
  return api;
}
