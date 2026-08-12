// EERI — orchestration: scene, camera, the mode machine (foot / mount /
// riding / dismount), bolts, HUD. Owns no art: characters come from the
// asset seam, the environment from layers.js, the level from level.js.

import * as THREE from 'three';
import { PAL, LAYER_Z, LAYER_TINT } from './palette.js?v=1';
import { Input } from './input.js?v=1';
import { Level, SPAWN } from './level.js?v=1';
import { buildLayers } from './layers.js?v=1';
import { buildKidModel, Kid, Player } from './kid.js?v=1';
import { buildExcavatorModel, Excavator } from './excavator.js?v=1';
import { loadManifest, getModel } from './assets.js?v=1';

const FOV = 24, CAM_Z = 34;

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
  input.bindButtons({ tL: 'left', tR: 'right', tJ: 'jump', tA: 'action' });

  // ---- the world, through the asset seam ---------------------------------
  await loadManifest();
  const level = new Level();
  level.buildMeshes(scene);
  await buildLayers(scene, 'groundworks');

  const kid = new Kid(await getModel('eeri', buildKidModel));
  scene.add(kid.group, kid.shadow);
  const player = new Player(level, SPAWN.kid, kid);

  const exc = new Excavator(level, SPAWN.excavator.x, SPAWN.excavator.y,
    await getModel('excavator', buildExcavatorModel));
  scene.add(exc.group, exc.shadow, ...exc.puffs);

  // the background works (§3.5): the same machine, repainted by depth,
  // digging on the FAR layer's ground line
  const bg = new Excavator(level, 58, 3.7,
    await getModel('excavator', () => buildExcavatorModel(LAYER_TINT.FAR)));
  bg.group.position.z = LAYER_Z.FAR + 0.4;
  bg.shadow.visible = false;
  bg.face = -1;
  scene.add(bg.group, ...bg.puffs);

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
    near: 'E — CLIMB IN',
    ride: 'A D — DRIVE · W S — BOOM · E — HOP OUT',
  };

  // ---- the mode machine ---------------------------------------------------
  let mode = 'foot';          // foot | mounting | riding | dismounting
  let moveT = 0;
  const from = new THREE.Vector3(), mid = new THREE.Vector3(), to = new THREE.Vector3();
  const v3 = new THREE.Vector3();

  const nearExc = () =>
    Math.abs(player.x - exc.x) < 2.4 && player.y > exc.y - 1 && player.y < exc.y + 2.4 && player.grounded;

  function startMount() {
    mode = 'mounting'; moveT = 0;
    from.set(player.x, player.y, 0);
    exc.stepWorld(mid); mid.y += 0.9; mid.z = 0;
    input.take('action'); input.take('jump');
  }

  function startDismount() {
    mode = 'dismounting'; moveT = 0;
    exc.seatWorld(from); from.z = 0;
    const gx = exc.x - exc.face * 2.6;
    to.set(gx, Math.max(level.groundTop(gx, exc.y + 2), exc.y), 0);
    mid.copy(from).lerp(to, 0.5); mid.y = Math.max(from.y, to.y) + 1.4;
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
    level, player, exc, input,
    mode: () => mode,
    collected: () => collected,
    debug: {
      press: (n) => input.press(n),
      release: (n) => input.release(n),
      setPos: (x, y) => { player.x = x; player.y = y; player.vx = 0; player.vy = 0; },
      excPos: () => ({ x: exc.x, y: exc.y }),
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
      exc.update(dt, null);
      const near = nearExc();
      setHint(near ? HINT.near : HINT.foot);
      if (near && input.take('action')) startMount();
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
        mode = 'riding';
      }
    } else if (mode === 'riding') {
      exc.update(dt, {
        drive: input.axis(),
        boomUp: input.down.up,
        boomDown: input.down.down,
      });
      player.x = exc.x; player.y = exc.y + 1; player.vx = 0; player.vy = 0;
      kid.pose('ride', t);
      kid.shadow.visible = false;
      setHint(HINT.ride);
      if (input.take('action') || input.take('jump')) startDismount();
    } else if (mode === 'dismounting') {
      moveT += dt / 0.5;
      exc.update(dt, null);
      bezier(Math.min(moveT, 1), v3);
      kid.group.position.copy(v3);
      kid.pose('air', t);
      if (moveT >= 1) {
        player.x = to.x; player.y = to.y; player.vx = 0; player.vy = 0;
        mode = 'foot';
      }
    }

    bg.auto(dt);

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
