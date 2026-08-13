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
import { PAL, LAYER_Z, LAYER_TINT } from './palette.js?v=1';
import { Input } from './input.js?v=1';
import { Level, SITES } from './level.js?v=3';
import { buildBankModel, Bank, buildGirderModel, Girder } from './pieces.js?v=3';
import { buildLayers, LAYER_RECTS, PPU } from './layers.js?v=2';
import { Camera } from './camera.js?v=1';
import { buildKidModel, Kid, Player } from './kid.js?v=2';
import { buildExcavatorModel, Excavator } from './excavator.js?v=2';
import { WreckingBall } from './hazards.js?v=1';
import { AudioKit } from './audio.js?v=2';
import { loadManifest, getModel, getPiece } from './assets.js?v=1';

const FOV = 24;   // the dolly distance is the camera director's (js/camera.js)
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

async function boot() {
  // renderer: clean edges, no post stack (ART_BRIEF §3.4)
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  document.getElementById('game').appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PAL.SKY);

  // one soft rig: hemisphere fill + one directional key from the upper-left
  scene.add(new THREE.HemisphereLight(0xd8ecf8, 0x9a7c5a, 1.25));
  const key = new THREE.DirectionalLight(0xffffff, 1.35);
  key.position.set(-14, 22, 18);
  scene.add(key);

  const camera = new THREE.PerspectiveCamera(FOV, innerWidth / innerHeight, 0.1, 220);
  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  const input = new Input();
  input.bindButtons({ tL: 'left', tR: 'right', tJ: 'jump', tA: 'action', tD: 'down' });

  // the noise waits for a gesture — browsers will not start it otherwise
  const audio = new AudioKit();
  const wake = () => { audio.ensure(); audio.idleStart(); };
  addEventListener('keydown', wake, { once: true });
  addEventListener('pointerdown', wake, { once: true });

  // ---- the persistent world: diorama + cast -------------------------------
  await loadManifest();
  const diorama = await buildLayers(scene, 'groundworks', REDUCED);

  const kid = new Kid(await getModel('eeri', buildKidModel));
  scene.add(kid.group, kid.shadow);

  // the background works (§3.5): the same machine, repainted by depth,
  // digging on the FAR layer's ground line — scenery, shared by every site
  const bg = new Excavator(new Level(SITES[0]), 58, 3.7,
    await getModel('excavator', () => buildExcavatorModel(LAYER_TINT.FAR)));
  bg.group.position.z = LAYER_Z.FAR + 0.4;
  bg.shadow.visible = false;
  bg.face = -1;
  scene.add(bg.group, ...bg.puffs);

  // ---- sites: one room at a time, built and torn down whole ---------------
  const totalBolts = SITES.reduce((n, s) => n + s.bolts.length, 0);
  let collected = 0;

  function dispose(root) {
    root.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
      for (const m of mats) { if (m.map) m.map.dispose(); m.dispose(); }
    });
  }

  const boltGeo = new THREE.CylinderGeometry(0.26, 0.26, 0.12, 6);
  const hubGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.14, 6);

  async function buildSite(i) {
    const def = SITES[i];
    const level = new Level(def);
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
    const ball = def.ball
      ? new WreckingBall(group, def.ball.px, def.ball.py, def.ball.len, def.ball.zoneW)
      : null;

    // the way out
    for (const dx of [-0.6, 0.6]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.22, 2.6, 0.22),
        new THREE.MeshLambertMaterial({ color: PAL.MACHINE }));
      post.position.set(def.exit.x + dx, def.exit.y + 1.3, 0); group.add(post);
    }
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.26, 0.26),
      new THREE.MeshLambertMaterial({ color: PAL.MACHINE_DK }));
    bar.position.set(def.exit.x, def.exit.y + 2.6, 0); group.add(bar);

    // bolts: the collectable (3D slow spinners, §6)
    const bolts = level.boltCells.map((cell, bi) => {
      const g = new THREE.Group();
      const m1 = new THREE.MeshLambertMaterial({ color: PAL.MACHINE, transparent: true });
      const m2 = new THREE.MeshLambertMaterial({ color: PAL.MACHINE_DK, transparent: true });
      const nut = new THREE.Mesh(boltGeo, m1); nut.rotation.x = Math.PI / 2;
      const hub = new THREE.Mesh(hubGeo, m2); hub.rotation.x = Math.PI / 2;
      g.add(nut, hub);
      g.position.set(cell.x, cell.y, 0);
      g.baseY = cell.y; g.phase = bi * 0.7; g.state = 'up'; g.popT = 0;
      group.add(g);
      return g;
    });

    scene.add(group);
    return { def, level, group, bank, girder, ball, bolts };
  }

  let siteIndex = 0;
  let site = await buildSite(0);

  const player = new Player(site.level, site.def.spawn.kid, kid);

  // it starts UNMANNED: beacon turning, working its own cycle, dangerous
  const exc = new Excavator(site.level, site.def.spawn.excavator.x, site.def.spawn.excavator.y,
    await getModel('excavator', buildExcavatorModel), false);
  scene.add(exc.group, exc.shadow, ...exc.puffs);

  // ---- HUD ----------------------------------------------------------------
  const hintEl = document.getElementById('hint');
  const boltsEl = document.getElementById('bolts');
  const siteEl = document.getElementById('site');
  boltsEl.textContent = `⬡ 0/${totalBolts}`;
  siteEl.textContent = site.def.name;
  const setHint = (s) => { if (hintEl.textContent !== s) hintEl.textContent = s; };
  const HINT = {
    foot: 'A D — RUN · SPACE — JUMP',
    wary: 'NOBODY IS DRIVING IT — WAIT FOR THE BUCKET TO LIFT',
    near: 'E — CLIMB IN',
    ride: 'A D — DRIVE · W S — BOOM · E — HOP OUT',
    dig: 'HOLD S — DIG THE BANK DOWN',
    sling: 'HOLD S — SLING THE GIRDER ON',
    carry: 'CARRY IT TO THE GAP',
    seat: 'HOLD S — LOWER THE SPAN IN',
    out: 'THE WAY OUT IS OPEN',
  };

  // ---- the mode machine ---------------------------------------------------
  let mode = 'foot';          // foot | mounting | riding | dismounting
  let moveT = 0, digT = 0, slingT = 0, cleared = false, transitioning = false;
  const from = new THREE.Vector3(), mid = new THREE.Vector3(), to = new THREE.Vector3();
  const v3 = new THREE.Vector3();

  const nearExc = () =>
    Math.abs(player.x - exc.x) < 2.4 && player.y > exc.y - 1 && player.y < exc.y + 2.4 && player.grounded;

  // the danger of an unmanned machine is its bucket, and only while it is
  // down in the sweep — that is the cycle you have to read to get aboard
  const buck = new THREE.Vector3();
  function unmannedStrike() {
    if (exc.tamed || !exc.swinging) return false;
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

  async function goSite(i) {
    transitioning = true;
    banner(`${site.def.name} CLEAR`);
    audio.mount();
    const old = site;
    site = await buildSite(i);
    siteIndex = i;
    scene.remove(old.group);
    dispose(old.group);

    // the cast walks on: same kid, but each room's machine is its own —
    // unmanned again, beacon turning. Taming does not carry between rooms.
    const s = site.def.spawn;
    player.level = site.level;
    player.x = s.kid.x; player.y = s.kid.y; player.vx = 0; player.vy = 0; player.mercyT = 0;
    exc.level = site.level;
    exc.x = s.excavator.x; exc.y = s.excavator.y; exc.vx = 0; exc.vy = 0;
    exc.tamed = false; exc.carrying = false; exc.face = 1;
    mode = 'foot'; digT = 0; slingT = 0;
    input.take('action'); input.take('jump');
    siteEl.textContent = site.def.name;

    // the camera CUTS — a slow pan across a rebuilt world is a lie about geography
    cam.setSite(site.def);
    cam.cut(player.x, player.y + 3);
    setTimeout(() => document.getElementById('banner')?.remove(), 1400);
    transitioning = false;
  }

  // ---- debug handle (the smoke gate drives game state, not the clock) ----
  window.__eeri = {
    player, exc, audio, input,
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
      excPos: () => ({ x: exc.x, y: exc.y }),
      hazard: () => site.ball ? { state: site.ball.state, ...site.ball.ballPos() } : { state: 'none' },
      mercy: () => player.mercyT,
      tamed: () => exc.tamed,
      bank: () => site.bank ? { remaining: site.bank.remaining, cleared: site.bank.cleared } : null,
      girder: () => site.girder ? { state: site.girder.state, carrying: exc.carrying } : null,
      cleared: () => cleared,
      dig: () => site.bank?.dig(),
      goSite: (i) => goSite(i),
      tris: () => renderer.info.render.triangles,
      // the 2D contract, computed rather than written down twice — the gate
      // checks assets/README.md (what an artist paints to) against this
      layerContract: () => Object.fromEntries(Object.entries(LAYER_RECTS).map(([k, r]) => [k, {
        ...r,
        pxW: Math.min(4096, Math.round((r.x1 - r.x0) * PPU)),
        pxH: Math.round((r.y1 - r.y0) * PPU),
      }])),
      // where the camera actually is, so "it reframes" is testable
      camera: () => ({ x: camera.position.x, y: camera.position.y, z: camera.position.z }),
      // …and what the background is doing, so "it works" is too
      bg: () => diorama.positions(),
    },
  };

  document.getElementById('boot').remove();

  // ---- the loop ------------------------------------------------------------
  let t = 0;
  const cam = new Camera(camera, site.def);
  cam.cut(player.x, player.y + 3);
  const clock = new THREE.Clock();

  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.033);
    t += dt;

    if (!transitioning) {
    if (mode === 'foot') {
      player.update(dt, input);
      if (exc.tamed) exc.update(dt, null); else exc.work(dt);
      if (player.justJumped) audio.jump();
      if (player.justLanded) audio.land();

      // heavy and blind: stand under the working bucket and it puts you down
      if (unmannedStrike() && player.struck(exc.x)) { audio.splat(); cam.punch(1.1); }

      const near = nearExc();
      setHint(cleared ? HINT.out
        : near ? HINT.near
        : (!exc.tamed && Math.abs(player.x - exc.x) < 6) ? HINT.wary
        : HINT.foot);
      if (near && input.take('action')) { startMount(); audio.mount(); }
    } else if (mode === 'mounting') {
      moveT += dt / 0.55;
      exc.update(dt, null);
      exc.seatWorld(to); to.z = 0;
      bezier(Math.min(moveT, 1), v3);
      kid.group.position.copy(v3);
      kid.pose('climb', t);
      if (moveT >= 1) {
        exc.n.seat.add(kid.group);
        kid.group.position.set(0, 0, 0);
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
      });
      player.x = exc.x; player.y = exc.y + 1; player.vx = 0; player.vy = 0;
      player.mercyT = Math.max(0, player.mercyT - dt);
      kid.pose('ride', t);
      kid.shadow.visible = false;
      kid.group.visible = true;
      audio.idleLoad(Math.min(1, Math.abs(exc.vx) / 3.4));
      if (Math.abs(exc.n.boom.rotation.z - boomWas) > 0.012) audio.boom();

      let rideHint = HINT.ride;

      // THE DIG: bucket down, in the dirt, and the bank comes down a row at
      // a time. The bucket digs because it is a bucket (ART_BRIEF §1.2).
      if (site.bank && !site.bank.cleared) {
        const bk = site.def.bank;
        const canDig = input.down.down
          && exc.n.boom.rotation.z < 0.3
          && exc.bucketWorld(buck).x > bk.c0 - 1.4 && buck.x < bk.c1 + 1.4;
        if (canDig) {
          digT += dt;
          if (digT >= 0.7) { digT = 0; site.bank.dig(); audio.splat(); cam.punch(0.8); }
        } else {
          digT = 0;
        }
        if (canDig || Math.abs(exc.x - bk.c0) < 6) rideHint = HINT.dig;
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

    // the room is finished when the kid walks out through the gate the
    // machine opened — on foot, because the machine cannot leave. The last
    // gate ends the job; every other gate leads to the next site.
    if (mode === 'foot' && player.x > site.def.exit.x - 0.8) {
      if (siteIndex < SITES.length - 1) {
        goSite(siteIndex + 1);
      } else if (!cleared) {
        cleared = true;
        audio.mount();
        const done = document.createElement('div');
        done.id = 'clear';
        done.innerHTML = `SITE CLEAR<span>⬡ ${collected} / ${totalBolts}</span>`;
        document.body.appendChild(done);
      }
    }

    // the hazard: wakes on whoever is near, and takes the ride, not the run
    if (site.ball) {
      site.ball.update(dt, mode === 'riding' ? exc.x : player.x, audio, REDUCED);
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

    // bolts: spin, bob, collect, pop
    const cx = mode === 'riding' ? exc.x : player.x;
    const cy = mode === 'riding' ? exc.y + 1 : player.y + 0.7;
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
          boltsEl.textContent = `⬡ ${collected}/${totalBolts}`;
        }
      } else { // pop
        b.popT += dt / 0.25;
        b.rotation.y += dt * 14;
        b.scale.setScalar(1 + b.popT * 0.8);
        for (const ch of b.children) ch.material.opacity = 1 - b.popT;
        if (b.popT >= 1) { b.state = 'gone'; b.visible = false; }
      }
    }
    }

    // the background machine is decoration — reduced motion stills it
    if (!REDUCED) bg.auto(dt);
    diorama.update(dt);          // the crane traverses, the truck crosses
    if (mode !== 'riding') audio.idleLoad(0);
    site.bank?.update(dt);
    site.girder?.update(dt, exc);

    // camera: the director picks the room's framing, the mode leans it, and
    // heavy events kick the dolly (js/camera.js)
    const focus = mode === 'riding' || mode === 'mounting' ? exc : player;
    const face = mode === 'riding' ? exc.face : kid.face;
    cam.update(dt, focus, face, mode, site.level.w, camera.aspect, FOV);

    renderer.render(scene, camera);
  });
}

boot().catch((e) => {
  document.getElementById('boot').textContent = 'EERI — failed to start: ' + e.message;
  console.error(e);
});
