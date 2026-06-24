import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

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
};

const CFG = {
  [EnemyType.GLOBBO]:      { color: 0x00ccaa, radius: 0.55, speed: 2.8, hp: 1, bulletColor: null,     fireInterval: null },
  [EnemyType.SPITTOR]:     { color: 0xff5533, radius: 0.9,  speed: 1.6, hp: 3, bulletColor: 0xff7755, fireInterval: 2.2  },
  [EnemyType.FANNER]:      { color: 0xff00aa, radius: 0.75, speed: 1.4, hp: 3, bulletColor: 0xff66cc, fireInterval: 1.5  },
  [EnemyType.WEEVA]:       { color: 0x4422ee, radius: 0.8,  speed: 0.6, hp: 3, bulletColor: 0x6644ff, fireInterval: 0.08 },
  [EnemyType.SPLITTA]:     { color: 0x88ff22, radius: 1.1,  speed: 1.0, hp: 5, bulletColor: 0xaaff44, fireInterval: null },
  [EnemyType.YELA_CUBE]:   { color: 0xffdd00, radius: 0.7,  speed: 2.2, hp: 2, bulletColor: null,     fireInterval: null },
  [EnemyType.ORANGE_CUBE]: { color: 0xff8800, radius: 0.75, speed: 1.4, hp: 4, bulletColor: 0xff6600, fireInterval: 3.2  },
  [EnemyType.SLUDGE_CUBE]: { color: 0xaaee00, radius: 0.65, speed: 0.75,hp: 2, bulletColor: null,     fireInterval: null },
  [EnemyType.REDD_CUBE]:   { color: 0xff2211, radius: 0.75, speed: 1.9, hp: 3, bulletColor: null,     fireInterval: null },
  [EnemyType.PURP_CUBE]:   { color: 0xcc44ff, radius: 0.75, speed: 1.6, hp: 3, bulletColor: null,     fireInterval: null },
  [EnemyType.REDD_MINI]:   { color: 0xff4433, radius: 0.32, speed: 3.2, hp: 1, bulletColor: null,     fireInterval: null },
  [EnemyType.PURP_MINI]:   { color: 0xdd66ff, radius: 0.26, speed: 3.8, hp: 1, bulletColor: null,     fireInterval: null },
  [EnemyType.TORO]:        { color: 0x4488cc, radius: 1.0,  speed: 5.0, hp: 6, bulletColor: null,     fireInterval: null },
  [EnemyType.BAMBU]:       { color: 0xaa8844, radius: 0.7,  speed: 0,   hp: 1, bulletColor: 0xddbb44, fireInterval: 4.0  },
  [EnemyType.PYRA]:        { color: 0xff9900, radius: 1.0,  speed: 0,   hp: 4, bulletColor: 0xffcc44, fireInterval: 2.5  },
};

const BLOB_TYPES = new Set([
  EnemyType.GLOBBO, EnemyType.SPITTOR, EnemyType.FANNER,
  EnemyType.WEEVA, EnemyType.SPLITTA,
]);

const CUBE_TYPES = new Set([
  EnemyType.YELA_CUBE, EnemyType.ORANGE_CUBE, EnemyType.SLUDGE_CUBE,
  EnemyType.REDD_CUBE, EnemyType.PURP_CUBE, EnemyType.REDD_MINI, EnemyType.PURP_MINI,
]);

export const ENEMY_RADIUS = 1.0; // updated conservative max

export class Enemy {
  constructor(scene, type, x, z, speedMult = 1, intervalMult = 1) {
    this.type          = type;
    this.alive         = true;
    const cfg          = CFG[type];
    this.hp            = cfg.hp;
    this._dying        = false;
    this._deathT       = 0;
    this._flashT       = 0;
    this._hitWobble    = 0;
    this._wobbleT      = Math.random() * Math.PI * 2;
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

    // State machine fields
    this._state        = 'idle';
    this._stateT       = 0;
    this._cardDir      = { x: 1, z: 0 };
    this._cardTimer    = 0;
    this._poisonReady  = false;
    this._poisonTimer  = 0;
    this._aimArrow     = null;
    this._totalShots   = 6;
    this._hitChunks    = [];
    this._aoeReady     = false;
    this._lobReady     = null;

    // Per-enemy wobble uniforms (used by vertex shader for blob types)
    this._wUni = { u_wt: { value: 0 }, u_hw: { value: 0 } };

    // Build geometry based on type family
    let geo;
    if (BLOB_TYPES.has(type)) {
      geo = new THREE.SphereGeometry(cfg.radius, 14, 10);
    } else if (CUBE_TYPES.has(type)) {
      geo = new RoundedBoxGeometry(cfg.radius * 1.8, cfg.radius * 1.8, cfg.radius * 1.8, 4, 0.18);
    } else if (type === EnemyType.TORO) {
      geo = new THREE.TorusGeometry(cfg.radius * 0.68, cfg.radius * 0.32, 8, 18);
    }

    const isCube = CUBE_TYPES.has(type);
    const isToro = type === EnemyType.TORO;
    const matOpacity = isCube ? 0.88 : 0.82;
    const matShininess = isToro ? 140 : 100;

    this.mat = new THREE.MeshPhongMaterial({
      color:       cfg.color,
      emissive:    0x000000,
      transparent: true,
      opacity:     matOpacity,
      shininess:   matShininess,
    });

    // Organic vertex-shader jiggle for blob types — collision shape stays fixed
    if (BLOB_TYPES.has(type)) {
      const wUni = this._wUni;
      this.mat.onBeforeCompile = shader => {
        shader.uniforms.u_wt = wUni.u_wt;
        shader.uniforms.u_hw = wUni.u_hw;
        shader.vertexShader = 'uniform float u_wt;\nuniform float u_hw;\n' + shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
          // breathing ripple
          float _b = sin(position.y * 3.8 + u_wt * 5.2) * 0.08
                   + cos(position.x * 3.2 + u_wt * 4.7) * 0.06
                   + cos(position.z * 3.5 + u_wt * 5.8) * 0.04;
          // hit burst — radial wave that decays with u_hw
          float _h = sin(length(position) * 9.0 - u_wt * 20.0) * u_hw * 0.28;
          transformed += normal * (_b + _h);`,
        );
      };
    }

    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.castShadow = true;

    if (type === EnemyType.TORO) {
      // Toro uses a group for position management
      this.mesh.rotation.x = Math.PI / 2;

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

      const tier = Math.floor(intervalMult > 0 ? (1 - intervalMult) / 0.09 : 0);
      this._maxSegs = tier < 2 ? 1 : tier < 4 ? 2 : 3;
      this._segs = [];
      this._segs.push(this._makeBambuSeg(0));
      this.hp = 1;

      // Emerge from floor
      this.group.scale.y = 0.01;
      this._emergeT = 0.6;

      // Lob fire state
      this._bambuFireTimer = cfg.fireInterval * intervalMult;
      this._bambuState = 'waiting';
      this._growTimer  = 8.0;
      this._lobTargetX = 0;
      this._lobTargetZ = 0;

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
      this.mesh.position.set(x, cfg.radius, z);
      scene.add(this.mesh);
    }

    // Cardinal mover initial direction
    if (type === EnemyType.YELA_CUBE || type === EnemyType.REDD_CUBE) {
      const dirs = [{x:1,z:0},{x:-1,z:0},{x:0,z:1},{x:0,z:-1}];
      this._cardDir = dirs[Math.floor(Math.random() * 4)];
      this._cardTimer = 1.8 + Math.random() * 2.0;
      if (type === EnemyType.YELA_CUBE) this._trailTimer = 0.3;
    } else if (type === EnemyType.REDD_MINI) {
      const dirs = [{x:1,z:0},{x:-1,z:0},{x:0,z:1},{x:0,z:-1}];
      this._cardDir = dirs[Math.floor(Math.random() * 4)];
      this._cardTimer = 0.4 + Math.random() * 0.8;
    } else if (type === EnemyType.SLUDGE_CUBE) {
      const dirs = [{x:1,z:0},{x:-1,z:0},{x:0,z:1},{x:0,z:-1},{x:0.7,z:0.7},{x:-0.7,z:0.7}];
      const d = dirs[Math.floor(Math.random() * dirs.length)];
      const len = Math.hypot(d.x, d.z);
      this._cardDir = { x: d.x/len, z: d.z/len };
      this._cardTimer = 3.0 + Math.random() * 2.0;
      this._poisonTimer = 0.5;
      this._trailPositions = [];
      this._trailPushTimer = 0;
    } else if (type === EnemyType.PURP_MINI) {
      const angle = Math.random() * Math.PI * 2;
      this._cardDir = { x: Math.cos(angle), z: Math.sin(angle) };
    } else if (type === EnemyType.ORANGE_CUBE) {
      this._target = { x: (Math.random()-0.5)*24, z: (Math.random()-0.5)*24 };
      this._target.x = Math.max(-16, Math.min(16, this._target.x));
      this._target.z = Math.max(-16, Math.min(16, this._target.z));
      this._shotsFired = 0;
      this._fireDir = { x: 1, z: 0 };
      this._state = 'moving';
      const tier = Math.floor(intervalMult > 0 ? (1 - intervalMult) / 0.09 : 0);
      this._totalShots = Math.min(12, 6 + tier * 2);
      const arrowGeo = new THREE.PlaneGeometry(0.3, 3);
      this._aimArrow = new THREE.Mesh(arrowGeo, new THREE.MeshBasicMaterial({
        color: 0xff8800, transparent: true, opacity: 0.7, depthWrite: false,
      }));
      this._aimArrow.rotation.x = -Math.PI / 2;
      this._aimArrow.visible = false;
      scene.add(this._aimArrow);
    }
  }

  get position() {
    return (this.type === EnemyType.TORO || this.type === EnemyType.BAMBU || this.type === EnemyType.PYRA)
      ? this.group.position : this.mesh.position;
  }
  get color()  { return CFG[this.type].color; }
  get radius() {
    if (this.type === EnemyType.BAMBU) return Math.max(0.6, (this._segs ? this._segs.length : 1) * 0.6);
    return CFG[this.type].radius;
  }
  get hpFrac() {
    if (this.type === EnemyType.BAMBU) return this.hp / Math.max(1, this._maxSegs);
    if (this.type === EnemyType.PYRA)  return this.hp / Math.max(1, this._holes ? this._holes.length : CFG[EnemyType.PYRA].hp);
    return this.hp / CFG[this.type].hp;
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

  hit() {
    if (!this.alive) return false;
    this._flashT    = 0.12;
    this._hitWobble = 0.35;

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

  update(dt, playerPos, bullets) {
    if (!this.alive) return;

    const cfg  = CFG[this.type];
    const pos  = this.position;
    const ex   = pos.x, ez = pos.z;
    const ddx  = playerPos.x - ex, ddz = playerPos.z - ez;
    const dist = Math.hypot(ddx, ddz) || 0.001;
    const spd  = cfg.speed * this._speedMult;
    const H    = 17.5;

    // ── Movement ──────────────────────────────────────────────────────────────
    switch (this.type) {
      case EnemyType.GLOBBO:
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
        this.mesh.position.x += Math.sin(this._wobbleT * 0.7) * spd * 0.5 * dt;
        this.mesh.position.z += Math.cos(this._wobbleT * 0.5) * spd * 0.5 * dt;
        break;

      case EnemyType.YELA_CUBE:
      case EnemyType.REDD_CUBE: {
        this._cardTimer -= dt;
        if (this._cardTimer <= 0) {
          const cardinals = [{x:1,z:0},{x:-1,z:0},{x:0,z:1},{x:0,z:-1}];
          const diagonals = [{x:0.707,z:0.707},{x:-0.707,z:0.707},{x:0.707,z:-0.707},{x:-0.707,z:-0.707}];
          const dirs = (this.type === EnemyType.YELA_CUBE && Math.random() < 0.5) ? diagonals : cardinals;
          this._cardDir = dirs[Math.floor(Math.random() * dirs.length)];
          this._cardTimer = 1.8 + Math.random() * 2.0;
        }
        this.mesh.position.x += this._cardDir.x * spd * dt;
        this.mesh.position.z += this._cardDir.z * spd * dt;
        if (Math.abs(this.mesh.position.x) > H) {
          this._cardDir.x = -Math.sign(this.mesh.position.x);
          this.mesh.position.x = Math.sign(this.mesh.position.x) * H;
          this._cardTimer = 0.5 + Math.random();
        }
        if (Math.abs(this.mesh.position.z) > H) {
          this._cardDir.z = -Math.sign(this.mesh.position.z);
          this.mesh.position.z = Math.sign(this.mesh.position.z) * H;
          this._cardTimer = 0.5 + Math.random();
        }
        if (this.type === EnemyType.YELA_CUBE) {
          this._trailTimer -= dt;
          if (this._trailTimer <= 0) { this._trailTimer = 0.3; this._trailReady = true; }
        }
        break;
      }

      case EnemyType.REDD_MINI: {
        this._cardTimer -= dt;
        if (this._cardTimer <= 0) {
          const dirs = [{x:1,z:0},{x:-1,z:0},{x:0,z:1},{x:0,z:-1}];
          this._cardDir = dirs[Math.floor(Math.random() * 4)];
          this._cardTimer = 0.4 + Math.random() * 0.8;
        }
        this.mesh.position.x += this._cardDir.x * spd * dt;
        this.mesh.position.z += this._cardDir.z * spd * dt;
        if (Math.abs(this.mesh.position.x) > H) {
          this._cardDir.x = -Math.sign(this.mesh.position.x);
          this.mesh.position.x = Math.sign(this.mesh.position.x) * H;
          this._cardTimer = 0.2 + Math.random() * 0.4;
        }
        if (Math.abs(this.mesh.position.z) > H) {
          this._cardDir.z = -Math.sign(this.mesh.position.z);
          this.mesh.position.z = Math.sign(this.mesh.position.z) * H;
          this._cardTimer = 0.2 + Math.random() * 0.4;
        }
        break;
      }

      case EnemyType.SLUDGE_CUBE: {
        this._cardTimer -= dt;
        if (this._cardTimer <= 0) {
          const dirs = [{x:1,z:0},{x:-1,z:0},{x:0,z:1},{x:0,z:-1},{x:0.7,z:0.7},{x:-0.7,z:0.7}];
          const d = dirs[Math.floor(Math.random() * dirs.length)];
          const len = Math.hypot(d.x, d.z);
          this._cardDir = { x: d.x/len, z: d.z/len };
          this._cardTimer = 3.0 + Math.random() * 2.0;
        }
        this.mesh.position.x += this._cardDir.x * spd * dt;
        this.mesh.position.z += this._cardDir.z * spd * dt;
        if (Math.abs(this.mesh.position.x) > H) {
          this._cardDir.x = -Math.sign(this.mesh.position.x);
          this.mesh.position.x = Math.sign(this.mesh.position.x) * H;
          this._cardTimer = 1.0 + Math.random();
        }
        if (Math.abs(this.mesh.position.z) > H) {
          this._cardDir.z = -Math.sign(this.mesh.position.z);
          this.mesh.position.z = Math.sign(this.mesh.position.z) * H;
          this._cardTimer = 1.0 + Math.random();
        }
        // Trail position ring buffer for ribbon
        this._trailPushTimer -= dt;
        if (this._trailPushTimer <= 0) {
          this._trailPushTimer = 0.15;
          this._trailPositions.push({ x: this.mesh.position.x, z: this.mesh.position.z });
          if (this._trailPositions.length > 12) this._trailPositions.shift();
        }
        // Poison emission every 0.5s
        this._poisonTimer -= dt;
        if (this._poisonTimer <= 0) {
          this._poisonTimer = 0.5;
          this._poisonReady = true;
        }
        break;
      }

      case EnemyType.PURP_MINI: {
        this.mesh.position.x += this._cardDir.x * spd * dt;
        this.mesh.position.z += this._cardDir.z * spd * dt;
        if (Math.abs(this.mesh.position.x) > H) {
          this._cardDir.x *= -1;
          this.mesh.position.x = Math.sign(this.mesh.position.x) * H;
        }
        if (Math.abs(this.mesh.position.z) > H) {
          this._cardDir.z *= -1;
          this.mesh.position.z = Math.sign(this.mesh.position.z) * H;
        }
        break;
      }

      case EnemyType.ORANGE_CUBE: {
        switch (this._state) {
          case 'moving': {
            const tdx = this._target.x - ex, tdz = this._target.z - ez;
            const td = Math.hypot(tdx, tdz);
            if (td < 1.0) {
              this._state = 'aiming';
              this._stateT = 0.9;
              const dirs8 = [
                {x:1,z:0},{x:-1,z:0},{x:0,z:1},{x:0,z:-1},
                {x:0.707,z:0.707},{x:-0.707,z:0.707},{x:0.707,z:-0.707},{x:-0.707,z:-0.707},
              ];
              this._fireDir = dirs8[Math.floor(Math.random() * dirs8.length)];
              if (this._aimArrow) {
                this._aimArrow.position.set(ex + this._fireDir.x * 2.5, 0.02, ez + this._fireDir.z * 2.5);
                this._aimArrow.rotation.y = Math.atan2(this._fireDir.x, this._fireDir.z);
                this._aimArrow.visible = true;
              }
            } else {
              this.mesh.position.x += (tdx/td) * spd * dt;
              this.mesh.position.z += (tdz/td) * spd * dt;
            }
            break;
          }
          case 'aiming':
            this._stateT -= dt;
            if (this._stateT <= 0) {
              this._state = 'shooting';
              this._shotsFired = 0;
              this._stateT = 0;
              if (this._aimArrow) this._aimArrow.visible = false;
            }
            break;
          case 'shooting':
            this._stateT -= dt;
            if (this._stateT <= 0 && this._shotsFired < this._totalShots) {
              const perpX = -this._fireDir.z, perpZ = this._fireDir.x;
              const t = (this._shotsFired / (this._totalShots - 1) - 0.5) * 4.0;
              bullets.spawnDir(
                ex + perpX * t, ez + perpZ * t,
                this._fireDir.x, this._fireDir.z,
                false, cfg.bulletColor, true
              );
              this._shotsFired++;
              this._stateT = 0.75;
              if (this._shotsFired >= this._totalShots) {
                this._state = 'cooldown';
                this._stateT = 1.2;
              }
            }
            break;
          case 'cooldown':
            this._stateT -= dt;
            if (this._stateT <= 0) {
              this._state = 'moving';
              this._target = { x: (Math.random()-0.5)*26, z: (Math.random()-0.5)*26 };
              this._target.x = Math.max(-16, Math.min(16, this._target.x));
              this._target.z = Math.max(-16, Math.min(16, this._target.z));
            }
            break;
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
            this._growTimer = 8.0;
            this._segs.push(this._makeBambuSeg(this._segs.length));
            this.hp++;
          }
        }
        break;
      }

      case EnemyType.TORO: {
        switch (this._state) {
          case 'idle':
            if (dist > 2) {
              this.group.position.x += (ddx/dist) * 0.8 * dt;
              this.group.position.z += (ddz/dist) * 0.8 * dt;
            }
            this._idleTimer -= dt;
            if (this._idleTimer <= 0) {
              this._state = 'revving';
              this._stateT = 1.6;
              const dl = Math.hypot(ddx, ddz) || 1;
              this._dashDir = { x: ddx/dl, z: ddz/dl };
              const ang = Math.round(Math.atan2(this._dashDir.z, this._dashDir.x) / (Math.PI/4)) * (Math.PI/4);
              this._dashDir = { x: Math.cos(ang), z: Math.sin(ang) };
            }
            break;
          case 'revving':
            this._stateT -= dt;
            this._spinAngle += (3 + (1.6 - Math.max(this._stateT, 0)) * 8) * dt;
            this.group.rotation.y = this._spinAngle;
            if (this._stateT <= 0) {
              this._state = 'telegraphing';
              this._stateT = 0.5;
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
            this._indicator.material.opacity = (Math.sin(this._stateT * 25) > 0) ? 0.7 : 0.15;
            if (this._stateT <= 0) {
              this._indicator.visible = false;
              this._state = 'dashing';
              this._dashSpeed = 22;
            }
            break;
          case 'dashing':
            this._dashSpeed = Math.max(this._dashSpeed - 8 * dt, 14);
            this.group.position.x += this._dashDir.x * this._dashSpeed * dt;
            this.group.position.z += this._dashDir.z * this._dashSpeed * dt;
            this._spinAngle += 12 * dt;
            this.group.rotation.y = this._spinAngle;
            if (Math.abs(this.group.position.x) > 17 || Math.abs(this.group.position.z) > 17) {
              this.group.position.x = Math.max(-17, Math.min(17, this.group.position.x));
              this.group.position.z = Math.max(-17, Math.min(17, this.group.position.z));
              this._state = 'recovering';
              this._stateT = 0.8;
              this._hitWobble = 0.5;
            }
            break;
          case 'recovering':
            this._stateT -= dt;
            if (this._stateT <= 0) {
              this._state = 'idle';
              this._idleTimer = 1.0 + Math.random() * 1.5;
            }
            break;
        }
        break;
      }
    }

    // ── Flash / emissive ──────────────────────────────────────────────────────
    if (this._flashT > 0) {
      this._flashT -= dt;
      this.mat.emissive.setHex(0xffffff);
    } else if (this.type === EnemyType.ORANGE_CUBE && this._state === 'aiming') {
      this.mat.emissive.setHex(Math.sin(performance.now() * 0.015) > 0 ? 0x442200 : 0x000000);
    } else if (this.type === EnemyType.TORO && this._state === 'revving') {
      const ramp = Math.max(0, 1.6 - Math.max(this._stateT, 0)) / 1.6;
      const v = Math.floor(ramp * 0x33);
      this.mat.emissive.setHex((v << 8) | (v * 0.5));
    } else if (this._isTelegraphing) {
      this.mat.emissive.setHex(this.type === EnemyType.SPITTOR ? 0x442200 : 0x440022);
    } else {
      this.mat.emissive.setHex(0x000000);
    }

    // ── Wobble / scale ────────────────────────────────────────────────────────
    this._wobbleT += dt;
    if (this._hitWobble > 0) this._hitWobble = Math.max(0, this._hitWobble - dt * 2.0);

    if (this.type !== EnemyType.TORO && this.type !== EnemyType.BAMBU && this.type !== EnemyType.PYRA) {
      const isSplitOrBig = this.type === EnemyType.SPLITTA;
      const amp  = isSplitOrBig ? 0.10 : (CUBE_TYPES.has(this.type) ? 0.035 : 0.04);
      const freq = isSplitOrBig ? 4.0  : (CUBE_TYPES.has(this.type) ? 2.2   : 2.8);
      const breathe = amp * Math.sin(this._wobbleT * freq);

      if (BLOB_TYPES.has(this.type)) {
        // Blobs: vertex shader handles hit burst; CPU side does only global squash/stretch
        if (!this._isTelegraphing || this.type !== EnemyType.SPITTOR) {
          const sy  = Math.max(0.1, 1 + breathe);
          const sxz = Math.max(0.1, 1 - breathe * 0.5);
          this.mesh.scale.set(sxz, sy, sxz);
        }
        this._wUni.u_wt.value = this._wobbleT;
        this._wUni.u_hw.value = this._hitWobble;
      } else {
        // Cubes: scale-based squash + hit wobble
        if (!this._isTelegraphing || this.type !== EnemyType.SPITTOR) {
          const sy  = Math.max(0.1, 1 + breathe - this._hitWobble);
          const sxz = Math.max(0.1, 1 - breathe * 0.5 + this._hitWobble * 0.5);
          this.mesh.scale.set(sxz, sy, sxz);
        }
      }
    } else {
      // TORO: hit squash only
      if (this._hitWobble > 0) {
        this.mesh.scale.setScalar(Math.max(0.1, 1 + this._hitWobble * 0.3));
      } else {
        this.mesh.scale.setScalar(1);
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
        const adx = playerPos.x - ex, adz = playerPos.z - ez;
        const al  = Math.hypot(adx, adz) || 1;
        const liveHoles = this._holes ? this._holes.filter(h => h.alive) : [];
        for (const hole of liveHoles) {
          const ha = this.group.rotation.y + hole.angle;
          const forwardX = Math.cos(ha), forwardZ = Math.sin(ha);
          const spread = Math.PI / 6;
          for (let j = 0; j < 3; j++) {
            const fa = Math.atan2(forwardZ, forwardX) - spread / 2 + j * (spread / 2);
            bullets.spawnDir(ex, ez, Math.cos(fa), Math.sin(fa), false, cfg.bulletColor);
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
        if (this._bambuTimer <= 0) {
          this._bambuState     = 'waiting';
          this._bambuFireTimer = cfg.fireInterval * this._intervalMult;
          this._lobReady = { x: this._lobTargetX, z: this._lobTargetZ };
        }
      }
      return;
    }

    const interval = this.type === EnemyType.WEEVA
      ? cfg.fireInterval
      : cfg.fireInterval * this._intervalMult;

    const ex = this.position.x, ez = this.position.z;

    switch (this.type) {
      case EnemyType.SPITTOR:
        if (!this._isTelegraphing && this._t >= interval) {
          this._t              = 0;
          this._telegraphT     = 0.6;
          this._telegraphMax   = 0.6;
          this._isTelegraphing = true;
        }
        if (this._isTelegraphing) {
          this._telegraphT -= dt;
          const frac = Math.max(0, this._telegraphT / this._telegraphMax);
          this.mesh.scale.setScalar(1 + 0.35 * (1 - frac));
          if (this._telegraphT <= 0) {
            this._isTelegraphing = false;
            this._ring(ex, ez, 8, cfg.bulletColor, bullets);
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
            const adx = playerPos.x - ex, adz = playerPos.z - ez;
            const len = Math.hypot(adx, adz);
            if (len > 0) {
              const base  = Math.atan2(adz, adx);
              const count = 6;
              const span  = Math.PI * 0.6;
              for (let j = 0; j < count; j++) {
                const a = base - span / 2 + j * (span / (count - 1));
                bullets.spawnDir(ex, ez, Math.cos(a), Math.sin(a), false, cfg.bulletColor);
              }
            }
          }
        }
        break;

      case EnemyType.WEEVA: {
        const rotSpeed = (0.38 + this._spiralAccel) / this._intervalMult;
        if (this._t >= cfg.fireInterval) {
          this._t = 0;
          bullets.spawnDir(ex, ez, Math.cos(this._spiralAngle), Math.sin(this._spiralAngle), false, cfg.bulletColor);
          this._spiralAngle += rotSpeed;
          this._spiralAccel  = Math.min(this._spiralAccel + 0.002, 0.4);
        }
        break;
      }
    }
  }

  _ring(x, z, count, color, bullets) {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      bullets.spawnDir(x, z, Math.cos(a), Math.sin(a), false, color);
    }
  }

  updateDeath(dt) {
    if (!this._dying) return;
    this._deathT -= dt;
    const t = 1 - Math.max(this._deathT, 0) / 0.28;

    if (this.type === EnemyType.TORO || this.type === EnemyType.BAMBU || this.type === EnemyType.PYRA) {
      this.group.scale.setScalar(1 + t * 2.2);
    } else {
      this.mesh.scale.setScalar(1 + t * 2.2);
    }
    const baseOpacity = (CUBE_TYPES.has(this.type) || this.type === EnemyType.BAMBU) ? 0.88 : 0.82;
    this.mat.opacity = (1 - t) * baseOpacity;

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
    this.mat.emissive.setHex(0xffffff);
    this.mat.transparent = true;
    this.mat.depthWrite  = false;
    if (this.type === EnemyType.TORO || this.type === EnemyType.BAMBU || this.type === EnemyType.PYRA) {
      this.group.scale.setScalar(1);
    } else {
      this.mesh.scale.setScalar(1);
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
        y:  pos.y,
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
