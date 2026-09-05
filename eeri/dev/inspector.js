// EERI — THE LEVEL EDITOR (owner direction, 2026-08-21 and 2026-08-20).
//
// v1 (2026-08-20) was a floating panel: point at a thing, find out what it
// is, drag it, read the corrected numbers back out. It could not save,
// because a prop was a call inside a function body and there was nowhere
// to write to.
//
// v2 (2026-08-21) fixes that for scenery (js/scenery.js, v15.39) and
// rebuilds the panel to the shape the owner actually asked for:
//
//   > "current levels choosable, layers of assets like a slider or numbered
//   > layers on the left of the screen and main options buttons on the
//   > top. gameplay layer has all the physical objects so more menus, but
//   > other layers only have background or foreground art assets."
//
// So: a TOP BAR (level picker, mode, undo, copy) and a LEFT RAIL — seven
// numbered rows, GAMEPLAY at the top and the six painted lanes underneath
// it in depth order, because the physical layer is the one everything
// else exists to frame. Selecting a row dims every OTHER art lane so the
// one you are placing into is the one you can see, and swaps the palette
// below the rail for that layer's own vocabulary.
//
// WHAT IS LIVE and what is reference, stated plainly rather than left to
// be discovered:
//   · LAMPS place live. `js/light.js` is pure and self-contained, so PLACE
//     → click the picture spawns a real lamp, tags it with the row that
//     made it, and UNDO removes it.
//   · World 1 and World 2's own vocabularies place live too, THROUGH the
//     art lane's own builders (`world1-dressing.js` / `world2-dressing.js`
//     return them by name) — a prop placed from the editor is built by the
//     exact same closure as one authored by hand, which is what keeps the
//     two indistinguishable.
//   · Worlds 3 and 4 are NOT a world with no dressing — `world34-dressing.js`
//     is a full, asset-backed art pass (real texture cutouts per site, not
//     PROPS/SCENERY rows) — but it is a freestanding sidecar that mounts
//     itself off the live site index rather than through `placeScenery()`,
//     so the editor genuinely cannot see or drag anything it draws. Those
//     two worlds' palettes offer lamps only here, and that is a real gap in
//     the EDITOR's reach, not a gap in the worlds' dressing.
//   · GAMEPLAY places SOME kinds live (v2.1): a skitter, hopper, roller,
//     bucket bot or steam vent is a real `Robot`/`SteamVent`, pushed onto
//     the SAME live array (`site.robots` / `site.vents`) the update loop
//     already walks — a placed one patrols, stomps and hits like any
//     other. Everything else in the palette — terrain, gizmos, a machine —
//     is still reference only: terrain reshapes the tile grid at load
//     time and a machine owns state this file has no hook into. PICK
//     drags any of them regardless, because they are real meshes.
//
// WHY IT LIVES OUT HERE, unchanged from v1: `dev.html` FRAMES `index.html`
// rather than copying it, so the thing being edited is byte-for-byte the
// thing that ships, and this module is loaded by the dev page only.
// `index.html` cannot reach it, so a player cannot either.
//
// ONE CAVEAT WORTH KNOWING BEFORE YOU DISTRUST THE UI: changing LEVEL is
// slow — measured up to twenty real seconds in this sandbox — because the
// game's own level-change fade is a `setTimeout` Promise, and a browser
// can throttle timers belonging to an iframe that just lost focus (which
// this one always has: the click that starts a level change necessarily
// landed on a button in the top page, not the game). `gotoLevel()` says so
// rather than hiding it: the level number reads `…` and both arrows
// disable until the game actually finishes, however long that takes.

const CSS = `
// EDITOR FOOTPRINT. v1's overlay bug (see bindCanvas() for the story) was
// really a layout bug wearing a JS costume: a panel sized to nearly the
// whole viewport leaves nowhere to CLICK the picture, whatever catches the
// event. .ed itself is therefore a non-interactive full-viewport wrapper
// — organisational only — and the two things that actually draw and take
// clicks, the top bar and the sidebar, opt back into pointer-events and
// position themselves independently. Everywhere else on screen is the
// game, clickable, always — a top bar you cannot place a lamp under and a
// ~360px sidebar you cannot either is the same trade every editor with a
// toolbar makes.
.ed {
  position: fixed; inset: 0; z-index: 40; pointer-events: none;
  font: 11px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace; color: #e8e2d8;
  user-select: none;
}
.ed[hidden] { display: none; }
.ed .topbar {
  /* hugs its own content rather than stretching edge to edge — the dev/FX
     pack (dev-menu.js) docks a 300px panel in the top-RIGHT corner and is
     visible by default, so a full-width bar would fight it for that
     corner on every fresh load, not just when both happen to be open. */
  position: fixed; top: 12px; left: 12px; z-index: 1; pointer-events: auto;
  display: flex; align-items: center; gap: 8px; padding: 7px 8px;
  max-width: calc(100vw - 340px);
  background: #1a1510; border: 1px solid #3a3128; border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.5);
}
.ed .lvl { display: flex; align-items: center; gap: 4px; }
.ed .lvl b { color: #ffb01f; font-weight: 700; min-width: 34px; text-align: center; }
.ed .lvlname { color: #8d8165; font-size: 10px; max-width: 160px; overflow: hidden;
  text-overflow: ellipsis; white-space: nowrap; }
.ed .opts { display: flex; gap: 4px; margin-left: auto; flex-wrap: wrap; }
.ed button {
  background: #241d16; color: #e8e2d8; border: 1px solid #4a3f33; border-radius: 5px;
  padding: 5px 8px; font: 11px/1 ui-monospace, monospace; cursor: pointer; white-space: nowrap;
}
.ed button:hover { background: #322a20; }
.ed button[aria-pressed="true"] { background: #ffb01f; color: #14100c; border-color: #ffb01f; }
.ed button:disabled { opacity: 0.35; cursor: default; }
.ed button:disabled:hover { background: #241d16; }
.ed .body {
  position: fixed; top: 64px; left: 12px; bottom: 12px; width: 360px; pointer-events: auto;
  display: flex; background: #14100c; border: 1px solid #3a3128; border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.5); overflow: hidden;
}
.ed .rail {
  flex: 0 0 116px; border-right: 1px solid #3a3128; overflow-y: auto;
  display: flex; flex-direction: column; background: #100c09;
}
.ed .rail .r {
  display: flex; align-items: center; gap: 7px; padding: 7px 9px; cursor: pointer;
  border-bottom: 1px solid #241d16; color: #a89c88;
}
.ed .rail .r:hover { background: #1c1712; }
.ed .rail .r.on { background: #241d16; color: #ffb01f; }
.ed .rail .r .n {
  width: 17px; height: 17px; border-radius: 4px; border: 1px solid #4a3f33;
  display: flex; align-items: center; justify-content: center; font-size: 9px; flex: 0 0 auto;
}
.ed .rail .r.on .n { border-color: #ffb01f; color: #ffb01f; }
.ed .rail .r.gameplay { border-bottom: 2px solid #4a3f33; }
.ed .rail .r.gameplay .n { background: #ffb01f; color: #14100c; border-color: #ffb01f; }
.ed .rail .r.gameplay.on .n { background: #ffd670; }
.ed .panel { flex: 1 1 0; overflow-y: auto; padding: 8px 10px; display: grid; gap: 8px; align-content: start; }
.ed .hint { color: #8d8165; }
.ed .palette { display: grid; gap: 3px; }
.ed .palette .p {
  display: flex; align-items: center; justify-content: space-between; gap: 6px;
  padding: 5px 7px; border: 1px solid #4a3f33; border-radius: 5px; background: #1c1712; cursor: pointer;
}
.ed .palette .p:hover { background: #241d16; }
.ed .palette .p[aria-pressed="true"] { border-color: #ffb01f; color: #ffb01f; }
.ed .palette .p .t { color: #6b6152; font-size: 9px; text-transform: uppercase; letter-spacing: 0.06em; }
.ed .palette .p[data-ref="1"] { cursor: default; color: #6b6152; }
.ed .palette .p[data-ref="1"]:hover { background: #1c1712; }
.ed .row { display: flex; gap: 5px; flex-wrap: wrap; }
.ed .row > * { flex: 1 1 auto; min-width: 0; }
.ed .kv { display: grid; grid-template-columns: 46px 1fr; gap: 3px 6px; align-items: center; }
.ed .kv span { color: #8d8165; }
.ed .kv b { font-weight: 400; word-break: break-all; }
.ed label.f { display: flex; flex-direction: column; gap: 2px; font-size: 10px; color: #8d8165; }
.ed input[type=number] {
  width: 100%; background: #241d16; color: #e8e2d8; border: 1px solid #4a3f33;
  border-radius: 4px; padding: 3px 5px; font: 11px/1 ui-monospace, monospace;
}
.ed .out {
  background: #0d0a07; border: 1px solid #3a3128; border-radius: 5px; padding: 6px;
  color: #b9d98a; white-space: pre-wrap; word-break: break-all; cursor: text; user-select: text;
}

/* PANEL COLLAPSE. Owner ask: the editor on a phone in portrait. The
   ~360px sidebar this whole file's header comment calls an accepted trade
   is not a trade on a 390px screen — it IS the screen, the same overlay
   bug the header describes v1 having, just reached from a narrower device
   instead of a bigger panel. A collapse toggle is the general fix: it
   works on any width, and it is what lets someone confirm a placement by
   looking at the game with the panel out of the way, on ANY device. */
.ed.collapsed .body { display: none; }

/* PORTRAIT / NARROW-WIDTH. Below this width the body cannot live at the
   LEFT at any size worth having — a sidebar narrow enough to leave the
   game clickable is too narrow to hold a palette row. So it moves to the
   BOTTOM instead: full width, a fixed height that leaves the top of the
   screen (where a level's floor usually sits) clickable, and the rail
   turns from a left column into a horizontal strip along its top edge,
   because there is no longer a spare column to put it in.
   the "orientation: portrait" condition matters, not just decoration: a phone
   turned SIDEWAYS can easily be narrower than 760px too (667px is a real
   device width), and without this it would get the bottom-sheet treatment
   built for the tall axis while its actual short axis is height — this
   query and the landscape one below fought over exactly that width once,
   silently, because this one had no orientation condition at all. */
@media (max-width: 760px) and (orientation: portrait) {
  .ed .topbar {
    max-width: calc(100vw - 24px);
    flex-wrap: wrap;
  }
  .ed .body {
    top: auto; left: 8px; right: 8px; bottom: 8px; width: auto;
    height: 44vh; max-height: 320px;
    flex-direction: column;
  }
  .ed .rail {
    flex: 0 0 auto; width: 100%; max-height: 40px;
    flex-direction: row; overflow-x: auto; overflow-y: hidden;
    border-right: none; border-bottom: 1px solid #3a3128;
  }
  .ed .rail .r {
    flex: 0 0 auto; border-bottom: none; border-right: 1px solid #241d16;
  }
  .ed .rail .r.gameplay { border-bottom: none; border-right: 2px solid #4a3f33; }
  .ed .panel { padding: 6px 8px; gap: 6px; }
}

/* LANDSCAPE / SHORT-HEIGHT. A phone on its side keeps width (the sidebar
   shape still works) but loses height — dev-menu.js's own panel is
   full-height on the right (its comment says so: "must never cover the
   part of the picture you are judging"), so the sidebar has to be
   NARROWER here than on desktop, and the top bar has to stay out of that
   panel's corner with a gap sized to ITS narrow-mode width (see
   dev-menu.css's matching landscape block) rather than desktop's 300px. */
@media (orientation: landscape) and (max-height: 500px) {
  .ed .topbar { max-width: calc(100vw - 210px); flex-wrap: wrap; }
  /* 76px clears a topbar wrapped to two rows (measured ~66px at 667px
     wide) with a margin — a value tied to how many buttons happen to fit
     per row is too fragile to trust exactly, so this leans generous. */
  .ed .body { width: 260px; top: 76px; }
  .ed .rail { flex: 0 0 100px; }
}
`;

// Anything the editor itself put in the scene must never be pickable, or
// the selection box becomes the thing you select and nothing else can be.
const MINE = '__insp';

// ---- the rail -------------------------------------------------------------
// GAMEPLAY first because it is the layer everything else frames, then the
// six painted lanes in depth order — nearest to the eye first, matching
// how a person reads "what's in front of what" faster than back-to-front.
const RAIL = [
  { key: 'gameplay', label: 'GAMEPLAY', n: '★' },
  { key: 'fore', label: 'foreground', n: 6 },
  { key: 'near', label: 'near', n: 5 },
  { key: 'mid', label: 'mid', n: 4 },
  { key: 'far', label: 'far', n: 3 },
  { key: 'skyline', label: 'skyline', n: 2 },
  { key: 'sky', label: 'sky', n: 1 },
];

// Which art layer a placeable prop belongs to. Not derived — the placement
// z for the pipe vocabulary is fixed inside world2-dressing.js rather than
// carried on the row, so this is a short, honest table rather than a
// computed lookup. `lamp` has a real per-row `z` and is offered on every
// art layer; everything else is offered on the one lane it visually reads
// as belonging to.
const PROP_LAYER = {
  pipeStack: 'near', buriedPipe: 'near', serviceWall: 'mid', pipeMouth: 'near',
  standpipe: 'near', pumpPlatform: 'near', walkway: 'mid', valve: 'near',
  // world 1's own vocabulary (world1-dressing.js)
  hazardBarrier: 'near', materialYard: 'near', scaffoldBay: 'mid',
  gableFrame: 'mid', billboard: 'near', crateCluster: 'near',
};

// GAMEPLAY reference taxonomy — parts.js's own kinds, grouped the way a
// level actually reads them. Labels only: see the header for why placement
// from here is not wired yet.
const GAMEPLAY_GROUPS = [
  { t: 'terrain', items: ['ground', 'mound', 'ledge', 'pit', 'bank', 'brickWall', 'chasm', 'girderBeam'] },
  { t: 'gizmo', items: ['belt', 'tarp', 'hoist', 'pipe', 'ladder', 'scaffold', 'shallow', 'deep', 'swingBall'] },
  { t: 'machine', items: ['machine (excavator/crane/skidder/loader/flattener)', 'girderStack'] },
  { t: 'reward', items: ['bolts', 'golden', 'blueprint', 'checkpoint', 'flag'] },
];

// GAMEPLAY, LIVE. Unlike the reference groups above, these five place for
// real: a skitter/hopper/roller/bucket bot is `new Robot(...)` and a vent
// is `new SteamVent(...)` — the exact classes `buildSite()` calls, added to
// the SAME live arrays (`site.robots` / `site.vents`) the update loop
// already walks every frame, so a placed one patrols, stomps and hits like
// any other. What is NOT here — a machine, a ladder, a belt — either
// reshapes the tile grid at load time or owns state main.js does not
// expose a way to extend at runtime; robots and a vent do neither.
const GAMEPLAY_LIVE = {
  skitter: { label: 'skitter' },
  hopper: { label: 'hopper' },
  roller: { label: 'roller' },
  bucket: { label: 'bucket bot' },
  vent: { label: 'steam vent' },
};

const el = (tag, cls, html) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
};

export class Inspector {
  constructor(win) {
    this.win = win;
    this.el = null;
    this.on = false;                // 'pick' | 'walk' | 'place' | false
    this.picked = null;
    this.box = null;
    this.drag = null;
    this.host = null;
    this.layer = 'gameplay';
    this.pendingProp = null;        // prop key selected in the palette, for PLACE mode
    this.undoStack = [];
    this.levels = null;             // lazily imported: [{i, label, name}]
    this.levelIdx = 0;
  }

  api() { return this.win.__eeri || null; }

  // NOT async. `dev.html` calls `mount()` without awaiting it, and the
  // menu can open the instant the framed game boots — so the DOM and the
  // `watchMenu()` observer that catches that have to exist before this
  // function does anything that can take a network round trip. The first
  // cut fetched the level list here with `await import(...)` before
  // building the panel at all, and on a slow load the pause menu could
  // open and close again with the observer not yet attached and no DEV
  // TOOLS row ever added — a race with no error, just a button that
  // sometimes is not there.
  mount(host) {
    this.host = host;
    if (!host.ownerDocument.getElementById('inspCss')) {
      const st = host.ownerDocument.createElement('style');
      st.id = 'inspCss'; st.textContent = CSS;
      host.ownerDocument.head.appendChild(st);
    }

    const d = host.ownerDocument;
    this.el = d.createElement('div');
    this.el.className = 'ed';
    this.el.hidden = true;
    this.el.innerHTML = `
      <div class="topbar">
        <div class="lvl">
          <button type="button" data-a="lvlPrev">‹</button>
          <b data-el="lvlLabel">—</b>
          <button type="button" data-a="lvlNext">›</button>
          <span class="lvlname" data-el="lvlName"></span>
        </div>
        <div class="opts">
          <button type="button" data-a="pick" aria-pressed="false">PICK</button>
          <button type="button" data-a="place" aria-pressed="false" disabled>PLACE</button>
          <button type="button" data-a="walk" aria-pressed="false">WALK</button>
          <button type="button" data-a="undo" disabled>UNDO</button>
          <button type="button" data-a="copy">COPY</button>
          <button type="button" data-a="collapse" aria-pressed="false" title="hide the panel, keep the mode">▾</button>
          <button type="button" data-a="close">×</button>
        </div>
      </div>
      <div class="body">
        <div class="rail" data-el="rail"></div>
        <div class="panel">
          <div class="hint" data-el="tip"></div>
          <div class="palette" data-el="palette"></div>
          <div class="kv">
            <span>obj</span><b data-el="name">—</b>
            <span>in</span><b data-el="grp">—</b>
            <span>size</span><b data-el="size">—</b>
            <span>row</span><b data-el="row">—</b>
          </div>
          <div class="row">
            <label class="f">x<input type="number" step="0.1" data-el="x"></label>
            <label class="f">y<input type="number" step="0.1" data-el="y"></label>
            <label class="f">z<input type="number" step="0.02" data-el="z"></label>
          </div>
          <div class="row" data-el="fields"></div>
          <div class="row">
            <button type="button" data-a="copyRow">COPY ROW</button>
            <button type="button" data-a="hide">HIDE</button>
            <button type="button" data-a="reset">REVERT</button>
          </div>
          <div class="out" data-el="out">—</div>
        </div>
      </div>`;
    host.appendChild(this.el);

    this.renderRail();
    this.setLayer('gameplay');

    this.el.addEventListener('click', (e) => {
      const a = e.target?.dataset?.a;
      if (!a) return;
      if (a === 'close') this.hide();
      if (a === 'pick') this.setMode('pick');
      if (a === 'walk') this.setMode('walk');
      if (a === 'place') this.setMode('place');
      if (a === 'undo') this.undo();
      if (a === 'copy') this.copy();
      if (a === 'collapse') this.toggleCollapse();
      if (a === 'copyRow') this.copy();
      if (a === 'hide') this.hidePicked();
      if (a === 'reset') this.revert();
      if (a === 'lvlPrev') this.gotoLevel(this.levelIdx - 1);
      if (a === 'lvlNext') this.gotoLevel(this.levelIdx + 1);
    });
    for (const k of ['x', 'y', 'z']) {
      this.q(k).addEventListener('input', () => this.applyFields());
    }

    // v1 caught clicks with a full-viewport div in the TOP page (z-index
    // above the game, below the panel). v2's panel is wide — a top bar plus
    // a rail plus a palette, per the owner's own layout — and a click meant
    // for the far side of the picture landed on the PANEL instead, because
    // the panel's own z-index put it above the catcher. The click that was
    // supposed to place a lamp instead re-clicked the palette item sitting
    // right under the cursor and TOGGLED PLACE MODE OFF, so nothing placed
    // and nothing said why.
    //
    // Binding straight to the iframe's OWN document sidesteps the whole
    // stacking fight: the panel lives in the top page, the canvas lives in
    // the iframe, and a click can only ever be over one of them. `capture:
    // true` plus `stopPropagation` is what stops the SAME click from also
    // reaching the game's own controls while a mode is active — the one
    // thing the old overlay did for free by sitting physically on top.
    this.bindCanvas();
    this.keys = (e) => this.key(e);
    host.ownerDocument.addEventListener('keydown', this.keys);

    this.watchMenu();

    // The level list, fetched AFTER the panel exists — the same class of
    // static read spec.mjs and report.mjs already make, never a debug
    // hook, so no button in main.js has to know this exists.
    this.loadLevels();
    return this;
  }

  async loadLevels() {
    try {
      // Import `levelid.js` BEFORE reading `ROOMS`, never spread
      // `WORLD34_ROOMS` in on top of it. `levelid.js` imports
      // `world34-register.js`, whose whole job is pushing worlds 3-4 onto
      // `rooms.js`'s own exported array in place (see that file's own
      // comment: "the same live array that level.js re-exports") — so by
      // the time this line runs, `ROOMS` already holds all twelve. Doing
      // both — as this file's first cut did, copying the shape of an
      // older draft of `rooms.mjs` — double-counted worlds 3-4 into an
      // 18-level list and broke every level-index lookup after level 6.
      const { labelOf } = await import('../js/levelid.js?v=57');
      const { ROOMS } = await import('../js/rooms.js?v=57');
      this.levels = ROOMS.map((r, i) => ({ i, label: labelOf(i, ROOMS.length), name: r.name }));
    } catch { this.levels = []; }
    if (!this.el.hidden) this.syncLevel();
  }

  // Bind directly to the framed game's own document. `capture: true` lets
  // this run BEFORE the game's own input listeners see the same event, and
  // `stopPropagation` (only while a mode is on) is what keeps a placement
  // click from also being read as a game click. Filtered on the CANVAS
  // itself so nothing about clicking the game's own DOM (its pause button,
  // its touch sticks) is ever swallowed.
  bindCanvas() {
    const doc = this.win.document;
    const onCanvas = (e) => e.target?.tagName === 'CANVAS';
    this._down = (e) => {
      if (!this.on || !onCanvas(e)) return;
      e.stopPropagation(); e.preventDefault();
      e.target.setPointerCapture?.(e.pointerId);
      this.down(e);
    };
    this._move = (e) => {
      if (!this.drag) return;
      e.stopPropagation();
      this.move(e);
    };
    this._up = (e) => {
      if (!this.on) return;
      e.stopPropagation();
      this.up(e);
    };
    doc.addEventListener('pointerdown', this._down, true);
    doc.addEventListener('pointermove', this._move, true);
    doc.addEventListener('pointerup', this._up, true);
  }

  destroy() {
    try {
      const doc = this.win.document;
      if (this._down) doc.removeEventListener('pointerdown', this._down, true);
      if (this._move) doc.removeEventListener('pointermove', this._move, true);
      if (this._up) doc.removeEventListener('pointerup', this._up, true);
    } catch { /* the iframe may already be gone */ }
    this.mo?.disconnect();
    if (this.keys) this.host?.ownerDocument.removeEventListener('keydown', this.keys);
    this.el?.remove();
  }

  q(name) { return this.el.querySelector(`[data-el="${name}"]`); }

  // ---- the pause menu is the way in (owner direction) ---------------------
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

  show() {
    this.el.hidden = false;
    this.syncLevel();
    this.setLayer(this.layer);
  }
  hide() { this.setMode(null); this.el.hidden = true; }
  toggle() { this.el.hidden ? this.show() : this.hide(); }

  // Hides the BODY only — level, mode and pick stay live, so collapsing
  // to look at a placement does not also drop what you were doing. This
  // is the escape hatch a narrow/portrait screen needs (see the CSS): the
  // body can eat the whole width there, and there is no width small
  // enough to shrink a palette row into that still leaves it usable.
  toggleCollapse() {
    const on = this.el.classList.toggle('collapsed');
    const btn = this.el.querySelector('[data-a="collapse"]');
    if (btn) { btn.setAttribute('aria-pressed', String(on)); btn.textContent = on ? '▴' : '▾'; }
  }

  // ---- level picker ---------------------------------------------------
  syncLevel() {
    const A = this.api(); if (!A) return;
    this.levelIdx = A.site();
    const row = this.levels?.[this.levelIdx];
    this.q('lvlLabel').textContent = row ? row.label : '—';
    this.q('lvlName').textContent = row ? row.name : '';
  }

  // MUST be awaited from in here, not fired-and-forgotten. `goSite()` is
  // the game's own async function, defined and running in the IFRAME's
  // realm; called from the top page and left unobserved, its `veil()`
  // promise (a bare `setTimeout` wrapped in `new Promise`) never settled —
  // site stayed put and `transitioning` stayed true forever, with no error
  // anywhere to say why. Awaiting the SAME call from the top page resolves
  // it correctly every time. Cross-realm async is not free in a same-
  // origin iframe the way it looks like it should be; this is now the one
  // place in the file that calls into the game and does not fire-and-forget.
  // The game's own level-change fade is a `setTimeout`-wrapped Promise
  // (`veil()` in main.js), and a browser can throttle timers belonging to
  // an IFRAME THAT JUST LOST FOCUS — which this one always has, since the
  // click that starts a level change necessarily landed on a button in the
  // TOP page. Measured: up to twenty real seconds before the game's own
  // `transitioning` flag comes back down, `this.win.focus()` or not. That
  // is too slow to be worth explaining and not worth chasing further here
  // — the fix that matters is that the UI never lies about which state
  // it's in while it waits, however long that turns out to be. So the
  // level nav disables itself and says so, and the poll has no ceiling
  // that would let it give up and show a stale level while the game goes
  // on to finish the change on its own a few seconds later.
  gotoLevel(i) {
    const A = this.api(); if (!A || !this.levels?.length || this.pendingLevel) return;
    const n = Math.max(0, Math.min(this.levels.length - 1, i));
    this.select(null);
    this.pendingLevel = true;
    this.q('lvlLabel').textContent = '…';
    for (const a of ['lvlPrev', 'lvlNext']) this.el.querySelector(`[data-a="${a}"]`).disabled = true;
    this.win.focus();
    A.debug.goSite(n);
    const poll = () => {
      if (A.site() === n && !A.debug.transitioning()) {
        this.pendingLevel = false;
        for (const a of ['lvlPrev', 'lvlNext']) this.el.querySelector(`[data-a="${a}"]`).disabled = false;
        this.syncLevel();
        this.setLayer(this.layer);
        return;
      }
      setTimeout(poll, 100);
    };
    poll();
  }

  // ---- the rail ---------------------------------------------------------
  renderRail() {
    const box = this.q('rail');
    box.innerHTML = '';
    for (const r of RAIL) {
      const row = el('div', `r${r.key === 'gameplay' ? ' gameplay' : ''}`,
        `<span class="n">${r.n}</span><span>${r.label}</span>`);
      row.dataset.key = r.key;
      row.addEventListener('click', () => this.setLayer(r.key));
      box.appendChild(row);
    }
  }

  setLayer(key) {
    this.layer = key;
    for (const row of this.q('rail').children) {
      row.classList.toggle('on', row.dataset.key === key);
    }
    this.pendingProp = null;
    this.dimOtherLayers(key);
    this.renderPalette(key);
    const placeBtn = this.el.querySelector('[data-a="place"]');
    placeBtn.disabled = true;
    this.q('tip').textContent = key === 'gameplay'
      ? 'PICK drags any physical object. A skitter, hopper, roller, bucket bot or vent PLACES for real — everything else below is reference only (terrain reshapes the tile grid, a machine/ladder/belt owns state this editor cannot extend yet).'
      : `PICK drags anything already on this lane. Choose an asset below, then PLACE to click it onto the picture.`;
  }

  // Solo the selected art lane by dimming the others; a `gameplay` pick
  // restores everything, since the physical layer needs the whole picture
  // to reason about.
  dimOtherLayers(key) {
    const A = this.api(); if (!A) return;
    const world = A.debug.world();
    const dim = key !== 'gameplay';
    A.scene.traverse((o) => {
      if (!o.material || !('opacity' in o.material) || !o.name) return;
      const m = o.name.match(/^([a-z]+)\/([a-z]+)/i);
      if (!m || m[1] !== world) return;
      const lane = m[2];
      if (!RAIL.some((r) => r.key === lane)) return;
      o.userData.__baseOpacity ??= o.material.opacity;
      o.material.opacity = dim && lane !== key ? o.userData.__baseOpacity * 0.22 : o.userData.__baseOpacity;
    });
  }

  renderPalette(key) {
    const box = this.q('palette');
    box.innerHTML = '';
    if (key === 'gameplay') {
      box.appendChild(el('div', '', `<span class="t">place</span>`));
      for (const [t, spec] of Object.entries(GAMEPLAY_LIVE)) {
        const p = el('div', 'p', `<span>${spec.label}</span><span class="t">place</span>`);
        p.dataset.prop = t;
        p.dataset.ref = '0';
        p.setAttribute('aria-pressed', 'false');
        p.addEventListener('click', () => this.pickPalette(t, p));
        box.appendChild(p);
      }
      for (const g of GAMEPLAY_GROUPS) {
        box.appendChild(el('div', '', `<span class="t">${g.t}</span>`));
        for (const item of g.items) {
          box.appendChild(el('div', 'p', `<span>${item}</span>`)).dataset.ref = '1';
        }
      }
      return;
    }
    const A = this.api();
    const types = Object.keys(PROP_LAYER).filter((k) => PROP_LAYER[k] === key);
    types.push('lamp');   // every art layer takes a lamp
    const live = this.liveTypes(A);
    for (const t of types) {
      const p = el('div', 'p', `<span>${t}</span><span class="t">${live.has(t) ? 'place' : 'reference'}</span>`);
      p.dataset.prop = t;
      p.dataset.ref = live.has(t) ? '0' : '1';
      p.setAttribute('aria-pressed', 'false');
      if (live.has(t)) p.addEventListener('click', () => this.pickPalette(t, p));
      box.appendChild(p);
    }
    if (!types.length) box.appendChild(el('div', 'hint', 'nothing placeable on this lane yet'));
  }

  // Which prop types can actually be BUILT right now, for this world: lamp
  // always (js/light.js is world-agnostic), and whatever the current
  // world's dressing module exposed through `dressingBuilders()` — which is
  // worlds 1 and 2 today. Worlds 3 and 4 dress themselves through
  // `world34-dressing.js`, a freestanding sidecar the editor cannot reach,
  // so they offer lamps only here, and the palette says so via the
  // "reference" tag.
  liveTypes(A) {
    const s = new Set(['lamp']);
    const builders = A?.debug?.dressingBuilders?.();
    if (builders) for (const k of Object.keys(builders)) s.add(k);
    return s;
  }

  pickPalette(prop, node) {
    this.pendingProp = prop;
    for (const p of this.q('palette').children) p.setAttribute?.('aria-pressed', String(p === node));
    const placeBtn = this.el.querySelector('[data-a="place"]');
    placeBtn.disabled = false;
    this.setMode('place');
  }

  setMode(m) {
    this.on = this.on === m ? null : m;
    // The cursor is the only visible sign a mode is armed now that there
    // is no overlay div to show/hide — set on the game's OWN canvas, since
    // that is the element a click will actually land on.
    const cv = this.win.document?.querySelector('canvas');
    if (cv) cv.style.cursor = this.on ? 'crosshair' : '';
    for (const a of ['pick', 'walk', 'place']) {
      this.el.querySelector(`[data-a="${a}"]`)
        .setAttribute('aria-pressed', String(this.on === a));
    }
  }

  // ---- picking / placing ---------------------------------------------
  // NDC is computed against the CANVAS rect, not the window (unchanged
  // from v1 — the game fixes its own aspect and letterboxes inside the
  // frame, so a pointer mapped against the viewport is wrong by the size
  // of the bars).
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

  down(e) {
    const A = this.api(); if (!A) return;
    if (this.on === 'walk') {
      const rc = this.ray(e); if (!rc) return;
      const p = new A.THREE.Vector3();
      rc.ray.intersectPlane(new A.THREE.Plane(new A.THREE.Vector3(0, 0, 1), 0), p);
      if (p) A.debug.setPos(p.x, Math.max(p.y, 1));
      return;
    }
    if (this.on === 'place') { this.placeAt(e); return; }
    const rc = this.ray(e); if (!rc) return;
    const hits = rc.intersectObjects(A.scene.children, true)
      .filter((h) => h.object.visible && !this.isMine(h.object) && this.pickableUnder(h.object));
    if (!hits.length) { this.select(null); return; }
    // A picked GAMEPLAY entity is selected by its OWNING group, never a
    // leaf mesh — a robot is several meshes under one group PLUS a shadow
    // that is a SIBLING of that group, not a child of it (robots.js adds
    // the shadow straight to the room, same as the group itself). A ray
    // that lands on the shadow — a big flat disc right under the robot,
    // easy to hit — would walk up through the room and never find the
    // group's tag at all. So the shadow carries the same tag, and either
    // way the ENTITY it points at, never the object the tag happened to be
    // ON, is what gets dragged — `entity.group.position` is what
    // `update()` overwrites from `.x/.y` every frame, so selecting
    // anything else silently snaps back next frame.
    let target = hits[0].object;
    for (let n = target; n; n = n.parent) {
      if (n.userData?.liveEntity) { target = n.userData.liveEntity.group; break; }
    }
    this.select(target);
    const o = this.picked;
    const world = new A.THREE.Vector3(); o.getWorldPosition(world);
    this.drag = { z: world.z, off: world.clone().sub(hits[0].point), from: o.position.clone() };
  }

  // A place-click raycasts against a plane at the SELECTED LAYER's own z
  // (lamps carry a z field with a sensible default; a dressing prop is
  // fixed at whatever depth its builder already puts it, so the plane only
  // has to be roughly right — the builder's own z wins).
  placeAt(e) {
    const A = this.api(); if (!A || !this.pendingProp) return;
    const rc = this.ray(e); if (!rc) return;
    const z = this.layerZ();
    const p = new A.THREE.Vector3();
    if (!rc.ray.intersectPlane(new A.THREE.Plane(new A.THREE.Vector3(0, 0, 1), -z), p)) return;
    if (this.layer === 'gameplay' && GAMEPLAY_LIVE[this.pendingProp]) {
      this.placeLive(A, p).catch((err) => console.error('[eeri] placeLive failed:', err));
      return;
    }
    const row = { prop: this.pendingProp, x: +p.x.toFixed(2), y: +Math.max(0, p.y).toFixed(2) };
    if (this.pendingProp === 'lamp') row.z = z;
    let made = null;
    if (this.pendingProp === 'lamp') {
      import('../js/light.js?v=57').then(({ buildLamp }) => {
        made = buildLamp(A.THREE, row);
        made.userData.sceneryRow = { world: A.debug.world(), index: -1, ...row };
        A.scene.add(made);
        A.debug.lamps?.()?.push?.(made);
        this.afterPlace(made, row);
      });
      return;
    }
    const builders = A.debug.dressingBuilders?.();
    const build = builders?.[this.pendingProp];
    if (!build) return;
    made = build(row) || null;
    // Most dressing builders add several meshes straight to their own
    // root and return nothing — same trap `world2-dressing.js` describes
    // for its own placement loop — so fall back to "last child added".
    if (!made) {
      const root = this.win.__eeri?.scene;
      made = root?.children[root.children.length - 1] || null;
    }
    if (made) { made.userData.sceneryRow = { world: A.debug.world(), index: -1, ...row }; }
    this.afterPlace(made, row);
  }

  // GAMEPLAY placement — a real Robot or SteamVent, pushed into the SAME
  // live array the update loop walks, so it patrols/blows/hits like any
  // other. Two things a scenery prop never needed: the array to push into
  // (`liveArr`, so undo can splice it back out), and a live entity to keep
  // in sync with the mesh (`.group.userData.liveEntity`) — a robot/vent's
  // collision reads its own `.x`/`.y` fields, NOT `group.position`, so a
  // drag that only moved the mesh would look right and hit wrong.
  async placeLive(A, p) {
    const prop = this.pendingProp;
    const group = A.debug.roomGroup(), level = A.debug.levelObj();
    const x = +p.x.toFixed(2), y = +Math.max(0, p.y).toFixed(2);
    let entity, liveArr, row;
    // `A.debug.Robot()` / `SteamVent()` — the game's OWN classes, already
    // loaded in the iframe's own realm (see the comment on those hooks in
    // main.js). Not a fresh `import()` from here: that would build one out
    // of a SECOND, top-page-realm copy of robots.js and its own 'three'.
    if (prop === 'vent') {
      const SteamVent = A.debug.SteamVent();
      entity = new SteamVent(group, level, x);
      liveArr = A.debug.ventsLive();
      row = { prop, x };
    } else {
      const Robot = A.debug.Robot();
      const asset = await A.debug.loadRobotAsset(prop).catch(() => null);
      entity = new Robot(group, level, { c0: x - 1, c1: x + 1, kind: prop, cy: Math.round(y) }, asset);
      liveArr = A.debug.robotsLive();
      row = { prop, x, cy: Math.round(y) };
    }
    liveArr.push(entity);
    entity.group.userData.liveEntity = entity;
    entity.group.userData.sceneryRow = { world: 'gameplay', index: -1, ...row };
    // The shadow is a SIBLING of the group (robots.js adds both straight
    // to the room), not a child — tag it too, or a ray that lands on the
    // shadow disc picks nothing.
    if (entity.shadow) entity.shadow.userData.liveEntity = entity;
    this.undoStack.push({ type: 'spawnLive', obj: entity.group, entity, liveArr });
    this.el.querySelector('[data-a="undo"]').disabled = false;
    this.select(entity.group);
  }

  afterPlace(made, row) {
    if (!made) return;
    this.undoStack.push({ type: 'spawn', obj: made });
    this.el.querySelector('[data-a="undo"]').disabled = false;
    this.select(made);
  }

  layerZ() {
    if (this.layer === 'gameplay') return 0;
    const Z = { sky: -50, skyline: -22, far: -16, mid: -10, near: -3, fore: -1.2 };
    return Z[this.layer] ?? -1.2;
  }

  move(e) {
    if (!this.drag || !this.picked) return;
    const A = this.api(); if (!A) return;
    const rc = this.ray(e); if (!rc) return;
    const p = new A.THREE.Vector3();
    if (!rc.ray.intersectPlane(
      new A.THREE.Plane(new A.THREE.Vector3(0, 0, 1), -this.drag.z), p)) return;
    p.add(this.drag.off);
    const parent = this.picked.parent;
    const local = parent ? parent.worldToLocal(p.clone()) : p;
    this.picked.position.set(local.x, local.y, this.picked.position.z);
    // A robot/vent reads its OWN .x/.y for collision, never group.position
    // — see placeLive()'s header comment. Keep both honest while dragging,
    // not just at the end, so the hit-test a jump is judged against is the
    // one you are actually looking at.
    const live = this.picked.userData.liveEntity;
    if (live) { live.x = local.x; live.y = local.y; if ('baseY' in live) live.baseY = local.y; }
    this.readout();
  }

  up(e) {
    if (this.drag && this.picked && !this.picked.position.equals(this.drag.from)) {
      this.undoStack.push({ type: 'move', obj: this.picked, from: this.drag.from.clone() });
      this.el.querySelector('[data-a="undo"]').disabled = false;
    }
    this.drag = null;
    e.target?.releasePointerCapture?.(e.pointerId);
  }

  undo() {
    const step = this.undoStack.pop();
    if (!step) return;
    if (step.type === 'move') { step.obj.position.copy(step.from); if (step.obj === this.picked) this.readout(); }
    if (step.type === 'spawn') {
      // parent.remove(), not scene.remove(): a lamp is a direct child of
      // the scene, but a dressing prop's mesh is a child of THAT MODULE'S
      // own group — scene.remove() on it is a silent no-op (Object3D.remove
      // only ever touches its own direct children), so undoing a placed
      // pipe stack looked like it worked and left the mesh sitting there.
      step.obj.parent?.remove(step.obj);
      step.obj.geometry?.dispose?.(); step.obj.material?.dispose?.();
      if (step.obj === this.picked) this.select(null);
    }
    if (step.type === 'spawnLive') {
      step.obj.parent?.remove(step.obj);
      const i = step.liveArr.indexOf(step.entity);
      if (i >= 0) step.liveArr.splice(i, 1);
      if (step.obj === this.picked) this.select(null);
    }
    this.el.querySelector('[data-a="undo"]').disabled = this.undoStack.length === 0;
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
    this.readout();
  }

  isMine(o) {
    for (let n = o; n; n = n.parent) if (n.userData?.[MINE]) return true;
    return false;
  }

  // THE PAINTED BACKDROP WAS ALWAYS IN THE WAY. `intersectObjects` tests the
  // full geometric plane of every mesh it is given, alpha or no alpha — a
  // diorama lane is a texture on a big flat quad, and that quad sits
  // between the camera and everything behind it (the fore lane nearest of
  // all, z 2.2, ahead of every gameplay object). So PICK was never really
  // reaching a robot, a machine, anything: a click anywhere on the picture
  // hit the nearest painted lane first, however "empty" that pixel looked.
  // The rows fed to `intersectObjects` are the ONLY defence a raycast has
  // against this, so a lane the current selection is not standing on gets
  // excluded from the candidate list entirely rather than merely dimmed —
  // dimming is for the eye, this is for the ray.
  pickableUnder(o) {
    if (this.layer === 'gameplay') {
      const world = this.api()?.debug.world();
      for (let n = o; n; n = n.parent) {
        const m = n.name?.match(/^([a-z]+)\/([a-z]+)/i);
        if (m && m[1] === world && RAIL.some((r) => r.key === m[2])) return false;
      }
      return true;
    }
    // on an art lane, everything nearer the camera than the lane itself
    // would otherwise shadow it the same way — exclude every OTHER lane,
    // gameplay objects stay pickable throughout
    const world = this.api()?.debug.world();
    for (let n = o; n; n = n.parent) {
      const m = n.name?.match(/^([a-z]+)\/([a-z]+)/i);
      if (m && m[1] === world && RAIL.some((r) => r.key === m[2]) && m[2] !== this.layer) return false;
    }
    return true;
  }

  select(o) {
    const A = this.api(); if (!A) return;
    if (this.box) { this.box.parent?.remove(this.box); this.box = null; }
    this.picked = o;
    if (!o) { this.readout(); return; }
    if (!o.userData.__inspHome) o.userData.__inspHome = o.position.clone();
    this.box = new A.THREE.Box3Helper(new A.THREE.Box3().setFromObject(o), 0xffb01f);
    this.box.userData[MINE] = true;
    A.scene.add(this.box);
    this.readout();
  }

  readout() {
    const o = this.picked;
    const set = (k, v) => { this.q(k).value = v; };
    this.q('fields').innerHTML = '';
    if (!o) {
      this.q('name').textContent = '—'; this.q('grp').textContent = '—';
      this.q('row').textContent = '—';
      this.q('size').textContent = '—'; this.q('out').textContent = '—';
      for (const k of ['x', 'y', 'z']) this.q(k).value = '';
      return;
    }
    const A = this.api();
    const w = new A.THREE.Vector3(); o.getWorldPosition(w);
    let top = o, path = [];
    while (top.parent && top.parent !== A.scene) top = top.parent;
    for (let n = o; n && n !== A.scene; n = n.parent) if (n.name) path.unshift(n.name);
    const b = new A.THREE.Box3().setFromObject(o);
    const s = b.getSize(new A.THREE.Vector3());
    const f = (v) => (Math.round(v * 100) / 100).toFixed(2);

    this.q('name').textContent = o.name || o.type;
    this.q('grp').textContent = top.name || path[0] || '(scene)';
    let row = null;
    for (let n = o; n && n !== A.scene && !row; n = n.parent) row = n.userData?.sceneryRow || null;
    this.q('row').textContent = row ? `${row.world}[${row.index >= 0 ? row.index : 'new'}] ${row.prop}` : '— (not placed from scenery.js)';
    this.rowOf = row;
    this.q('size').textContent = `${f(s.x)} × ${f(s.y)} × ${f(s.z)}`;
    set('x', f(w.x)); set('y', f(w.y)); set('z', f(w.z));
    // GAMEPLAY rows paste as parts.js CALLS (positional args — `robot(c0,
    // c1, kind, cy)`), never as the `{prop, x, y, …}` object scenery rows
    // use — that object shape is not a thing rooms.js reads, and handing
    // it back would read as pasteable when it is not.
    if (row?.world === 'gameplay') {
      this.q('out').textContent = row.prop === 'vent'
        ? `hazard(${f(w.x)}, 'steam'),`
        : `robot(${f(w.x - 1)}, ${f(w.x + 1)}, '${row.prop}', ${Math.round(w.y)}),`;
    } else {
      this.q('out').textContent = row
        ? `{ prop: '${row.prop}', x: ${f(w.x)}, y: ${f(w.y)}${
            Object.keys(row).filter((k) => !['world', 'index', 'prop', 'x', 'y', 'cy'].includes(k))
              .map((k) => `, ${k}: ${row[k]}`).join('')} },`
        : `x ${f(w.x)}, y ${f(w.y)}, z ${f(w.z)}`;
    }
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
    const live = o.userData.liveEntity;
    if (live) { live.x = local.x; live.y = local.y; if ('baseY' in live) live.baseY = local.y; }
    if (this.box) this.box.box.setFromObject(o);
    this.q('out').textContent = this.q('out').textContent;
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
    this.readout();
  }
}
