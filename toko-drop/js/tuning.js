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
