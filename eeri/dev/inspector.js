// EERI — THE LEVEL INSPECTOR (owner direction, 2026-08-20).
//
// > *"do you think we could make a level editor that allows me to place assets
// > and backgrounds in a more deliberate way?"*
//
// This is step ONE of four, and it is deliberately the smallest one that
// changes how the work feels. The diagnosis it answers is not that the levels
// are placed randomly — they are not, every number in them was chosen — it is
// that they are placed BLIND. A prop in this game is a line like
//
//     panel(THREE, root, 48, 10.0, 124, 22, 0x14263c, -1.72)
//
// so the loop for composing a picture is: type eight numbers, reload, look,
// type them again. Nobody composes anything that way, which is exactly why
// nothing looks composed. The inspector does not change one byte of that
// format. It makes the loop SIGHTED: point at a thing, find out what it is,
// drag it, read the corrected numbers back out.
//
// WHY IT LIVES OUT HERE. `dev.html` FRAMES `index.html` rather than copying
// it, so the thing being inspected is byte-for-byte the thing that ships, and
// this module is loaded by the dev page only. The game gains no import, no
// button and no branch: `index.html` cannot reach this file, so a player
// cannot reach it either. The single thing the game had to give up is the
// `camera` handle next to `THREE, scene` on `window.__eeri`, because "what is
// under this pointer" is a raycast and a raycast needs a camera.
//
// WHAT IT DOES NOT DO YET, on purpose:
//   · it does not SAVE. Scenery is code, not data, so there is nowhere to
//     write to. That is step 2, and it is the real work — the editor UI is
//     the small part.
//   · it does not identify the source CALL. Same reason. It reports what the
//     object IS and where it is, which is the honest answer while the numbers
//     still live inside function bodies (and half of them are computed by a
//     loop, so there is no single line to correct).
//   · it does not free the camera from the kid. The game's own Camera writes
//     the position every frame and fighting it from a second rAF is a race.
//     WALK moves the player instead, which is the same view change by the
//     one route that cannot desync.

const CSS = `
.insp {
  position: fixed; z-index: 40; left: 12px; top: 12px; width: 268px;
  background: #14100c; color: #e8e2d8; border: 1px solid #3a3128; border-radius: 8px;
  font: 11px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace;
  box-shadow: 0 8px 24px rgba(0,0,0,0.5); user-select: none;
}
.insp[hidden] { display: none; }
.insp h3 {
  margin: 0; padding: 8px 10px; font: 700 11px/1 ui-monospace, monospace;
  letter-spacing: 0.18em; color: #ffb01f; border-bottom: 1px solid #3a3128;
  display: flex; justify-content: space-between; align-items: center;
}
.insp h3 button { font-size: 11px; }
.insp .body { padding: 8px 10px; display: grid; gap: 7px; }
.insp button {
  background: #241d16; color: #e8e2d8; border: 1px solid #4a3f33; border-radius: 5px;
  padding: 5px 8px; font: 11px/1 ui-monospace, monospace; cursor: pointer;
}
.insp button:hover { background: #322a20; }
.insp button[aria-pressed="true"] { background: #ffb01f; color: #14100c; border-color: #ffb01f; }
.insp .row { display: flex; gap: 5px; flex-wrap: wrap; }
.insp .row > * { flex: 1 1 auto; }
.insp .kv { display: grid; grid-template-columns: 46px 1fr; gap: 3px 6px; align-items: center; }
.insp .kv span { color: #8d8165; }
.insp .kv b { font-weight: 400; word-break: break-all; }
.insp input[type=number] {
  width: 100%; background: #241d16; color: #e8e2d8; border: 1px solid #4a3f33;
  border-radius: 4px; padding: 3px 5px; font: 11px/1 ui-monospace, monospace;
}
.insp .hint { color: #8d8165; }
.insp .out {
  background: #0d0a07; border: 1px solid #3a3128; border-radius: 5px; padding: 6px;
  color: #b9d98a; white-space: pre-wrap; word-break: break-all; cursor: text;
  user-select: text;
}
.insp .groups { max-height: 132px; overflow-y: auto; display: grid; gap: 2px; }
.insp .groups label { display: flex; gap: 6px; align-items: center; color: #cfc6b8; }
.inspCatch { position: fixed; inset: 0; z-index: 35; cursor: crosshair;
  /* TOUCH-ACTION IS WHAT MAKES THIS DRAGGABLE BY THUMB. The handlers are
     pointer events, which already cover touch — but without this the browser
     claims the gesture for scrolling and pans the page while the prop stays
     put. Same family as the pointerup/touchend trap hub/shell.js paid for. */
  touch-action: none; user-select: none; -webkit-user-select: none; }
.inspCatch[hidden] { display: none; }
`;

// Anything the inspector itself put in the scene must never be pickable, or
// the selection box becomes the thing you select and nothing else can be.
const MINE = '__insp';

// ---- LAYER BANDS ---------------------------------------------------------
//
// The owner asked for a layer menu — "fore, middle, back1, back2" — and the
// game does not have layers in that sense. A dressing row carries a
// CONTINUOUS `z`, and the sites in the repo use between 12 and 35 distinct
// depths each; the lane art behind them is a separate five-deep stack
// (skyline / far / mid / near / fore) that props never join.
//
// So a band is a NAME FOR A RANGE, not a new thing in the data. Placing snaps
// to the band's `z` — the owner's call, and the right one: a lane that stays
// coherent is most of what stops a 2.5D screen reading as a collage, and the
// dressing report showed depth COUNT is what separates the worlds that read
// well from the ones that do not. Fine adjustment stays available on the
// selected row's own z field, so snapping is a default rather than a cage.
//
// The numbers are read off the shipped sheets rather than invented: worlds 3
// and 4 put backdrop panels at -1.7, mid structures around -1.2 to -0.9,
// near dressing at -0.7, and the few things that stand in front of the play
// plane at +0.85.
const BANDS = [
  { id: 'back2',  label: 'back 2 — sky side', z: -1.70 },
  { id: 'back1',  label: 'back 1 — buildings', z: -1.20 },
  { id: 'middle', label: 'middle — structures', z: -0.72 },
  { id: 'fore',   label: 'fore — in front', z: 0.85 },
];

// What can be placed, per band. `panel` and `disc` are the two primitives every
// sheet is built from; the cutouts are the art the game already ships and
// loads by name. A cutout in the FORE band and the same cutout in BACK1 are
// the same asset at two depths — that is what the bands are for.
const PLACEABLE = [
  { k: 'panel', name: 'panel — flat colour block' },
  { k: 'disc',  name: 'disc — flat colour circle' },
  { k: 'cutout', a: 'root',      name: 'cutout — root' },
  { k: 'cutout', a: 'worklamp',  name: 'cutout — work lamp' },
  { k: 'cutout', a: 'reel',      name: 'cutout — cable reel' },
  { k: 'cutout', a: 'barriers',  name: 'cutout — barrier lamps' },
  { k: 'cutout', a: 'forestTunnel',   name: 'cutout — log tunnel' },
  { k: 'cutout', a: 'forestClearing', name: 'cutout — stump clearing' },
  // THE SHELF. Thirteen real 3D props that shipped, were catalogued, and could
  // not be put in a level by any means — `audit-assets.mjs` called every one of
  // them unreachable because nothing named them in a getModel() call. This
  // dropdown is what names them.
  { k: 'model', a: 'forklift',    name: 'model — forklift' },
  { k: 'model', a: 'dumptruck',   name: 'model — dump truck' },
  { k: 'model', a: 'cherrypicker', name: 'model — cherry picker' },
  { k: 'model', a: 'pipelayer',   name: 'model — pipe layer' },
  { k: 'model', a: 'compressor',  name: 'model — compressor' },
  { k: 'model', a: 'generator',   name: 'model — generator' },
  { k: 'model', a: 'floodlight',  name: 'model — floodlight' },
  { k: 'model', a: 'cabledrum',   name: 'model — cable drum' },
  { k: 'model', a: 'gascart',     name: 'model — gas cart' },
  { k: 'model', a: 'jackhammer',  name: 'model — jackhammer' },
  { k: 'model', a: 'wheelbarrow', name: 'model — wheelbarrow' },
  { k: 'model', a: 'vacbot',      name: 'model — vac bot' },
  { k: 'model', a: 'workerbot',   name: 'model — worker bot' },
];


export class Inspector {
  constructor(win) {
    this.win = win;
    this.el = null;
    this.catch_ = null;
    this.on = false;
    this.picked = null;
    this.box = null;
    this.drag = null;
    this.host = null;
  }

  api() { return this.win.__eeri || null; }

  mount(host) {
    this.host = host;
    if (!host.ownerDocument.getElementById('inspCss')) {
      const st = host.ownerDocument.createElement('style');
      st.id = 'inspCss'; st.textContent = CSS;
      host.ownerDocument.head.appendChild(st);
    }

    const d = host.ownerDocument;
    this.catch_ = d.createElement('div');
    this.catch_.className = 'inspCatch';
    this.catch_.hidden = true;
    host.appendChild(this.catch_);

    this.el = d.createElement('div');
    this.el.className = 'insp';
    this.el.hidden = true;
    this.el.innerHTML = `
      <h3>INSPECT <button type="button" data-a="close">×</button></h3>
      <div class="body">
        <div class="row">
          <button type="button" data-a="pick" aria-pressed="false">PICK</button>
          <button type="button" data-a="place" aria-pressed="false">PLACE</button>
          <button type="button" data-a="walk" aria-pressed="false">WALK</button>
        </div>
        <div class="row" data-el="palette" hidden>
          <label style="flex:1 1 0">layer<select data-el="band"></select></label>
          <label style="flex:1 1 0">asset<select data-el="asset"></select></label>
        </div>
        <div class="row" data-el="sizeRow" hidden>
          <label style="flex:1 1 0">size
            <input type="range" min="0.2" max="6" step="0.05" value="1.6" data-el="size">
          </label>
          <b data-el="sizeVal">1.60</b>
        </div>
        <div class="hint" data-el="tip">PICK: click a thing. drag moves it.
WALK: click to stand there — the camera follows the kid, so this is how you
look somewhere else.</div>
        <div class="kv">
          <span>obj</span><b data-el="name">—</b>
          <span>in</span><b data-el="grp">—</b>
          <span>size</span><b data-el="size">—</b>
        </div>
        <div class="row">
          <label style="flex:1 1 0">x<input type="number" step="0.1" data-el="x"></label>
          <label style="flex:1 1 0">y<input type="number" step="0.1" data-el="y"></label>
          <label style="flex:1 1 0">z<input type="number" step="0.02" data-el="z"></label>
        </div>
        <div class="row">
          <button type="button" data-a="copy">COPY</button>
          <button type="button" data-a="hide">HIDE</button>
          <button type="button" data-a="reset">REVERT</button>
        </div>
        <div class="row">
          <button type="button" data-a="dup">DUPLICATE</button>
          <button type="button" data-a="del">DELETE</button>
        </div>
        <div class="out" data-el="out">—</div>
        <div class="hint" data-el="sheetTip">this thing is drawn from a
dressing sheet, so a move can be KEPT. SAVE writes the whole site out —
download it and replace assets/dressing/site-N.json.</div>
        <div class="row" data-el="sheetRow">
          <button type="button" data-a="save">SAVE SITE</button>
          <button type="button" data-a="sheetcopy">COPY JSON</button>
        </div>
        <div class="hint">scene groups — the fastest way to find out which
layer a thing is on is to switch the others off</div>
        <div class="groups" data-el="groups"></div>
      </div>`;
    host.appendChild(this.el);

    this.el.addEventListener('click', (e) => {
      const a = e.target?.dataset?.a;
      if (!a) return;
      if (a === 'close') this.hide();
      if (a === 'dup') this.duplicate();
      if (a === 'del') this.deleteRow();
      if (a === 'pick') this.setMode('pick');
      if (a === 'place') this.setMode('place');
      if (a === 'walk') this.setMode('walk');
      if (a === 'copy') this.copy();
      if (a === 'hide') this.hidePicked();
      if (a === 'reset') this.revert();
      if (a === 'save') this.saveSheet(false);
      if (a === 'sheetcopy') this.saveSheet(true);
    });
    for (const k of ['x', 'y', 'z']) {
      this.q(k).addEventListener('input', () => this.applyFields());
    }

    // the palette: bands, then the assets that band can take
    const bandSel = this.q('band'), assetSel = this.q('asset');
    bandSel.innerHTML = BANDS.map((b) => `<option value="${b.id}">${b.label}</option>`).join('');
    assetSel.innerHTML = PLACEABLE.map((p2, i) => `<option value="${i}">${p2.name}</option>`).join('');
    bandSel.value = 'middle';

    // THE SIZE SLIDER, and it runs AFTER the snap rather than instead of it.
    // Owner's refinement: depth is decided by the band, scale is decided by
    // hand. Live on the selected row, so it is a look control rather than a
    // number to guess before placing.
    this.q('size').addEventListener('input', () => this.applySize());

    this.catch_.addEventListener('pointerdown', (e) => this.down(e));
    this.catch_.addEventListener('pointermove', (e) => this.move(e));
    this.catch_.addEventListener('pointerup', (e) => this.up(e));
    this.keys = (e) => this.key(e);
    host.ownerDocument.addEventListener('keydown', this.keys);

    this.watchMenu();
    return this;
  }

  q(name) { return this.el.querySelector(`[data-el="${name}"]`); }

  // ---- the pause menu is the way in (owner direction) ---------------------
  // The GAME is not modified to do this. `openMenu()` builds its card fresh
  // every time it opens, so the dev page watches the framed document for one
  // appearing and adds a row to it. That keeps the rule the whole dev pack is
  // built on — the pack reads the game, the game never learns the pack exists
  // — and it means the shipped `index.html` can never show a child a button
  // marked DEV.
  watchMenu() {
    const doc = this.win.document;
    const add = (menu) => {
      const card = menu.querySelector('.card');
      if (!card || card.querySelector('[data-a="devtools"]')) return;
      const b = doc.createElement('button');
      b.type = 'button';
      b.dataset.a = 'devtools';
      b.textContent = 'DEV TOOLS';
      b.addEventListener('click', () => {
        menu.querySelector('[data-a="resume"]')?.click();
        this.show();
      });
      card.appendChild(b);
    };
    const seen = doc.getElementById('menu');
    if (seen) add(seen);
    this.mo = new this.win.MutationObserver((recs) => {
      for (const r of recs) for (const n of r.addedNodes) {
        if (n.nodeType === 1 && n.id === 'menu') add(n);
      }
    });
    this.mo.observe(doc.body, { childList: true });
  }

  // The gate needs a handle on the live tool: selection normally happens by
  // raycast, and a test cannot reliably hit a 1-tile prop with a synthetic
  // pointer at an arbitrary camera. Dev page only — the shipped game never
  // loads this module.
  expose() { this.host.ownerDocument.defaultView.__insp = this; }

  show() { this.el.hidden = false; this.listGroups(); this.showHandles(true); this.expose(); }
  hide() { this.setMode(null); this.showHandles(false); this.el.hidden = true; }
  toggle() { this.el.hidden ? this.show() : this.hide(); }

  setMode(m) {
    this.on = this.on === m ? null : m;
    this.catch_.hidden = !this.on;
    for (const a of ['pick', 'walk']) {
      this.el.querySelector(`[data-a="${a}"]`)
        .setAttribute('aria-pressed', String(this.on === a));
    }
  }

  // ---- picking ------------------------------------------------------------
  // NDC is computed against the CANVAS rect, not the window. The game fixes
  // its own aspect (`fitStage`) and letterboxes inside the frame, so a pointer
  // mapped against the viewport is wrong by the size of the bars — which
  // reads as "the picker is off by a bit and I do not know why".
  ndc(e) {
    const cv = this.win.document.querySelector('canvas');
    if (!cv) return null;
    const r = cv.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * 2 - 1,
      y: -((e.clientY - r.top) / r.height) * 2 + 1,
    };
  }

  ray(e) {
    const A = this.api(); if (!A) return null;
    const n = this.ndc(e); if (!n) return null;
    const rc = new A.THREE.Raycaster();
    rc.setFromCamera(n, A.camera);
    return rc;
  }

  // ---- PLACING -----------------------------------------------------------
  //
  // A click in PLACE mode adds a ROW, not a mesh. That is the whole reason
  // step 2 existed: the sheet is the thing, the meshes are what the sheet
  // makes, and rebuilding from rows is how a placement survives SAVE and a
  // reload. Building a mesh here and remembering to write a row later is the
  // version that silently loses work.
  place(e) {
    const A = this.api(); if (!A) return;
    const found = this.rowOf(this.picked) || this.anySheet();
    if (!found) { this.say('this room has no dressing sheet yet — place still works, but SAVE is the only way to keep it'); }
    const band = BANDS.find((b) => b.id === this.q('band').value) || BANDS[2];
    const spec = PLACEABLE[+this.q('asset').value] || PLACEABLE[0];

    // where, in world units, on the band's own depth plane
    const rc = this.ray(e); if (!rc) return;
    const p = new A.THREE.Vector3();
    if (!rc.ray.intersectPlane(
      new A.THREE.Plane(new A.THREE.Vector3(0, 0, 1), -band.z), p)) return;

    // SNAP. Owner's call, and it is on the tile grid the levels are authored
    // on — a half-tile step, because a prop that can only land on whole tiles
    // cannot be centred between two.
    const snap = (v) => Math.round(v * 2) / 2;
    const size = +this.q('size').value || 1.6;
    const row = { id: this.freshId(), k: spec.k, x: snap(p.x), y: snap(p.y), z: band.z, o: 1 };
    if (spec.k === 'panel') { row.w = size; row.h = size * 0.6; row.c = '#8a7f6b'; }
    else if (spec.k === 'disc') { row.r = size * 0.5; row.c = '#8a7f6b'; }
    else if (spec.k === 'model') { row.a = spec.a; row.h = size; row.f = false; delete row.o; }
    else { row.a = spec.a; row.h = size; row.f = false; }

    this.addRow(row);
  }

  down(e) {
    const A = this.api(); if (!A) return;
    if (this.on === 'place') { this.place(e); return; }
    if (this.on === 'walk') {
      const rc = this.ray(e); if (!rc) return;
      const p = new A.THREE.Vector3();
      rc.ray.intersectPlane(new A.THREE.Plane(new A.THREE.Vector3(0, 0, 1), 0), p);
      if (p) A.debug.setPos(p.x, Math.max(p.y, 1));
      return;
    }
    const rc = this.ray(e); if (!rc) return;
    const hits = rc.intersectObjects(A.scene.children, true)
      .filter((h) => h.object.visible && !this.isMine(h.object));
    if (!hits.length) { this.select(null); return; }
    this.select(hits[0].object);
    // grab it: remember where in the object the pointer landed so it does not
    // jump its own half-width the moment you move
    const o = this.picked;
    const world = new A.THREE.Vector3(); o.getWorldPosition(world);
    this.drag = { z: world.z, off: world.clone().sub(hits[0].point) };
    try { this.catch_.setPointerCapture?.(e.pointerId); } catch { /* synthetic pointer */ }
  }

  move(e) {
    if (!this.drag || !this.picked) return;
    const A = this.api(); if (!A) return;
    const rc = this.ray(e); if (!rc) return;
    const p = new A.THREE.Vector3();
    // move in the plane the object already sits in — depth is the one axis
    // you must not change by accident in a 2.5D game
    if (!rc.ray.intersectPlane(
      new A.THREE.Plane(new A.THREE.Vector3(0, 0, 1), -this.drag.z), p)) return;
    p.add(this.drag.off);
    const parent = this.picked.parent;
    const local = parent ? parent.worldToLocal(p.clone()) : p;
    this.picked.position.set(local.x, local.y, this.picked.position.z);
    this.mirrorLight();
    this.syncRow();
    this.readout();
  }

  // A LIGHT HAS NO GEOMETRY, so what you grab is a wireframe handle standing
  // beside it rather than the light itself. They are siblings, not parent and
  // child: WebGLRenderer.projectObject skips an invisible subtree wholesale
  // and that is also where it gathers lights, so hanging the light under a
  // hidden handle switches the light off. Siblings plus one line of mirroring
  // is the version that works.
  mirrorLight() {
    const L = this.picked?.userData?.pairedLight;
    if (L) L.position.copy(this.picked.position);
  }

  // Light handles ship INVISIBLE, because the game must never draw a wireframe
  // ball over a lamp. Turning them on needs no export and no hook: they are
  // meshes in the scene wearing `userData.lightHandle`, and this module already
  // reaches everything else the same way — through the graph rather than
  // through an API the game has to grow for it.
  showHandles(on) {
    const A = this.api(); if (!A?.scene) return 0;
    let n = 0;
    A.scene.traverse((o) => {
      if (o.userData?.lightHandle) { o.visible = !!on; n++; }
    });
    return n;
  }

  // GUARDED, because the capture is not always taken. PLACE mode returns from
  // `down()` before capturing — it has nothing to drag — so the matching
  // `up()` was releasing a pointer that was never captured, and the browser
  // throws rather than shrugging. A real device can lose a pointer the same
  // way (a touch cancelled by the system), so this is not only a test's
  // problem.
  up(e) {
    this.drag = null;
    try { this.catch_.releasePointerCapture?.(e.pointerId); } catch { /* never captured */ }
  }

  key(e) {
    if (!this.picked || this.el.hidden) return;
    const step = e.shiftKey ? 1 : 0.1;
    const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0],
                ArrowUp: [0, step], ArrowDown: [0, -step] }[e.key];
    if (!d) return;
    e.preventDefault();
    this.picked.position.x += d[0];
    this.picked.position.y += d[1];
    this.mirrorLight();
    this.syncRow();
    this.readout();
  }

  isMine(o) {
    for (let n = o; n; n = n.parent) if (n.userData?.[MINE]) return true;
    return false;
  }

  select(o) {
    const A = this.api(); if (!A) return;
    if (this.box) { this.box.parent?.remove(this.box); this.box = null; }
    this.picked = o;
    if (!o) { this.readout(); return; }
    // REMEMBER WHERE IT STARTED. Without this, REVERT is a lie and a session
    // of dragging is unrecoverable — the numbers only exist in source.
    if (!o.userData.__inspHome) {
      o.userData.__inspHome = o.position.clone();
    }
    this.box = new A.THREE.Box3Helper(
      new A.THREE.Box3().setFromObject(o), 0xffb01f);
    this.box.userData[MINE] = true;
    A.scene.add(this.box);
    this.readout();
  }

  // THE ROW BEHIND THE THING YOU CLICKED. Worlds 3 and 4 are drawn from
  // `assets/dressing/site-N.json`, and every replayed mesh carries its row id.
  // Without this the inspector can move a prop and the move dies on reload —
  // which is the whole difference between a viewer and an editor.
  // The site's sheet WITHOUT needing something selected first. `rowOf` starts
  // from a picked mesh, which is no use for the very first thing placed in a
  // room: there is nothing to pick yet.
  anySheet() {
    const A = this.api(); if (!A?.scene) return null;
    let found = null;
    A.scene.traverse((n) => { if (!found && n.userData?.rows) found = { rows: n.userData.rows, group: n }; });
    return found;
  }

  // ids have to be unique within the sheet and stable across a save, and the
  // sheets number theirs d1, d2, … — so continue the sequence rather than
  // inventing a scheme that a re-capture would then disagree with.
  freshId() {
    const f = this.anySheet();
    let n = 0;
    for (const r of f?.rows || []) {
      const m = /^d(\d+)$/.exec(r.id || '');
      if (m) n = Math.max(n, +m[1]);
    }
    return `d${n + 1}`;
  }

  // Add a row and rebuild the site's dressing from the sheet. Rebuilding
  // rather than adding one mesh is deliberate: it is the same path a reload
  // takes, so anything that looks right here looks right after SAVE.
  addRow(row) {
    let found = this.anySheet();
    // NO SHEET YET IS THE NORMAL CASE FOR WORLDS 1 AND 2 — they have no
    // dressing to have been captured from. Seeding one here is the whole
    // reason those rooms can be dressed at all; without it the editor works
    // only where somebody had already written code to record.
    if (!found) {
      const A = this.api(); const D = this.win.__eeriDress;
      if (!A || !D) { this.say('no dressing module to add to'); return; }
      D.applyRows(A.site(), [row]);
      this.say(`started a new sheet for this room with ${row.k} — SAVE it to `
        + `assets/dressing/site-${A.site() + 1}.json and add ${A.site() + 1} to `
        + `manifest.dressing.sites, or it will not come back on reload`);
      return;
    }
    found.rows.push(row);
    this.refreshDressing();
    this.say(`placed ${row.k}${row.a ? ' ' + row.a : ''} at ${row.x}, ${row.y} on z ${row.z}`);
  }

  // THE SIZE SLIDER. Runs on the selected row after it has been placed, which
  // is the owner's shape for this: the band decides depth, the hand decides
  // scale. Each row kind carries its size in a different field, so this is the
  // one place that knows which.
  applySize() {
    const v = +this.q('size').value || 1;
    this.q('sizeVal').textContent = v.toFixed(2);
    const found = this.rowOf(this.picked);
    if (!found?.row) return;
    const r = found.row;
    if (r.k === 'panel') { r.w = v; r.h = v * 0.6; }
    else if (r.k === 'disc') { r.r = v * 0.5; }
    else if (r.k === 'cutout' || r.k === 'model') { r.h = v; }
    this.refreshDressing();
  }

  // ---- DELETE and DUPLICATE ----------------------------------------------
  // Both edit the SHEET and rebuild, like placing does — never the mesh. A
  // tool that can add but not remove is one where every mistake is permanent,
  // and the first thing anyone does with a placement tool is place something
  // wrong.
  deleteRow() {
    const found = this.rowOf(this.picked);
    if (!found?.row) { this.say('nothing selected that came from a sheet'); return; }
    const i = found.rows.indexOf(found.row);
    if (i < 0) return;
    const gone = found.rows.splice(i, 1)[0];
    this.select(null);
    this.refreshDressing();
    this.say(`deleted ${gone.k}${gone.a ? ' ' + gone.a : ''} (${gone.id}) — REVERT will not bring it back, re-place it`);
  }

  duplicate() {
    const found = this.rowOf(this.picked);
    if (!found?.row) { this.say('nothing selected that came from a sheet'); return; }
    // offset by a half tile, the same step placing snaps to, so the copy is
    // visibly a second thing rather than hiding exactly behind the first
    const copy = { ...found.row, id: this.freshId(), x: found.row.x + 0.5 };
    found.rows.push(copy);
    this.refreshDressing();
    this.say(`duplicated ${found.row.id} as ${copy.id}`);
  }

  // one line of feedback in the panel — placing something you cannot see land
  // is indistinguishable from placing nothing
  say(msg) { const el = this.q('out'); if (el) el.textContent = msg; }

  // Rebuild the room from its rows. `applyRows` clears the module's mounted
  // site, so the dressing watcher re-replays on the next frame — the same path
  // a reload takes, which is what makes what you see here match what SAVE
  // writes.
  refreshDressing() {
    const A = this.api();
    const D = this.win.__eeriDress;
    const f = this.anySheet();
    if (!A || !D || !f) return false;
    D.applyRows(A.site(), f.rows);
    return true;
  }

  rowOf(o) {
    if (!o?.userData?.row) return null;
    for (let n = o; n; n = n.parent) {
      const rows = n.userData?.rows;
      if (rows) return { rows, row: rows.find((r) => r.id === o.userData.row), group: n };
    }
    return null;
  }

  // Push the mesh's CURRENT position back into its row. Called on every drag
  // and every field edit, so what SAVE writes is what is on screen.
  syncRow() {
    const found = this.rowOf(this.picked);
    if (!found?.row) return;
    const p = this.picked.position;
    found.row.x = +p.x.toFixed(3);
    found.row.y = +p.y.toFixed(3);
    found.row.z = +p.z.toFixed(3);
  }

  readout() {
    const o = this.picked;
    const set = (k, v) => { this.q(k).value = v; };
    const found = this.rowOf(o);
    // the sheet controls are only honest when the selection HAS a row
    this.q('sheetRow').style.display = found?.row ? '' : 'none';
    this.q('sheetTip').style.display = found?.row ? '' : 'none';
    if (!o) {
      this.q('name').textContent = '—'; this.q('grp').textContent = '—';
      this.q('size').textContent = '—'; this.q('out').textContent = '—';
      for (const k of ['x', 'y', 'z']) this.q(k).value = '';
      return;
    }
    const A = this.api();
    const w = new A.THREE.Vector3(); o.getWorldPosition(w);
    let top = o, path = [];
    while (top.parent && top.parent !== A.scene) { top = top.parent; }
    for (let n = o; n && n !== A.scene; n = n.parent) if (n.name) path.unshift(n.name);
    const b = new A.THREE.Box3().setFromObject(o);
    const s = b.getSize(new A.THREE.Vector3());
    const f = (v) => (Math.round(v * 100) / 100).toFixed(2);

    this.q('name').textContent = o.name || o.type;
    this.q('grp').textContent = top.name || path[0] || '(scene)';
    this.q('size').textContent = `${f(s.x)} × ${f(s.y)} × ${f(s.z)}`;
    set('x', f(w.x)); set('y', f(w.y)); set('z', f(w.z));
    this.q('out').textContent = `x ${f(w.x)}, y ${f(w.y)}, z ${f(w.z)}`;
    if (this.box) this.box.box.setFromObject(o);
  }

  applyFields() {
    const o = this.picked; if (!o) return;
    const A = this.api();
    const v = (k) => parseFloat(this.q(k).value);
    if ([v('x'), v('y'), v('z')].some(Number.isNaN)) return;
    const world = new A.THREE.Vector3(v('x'), v('y'), v('z'));
    const local = o.parent ? o.parent.worldToLocal(world.clone()) : world;
    o.position.copy(local);
    this.syncRow();
    if (this.box) this.box.box.setFromObject(o);
    this.q('out').textContent = this.q('out').textContent;
  }

  // The site as it stands, as the file the game reads. The dev page cannot
  // write into the repo — it is a browser — so this offers both routes and
  // says which file to replace rather than implying it saved itself.
  saveSheet(toClipboard) {
    const found = this.rowOf(this.picked);
    const A = this.api();
    if (!found || !A) return;
    const site = (A.site?.() ?? 0) + 1;
    const body = JSON.stringify({ v: 1, site, rows: found.rows }, null, 1) + '\n';
    const win = this.host.ownerDocument.defaultView;
    const flash = (sel, word) => {
      const b = this.el.querySelector(`[data-a="${sel}"]`);
      const was = b.textContent; b.textContent = word;
      setTimeout(() => { b.textContent = was; }, 1200);
    };
    if (toClipboard) {
      win.navigator.clipboard?.writeText(body);
      flash('sheetcopy', 'COPIED');
      return;
    }
    const blob = new win.Blob([body], { type: 'application/json' });
    const url = win.URL.createObjectURL(blob);
    const a = this.host.ownerDocument.createElement('a');
    a.href = url; a.download = `site-${site}.json`;
    this.host.appendChild(a); a.click(); a.remove();
    setTimeout(() => win.URL.revokeObjectURL(url), 4000);
    flash('save', `site-${site}.json`);
  }

  copy() {
    const txt = this.q('out').textContent;
    this.host.ownerDocument.defaultView.navigator.clipboard?.writeText(txt);
    const b = this.el.querySelector('[data-a="copy"]');
    const was = b.textContent; b.textContent = 'COPIED';
    setTimeout(() => { b.textContent = was; }, 900);
  }

  hidePicked() { if (this.picked) { this.picked.visible = false; this.select(null); } }

  revert() {
    const o = this.picked; if (!o?.userData.__inspHome) return;
    o.position.copy(o.userData.__inspHome);
    this.syncRow();
    this.readout();
  }

  // Every direct child of the scene with a name, as a visibility switch. It
  // is three lines and it answers the question that costs the most time by
  // hand — "which of the eleven layers is that thing in".
  listGroups() {
    const A = this.api(); if (!A) return;
    const box = this.q('groups');
    box.textContent = '';
    const d = this.host.ownerDocument;
    for (const c of A.scene.children) {
      if (this.isMine(c) || c.isLight) continue;
      const l = d.createElement('label');
      const cb = d.createElement('input');
      cb.type = 'checkbox'; cb.checked = c.visible;
      cb.addEventListener('change', () => { c.visible = cb.checked; });
      l.append(cb, d.createTextNode(c.name || c.type));
      box.appendChild(l);
    }
  }

  destroy() {
    this.mo?.disconnect();
    this.host?.ownerDocument.removeEventListener('keydown', this.keys);
    if (this.box) this.box.parent?.remove(this.box);
    this.el?.remove(); this.catch_?.remove();
  }
}
