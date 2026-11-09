// env.js — what the jelly reflects: a small studio painted in code.
//
// 1.x lit its gels with a sun and an ambient and nothing to reflect, so a
// glossy body showed one highlight and read as plastic. Wet jelly is read
// through its reflections: a soft light overhead sliding across the crown,
// and strip lights catching the sides. This paints that room into an
// equirectangular canvas (x is the bearing, y runs from the zenith down to
// the nadir) that three's renderer prefilters for reflections on its own.
// Every number is TUNING.env; nothing here is loaded from a file.
import * as THREE from 'three/webgpu';
import { TUNING } from '../tuning.js?v=129';

const hex = (c) => `#${new THREE.Color(c).getHexString()}`;

export function studioEnvironment() {
  const E = TUNING.env, W = E.size, H = W / 2;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d');

  // the room: dark above, a little lift toward the horizon, the floor below
  const sky = g.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, hex(E.zenith));
  sky.addColorStop(0.5, hex(E.horizon));
  sky.addColorStop(0.5, hex(E.floor));
  sky.addColorStop(1, hex(E.floor));
  g.fillStyle = sky;
  g.fillRect(0, 0, W, H);

  // the overhead softbox: a soft-edged band across the top, so every crown
  // carries a broad sheen rather than a pinpoint
  const box = g.createLinearGradient(0, 0, 0, H * E.softbox.depth);
  box.addColorStop(0, hex(E.softbox.color));
  box.addColorStop(0.55, hex(E.softbox.color));
  box.addColorStop(1, 'rgba(0,0,0,0)');
  g.globalAlpha = E.softbox.strength;
  g.fillStyle = box;
  g.fillRect(0, 0, W, H * E.softbox.depth);

  // strip lights on the horizon, at their bearings: the rims light up
  for (const s of E.strips) {
    const x = (s.bearing / 360) * W, w = (s.width / 360) * W, y = H * (0.5 - s.height), h = H * s.span;
    const glow = g.createRadialGradient(x, y + h / 2, 0, x, y + h / 2, Math.max(w, h));
    glow.addColorStop(0, hex(s.color));
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    g.globalAlpha = s.strength;
    g.fillStyle = glow;
    // drawn twice across the seam so a strip near 0/360 wraps
    for (const dx of [-W, 0, W]) g.fillRect(x - w + dx, y - h / 2, w * 2, h * 2);
  }
  g.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(cv);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// v128 (the owner's golden-hour concept for the driveway: "light source reflected in enemies"): an OUTDOOR sky for
// the jelly to reflect. The studio above is a dark room, and out in the sun the gels reflected it: dull, with no sun
// in them. This is a half-float equirect in three's own mapping (u the bearing atan2(z, x), v the height asin(y)):
// the sky from `horizon` up to `zenith`, the ground below, and the sun where the world's light stands, far brighter
// than white (`radiance`) — a clearcoat gives back a few per cent of what it faces, so a sun painted at 1.0 is no
// glint at all — with a `halo` round it for the softer highlight round the glint. Built once a world, for the worlds
// whose light carries a `sky` (TUNING.worlds.light), and handed to scene.environment in place of the studio
export function skyEnvironment(S, at) {
  const W = S.size ?? 512, H = W / 2, data = new Uint16Array(W * H * 4), toH = THREE.DataUtils.toHalfFloat;
  const s = new THREE.Vector3(...at).normalize(), Z = S.zenith, R = S.horizon, G = S.ground, C = S.sun.color;
  for (let j = 0; j < H; j++) {
    const lat = ((j + 0.5) / H - 0.5) * Math.PI, y = Math.sin(lat), c = Math.cos(lat);
    const k = y >= 0 ? Math.pow(y, S.curve ?? 0.45) : Math.min(1, -y * (S.groundFade ?? 5));
    const A = y >= 0 ? Z : G;   // up: horizon → zenith; down: the horizon fading into the ground
    for (let i = 0; i < W; i++) {
      const phi = ((i + 0.5) / W - 0.5) * Math.PI * 2, x = c * Math.cos(phi), z = c * Math.sin(phi);
      const ang = Math.acos(Math.max(-1, Math.min(1, x * s.x + y * s.y + z * s.z)));
      const sun = (ang < S.sun.size ? S.sun.radiance : 0) + S.sun.halo * Math.exp(-ang / S.sun.haloWidth);
      const o = (j * W + i) * 4;
      for (let q = 0; q < 3; q++) data[o + q] = toH(R[q] + (A[q] - R[q]) * k + C[q] * sun);
      data[o + 3] = toH(1);
    }
  }
  const tex = new THREE.DataTexture(data, W, H, THREE.RGBAFormat, THREE.HalfFloatType);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.LinearSRGBColorSpace;
  tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}
