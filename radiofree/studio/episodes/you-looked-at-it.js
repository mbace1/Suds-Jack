// YOU LOOKED AT IT — tech desk, 27.09.2026. The voiced clay cut.
//
// Real event, invented names (EDITORIAL.md): a platform's AI glasses get an
// agent you wake by saying its name, which acts on whatever you look at —
// ordering, booking, checking flight prices. Over a hundred styles by year
// end; glasses from $249; the agent free, $20 or $100 a month. The script and
// its sources are in you-looked-at-it.script.json; the voices are rendered by
// studio/voice.py and their timing drives every shot below.

import * as THREE from 'three';
import { lump, clayText, cardMat, feltMat, printMat, woodMat, rng } from '../clay/clay.js';
import { puppet, glasses } from '../clay/rig.js';
import { street, studio, reticle, dog, pigeon, glassesWall, streetlamp } from '../clay/sets.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ease = (k) => (k = clamp(k), k * k * (3 - 2 * k));
const eout = (k) => 1 - (1 - clamp(k)) ** 3;
const squash = (k) => (k <= 0 || k >= 1 ? 1 : 1 - Math.sin(k * Math.PI) * 0.28 * (1 - k));
const cam = (pos, look, o = {}) => ({ pos, look, ...o });
const blinkAt = (f, every = 31, off = 0) => ((f + off) % every) < 1 ? 1 : 0;
/** footstep cues for a walk: one per half cycle between t0 and t1 at `rate` cycles/s */
const steps = (t0, t1, rate, ph = 0) => { const o = []; for (let k = Math.ceil((t0 * rate + ph) * 2); k / 2 <= t1 * rate + ph; k++) o.push([(k / 2 - ph) / rate, 'step']); return o; };

const MAN = { outfit: 'sweater', color: '#e2573e', skin: '#e7b28c', hair: '#3a2418', style: 1, seed: 7, glass: { frame: '#1d1a22', smart: true, seed: 3 } };
const HOST = { outfit: 'suit', color: '#2a3a6e', skin: '#f1c3a1', hair: '#6b4a2e', style: 3, seed: 11, tie: '#f0027f', seated: true };

/** the man on the street, shared by five shots (each shot builds its own copy of the set) */
function streetShot({ lamps, tramOn = false, dogOn = false, pigeonOn = false } = {}) {
  const s = street({ lamps, tramOn });
  const man = puppet(MAN); s.g.add(man);
  let d = null, p = null;
  if (dogOn) { d = dog(); d.position.set(-24, 1.4, 4); d.rotation.y = 0.9; s.g.add(d); }
  if (pigeonOn) { p = pigeon(); const head = s.lamps[1].userData.head; p.position.set(0, 2.2, 0); p.rotation.y = -0.5; head.add(p); }
  return { ...s, man, dog: d, pigeon: p };
}
function glanceLed(man, cast, f) {
  const led = man.userData.specs?.userData.led; if (!led) return;
  const on = cast.say('GLANCE'); led.material.color.set(on && on[0] > 0.1 ? '#b9fbff' : (f % 12 < 6 ? '#3fc6d8' : '#1d6f7a'));
  led.scale.setScalar(on && on[0] > 0.1 ? 1.6 : 1);
}

export const meta = { id: 'you-looked-at-it', title: 'You Looked At It', desk: 'TECH DESK · 27.09.2026' };

const shots = [
  { // 1 — cold open: the street at dusk, the tram crossing
    speech: ['open'], lead: 0.8, tail: 0.5, min: 5, wipeIn: false,
    sfx: [[0.5, 'bell'], [0.1, 'whoosh']],
    build() {
      const s = street({ lamps: [-60, 0, 60], tramOn: true });
      return {
        group: s.g,
        update(lt) { s.tram.position.x = 150 - lt * 44; },
        camera: (lt) => cam(V(10 - lt * 2, 70 - lt * 1.5, 300 - lt * 6), V(0, 52, 0), { fov: 30, focus: 290, aperture: 0.0005 }),
      };
    },
  },
  { // 2 — the host
    speech: ['news1', 'news2'], lead: 0.35, gap: 0.35, tail: 0.6,
    build() {
      const st = studio();
      const host = puppet(HOST); host.position.set(2, 7.4, -9); st.g.add(host);
      host.userData.reach(0, 0.55, 0.2); host.userData.reach(1, 0.55, 0.2);
      return {
        group: st.g,
        update(lt, f, cast) {
          const say = cast.say('HOST'), line = cast.line;
          // on "whatever you are looking at" he turns to the monitor
          const late = line && line.id === 'news2';
          host.userData.pose({ say, blink: blinkAt(f, 29), brow: late ? 0.9 : 0.2 + (say ? say[0] * 0.25 : 0), nod: say ? say[0] * 0.25 : 0, yaw: late ? -0.35 : 0.05, look: late ? -0.7 : 0.05 });
          st.toko.userData.blink(blinkAt(f, 23, 5));
        },
        camera: (lt) => cam(V(3, 21, 60 - lt * 1.2), V(1, 17, -9), { fov: 30, focus: 67 - lt * 1.2, aperture: 0.0012 }),
      };
    },
  },
  { // 3 — a man walks in, wearing them
    speech: [{ id: 'hey', at: 1.4 }, 'hello'], gap: 0.25, tail: 0.7, wipeIn: true,
    sfx: steps(0, 2.2, 1.6),
    build() {
      const s = streetShot({ lamps: [-60, 40, 90] });
      return {
        group: s.g,
        update(lt, f, cast) {
          const walking = clamp((2.3 - lt) / 0.3), x = -46 + 15.4 * Math.min(lt, 2.2);
          s.man.position.set(x, 1.4, 5); s.man.rotation.y = Math.PI / 2 * (1 - ease((lt - 2.0) / 0.4)) + 0.2 * ease((lt - 2.0) / 0.4);
          s.man.userData.pose({ say: cast.say('MAN'), blink: blinkAt(f, 27), look: 0, brow: cast.say('GLANCE') ? 0.7 : 0.1, mouth: cast.say('GLANCE') ? 'oo' : null });
          s.man.userData.walk(lt * 1.6, walking);
          glanceLed(s.man, cast, f);
        },
        camera: (lt) => { const x = -46 + 15.4 * Math.min(lt, 2.2); return cam(V(x + 6, 15, 72), V(x + 2, 12, 2), { fov: 30, focus: 67, aperture: 0.0014 }); },
      };
    },
  },
  { // 4 — the cake
    speech: [{ id: 'cake', at: 0.9 }], tail: 1.0,
    sfx: [[0.6, 'beep'], [2.0, 'register']],
    build() {
      const s = streetShot({ lamps: [-60, 40, 90] });
      s.man.position.set(10, 1.4, 6); s.man.rotation.y = -0.6;
      const ret = reticle('ORDERED · 1 CAKE', { w: 10, h: 11 }); ret.position.set(0, 9.5, -6); s.g.add(ret);
      return {
        group: s.g,
        update(lt, f, cast) {
          s.man.userData.pose({ say: cast.say('MAN'), blink: blinkAt(f, 25), look: -0.6, lookY: -0.2, yaw: -0.25, brow: lt > 2 ? 0.9 : 0.2, mouth: lt > 2 ? 'o' : null });
          ret.visible = lt > 0.55; const k = eout((lt - 0.55) / 0.3); ret.scale.setScalar(1.6 - 0.6 * k);
          ret.children.at(-1).visible = lt > 1.9;
          glanceLed(s.man, cast, f);
        },
        camera: (lt) => cam(V(-6 + lt, 16, 70), V(4, 11, -4), { fov: 30, focus: 70, aperture: 0.0013 }),
      };
    },
  },
  { // 5 — the dog
    speech: [{ id: 'dog', at: 0.8 }], tail: 0.9,
    sfx: [[0.3, 'bark'], [0.55, 'beep'], [2.4, 'register']],
    build() {
      const s = streetShot({ lamps: [-60, 40, 90], dogOn: true });
      s.man.position.set(-12, 1.4, 6); s.man.rotation.y = -0.9;
      const ret = reticle('VET BOOKED · TUESDAY', { w: 12, h: 12 }); ret.position.set(-22, 8, 4); s.g.add(ret);
      return {
        group: s.g,
        update(lt, f, cast) {
          s.dog.userData.wag(lt);
          s.dog.userData.head.rotation.z = 0.2 + Math.sin(lt * 3) * 0.05;
          s.man.userData.pose({ blink: blinkAt(f, 25, 4), look: -0.5, lookY: -0.8, yaw: -0.2, nod: 0.5, brow: lt > 2.3 ? 1 : 0.3, mouth: lt > 2.3 ? 'small' : 'rest' });
          ret.visible = lt > 0.5; ret.scale.setScalar(1.6 - 0.6 * eout((lt - 0.5) / 0.3)); ret.children.at(-1).visible = lt > 2.3;
          glanceLed(s.man, cast, f);
        },
        camera: (lt) => cam(V(-14 - lt, 13, 72), V(-18, 11, 2), { fov: 30, focus: 70, aperture: 0.0013 }),
      };
    },
  },
  { // 6 — the pigeon
    speech: [{ id: 'bird', at: 0.8 }], tail: 0.9,
    sfx: [[0.3, 'coo'], [0.55, 'beep']],
    build() {
      const s = streetShot({ lamps: [-60, 40, 90], pigeonOn: true });
      s.man.position.set(33, 1.4, 12); s.man.rotation.y = 0.4;
      const ret = reticle('FLIGHTS · CHECKING…', { w: 8, h: 8 }); s.g.add(ret);
      const head = s.lamps[1].userData.head; const wp = new THREE.Vector3();
      return {
        group: s.g,
        update(lt, f, cast) {
          s.pigeon.userData.bob(lt);
          head.getWorldPosition(wp); ret.position.set(wp.x, wp.y + 3, wp.z + 2);
          s.man.userData.pose({ blink: blinkAt(f, 25, 9), look: 0.3, lookY: 1, nod: -1.6, brow: 0.6 + (lt > 2.4 ? 0.4 : 0), mouth: lt > 2.4 ? 'oo' : 'rest' });
          ret.visible = lt > 0.5; ret.scale.setScalar(1.6 - 0.6 * eout((lt - 0.5) / 0.3)); ret.children.at(-1).visible = lt > 2.2;
          glanceLed(s.man, cast, f);
        },
        camera: (lt) => cam(V(22, 6, 64), V(38, 26, 6), { fov: 32, focus: 62, aperture: 0.0012 }),
      };
    },
  },
  { // 7 — a hundred styles
    speech: [{ id: 'styles', at: 0.4 }], tail: 0.8, wipeIn: true,
    sfx: [[0.2, 'whoosh'], [2.2, 'pop']],
    build() {
      const g = new THREE.Group();
      const back = new THREE.Mesh(new THREE.PlaneGeometry(400, 300), feltMat('#2b2a5c')); back.position.set(0, 60, -20); g.add(back);
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(300, 120), woodMat()); floor.rotation.x = -Math.PI / 2; floor.position.z = 30; floor.receiveShadow = true; g.add(floor);
      const wall = glassesWall(glasses, 10, 10); g.add(wall.g);
      const word = clayText('100+ STYLES', { size: 8, depth: 2.4, color: '#ffd166', seed: 70 }); word.position.set(0, 94, 0); g.add(word);
      const L = word.userData.letters; L.forEach((l) => { l.userData.y0 = l.position.y; });
      return {
        group: g,
        update(lt, f) {
          L.forEach((l, i) => { const at = 1.9 + i * 0.06, k = (lt - at) / 0.35; l.visible = k > 0; l.position.y = l.userData.y0 + (1 - eout(k)) * 40; const sq = squash((lt - at - 0.3) / 0.3); l.scale.set(2 - sq, sq, 1); });
          wall.items.forEach((gl, i) => { gl.rotation.z = Math.sin(i * 1.7) * 0.05 + (i === 44 ? Math.sin(lt * 5) * 0.1 : 0); });
        },
        // start on one pair and pull back until the wall is all there is
        camera: (lt) => { const k = ease(lt / 3.6), d = 40 + k * 190; return cam(V(-4 + 4 * k, 40 + k * 18, d), V(-4 + 4 * k, 40 + k * 16, 0), { fov: 30, focus: d, aperture: 0.0012 * (1 - k) + 0.0005 }); },
      };
    },
  },
  { // 8 — the prices
    speech: [{ id: 'price1', at: 0.3 }, 'price2'], gap: 0.35, tail: 0.9, noWipe: true,
    build() {
      const g = new THREE.Group();
      const back = new THREE.Mesh(new THREE.PlaneGeometry(300, 200), feltMat('#1b2a3a')); back.position.set(0, 60, -30); g.add(back);
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(300, 120), feltMat('#3a2a4a')); floor.rotation.x = -Math.PI / 2; floor.position.z = 20; floor.receiveShadow = true; g.add(floor);
      const cols = ['#f0027f', '#ffd166', '#3fc6a4'];
      const plinths = [-13, 0, 13].map((x, i) => { const p = lump(new THREE.CylinderGeometry(7, 7.6, 22 + (i === 1 ? 8 : 0), 40, 4), cols[i], { seed: 900 + i, lump: 0.18 }); p.position.set(x, (22 + (i === 1 ? 8 : 0)) / 2, i === 1 ? -4 : 2); g.add(p); return p; });
      const hero = glasses({ frame: '#1d1a22', smart: true, seed: 5 }); hero.scale.setScalar(3.2); hero.position.set(0, 35, -2); hero.rotation.y = 0.3; g.add(hero);
      const priceCard = (text, sub, bg) => {
        const m = new THREE.Mesh(new THREE.BoxGeometry(12, 7, 0.3), printMat(600, 350, (c, w, h) => { c.fillStyle = bg; c.fillRect(0, 0, w, h); c.fillStyle = '#1f1d33'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = `${h * 0.42}px Anton`; c.fillText(text, w / 2, h * 0.42); c.font = `${h * 0.14}px "Archivo Black"`; c.fillText(sub, w / 2, h * 0.8); }));
        m.castShadow = true; return m;
      };
      const tag = priceCard('$249', 'THE GLASSES', '#fff8ea'); tag.position.set(0, 25, 6); tag.rotation.x = -0.1; g.add(tag);
      const plans = [['FREE', 'THE AGENT'], ['$20', 'A MONTH'], ['$100', 'A MONTH']].map(([a, b], i) => { const m = priceCard(a, b, cols[(i + 1) % 3] === '#ffd166' ? '#fff3c4' : '#fff8ea'); m.position.set([-11, 0, 11][i], [26, 0, 26][i], 8); m.rotation.y = [0.25, 0, -0.25][i]; m.scale.setScalar(0.8); if (i === 1) m.position.set(0, 47, 2); g.add(m); return m; });
      const spot = new THREE.SpotLight('#fff0d0', 6000, 0, 0.35, 0.6, 1.4); spot.position.set(0, 110, 60); spot.target.position.set(0, 25, 0); spot.castShadow = true; g.add(spot, spot.target);
      return {
        group: g,
        update(lt, f, cast) {
          hero.rotation.y = Math.sin(lt * 0.8) * 0.5;
          // the three plans pop on "free", "twenty", "one hundred": fixed fractions of the second line
          plans.forEach((m, i) => { const at = this.p2at + [0.08, 0.42, 0.78][i] * this.p2dur; const k = eout((lt - at) / 0.25); m.visible = lt >= at; const sq = squash((lt - at - 0.2) / 0.3); m.scale.set(k * (2 - sq), k * sq, 1); });
          tag.visible = lt > 0.5; const sq = squash((lt - 0.7) / 0.3); tag.scale.set(2 - sq, sq, 1);
        },
        camera: (lt) => cam(V(0, 38, 112 - lt * 1.5), V(0, 30, 0), { fov: 30, focus: 112 - lt * 1.5, aperture: 0.0009 }),
        p2at: 0, p2dur: 4,
      };
    },
  },
  { // 9 — eyes shut, and the lamppost
    speech: [{ id: 'stop', at: 0.3 }, { id: 'lamp', at: 3.25 }], tail: 1.0, wipeIn: true,
    sfx: [...steps(2.0, 2.95, 1.6, -2.0 * 1.6), [2.95, 'bonk'], [3.2, 'beep']],
    build() {
      const s = streetShot({ lamps: [-60, 30, 58] });
      const pole = s.lamps[2];
      const ret = reticle('DOCTOR BOOKED', { w: 7, h: 30 }); ret.position.set(58, 17, 12); s.g.add(ret);
      const stars = new THREE.Group(); s.g.add(stars);
      for (let i = 0; i < 5; i++) { const st = lump(new THREE.OctahedronGeometry(0.9, 1), '#ffd166', { seed: 950 + i, lump: 0.05 }); stars.add(st); }
      return {
        group: s.g,
        update(lt, f, cast) {
          const walkK = lt > 2.0 && lt < 2.95 ? 1 : 0, x = 39 + clamp((lt - 2.0) / 0.95) * 14.6;
          const hit = lt >= 2.95, recoil = hit ? Math.exp(-(lt - 2.95) * 5) * Math.sin((lt - 2.95) * 18) * 0.6 : 0;
          s.man.position.set(x - (hit ? 1.4 * Math.exp(-(lt - 2.95) * 3) : 0), 1.4, 9); s.man.rotation.y = Math.PI / 2 - 0.05;
          s.man.rotation.z = recoil * 0.15;
          const shut = lt > 1.7 ? 1 : 0;
          s.man.userData.pose({ say: cast.say('MAN'), blink: shut, brow: shut ? (hit ? 1 : -0.2) : 0.3, mouth: hit ? 'open' : null, yaw: hit ? -0.3 : 0 });
          s.man.userData.walk((lt - 2.0) * 1.6, walkK);
          pole.rotation.z = hit ? Math.sin((lt - 2.95) * 30) * 0.02 * Math.exp(-(lt - 2.95) * 4) : 0;
          ret.visible = lt > 3.15; ret.scale.setScalar(1.5 - 0.5 * eout((lt - 3.15) / 0.3)); ret.children.at(-1).visible = lt > 4.3;
          stars.visible = hit && lt < 5.2;
          stars.children.forEach((st, i) => { const a = lt * 4 + i * 1.256; st.position.set(x + Math.cos(a) * 3.5, 23 + Math.sin(a * 2) * 0.5, 9 + Math.sin(a) * 3.5); st.rotation.y = lt * 6; });
          glanceLed(s.man, cast, f);
        },
        camera: (lt) => { const x = 39 + clamp((lt - 2.0) / 0.95) * 14.6; const sh = Math.max(0, 1 - Math.abs(lt - 2.95) * 6), r = rng(Math.floor(lt * 12)); return cam(V(x - 2 + (r() - 0.5) * sh * 1.5, 16 + (r() - 0.5) * sh * 1.5, 78), V(x + 3, 13, 6), { fov: 30, focus: 70, aperture: 0.0013 }); },
      };
    },
  },
  { // 10 — the host signs off
    speech: [{ id: 'close', at: 0.4 }], tail: 1.6, wipeIn: true,
    sfx: [],
    build() {
      const st = studio();
      const host = puppet(HOST); host.position.set(2, 7.4, -9); st.g.add(host);
      host.userData.reach(0, 0.55, 0.2); host.userData.reach(1, 0.55, 0.2);
      const specs = glasses({ frame: '#f0027f', smart: false, seed: 9 }); specs.visible = false; host.userData.head.add(specs); specs.position.set(0, 1.0, 3.55);
      return {
        group: st.g,
        update(lt, f, cast) {
          const say = cast.say('HOST'), after = !say && lt > 1;
          // on "good night" he puts on a pair of his own — and keeps looking at you
          specs.visible = lt > this.onAt;
          host.userData.pose({ say, blink: after ? (f % 12 < 2 ? 1 : 0) : blinkAt(f, 29, 3), brow: after ? 0.8 : 0.2, nod: say ? say[0] * 0.25 : 0, mouth: after ? 'wide' : null });
          st.toko.userData.blink(blinkAt(f, 19));
        },
        camera: (lt) => cam(V(1, 21, 56 - lt * 2), V(1, 17.5, -9), { fov: 30, focus: 63 - lt * 2, aperture: 0.0012 }),
        onAt: 3.0,
      };
    },
  },
];

/** the episode, with its voice: fetched lines give every shot its length */
export async function load(base = '../voice/you-looked-at-it/') {
  const res = await fetch(base + 'lines.json');
  const { lines } = await res.json();
  // the plan-dependent numbers two shots need (when the second price line starts, how long it runs)
  const byId = Object.fromEntries(lines.map((l) => [l.id, l]));
  const s8 = shots[7], p1 = byId.price1.dur;
  const build8 = s8.build;
  s8.build = function (stage) { const b = build8.call(this, stage); b.p2at = 0.3 + p1 + (s8.gap ?? 0.3); b.p2dur = byId.price2.dur; b.update = b.update.bind(b); return b; };
  const s10 = shots[9], build10 = s10.build;
  s10.build = function (stage) { const b = build10.call(this, stage); b.onAt = 0.4 + byId.close.dur * 0.78; b.update = b.update.bind(b); return b; };
  return { meta, shots, lines };
}
