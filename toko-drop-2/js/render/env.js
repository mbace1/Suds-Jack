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
import { TUNING } from '../tuning.js?v=68';

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
