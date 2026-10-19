// tuning.js — every number in the game lives here. Never duplicate a tuned
// constant in code: import it. spec/toko2.json (the Godot port's seam) will be
// emitted from this file, so a number that lives anywhere else is a number the
// port re-derives by guesswork.
//
// World units are metres, roughly. Axes: x across the screen (right +),
// y up, z from the garage (−) toward the street (+). The slab is centred on
// the origin.
export const TUNING = {
  render: {
    clearColor: 0x050506,   // near-black: the void around the driveway, and the UI's ground
    maxPixelRatio: 2,       // a Pixel 10 Pro reports ~3; full-res HD gels at 2 are plenty
  },

  // One fixed view of the whole arena, refitted on every resize and rotation.
  camera: {
    fov: 30,                // vertical, degrees: narrow, so the curbs do not bow
    tiltDeg: 24,            // off straight-down, toward the street, so the garage door has a face
    near: 0.5,
    far: 400,
    margin: 0.02,           // NDC kept clear around the arena on the tighter axis
    searchMin: 1,           // camera distances the fit searches between
    searchMax: 400,
  },

  driveway: {
    slab: {
      width: 16,            // curb to curb: a double driveway, stretched for landscape
      depth: 9,             // garage door to street curb
      panelX: 4,            // expansion-joint spacing across…
      panelZ: 4.5,          // …and along
      jointWidth: 0.07,
    },
    curb: { width: 0.3, height: 0.15 },
    lawn: {
      y: 0.1,               // grass sits just under the curb top
      reach: 30,            // how far the lawns run out sideways (past any screen)
      margin: 2,            // lawn the view always keeps past each side curb: where spawns rustle
    },
    street: {
      reach: 40,            // how far the asphalt runs toward the camera
      margin: 0.8,          // street the view always keeps past the street curb
    },
    house: {
      reach: 30,            // half-width of the house front, past any screen
      wallHeight: 3.2,
      wallDepth: 0.4,
      roofDepth: 36,
      roofRise: 0.25,       // the roof's front edge stands this far over the wall top
    },
    door: { width: 9.6, height: 2.4, panels: 4, grooveWidth: 0.05 },
    flood: { width: 0.5, height: 0.22, depth: 0.25, y: 2.85 },  // the motion-sensor light over the door
  },

  light: {
    // The one warm light: the flood over the garage door, pooling on the slab
    // and falling off toward the street.
    flood: {
      color: 0xffb468,
      intensity: 60,        // candela (physical lights, decay 2)
      decay: 2,
      angleDeg: 62,         // half-angle of the cone
      penumbra: 0.75,
      targetZ: -0.5,        // where the cone points on the slab
    },
    // A dim cool fill so the edges stay readable; everything else is dark.
    moon: { sky: 0x6a7dab, ground: 0x0b0b0e, intensity: 1.1 },
  },

  colors: {
    slab: 0x9a968c,
    joint: 0x2c2b29,
    curb: 0xb3afa5,
    lawn: 0x3d5a2f,
    street: 0x2b2c30,
    wall: 0x5d5a57,
    roof: 0x1d1d22,
    door: 0xd2ccbf,
    doorGroove: 0x6f6a61,
    flood: 0xfff1d6,
  },
};
