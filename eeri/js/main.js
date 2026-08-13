// EERI — orchestration: scene, camera, the mode machine (foot / mount /
// riding / dismount), bolts, HUD. Owns no art: characters come from the
// asset seam, the environment from layers.js, the level from level.js.

import * as THREE from 'three';
import { PAL, LAYER_Z, LAYER_TINT } from './palette.js?v=1';
import { Input } from './input.js?v=1';
import { Level, SPAWN, BANK, EXIT } from './level.js?v=1';
import { buildBankModel, Bank } from './pieces.js?v=1';
import { buildLayers } from './layers.js?v=1';
import { buildKidModel, Kid, Player } from './kid.js?v=1';
import { buildExcavatorModel, Excavator } from './excavator.js?v=1';
import { WreckingBall } from './hazards.js?v=1';
import { AudioKit } from './audio.js?v=1';
import { loadManifest, getModel, getPiece } from './assets.js?v=1';

const FOV = 24, CAM_Z = 34;
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

  // ---- the world, through the asset seam ---------------------------------
  await loadManifest();
  const level = new Level();
  level.buildMeshes(scene);
  await buildLayers(scene, 'groundworks');

  const kid = new Kid(await getModel('eeri', buildKidModel));
  scene.add(kid.group, kid.shadow);
  const player = new Player(level, SPAWN.kid, kid);

  // it starts UNMANNED: beacon turning, working its own cycle, dangerous
  const exc = new Excavator(level, SPAWN.excavator.x, SPAWN.excavator.y,
    await getModel('excavator', buildExcavatorModel), false);
  scene.add(exc.group, exc.shadow, ...exc.puffs);

  // the bank: the machine-shaped lock on the way out
  const bank = new Bank(scene, level, BANK,
    await getPiece('bank', () => buildBankModel(BANK.rows, BANK.c1 - BANK.c0 + 1)));

  // the way out, once the bank is down
  const gate = new THREE.Group();
  for (const dx of [-0.6, 0.6]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.22, 2.6, 0.22),
      new THREE.MeshLambertMaterial({ color: PAL.MACHINE }));
    post.position.set(EXIT.x + dx, EXIT.y + 1.3, 0); gate.add(post);
  }
  const bar = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.26, 0.26),
    new THREE.MeshLambertMaterial({ color: PAL.MACHINE_DK }));
  bar.position.set(EXIT.x, EXIT.y + 2.6, 0); gate.add(bar);
  scene.add(gate);

  // the background works (§3.5): the same machine, repainted by depth,
  // digging on the FAR layer's ground line
  const bg = new Excavator(level, 58, 3.7,
    await getModel('excavator', () => buildExcavatorModel(LAYER_TINT.FAR)));
  bg.group.position.z = LAYER_Z.FAR + 0.4;
  bg.shadow.visible = false;
  bg.face = -1;
  scene.add(bg.group, ...bg.puffs);

  // the first hazard: it hangs off the girder past mound two, dead still
  // until you come near (ART_BRIEF gate 6 — telegraph, then strike)
  const ball = new WreckingBall(scene, 70, 8, 2.6, 7.5);

  // ---- bolts: the collectable (3D slow spinners, §6) ----------------------
  const boltGeo = new THREE.CylinderGeometry(0.26, 0.26, 0.12, 6);
  const hubGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.14, 6);
  const bolts = level.boltCells.map((cell, i) => {
    const g = new THREE.Group();
    const m1 = new THREE.MeshLambertMaterial({ color: PAL.MACHINE, transparent: true });
    const m2 = new THREE.MeshLambertMaterial({ color: PAL.MACHINE_DK, transparent: true });
    const nut = new THREE.Mesh(boltGeo, m1); nut.rotation.x = Math.PI / 2;
    const hub = new THREE.Mesh(hubGeo, m2); hub.rotation.x = Math.PI / 2;
    g.add(nut, hub);
    g.position.set(cell.x, cell.y, 0);
    g.baseY = cell.y; g.phase = i * 0.7; g.state = 'up'; g.popT = 0;
    scene.add(g);
    return g;
  });
  let collected = 0;

  // ---- HUD ----------------------------------------------------------------
  const hintEl = document.getElementById('hint');
  const boltsEl = document.getElementById('bolts');
  const setHint = (s) => { if (hintEl.textContent !== s) hintEl.textContent = s; };
  const HINT = {
    foot: 'A D — RUN · SPACE — JUMP',
    wary: 'NOBODY IS DRIVING IT — WAIT FOR THE BUCKET TO LIFT',
    near: 'E — CLIMB IN',
    ride: 'A D — DRIVE · W S — BOOM · E — HOP OUT',
    dig: 'HOLD S — DIG THE BANK DOWN',
    out: 'THE WAY OUT IS OPEN',
  };

  // ---- the mode machine ---------------------------------------------------
  let mode = 'foot';          // foot | mounting | riding | dismounting
  let moveT = 0, digT = 0, cleared = false;
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
    to.set(gx, Math.max(level.groundTop(gx, exc.y + 2), exc.y), 0);
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

  // ---- debug handle (the smoke gate drives game state, not the clock) ----
  window.__eeri = {
    level, player, exc, ball, audio, input,
    mode: () => mode,
    collected: () => collected,
    reduced: REDUCED,
    debug: {
      press: (n) => input.press(n),
      release: (n) => input.release(n),
      setPos: (x, y) => { player.x = x; player.y = y; player.vx = 0; player.vy = 0; },
      excPos: () => ({ x: exc.x, y: exc.y }),
      hazard: () => ({ state: ball.state, ...ball.ballPos() }),
      mercy: () => player.mercyT,
      tamed: () => exc.tamed,
      bank: () => ({ remaining: bank.remaining, cleared: bank.cleared }),
      cleared: () => cleared,
      dig: () => bank.dig(),
      tris: () => renderer.info.render.triangles,
    },
  };

  document.getElementById('boot').remove();

  // ---- the loop ------------------------------------------------------------
  let t = 0, camX = player.x, camY = player.y + 3;
  const clock = new THREE.Clock();

  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.033);
    t += dt;

    if (mode === 'foot') {
      player.update(dt, input);
      if (exc.tamed) exc.update(dt, null); else exc.work(dt);
      if (player.justJumped) audio.jump();
      if (player.justLanded) audio.land();

      // heavy and blind: stand under the working bucket and it puts you down
      if (unmannedStrike() && player.struck(exc.x)) audio.splat();

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

      // THE DIG: bucket down, in the dirt, and the bank comes down a row at
      // a time. The bucket digs because it is a bucket (ART_BRIEF §1.2).
      const canDig = !bank.cleared && input.down.down
        && exc.n.boom.rotation.z < 0.3
        && exc.bucketWorld(buck).x > BANK.c0 - 1.4 && buck.x < BANK.c1 + 1.4;
      if (canDig) {
        digT += dt;
        if (digT >= 0.7) { digT = 0; bank.dig(); audio.splat(); }
      } else {
        digT = 0;
      }
      setHint(canDig || (!bank.cleared && Math.abs(exc.x - BANK.c0) < 6) ? HINT.dig : HINT.ride);
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

    // the background machine is decoration — reduced motion stills it
    if (!REDUCED) bg.auto(dt);
    if (mode !== 'riding') audio.idleLoad(0);
    bank.update(dt);

    // the room is finished when the kid walks out through the gate the
    // machine opened — on foot, because the machine cannot leave
    if (!cleared && mode === 'foot' && player.x > EXIT.x - 0.8) {
      cleared = true;
      audio.mount();
      const done = document.createElement('div');
      done.id = 'clear';
      done.innerHTML = `SITE CLEAR<span>⬡ ${collected} / ${bolts.length}</span>`;
      document.body.appendChild(done);
    }

    // the hazard: wakes on whoever is near, and takes the ride, not the run
    ball.update(dt, mode === 'riding' ? exc.x : player.x, audio, REDUCED);
    if (mode === 'riding') {
      if (player.mercyT <= 0 && ball.hits(exc.x, exc.y, exc.hw, exc.h)) {
        startDismount(true); audio.splat();
      }
    } else if (mode === 'foot') {
      if (ball.hits(player.x, player.y, player.hw, player.h) && player.struck(ball.ballPos().x)) {
        audio.splat();
      }
    }

    // bolts: spin, bob, collect, pop
    const cx = mode === 'riding' ? exc.x : player.x;
    const cy = mode === 'riding' ? exc.y + 1 : player.y + 0.7;
    const cr = mode === 'riding' ? 2.0 : 0.95;
    for (const b of bolts) {
      if (b.state === 'gone') continue;
      if (b.state === 'up') {
        b.rotation.y += dt * 2.2;
        b.position.y = b.baseY + Math.sin(t * 2 + b.phase) * 0.09;
        if (Math.abs(b.position.x - cx) < cr && Math.abs(b.position.y - cy) < cr) {
          b.state = 'pop'; b.popT = 0;
          collected++;
          audio.bolt(collected);
          boltsEl.textContent = `⬡ ${collected}/${bolts.length}`;
        }
      } else { // pop
        b.popT += dt / 0.25;
        b.rotation.y += dt * 14;
        b.scale.setScalar(1 + b.popT * 0.8);
        for (const ch of b.children) ch.material.opacity = 1 - b.popT;
        if (b.popT >= 1) { b.state = 'gone'; b.visible = false; }
      }
    }

    // camera: follows the active seat, a small lead in the facing direction
    const focus = mode === 'riding' || mode === 'mounting' ? exc : player;
    const face = mode === 'riding' ? exc.face : kid.face;
    camX += (focus.x + face * 1.6 - camX) * Math.min(1, 3.2 * dt);
    camY += (Math.max(focus.y + 2.6, 5.8) - camY) * Math.min(1, 2.6 * dt);
    const halfW = CAM_Z * Math.tan((FOV * Math.PI) / 360) * camera.aspect;
    camX = Math.max(halfW * 0.85, Math.min(level.w - halfW * 0.85, camX));
    camera.position.set(camX, camY, CAM_Z);
    camera.lookAt(camX, camY - 0.4, 0);

    renderer.render(scene, camera);
  });
}

boot().catch((e) => {
  document.getElementById('boot').textContent = 'EERI — failed to start: ' + e.message;
  console.error(e);
});
