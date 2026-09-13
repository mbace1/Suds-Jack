// The look, in four shaders. No lights touch the snow: it is lit by hand,
// because a Lambert surface cannot do what a snowfield does — a wrapped
// terminator so the shadow side stays luminous, a broad sheen toward the sun,
// a scatter of glints that flicker as you move past them, and a rim that picks
// up the sky. Everything fogs toward the horizon colour of the hour.
import * as THREE from 'three';

export function makeUniforms() {
  return {
    uSun: { value: new THREE.Vector3(0.6, 0.5, -0.6) },
    uSunCol: { value: new THREE.Color(1, 0.9, 0.8) },
    uLit: { value: new THREE.Color(0.97, 0.9, 0.85) },
    uShade: { value: new THREE.Color(0.55, 0.6, 0.82) },
    uZenith: { value: new THREE.Color(0.23, 0.3, 0.5) },
    uHorizon: { value: new THREE.Color(0.95, 0.7, 0.55) },
    uFog: { value: new THREE.Color(0.95, 0.7, 0.55) },
    uFogDensity: { value: 0.0062 },
    uCam: { value: new THREE.Vector3() },
    uTime: { value: 0 },
  };
}

const FOG = /* glsl */`
  float fogAt(vec3 w) {
    float d = length(uCam - w);
    return 1.0 - exp(-uFogDensity * uFogDensity * d * d);
  }
`;
// the sky in a direction: shared by the dome and by the fog, so a far slope
// dissolves into the sky that is actually behind it rather than into one tone
const SKY = /* glsl */`
  vec3 skyAt(vec3 d) {
    float k = pow(smoothstep(-0.02, 0.55, d.y), 0.65);
    vec3 col = mix(uHorizon, uZenith, k);
    float s = max(dot(d, uSun), 0.0);
    col += uSunCol * (pow(s, 40.0) * 0.28 + pow(s, 6.0) * 0.10);
    return mix(uFog, col, smoothstep(-0.12, 0.03, d.y));
  }
`;
const HASH = /* glsl */`
  float hash21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
`;

export function snowMaterial(u) {
  return new THREE.ShaderMaterial({
    uniforms: u,
    vertexShader: /* glsl */`
      varying vec3 vN; varying vec3 vW;
      void main() {
        vN = normal;
        vec4 w = modelMatrix * vec4(position, 1.0);
        vW = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uSun, uSunCol, uLit, uShade, uZenith, uHorizon, uFog, uCam;
      uniform float uFogDensity, uTime;
      varying vec3 vN; varying vec3 vW;
      ${FOG} ${HASH} ${SKY}
      void main() {
        vec3 n = normalize(vN);
        vec3 V = normalize(uCam - vW);
        float ndl = dot(n, uSun);
        float wrap = clamp(ndl * 0.55 + 0.45, 0.0, 1.0);
        wrap = smoothstep(0.0, 1.0, wrap);
        vec3 col = mix(uShade, uLit, wrap);
        // a broad sheen toward the sun, the crest of a dune catching light
        vec3 H = normalize(V + uSun);
        float ndh = max(dot(n, H), 0.0);
        col += uSunCol * pow(ndh, 24.0) * 0.18 * wrap;
        // glints: a fixed scatter over the world, each one alive only near the
        // specular angle, so they wink as the camera moves past them
        float g = hash21(floor(vW.xz * 2.7));
        float g2 = hash21(floor(vW.xz * 2.7) + 17.0);
        float ang = pow(ndh, 8.0);
        float twinkle = 0.5 + 0.5 * sin(uTime * (2.0 + g2 * 4.0) + g * 40.0);
        float glint = smoothstep(0.986, 1.0, g * 0.55 + ang * 0.45 * twinkle) * wrap;
        col += uSunCol * glint * 1.6;
        // rim toward the sky
        float fres = pow(1.0 - max(dot(n, V), 0.0), 3.0);
        col = mix(col, mix(uHorizon, uZenith, 0.5), fres * 0.28);
        col = mix(col, skyAt(normalize(vW - uCam)), fogAt(vW));
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
}

export function skyMaterial(u) {
  return new THREE.ShaderMaterial({
    uniforms: u, side: THREE.BackSide, depthWrite: false,
    vertexShader: /* glsl */`
      varying vec3 vD;
      void main() {
        vD = normalize(position);
        vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_Position = p.xyww;
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uSun, uSunCol, uZenith, uHorizon, uFog;
      varying vec3 vD;
      ${SKY}
      void main() {
        vec3 d = normalize(vD);
        vec3 col = skyAt(d);
        float s = max(dot(d, uSun), 0.0);
        col += uSunCol * pow(s, 900.0) * 1.4 * smoothstep(-0.12, 0.03, d.y);   // the disc itself
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
}

// aData = (age/life, size, kind)
export function snowPointsMaterial(u) {
  return new THREE.ShaderMaterial({
    uniforms: { ...u, uScale: { value: 400 } },
    transparent: true, depthWrite: false,
    vertexShader: /* glsl */`
      attribute vec3 aData;
      uniform vec3 uCam; uniform float uFogDensity, uScale;
      varying float vA; varying float vKind; varying float vFog; varying float vSeed;
      ${FOG}
      void main() {
        float t = aData.x;
        vA = smoothstep(0.0, 0.06, t) * (1.0 - smoothstep(0.45, 1.0, t));
        vKind = aData.z;
        vSeed = fract(position.x * 12.9898 + position.z * 78.233);
        vec4 w = modelMatrix * vec4(position, 1.0);
        vFog = fogAt(w.xyz);
        vec4 mv = viewMatrix * w;
        float grow = aData.z > 0.5 ? (1.0 + t * 1.6) : (1.0 + t * 0.6);
        gl_PointSize = clamp(aData.y * grow * uScale / max(1.0, -mv.z), 1.0, aData.z > 0.5 ? 90.0 : 26.0);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uLit, uShade, uFog, uSunCol;
      varying float vA; varying float vKind; varying float vFog; varying float vSeed;
      void main() {
        vec2 q = gl_PointCoord - 0.5;
        float d = length(q) * 2.0;
        float soft = vKind > 0.5 ? smoothstep(1.0, 0.15, d) : smoothstep(1.0, 0.6, d);
        if (soft < 0.01) discard;
        vec3 bright = mix(uLit, vec3(1.0), 0.55);
        vec3 col = vKind > 1.5 ? mix(uLit, vec3(1.0), 0.8)
                 : vKind > 0.5 ? mix(uShade, uLit, 0.75 + 0.25 * vSeed)
                 : mix(bright, uSunCol, vSeed * 0.35);
        col = mix(col, uFog, vFog);
        float a = soft * vA * (vKind > 0.5 ? (vKind > 1.5 ? 0.6 : 0.42) : 0.9);
        gl_FragColor = vec4(col, a);
      }`,
  });
}

// the track the board leaves: a strip with a per-vertex alpha that fades out
// along its length
export function trailMaterial(u) {
  return new THREE.ShaderMaterial({
    uniforms: u, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    vertexShader: /* glsl */`
      attribute float aAlpha;
      uniform vec3 uCam; uniform float uFogDensity;
      varying float vA; varying float vFog;
      ${FOG}
      void main() {
        vA = aAlpha;
        vec4 w = modelMatrix * vec4(position, 1.0);
        vFog = fogAt(w.xyz);
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uShade, uLit, uFog;
      varying float vA; varying float vFog;
      void main() {
        vec3 col = mix(uShade, uLit, 0.25) * 0.92;
        col = mix(col, uFog, vFog);
        gl_FragColor = vec4(col, vA * 0.55 * (1.0 - vFog));
      }`,
  });
}

// the contact shadow under the rider — a soft disc that thins as they rise
export function shadowMaterial(u) {
  return new THREE.ShaderMaterial({
    uniforms: { ...u, uAlpha: { value: 1 } },
    transparent: true, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3,
    vertexShader: /* glsl */`
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */`
      uniform vec3 uShade; uniform float uAlpha;
      varying vec2 vUv;
      void main() {
        float d = length(vUv - 0.5) * 2.0;
        float a = smoothstep(1.0, 0.2, d) * 0.55 * uAlpha;
        gl_FragColor = vec4(uShade * 0.8, a);
      }`,
  });
}
