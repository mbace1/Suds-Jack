import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { TUNING } from './tuning.js?v=37';

// ── Goo shader ────────────────────────────────────────────────────────────────
// Shared time uniform — updated once per frame in main.js, propagates to all goo mats.
export const GOO_TIME = { value: 0 };

const GOO_VERT = `
  uniform float uTime;
  uniform float uPhase;
  uniform float uWobble;
  uniform float uRadius;
  uniform float uStretch;     // 0 = none; ~0.45 = strong lunge
  uniform vec2  uStretchDir;  // normalized world/obj xz travel direction
  uniform float uHit;         // 1 at impact, decays to 0 — drives the hit ripple
  uniform vec2  uHitDir;      // obj-space xz direction toward the impact point
  uniform float uTear;        // 1 at death onset → 0 — violent pre-pop thrash
  varying vec3 vNormal;
  varying vec3 vViewPos;
  void main() {
    vec3 pos = position;
    // Work in radius-normalized space so every blob (r 0.55–1.1, shared 14x10 topology)
    // gets the same lump count and stays under the sphere's sampling limit (no faceting).
    vec3 q = position / uRadius;
    float a1 = q.x * 3.6 + uTime * 2.1 + uPhase;
    float a2 = q.y * 4.2 + uTime * 1.6 + uPhase * 1.3;
    float a3 = q.z * 4.8 + uTime * 2.5 + uPhase * 0.7;
    float wave = (sin(a1) + sin(a2) + sin(a3)) * 0.3333;
    float amp  = 0.13 * uRadius * uWobble;
    pos += normal * wave * amp;
    // Perturb the normal by the height-field gradient so lumps catch light. The uRadius
    // factors cancel here, giving consistent lump shading independent of blob size.
    vec3 gradWave = vec3(cos(a1) * 3.6, cos(a2) * 4.2, cos(a3) * 4.8) * (0.3333 / uRadius);
    vec3 N = normalize(normal - gradWave * amp);
    // Hit ripple: concentric waves spreading from the impact point, expanding as uHit decays.
    float hd = dot(normalize(q), vec3(uHitDir.x, 0.0, uHitDir.y));
    float ripple = sin(hd * 9.0 - (1.0 - uHit) * 16.0) * uHit;
    pos += normal * ripple * 0.11 * uRadius;
    // Pre-death tear: violent high-frequency thrash as the blob convulses and bursts.
    float te = (sin(q.x*15.0 + uTime*34.0) + sin(q.y*17.0 - uTime*29.0) + sin(q.z*13.0 + uTime*38.0)) * 0.3333;
    pos += normal * te * 0.22 * uRadius * uTear;
    // Directional squash-stretch: lunge along travel, compress height (volume feel).
    vec3 sdir = vec3(uStretchDir.x, 0.0, uStretchDir.y);
    pos  += sdir * dot(pos, sdir) * uStretch;
    pos.y *= (1.0 - uStretch * 0.4);
    vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
    vNormal  = normalMatrix * N;
    vViewPos = -mvPos.xyz;
    gl_Position = projectionMatrix * mvPos;
  }
`;
const GOO_FRAG = `
  precision highp float;
  uniform vec3  uColor;
  uniform vec3  uEmissive;
  uniform float uOpacity;
  uniform float uFresnel;
  uniform float uSpecAPow;
  uniform float uSpecBPow;
  uniform float uSSS;
  uniform float uTime;
  uniform float uPhase;
  varying vec3 vNormal;
  varying vec3 vViewPos;
  void main() {
    vec3 LIGHT = normalize(vec3(-0.65, 2.30, 1.70));
    vec3 N = normalize(vNormal);
    vec3 V = normalize(vViewPos);
    vec3 H = normalize(LIGHT + V);
    float NdL = max(dot(N, LIGHT), 0.0);
    float NdH = max(dot(N, H),     0.0);
    float NdV = max(dot(N, V),     0.0);
    float specA      = pow(NdH, uSpecAPow) * 2.60;
    float specB      = pow(NdH, uSpecBPow) * 0.32;
    float fresnel      = pow(1.0 - NdV, 2.2) * uFresnel;
    float fresnelTight = pow(1.0 - NdV, 6.0) * uFresnel * 0.7;
    float sssPulse   = 1.0 + 0.12 * sin(uTime * 1.6 + uPhase);
    float sss        = pow(max(0.0, -dot(N, LIGHT) * 0.42 + 0.58), 2.2) * uSSS * sssPulse;
    vec3 col = uColor * 0.08
             + uColor * NdL * 0.8
             + vec3(1.0) * (specA + specB) * 0.5
             + mix(uColor, vec3(1.0), 0.6) * fresnel * 1.9
             + vec3(1.0) * fresnelTight * 1.1
             + uColor * sss
             + uEmissive;
    gl_FragColor = vec4(col, uOpacity);
  }
`;
export function makeGooMat(color, opacity, wobble = 0, radius = 0.5) {
  return new THREE.ShaderMaterial({
    vertexShader:   GOO_VERT,
    fragmentShader: GOO_FRAG,
    uniforms: {
      uColor:    { value: new THREE.Color(color) },
      uEmissive: { value: new THREE.Color(0) },
      uOpacity:  { value: opacity },
      uFresnel:  { value: 0.62 },
      uSpecAPow: { value: 88.0 },
      uSpecBPow: { value: 11.0 },
      uSSS:      { value: 0.42 },
      uTime:       GOO_TIME,
      uPhase:      { value: Math.random() * Math.PI * 2 },
      uWobble:     { value: wobble },
      uRadius:     { value: radius },
      uStretch:    { value: 0 },
      uStretchDir: { value: new THREE.Vector2(0, 0) },
      uHit:        { value: 0 },
      uHitDir:     { value: new THREE.Vector2(0, 0) },
      uTear:       { value: 0 },
    },
    transparent: opacity < 1,
    depthWrite:  opacity >= 0.9,
  });
}

// ── Blob gel-dome geometry (port brief Part 2) ────────────────────────────────
// SDF-generated dome: most of a ball with a flat rounded-off bottom (same
// family as the player, fuller than a half-ball). Shrink-wraps a dense unit
// sphere by binary-searching each vertex direction to the SDF zero crossing;
// normals from the SDF gradient. Matches enemy-lab.html's blobGeo exactly.
function smin(a, b, k) { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; }
function smax(a, b, k) { return -smin(-a, -b, k); }
function sdfGeometry(sdf, detail) {
  const geo = new THREE.SphereGeometry(1, detail, Math.round(detail * 0.66));
  const pos = geo.attributes.position, nor = geo.attributes.normal;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).normalize();
    let lo = 0.05, hi = 2.4;
    for (let it = 0; it < 24; it++) { const m = (lo + hi) * 0.5; (sdf(v.x * m, v.y * m, v.z * m) < 0) ? lo = m : hi = m; }
    const t = (lo + hi) * 0.5;
    pos.setXYZ(i, v.x * t, v.y * t, v.z * t);
    const e = 0.003, qx = v.x * t, qy = v.y * t, qz = v.z * t;
    const nx = sdf(qx + e, qy, qz) - sdf(qx - e, qy, qz),
          ny = sdf(qx, qy + e, qz) - sdf(qx, qy - e, qz),
          nz = sdf(qx, qy, qz + e) - sdf(qx, qy, qz - e);
    const inv = 1 / Math.hypot(nx, ny, nz);
    nor.setXYZ(i, nx * inv, ny * inv, nz * inv);
  }
  return geo;
}
// Unit-radius dome shared by every blob (sized per-enemy via mesh.scale);
// origin translated to the floor contact point so rest position is y=0 and
// all squash/breathe/drag scaling anchors to the ground (no floating).
const BLOB_GEO = (() => {
  const { domeCut, domeRound } = TUNING.blob;
  const g = sdfGeometry((x, y, z) => smax(Math.hypot(x, y, z) - 1, -y - domeCut, domeRound), 72);
  g.translate(0, domeCut, 0);
  return g;
})();

export const EnemyType = {
  // Blob family (spheres)
  GLOBBO:      0,
  SPITTOR:     1,
  FANNER:      2,
  WEEVA:       3,
  SPLITTA:     4,
  // Cube family
  YELA_CUBE:   5,
  ORANGE_CUBE: 6,
  SLUDGE_CUBE: 7,
  REDD_CUBE:   8,
  PURP_CUBE:   9,
  // Cube minis (spawned on death)
  REDD_MINI:   10,
  PURP_MINI:   11,
  // Unique
  TORO:        12,
  BAMBU:       13,
  PYRA:        14,
  // Boss-exclusive (v71) — never spawns in the regular pool, only as the
  // guaranteed every-8th-wave boss (see getEnemySchedule in main.js)
  OMEGA:       15,
};

export const CFG = {
  [EnemyType.GLOBBO]:      { color: 0x00ccaa, radius: 0.55, speed: 2.8, hp: 1, bulletColor: null,     fireInterval: null },
  [EnemyType.SPITTOR]:     { color: 0xff5533, radius: 0.9,  speed: 1.6, hp: 3, bulletColor: 0xff7755, fireInterval: 2.2  },
  [EnemyType.FANNER]:      { color: 0xff00aa, radius: 0.75, speed: 1.4, hp: 3, bulletColor: 0xff66cc, fireInterval: 1.5  },
  [EnemyType.WEEVA]:       { color: 0x4422ee, radius: 0.8,  speed: 0.6, hp: 3, bulletColor: 0x6644ff, fireInterval: 0.16 },
  [EnemyType.SPLITTA]:     { color: 0x88ff22, radius: 1.1,  speed: 1.0, hp: 5, bulletColor: 0xaaff44, fireInterval: null },
  [EnemyType.YELA_CUBE]:   { color: 0xffdd00, radius: 0.7,  speed: 2.2, hp: 2, bulletColor: null,     fireInterval: null },
  [EnemyType.ORANGE_CUBE]: { color: 0xff8800, radius: 0.75, speed: 1.4, hp: 4, bulletColor: 0xff6600, fireInterval: 3.2  },
  [EnemyType.SLUDGE_CUBE]: { color: 0xaaee00, radius: 0.65, speed: 0.75,hp: 2, bulletColor: null,     fireInterval: null },
  [EnemyType.REDD_CUBE]:   { color: 0xff2211, radius: 0.75, speed: 1.9, hp: 3, bulletColor: null,     fireInterval: null },
  [EnemyType.PURP_CUBE]:   { color: 0xcc44ff, radius: 0.75, speed: 1.6, hp: 3, bulletColor: 0xcc66ff, fireInterval: null },
  [EnemyType.REDD_MINI]:   { color: 0xff4433, radius: 0.32, speed: 3.2, hp: 1, bulletColor: null,     fireInterval: null },
  [EnemyType.PURP_MINI]:   { color: 0xdd66ff, radius: 0.26, speed: 3.8, hp: 1, bulletColor: null,     fireInterval: null },
  [EnemyType.TORO]:        { color: 0x4488cc, radius: 1.0,  speed: 5.0, hp: 6, bulletColor: null,     fireInterval: null },
  [EnemyType.BAMBU]:       { color: 0xaa8844, radius: 0.7,  speed: 0,   hp: 1, bulletColor: 0xddbb44, fireInterval: TUNING.bambu.lobCooldown },
  [EnemyType.PYRA]:        { color: 0xff9900, radius: 1.0,  speed: 0,   hp: 4, bulletColor: 0xffcc44, fireInterval: 2.5  },
  [EnemyType.OMEGA]:       { color: 0x00eeff, radius: 0.95, speed: 1.3, hp: 5, bulletColor: 0x66f2ff, fireInterval: null },
};

// Per-type motion-trail signature (v36) — interval = cadence (denser = smaller),
// size = mark size ×radius. Dangerous/fast types leave bolder streaks; absent = no trail.
const TRAIL_CFG = {
  [EnemyType.TORO]:    { interval: 0.035, size: 0.85 }, // charger — thick, dense streak (top threat)
  [EnemyType.SPLITTA]: { interval: 0.07,  size: 0.60 },
  [EnemyType.WEEVA]:   { interval: 0.06,  size: 0.55 },
  [EnemyType.GLOBBO]:  { interval: 0.08,  size: 0.45 }, // basic chaser — subtle
  [EnemyType.FANNER]:  { interval: 0.09,  size: 0.45 },
  [EnemyType.SPITTOR]: { interval: 0.11,  size: 0.40 }, // mostly stationary — sparse
};

export const BLOB_TYPES = new Set([
  EnemyType.GLOBBO, EnemyType.SPITTOR, EnemyType.FANNER,
  EnemyType.WEEVA, EnemyType.SPLITTA,
]);

const CUBE_TYPES = new Set([
  EnemyType.YELA_CUBE, EnemyType.ORANGE_CUBE, EnemyType.SLUDGE_CUBE,
  EnemyType.REDD_CUBE, EnemyType.PURP_CUBE, EnemyType.REDD_MINI, EnemyType.PURP_MINI,
]);

export class Enemy {
  constructor(scene, type, x, z, speedMult = 1, intervalMult = 1) {
    this.type          = type;
    this.alive         = true;
    const cfg          = CFG[type];
    this.hp            = cfg.hp;
    this._dying        = false;
    this._deathT       = 0;
    this._flashT       = 0;
    this._wobbleT      = Math.random() * Math.PI * 2;
    this._sq           = 1.0;
    this._sqV          = 0.0;
    this._speedMult    = speedMult;
    this._intervalMult = intervalMult;
    this._t            = Math.random() * 0.5;
    this._isTelegraphing = false;
    this._telegraphT   = 0;
    this._telegraphMax = 0;
    this._spiralAngle  = 0;
    this._spiralAccel  = 0;
    this._strafeDir    = 1;
    this._strafeTimer  = 1.5 + Math.random();
    this._childrenReady = false;
    this._childType    = null;
    this._childCount   = 0;
    this._childFreeform = false;
    this._trailReady   = false;
    this._trailTimer   = 0;
    this.chunks        = [];

    // Movement VFX (v29): smoothed velocity → blob stretch + motion-trail emission
    this._velX = 0; this._velZ = 0;
    this._stretch = 0;
    this._motionTrailReady = false;
    this._motionTrailTimer = 0;
    const _tc = TRAIL_CFG[type];
    this._trailInterval = _tc ? _tc.interval : 0; // 0 ⇒ this type leaves no motion trail
    this._trailMult     = _tc ? _tc.size     : 0;
    this._hitRipple = 0; // v32: decays 1→0 after a hit, drives the goo surface ripple
    // Cube archetype state (v40): flank/orbit side chosen once, PURP spiral timer
    this._flankSign = Math.random() < 0.5 ? 1 : -1;
    this._orbitSign = Math.random() < 0.5 ? 1 : -1;
    this._purpFireT = 0.5;
    // PURP_CUBE spiral (v61): per-cube rotation speed + direction so each one
    // traces a distinct 2-arm galaxy instead of an identical mechanical spiral.
    this._purpSpin  = (0.42 + Math.random() * 0.34) * (Math.random() < 0.5 ? 1 : -1);

    // Blob archetype state (v58)
    this._pounceState = 'stalk';                  // GLOBBO: stalk → crouch → leap
    this._pounceT     = 1.0 + Math.random() * 1.4;
    this._pounceDir   = { x: 0, z: 1 };
    this._fannerShot  = 0;                         // FANNER: every 3rd volley goes wide

    // State machine fields
    this._state        = 'idle';
    this._stateT       = 0;
    this._poisonReady  = false;
    this._poisonTimer  = 0;
    this._aimArrow     = null;
    this._totalShots   = 6;
    this._hitChunks    = [];
    this._aoeReady     = false;
    this._lobReady     = null;

    // Boss identity (v59)
    this._isBoss     = false;
    this._bossMaxHp  = 0;
    this._enraged    = false;

    // Build geometry based on type family
    let geo;
    if (BLOB_TYPES.has(type)) {
      // Shared unit gel dome (Part 2) — radius + silhouette applied via mesh.scale.
      geo = BLOB_GEO;
    } else if (CUBE_TYPES.has(type)) {
      geo = new RoundedBoxGeometry(cfg.radius * 1.8, cfg.radius * 1.8, cfg.radius * 1.8, 4, 0.18);
    } else if (type === EnemyType.TORO) {
      geo = new THREE.TorusGeometry(cfg.radius * 0.68, cfg.radius * 0.32, 8, 18);
    } else if (type === EnemyType.OMEGA) {
      // Faceted crystal core — visually distinct from every blob/cube/TORO
      // silhouette so the boss reads as its own thing, not a scaled-up regular.
      geo = new THREE.IcosahedronGeometry(cfg.radius, 0);
    }

    const isBlob = BLOB_TYPES.has(type);
    const isCube = CUBE_TYPES.has(type);
    const isToro = type === EnemyType.TORO;
    const matOpacity = isCube ? 0.88 : 0.82;

    if (isBlob) {
      // uRadius=1: the shared dome is unit-sized in object space (mesh.scale
      // carries the real radius), so the shader's radius-normalized wobble
      // math sees the same lump frequencies it did with radius-baked spheres.
      this.mat = makeGooMat(cfg.color, matOpacity, 1.0, 1);
      // Per-blob silhouette (TUNING.blob): squat grounded baseline, with
      // snouty/pancake/tall overrides for SPITTOR/FANNER/WEEVA.
      const shapes = TUNING.blob.shapes;
      this._shape =
        type === EnemyType.SPITTOR ? shapes.SPITTOR :
        type === EnemyType.FANNER  ? shapes.FANNER  :
        type === EnemyType.WEEVA   ? shapes.WEEVA   : TUNING.blob.shape;
      this._phase   = Math.random() * Math.PI * 2; // desyncs breathe/lunge across the wave
      this._moveYaw = 0;
    } else {
      this.mat = new THREE.MeshPhongMaterial({
        color:       cfg.color,
        emissive:    0x000000,
        transparent: true,
        opacity:     matOpacity,
        shininess:   isToro ? 140 : 100,
      });
    }

    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.castShadow = true;

    // Blob accent markers (v73): small glowing beacons, layered on top of the
    // shared goo shader (used by every blob and the player, so left untouched),
    // so each blob type reads distinctly at a glance during swarms. Count and
    // arrangement echo each type's identity; colour reuses its bulletColor —
    // the colour of the bullets it actually fires.
    this._blobMarkerAngle = 0;
    if (isBlob) {
      const markerColor = cfg.bulletColor ?? 0x004433;
      const markerMat = new THREE.MeshBasicMaterial({
        color: markerColor, transparent: true, opacity: 0.85,
        blending: THREE.AdditiveBlending, depthWrite: false,
      });
      this._blobMarkers = [];
      // Marker coords are in the dome's unit object space (origin at the floor
      // contact, body center ~y=1 pre-squash); mesh.scale carries the radius,
      // so marker geometry sizes divide by R to keep their old world size.
      const addMarker = (mx, my, mz, r) => {
        const m = new THREE.Mesh(new THREE.SphereGeometry(r, 6, 5), markerMat);
        m.position.set(mx, my, mz);
        this.mesh.add(m);
        this._blobMarkers.push(m);
      };
      const R = cfg.radius;
      if (type === EnemyType.GLOBBO) {
        addMarker(0, 1.3, 0.75, 0.14 / R);                    // single forward beacon
      } else if (type === EnemyType.SPITTOR) {
        addMarker(0, 1.1, 0.95, 0.20 / R);                    // one large "mouth" beacon
      } else if (type === EnemyType.FANNER) {
        for (let i = -1; i <= 1; i++) addMarker(i * 0.55, 1.2, 0.75, 0.11 / R); // 3-wide fan
      } else if (type === EnemyType.WEEVA) {
        addMarker(0.85, 1.0, 0, 0.13 / R);                    // single orbiting beacon
      } else if (type === EnemyType.SPLITTA) {
        addMarker(-0.4, 1.2, 0.7, 0.12 / R);
        addMarker(0.4, 1.2, 0.7, 0.12 / R);                   // twin "eyes"
      }
      // SPLITTA: the two children it splits into, visibly bulging inside the
      // body before the split happens (TUNING.blob.splittaChildBulges).
      if (type === EnemyType.SPLITTA) {
        const { offset, scale } = TUNING.blob.splittaChildBulges;
        for (const sxo of [-offset[0], offset[0]]) {
          const b = new THREE.Mesh(BLOB_GEO, this.mat);
          b.position.set(sxo, offset[1], offset[2]);
          b.scale.setScalar(scale);
          this.mesh.add(b);
        }
      }
    }

    if (type === EnemyType.TORO) {
      // Toro uses a group for position management
      this.mesh.rotation.x = 0;

      // Add 6 spike meshes around the torus
      this.group = new THREE.Group();
      this.group.add(this.mesh);
      const spikeGeo = new THREE.ConeGeometry(0.12, 0.3, 4);
      const spikeMat = new THREE.MeshPhongMaterial({ color: cfg.color, shininess: 100 });
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const spike = new THREE.Mesh(spikeGeo, spikeMat);
        spike.position.set(Math.cos(a) * cfg.radius * 0.68, 0, Math.sin(a) * cfg.radius * 0.68);
        spike.rotation.z = -Math.PI / 2;
        spike.rotation.y = a;
        this.group.add(spike);
      }
      this.group.position.set(x, cfg.radius, z);
      scene.add(this.group);

      // Indicator line for telegraph
      const indGeo = new THREE.BoxGeometry(0.08, 0.05, 36);
      this._indicator = new THREE.Mesh(indGeo, new THREE.MeshBasicMaterial({
        color: 0xff2200, transparent: true, opacity: 0.55,
      }));
      this._indicator.visible = false;
      scene.add(this._indicator);

      // TORO-specific state
      this._dashDir   = { x: 1, z: 0 };
      this._dashSpeed = 0;
      this._spinAngle = 0;
      this._idleTimer = 1.5 + Math.random() * 2;
      this._state     = 'idle';

    } else if (type === EnemyType.BAMBU) {
      // BAMBU: stationary cross-stalk enemy
      this._bambuMat = new THREE.MeshPhongMaterial({
        color: cfg.color, transparent: true, opacity: 0.88, shininess: 80,
      });
      this.mat = this._bambuMat;
      this.group = new THREE.Group();
      this.group.position.set(x, 0, z);
      scene.add(this.group);

      this._maxSegs = TUNING.bambu.segments;
      this._segs = [];
      this._segs.push(this._makeBambuSeg(0));
      this.hp = 1;

      // Emerge from floor
      this.group.scale.y = 0.01;
      this._emergeT = 0.6;

      // Lob fire state — segments pop up rapidly right after emerging, then the
      // first lob charges up through the stalk almost immediately.
      this._bambuFireTimer = 1.3;
      this._bambuState = 'waiting';
      this._growTimer  = 0.18;
      this._lobTargetX = 0;
      this._lobTargetZ = 0;

      // Charge orb: rises through the stalk during the lob telegraph, reading as
      // the shot travelling up through each segment before it launches.
      this._chargeOrb = new THREE.Mesh(
        new THREE.SphereGeometry(0.35, 10, 8),
        new THREE.MeshBasicMaterial({
          color: cfg.bulletColor, transparent: true, opacity: 0.9,
          blending: THREE.AdditiveBlending, depthWrite: false,
        }),
      );
      this._chargeOrb.visible = false;
      this.group.add(this._chargeOrb);

      // Dummy mesh for code paths that reference this.mesh
      this.mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.01),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 }),
      );

    } else if (type === EnemyType.PYRA) {
      // PYRA: spinning ring with destroyable holes
      this.mat = new THREE.MeshPhongMaterial({
        color: cfg.color, transparent: true, opacity: 0.85, shininess: 120,
      });
      this.group = new THREE.Group();
      this.group.position.set(x, cfg.radius, z);
      scene.add(this.group);

      // Torus ring
      const ringMesh = new THREE.Mesh(
        new THREE.TorusGeometry(cfg.radius * 0.9, 0.15, 8, 20),
        this.mat,
      );
      ringMesh.rotation.x = Math.PI / 2; // lay flat for top-down view
      ringMesh.castShadow = true;
      this.group.add(ringMesh);
      this.mesh = ringMesh;

      // Destroyable holes (cones at 90° intervals)
      const tier = Math.floor(intervalMult > 0 ? (1 - intervalMult) / 0.09 : 0);
      const holeCount = tier < 3 ? 4 : tier < 5 ? 6 : 8;
      this._holes = [];
      const holeMat = new THREE.MeshPhongMaterial({ color: 0xffcc44, shininess: 80 });
      for (let i = 0; i < holeCount; i++) {
        const a = (i / holeCount) * Math.PI * 2;
        const holeMesh = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.4, 5), holeMat);
        holeMesh.position.set(Math.cos(a) * cfg.radius * 0.9, 0, Math.sin(a) * cfg.radius * 0.9);
        holeMesh.rotation.z = Math.PI / 2;
        holeMesh.rotation.y = a;
        holeMesh.castShadow = true;
        this.group.add(holeMesh);
        this._holes.push({ mesh: holeMesh, alive: true, angle: a });
      }
      this.hp = holeCount;

      // Spin state
      this._spinSpeed = 1.8;
      this._pyraFireTimer = cfg.fireInterval * intervalMult;

    } else {
      // Blob dome origin sits at the floor contact → rest y = 0; cubes/OMEGA
      // keep their center origin at radius height.
      if (isBlob) {
        this.mesh.position.set(x, 0, z);
        const shp = this._shape;
        this.mesh.scale.set(cfg.radius * shp.x, cfg.radius * shp.y, cfg.radius * shp.z);
      } else {
        this.mesh.position.set(x, cfg.radius, z);
      }
      scene.add(this.mesh);
    }

    // Flopping cube movers — shared tumble state (see _flopMove)
    if (CUBE_TYPES.has(type)) {
      const dirs = [{x:1,z:0},{x:-1,z:0},{x:0,z:1},{x:0,z:-1}];
      this._flopActive = false;
      this._flopRest   = Math.random() * 0.25; // stagger first flop across the wave
      this._flopDir    = dirs[Math.floor(Math.random() * 4)];
      this._flopAxis   = new THREE.Vector3();
      if (type === EnemyType.YELA_CUBE) this._trailTimer = TUNING.fx.slimeTrailInterval;
      if (type === EnemyType.SLUDGE_CUBE) {
        this._poisonTimer    = TUNING.fx.poisonInterval;
        this._trailPositions = [];
        this._trailPushTimer = 0;
      }
    } if (type === EnemyType.ORANGE_CUBE) {
      this._target = null; // chosen on the first update (needs playerPos)
      this._moveT  = 0;
      const tier = Math.floor(intervalMult > 0 ? (1 - intervalMult) / 0.09 : 0);
      this._totalShots = Math.min(12, 6 + tier * 2);
      this._fireT = 1.5 + Math.random(); // fire while moving
    } if (type === EnemyType.OMEGA) {
      this._omegaFireT = 1.2 + Math.random() * 0.6;
    }
  }

  _setEmissive(hex) {
    if (this.mat.uniforms) {
      this.mat.uniforms.uEmissive.value.setHex(hex);
    } else {
      this.mat.emissive.setHex(hex);
    }
  }
  _setOpacity(val) {
    if (this.mat.uniforms) {
      this.mat.uniforms.uOpacity.value = val;
    } else {
      this.mat.opacity = val;
    }
  }

  get position() {
    return (this.type === EnemyType.TORO || this.type === EnemyType.BAMBU || this.type === EnemyType.PYRA)
      ? this.group.position : this.mesh.position;
  }
  get color()  { return CFG[this.type].color; }
  // Flag this enemy as a boss; maxHp is its post-multiplier HP (for enrage threshold).
  setBoss(maxHp) { this._isBoss = true; this._bossMaxHp = maxHp; }
  get radius() {
    if (this.type === EnemyType.BAMBU) return Math.max(0.6, (this._segs ? this._segs.length : 1) * 0.6);
    return CFG[this.type].radius * (this._radiusMult || 1);
  }
  get hpFrac() {
    if (this.type === EnemyType.BAMBU) return this.hp / Math.max(1, this._maxSegs);
    if (this.type === EnemyType.PYRA)  return this.hp / Math.max(1, this._holes ? this._holes.length : CFG[EnemyType.PYRA].hp);
    return this.hp / (CFG[this.type].hp * (this._hpMult || 1));
  }
  // Vertical anchor for FX/HUD at the body's mid-height. Blob dome origin sits
  // at the floor contact (Part 2), so their position.y is 0, not the center.
  get fxY() { return BLOB_TYPES.has(this.type) ? this.radius : this.position.y; }
  // Uniform base scale for the death pop/reset: blobs carry radius in
  // mesh.scale (shared unit dome); everything else bakes size into geometry.
  _deathBaseScale() {
    return BLOB_TYPES.has(this.type) ? CFG[this.type].radius * (this._radiusMult || 1) : 1;
  }

  // Cube locomotion: tip end-over-end about the leading bottom edge, advancing
  // one face-width per 90° flop. Cardinal-only; biased random walk between flops.
  _flopMove(dt, spd, halfX, halfZ, wantX = 0, wantZ = 0, exact = false) {
    const radius = CFG[this.type].radius;
    const stride = radius * 1.8;          // one face width = one flop's advance
    const restY  = radius;                // resting center height (matches spawn)
    const liftPeak = radius * 0.22;       // gentle hop apex mid-flop
    const restGap  = 0.06;                // settle beat between flops
    const cardinals = [{x:1,z:0},{x:-1,z:0},{x:0,z:1},{x:0,z:-1}];

    if (!this._flopActive) {
      this._flopRest -= dt;
      if (this._flopRest > 0) return;

      // Direction choice. exact=true: use the raw (wantX,wantZ) heading directly, giving
      // free diagonal tumbling (used by ORANGE_CUBE). Otherwise: snap to nearest cardinal.
      let dir;
      if (exact && (wantX !== 0 || wantZ !== 0)) {
        const len = Math.hypot(wantX, wantZ);
        dir = { x: wantX / len, z: wantZ / len };
      } else if (wantX !== 0 || wantZ !== 0) {
        const toward = Math.abs(wantX) > Math.abs(wantZ)
          ? { x: Math.sign(wantX), z: 0 }
          : { x: 0, z: Math.sign(wantZ) };
        const r = Math.random();
        dir = r < 0.70 ? toward : (r < 0.90 ? this._flopDir : cardinals[Math.floor(Math.random() * 4)]);
      } else {
        dir = (Math.random() < 0.7) ? this._flopDir : cardinals[Math.floor(Math.random() * 4)];
      }
      // Reflect away from any wall the next stride would cross. Bounds are the
      // real per-axis arena half-dimensions (minus the cube radius) so cubes turn
      // at the actual wall instead of a phantom square — portrait and landscape
      // arenas differ on each axis.
      const bx = halfX - radius, bz = halfZ - radius;
      const nx = this.mesh.position.x + dir.x * stride;
      const nz = this.mesh.position.z + dir.z * stride;
      if (Math.abs(nx) > bx) dir = { x: -(Math.sign(this.mesh.position.x) || 1), z: 0 };
      else if (Math.abs(nz) > bz) dir = { x: 0, z: -(Math.sign(this.mesh.position.z) || 1) };

      this._flopDir = dir;
      this._flopAxis.set(dir.z, 0, -dir.x).normalize(); // ground-horizontal, perp to travel
      this._flopX0 = this.mesh.position.x;
      this._flopZ0 = this.mesh.position.z;
      this._flopT  = 0;
      this._flopDur = Math.max(0.14, stride / Math.max(spd, 0.01) - restGap);
      this._flopActive = true;
    }

    this._flopT += dt;
    const p = Math.min(1, this._flopT / this._flopDur);
    const e = p * p * (3 - 2 * p); // smoothstep

    this.mesh.position.x = this._flopX0 + this._flopDir.x * stride * e;
    this.mesh.position.z = this._flopZ0 + this._flopDir.z * stride * e;
    this.mesh.position.y = restY + liftPeak * Math.sin(p * Math.PI);
    this.mesh.quaternion.setFromAxisAngle(this._flopAxis, e * Math.PI / 2);

    if (p >= 1) {
      // Land: snap home, reset rotation (cube is symmetric → seamless), slap squash.
      this.mesh.position.x = this._flopX0 + this._flopDir.x * stride;
      this.mesh.position.z = this._flopZ0 + this._flopDir.z * stride;
      this.mesh.position.y = restY;
      this.mesh.quaternion.identity();
      this._sqV -= 0.5;
      this._flopActive = false;
      this._flopRest = restGap;
    }
  }

  // ORANGE_CUBE repositioning target: a point on a ring ~6–9 around the player,
  // clamped to a ±10 box that fits inside BOTH arena orientations (portrait
  // 11×18, landscape 19×11) so the target is always reachable — otherwise the
  // cube flops into a wall, never closes to firing range, and looks frozen.
  _orangeTarget(playerPos) {
    const ang = Math.random() * Math.PI * 2;
    const rad = 6 + Math.random() * 3;
    return {
      x: Math.max(-10, Math.min(10, playerPos.x + Math.cos(ang) * rad)),
      z: Math.max(-10, Math.min(10, playerPos.z + Math.sin(ang) * rad)),
    };
  }

  _makeBambuSeg(segIndex) {
    const geo = new RoundedBoxGeometry(0.9, 0.9, 0.9, 4, 0.18);
    const segGroup = new THREE.Group();
    segGroup.position.y = segIndex * 1.0;
    const offsets = [{x:0.9,z:0},{x:-0.9,z:0},{x:0,z:0.9},{x:0,z:-0.9}];
    for (const off of offsets) {
      const box = new THREE.Mesh(geo, this._bambuMat);
      box.position.set(off.x, 0, off.z);
      box.castShadow = true;
      segGroup.add(box);
    }
    this.group.add(segGroup);
    return segGroup;
  }

  hit(impactX, impactZ) {
    if (!this.alive) return false;
    this._flashT    = 0.12;
    this._sqV      -= 0.75;

    // Trigger the goo surface ripple from the impact point (blobs only).
    this._hitRipple = 1;
    if (BLOB_TYPES.has(this.type) && this.mat.uniforms && this.mat.uniforms.uHitDir
        && impactX !== undefined) {
      const p = this.position;
      let dx = impactX - p.x, dz = impactZ - p.z;
      const d = Math.hypot(dx, dz);
      if (d > 0.001) {
        // The dome yaws to face its motion (Part 2 drag), so rotate the world
        // impact direction into object space or the ripple origin drifts.
        const yaw = this.mesh.rotation.y, c = Math.cos(yaw), s = Math.sin(yaw);
        const wx = dx / d, wz = dz / d;
        this.mat.uniforms.uHitDir.value.set(c * wx - s * wz, s * wx + c * wz);
      } else {
        this.mat.uniforms.uHitDir.value.set(0, 0);
      }
    }

    if (this.type === EnemyType.BAMBU && this._segs && this._segs.length > 0) {
      const topSeg = this._segs.pop();
      this.group.remove(topSeg);
      const segY = this._segs.length * 1.0 + 0.45;
      for (let k = 0; k < 3; k++) {
        const a = Math.random() * Math.PI * 2;
        this._hitChunks.push({
          x: this.group.position.x, y: segY, z: this.group.position.z,
          vx: Math.cos(a) * 3, vy: 2 + Math.random() * 3, vz: Math.sin(a) * 3,
          color: 0xaa8844, size: 0.14,
        });
      }
    }

    if (this.type === EnemyType.PYRA && this._holes) {
      // Find the closest live hole to the bullet impact (approximate: random alive hole)
      const alive = this._holes.filter(h => h.alive);
      if (alive.length > 0) {
        const hole = alive[Math.floor(Math.random() * alive.length)];
        hole.alive = false;
        hole.mesh.visible = false;
        this._spinSpeed += 0.6;
        // Chunk FX from hole position (world space approximation)
        const gp = this.group.position;
        for (let k = 0; k < 3; k++) {
          const ra = Math.random() * Math.PI * 2;
          this._hitChunks.push({
            x: gp.x + Math.cos(hole.angle) * CFG[EnemyType.PYRA].radius * 0.9,
            y: gp.y,
            z: gp.z + Math.sin(hole.angle) * CFG[EnemyType.PYRA].radius * 0.9,
            vx: Math.cos(ra) * 3, vy: 2 + Math.random() * 3, vz: Math.sin(ra) * 3,
            color: 0xffcc44, size: 0.12,
          });
        }
      }
    }

    this.hp--;
    if (this.hp <= 0) { this.destroy(); return true; }
    return false;
  }

  update(dt, playerPos, bullets, halfX = 19, halfZ = 18) {
    if (!this.alive) return;

    const cfg  = CFG[this.type];
    const pos  = this.position;
    const ex   = pos.x, ez = pos.z;
    const ddx  = playerPos.x - ex, ddz = playerPos.z - ez;
    const dist = Math.hypot(ddx, ddz) || 0.001;
    // Boss enrage (v59): below 35% HP a boss speeds up for a desperate final phase.
    if (this._isBoss && !this._enraged && this.hp <= this._bossMaxHp * 0.35) this._enraged = true;
    const spd  = cfg.speed * this._speedMult * (this._enraged ? 1.45 : 1);

    // ── Movement ──────────────────────────────────────────────────────────────
    switch (this.type) {
      case EnemyType.GLOBBO: {
        // Pouncer: stalks at base speed, crouches to telegraph, then leaps.
        this._pounceT -= dt;
        if (this._pounceState === 'stalk') {
          if (dist > 1.2) {
            // Lunging-slime speed pulse (Part 2 tell) — surges and settles as
            // it stalks, on top of the pounce state machine kept from v58.
            const B = TUNING.blob;
            const lunge = Math.pow(Math.max(0, Math.sin(this._wobbleT * B.globboLungeHz + this._phase)), 2)
                          * B.globboLungeGain + B.globboLungeFloor;
            this.mesh.position.x += (ddx / dist) * spd * lunge * dt;
            this.mesh.position.z += (ddz / dist) * spd * lunge * dt;
          }
          if (this._pounceT <= 0 && dist < 12) {
            this._pounceState = 'crouch';
            this._pounceT     = 0.32;
            this._sqV        -= 0.85;                      // crouch squash (tell)
            this._pounceDir   = { x: ddx / dist, z: ddz / dist };
          }
        } else if (this._pounceState === 'crouch') {
          if (this._pounceT <= 0) {
            this._pounceState = 'leap';
            this._pounceT     = 0.30;
            this._sqV        += 0.7;                       // stretch on launch
          }
        } else { // leap
          this.mesh.position.x += this._pounceDir.x * spd * 3.2 * dt;
          this.mesh.position.z += this._pounceDir.z * spd * 3.2 * dt;
          if (this._pounceT <= 0) {
            this._pounceState = 'stalk';
            this._pounceT     = 1.6 + Math.random() * 1.4;
          }
        }
        break;
      }

      case EnemyType.SPLITTA:
        if (dist > 1.2) {
          this.mesh.position.x += (ddx / dist) * spd * dt;
          this.mesh.position.z += (ddz / dist) * spd * dt;
        }
        break;

      case EnemyType.SPITTOR: {
        const want = 10;
        if (dist > want + 1) {
          this.mesh.position.x += (ddx / dist) * spd * dt;
          this.mesh.position.z += (ddz / dist) * spd * dt;
        } else if (dist < want - 1) {
          this.mesh.position.x -= (ddx / dist) * spd * dt;
          this.mesh.position.z -= (ddz / dist) * spd * dt;
        }
        break;
      }

      case EnemyType.FANNER: {
        const want  = 8;
        const perpX = -ddz / dist, perpZ = ddx / dist;
        this._strafeTimer -= dt;
        if (this._strafeTimer <= 0) {
          this._strafeDir   = -this._strafeDir;
          this._strafeTimer = 2.5 + Math.random();
        }
        const radial = dist > want + 1.5 ? 1 : dist < want - 1.5 ? -1 : 0;
        this.mesh.position.x += (ddx / dist * radial + perpX * this._strafeDir) * spd * dt;
        this.mesh.position.z += (ddz / dist * radial + perpZ * this._strafeDir) * spd * dt;
        break;
      }

      case EnemyType.WEEVA:
        // Drifting spiral turret: weaves while slowly closing on the player so
        // it actually applies pressure instead of meandering in place.
        this.mesh.position.x += (Math.sin(this._wobbleT * 0.7) * 0.5 + (ddx / dist) * 0.45) * spd * dt;
        this.mesh.position.z += (Math.cos(this._wobbleT * 0.5) * 0.5 + (ddz / dist) * 0.45) * spd * dt;
        // Spin the accent beacon continuously, echoing the spiral it fires.
        // Unit object space (dome origin at floor): orbit radius 0.85, mid-body height.
        this._blobMarkerAngle += 2.0 * dt;
        if (this._blobMarkers && this._blobMarkers[0]) {
          const bm = this._blobMarkers[0];
          bm.position.set(Math.cos(this._blobMarkerAngle) * 0.85, 1.0, Math.sin(this._blobMarkerAngle) * 0.85);
        }
        break;

      case EnemyType.YELA_CUBE:
      case EnemyType.REDD_CUBE:
      case EnemyType.PURP_CUBE:
      case EnemyType.SLUDGE_CUBE:
      case EnemyType.REDD_MINI:
      case EnemyType.PURP_MINI: {
        // Per-archetype desired heading fed to the flop locomotion.
        const ux = ddx / dist, uz = ddz / dist;       // unit toward player
        let wantX = ux, wantZ = uz;                    // default: direct (YELA, minis)
        if (this.type === EnemyType.REDD_CUBE) {
          // Flanker: approach from a side, straightening as it closes.
          const ang = (dist > 5) ? this._flankSign * 0.9 : this._flankSign * 0.3;
          const c = Math.cos(ang), s = Math.sin(ang);
          wantX = ux * c - uz * s; wantZ = ux * s + uz * c;
        } else if (this.type === EnemyType.PURP_CUBE) {
          // Circler: tangential, nudged in/out to hold a tight ~5 radius (visible orbit).
          const radial = (dist - 5) * 0.18;            // +ve = pull inward
          wantX = -uz * this._orbitSign + ux * radial;
          wantZ =  ux * this._orbitSign + uz * radial;
          // Rotating 2-arm spiral fire — opposite arms at a per-cube spin rate.
          // Pulse interval doubled vs. the single-arm version so firing 2
          // bullets per pulse doesn't double total bullets/sec.
          this._purpFireT -= dt;
          if (this._purpFireT <= 0) {
            this._purpFireT = 1.0 * this._intervalMult;
            bullets.spawnDir(ex, ez, Math.cos(this._spiralAngle), Math.sin(this._spiralAngle),
              false, cfg.bulletColor, false, this.type);
            bullets.spawnDir(ex, ez, Math.cos(this._spiralAngle + Math.PI), Math.sin(this._spiralAngle + Math.PI),
              false, cfg.bulletColor, false, this.type);
            this._spiralAngle += this._purpSpin;
          }
        } else if (this.type === EnemyType.SLUDGE_CUBE) {
          // Zoner: advance to mid-range, then hold and keep laying poison.
          if (dist <= 7) { wantX = 0; wantZ = 0; }
        }
        this._flopMove(dt, spd, halfX, halfZ, wantX, wantZ);
        // Per-type emissions (locomotion handled by _flopMove)
        if (this.type === EnemyType.YELA_CUBE) {
          this._trailTimer -= dt;
          if (this._trailTimer <= 0) { this._trailTimer = TUNING.fx.slimeTrailInterval; this._trailReady = true; }
        }
        if (this.type === EnemyType.SLUDGE_CUBE) {
          // Trail position ring buffer for ribbon
          this._trailPushTimer -= dt;
          if (this._trailPushTimer <= 0) {
            this._trailPushTimer = 0.15;
            this._trailPositions.push({ x: this.mesh.position.x, z: this.mesh.position.z });
            if (this._trailPositions.length > 12) this._trailPositions.shift();
          }
          // Poison emission cadence (TUNING.fx.poisonInterval)
          this._poisonTimer -= dt;
          if (this._poisonTimer <= 0) {
            this._poisonTimer = TUNING.fx.poisonInterval;
            this._poisonReady = true;
          }
        }
        break;
      }

      case EnemyType.ORANGE_CUBE: {
        // Always moving; bullet wall fires independently on a timer.
        if (!this._target) { this._target = this._orangeTarget(playerPos); this._moveT = 0; }
        this._moveT += dt;
        const tdx = this._target.x - ex, tdz = this._target.z - ez;
        const td = Math.hypot(tdx, tdz);
        if (!this._flopActive && (td < 2.6 || this._moveT > 5)) {
          this._target = this._orangeTarget(playerPos);
          this._moveT = 0;
        } else {
          this._flopMove(dt, spd, halfX, halfZ, tdx / (td || 1), tdz / (td || 1), true);
        }
        this._fireT -= dt;
        if (this._fireT <= 0) {
          const adx = playerPos.x - ex, adz = playerPos.z - ez;
          const al = Math.hypot(adx, adz) || 1;
          const dirs8 = [
            {x:1,z:0},{x:-1,z:0},{x:0,z:1},{x:0,z:-1},
            {x:0.707,z:0.707},{x:-0.707,z:0.707},{x:0.707,z:-0.707},{x:-0.707,z:-0.707},
          ];
          let best = 0, bestDot = -Infinity;
          for (let k = 0; k < dirs8.length; k++) {
            const dot = dirs8[k].x * adx / al + dirs8[k].z * adz / al;
            if (dot > bestDot) { bestDot = dot; best = k; }
          }
          const fd = dirs8[best];
          const perpX = -fd.z, perpZ = fd.x;
          for (let s = 0; s < this._totalShots; s++) {
            const t = (s / (this._totalShots - 1) - 0.5) * 4.0;
            bullets.spawnDir(ex + perpX * t, ez + perpZ * t, fd.x, fd.z, false, cfg.bulletColor, false, this.type);
          }
          this._fireT = 3.0 + Math.random() * 1.5;
          this._target = this._orangeTarget(playerPos);
          this._moveT = 0;
        }
        break;
      }

      case EnemyType.OMEGA: {
        // Boss-exclusive: holds a mid-range orbit around the player while
        // firing an aimed fan; once enraged (<35% HP, v59) it switches to a
        // full radial ring burst — a real pattern change, not just a speed-up.
        const want   = 7.5;
        const perpX  = -ddz / dist, perpZ = ddx / dist;
        const radial = dist > want + 1.5 ? 1 : dist < want - 1.5 ? -1 : 0;
        this.mesh.position.x += (ddx / dist * radial * 0.5 + perpX * this._orbitSign) * spd * dt;
        this.mesh.position.z += (ddz / dist * radial * 0.5 + perpZ * this._orbitSign) * spd * dt;
        // Independent crystal spin — visual flavour only, no gameplay effect.
        this.mesh.rotation.y += 0.6 * dt;
        this.mesh.rotation.x += 0.25 * dt;

        this._omegaFireT -= dt;
        if (this._omegaFireT <= 0) {
          if (this._enraged) {
            this._omegaFireT = 0.7 * this._intervalMult;
            this._ring(ex, ez, 12, cfg.bulletColor, bullets, this.type);
          } else {
            this._omegaFireT = 0.9 * this._intervalMult;
            const baseA = Math.atan2(playerPos.z - ez, playerPos.x - ex);
            const count = 5, span = Math.PI * 0.35;
            for (let j = 0; j < count; j++) {
              const a = baseA - span / 2 + j * (span / (count - 1));
              bullets.spawnDir(ex, ez, Math.cos(a), Math.sin(a), false, cfg.bulletColor, false, this.type);
            }
          }
        }
        break;
      }

      case EnemyType.PYRA:
        this.group.rotation.y += this._spinSpeed * dt;
        break;

      case EnemyType.BAMBU: {
        if (this._emergeT > 0) {
          this._emergeT -= dt;
          this.group.scale.y = Math.min(1, 1 - this._emergeT / 0.6);
        }
        if (this._emergeT <= 0) {
          this.group.scale.y = 1;
          this._growTimer -= dt;
          if (this._growTimer <= 0 && this._segs.length < this._maxSegs) {
            this._growTimer = 0.18;
            this._segs.push(this._makeBambuSeg(this._segs.length));
            this.hp++;
          }
        }
        break;
      }

      case EnemyType.TORO: {
        switch (this._state) {
          case 'idle': {
            // Enraged boss stalks faster between dashes (v62).
            const idleSpd = this._enraged ? 1.5 : 0.8;
            if (dist > 2) {
              this.group.position.x += (ddx/dist) * idleSpd * dt;
              this.group.position.z += (ddz/dist) * idleSpd * dt;
            }
            this._idleTimer -= dt;
            if (this._idleTimer <= 0) {
              this._state = 'revving';
              this._stateT = this._enraged ? TUNING.toro.revTime * 0.625 : TUNING.toro.revTime;  // winds up quicker when enraged
              const dl = Math.hypot(ddx, ddz) || 1;
              this._dashDir = { x: ddx/dl, z: ddz/dl };
              const snapRad = TUNING.toro.dirSnapDeg * Math.PI / 180;
              const ang = Math.round(Math.atan2(this._dashDir.z, this._dashDir.x) / snapRad) * snapRad;
              this._dashDir = { x: Math.cos(ang), z: Math.sin(ang) };
            }
            break;
          }
          case 'revving':
            this._stateT -= dt;
            this._spinAngle += (3 + (1.6 - Math.max(this._stateT, 0)) * 8) * dt;
            this.group.rotation.y = this._spinAngle;
            if (this._stateT <= 0) {
              this._state = 'telegraphing';
              this._stateT = TUNING.toro.telegraphTime;
              const midX = this.group.position.x + this._dashDir.x * 18;
              const midZ = this.group.position.z + this._dashDir.z * 18;
              this._indicator.position.set(midX, 0.03, midZ);
              const ang2 = Math.atan2(this._dashDir.x, this._dashDir.z);
              this._indicator.rotation.y = ang2;
              this._indicator.visible = true;
            }
            break;
          case 'telegraphing':
            this._stateT -= dt;
            this._indicator.material.opacity = (Math.sin(this._stateT * TUNING.toro.indicatorFlashHz) > 0) ? 0.7 : 0.15;
            if (this._stateT <= 0) {
              this._indicator.visible = false;
              this._state = 'dashing';
              this._dashSpeed = TUNING.toro.dashSpeed;
            }
            break;
          case 'dashing':
            this._dashSpeed = Math.max(this._dashSpeed - TUNING.toro.dashDecel * dt, TUNING.toro.dashMin);
            this.group.position.x += this._dashDir.x * this._dashSpeed * dt;
            this.group.position.z += this._dashDir.z * this._dashSpeed * dt;
            this._spinAngle += 12 * dt;
            this.group.rotation.y = this._spinAngle;
            if (Math.abs(this.group.position.x) > 17 || Math.abs(this.group.position.z) > 17) {
              this.group.position.x = Math.max(-17, Math.min(17, this.group.position.x));
              this.group.position.z = Math.max(-17, Math.min(17, this.group.position.z));
              this._state = 'recovering';
              this._stateT = TUNING.toro.recoverTime;
              this._sqV -= 0.5;
            }
            break;
          case 'recovering':
            this._stateT -= dt;
            if (this._stateT <= 0) {
              this._state = 'idle';
              // Enraged boss dashes about twice as often (v62).
              this._idleTimer = (1.0 + Math.random() * 1.5) * (this._enraged ? 0.45 : 1);
            }
            break;
        }
        break;
      }
    }

    // ── Flash / emissive ──────────────────────────────────────────────────────
    if (this._flashT > 0) {
      this._flashT -= dt;
      this._setEmissive(0xffffff);
    } else if (this.type === EnemyType.ORANGE_CUBE && this._fireT < 0.6) {
      this._setEmissive(Math.sin(performance.now() * 0.02) > 0 ? 0x442200 : 0x000000);
    } else if (this.type === EnemyType.TORO && this._state === 'revving') {
      const ramp = Math.max(0, 1.6 - Math.max(this._stateT, 0)) / 1.6;
      const v = Math.floor(ramp * 0x33);
      this._setEmissive((v << 8) | (v * 0.5));
    } else if (this.type === EnemyType.SPLITTA && this.hp <= 2) {
      // Nervous green pulse as it nears death — telegraphs the on-death bullet burst.
      this._setEmissive(Math.sin(performance.now() * 0.018) > 0 ? 0x224400 : 0x000000);
    } else if (this.type === EnemyType.OMEGA && this._omegaFireT < 0.25) {
      this._setEmissive(Math.sin(performance.now() * 0.03) > 0 ? 0x0088aa : 0x000000);
    } else if (this._isTelegraphing) {
      this._setEmissive(this.type === EnemyType.SPITTOR ? 0x442200 : 0x440022);
    } else {
      this._setEmissive(0x000000);
    }

    // ── Movement VFX: velocity → blob stretch + trail emission (v29) ──────────
    {
      const np = this.position;
      const invDt = 1 / Math.max(dt, 1e-4);
      this._velX += (((np.x - ex) * invDt) - this._velX) * 0.3;
      this._velZ += (((np.z - ez) * invDt) - this._velZ) * 0.3;
      const sp = Math.hypot(this._velX, this._velZ);

      // Part 2: directional smear moved from the uStretch shader path to the
      // grounded-drag mesh transform in the blob scale block below — the
      // uniform stays at 0. The hit-ripple shockwave (v32) is kept unchanged.
      if (BLOB_TYPES.has(this.type) && this.mat.uniforms) {
        if (this._hitRipple > 0) {
          this._hitRipple = Math.max(0, this._hitRipple - dt / 0.28);
          this.mat.uniforms.uHit.value = this._hitRipple;
        }
      }

      // Motion-trail (afterimage) emission — cadence/size per type (v36 threat read).
      if (this._trailInterval > 0) {
        this._motionTrailTimer -= dt;
        if (sp > 1.5 && this._motionTrailTimer <= 0) {
          this._motionTrailTimer = this._trailInterval;
          this._motionTrailReady = true;
        }
      }
    }

    // ── Spring squash / scale ─────────────────────────────────────────────────
    this._wobbleT += dt; // keep for WEEVA movement

    if (this.type !== EnemyType.BAMBU && this.type !== EnemyType.PYRA) {
      const spring = BLOB_TYPES.has(this.type) ? 0.24 : 0.18;
      const damp   = BLOB_TYPES.has(this.type) ? 0.86 : 0.90;
      this._sqV = (this._sqV - (this._sq - 1.0) * spring) * damp;
      this._sq  = Math.max(0.55, Math.min(1.55, this._sq + this._sqV));
      const sx = 1 / Math.sqrt(Math.max(this._sq, 0.1));
      // Bake in _radiusMult (elite/boss size boost) so it survives the squash
      // spring — without this, the spring resets scale toward 1.0 every frame
      // and silently erases the size boost applied at spawn time.
      const rm = this._radiusMult || 1;
      if (this.type === EnemyType.TORO) {
        this.group.scale.set(sx, this._sq, sx);
      } else if (this._flopActive) {
        this.mesh.scale.set(rm, rm, rm); // flop owns the transform; no squash mid-tumble
      } else if (BLOB_TYPES.has(this.type)) {
        // Grounded gel (Part 2): baseline silhouette × spring squash × body
        // breathe × drag smear × per-type tells, all anchored to the floor
        // contact (the dome's origin), so nothing ever floats.
        const B   = TUNING.blob;
        const r   = CFG[this.type].radius;
        const shp = this._shape;
        const amp = this.type === EnemyType.SPLITTA ? B.breatheAmpSplitta : B.breatheAmp;
        const breathe = amp * Math.sin(this._wobbleT * 2.4 + this._phase);
        const sy  = this._sq * (1 + breathe);
        const sxz = sx * (1 - breathe * 0.5);
        // Drag: smears along travel, nose lifts, rear drags the floor.
        const sp   = Math.hypot(this._velX, this._velZ);
        const drag = Math.min(sp * B.dragStretchPerSpeed, B.dragMax);
        if (sp > 0.4) this._moveYaw = Math.atan2(this._velX, this._velZ);
        // Tells: SPITTOR pre-fire inflate, WEEVA drill vibration, FANNER sway.
        let inflate = 0;
        if (this.type === EnemyType.SPITTOR && this._isTelegraphing) {
          inflate = B.spittorInflate * (1 - Math.max(0, this._telegraphT / this._telegraphMax));
        }
        const jit  = this.type === EnemyType.WEEVA
          ? Math.sin(this._wobbleT * B.weevaVibrateHz) * B.weevaVibrate : 0;
        const rock = this.type === EnemyType.FANNER
          ? Math.sin(this._wobbleT * B.fannerSwayHz) * B.fannerSway : 0;
        this.mesh.rotation.set(-drag * B.rearDragTilt, this._moveYaw, rock);
        this.mesh.scale.set(
          r * rm * shp.x * (sxz + jit) * (1 + inflate),
          r * rm * shp.y * (sy - drag * 0.25 - jit) * (1 + inflate),
          r * rm * shp.z * (sxz + drag) * (1 + inflate));
      } else {
        this.mesh.scale.set(sx * rm, this._sq * rm, sx * rm);
      }
    }

    // ── Fire ──────────────────────────────────────────────────────────────────
    this._t += dt;
    this._tick(playerPos, bullets, dt);
  }

  _tick(playerPos, bullets, dt) {
    const cfg = CFG[this.type];
    if (!cfg.fireInterval) return;

    if (this.type === EnemyType.PYRA) {
      this._pyraFireTimer -= dt;
      if (this._pyraFireTimer <= 0) {
        this._pyraFireTimer = cfg.fireInterval * this._intervalMult;
        const ex = this.position.x, ez = this.position.z;
        const liveHoles = this._holes ? this._holes.filter(h => h.alive) : [];
        for (const hole of liveHoles) {
          const ha = this.group.rotation.y + hole.angle;
          const forwardX = Math.cos(ha), forwardZ = Math.sin(ha);
          const spread = Math.PI / 6;
          for (let j = 0; j < 3; j++) {
            const fa = Math.atan2(forwardZ, forwardX) - spread / 2 + j * (spread / 2);
            bullets.spawnDir(ex, ez, Math.cos(fa), Math.sin(fa), false, cfg.bulletColor, false, this.type);
          }
        }
      }
      return;
    }

    if (this.type === EnemyType.BAMBU) {
      if (this._bambuState === 'waiting') {
        this._bambuFireTimer -= dt;
        if (this._bambuFireTimer <= 0) {
          this._bambuState   = 'telegraphing';
          this._bambuTimer   = 1.0;
          this._lobTargetX   = playerPos.x;
          this._lobTargetZ   = playerPos.z;
          this._aoeReady     = true;
        }
      } else if (this._bambuState === 'telegraphing') {
        this._bambuTimer -= dt;
        // Charge orb climbs from the base up past each segment to the top of the
        // stalk, then the lob fires the instant it reaches the tip.
        if (this._chargeOrb) {
          const prog = Math.max(0, Math.min(1, 1 - this._bambuTimer / 1.0));
          const topY = this._segs.length * 1.0;
          this._chargeOrb.visible = true;
          this._chargeOrb.position.y = prog * topY;
          this._chargeOrb.scale.setScalar(0.6 + prog * 0.9);
        }
        if (this._bambuTimer <= 0) {
          this._bambuState     = 'waiting';
          this._bambuFireTimer = cfg.fireInterval * this._intervalMult;
          this._lobReady = { x: this._lobTargetX, z: this._lobTargetZ };
          if (this._chargeOrb) this._chargeOrb.visible = false;
        }
      }
      return;
    }

    const interval = cfg.fireInterval * this._intervalMult;

    const ex = this.position.x, ez = this.position.z;

    switch (this.type) {
      case EnemyType.SPITTOR:
        if (!this._isTelegraphing && this._t >= interval) {
          this._t              = 0;
          // Part 2 tell: inflates up to +spittorInflate over spittorInflateTime
          // before firing (the scale is applied in the blob scale block, so it
          // composes with breathe/drag instead of stomping them).
          this._telegraphT     = TUNING.blob.spittorInflateTime;
          this._telegraphMax   = TUNING.blob.spittorInflateTime;
          this._isTelegraphing = true;
        }
        if (this._isTelegraphing) {
          this._telegraphT -= dt;
          if (this._telegraphT <= 0) {
            this._isTelegraphing = false;
            this._sqV -= 1.0; // squash on fire
            // Aim the ring so one bullet leads straight at the player — the
            // symmetric ring reads better as a real threat than a fixed grid.
            const baseA = Math.atan2(playerPos.z - ez, playerPos.x - ex);
            // Spit recoil (Part 2): kicks backward off the shot.
            this.mesh.position.x -= Math.cos(baseA) * TUNING.blob.spittorRecoil;
            this.mesh.position.z -= Math.sin(baseA) * TUNING.blob.spittorRecoil;
            this._ring(ex, ez, 8, cfg.bulletColor, bullets, this.type, baseA);
          }
        }
        break;

      case EnemyType.FANNER:
        if (!this._isTelegraphing && this._t >= interval) {
          this._t              = 0;
          this._telegraphT     = 0.4;
          this._telegraphMax   = 0.4;
          this._isTelegraphing = true;
        }
        if (this._isTelegraphing) {
          this._telegraphT -= dt;
          if (this._telegraphT <= 0) {
            this._isTelegraphing = false;
            this._sqV -= 0.8; // squash on fire
            const adx = playerPos.x - ex, adz = playerPos.z - ez;
            const len = Math.hypot(adx, adz);
            if (len > 0) {
              // Every 3rd volley fans wider with more shots — a heavier beat.
              this._fannerShot = (this._fannerShot + 1) % 3;
              const wide  = this._fannerShot === 0;
              const base  = Math.atan2(adz, adx);
              const count = wide ? 9 : 6;
              const span  = wide ? Math.PI * 0.95 : Math.PI * 0.6;
              for (let j = 0; j < count; j++) {
                const a = base - span / 2 + j * (span / (count - 1));
                bullets.spawnDir(ex, ez, Math.cos(a), Math.sin(a), false, cfg.bulletColor, false, this.type);
              }
            }
          }
        }
        break;

      case EnemyType.WEEVA: {
        const rotSpeed = (0.38 + this._spiralAccel) / this._intervalMult;
        if (this._t >= interval) {
          this._t = 0;
          bullets.spawnDir(ex, ez, Math.cos(this._spiralAngle), Math.sin(this._spiralAngle), false, cfg.bulletColor, false, this.type);
          this._spiralAngle += rotSpeed;
          this._spiralAccel  = Math.min(this._spiralAccel + 0.002, 0.4);
        }
        break;
      }
    }
  }

  _ring(x, z, count, color, bullets, originType = null, base = 0) {
    for (let i = 0; i < count; i++) {
      const a = base + (i / count) * Math.PI * 2;
      bullets.spawnDir(x, z, Math.cos(a), Math.sin(a), false, color, false, originType);
    }
  }

  updateDeath(dt) {
    if (!this._dying) return;
    this._deathT -= dt;
    const t = 1 - Math.max(this._deathT, 0) / 0.28;

    if (this.type === EnemyType.TORO || this.type === EnemyType.BAMBU || this.type === EnemyType.PYRA) {
      this.group.scale.setScalar(1 + t * 2.2);
    } else {
      // Blobs: the shared dome is unit-sized, so the death pop scales from the
      // real body size (radius × elite mult), not from 1.
      this.mesh.scale.setScalar(this._deathBaseScale() * (1 + t * 2.2));
    }
    const baseOpacity = (CUBE_TYPES.has(this.type) || this.type === EnemyType.BAMBU) ? 0.88 : 0.82;
    this._setOpacity((1 - t) * baseOpacity);

    // Pre-death tear (blobs): violent thrash strongest at death onset, fading as it bursts.
    if (BLOB_TYPES.has(this.type) && this.mat.uniforms && this.mat.uniforms.uTear) {
      this.mat.uniforms.uTear.value = Math.max(0, this._deathT / 0.28);
    }

    if (this._deathT <= 0) {
      this._dying = false;
      this.mesh.visible = false;
      // Signal children ready
      if (this.type === EnemyType.SPLITTA ||
          this.type === EnemyType.REDD_CUBE ||
          this.type === EnemyType.PURP_CUBE) {
        this._childrenReady = true;
      }
    }
  }

  destroy() {
    this.alive   = false;
    this._dying  = true;
    this._deathT = 0.28;
    this._sq     = 1.0;
    this._sqV    = 0.0;
    if (this._flopActive) { this.mesh.quaternion.identity(); this._flopActive = false; }
    this._setEmissive(0xffffff);
    this.mat.transparent = true;
    this.mat.depthWrite  = false;
    if (this.type === EnemyType.TORO || this.type === EnemyType.BAMBU || this.type === EnemyType.PYRA) {
      this.group.scale.setScalar(1);
    } else {
      this.mesh.scale.setScalar(this._deathBaseScale());
    }
    if (this.type !== EnemyType.BAMBU) this.mesh.visible = true;

    // Chunk spawn data
    let count, chunkSize;
    switch (this.type) {
      case EnemyType.TORO:
        count = 8; chunkSize = 0.25; break;
      case EnemyType.REDD_MINI:
      case EnemyType.PURP_MINI:
        count = 2 + Math.floor(Math.random() * 2); chunkSize = 0.12; break;
      default:
        count = 5 + Math.floor(Math.random() * 2); chunkSize = 0.18; break;
    }

    const pos = this.position;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const hspd  = 3 + Math.random() * 4;
      this.chunks.push({
        x:  pos.x,
        y:  this.fxY,
        z:  pos.z,
        vx: Math.cos(angle) * hspd,
        vy: 3 + Math.random() * 5,
        vz: Math.sin(angle) * hspd,
        size: chunkSize,
      });
    }

    // Set child spawn info for SPLITTA, REDD_CUBE, PURP_CUBE
    if (this.type === EnemyType.SPLITTA) {
      this._childType    = EnemyType.GLOBBO;
      this._childCount   = 2 + Math.floor(Math.random() * 2);
      this._childFreeform = false;
    } else if (this.type === EnemyType.REDD_CUBE) {
      this._childType    = EnemyType.REDD_MINI;
      const rTier        = Math.round((1 / Math.max(this._intervalMult, 0.1) - 1) / 0.09);
      this._childCount   = Math.min(8, 4 + rTier * 2);
      this._childFreeform = false;
    } else if (this.type === EnemyType.PURP_CUBE) {
      this._childType    = EnemyType.PURP_MINI;
      const pTier        = Math.floor((1 / Math.max(this._intervalMult, 0.1) - 1) / 0.09);
      this._childCount   = 5 + pTier * 2;
      this._childFreeform = true;
    }

    // Hide indicator for TORO
    if (this.type === EnemyType.TORO && this._indicator) {
      this._indicator.visible = false;
    }
    if (this._aimArrow) this._aimArrow.visible = false;
  }

  removeFrom(scene) {
    this.mesh.visible = false;
    if (this.type === EnemyType.TORO) {
      scene.remove(this.group);
      if (this._indicator) scene.remove(this._indicator);
    } else if (this.type === EnemyType.BAMBU || this.type === EnemyType.PYRA) {
      scene.remove(this.group);
    } else {
      scene.remove(this.mesh);
    }
    if (this._aimArrow) scene.remove(this._aimArrow);
  }
}
