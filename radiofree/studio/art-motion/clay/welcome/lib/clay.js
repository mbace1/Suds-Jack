// Surfaces you could touch: plasticine, felt, knit, card — the FILM cut.
//
// Every one is a MeshStandard/MeshPhysical material with a procedural height
// field evaluated in OBJECT space (cm) and turned into a normal by finite
// differences — no textures, no UVs, so a sausage, a lathe and an extrusion all
// take the same thumbprints without seams, and the prints ride with the puppet.
// The model matrix travels as three varyings, so a material can be shared by
// many meshes and still carry each one's gradient into world space.
//
// BOIL is shared by every material: each held pose moves it, and the clay
// re-lumps — the surface field shifts a fraction of a ridge and the silhouette
// breathes by a fraction of a millimetre, the way re-handled plasticine does.

import * as THREE from 'three';

const NOISE = /* glsl */`
varying vec3 vWPos;
varying vec3 vOPos;
vec3 h33(vec3 p) {
  p = fract(p * vec3(0.1031, 0.1030, 0.0973));
  p += dot(p, p.yxz + 33.33);
  return fract((p.xxy + p.yxx) * p.zyx);
}
float h13(vec3 p) { p = fract(p * 0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
float gnoise(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  vec3 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  #define G(o) dot(h33(i + o) * 2.0 - 1.0, f - o)
  float n = mix(mix(mix(G(vec3(0,0,0)), G(vec3(1,0,0)), u.x), mix(G(vec3(0,1,0)), G(vec3(1,1,0)), u.x), u.y),
                mix(mix(G(vec3(0,0,1)), G(vec3(1,0,1)), u.x), mix(G(vec3(0,1,1)), G(vec3(1,1,1)), u.x), u.y), u.z);
  #undef G
  return n;
}
float fbm3(vec3 p) { return gnoise(p) * 0.6 + gnoise(p * 2.03 + 7.1) * 0.28 + gnoise(p * 4.11 + 3.3) * 0.12; }
`;

// --- height fields, all in world cm --------------------------------------
const HEIGHTS = /* glsl */`
uniform float uLump, uLumpF, uThumb, uThumbCell, uRidge, uTool, uGrain, uGrainF, uSeed;
uniform float uKnitW, uKnitH, uFibre, uFibreF;
uniform vec3 uKnitAxis, uKnitO;

// thumbprints and loop-tool drags, one per Voronoi cell
float prints(vec3 p) {
  vec3 q = p / uThumbCell + uSeed;
  vec3 i = floor(q), f = fract(q);
  float best = 1e9; vec3 bid = vec3(0); vec3 br = vec3(0);
  for (int z = -1; z <= 1; z++) for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec3 g = vec3(float(x), float(y), float(z));
    vec3 r = g + h33(i + g) - f;
    float d = dot(r, r);
    if (d < best) { best = d; bid = i + g; br = r; }
  }
  vec3 h = h33(bid + 17.31);
  vec3 h2 = h33(bid + 5.77);
  vec3 rr = br * uThumbCell;
  vec3 ax = normalize(h2 * 2.0 - 1.0);
  float R = uThumbCell * (0.38 + 0.22 * h.x);
  if (h.y < 0.30) {
    // a drag of the loop tool: parallel grooves inside a stripe
    vec3 dir = normalize(cross(ax, vec3(0.31, 0.77, 0.55)));
    float along = dot(rr, dir), across = dot(rr, ax) + along * along * (h.z - 0.5) * 0.6 / R;   // a curved drag
    float m = smoothstep(R * 1.1, R * 0.3, abs(along)) * smoothstep(R * 0.45, R * 0.15, abs(across));
    float g = sin((across + gnoise(p * 2.3) * uRidge) / (uRidge * (1.3 + h.x)) * 6.2831);
    return m * (0.35 * g - 0.55) * uTool;
  }
  if (h.y > 0.72) return 0.0;
  rr += ax * dot(rr, ax) * 0.9;                       // squash into an oval
  float d = length(rr) + gnoise(p * 3.1) * uRidge * 0.9; // a whorl, not a target
  float m = smoothstep(R, R * 0.45, d);
  float rings = 0.5 + 0.5 * sin(d / uRidge * 6.2831 + h.z * 6.2831);
  float dish = -smoothstep(R, 0.0, d) * 0.7;            // the thumb's own dent
  return m * (rings * 0.12 + dish) + smoothstep(R * 1.05, R * 0.8, d) * smoothstep(R * 0.55, R * 0.8, d) * 0.3; // a lip where the clay was pushed
}

float clayH(vec3 p) {
  float h = fbm3(p * uLumpF) * uLump;
  h += prints(p) * uThumb;
  h += gnoise(p * uGrainF) * uGrain;
  return h;
}

// felt: matted fibres — a cross-hatch of stretched noise, then fuzz
float feltH(vec3 p) {
  float f = 0.0;
  f += gnoise(p * vec3(uFibreF, uFibreF * 0.18, uFibreF * 0.18)) ;
  f += gnoise(p.yzx * vec3(uFibreF, uFibreF * 0.18, uFibreF * 0.18) + 3.0);
  f += gnoise(p.zxy * vec3(uFibreF, uFibreF * 0.18, uFibreF * 0.18) + 9.0);
  f = f / 3.0 + gnoise(p * uFibreF * 1.7) * 0.5;
  return f * uFibre + fbm3(p * uLumpF) * uLump;
}

// knit: stockinette Vs around the piece's own axis (object space)
float knitH(vec3 o) {
  o -= uKnitO;
  vec3 a = normalize(uKnitAxis);
  vec3 side = normalize(abs(a.y) > 0.9 ? cross(a, vec3(1,0,0)) : cross(a, vec3(0,1,0)));
  vec3 up = cross(side, a);
  float v = dot(o, a);
  vec3 rad = o - a * v;
  float ang = atan(dot(rad, up), dot(rad, side));
  float R = max(length(rad), 0.5);
  float u = ang * R;
  vec2 c = vec2(u / uKnitW, v / uKnitH);
  vec2 f = fract(c) - 0.5;
  float s = f.x < 0.0 ? -1.0 : 1.0;
  vec2 q = vec2(abs(f.x) - 0.24, f.y);
  float an = 0.62 * s;
  q = vec2(q.x * cos(0.62) - q.y * sin(0.62), q.x * sin(0.62) + q.y * cos(0.62));
  float e = length(q / vec2(0.2, 0.46));
  float leg = sqrt(max(0.0, 1.0 - e * e));
  float twist = 0.5 + 0.5 * sin((q.y * 22.0 + q.x * 30.0));
  float h = leg * (0.8 + 0.2 * twist);
  return h * uFibre + gnoise(o * uFibreF) * uFibre * 0.18 + fbm3(o * uLumpF) * uLump;
}

float surfH(vec3 o) {
  #if SURF == 1
    return feltH(o + uBoilFrag * (1.0 - uNoBoil));
  #elif SURF == 2
    return knitH(o);
  #else
    return clayH(o + uBoilFrag * (1.0 - uNoBoil));
  #endif
}
`;

const BUMP = /* glsl */`
{
  float e = BUMP_EPS;
  float h0 = surfH(vOPos);
  // the field lives on the object: take its gradient there, carry it to world
  // through the model matrix (inverse-transpose of a rotation × uniform scale)
  vec3 go = (vec3(surfH(vOPos + vec3(e,0,0)), surfH(vOPos + vec3(0,e,0)), surfH(vOPos + vec3(0,0,e))) - h0) / e;
  mat3 Mm = mat3(vM0, vM1, vM2);
  vec3 gW = Mm * go / max(dot(vM0, vM0), 1e-6);
  vec3 gV = (viewMatrix * vec4(gW, 0.0)).xyz;
  normal = normalize(normal - uBump * (gV - dot(gV, normal) * normal));
  clayHeight = h0;
}
`;

let uid = 0;
export const BOIL = { uBoil: { value: new THREE.Vector3() }, uBoilAmp: { value: 0.05 }, uBoilFrag: { value: new THREE.Vector3() } };
export function setBoil(e) {
  const h = (n) => { const x = Math.sin(n * 12.9898 + e * 78.233) * 43758.5453; return x - Math.floor(x); };
  BOIL.uBoil.value.set(h(1) * 50, h(2) * 50, h(3) * 50);
  BOIL.uBoilFrag.value.set((h(4) - 0.5) * 0.09, (h(5) - 0.5) * 0.09, (h(6) - 0.5) * 0.09);
}
/**
 * opts: color, rough, metal, bump, surf ('clay'|'felt'|'knit'), lump, lumpF,
 * thumb, thumbCell, ridge, tool, grain, grainF, mottle, specks, sheen,
 * sheenColor, knitW, knitH, knitAxis, fibre, fibreF, emissive, cavity,
 * sss, sssTint (opt-in: soft light through thin clay; off by default, so other films render as before)
 */
export function surface(opts = {}) {
  const surf = { clay: 0, felt: 1, knit: 2 }[opts.surf || 'clay'];
  const phys = opts.sheen !== undefined || opts.clearcoat !== undefined;
  const M = phys ? THREE.MeshPhysicalMaterial : THREE.MeshStandardMaterial;
  const mat = new M({
    color: new THREE.Color(opts.color ?? '#c08060'),
    roughness: opts.rough ?? 0.72, metalness: opts.metal ?? 0,
    emissive: new THREE.Color(opts.emissive ?? '#000000'),
    emissiveIntensity: opts.emissiveIntensity ?? 1,
    side: opts.side ?? THREE.FrontSide,
    transparent: !!opts.transparent, opacity: opts.opacity ?? 1,
  });
  if (phys) {
    if (opts.sheen !== undefined) {
      mat.sheen = opts.sheen; mat.sheenRoughness = opts.sheenRough ?? 0.7;
      mat.sheenColor = new THREE.Color(opts.sheenColor ?? '#ffffff');
    }
    if (opts.clearcoat !== undefined) { mat.clearcoat = opts.clearcoat; mat.clearcoatRoughness = opts.clearcoatRough ?? 0.3; }
  }
  const U = {
    uBump: { value: opts.bump ?? 1 }, uLump: { value: opts.lump ?? 0.06 }, uLumpF: { value: opts.lumpF ?? 0.45 },
    uThumb: { value: opts.thumb ?? 0.025 }, uThumbCell: { value: opts.thumbCell ?? 2.4 }, uRidge: { value: opts.ridge ?? 0.13 },
    uTool: { value: opts.tool ?? 0.8 }, uGrain: { value: opts.grain ?? 0.004 }, uGrainF: { value: opts.grainF ?? 9 },
    uSeed: { value: opts.seed ?? (uid * 7.13) % 50 },
    uKnitW: { value: opts.knitW ?? 0.42 }, uKnitH: { value: opts.knitH ?? 0.36 },
    uKnitAxis: { value: new THREE.Vector3(...(opts.knitAxis ?? [0, 1, 0])) }, uKnitO: { value: new THREE.Vector3(...(opts.knitO ?? [0, 0, 0])) },
    uFibre: { value: opts.fibre ?? 0.02 }, uFibreF: { value: opts.fibreF ?? 12 },
    uMottle: { value: opts.mottle ?? 0.12 }, uSpecks: { value: opts.specks ?? 0.5 },
    uSpeckCol: { value: new THREE.Color(opts.speckColor ?? '#2a1e18') },
    uCavity: { value: opts.cavity ?? 0.0 },
    uNoBoil: { value: opts.noBoil ? 1 : 0 },
    uRoughVar: { value: opts.roughVar ?? 0.1 },
    uGlow: { value: new THREE.Color(opts.glow ?? '#000000') }, uGlowPow: { value: opts.glowPow ?? 2 },
    uWrap: { value: opts.wrap ?? 0.0 }, uWrapTint: { value: new THREE.Color(opts.wrapTint ?? '#ffffff') },
    uSss: { value: opts.sss ?? 0.0 }, uSssTint: { value: new THREE.Color(opts.sssTint ?? '#ff9a6a') },
    // tabby: painted bands across an axis, warped so they read as fur markings, not a barcode
    uStripe: { value: opts.stripe ?? 0 }, uStripeF: { value: opts.stripeF ?? 0.5 },
    uStripeAxis: { value: new THREE.Vector3(...(opts.stripeAxis ?? [0, 0, 1])) }, uStripeCol: { value: new THREE.Color(opts.stripeColor ?? '#2a2018') },
  };
  const sss = (opts.sss ?? 0) > 0;
  const key = `surf${surf}-${phys}-${opts.eps ?? 0.02}${sss ? '-sss' : ''}`;
  uid++;
  mat.userData.U = U;
  mat.customProgramCacheKey = () => key;
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U, BOIL);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
varying vec3 vWPos; varying vec3 vOPos; varying vec3 vM0; varying vec3 vM1; varying vec3 vM2;
uniform vec3 uBoil; uniform float uBoilAmp, uNoBoil;
float bh(vec3 p) { p = fract(p * 0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
float bn(vec3 p) { vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(bh(i), bh(i + vec3(1,0,0)), f.x), mix(bh(i + vec3(0,1,0)), bh(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(bh(i + vec3(0,0,1)), bh(i + vec3(1,0,1)), f.x), mix(bh(i + vec3(0,1,1)), bh(i + vec3(1,1,1)), f.x), f.y), f.z) * 2.0 - 1.0; }`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
vOPos = transformed;
transformed += objectNormal * bn(transformed * 0.75 + uBoil) * uBoilAmp * (1.0 - uNoBoil);
vWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
vM0 = modelMatrix[0].xyz; vM1 = modelMatrix[1].xyz; vM2 = modelMatrix[2].xyz;`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>\n#define SURF ${surf}\n${sss ? '#define CLAY_SSS\n' : ''}#define BUMP_EPS ${(opts.eps ?? 0.02).toFixed(4)}\nvarying vec3 vM0; varying vec3 vM1; varying vec3 vM2;\nuniform float uBump, uMottle, uSpecks, uCavity, uRoughVar, uGlowPow, uWrap, uNoBoil, uStripe, uStripeF;\nuniform float uSss; uniform vec3 uSssTint;\nuniform vec3 uSpeckCol, uGlow, uWrapTint, uBoilFrag, uStripeAxis, uStripeCol;\n${NOISE}\n${HEIGHTS}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        {
          float m = fbm3(vOPos * 0.35 + uSeed) * 1.4;
          diffuseColor.rgb *= 1.0 + m * uMottle;
          // specks: lint and a crumb of some other clay
          vec3 sp = vOPos * 3.2 + uSeed * 1.7;
          vec3 si = floor(sp); vec3 sf = fract(sp) - h33(si) ;
          float sd = length(sf);
          float pick = h13(si);
          float speck = smoothstep(0.09, 0.03, sd) * step(pick, 0.10 * uSpecks);
          diffuseColor.rgb = mix(diffuseColor.rgb, uSpeckCol, speck * 0.85);
          if (uStripe > 0.0) {
            float sv = dot(vOPos, uStripeAxis) * uStripeF + fbm3(vOPos * 0.32 + uSeed) * 1.6;
            float st = smoothstep(0.55, 0.8, 0.5 + 0.5 * sin(sv * 6.2831) + gnoise(vOPos * 1.3) * 0.22);
            diffuseColor.rgb = mix(diffuseColor.rgb, uStripeCol, st * uStripe);
          }
        }`)
      .replace('#include <lights_physical_pars_fragment>', THREE.ShaderChunk.lights_physical_pars_fragment.replace(
        'reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );',
        // wrapped diffuse: light creeps past the terminator the way it does into wax
        `float dW = saturate((dot(geometryNormal, directLight.direction) + uWrap) / (1.0 + uWrap));
         vec3 wrapCol = mix(vec3(1.0), uWrapTint, saturate(dW - dotNL) * 2.0);
         reflectedLight.directDiffuse += dW * directLight.color * wrapCol * BRDF_Lambert( material.diffuseColor );
         #ifdef CLAY_SSS
         // soft light through thin clay: light seen through the body from behind (distorted by the normal),
         // plus a warm glow at the silhouette where the clay is thinnest to the eye
         {
           vec3 Lt = directLight.direction + geometryNormal * 0.4;
           float back = pow(saturate(dot(geometryViewDir, -Lt)), 3.0);
           float rimT = pow(1.0 - saturate(dot(geometryNormal, geometryViewDir)), 2.5) * saturate(dot(geometryNormal, directLight.direction) + 0.6);
           reflectedLight.directDiffuse += uSss * uSssTint * directLight.color * material.diffuseColor * (back * 0.9 + rimT * 0.6);
         }
         #endif`))
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>\nroughnessFactor = clamp(roughnessFactor + gnoise(vOPos * 0.9 + 4.0) * uRoughVar, 0.05, 1.0);`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>\nfloat clayHeight = 0.0;\n${BUMP}\n diffuseColor.rgb *= 1.0 - uCavity * clamp(-clayHeight * 12.0, 0.0, 0.6);`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        {
          // a body lit from inside: brightest where it is thinnest to the eye
          vec3 V = normalize(vViewPosition);
          float nv = abs(dot(normalize(normal), V));
          totalEmissiveRadiance += uGlow * (0.35 + pow(nv, uGlowPow));
        }`);
  };
  return mat;
}

// a material for the night outside: flat colour, no lights, for backdrops
export function flat(color, opts = {}) {
  return new THREE.MeshBasicMaterial({ color: new THREE.Color(color), ...opts });
}
