// The city: a grid of blocks cut by streets, seen from an isometric camera.
//
// Everything that matters to the game is on the street grid: a street runs
// along every line x = k*P and z = k*P, so the runner, the cars, the drones and
// the shards all live on those lines and the blocks between them are solid.
// The ASCII pass needs CONTRAST more than detail — a dark wall with a grid of
// lit windows becomes a field of varied glyphs, a flat lit wall becomes one
// glyph repeated — so the look is built from emissive windows, neon and fog.

import * as THREE from '../vendor/three.module.min.js';

export const P = 16;          // block pitch: one street line every P units
export const BLOCK = 9.6;     // built-up width of a block (street is P - BLOCK)
export const N = 3;           // blocks run -N..N-1 between the street lines -N..N
export const EXTENT = N * P;  // the outermost street line

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const NEON = [0xff2bd6, 0x22f0ff, 0xffd23f, 0x7cff4f, 0xff5a36, 0x9b5cff];

// a facade: dark wall, a grid of windows, some lit warm, some cold, most off.
// One texel row per storey; UVs are scaled to world units so windows keep
// their size on every building.
function facadeTexture(rand, tint) {
  // two canvases: the DIFFUSE wall is a flat tint with the window reveals only
  // faintly darker, so a face lit by the moon is one tone (one glyph); the
  // EMISSIVE map holds the lit windows alone, so they arrive in the ascii pass
  // as points of light rather than as noise mixed into the wall
  const W = 16, H = 32;
  const mk = () => { const c = document.createElement('canvas'); c.width = W * 4; c.height = H * 4; return c; };
  const dc = mk(), ec = mk();
  const d = dc.getContext('2d'), e = ec.getContext('2d');
  d.fillStyle = tint; d.fillRect(0, 0, dc.width, dc.height);
  e.fillStyle = '#000'; e.fillRect(0, 0, ec.width, ec.height);
  const warm = ['#ffcf7a', '#ffb347', '#fff1c4'], cold = ['#7fe9ff', '#b4c8ff', '#e0f7ff'];
  const style = rand();
  for (let y = 0; y < H; y++) {
    const floorLit = rand() < 0.55;
    for (let x = 0; x < W; x++) {
      if (style > 0.6 && x % 4 === 3) continue;          // columns between bays
      d.fillStyle = 'rgba(0,0,0,0.28)'; d.fillRect(x * 4 + 1, y * 4 + 1, 2, 2);
      if (floorLit && rand() < 0.2) {
        e.fillStyle = (rand() < 0.65 ? warm : cold)[Math.floor(rand() * 3)];
        e.fillRect(x * 4 + 1, y * 4 + 1, 2, 2);
      }
    }
  }
  const tex = (c) => {
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.magFilter = THREE.NearestFilter; t.minFilter = THREE.LinearMipmapLinearFilter;
    t.colorSpace = THREE.SRGBColorSpace;
    t.repeat.set(1 / 16, 1 / 32);  // UVs are in world units; 1 window per unit
    return t;
  };
  return { map: tex(dc), glow: tex(ec) };
}

// BoxGeometry with UVs in world units, so a shared facade texture tiles at
// the same scale on every face of every building
function worldBox(w, h, d) {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv;
  // face order px nx py ny pz nz, four vertices each
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let v = 0; v < 4; v++) {
    const i = f * 4 + v;
    uv.setXY(i, uv.getX(i) * dims[f][0], uv.getY(i) * dims[f][1]);
  }
  // material groups: walls 0, roof 1
  g.clearGroups();
  g.addGroup(0, 12, 0); g.addGroup(12, 6, 1); g.addGroup(18, 6, 0); g.addGroup(24, 12, 0);
  return g;
}

export function buildCity(scene, seed = 7) {
  const rand = rng(seed);
  const pick = (a) => a[Math.floor(rand() * a.length)];
  const boxes = [];           // solid AABBs on the ground plane
  const buildings = [];       // {g, minX..maxZ, top, k} — what the cutaway can sink
  const flickers = [];        // neon that misbehaves
  const blinkers = [];        // aviation lights on the tall ones
  const spinners = [];        // things that turn

  // ---------- ground, streets, kerbs ----------
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(EXTENT * 4, EXTENT * 4),
    new THREE.MeshLambertMaterial({ color: 0x0c0e16 }),
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  const laneMat = new THREE.MeshBasicMaterial({ color: 0xb59a48 });
  const zebraMat = new THREE.MeshBasicMaterial({ color: 0x8a90a6 });
  const dash = new THREE.PlaneGeometry(1.1, 0.12);
  for (let k = -N; k <= N; k++) {
    for (let s = -EXTENT - P; s < EXTENT + P; s += 2.2) {
      const nearCross = Math.abs(((s % P) + P) % P - 0) < 2.6 || Math.abs(((s % P) + P) % P - P) < 2.6;
      if (nearCross) continue;
      const a = new THREE.Mesh(dash, laneMat);
      a.rotation.x = -Math.PI / 2; a.position.set(s, 0.02, k * P); scene.add(a);
      const b = new THREE.Mesh(dash, laneMat);
      b.rotation.x = -Math.PI / 2; b.rotation.z = Math.PI / 2; b.position.set(k * P, 0.02, s); scene.add(b);
    }
  }
  // crossings
  const zebra = new THREE.PlaneGeometry(0.35, 3.2);
  for (let i = -N; i <= N; i++) for (let j = -N; j <= N; j++) {
    for (let q = -3; q <= 3; q++) {
      const z1 = new THREE.Mesh(zebra, zebraMat);
      z1.rotation.x = -Math.PI / 2; z1.position.set(i * P + q * 0.6, 0.015, j * P + 3.3); scene.add(z1);
    }
  }

  // ---------- materials ----------
  const tints = ['#5e6a98', '#685a8e', '#54707e', '#785e62', '#62627a'];
  const facades = [];
  for (let i = 0; i < 7; i++) {
    const t = facadeTexture(rand, pick(tints));
    facades.push(new THREE.MeshLambertMaterial({
      map: t.map, emissiveMap: t.glow, emissive: 0xffffff, emissiveIntensity: 1.0,
    }));
  }
  const roofMat = new THREE.MeshLambertMaterial({ color: 0x9aa4c8 });
  const kerbMat = new THREE.MeshLambertMaterial({ color: 0x232838 });
  const plantMat = new THREE.MeshLambertMaterial({ color: 0x1d3a2a });
  const darkMat = new THREE.MeshLambertMaterial({ color: 0x4a5270 });
  const neonMats = NEON.map((c) => new THREE.MeshBasicMaterial({ color: c }));

  const PLAZA = { bx: 0, bz: -1 };      // the block given to the hologram
  const plazaCentre = new THREE.Vector3((PLAZA.bx + 0.5) * P, 0, (PLAZA.bz + 0.5) * P);

  // ---------- blocks ----------
  for (let bx = -N; bx < N; bx++) for (let bz = -N; bz < N; bz++) {
    const cx = (bx + 0.5) * P, cz = (bz + 0.5) * P;
    const kerb = new THREE.Mesh(new THREE.BoxGeometry(BLOCK + 1.2, 0.25, BLOCK + 1.2), kerbMat);
    kerb.position.set(cx, 0.125, cz); scene.add(kerb);

    if (bx === PLAZA.bx && bz === PLAZA.bz) continue;   // the plaza is built below

    // the further a block is from the centre, the taller it may be — a
    // skyline that rises toward the back keeps the runner readable in front
    const far = Math.min(1, (Math.hypot(cx, cz)) / (EXTENT * 1.1));
    const lots = rand() < 0.5 ? 1 : rand() < 0.8 ? 2 : 4;
    const subs = lots === 1 ? [[0, 0, 1, 1]] : lots === 2
      ? (rand() < 0.5 ? [[0, 0, 0.5, 1], [0.5, 0, 1, 1]] : [[0, 0, 1, 0.5], [0, 0.5, 1, 1]])
      : [[0, 0, 0.5, 0.5], [0.5, 0, 1, 0.5], [0, 0.5, 0.5, 1], [0.5, 0.5, 1, 1]];
    for (const [u0, v0, u1, v1] of subs) {
      const gap = 0.35;
      const grp = new THREE.Group(); scene.add(grp);
      const x0 = cx - BLOCK / 2 + u0 * BLOCK + gap, x1 = cx - BLOCK / 2 + u1 * BLOCK - gap;
      const z0 = cz - BLOCK / 2 + v0 * BLOCK + gap, z1 = cz - BLOCK / 2 + v1 * BLOCK - gap;
      const w = x1 - x0, d = z1 - z0;
      // a third of the lots are low — shops, garages, a noodle bar — because
      // the ascii picture needs empty space between the towers to read at all
      const h = rand() < 0.33 ? 1.4 + rand() * 2 : 3 + rand() * (5 + far * 16) * (lots === 1 ? 1.25 : 1);
      const mat = pick(facades);
      const m = new THREE.Mesh(worldBox(w, h, d), [mat, roofMat]);
      m.position.set((x0 + x1) / 2, h / 2 + 0.25, (z0 + z1) / 2);
      grp.add(m);
      boxes.push({ minX: x0, maxX: x1, minZ: z0, maxZ: z1 });
      const bld = { g: grp, minX: x0, maxX: x1, minZ: z0, maxZ: z1, top: h + 0.25, k: 1 };
      buildings.push(bld);

      // a setback tier on the big ones
      if (h > 12 && rand() < 0.6) {
        const h2 = 3 + rand() * 8, s = 0.65;
        const t = new THREE.Mesh(worldBox(w * s, h2, d * s), [pick(facades), roofMat]);
        t.position.set(m.position.x, h + 0.25 + h2 / 2, m.position.z); grp.add(t);
        bld.top += h2;
      }
      const top = h + 0.25;
      // rooftop clutter: AC units, a tank, an antenna with a red light
      for (let k = 0; k < 1 + Math.floor(rand() * 2); k++) {
        const ac = new THREE.Mesh(new THREE.BoxGeometry(1 + rand() * 1.2, 0.7 + rand() * 0.6, 1 + rand() * 1.2), darkMat);
        ac.position.set(x0 + 1.2 + rand() * Math.max(0, w - 2.4), top + 0.5, z0 + 1.2 + rand() * Math.max(0, d - 2.4));
        grp.add(ac);
      }
      if (h > 9 && rand() < 0.7) {
        const ah = 2 + rand() * 5;
        const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, ah, 5), darkMat);
        ant.position.set(m.position.x + (rand() - 0.5) * w * 0.4, top + ah / 2, m.position.z + (rand() - 0.5) * d * 0.4);
        grp.add(ant);
        const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.22, 6, 4), new THREE.MeshBasicMaterial({ color: 0xff2020 }));
        lamp.position.set(ant.position.x, top + ah + 0.15, ant.position.z);
        grp.add(lamp);
        blinkers.push({ m: lamp, ph: rand() * 6 });
      }

      // neon: vertical blade signs and horizontal bands on the faces the
      // camera sees (+x and +z). Colour is the whole point of them.
      const nSigns = rand() < 0.85 ? 1 + Math.floor(rand() * 3) : 0;
      for (let k = 0; k < nSigns; k++) {
        const mat2 = pick(neonMats);
        const onX = rand() < 0.5;
        let sign;
        if (rand() < 0.55) {
          const sh = 2 + rand() * Math.min(7, h * 0.5);
          sign = new THREE.Mesh(new THREE.BoxGeometry(onX ? 0.9 : 0.25, sh, onX ? 0.25 : 0.9), mat2);
          const y = 1.6 + sh / 2 + rand() * Math.max(0, h - sh - 2);
          if (onX) sign.position.set(x1 + 0.5, y, z0 + 0.6 + rand() * (d - 1.2));
          else sign.position.set(x0 + 0.6 + rand() * (w - 1.2), y, z1 + 0.5);
        } else {
          const len = (onX ? d : w) * (0.5 + rand() * 0.4);
          sign = new THREE.Mesh(new THREE.BoxGeometry(onX ? 0.15 : len, 0.4 + rand() * 0.5, onX ? len : 0.15), mat2);
          const y = 2.2 + rand() * Math.max(0.5, h - 3);
          if (onX) sign.position.set(x1 + 0.1, y, (z0 + z1) / 2);
          else sign.position.set((x0 + x1) / 2, y, z1 + 0.1);
        }
        grp.add(sign);
        if (rand() < 0.3) flickers.push({ m: sign, base: mat2.color.clone(), ph: rand() * 100 });
      }
      // a billboard on the tall ones: a lit panel the ascii pass turns into a
      // block of shimmering data glyphs in the panel's colour
      if (h > 9 && rand() < 0.55) {
        const onX = rand() < 0.5;
        const bw = Math.min((onX ? d : w) * 0.8, 2.5 + rand() * 3), bh = 1.6 + rand() * 2.4;
        const col = new THREE.Color(pick(NEON));
        const board = new THREE.Mesh(new THREE.BoxGeometry(onX ? 0.2 : bw, bh, onX ? bw : 0.2), new THREE.MeshBasicMaterial({ color: col }));
        const y = Math.max(3, h * (0.45 + rand() * 0.4));
        if (onX) board.position.set(x1 + 0.15, y, (z0 + z1) / 2); else board.position.set((x0 + x1) / 2, y, z1 + 0.15);
        grp.add(board);
        flickers.push({ m: board, base: col.clone(), ph: rand() * 100 });
      }
      // a shopfront glow at street level
      if (rand() < 0.8) {
        const onX = rand() < 0.5;
        const shop = new THREE.Mesh(
          new THREE.BoxGeometry(onX ? 0.05 : w * 0.8, 1.2, onX ? d * 0.8 : 0.05),
          new THREE.MeshBasicMaterial({ color: new THREE.Color(pick(NEON)).multiplyScalar(0.8) }),
        );
        if (onX) shop.position.set(x1 + 0.03, 1.0, (z0 + z1) / 2);
        else shop.position.set((x0 + x1) / 2, 1.0, z1 + 0.03);
        grp.add(shop);
      }
    }
  }

  // ---------- the plaza and its hologram ----------
  const pz = new THREE.Mesh(new THREE.BoxGeometry(BLOCK + 1, 0.3, BLOCK + 1), new THREE.MeshLambertMaterial({ color: 0x1b2030 }));
  pz.position.set(plazaCentre.x, 0.15, plazaCentre.z); scene.add(pz);
  for (let k = 0; k < 4; k++) {
    const a = k * Math.PI / 2 + Math.PI / 4;
    const tree = new THREE.Mesh(new THREE.ConeGeometry(0.9, 2.6, 6), plantMat);
    tree.position.set(plazaCentre.x + Math.cos(a) * 3.6, 1.6, plazaCentre.z + Math.sin(a) * 3.6);
    scene.add(tree);
  }
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.12, 6, 40), new THREE.MeshBasicMaterial({ color: 0x22f0ff }));
  ring.rotation.x = Math.PI / 2; ring.position.set(plazaCentre.x, 0.45, plazaCentre.z); scene.add(ring);
  const holo = new THREE.Mesh(
    new THREE.TorusKnotGeometry(2.2, 0.55, 90, 10, 2, 3),
    new THREE.MeshBasicMaterial({ color: 0xff2bd6, wireframe: true }),
  );
  holo.position.set(plazaCentre.x, 7.5, plazaCentre.z); scene.add(holo);
  spinners.push({ m: holo, ax: 0.5, ay: 0.9 });
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.4, 2.4, 6, 16, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xff2bd6, transparent: true, opacity: 0.12, depthWrite: false, blending: THREE.AdditiveBlending }),
  );
  beam.position.set(plazaCentre.x, 3.4, plazaCentre.z); scene.add(beam);
  boxes.push({ minX: plazaCentre.x - 0.6, maxX: plazaCentre.x + 0.6, minZ: plazaCentre.z - 0.6, maxZ: plazaCentre.z + 0.6 });

  // ---------- light ----------
  // three faces of every box must read as three different glyphs: the key
  // comes from +x and above, so the +x walls are bright, the +z walls a step
  // darker, and the roofs between them
  scene.add(new THREE.HemisphereLight(0x6070b0, 0x100818, 0.9));
  const moon = new THREE.DirectionalLight(0xc8d4ff, 5.0);
  moon.position.set(18, 55, 42); scene.add(moon);
  const plazaLight = new THREE.PointLight(0xff2bd6, 60, 22, 1.6);
  plazaLight.position.set(plazaCentre.x, 5, plazaCentre.z); scene.add(plazaLight);
  for (let k = 0; k < 5; k++) {
    const l = new THREE.PointLight(pick(NEON), 40, 16, 1.7);
    l.position.set(Math.round((rand() * 2 - 1) * N) * P, 3, (rand() * 2 - 1) * EXTENT);
    scene.add(l);
  }

  function update(t) {
    for (const f of flickers) {
      // mostly on; now and then a stutter
      const s = Math.sin(t * 2.1 + f.ph) + Math.sin(t * 13.7 + f.ph * 2);
      const on = s > -1.55 || Math.sin(t * 47 + f.ph) > 0.4;
      f.m.material.color.copy(f.base).multiplyScalar(on ? 1 : 0.12);
    }
    for (const b of blinkers) b.m.visible = ((t + b.ph) % 1.6) < 0.25;
    for (const s of spinners) { s.m.rotation.x = t * s.ax; s.m.rotation.y = t * s.ay; }
    ring.scale.setScalar(1 + 0.06 * Math.sin(t * 3));
    beam.material.opacity = 0.1 + 0.05 * Math.sin(t * 5.3);
  }

  // the iso camera's problem: a building between the camera and the runner
  // hides the street. Rays go from the runner toward the camera (three, a
  // little apart, so the hole is wider than the runner) and any building they
  // pass through sinks to a stump — and grows back when the runner moves on.
  const _o = new THREE.Vector3(), _side = new THREE.Vector3();
  function rayHits(b, o, d) {
    let t0 = 0, t1 = 400;
    for (const [oo, dd, lo, hi] of [[o.x, d.x, b.minX, b.maxX], [o.y, d.y, 0, b.top], [o.z, d.z, b.minZ, b.maxZ]]) {
      if (Math.abs(dd) < 1e-6) { if (oo < lo || oo > hi) return false; continue; }
      let a = (lo - oo) / dd, c = (hi - oo) / dd;
      if (a > c) [a, c] = [c, a];
      t0 = Math.max(t0, a); t1 = Math.min(t1, c);
      if (t0 > t1) return false;
    }
    return true;
  }
  function cutaway(points, camDir, dt) {
    _side.set(camDir.z, 0, -camDir.x).normalize();
    for (const b of buildings) {
      let hit = false;
      for (const p of points) {
        for (const off of [-1.6, 0, 1.6]) {
          _o.copy(p).addScaledVector(_side, off); _o.y = Math.max(_o.y, 0.6);
          if (rayHits(b, _o, camDir)) { hit = true; break; }
        }
        if (hit) break;
      }
      const want = hit ? Math.min(1, 0.9 / b.top) : 1;
      b.k += (want - b.k) * Math.min(1, dt * 7);
      b.g.scale.y = b.k;
      b.g.visible = b.k > 0.02;
    }
  }

  return { boxes, buildings, update, cutaway, plazaCentre, rand };
}

// can a circle of radius r stand at (x, z)?
export function blocked(boxes, x, z, r) {
  if (Math.abs(x) > EXTENT + 3 || Math.abs(z) > EXTENT + 3) return true;
  for (const b of boxes) {
    if (x > b.minX - r && x < b.maxX + r && z > b.minZ - r && z < b.maxZ + r) return true;
  }
  return false;
}
