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
    // how much of the shading is the SUN'S terminator against the wrapped
    // scatter term — 0 is v3's luminous-but-formless snow, 1 is a hard dune face
    uForm: { value: 0.72 },
    // the wind the sastrugi lie across, in xz; mostly across the gully
    uWind: { value: new THREE.Vector2(-0.86, 0.5) },
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
// the sky in a direction, WITH the mountains in it: two ranges of ridgeline read
// off the azimuth, the far one all but dissolved in the haze, the near one a
// shade darker — so the frame has a scale beyond the gully wall, and a far slope
// fogs into the range that is actually behind it rather than into a flat band
const SKY = /* glsl */`
  float n1(float x) { float i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
    return mix(hash21(vec2(i, 3.7)), hash21(vec2(i + 1.0, 3.7)), f); }
  float ridge(float az, float seed, float f) {
    return n1(az * f + seed) * 0.55 + n1(az * f * 2.7 + seed * 1.9) * 0.3 + n1(az * f * 6.1 + seed * 2.3) * 0.15;
  }
  vec3 skyAt(vec3 d) {
    float k = pow(smoothstep(-0.02, 0.55, d.y), 0.65);
    vec3 col = mix(uHorizon, uZenith, k);
    float s = max(dot(d, uSun), 0.0);
    col += uSunCol * (pow(s, 40.0) * 0.28 + pow(s, 6.0) * 0.10);
    // the ranges
    float az = atan(d.x, -d.z);
    float far = 0.012 + 0.055 * ridge(az, 11.0, 2.3);
    float near = -0.004 + 0.036 * ridge(az, 41.0, 4.1);
    vec3 mtn = mix(uShade, uHorizon, 0.35) * 0.82;
    float sunSide = 0.5 + 0.5 * dot(normalize(vec3(d.x, 0.0, d.z)), normalize(vec3(uSun.x, 0.0, uSun.z)));
    vec3 farCol = mix(uFog, mtn, 0.22 + 0.08 * sunSide);
    vec3 nearCol = mix(uFog, mtn, 0.40);
    float hf = smoothstep(far + 0.004, far - 0.004, d.y);
    float hn = smoothstep(near + 0.003, near - 0.003, d.y);
    col = mix(col, farCol, hf);
    col = mix(col, nearCol, hn);
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
      attribute float aShadow;
      varying vec3 vN; varying vec3 vW; varying float vSh;
      void main() {
        vN = normal;
        vSh = aShadow;
        vec4 w = modelMatrix * vec4(position, 1.0);
        vW = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uSun, uSunCol, uLit, uShade, uZenith, uHorizon, uFog, uCam;
      uniform float uFogDensity, uTime, uForm;
      uniform vec2 uWind;
      varying vec3 vN; varying vec3 vW; varying float vSh;
      ${FOG} ${HASH} ${SKY}
      float vnoise(vec2 p) {
        vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash21(i), hash21(i + vec2(1, 0)), f.x), mix(hash21(i + vec2(0, 1)), hash21(i + vec2(1, 1)), f.x), f.y);
      }
      // The skin of the snow, as a height field the sun can catch. Sastrugi:
      // ridges that run ACROSS the wind, long along it and short across, their
      // crests wandering; under them a coarser dune skin. Snow is not a texture,
      // it is a surface, so this is a height and the normal is its gradient.
      float skin(vec2 p, float fine) {
        vec2 w = normalize(uWind), q = vec2(-w.y, w.x);
        float along = dot(p, w), across = dot(p, q);
        float wander = vnoise(vec2(across * 0.35, along * 0.06)) * 2.6 + vnoise(vec2(across * 1.7, along * 0.3)) * 1.1;
        float ph = along * 13.5 + wander;
        float crest = 0.5 + 0.5 * sin(ph);
        crest = crest * crest * (1.0 - 0.35 * vnoise(vec2(along * 0.9, across * 0.5)));
        // AMPLITUDE IS A SLOPE, not a depth. 0.028 m over a 0.47 m period is a 21°
        // facet, and a field of those is corrugated iron rather than snow: the frame
        // read as corduroy to the horizon. Sastrugi are a SKIN — a few degrees — and
        // what makes them read is the light raking across them, not their size.
        float sas = crest * 0.005;
        float dune = (vnoise(p * 0.42) * 0.6 + vnoise(p * 0.97 + 7.3) * 0.4) * 0.055;
        return dune + sas * fine;
      }
      void main() {
        vec3 n = normalize(vN);
        vec3 V = normalize(uCam - vW);
        float dist = length(uCam - vW);
        // How much ground one pixel covers: distance over the grazing angle. Fading
        // the detail on DISTANCE alone drew metre-wide rake lines to the horizon,
        // because the far field is seen edge-on and a pixel there spans several
        // metres of snow. Fade on the footprint and the skin simply runs out.
        float graze = max(dot(normalize(vN), normalize(uCam - vW)), 0.04);
        float foot = dist / graze;
        float fine = 1.0 - smoothstep(12.0, 45.0, foot);
        float coarse = 1.0 - smoothstep(40.0, 130.0, foot);
        vec3 nd = n;
        if (coarse > 0.001) {
          float e = 0.06;
          float h0 = skin(vW.xz, fine);
          float dx = (skin(vW.xz + vec2(e, 0.0), fine) - h0) / e;
          float dz = (skin(vW.xz + vec2(0.0, e), fine) - h0) / e;
          nd = normalize(vec3(n.x - dx * coarse, n.y, n.z - dz * coarse));
        }
        float ndl = dot(nd, uSun);
        float ndl0 = dot(n, uSun);
        // TWO terms. The sun has a terminator — a real lit face and a real shadow
        // face, softened only by the sun's own width — and it is what gives a
        // dune its form. The sky term stays WRAPPED, because snow is lit from
        // every direction by every other bit of snow and its shadows are luminous.
        // The ramp must SPAN the range the ground actually occupies. Ending it at 0.32
        // meant every pixel was past the terminator and fully lit — flatter than the
        // wrap it replaced. With the sun at 20-31° over a field tilted ~17°, ndl lives
        // around 0.45-0.9, so that is where the gradient has to be.
        float sun = smoothstep(-0.10, 0.92, ndl) * vSh;
        float wrapK = smoothstep(0.0, 1.0, clamp(ndl0 * 0.55 + 0.45, 0.0, 1.0));
        float k = mix(wrapK, sun, uForm);
        vec3 col = mix(uShade, uLit, k);
        col += uSunCol * sun * 0.10;
        // a broad sheen toward the sun, the crest of a dune catching light
        vec3 H = normalize(V + uSun);
        float ndh = max(dot(nd, H), 0.0);
        col += uSunCol * pow(ndh, 24.0) * 0.14 * sun;
        // snow scatters FORWARD: looking into the sun across it, the whole field lifts
        float fwd = pow(max(dot(-V, uSun), 0.0), 6.0);
        col += uSunCol * fwd * 0.055 * (1.0 - 0.7 * sun);
        // glints: a fixed scatter over the world, each one alive only near the
        // specular angle, so they wink as the camera moves past them
        float g = hash21(floor(vW.xz * 2.7));
        float g2 = hash21(floor(vW.xz * 2.7) + 17.0);
        float ang = pow(ndh, 8.0);
        float twinkle = 0.5 + 0.5 * sin(uTime * (2.0 + g2 * 4.0) + g * 40.0);
        float glint = smoothstep(0.986, 1.0, g * 0.55 + ang * 0.45 * twinkle) * sun;
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
      uniform vec3 uSun, uSunCol, uZenith, uHorizon, uFog, uShade;
      varying vec3 vD;
      ${HASH} ${SKY}
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
