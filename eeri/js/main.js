// EERI — orchestration: scene, camera, the mode machine (foot / mount /
// riding / dismount), sites, bolts, HUD. Owns no art: characters come from
// the asset seam, the environment from layers.js, the rooms from level.js.
//
// v3: the level goes beyond one room. Everything a room owns — map meshes,
// gate, bolts, the lock piece, the hazard — lives in one group built by
// buildSite() and torn down whole; the kid, the machine models and the
// diorama persist. Walking out of a site's gate loads the next one, and
// only the last gate says SITE CLEAR.

import * as THREE from 'three';
import { PAL, LAYER_Z, LAYER_TINT } from './palette.js?v=50';
import { Input } from './input.js?v=50';
import { Level, ROOMS, LAB } from './level.js?v=50';
import {
  buildBankModel, Bank, buildGirderModel, Girder, buildWallModel, Wall,
} from './pieces.js?v=50';
import { buildLayers, LAYER_RECTS, PPU, layerPx } from './layers.js?v=50';
import { Camera } from './camera.js?v=50';
import { buildKidModel, Kid, Player } from './kid.js?v=50';
import { buildExcavatorModel, Excavator } from './excavator.js?v=50';
import { buildCraneModel, Crane } from './crane.js?v=50';
import { buildSkidderModel, buildLoaderModel } from './rigs.js?v=50';
import { Robot, SteamVent, loadRobotAsset } from './robots.js?v=50';
import { Hoist } from './hoist.js?v=50';
import { buildFlagModel, Flag, buildCheckpointModel, Checkpoint } from './flag.js?v=50';
import { WreckingBall } from './hazards.js?v=50';
import { AudioKit } from './audio.js?v=50';
import { loadManifest, getModel, getPiece, uiAsset, manifestData } from './assets.js?v=50';
import { craftMat, craftBox } from './craft.js?v=50';
import { t as tr } from './lang.js?v=50';
import { showIntro } from './intro.js?v=50';
import { toggleMenu, closeMenu, menuOpen, menuMove, menuPick } from './menu.js?v=50';
import { slugOf, labelOf, parseSlug } from './levelid.js?v=50';
import { buildWorldBuilding, PARTS as BUILD_PARTS } from './clockout.js?v=50';

const FOV = 24;   // the dolly distance is the camera director's (js/camera.js)
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

async function boot() {
  // THE TITLE SCREEN, first (owner direction 2026-08-14). It goes up before
  // any of the build below, so the player is looking at the game's name and
  // its one line of story while three megabytes of layer art and two GLBs
  // come down behind it. That is why it is started HERE and awaited at the
  // END: an intro shown after the loading has finished costs the player
  // time instead of hiding it.
  //
  // `?skip` walks past it, because the smoke gate and the playthrough bot
  // are not testing the title screen and would both stall on a button.
  //
  // THE MANIFEST IS READ FIRST, and that is not an optimisation — it is the
  // fix for a bug that hid the logo completely. `showIntro()` asks
  // `uiAsset('logo')` for the painted mark, and `uiAsset` reads a manifest
  // that was still null this early, so it returned null EVERY time and the
  // intro silently fell back to its code-drawn wordmark. The logo has been
  // live since PR #236 and had never once been seen. The manifest is a
  // small JSON and the heavy art still streams behind the title, so nothing
  // is lost by knowing what the assets are before drawing the first screen.
  const skipIntro = new URLSearchParams(location.search).has('skip');
  if (!skipIntro) await loadManifest();
  const introDone = skipIntro ? Promise.resolve() : showIntro();

  // renderer: clean edges, no post stack (ART_BRIEF §3.4)
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  document.getElementById('game').appendChild(renderer.domElement);

  // 16:9, ALWAYS (owner, 2026-08-15). A level is composed — the reach
  // budget, the camera pull-backs, where a hazard sits relative to the lip
  // you read it from — and all of it is composed at one shape. Letting the
  // viewport dictate the aspect means a tall phone shows less of the room
  // ahead than a laptop does, so the same jump is a different question on
  // different hardware. The stage is the picture; the rest of the window is
  // the room it hangs in, and on a phone the pad lives there.
  const STAGE = 16 / 9;
  function fitStage() {
    const vw = innerWidth;
    // THE PAD IS NOT ON THE PICTURE. If a control plate is up it owns the
    // bottom of the screen outright and the stage fits into what is left —
    // the arcade arrangement, screen above panel. A 16:9 stage that then
    // has a control strip laid over its lower third is not a 16:9 stage.
    const pad = document.getElementById('pad');
    const padH = pad && getComputedStyle(pad).display !== 'none'
      ? Math.round(pad.getBoundingClientRect().height) : 0;
    const vh = Math.max(120, innerHeight - padH);
    // 16:9 IS A LANDSCAPE RULE (owner, 2026-08-15: "aimed at horizontal
    // mobile, not vertical"). Held sideways the picture is the whole of the
    // screen and its shape is the composition, so it is pinned. Held
    // upright the picture is a WINDOW above the pad — there is no 16:9 to
    // preserve there, and letterboxing a portrait phone twice over (bars
    // beside a picture that already has the pad below it) wastes the only
    // dimension that room has.
    let w = vw, h = Math.round(vw / STAGE);
    if (innerHeight > innerWidth) { w = vw; h = vh; }        // portrait: fill it
    else if (h > vh) { h = vh; w = Math.round(vh * STAGE); }
    const el = renderer.domElement;
    el.style.width = w + 'px';
    el.style.height = h + 'px';
    el.style.left = Math.round((vw - w) / 2) + 'px';
    el.style.top = Math.round((vh - h) / 2) + 'px';
    renderer.setSize(w, h, false);
    document.documentElement.style.setProperty('--stage-h', h + 'px');
    document.documentElement.style.setProperty('--stage-w', w + 'px');
    document.documentElement.style.setProperty('--stage-top', el.style.top);
    return { w, h };
  }
  const stage0 = fitStage();

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PAL.SKY);

  // one soft rig: hemisphere fill + one directional key from the upper-left
  scene.add(new THREE.HemisphereLight(0xd8ecf8, 0x9a7c5a, 1.25));
  const key = new THREE.DirectionalLight(0xffffff, 1.35);
  key.position.set(-14, 22, 18);
  scene.add(key);

  // the camera's aspect is the STAGE's, not the window's — that is the
  // whole point of fixing it
  const camera = new THREE.PerspectiveCamera(FOV, STAGE, 0.1, 220);
  camera.aspect = stage0.w / stage0.h;
  addEventListener('resize', () => {
    const { w, h } = fitStage();
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  });

  const input = new Input();
  input.bindButtons({ tL: 'left', tR: 'right', tU: 'up', tD: 'down', tJ: 'jump', tA: 'action',
    tSel: 'menu', tSt: 'menu' });
  input.bindStick('stick');   // plated: one zone over the drawn d-pad

  // the noise waits for a gesture — browsers will not start it otherwise
  const audio = new AudioKit();
  const wake = () => { audio.ensure(); audio.idleStart(); };
  addEventListener('keydown', wake, { once: true });
  addEventListener('pointerdown', wake, { once: true });

  // ---- the persistent world: diorama + cast -------------------------------
  // (already read above when the title screen needed the logo; harmless and
  // required on the `?skip` path, which never took that branch)
  await loadManifest();

  // THE TOUCH PLATES (art lane, PR #236). The controls are a drawn
  // backboard and the DOM buttons are transparent hit areas over it — a
  // Game Boy DMG face in portrait, an arcade control-panel strip in
  // landscape, because a handheld and a cabinet are different objects.
  //
  // `.plated` goes on <html> only once an image has actually DECODED. If
  // the art 404s or the manifest still calls it a placeholder, the drawn
  // circle buttons stay and the game is still playable — the same rule the
  // rest of the asset seam runs on.
  {
    const plates = [['padP', 'padplate_portrait'], ['padL', 'padplate_landscape']];
    let loaded = 0;
    await Promise.all(plates.map(([id, key]) => new Promise((done) => {
      const src = uiAsset(key);
      const img = document.getElementById(id);
      if (!src || !img) return done();
      img.onload = () => { loaded++; done(); };
      img.onerror = () => { console.warn(`[eeri] pad plate "${key}" did not load — keeping the drawn buttons`); done(); };
      img.src = src;
    })));
    if (loaded === plates.length) document.documentElement.classList.add('plated');
    // the plate's height is what the stage fits around, and it is only real
    // once the image has laid out — so measure again here
    requestAnimationFrame(() => { const f = fitStage(); camera.aspect = f.w / f.h; camera.updateProjectionMatrix(); });
  }
  // WHICH WORLD A LEVEL IS IN. Three levels to a world (DESIGN §4.2), so
  // this is arithmetic rather than a table — until a world wants a name
  // that is not its backdrop's, at which point it becomes one.
  const WORLDS = ['groundworks', 'pipeworks', 'grove', 'nightshift'];
  const worldOf = (i) => WORLDS[Math.floor(i / 3)] || 'groundworks';

  // WHAT IS FINISHED IS WHAT THE MANIFEST HAS PAINTED. Worlds 3 and 4 are
  // built and structurally proved (`test/world34.mjs`) but UNDRESSED — no
  // layer set exists for them yet — and greybox is not something to hand a
  // six-year-old through a menu. So the game ends at the last room whose
  // world has live art, and the moment the art lane flips a world's layers
  // to `live` those rooms appear on their own. No flag to remember, and no
  // second list to keep in step: the seam already knows.
  const dressed = (w) => {
    const set = manifestData()?.layers?.[w];
    return !!set && Object.values(set).every((e) => e.status === 'live');
  };
  const SHOWN = (() => {
    let n = 0;
    while (n < ROOMS.length && dressed(worldOf(n))) n++;
    return Math.max(1, n);
  })();

  let diorama = await buildLayers(scene, worldOf(0), REDUCED);

  const kid = new Kid(await getModel('eeri', buildKidModel));
  scene.add(kid.group, kid.shadow);

  // the background works (§3.5): the same machine, repainted by depth,
  // digging on the FAR layer's ground line — scenery, shared by every site
  const bg = new Excavator(new Level(ROOMS[0]), 58, 3.7,
    await getModel('excavator', () => buildExcavatorModel(LAYER_TINT.FAR)));
  bg.group.position.z = LAYER_Z.FAR + 0.4;
  bg.shadow.visible = false;
  bg.face = -1;
  scene.add(bg.group, ...bg.puffs);

  // ---- sites: one room at a time, built and torn down whole ---------------
  // The count is PER LEVEL and it is the level's completion figure (DESIGN
  // §4.2): a hundred bolts in a level, three golden ones hidden in it. A
  // running total across the whole game is a number nobody can finish.
  let collected = 0;          // this level's bolts
  let goldenGot = 0;          // this level's golden bolts
  let runBolts = 0, runGolden = 0;   // …and the job, for the last screen
  let blueprints = 0;                // one per world, kept for the whole run
  // THE WORLD'S OWN GOLDEN COUNT (DESIGN §4.3). The run total is the whole
  // day; this is the nine that build THIS world's building, so it banks a
  // level's find when the level ends and resets when the world does. Kept
  // separate from `runGolden` because a building cannot be nine-ninths built
  // by bolts found in another world.
  let worldGolden = 0, worldOfGolden = null;
  const bankGolden = () => { worldGolden += goldenGot; };

  function dispose(root) {
    root.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
      for (const m of mats) { if (m.map) m.map.dispose(); m.dispose(); }
    });
  }

  const boltGeo = new THREE.CylinderGeometry(0.26, 0.26, 0.12, 6);
  const hubGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.14, 6);

  const SITES = [...ROOMS, LAB];
  const LAST_LEVEL = SHOWN - 1;   // the last DRESSED room — see SHOWN above

  async function buildSite(i) {
    // the world is the campaign's fact, not the room's — handed in so level.js
    // can tint its earth and its grass lip from it
    const level = new Level(SITES[i], worldOf(i));
    const def = level.def;
    const group = new THREE.Group();
    level.buildMeshes(group);

    // the lock piece this room carries, through the asset seam
    const bank = def.bank
      ? new Bank(group, level, def.bank,
          await getPiece('bank', () => buildBankModel(def.bank.rows, def.bank.c1 - def.bank.c0 + 1)))
      : null;
    const girder = def.girder
      ? new Girder(group, level, def.girder,
          await getPiece('girder', () => buildGirderModel(def.girder.spanLen)))
      : null;
    const wall = def.wall
      ? new Wall(group, level, def.wall,
          await getPiece('wall', () => buildWallModel(def.wall.rows, def.wall.c1 - def.wall.c0 + 1)))
      : null;
    const ball = def.ball
      ? new WreckingBall(group, def.ball.px, def.ball.py, def.ball.len, def.ball.zoneW)
      : null;

    // the small stuff: robots patrol a span the kit guaranteed is floor,
    // vents breathe on their own clock
    // Each robot is handed its own loaded model, or null to draw its own. The
    // load is per ROBOT rather than per kind because a skinned mesh cannot be
    // cloned without SkeletonUtils (not in vendor/), and two robots sharing a
    // skeleton animate as one puppet. Parallel, and every failure resolves to
    // null, so a missing or broken model costs a placeholder and never a level.
    const robots = await Promise.all(def.robots.map(async (r) =>
      new Robot(group, level, r, await loadRobotAsset(r.kind || 'skitter'))));
    // THE HOISTS: entities, because a moving floor cannot be a tile. They
    // register with the level so the player's platform pass can find them —
    // one list, filled here, rather than the player reaching into `site`.
    const hoists = (def.hoists || []).map((h) => new Hoist(group, level, h));
    level.platforms = hoists;
    const vents = def.hazards.filter((h) => h.type === 'steam')
      .map((h) => new SteamVent(group, level, h.x));

    // THE MACHINE. One per room, and it is the room's own — a crane where a
    // crane is the answer. It starts UNMANNED either way: beacon turning,
    // working its own cycle, dangerous until it is yours.
    // TYPE-DRIVEN, not "crane or else excavator". That branch is why World
    // 2's pump ride was an excavator wearing the word and why Worlds 3 and 4
    // borrowed Worlds 1-2's machines: everything that was not a crane got
    // the digger. A type now names its own model, and the CLASS follows the
    // verbs rather than the name — `smash` is the crane's arc, everything
    // else is the excavator's arm — so a new machine is an entry here plus a
    // builder, and `assets.js` swaps in a real mesh on the same node names.
    const RIGS = {
      excavator: { key: 'excavator', build: buildExcavatorModel },
      crane: { key: 'crane', build: buildCraneModel },
      skidder: { key: 'skidder', build: buildSkidderModel },
      loader: { key: 'loader', build: buildLoaderModel },
    };
    const md = def.machines[0];
    let machine = null;
    if (md) {
      const rig = RIGS[md.type] || RIGS.excavator;
      const asset = await getModel(rig.key, rig.build);
      // parts.js writes `spawn[type]` for every machine it compiles; the kid's
      // own spawn is the only fallback that cannot be wrong about the floor.
      const y = def.spawn[md.type]?.y ?? def.spawn.kid.y;
      machine = (md.verbs || []).includes('smash')
        ? new Crane(level, md.x, y, asset, false)
        : new Excavator(level, md.x, y, asset, false);
    }
    if (machine) {
      machine.track = md.track;
      machine.kind = md.type;
      group.add(machine.group, machine.shadow, ...machine.puffs);
    }

    // the midway gate, and the level's own ending
    const checkpoint = def.checkpoint
      ? new Checkpoint(group, def.checkpoint, await getPiece('checkpoint', buildCheckpointModel))
      : null;
    const flag = def.flag
      ? new Flag(group, def.flag, await getPiece(def.flag.big ? 'flagBig' : 'flag',
          () => buildFlagModel(def.flag.big)))
      : null;

    // THE GATE is the WORLD's ending, not a level's (DESIGN §4.2) — Eeri
    // clocking out and walking through — so it is built only where a room
    // declares one, which is the last level of a world.
    if (def.gate) {
      for (const dx of [-0.6, 0.6]) {
        const post = craftBox(0.22, 2.6, 0.22, craftMat(PAL.MACHINE, 'balsa'));
        post.position.set(def.gate.x + dx, def.gate.y + 1.3, 0); group.add(post);
      }
      const bar = craftBox(1.6, 0.26, 0.26, craftMat(PAL.MACHINE_DK, 'balsa'));
      bar.position.set(def.gate.x, def.gate.y + 2.6, 0); group.add(bar);
    }

    // bolts: the collectable (3D slow spinners, §6). The model comes through
    // the seam like everything else — and the seam's contract is that the
    // PLACEHOLDER BUILDER RETURNS THE SAME SHAPE AS THE LIVE PATH ({root}),
    // "so game code cannot tell them apart". The first cut returned a bare
    // Group from the builder and unwrapped .root outside the call, which
    // worked on whichever path was exercised that day and crashed on the
    // other. A bolt is a PICKUP: origin at its centre, cloned per cell.
    const boltModel = (await getModel('bolt', () => {
      const g = new THREE.Group();
      const m1 = craftMat(PAL.MACHINE, 'balsa', { transparent: true });
      const m2 = craftMat(PAL.MACHINE_DK, 'balsa', { transparent: true });
      const nut = new THREE.Mesh(boltGeo, m1); nut.rotation.x = Math.PI / 2;
      const hub = new THREE.Mesh(hubGeo, m2); hub.rotation.x = Math.PI / 2;
      g.add(nut, hub);
      return { root: g };
    })).root;
    const bolts = level.boltCells.map((cell, bi) => {
      const g = boltModel.clone(true);
      // the collect pop fades it, and a material cloned off a GLB is opaque
      g.traverse((o) => {
        if (!o.isMesh) return;
        o.material = o.material.clone();      // per-bolt, or one pop fades all
        o.material.transparent = true;
      });
      g.position.set(cell.x, cell.y, 0);
      g.baseY = cell.y; g.phase = bi * 0.7; g.state = 'up'; g.popT = 0;
      group.add(g);
      return g;
    });

    // …and the three that are hidden. A golden bolt has to be UNMISTAKABLY
    // not a bolt at 32 px (DESIGN §6.3), so it is a different SILHOUETTE
    // rather than a bigger one: a ring around a star, not a fatter nut.
    // Through the seam, exactly like `bolt` above and for the same reason: the
    // model existed, was cut, was catalogued — and nothing ever asked for it,
    // so it could not load under any circumstances. The placeholder builder
    // returns `{root}` because that is the contract, and getting it wrong is
    // what crashed the bolt path on whichever branch was not exercised.
    const goldModel = (await getModel('token_bolt', () => {
      const g = new THREE.Group();
      const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.3, 0),
        craftMat(PAL.MACHINE, 'balsa', { transparent: true }));
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.07, 6, 16),
        craftMat(PAL.MACHINE_DK, 'balsa', { transparent: true }));
      g.add(core, ring);
      return { root: g };
    })).root;
    // THE BLUEPRINT — one per world, a pickup for now (owner, 2026-08-21:
    // "blueprints can just be collectables for now, we can add a secret art
    // and gallery later"). A rolled sheet, so it is unmistakably not a bolt
    // at 32px: DESIGN §6.3's rule for every token.
    const bpModel = (await getPiece('blueprint', () => {
      const g = new THREE.Group();
      const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.72, 10),
        craftMat('#eaf2fb', 'card', { transparent: true }));
      roll.rotation.z = Math.PI / 2;
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.05, 6, 12),
        craftMat(PAL.MACHINE, 'balsa', { transparent: true }));
      band.rotation.y = Math.PI / 2;
      const edge = new THREE.Mesh(new THREE.CylinderGeometry(0.175, 0.175, 0.08, 10),
        craftMat('#3f6ea8', 'card', { transparent: true }));
      edge.rotation.z = Math.PI / 2; edge.position.x = 0.34;
      g.add(roll, band, edge);
      return { root: g };
    })).root;
    let blueprint = null;
    if (def.blueprint) {
      const [brow, bcol] = def.blueprint;
      blueprint = bpModel.clone(true);
      blueprint.traverse((o) => {
        if (!o.isMesh) return;
        o.material = o.material.clone();
        o.material.transparent = true;
      });
      blueprint.position.set(bcol + 0.5, (level.h - 1 - brow) + 0.5, 0);
      blueprint.baseY = blueprint.position.y; blueprint.state = 'up'; blueprint.popT = 0;
      group.add(blueprint);
    }

    const golden = def.golden.map(([row, col], gi) => {
      const g = goldModel.clone(true);
      // the collect pop fades it, and a material cloned off a GLB is OPAQUE —
      // the same trap the bolts hit one line of code above this one
      g.traverse((o) => {
        if (!o.isMesh) return;
        o.material = o.material.clone();
        o.material.transparent = true;
      });
      g.position.set(col + 0.5, (level.h - 1 - row) + 0.5, 0);
      g.baseY = g.position.y; g.phase = gi * 1.4; g.state = 'up'; g.popT = 0;
      group.add(g);
      return g;
    });

    scene.add(group);
    return {
      def, level, group, bank, girder, wall, ball, bolts, golden, blueprint,
      robots, vents, machine, checkpoint, flag, hoists,
    };
  }

  // The lab is buildable but NOT in the sequence: SITES is what a room index
  // means, ROOMS is what the game runs through. One derived constant rather
  // than two lists that can disagree — the whole reason the parts kit exists.
  // THE ADDRESS (js/levelid.js). `/eeri/#eeri-1-2` opens the second level of
  // the first world — Mario's scheme, because it is the one a parent already
  // reads. A fragment that names nothing lands on 1-1 rather than a black
  // screen, and so does one naming a level that is not built YET: the game
  // grows three levels at a time, so the address space is the whole twelve
  // from the start and the rooms arrive later.
  const fromHash = () => {
    const p = parseSlug(location.hash);
    if (!p) return 0;
    if (p.lab) return ROOMS.length;              // SITES[ROOMS.length] is LAB
    return p.index < ROOMS.length ? p.index : 0;
  };
  // `replaceState`, never `location.hash =` — assigning fires `hashchange`
  // back at the handler that just moved the level, and the game reloads the
  // room it is already standing in. Same trap gameoflife documents.
  const setHash = (i) => {
    const want = '#' + slugOf(i, ROOMS.length);
    if (location.hash !== want) history.replaceState(null, '', want);
  };

  let siteIndex = fromHash();
  // THE BACKDROP HAS TO MATCH THE ROOM YOU BOOT INTO, not room 1. The
  // diorama is built above, before the address is read — which is right,
  // because it is the persistent layer — but a deep link (or the menu's
  // level jump on a reload) can start you in another world, and only
  // goSite() swaps it. `/eeri/#eeri-2-1` came up in World 1's site.
  if (worldOf(siteIndex) !== diorama.world) {
    diorama.dispose();
    diorama = await buildLayers(scene, worldOf(siteIndex), REDUCED);
  }
  let site = await buildSite(siteIndex);
  setHash(siteIndex);

  const player = new Player(site.level, site.def.spawn.kid, kid);
  // `exc` is whatever machine this room parked here — an excavator, or a
  // crane. Both answer the same handful of calls, so the mode machine below
  // never asks which it got.
  let exc = site.machine;

  // ---- HUD ----------------------------------------------------------------
  const hintEl = document.getElementById('hint');
  const boltsEl = document.getElementById('bolts');
  const goldEl = document.getElementById('gold');
  const siteEl = document.getElementById('site');
  const setCounts = () => {
    boltsEl.textContent = `⬡ ${collected}/${site.def.bolts.length}`;
    // BLUEPRINTS ONLY APPEAR ONCE YOU HAVE ONE. A 0/4 on the HUD from the
    // first second is a chore printed on the screen; a count that shows up
    // the moment you find the first one is a discovery that stayed.
    goldEl.textContent = `✦ ${goldenGot}/${site.def.golden.length}`
      + (blueprints ? `  ▤ ${blueprints}/4` : '');
  };
  // the address beside the name, so what is on screen is what you can paste
  // to somebody: "1-2 · LEVEL 2 — THE SCAFFOLD"
  const setSiteName = () => {
    const tag = labelOf(siteIndex, ROOMS.length);
    siteEl.textContent = `${tag} · ${site.def.name}`;
    document.title = `EERI ${tag} — ${site.def.name}`;
  };
  setSiteName();
  const setHint = (s) => { if (hintEl.textContent !== s) hintEl.textContent = s; };
  // ONE glyph set, for every input (DESIGN.md §5). A prompt never names a
  // key: a key name is no help to a thumb or a pad, and the on-screen
  // buttons are labelled with these same glyphs, so what you read is what
  // you press whichever of the three you are holding.
  // ONE glyph set, for every input (DESIGN.md §5). A prompt never names a
  // key: a key name is no help to a thumb or a pad, and the on-screen
  // buttons carry these same glyphs, so what you read is what you press
  // whichever of the three you are holding.
  //
  // The WORDS now come from `lang.js`. The player is a Finnish six-year-old
  // and read them in English for fourteen versions. The glyphs do not
  // translate — they are the same in all three.
  const HINT = {
    foot: tr('hFoot'),
    ladder: tr('hLadder'),
    flag: tr('hFlag'),
    // pointed, not vague: a six-year-old needs the DIRECTION as well as the
    // fact. ◀ or ▶ depending on which side the machine is parked.
    fetchBack: tr('hFetchBack'),
    fetchOn: tr('hFetchOn'),
    wary: tr('hWary'),
    near: tr('hNear'),
    ride: tr('hRide'),
    dig: tr('hDig'),
    sling: tr('hSling'),
    carry: tr('hCarry'),
    seat: tr('hSeat'),
    smash: tr('hSmash'),
    out: tr('hOut'),
    pipe: tr('hPipe'),
  };

  // ---- the mode machine ---------------------------------------------------
  let mode = 'foot';          // foot | mounting | riding | dismounting
  // `digT` went with the dig timer — the stroke owns that beat now
  let moveT = 0, slingT = 0, cleared = false, transitioning = false;
  let stomps = 0;
  const from = new THREE.Vector3(), mid = new THREE.Vector3(), to = new THREE.Vector3();
  const v3 = new THREE.Vector3();

  // THE PIPE (DESIGN world 2). A tube you go inside: stand at a mouth, press
  // the action, and you come out the other end. It is a scripted move like
  // the mount rather than a tile like the belt — a tile is a place, and a
  // pipe is a pair of places plus the trip between them.
  //
  // `piping` is the trip; `pipeCool` is what stops the far mouth reading as
  // a fresh entrance the instant you arrive and sending you straight back.
  let piping = null, pipeT = 0, pipeCool = 0;
  const PIPE_T = 0.55;
  const atPipe = () => {
    if (!player.grounded || piping || pipeCool > 0) return null;
    for (const q of site.def.pipes || []) {
      for (const [m, other] of [[q.a, q.b], [q.b, q.a]]) {
        if (Math.abs(player.x - (m.c + 0.5)) < 0.7 && Math.abs(player.y - m.cy) < 0.6) {
          return { from: m, to: other };
        }
      }
    }
    return null;
  };

  const nearExc = () => !!exc
    && Math.abs(player.x - exc.x) < 2.6 && player.y > exc.y - 1 && player.y < exc.y + 2.4 && player.grounded;

  // the danger of an unmanned machine is its bucket, and only while it is
  // down in the sweep — that is the cycle you have to read to get aboard
  const buck = new THREE.Vector3();
  function unmannedStrike() {
    if (!exc || exc.tamed) return false;
    if (exc.kind === 'crane') {
      if (!exc.striking) return false;
      exc.ballWorld(buck);
      return Math.abs(buck.x - player.x) < 1.4 && buck.y < player.y + player.h + 0.5;
    }
    if (!exc.swinging) return false;
    exc.bucketWorld(buck);
    return Math.abs(buck.x - player.x) < 1.2 && buck.y < player.y + player.h + 0.3;
  }

  function startMount() {
    mode = 'mounting'; moveT = 0;
    from.set(player.x, player.y, 0);
    exc.stepWorld(mid); mid.y += 0.9; mid.z = 0;
    exc.tame();                       // the threat becomes the tool
    input.take('action'); input.take('jump');
  }

  // thrown = struck out of the cab. The Yoshi rule: a hazard takes the
  // RIDE, not the run — so it is the same move, thrown further and higher.
  function startDismount(thrown = false) {
    mode = 'dismounting'; moveT = 0;
    exc.seatWorld(from); from.z = 0;
    const gx = exc.x - exc.face * (thrown ? 4.2 : 2.6);
    to.set(gx, Math.max(site.level.groundTop(gx, exc.y + 2), exc.y), 0);
    mid.copy(from).lerp(to, 0.5); mid.y = Math.max(from.y, to.y) + (thrown ? 2.8 : 1.4);
    if (thrown) player.mercyT = 1.3;
    kid.setFace(-exc.face);
    scene.add(kid.group); // back to world space
    exc.seatWorld(v3); kid.group.position.set(v3.x, v3.y, 0);
    input.take('action'); input.take('jump');
  }

  function bezier(t, out) {
    const u = 1 - t;
    out.set(
      u * u * from.x + 2 * u * t * mid.x + t * t * to.x,
      u * u * from.y + 2 * u * t * mid.y + t * t * to.y,
      0,
    );
  }

  // ---- moving between sites ----------------------------------------------
  function banner(text) {
    document.getElementById('banner')?.remove();
    const el = document.createElement('div');
    el.id = 'banner';
    el.textContent = text;
    document.body.appendChild(el);
  }

  // ---- THE VEIL --------------------------------------------------------
  // Down, swap, up. `on` is the only argument because a level change is the
  // only thing that uses it, and the two durations differ on purpose: going
  // dark should be quicker than coming back, so the cut feels like an
  // ending and the new room feels like an arrival.
  //
  // It resolves on a TIMER rather than on `transitionend`. That event never
  // fires when the value does not actually change — a second call while the
  // veil is already down, a browser that folds a 0ms transition away — and a
  // promise that never settles here means a black screen forever, which is
  // the one failure this must not have. Under `prefers-reduced-motion` both
  // times are 0: the same path, run instantly, rather than a branch that
  // skips the step that brings the lights back.
  const FADE = REDUCED ? { out: 0, in: 0 } : { out: 260, in: 420 };
  function veil(on) {
    const el = document.getElementById('veil');
    const ms = on ? FADE.out : FADE.in;
    if (el) {
      el.style.transitionDuration = `${ms}ms`;
      el.classList.toggle('on', on);
    }
    return new Promise((res) => setTimeout(res, ms));
  }

  async function goSite(i) {
    transitioning = true;
    banner(`${site.def.name}  ⬡ ${collected}/${site.def.bolts.length}  ✦ ${goldenGot}/${site.def.golden.length}`);
    audio.mount();
    // the lights go down BEFORE the old room is torn out, so the tear-out
    // and every model still in flight happen where nobody can see them
    await veil(true);
    const old = site;
    site = await buildSite(i);
    siteIndex = i;
    scene.remove(old.group);
    dispose(old.group);

    // …and the BACKDROP, if this room is in a different world. It was built
    // once at boot while there was only one world to be in; levels 4-6
    // played in front of World 1's site until this. Taken down before the
    // new one goes up — six full-width planes left in the scene are not
    // hidden by six more, the near ones are opaque.
    // A BUILDING BELONGS TO ITS WORLD. The count resets when the world does,
    // and it is keyed on the world rather than on the level index so that a
    // deep link or a level jump into the middle of world 3 does not arrive
    // carrying world 2's nine.
    const world = worldOf(i);
    if (world !== worldOfGolden) { worldGolden = 0; worldOfGolden = world; }

    const want = worldOf(i);
    if (want !== diorama.world) {
      diorama.dispose();
      diorama = await buildLayers(scene, want, REDUCED);
    }

    // the cast walks on: same kid, but each room's machine is the room's
    // own — a crane where a crane is the answer — and it is unmanned again,
    // beacon turning. Taming never carries between rooms.
    setHash(i);                        // the address follows the level
    const s = site.def.spawn;
    player.level = site.level;
    player.x = s.kid.x; player.y = s.kid.y; player.vx = 0; player.vy = 0; player.mercyT = 0;
    exc = site.machine;
    scene.add(kid.group);                    // out of the old seat, if he was in one
    mode = 'foot'; slingT = 0;
    player.climbing = false;
    input.take('action'); input.take('jump');
    setSiteName();
    collected = 0; goldenGot = 0;      // the counts belong to the LEVEL
    setCounts();

    // the camera CUTS — a slow pan across a rebuilt world is a lie about geography
    cam.setSite(site.def);
    cam.cut(player.x, player.y + 3);
    // …and the lights come up on the room already built and already framed.
    // `transitioning` is only cleared after that, because it is what the
    // flag, the pause menu and the gate all read to mean "the room change
    // is finished" — clearing it early would let a press land in the dark.
    await veil(false);
    // THE CARD IS TIMED FROM THE LIGHTS, not from the swap. Scheduling its
    // removal before the fade spent 420 ms of the card's 1.4 s behind a
    // rising veil — so on a slow machine the level you just finished could
    // be gone by the time you could read it. Now it gets its full beat on
    // the new room.
    setTimeout(() => document.getElementById('banner')?.remove(), 1400);
    transitioning = false;
  }

  // ---- debug handle (the smoke gate drives game state, not the clock) ----
  window.__eeri = {
    player, audio, input,
    // THREE and the scene, for the dev/FX pack (`dev/dev-menu.js`). These
    // are handles, not gameplay: the pack is peripheral by design and only
    // ever READS the game, but a particle has to be added to something, and
    // exporting the scene is how it gets a place to live without any part
    // of the game having to know effects exist. Same category as `tris` and
    // `camera` below — a debug export, kept out of `debug` only because
    // three.js wants the constructor as well as the container.
    THREE, scene,
    // …and the CAMERA object, for the same reason and on the same terms. The
    // pack could already add things to the scene; it could not ask "what is
    // under this pointer", because a raycast needs the camera the picture was
    // drawn with and `debug.camera()` returns a position, not the camera. The
    // level inspector is built on exactly that question. Read-only by
    // convention like the rest of this block — the pack reads the game, the
    // game never learns the pack exists.
    camera,
    // `exc` is reassigned every time a room is built, so it has to be read
    // through a getter — captured once, the handle kept pointing at the
    // machine from the room you had already left.
    get exc() { return exc; },
    get level() { return site.level; },
    get ball() { return site.ball; },
    mode: () => mode,
    site: () => siteIndex,
    collected: () => collected,
    reduced: REDUCED,
    debug: {
      press: (n) => input.press(n),
      release: (n) => input.release(n),
      setPos: (x, y) => { player.x = x; player.y = y; player.vx = 0; player.vy = 0; },
      excPos: () => (exc ? { x: exc.x, y: exc.y } : null),
      hazard: () => site.ball ? { state: site.ball.state, ...site.ball.ballPos() } : { state: 'none' },
      mercy: () => player.mercyT,
      // ---- the five the DEV PACK asked for (dev/README.md) --------------
      // Each is one line against something the game already does, which is
      // the whole rule for this seam: the pack reads the game, the game
      // never learns the pack exists.
      tame: () => { exc?.tame(); return !!exc?.tamed; },
      dig: () => (site.bank ? site.bank.dig() : false),
      // INVINCIBILITY is a mercy timer that never runs out rather than a
      // second code path through damage — a real branch here would be a
      // debugging aid that changes the thing being debugged.
      invincible: (v) => {
        god = v === undefined ? !god : !!v;
        if (!god) player.mercyT = 0;
        return god;
      },
      // the boxes the collisions actually use, so a hitbox preview draws
      // the truth instead of a guess at it
      boxes: () => [
        { tag: 'kid', x: player.x, y: player.y, hw: player.hw, h: player.h },
        ...(exc ? [{ tag: 'machine', x: exc.x, y: exc.y, hw: exc.hw, h: exc.h }] : []),
        ...site.robots.filter((r) => !r.dead)
          .map((r) => ({ tag: r.kind, x: r.x, y: r.y, hw: r.hw, h: r.h })),
      ],
      tamed: () => !!exc?.tamed,
      bank: () => site.bank ? { remaining: site.bank.remaining, cleared: site.bank.cleared } : null,
      girder: () => site.girder ? { state: site.girder.state, carrying: !!exc?.carrying } : null,
      wall: () => site.wall ? { hits: site.wall.hits, cracked: site.wall.cracked, cleared: site.wall.cleared } : null,
      machine: () => exc ? { kind: exc.kind, x: exc.x, track: exc.track, tamed: exc.tamed } : null,
      robots: () => site.robots.map((r) => ({
        x: +r.x.toFixed(2), y: +r.y.toFixed(2), h: r.h, kind: r.kind,
        state: r.state, dead: r.dead, stompable: r.stompable,
      })),
      stomps: () => stomps,
      padSeen: () => input.padSeen,
      vents: () => site.vents.map((v) => ({ x: v.x, blowing: v.blowing })),
      rooms: () => ROOMS.length,
      world: () => diorama.world,
      // Two more narrow reads added for the SAME reason `camera` was: the
      // dev-page editor needs somewhere to place a live prop and something
      // to place it WITH. `lamps()` is the live list (so a spawned one can
      // be found and undone); `dressingBuilders()` is the art lane's own
      // placeable vocabulary for the current world, if it has one. Neither
      // is read by the shipping game.
      lamps: () => diorama.lamps,
      dressingBuilders: () => diorama.dressingBuilders,
      // Four more, for the SAME reason and the SAME rule: the editor's
      // GAMEPLAY layer needs somewhere to place a robot or a vent, the room
      // group they have to be parented to for teardown to find them, and
      // the live arrays the update loop actually walks — `robots()` and
      // `vents()` two lines up hand back a mapped SNAPSHOT, which is right
      // for a debug readout and useless for pushing a new one in. None of
      // these four is read by the shipping game.
      robotsLive: () => site.robots,
      ventsLive: () => site.vents,
      roomGroup: () => site.group,
      levelObj: () => site.level,
      // The CLASSES themselves, not just the arrays — a fresh `import()`
      // from the dev page runs in the TOP PAGE's own module registry,
      // which is a DIFFERENT instance of robots.js (and of 'three' inside
      // it) than the one this file already has loaded. A `Robot` built
      // from that copy is still duck-type compatible with everything HERE
      // that walks `site.robots`, but it is exactly the kind of two-
      // instances trap this project keeps finding, so the working copy is
      // handed over instead of inviting the editor to load a second one.
      Robot: () => Robot,
      SteamVent: () => SteamVent,
      loadRobotAsset: (kind) => loadRobotAsset(kind),
      // a room change is not finished when the index flips — goSite() still
      // has to put the kid on the new spawn, so anything positioning him
      // must wait for this
      transitioning: () => transitioning,
      // the gizmo lab: buildable, never in the sequence (js/rooms.js)
      goLab: () => goSite(ROOMS.length),
      gizmos: () => ({ belts: site.def.belts, tarps: site.def.tarps, water: site.def.water }),
      wading: () => site.level.waterAt(player.x, player.y),
      pipes: () => site.def.pipes || [],
      hoists: () => site.hoists.map((h) => ({
        x: +h.x.toFixed(2), y: +h.y.toFixed(2), hw: h.hw,
        cy0: h.cy0, cy1: h.cy1, period: h.period,
      })),
      carried: () => !!player.carrier,
      piping: () => mode === 'piping',
      // the level's own furniture, so "it is a level and not a room" is
      // something the gate can actually ask
      climbing: () => player.climbing,
      counts: () => ({
        bolts: collected, ofBolts: site.def.bolts.length,
        golden: goldenGot, ofGolden: site.def.golden.length,
      }),
      // the world's building: what the golden bolts have put up so far.
      // `setGolden` is a DEV hook and nothing in play calls it — a building
      // has nine readings and a bot that collects nothing can only ever show
      // the first, so this is how the other eight get looked at.
      worldGolden: () => worldGolden,
      setGolden: (n) => { worldGolden = Math.max(0, Math.min(BUILD_PARTS, n | 0)); },
      buildParts: () => BUILD_PARTS,
      checkpoint: () => site.checkpoint
        ? { x: site.checkpoint.x, lit: site.checkpoint.lit, respawn: site.level.respawn }
        : null,
      flag: () => site.flag
        ? { x: site.flag.x, big: site.flag.big, phase: site.flag.phase, raised: site.flag.raised }
        : null,
      ladders: () => site.def.ladders,
      heave: () => exc?.heave?.(),
      cleared: () => cleared,
      dig: () => site.bank?.dig(),
      goSite: (i) => goSite(i),
      tris: () => renderer.info.render.triangles,
      // the 2D contract, computed rather than written down twice — the gate
      // checks assets/README.md (what an artist paints to) against this
      // Derived from layers.js's own layerPx() rather than recomputed here:
      // the gate compares this against assets/README.md, so if it did its own
      // arithmetic the two could agree with each other and both be wrong
      // about what the loader actually wants.
      layerContract: () => Object.fromEntries(Object.entries(LAYER_RECTS).map(([k, r]) => [k, {
        ...r, ...layerPx(k),
      }])),
      // where the camera actually is, so "it reframes" is testable
      camera: () => ({ x: camera.position.x, y: camera.position.y, z: camera.position.z }),
      // …and what the background is doing, so "it works" is too
      bg: () => diorama.positions(),
    },
  };

  setCounts();
  document.getElementById('boot').remove();

  // …and only now wait for START. By this point the scene is built, so the
  // first frame after the title fades is the real game, not a blue screen.
  await introDone;

  // ---- the loop ------------------------------------------------------------
  let t = 0;
  let god = false;          // dev: an unexpiring mercy timer, see debug.invincible
  let padded = false;       // a real controller is in hand — see the loop
  const cam = new Camera(camera, site.def);
  cam.cut(player.x, player.y + 3);
  const clock = new THREE.Clock();

  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.033);
    // controller first: polled in EVERY mode, not inside the play branch —
    // a pad that cannot reach the menu is a pad that cannot start the game
    input.pollGamepad();

    // A PAD IN HAND MEANS NO ON-SCREEN CONTROLS (owner, 2026-08-15). The
    // plate is a picture of a controller; holding a real one and looking at
    // a drawn one is the same joke twice, and on a landscape phone the
    // panel is a third of the screen. So the first pad input strips it and
    // the stage takes the space back — and the first TOUCH puts it back,
    // because a pad going idle is not the same as a pad going away.
    if (input.padSeen !== padded) {
      padded = input.padSeen;
      document.documentElement.classList.toggle('padded', padded);
      requestAnimationFrame(() => {
        const f = fitStage();
        camera.aspect = f.w / f.h;
        camera.updateProjectionMatrix();
      });
    }

    // THE MENU, and the pause is REAL. It gates the update half below —
    // not merely input — because a menu that leaves the world running is
    // how you come back to find a robot standing where you were. The clock
    // `t` does not advance either, so nothing on a timer (the hopper's
    // rhythm, the ball's wind-up, mercy frames) creeps while you read.
    if (input.take('menu')) {
      toggleMenu({
        levels: ROOMS.slice(0, SHOWN).map((r, i) => ({ i, label: labelOf(i) })),
        current: () => siteIndex,
        goSite: (i) => goSite(i),
        restart: () => goSite(siteIndex),
        home: () => { location.href = '../'; },
      });
    }
    if (menuOpen()) {
      // …and the menu takes the pad too. A controller that can OPEN a menu
      // and not move inside it is worse than one that cannot open it.
      if (input.take('down')) menuMove(1);
      if (input.take('up')) menuMove(-1);
      if (input.take('right')) menuMove(1);
      if (input.take('left')) menuMove(-1);
      if (input.take('jump') || input.take('action')) menuPick();
      renderer.render(scene, camera);
      return;
    }

    t += dt;

    if (!transitioning) {
    if (mode === 'foot') {
      pipeCool = Math.max(0, pipeCool - dt);
      player.update(dt, input);
      if (exc) { if (exc.tamed) exc.update(dt, null); else exc.work(dt); }
      if (player.justJumped) audio.jump();
      if (player.justLanded) audio.land();

      // heavy and blind: stand under the working bucket and it puts you down
      if (exc && unmannedStrike() && player.struck(exc.x)) { audio.splat(); cam.punch(1.1); }

      const near = nearExc();
      const pipeHere = atPipe();
      setHint(cleared ? HINT.out
        : near ? HINT.near
        : pipeHere ? HINT.pipe
        : player.climbing ? HINT.ladder
        : (site.flag && site.flag.phase >= 2 && !site.flag.raised
            && Math.abs(player.x - site.flag.x) < 12) ? HINT.flag
        : (exc && !exc.tamed && Math.abs(player.x - exc.x) < 6) ? HINT.wary
        : HINT.foot);
      if (near && input.take('action')) { startMount(); audio.mount(); }
      else if (!near && pipeHere && input.take('action')) {
        piping = pipeHere; pipeT = 0; mode = 'piping';
        audio.mount();
        input.take('jump');
      }
    } else if (mode === 'piping') {
      // THE TRIP. He ducks out of sight and reappears at the far mouth —
      // long enough to read as travel, short enough not to take the controls
      // away for a beat that matters. He is out of the world while it runs,
      // so nothing can touch him in transit, which is the whole reason this
      // is a mode rather than a teleport.
      pipeT += dt;
      const k = Math.min(1, pipeT / PIPE_T);
      kid.group.visible = k > 0.5;
      if (k > 0.5) {                       // second half: out at the far end
        player.x = piping.to.c + 0.5;
        player.y = piping.to.cy;
        player.vx = 0; player.vy = 0;
      }
      if (k >= 1) {
        kid.group.visible = true;
        // the far mouth is a mouth too, and would swallow him straight back
        // on the next frame without this
        pipeCool = 0.45;
        piping = null;
        mode = 'foot';
        audio.dismount();
        input.take('action'); input.take('jump');
      }
      setHint(HINT.pipe);
    } else if (mode === 'mounting') {
      moveT += dt / 0.55;
      exc.update(dt, null);
      exc.seatWorld(to); to.z = 0;
      bezier(Math.min(moveT, 1), v3);
      kid.group.position.copy(v3);
      kid.pose('climb', t);
      if (moveT >= 1) {
        exc.n.seat.add(kid.group);
        // SAT IN IT, not sunk into it. The seat node is where his FEET land,
        // and with the sit clip playing that put his shoulders inside the
        // cowl — the rider "swallowed by the mount" that ART_BRIEF §1.2 says
        // never to allow. A little up and a little toward the camera puts his
        // head and shoulders clear of the machine, which is the whole read:
        // a kid too small for the seat, driving anyway.
        kid.group.position.set(0.04, 0.2, 0.16);
        kid.group.rotation.y = 0; kid.turn = 0;
        // drain the way IN or the same press is read again as the way OUT —
        // a player who mashes E would climb in and fall straight back out
        input.take('action'); input.take('jump');
        mode = 'riding';
      }
    } else if (mode === 'riding') {
      const boomWas = exc.n.boom.rotation.z;
      exc.update(dt, {
        drive: input.axis(),
        boomUp: input.down.up,
        boomDown: input.down.down,
        swing: input.down.down,       // the crane reads DOWN as "heave"
      });
      player.x = exc.x; player.y = exc.y + 1; player.vx = 0; player.vy = 0;
      player.mercyT = Math.max(0, player.mercyT - dt);
      if (god) player.mercyT = 9;   // dev: invincible, see debug.invincible
      kid.pose('ride', t);
      kid.shadow.visible = false;
      kid.group.visible = true;
      audio.idleLoad(Math.min(1, Math.abs(exc.vx) / 3.4));
      if (Math.abs(exc.n.boom.rotation.z - boomWas) > 0.012) audio.boom();

      let rideHint = HINT.ride;

      // THE SMASH: the ball that swung at you unmanned is the ball you swing
      // at the wall. It lands when the arc comes through the bottom and the
      // ball is actually over the brickwork — one strike per swing, so the
      // wall comes down in two read-able beats rather than a blur.
      if (site.wall && exc.kind === 'crane') {
        const wd = site.def.wall;
        if (!site.wall.cleared) {
          if (exc.striking && !exc.struckThisSwing) {
            exc.ballWorld(buck);
            if (buck.x > wd.c0 - 1.2 && buck.x < wd.c1 + 2.2) {
              exc.struckThisSwing = true;
              site.wall.strike();
              audio.splat();
              cam.punch(site.wall.cleared ? 1.6 : 1.0);
            }
          }
          rideHint = Math.abs(exc.x - wd.c0) < 10 ? HINT.smash : HINT.ride;
        }
      }

      // THE DIG: bucket down, in the dirt, and the bank comes down a row at
      // a time. The bucket digs because it is a bucket (ART_BRIEF §1.2).
      if (site.bank && !site.bank.cleared) {
        const bk = site.def.bank;
        // IN RANGE IS A FACT ABOUT THE MACHINE, NOT ABOUT THE ARM. It used to
        // also require you to have driven the boom below 0.3 yourself — with
        // the same button that digs — so the first thing the game asked a
        // six-year-old for was to solve a control. Park next to the bank and
        // hold the verb; the machine lowers its own arm (excavator.js).
        const near = Math.abs(exc.x - (bk.c0 + bk.c1) / 2) < (bk.c1 - bk.c0) / 2 + 3.2;
        exc.digging = input.down.down && near;
        // THE BANK SAYS IT IS DIGGABLE before you press anything: within
        // reach it lifts and pulses, which is the indicator the owner found
        // missing. A thing you can act on has to look different from a thing
        // you cannot.
        site.bank.arm(near, t);
        if (exc.digging && exc.bit) {
          site.bank.dig();
          audio.splat();
          cam.punch(site.bank.cleared ? 1.5 : 0.85);
        }
        if (near || Math.abs(exc.x - bk.c0) < 6) rideHint = HINT.dig;
      }

      // THE GIRDER: the same gesture, the other way round — the bucket
      // takes the load off the stack, and lowers it in at the lip.
      if (site.girder) {
        const g = site.girder, gd = site.def.girder;
        if (g.state === 0) {
          const canSling = input.down.down
            && exc.n.boom.rotation.z < 0.3
            && Math.abs(exc.bucketWorld(buck).x - gd.stackX) < 2.6;
          if (canSling) {
            slingT += dt;
            if (slingT >= 0.55) { slingT = 0; g.sling(); exc.carrying = true; audio.clank(); cam.punch(0.5); }
          } else {
            slingT = 0;
          }
          if (canSling || Math.abs(exc.x - gd.stackX) < 6) rideHint = HINT.sling;
        } else if (g.state === 1) {
          const inWin = exc.x > gd.seat.x0 && exc.x < gd.seat.x1;
          if (inWin && input.down.down) {
            slingT += dt;
            // the heaviest thing that happens in the game
            if (slingT >= 0.5) { slingT = 0; g.seat(); exc.carrying = false; audio.thunk(); cam.punch(1.5); }
          } else {
            slingT = 0;
          }
          rideHint = inWin ? HINT.seat : HINT.carry;
        }
      }

      setHint(rideHint);
      if (input.take('action') || input.take('jump')) { startDismount(); audio.dismount(); }
    } else if (mode === 'dismounting') {
      moveT += dt / 0.5;
      exc.update(dt, null);
      bezier(Math.min(moveT, 1), v3);
      kid.group.position.copy(v3);
      kid.pose('air', t);
      if (moveT >= 1) {
        player.x = to.x; player.y = to.y; player.vx = 0; player.vy = 0;
        input.take('action'); input.take('jump');   // and the same at this edge
        mode = 'foot';
      }
    }

    // ---- the midway gate, and the end of the level ----------------------
    // The checkpoint costs nothing to reach and buys the middle of the level
    // back; the flag builds itself as you come up on it and goes off by
    // being run past. Neither ever stops the player moving.
    if (site.checkpoint && site.checkpoint.update(dt, player.x, player.y)) {
      site.level.respawn = { x: site.checkpoint.x, y: site.checkpoint.y };
      audio.bolt(8); banner('CHECKPOINT');
      setTimeout(() => document.getElementById('banner')?.remove(), 1000);
    }
    // THE FOREGROUND STANDS ASIDE FOR A CLIMB — AND FOR THE APPROACH TO ONE.
    // Fading only once `player.climbing` was already true meant the fore
    // lane could hide a ladder from someone who had not started climbing it
    // yet, which is backwards: the strip only has to get out of the way
    // once you are BEHIND it, but you have to be able to SEE a ladder to
    // know it is there in the first place. So it also fades while standing
    // within reach of one, not just while on it.
    let nearLadder = false;
    for (const l of site.def.ladders || []) {
      if (Math.abs(player.x - l.c) < 3 && player.y >= l.cy0 - 1 && player.y <= l.cy1 + 2) {
        nearLadder = true; break;
      }
    }
    diorama.fore?.(player.climbing || nearLadder ? 0.24 : 1);

    if (site.flag) {
      const ev = site.flag.update(dt, mode === 'riding' && exc ? exc.x : player.x);
      if (ev === 'phase') audio.clank();
      // A LEVEL WITH A GATE DOES NOT AUTO-ADVANCE. The flag ends a level and
      // the gate ends a WORLD (DESIGN §4.2), and while three levels existed
      // those were the same moment so nothing distinguished them. With World
      // 2 built, raising World 1's big flag advanced straight to level 4 and
      // the gate — the world's whole curtain — became unreachable. On a gated
      // level the flag raises and you walk out yourself.
      if (ev === 'raised' && !transitioning && siteIndex < LAST_LEVEL && !site.def.gate) {
        audio.mount();
        runBolts += collected; runGolden += goldenGot;
        bankGolden();                       // …and into this world's building
        goSite(siteIndex + 1);
      }
    }

    // …and the WORLD ends at the gate: Eeri clocks out and walks through it,
    // on foot, because the machine stays on the site. Only the last level of
    // a world carries one, and its big flag has to be up first.
    if (mode === 'foot' && site.def.gate && player.x > site.def.gate.x - 0.8
        && (!site.flag || site.flag.raised) && !cleared) {
      cleared = true;
      audio.mount();
      bankGolden();

      // THE BUILDING (DESIGN §4.3). Twelve levels used to go past with
      // nothing on the site ever getting finished, and the golden bolts were
      // a count that bought nothing. Now the nine hidden across a world ARE
      // the nine parts of the thing this world was working on, and clocking
      // out is where you see what you put up: nine of nine and the roof goes
      // on and the lights come on, four of nine and it stands four-ninths
      // built with the frames showing where the rest would go.
      //
      // It is built INTO THE SCENE at the gate rather than drawn on a card,
      // because a building described in text is a score and a building you
      // walk up to is a building. It is added to `site.group`, so the ordinary
      // room teardown in goSite() disposes it with everything else.
      const put = buildWorldBuilding(worldOf(siteIndex), worldGolden);
      // INSIDE THE ROOM, not past its end. The camera clamps to the level
      // width, so a building at gate + 7.5 sat in a place the camera is not
      // allowed to look at and rendered half out of frame at the right edge.
      // Three and a half tiles past the gate is where Eeri is standing when
      // he clocks out, and the camera can centre on it.
      put.root.position.set(site.def.gate.x + 1.7, site.def.gate.y, -2.4);
      site.group.add(put.root);
      cam.cut(site.def.gate.x + 1.4, site.def.gate.y + 3.4);

      const done = document.createElement('div');
      done.id = 'clear';
      // No scolding at a low count, ever: the card says what you built and
      // how much of it, and the design's rule is that the reward for finding
      // them is seeing more of the thing — never being told off for missing.
      done.innerHTML = tr('clockOut')
        + `<span>${tr('built')} ${put.name} — ${put.got}/${put.parts}`
        + (put.got === put.parts ? ` · ${tr('builtDone')}` : '') + '</span>'
        + `<span>⬡ ${runBolts + collected} · ✦ ${runGolden + goldenGot}</span>`;
      document.body.appendChild(done);
      // …and if there is another world behind this one, the curtain is a
      // BEAT rather than an ending: it holds, then the next site loads. Four
      // seconds rather than 2.6 — there is something to look at now.
      if (siteIndex < LAST_LEVEL) {
        runBolts += collected; runGolden += goldenGot;
        setTimeout(() => {
          done.remove();
          cleared = false;
          goSite(siteIndex + 1);
        }, 4000);
      }
    }

    // the hazard: wakes on whoever is near, and takes the ride, not the run
    if (site.ball) {
      site.ball.update(dt, mode === 'riding' && exc ? exc.x : player.x, audio, REDUCED);
      if (mode === 'riding') {
        if (player.mercyT <= 0 && site.ball.hits(exc.x, exc.y, exc.hw, exc.h)) {
          startDismount(true); audio.splat(); cam.punch(1.4);
        }
      } else if (mode === 'foot') {
        if (site.ball.hits(player.x, player.y, player.hw, player.h) && player.struck(site.ball.ballPos().x)) {
          audio.splat(); cam.punch(1.2);
        }
      }
    }

    // the small stuff. Robots notice, wind up, then lunge — and the cost is
    // the Yoshi rule, exactly as the wrecking ball's is: riding, it takes the
    // RIDE and throws you clear; on foot it is knockback and mercy frames.
    // Nothing here kills. A machine drives straight over one.
    const focusX = mode === 'riding' && exc ? exc.x : player.x;
    const focusY = mode === 'riding' && exc ? exc.y + 1 : player.y;
    for (const r of site.robots) {
      // `grounded` is for the bucket, which wakes on a LANDING rather than
      // on proximity — walking past a sleeping one has to stay safe
      r.update(dt, { x: focusX, y: focusY, grounded: player.grounded }, REDUCED);
      if (mode === 'riding') {
        if (r.crush(exc.x, exc.hw)) { audio.splat(); cam.punch(0.5); }
      } else if (mode === 'foot') {
        // the stomp beats the lunge: if he is coming down on it, it does not
        // matter what the robot was about to do. That ordering is what makes
        // jumping AT one feel like the right answer rather than a gamble.
        if (r.stompedBy(player.x, player.y, player.hw, player.vy)) {
          player.bounce(); audio.stomp(); cam.punch(0.4); stomps++;
        } else if (!r.stompable && r.landedOn(player.x, player.y, player.hw, player.vy)) {
          // the roller is too flat to stand on: it shoves you off instead of
          // dying, and it does not also get to hit you for it
          player.bounce(); r.shrug(); audio.land();
        } else if (r.hits(player.x, player.y, player.hw, player.h)) {
          if (player.struck(r.x)) { audio.splat(); cam.punch(0.9); }
        }
      }
    }
    for (const v of site.vents) {
      v.update(dt, REDUCED);
      if (mode === 'riding') {
        if (player.mercyT <= 0 && v.hits(exc.x, exc.y, exc.hw, exc.h)) {
          startDismount(true); audio.splat(); cam.punch(1.2);
        }
      } else if (mode === 'foot' && v.hits(player.x, player.y, player.hw, player.h)) {
        if (player.struck(v.x)) { audio.splat(); cam.punch(0.9); }
      }
    }

    // bolts: spin, bob, collect, pop
    const cx = mode === 'riding' && exc ? exc.x : player.x;
    const cy = mode === 'riding' && exc ? exc.y + 1 : player.y + 0.7;
    const cr = mode === 'riding' ? 2.0 : 0.95;
    for (const b of site.bolts) {
      if (b.state === 'gone') continue;
      if (b.state === 'up') {
        b.rotation.y += dt * 2.2;
        b.position.y = b.baseY + Math.sin(t * 2 + b.phase) * 0.09;
        if (Math.abs(b.position.x - cx) < cr && Math.abs(b.position.y - cy) < cr) {
          b.state = 'pop'; b.popT = 0;
          collected++;
          audio.bolt(collected);
          setCounts();
        }
      } else { // pop
        b.popT += dt / 0.25;
        b.rotation.y += dt * 14;
        b.scale.setScalar(1 + b.popT * 0.8);
        // fade every material in the tree, not just direct children: a live
        // GLB is Group → Object3D → Mesh, so `b.children` alone never
        // reaches the mesh and the bolt would pop without fading
        b.traverse((o) => { if (o.isMesh) o.material.opacity = 1 - b.popT; });
        if (b.popT >= 1) { b.state = 'gone'; b.visible = false; }
      }
    }

    // …the world's blueprint, if this room is the one carrying it
    if (site.blueprint && site.blueprint.state !== 'gone') {
      const bp = site.blueprint;
      if (bp.state === 'up') {
        bp.rotation.y += dt * 1.1;
        bp.position.y = bp.baseY + Math.sin(t * 1.4) * 0.16;
        if (Math.abs(bp.position.x - cx) < cr + 0.3 && Math.abs(bp.position.y - cy) < cr + 0.3) {
          bp.state = 'pop'; bp.popT = 0;
          blueprints++;
          audio.thunk(); cam.punch(0.9);
          banner(tr('blueprint'));
          setTimeout(() => document.getElementById('banner')?.remove(), 1400);
          setCounts();
        }
      } else {
        bp.popT += dt / 0.45;
        bp.rotation.y += dt * 7;
        bp.scale.setScalar(1 + bp.popT * 0.8);
        bp.traverse((o) => { if (o.isMesh) o.material.opacity = 1 - bp.popT; });
        if (bp.popT >= 1) { bp.state = 'gone'; bp.visible = false; }
      }
    }

    // …and the three hidden ones. The same loop with its own count and its
    // own noise, because finding one is the only thing in this game that is
    // meant to feel like a discovery rather than a pickup.
    for (const g of site.golden) {
      if (g.state === 'gone') continue;
      if (g.state === 'up') {
        g.rotation.y += dt * 1.4;
        g.position.y = g.baseY + Math.sin(t * 1.6 + g.phase) * 0.14;
        if (Math.abs(g.position.x - cx) < cr + 0.2 && Math.abs(g.position.y - cy) < cr + 0.2) {
          g.state = 'pop'; g.popT = 0;
          goldenGot++;
          audio.thunk(); cam.punch(0.7);
          setCounts();
          banner(`GOLDEN BOLT  ✦ ${goldenGot}/${site.def.golden.length}`);
          setTimeout(() => document.getElementById('banner')?.remove(), 1200);
        }
      } else {
        g.popT += dt / 0.4;
        g.rotation.y += dt * 9;
        g.scale.setScalar(1 + g.popT * 0.9);
        // TRAVERSE, do not walk `children`. The code-drawn golden was a Group
        // with exactly two Mesh children, so indexing straight into them
        // worked; a GLB's root is a Group of Groups and `ch.material` is
        // undefined, which threw the moment a golden bolt was collected. The
        // ordinary bolts twenty lines up already do it this way — same shape
        // of assumption as the checkpoint lamp, and the same fix.
        g.traverse((o) => { if (o.isMesh) o.material.opacity = 1 - g.popT; });
        if (g.popT >= 1) { g.state = 'gone'; g.visible = false; }
      }
    }
    }

    // the background machine is decoration — reduced motion stills it
    if (!REDUCED) bg.auto(dt);
    diorama.update(dt);          // the crane traverses, the truck crosses
    if (mode !== 'riding') audio.idleLoad(0);
    // the hoists run in EVERY mode — a lift that stopped while you were in a
    // cab would be a lift whose cycle you could not read from the cab
    for (const h of site.hoists) h.update(dt, REDUCED);
    site.bank?.update(dt);
    site.wall?.update(dt);
    if (exc) site.girder?.update(dt, exc);

    // camera: the director picks the room's framing, the mode leans it, and
    // heavy events kick the dolly (js/camera.js)
    const focus = (mode === 'riding' || mode === 'mounting') && exc ? exc : player;
    const face = mode === 'riding' && exc ? exc.face : kid.face;
    cam.update(dt, focus, face, mode, site.level.w, camera.aspect, FOV);

    renderer.render(scene, camera);
  });
}

boot().catch((e) => {
  document.getElementById('boot').textContent = 'EERI — failed to start: ' + e.message;
  console.error(e);
});
