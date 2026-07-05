import * as THREE from 'three';

// ── Low-poly humanoid samurai robot factory ───────────────────────────────────
// Every fighter in the game (player forms + enemies) is built from the same
// box-primitive rig, tinted by a body colour + neon accent. Geometries are
// cached module-wide; materials are cloned per rig so hit-flash / telegraph
// glow on one robot never bleeds onto another.

const _geoCache = {};
function box(w, h, d) {
  const key = `b${w},${h},${d}`;
  return _geoCache[key] || (_geoCache[key] = new THREE.BoxGeometry(w, h, d));
}
function cyl(rt, rb, h, seg = 6) {
  const key = `c${rt},${rb},${h},${seg}`;
  return _geoCache[key] || (_geoCache[key] = new THREE.CylinderGeometry(rt, rb, h, seg));
}
function cone(r, h, seg = 8) {
  const key = `k${r},${h},${seg}`;
  return _geoCache[key] || (_geoCache[key] = new THREE.ConeGeometry(r, h, seg));
}

function bodyMat(color) {
  return new THREE.MeshStandardMaterial({
    color, flatShading: true, roughness: 0.55, metalness: 0.45,
  });
}
function neonMat(color, intensity = 1.6) {
  return new THREE.MeshStandardMaterial({
    color: 0x0a0a0a, emissive: color, emissiveIntensity: intensity,
    flatShading: true, roughness: 0.4, metalness: 0.2,
  });
}

// Weapon kinds: 'katana' | 'cleaver' | 'daggers' | 'rifle'
// fancy: full ronin dressing — kasa hat, rope obi + scabbards, hakama skirt,
// puffy pants over piston shins, split-toe feet (player frames use this;
// enemies keep the leaner crested silhouette so they read differently).
export function buildSamurai({ body = 0x23262e, accent = 0x00f0ff, weapon = 'katana', scale = 1, fancy = false } = {}) {
  const group = new THREE.Group();
  const bMat  = bodyMat(body);
  const dark  = bodyMat(0x14161c);
  const neon  = neonMat(accent);
  const blade = neonMat(accent, 2.4);
  const trim  = neonMat(accent, 0.45);   // subtle costume glow — must not bloom out

  const rig = {
    group, scale,
    accent,
    bodyMats: [bMat, dark],
    neonMats: [neon, blade],
    bladeMat: blade,
    hipsBaseY: 0.92,
  };

  // hips + pelvis
  const hips = new THREE.Group();
  hips.position.y = 0.92;
  group.add(hips);
  rig.hips = hips;
  const pelvis = new THREE.Mesh(box(0.42, 0.18, 0.26), dark);
  hips.add(pelvis);

  if (fancy) {
    // rope obi: fat belt + back knot, two scabbards slung off the left hip
    const obi = new THREE.Mesh(box(0.54, 0.16, 0.38), dark);
    obi.position.y = 0.06;
    hips.add(obi);
    const knot = new THREE.Mesh(box(0.18, 0.14, 0.14), bMat);
    knot.position.set(0.1, 0.06, -0.24);
    hips.add(knot);
    for (let i = 0; i < 2; i++) {
      const saya = new THREE.Mesh(cyl(0.028, 0.028, 0.85, 5), dark);
      saya.position.set(-0.24, 0.1 + i * 0.09, -0.28);
      saya.rotation.set(-1.35, 0, -0.5 - i * 0.18);
      hips.add(saya);
      const tip = new THREE.Mesh(box(0.05, 0.07, 0.05), trim);
      tip.position.y = -0.44;
      saya.add(tip);
    }
    // flared hakama skirt hanging from the belt, over the thighs
    const skirt = new THREE.Mesh(cyl(0.3, 0.48, 0.55, 6), bMat);
    skirt.position.y = -0.26;
    hips.add(skirt);
    const hem = new THREE.Mesh(cyl(0.48, 0.485, 0.025, 6), trim);
    hem.position.y = -0.52;
    hips.add(hem);
  }

  // torso (pivot at waist so it can twist/lean)
  const torso = new THREE.Group();
  torso.position.y = 0.12;
  hips.add(torso);
  rig.torso = torso;
  const chest = new THREE.Mesh(box(0.55, 0.5, 0.32), bMat);
  chest.position.y = 0.38;
  torso.add(chest);
  const obi = new THREE.Mesh(box(0.44, 0.07, 0.28), neon);   // glowing belt
  obi.position.y = 0.08;
  torso.add(obi);
  const chestSlit = new THREE.Mesh(box(0.06, 0.3, 0.02), neon);
  chestSlit.position.set(0, 0.4, 0.17);
  torso.add(chestSlit);

  // shoulder pads (sode)
  for (const s of [-1, 1]) {
    const pad = new THREE.Mesh(box(0.26, 0.1, 0.34), dark);
    pad.position.set(s * 0.42, 0.6, 0);
    pad.rotation.z = -s * 0.4;
    torso.add(pad);
  }

  // head + visor + kabuto crest
  const head = new THREE.Group();
  head.position.y = 0.78;
  torso.add(head);
  rig.head = head;
  const skull = new THREE.Mesh(box(0.3, 0.28, 0.3), bMat);
  skull.position.y = 0.12;
  head.add(skull);
  const visor = new THREE.Mesh(box(0.26, 0.05, 0.02), blade);
  visor.position.set(0, 0.13, 0.16);
  head.add(visor);
  if (fancy) {
    // wide kasa hat with a glowing rim
    const kasa = new THREE.Mesh(cone(0.46, 0.2, 8), dark);
    kasa.position.y = 0.36;
    head.add(kasa);
    const rim = new THREE.Mesh(cyl(0.44, 0.455, 0.025, 8), trim);
    rim.position.y = 0.28;
    head.add(rim);
  } else {
    for (const s of [-1, 1]) {                                // V crest
      const horn = new THREE.Mesh(box(0.04, 0.3, 0.015), neon);
      horn.position.set(s * 0.09, 0.36, 0.1);
      horn.rotation.z = -s * 0.45;
      head.add(horn);
    }
  }

  // arms
  const mkArm = (side) => {
    const arm = new THREE.Group();
    arm.position.set(side * 0.42, 0.55, 0);
    torso.add(arm);
    const upper = new THREE.Mesh(box(0.14, 0.4, 0.14), bMat);
    upper.position.y = -0.2;
    arm.add(upper);
    const fore = new THREE.Mesh(box(0.12, 0.36, 0.12), dark);
    fore.position.y = -0.56;
    arm.add(fore);
    return arm;
  };
  rig.armL = mkArm(-1);
  rig.armR = mkArm(1);

  // legs
  const mkLeg = (side) => {
    const leg = new THREE.Group();
    leg.position.set(side * 0.15, 0, 0);
    hips.add(leg);
    if (fancy) {
      // puffy pant leg poking out under the skirt, piston shin, split toes
      const puff = new THREE.Mesh(box(0.22, 0.3, 0.24), bMat);
      puff.position.y = -0.32;
      leg.add(puff);
      const shin = new THREE.Mesh(cyl(0.05, 0.06, 0.36, 5), dark);
      shin.position.y = -0.62;
      leg.add(shin);
      const piston = new THREE.Mesh(cyl(0.022, 0.022, 0.3, 4), trim);
      piston.position.set(0, -0.62, -0.06);
      leg.add(piston);
      const ankle = new THREE.Mesh(cyl(0.07, 0.07, 0.06, 6), bMat);
      ankle.rotation.z = Math.PI / 2;
      ankle.position.y = -0.8;
      leg.add(ankle);
      for (const s of [-1, 1]) {
        const toe = new THREE.Mesh(box(0.06, 0.07, 0.22), dark);
        toe.position.set(s * 0.045, -0.865, 0.06);
        leg.add(toe);
      }
    } else {
      const thigh = new THREE.Mesh(box(0.16, 0.42, 0.18), bMat);
      thigh.position.y = -0.24;
      leg.add(thigh);
      const shin = new THREE.Mesh(box(0.13, 0.38, 0.14), dark);
      shin.position.y = -0.64;
      leg.add(shin);
      const foot = new THREE.Mesh(box(0.14, 0.08, 0.24), bMat);
      foot.position.set(0, -0.86, 0.05);
      leg.add(foot);
    }
    return leg;
  };
  rig.legL = mkLeg(-1);
  rig.legR = mkLeg(1);

  // weapon, mounted on the right forearm
  const weaponGrp = new THREE.Group();
  weaponGrp.position.set(0, -0.72, 0.06);
  rig.armR.add(weaponGrp);
  rig.weaponGrp = weaponGrp;

  if (weapon === 'katana') {
    const hilt = new THREE.Mesh(cyl(0.03, 0.035, 0.24), dark);
    weaponGrp.add(hilt);
    const guard = new THREE.Mesh(cyl(0.07, 0.07, 0.02, 8), neon);
    guard.position.y = 0.13;
    weaponGrp.add(guard);
    const bl = new THREE.Mesh(box(0.045, 0.95, 0.015), blade);
    bl.position.y = 0.62;
    weaponGrp.add(bl);
    weaponGrp.rotation.x = -1.35;      // blade carried forward at rest
  } else if (weapon === 'cleaver') {
    const hilt = new THREE.Mesh(cyl(0.04, 0.045, 0.4), dark);
    weaponGrp.add(hilt);
    const bl = new THREE.Mesh(box(0.3, 0.95, 0.05), bMat);
    bl.position.y = 0.75;
    weaponGrp.add(bl);
    const edge = new THREE.Mesh(box(0.06, 0.95, 0.055), blade);
    edge.position.set(0.17, 0.75, 0);
    weaponGrp.add(edge);
    weaponGrp.rotation.x = -1.2;
  } else if (weapon === 'daggers') {
    for (const arm of [rig.armR, rig.armL]) {
      const g = arm === rig.armR ? weaponGrp : new THREE.Group();
      if (arm !== rig.armR) { g.position.set(0, -0.72, 0.06); arm.add(g); }
      const bl = new THREE.Mesh(box(0.035, 0.5, 0.012), blade);
      bl.position.y = 0.3;
      g.add(bl);
      g.rotation.x = -1.5;
    }
  } else if (weapon === 'rifle') {
    const stock = new THREE.Mesh(box(0.08, 0.1, 0.5), dark);
    stock.position.z = 0.18;
    weaponGrp.add(stock);
    const barrel = new THREE.Mesh(cyl(0.025, 0.025, 0.4), bMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.z = 0.55;
    weaponGrp.add(barrel);
    const tip = new THREE.Mesh(box(0.06, 0.06, 0.06), blade);
    tip.position.z = 0.76;
    weaponGrp.add(tip);
    rig.muzzle = tip;
  }

  group.scale.setScalar(scale);
  return rig;
}

// ── Procedural posing (stateless: call every frame, sets absolute rotations) ──
const lerp = (a, b, t) => a + (b - a) * Math.min(Math.max(t, 0), 1);
const easeOut = (t) => 1 - Math.pow(1 - Math.min(Math.max(t, 0), 1), 3);

export function poseStance(rig) {
  rig.hips.position.y = rig.hipsBaseY;
  rig.torso.rotation.set(0, 0, 0);
  rig.head.rotation.set(0, 0, 0);
  rig.armL.rotation.set(-0.15, 0, 0.1);
  rig.armR.rotation.set(-0.15, 0, -0.1);
  rig.legL.rotation.set(0, 0, 0);
  rig.legR.rotation.set(0, 0, 0);
}

// Run cycle blended by k (0 idle → 1 full sprint): stride and counter-swing
// grow with k, hips bounce on each footfall, and the whole torso leans
// further forward the closer k gets to max speed (head compensates).
export function poseRun(rig, phase, k = 1) {
  const s = Math.sin(phase);
  const amp = 0.25 + 0.55 * k;
  rig.legL.rotation.x = s * amp;
  rig.legR.rotation.x = -s * amp;
  rig.armL.rotation.x = -0.15 - s * amp * (0.55 + 0.35 * k);
  rig.armR.rotation.x = -0.15 + s * amp * (0.55 + 0.35 * k);
  rig.armL.rotation.z = 0.1 + 0.08 * k;
  rig.armR.rotation.z = -0.1 - 0.08 * k;
  // footfall bounce, two beats per stride, deeper at speed
  rig.hips.position.y = rig.hipsBaseY - 0.03 * k + Math.abs(Math.cos(phase)) * (0.04 + 0.08 * k);
  // forward lean ramps hard toward max speed; slight roll + counter-twist
  rig.torso.rotation.x = 0.1 * k + 0.3 * k * k;
  rig.torso.rotation.z = s * 0.06 * k;
  rig.torso.rotation.y = -s * 0.12 * k;
  rig.head.rotation.x = -(0.07 * k + 0.22 * k * k);   // keep eyes on the horizon
}

export function poseWalk(rig, phase, amp = 0.5) {
  poseRun(rig, phase, amp * 0.9);
}

export function poseIdle(rig, t) {
  rig.hips.position.y = rig.hipsBaseY + Math.sin(t * 2.2) * 0.025;
  rig.torso.rotation.z = Math.sin(t * 1.3) * 0.03;
}

// k: 0..1 progress of a full swing (windup → slash → recover).
// two-handed swings drive both arms (brute slam / oni cleave).
export function poseSwing(rig, k, twoHanded = false) {
  let armX, armZ, twist;
  if (k < 0.4) {                       // windup: raise weapon over shoulder
    const e = k / 0.4;
    armX = lerp(-0.15, -2.4, e);
    armZ = lerp(-0.1, 0.45, e);
    twist = lerp(0, 0.55, e);
  } else if (k < 0.68) {               // slash: whip forward
    const e = easeOut((k - 0.4) / 0.28);
    armX = lerp(-2.4, 1.05, e);
    armZ = lerp(0.45, -0.2, e);
    twist = lerp(0.55, -0.65, e);
  } else {                             // recover
    const e = (k - 0.68) / 0.32;
    armX = lerp(1.05, -0.15, e);
    armZ = lerp(-0.2, -0.1, e);
    twist = lerp(-0.65, 0, e);
  }
  rig.armR.rotation.set(armX, 0, armZ);
  rig.torso.rotation.y = twist;
  if (twoHanded) rig.armL.rotation.set(armX, 0, -armZ);
}

export function poseAim(rig, lift = 1.45) {
  rig.armR.rotation.set(-lift, 0, 0);
  rig.torso.rotation.y = -0.25;
}

// Temporary glow boost for telegraphs / hit flash.
export function setGlow(rig, boost) {
  for (const m of rig.neonMats) m.emissiveIntensity = m === rig.bladeMat ? 2.4 * boost : 1.6 * boost;
}

export function setFlash(rig, on) {
  for (const m of rig.bodyMats) {
    m.emissive.setHex(on ? 0xffffff : 0x000000);
    m.emissiveIntensity = on ? 0.7 : 0;
  }
}
