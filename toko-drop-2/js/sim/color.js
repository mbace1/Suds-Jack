// color.js — colour as numbers, for the sim (no three.js here).
//
// revengeColor is 1.x's corpse-fire palette (main.js:4338-4356): the species'
// bullet colour (or its body colour) shifted in HSL, read in LINEAR space as
// three's Color does, so a corpse's fire reads apart from the living fire.
import { TUNING } from '../tuning.js?v=10';

const toLin = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
const toSrgb = (c) => (c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);

function hexToHsl(hex) {
  const r = toLin(((hex >> 16) & 255) / 255), g = toLin(((hex >> 8) & 255) / 255), b = toLin((hex & 255) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min, s = l <= 0.5 ? d / (max + min) : d / (2 - max - min);
  let h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: h / 6, s, l };
}
function hslToHex({ h, s, l }) {
  const hue = (p, q, t) => { if (t < 0) t += 1; if (t > 1) t -= 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * 6 * (2 / 3 - t) : p; };
  let r = l, g = l, b = l;
  if (s > 0) { const q = l <= 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q; r = hue(p, q, h + 1 / 3); g = hue(p, q, h); b = hue(p, q, h - 1 / 3); }
  const c = (x) => Math.round(Math.max(0, Math.min(1, toSrgb(x))) * 255);
  return (c(r) << 16) | (c(g) << 8) | c(b);
}

const cache = new Map();
export function revengeColor(kind) {
  if (cache.has(kind)) return cache.get(kind);
  const S = TUNING.species[kind], P = TUNING.revenge.palette;
  const hsl = hexToHsl(S.bulletColor ?? S.color);
  let out;
  if (hsl.h >= P.yellowLo && hsl.h <= P.yellowHi) out = { h: P.poisonHue, s: Math.max(hsl.s, P.poisonSatMin), l: P.poisonL };
  else if (hsl.h < P.yellowLo) out = { h: hsl.h * 0.4, s: Math.min(1, hsl.s * P.satMul), l: Math.max(P.lFloor, hsl.l * P.darkL) };
  else if (hsl.h > P.warmHiCut) out = { h: hsl.h, s: Math.min(1, hsl.s * P.satMul), l: Math.max(P.lFloor, hsl.l * P.darkL) };
  else out = { h: hsl.h, s: Math.min(1, hsl.s * P.satMul), l: Math.max(P.lFloor, hsl.l * P.coolL) };
  const hex = hslToHex(out);
  cache.set(kind, hex);
  return hex;
}
