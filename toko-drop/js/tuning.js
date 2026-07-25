// js/tuning.js — single source of truth for Toko Drop enemy look & feel.
// Edited live by the pause-menu ENEMIES tab. enemy.js/main.js read from here;
// no visual or behavior constant covered below should remain hardcoded elsewhere.

export const TUNING = {
  material: {
    // active values (start = "satin"); per-family overrides in `families`
    sss: 0.70, roughness: 0.16, clearcoat: 1.00, clearcoatRoughness: 0.06,
    sheen: 0.45, transmission: 0.15, thickness: 0.8, ior: 1.38,
    presets: {
      satin : { sss:0.70, roughness:0.16, clearcoat:1.00, sheen:0.45, transmission:0.15 },
      jelly : { sss:0.50, roughness:0.09, clearcoat:0.95, sheen:0.25, transmission:0.45 },
      glassy: { sss:0.10, roughness:0.02, clearcoat:0.90, sheen:0.00, transmission:0.78 },
      candy : { sss:0.30, roughness:0.05, clearcoat:1.00, sheen:0.15, transmission:0.35 },
      clay  : { sss:0.15, roughness:0.38, clearcoat:0.15, sheen:0.60, transmission:0.00 },
      neon  : { sss:1.35, roughness:0.12, clearcoat:0.80, sheen:0.30, transmission:0.20 },
    },
    families: {
      blob: {},                                        // uses active values as-is
      cube: { roughness: 0.10, transmission: 0.25 },   // firmer candy-glass
      toro: { roughness: 0.10, transmission: 0.25 },   // hard rolling wheel
      bambu: { roughness: 0.20, transmission: 0.10 },  // matte woody stalk
      pyra: { roughness: 0.10, transmission: 0.25 },
      omega: { roughness: 0.04, transmission: 0.40 },  // boss keeps a hard crystal read
    },
  },

  blob: {
    // geometry: gel dome = smax(length(p)-1, -p.y-domeCut, domeRound), origin at floor contact
    domeCut: 0.7, domeRound: 0.22,
    shape:  { x:1.05, y:0.82, z:1.05 },                // squat grounded baseline
    shapes: {
      SPITTOR: { x:1.02, y:0.78, z:1.26 },             // snouty
      FANNER : { x:1.30, y:0.66, z:1.08 },             // wide flat pancake
      WEEVA  : { x:0.98, y:1.02, z:0.98 },             // taller drill dome
    },
    // grounded drag smear
    dragStretchPerSpeed: 0.10, dragMax: 0.35, rearDragTilt: 0.35,
    // per-blob tells
    spittorInflate: 0.22, spittorInflateTime: 0.45, spittorRecoil: 0.18,
    weevaVibrate: 0.03, weevaVibrateHz: 40,
    fannerSway: 0.10, fannerSwayHz: 7,
    globboLungeHz: 3.0, globboLungeGain: 2.6, globboLungeFloor: 0.4,
    splittaChildBulges: { offset: [0.6, 0.42, 0.15], scale: 0.42 },
    breatheAmp: 0.13, breatheAmpSplitta: 0.18,
  },

  flop: {
    // edge-pivot flop (math in goo-flop.html): arc 135°→45°, tip 90° about up×dir
    arcStartDeg: 135, arcEndDeg: 45,
    landSquish: 0.32, landFlat: true,                  // reset orientation on landing
    flopTimeMax: 0.30, flopShareOfCycle: 0.65,         // cycle = 2L / type speed
    breatheAmp: 0.10,
  },

  toro: {
    revTime: 1.6, telegraphTime: 0.5,
    dashSpeed: 22, dashMin: 14, dashDecel: 8,
    dirSnapDeg: 45,
    indicatorWidth: 0.34, indicatorFlashHz: 25,
    arrow: { radius: 0.5, length: 0.9 },               // tip sits exactly at impact point
    rimSpikes: 5,
    recoverTime: 0.8,
  },

  bambu: {
    segments: 3, segHeight: 0.6,
    flareBottom: 0.20, flareBottomStep: 0.02,
    flareTop: 0.36, flareTopStep: 0.03,
    lipScale: 1.14, lipHeight: 0.06,
    lobTelegraph: 0.7, lobFlight: 1.0, lobCooldown: 4.0, lobArcHeight: 2.4,
    lobBlobRadius: 0.34, lobSpread: 1.2,
    landingRing: { inner: 0.55, outer: 0.95, telegraphFlashHz: 22, flightFlashHz: 40 },
  },

  // v210 MOVEMENT PROFILES (field feedback: "the movement of enemies is now
  // unnatural, they should have unique patterns but not all just dodge").
  //
  // FLUID (the default since v198) bolted the SAME four forces onto every
  // non-boss body — dodge, flock, wave current, shepherd pull — so a charging
  // TORO, a stationary TURRET, a lobbing BAMBU and a FLIT all moved like the
  // same fish and each type's own behaviour got averaged away. Every type now
  // declares how much of the shared movement it takes; 0 means "this body
  // does its own thing", which is what makes the roster read as 40 species
  // again instead of one school.
  //
  //   dodge   — reads an incoming bullet lane and sidesteps it
  //   flock   — boids cohesion/alignment, and ONLY with other flockers
  //   current — how hard the wave archetype (stream/ring/pincer) pushes it
  //   weave   — its own serpentine approach: personality without a school
  movement: {
    roles: {
      SCHOOL : { dodge: 0.9, flock: 1.0,  current: 1.0,  weave: 0    },  // the fish
      DARTER : { dodge: 1.0, flock: 0.5,  current: 0.9,  weave: 0.5  },  // quick, reads your gun
      DRIFTER: { dodge: 0.3, flock: 0.6,  current: 1.0,  weave: 0.25 },  // ordinary bodies
      HUNTER : { dodge: 0.4, flock: 0,    current: 0.5,  weave: 0.8  },  // solo stalkers: weave, never school
      HOLDER : { dodge: 0,   flock: 0,    current: 0.25, weave: 0    },  // ranged — holds its ground
      COMMIT : { dodge: 0,   flock: 0,    current: 0.15, weave: 0    },  // chargers are committed to the line
      MASS   : { dodge: 0,   flock: 0,    current: 0.10, weave: 0    },  // heavies plough through
      FIXED  : { dodge: 0,   flock: 0,    current: 0,    weave: 0    },  // does not move under its own power
      SUPPORT: { dodge: 0.5, flock: 0.3,  current: 0.6,  weave: 0.3  },  // has a job to do
      HERDER : { dodge: 0.6, flock: 0,    current: 0.3,  weave: 0.2  },  // SHEPHERD holds a pocket, never schools
    },
    // EnemyType name -> role. Anything unlisted falls back to DRIFTER.
    byType: {
      GLOBBO: 'DRIFTER', SPITTOR: 'HOLDER',  FANNER: 'HOLDER',   WEEVA: 'HOLDER',
      SPLITTA: 'SCHOOL',
      YELA_CUBE: 'DRIFTER', ORANGE_CUBE: 'DRIFTER', SLUDGE_CUBE: 'MASS',
      REDD_CUBE: 'DRIFTER', PURP_CUBE: 'DRIFTER',
      REDD_MINI: 'SCHOOL',  PURP_MINI: 'SCHOOL',
      TORO: 'COMMIT', BAMBU: 'HOLDER', PYRA: 'HUNTER', OMEGA: 'MASS',
      BOTFLY: 'HOLDER', WARDEN: 'SUPPORT', BULWARK: 'MASS', SIREN: 'SUPPORT',
      CLOAKER: 'HUNTER', MAGNA: 'SUPPORT',
      GRUNT: 'SCHOOL', BRUTE: 'MASS', ORB: 'SUPPORT', PROG: 'DARTER', MINDER: 'SUPPORT',
      GHOST: 'SCHOOL', WRAITH: 'COMMIT',
      FLIT: 'SCHOOL', SPITTLE: 'HOLDER', CHARGER: 'COMMIT', HOPPER: 'DARTER',
      TURRET: 'FIXED', TROOPER: 'HOLDER',
      THUG: 'DRIFTER', DRAPER: 'HOLDER',
      PRISM: 'MASS', CUSTODIAN: 'MASS', SHEPHERD: 'HERDER',
    },
    fallback: 'DRIFTER',
    weaveSpeed: 1.7,     // rad/s of the serpentine
    weaveGain: 1.6,      // u/s at full weave
  },

  fx: {
    hitDroplets: 8, killDroplets: 22, killChunks: 5,
    splatLife: 20,
    slimeTrailInterval: 0.3, slimeTrailLife: 4,
    poisonInterval: 0.5, poisonLife: 8,
    hitWobbleStart: 0.65, hitWobbleDecay: 1.1,
  },
};

// Apply a named material preset onto the active values (pause menu calls this).
export function applyMaterialPreset(name){
  const p = TUNING.material.presets[name];
  if (p) Object.assign(TUNING.material, p);
}
