// THE BARGAIN BIN — re-shot in plasticine.
//
// Same script, timings, captions and sound cues as the paper cut
// (`bargain-bin.js`), so the two can be compared on the picture alone; this
// file only adds the SETS. A shot's `build(stage)` makes its set once and
// returns `{ group, update(lt, f), camera(lt) }` — `update` animates it on
// twos (lt is already quantised to 1/12 s), `camera` says where the lens is.

import * as THREE from 'three';
import { shots as paper, meta as paperMeta } from './bargain-bin.js';
import { lump, clayText, feltMat, cardMat, woodMat, printMat, rng } from '../clay/clay.js';
import {
  customer, brainJar, priceTag, shelf, room, exitDoor, coinStack, stampArm, padlock, chain, balloon,
  sunburst, tokoBadge, awning, bunting, banner, cloud, clayPie, tumbleweed, flag, SKIN,
} from '../clay/puppets.js';

export const meta = { ...paperMeta, id: 'bargain-bin-clay' };

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ease = (k) => (k = clamp(k), k * k * (3 - 2 * k));
const eout = (k) => 1 - (1 - clamp(k)) ** 3;
const ein = (k) => clamp(k) ** 3;
/** the squash a clay thing makes when it lands: 1 at rest, flattens, recovers */
const squash = (k) => (k <= 0 || k >= 1 ? 1 : 1 - Math.sin(k * Math.PI) * 0.28 * (1 - k));
/** an animator's hand between exposures: a hair of drift, different each frame */
function handled(obj, f, amt = 0.04) {
  const r = rng(f * 131 + (obj.id || 1));
  obj.rotation.z = (obj.userData.rz || 0) + (r() - 0.5) * amt * 0.06;
  obj.position.x = (obj.userData.px ?? obj.position.x) + (r() - 0.5) * amt;
  obj.userData.px ??= obj.position.x;
}
const cam = (pos, look, o = {}) => ({ pos, look, ...o });

const CROWD = [
  { sweater: '#3f6fd0', skin: SKIN[0], hair: '#2b1d1a', style: 0 },
  { sweater: '#6c4fd6', skin: SKIN[1], hair: '#7a3b1e', style: 2 },
  { sweater: '#2fb58c', skin: SKIN[2], hair: '#e0a83a', style: 1 },
  { sweater: '#e2573e', skin: SKIN[3], hair: '#15110f', style: 1 },
];

// ── sets shared by more than one shot ──────────────────────────────────────
function shopShelf(stage, { tags = true } = {}) {
  const g = new THREE.Group();
  g.add(room({ w: 160, h: 130 }));
  const sh = shelf(76); sh.position.set(0, 30, -5); g.add(sh);
  const jars = [-22, 0, 22].map((x, i) => { const j = brainJar({ seed: i + 1 }); j.position.set(x, 30.8, -5); g.add(j); return j; });
  const tagList = tags ? ['CHEAP', 'CHEAPER', 'CHEAPEST'].map((s, i) => {
    const t = priceTag(s, { color: i === 1 ? '#ffd166' : '#fff8ea' }); t.position.set(-22 + i * 22, 30, 1.4); g.add(t); return t;
  }) : [];
  const ban = banner(46, 13, (c, w, h) => {
    c.fillStyle = '#c62f2f'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#fff4e0'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = `${h * 0.5}px Anton`; c.fillText('CLEARANCE!', w / 2, h * 0.38);
    c.font = `${h * 0.17}px "Archivo Black"`; c.fillText('ALL THINKING MUST GO', w / 2, h * 0.8);
  });
  ban.position.set(0, 54, -9); g.add(ban);
  const bun = bunting(-45, 45, 68, -8); g.add(bun);
  return { g, jars, tagList, ban, bun };
}
function shopFloor() {
  const g = new THREE.Group();
  g.add(room({ w: 170, h: 120 }));
  return g;
}

// ── the shots ──────────────────────────────────────────────────────────────
const sets = [
  { // 1 — title: the shop front, the sign's letters dropping in one by one
    build() {
      const g = new THREE.Group();
      const facade = new THREE.Mesh(new THREE.BoxGeometry(160, 130, 2), cardMat('#2b2a5c')); facade.position.set(0, 55, -14); facade.receiveShadow = true; g.add(facade);
      const street = new THREE.Mesh(new THREE.PlaneGeometry(200, 100), cardMat('#8e8a99')); street.rotation.x = -Math.PI / 2; street.position.z = 30; street.receiveShadow = true; g.add(street);
      const kerb = new THREE.Mesh(new THREE.BoxGeometry(200, 2, 12), cardMat('#b9b4c2')); kerb.position.set(0, 1, -6); kerb.receiveShadow = kerb.castShadow = true; g.add(kerb);
      // the window: a warm lit box with three jars in it
      const win = new THREE.Mesh(new THREE.BoxGeometry(46, 30, 1), new THREE.MeshStandardMaterial({ color: '#3b2f52', emissive: '#6a3f7a', emissiveIntensity: 0.25, roughness: 0.9 })); win.position.set(0, 22, -12.6); g.add(win);
      const sill = new THREE.Mesh(new THREE.BoxGeometry(50, 2, 8), woodMat()); sill.position.set(0, 7.5, -9); sill.castShadow = sill.receiveShadow = true; g.add(sill);
      const jars = [-13.5, 0, 13.5].map((x, i) => { const j = brainJar({ seed: i + 4 }); j.scale.setScalar(0.8); j.position.set(x, 8.5, -9); g.add(j); return j; });
      const aw = awning(58, 7); aw.position.set(0, 44, -13); g.add(aw);
      const board = new THREE.Mesh(new THREE.BoxGeometry(50, 30, 2.5), woodMat()); board.position.set(0, 66, -12); board.castShadow = board.receiveShadow = true; g.add(board);
      const w1 = clayText('BARGAIN', { size: 7.2, depth: 2.6, color: '#ffd166', seed: 11 }); w1.position.set(0, 68, -10); g.add(w1);
      const w2 = clayText('BIN', { size: 8.5, depth: 2.6, color: '#ff6b5b', seed: 21 }); w2.position.set(0, 56.5, -10); g.add(w2);
      const word = { userData: { letters: [...w1.userData.letters, ...w2.userData.letters] } };
      const sub = new THREE.Mesh(new THREE.BoxGeometry(46, 3.6, 0.4), printMat(1024, 80, (c, w, h) => {
        c.fillStyle = '#23233a'; c.fillRect(0, 0, w, h); c.fillStyle = '#fbf3e4'; c.font = `${h * 0.62}px "Archivo Black"`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('INTELLIGENCE CO. · EST. LAST TUESDAY', w / 2, h * 0.55);
      })); sub.position.set(0, 49.2, -10.5); g.add(sub);
      const L = word.userData.letters; L.forEach((l) => { l.userData.y0 = l.position.y; });
      return {
        group: g,
        update(lt, f) {
          L.forEach((l, i) => {
            const at = 0.35 + i * 0.12, k = (lt - at) / 0.4;
            l.visible = k > 0;
            l.position.y = l.userData.y0 + (1 - eout(k)) * 40;
            const sq = squash((lt - at - 0.3) / 0.35); l.scale.set(2 - sq, sq, 1);
          });
          jars.forEach((j, i) => handled(j, f + i, 0.03));
        },
        camera: (lt) => cam(V(0, 40 + lt * 0.6, 150 - lt * 6), V(0, 44, -10), { fov: 32, focus: 150 - lt * 6 + 10, aperture: 0.0009 }),
      };
    },
  },
  { // 2 — the shelf, CHEAP / CHEAPER / CHEAPEST
    build() {
      const s = shopShelf();
      return {
        group: s.g,
        update(lt, f) { s.bun.userData.sway(lt); s.tagList.forEach((t, i) => { t.rotation.z = Math.sin(lt * 2.4 + i) * 0.06; }); s.ban.rotation.z = Math.sin(lt * 1.3) * 0.012; },
        camera: (lt) => cam(V(-12 + lt * 4, 40, 124), V(-6 + lt * 2.4, 31, 0), { fov: 30, focus: 126, aperture: 0.0012 }),
      };
    },
  },
  { // 3 — the stamp comes down: ×2.3, then ×4.5
    build() {
      const s = shopShelf();
      const arm = stampArm(); s.g.add(arm);
      let stamped = [false, false];
      return {
        group: s.g,
        update(lt, f) {
          s.bun.userData.sway(lt);
          // down on the left tag at 1.25, up, over, down on the right at 2.95
          const d1 = lt < 1.25 ? ein((lt - 0.55) / 0.7) : 1 - eout((lt - 1.4) / 0.5);
          const d2 = lt < 2.95 ? ein((lt - 2.25) / 0.7) : 1 - eout((lt - 3.1) / 0.6);
          const onLeft = lt < 2.0, d = clamp(onLeft ? d1 : d2), x = onLeft ? -22 : 22;
          arm.position.set(x, 24.5 + (1 - d) * 60, 2.8);
          arm.scale.y = lt > 1.25 && lt < 1.45 || lt > 2.95 && lt < 3.15 ? 0.9 : 1;
          if (lt >= 1.25 && !stamped[0]) { s.tagList[0].userData.stamp('×2.3'); stamped[0] = true; }
          if (lt >= 2.95 && !stamped[1]) { s.tagList[2].userData.stamp('×4.5'); stamped[1] = true; }
          s.tagList.forEach((t, i) => { const hit = i === 0 ? 1.25 : i === 2 ? 2.95 : 99; t.rotation.z = Math.sin((lt - hit) * 14) * 0.2 * Math.exp(-Math.max(0, lt - hit) * 3) * (lt > hit ? 1 : 0); });
        },
        camera: (lt) => {
          const shake = [1.25, 2.95].reduce((a, h) => a + Math.max(0, 1 - Math.abs(lt - h) * 7), 0);
          const r = rng(Math.floor(lt * 12) + 5);
          // held on the left tag for the first slam, then a whip across to the right
          const x = -22 + 44 * ease((lt - 1.75) / 0.5);
          return cam(V(x + (r() - 0.5) * shake * 1.6, 36 + (r() - 0.5) * shake * 1.6, 92), V(x, 26, 0), { fov: 30, focus: 90, aperture: 0.0013 });
        },
        reset() { stamped = [false, false]; },
      };
    },
  },
  { // 4 — the exit opens; they all look
    build() {
      const g = shopFloor();
      const door = exitDoor(); door.position.set(9, 0, 0); g.add(door);
      const people = CROWD.map((c, i) => { const p = customer({ ...c, seed: i + 1 }); p.position.set(-10 + i * 4.2, 0, 34 - i * 9.5); p.rotation.y = 0.35; g.add(p); return p; });
      return {
        group: g,
        update(lt, f) {
          door.userData.set(ease((lt - 0.9) / 1.4));
          const look = ease((lt - 1.6) / 0.5);
          people.forEach((p, i) => {
            const k = ease((lt - 1.6 - i * 0.12) / 0.5);
            p.userData.pose({ look: k * 0.9, yaw: k * 0.55, brow: k * 0.9, mouth: k > 0.5 ? 'o' : 'flat', blink: (f + i * 5) % 29 === 0 ? 1 : 0 });
            handled(p, f + i, 0.05);
          });
        },
        camera: (lt) => cam(V(-9, 26, 118 - lt * 2), V(-2, 20, 0), { fov: 32, focus: 92, aperture: 0.0012 }),
      };
    },
  },
  { // 5 — nobody left: a tumbleweed rolls past the open door
    build() {
      const g = shopFloor();
      const door = exitDoor(); door.position.set(9, 0, 0); door.userData.set(1); g.add(door);
      const tw = tumbleweed(); tw.position.set(9, 4.5, -10.2); g.add(tw);
      const people = CROWD.map((c, i) => { const p = customer({ ...c, seed: i + 1 }); p.position.set(-10 + i * 4.2, 0, 34 - i * 9.5); p.rotation.y = 0.35; g.add(p); return p; });
      return {
        group: g,
        update(lt, f) {
          const u = (lt - 0.3) / 2.6;
          tw.visible = u > 0 && u < 1;
          tw.position.x = 9 + 7 - u * 14; tw.position.y = 4.5 + Math.abs(Math.sin(u * 9)) * 2.5; tw.rotation.z = u * 9;
          people.forEach((p, i) => {
            const back = 1 - ease(lt / 0.5);
            p.userData.pose({ look: back * 0.9, yaw: back * 0.55, brow: 0, mouth: 'flat', sip: i === 2 ? (lt - 2.6) / 1.2 : 0, blink: (f + i * 7) % 23 === 0 ? 1 : 0 });
            handled(p, f + i, 0.05);
          });
        },
        camera: (lt) => cam(V(-2, 26, 112), V(2, 20, 0), { fov: 32, focus: 92, aperture: 0.0012 }),
      };
    },
  },
  { // 6 — the money: coin stacks, a clay pie, ×2
    build() {
      const g = new THREE.Group();
      const burst = sunburst('#ffd166', '#ffe08f', 22, 220); burst.position.set(0, 40, -30); g.add(burst);
      const table = new THREE.Mesh(new THREE.BoxGeometry(170, 3, 90), woodMat()); table.position.set(0, -1.5, 10); table.receiveShadow = true; g.add(table);
      const before = coinStack(8, { seed: 1 }); before.position.set(-9, 0, 6); g.add(before);
      const after = coinStack(16, { seed: 2 }); after.position.set(8, 0, 6); g.add(after);
      const coins = after.children; // coin, rim pairs
      const fb = flag(15, 6, (c, w, h) => label(c, w, h, 'BEFORE', '<$500M', '#2b2a5c')); fb.position.set(-20, 0, 12); fb.rotation.y = 0.2; g.add(fb);
      const fa = flag(15, 6, (c, w, h) => label(c, w, h, 'NOW', '$500M', '#f0027f')); fa.position.set(-2, 0, 24); fa.rotation.y = -0.1; g.add(fa);
      const pie = new THREE.Group(); pie.position.set(10, 38, -6); pie.rotation.x = 1.25; pie.scale.setScalar(0.8); g.add(pie);
      const pieLabel = flag(14, 5, (c, w, h) => label(c, w, h, 'GROSS MARGIN', '0%', '#2fb58c')); pieLabel.position.set(3, 18, -8); g.add(pieLabel);
      const x2 = clayText('×2', { size: 10, depth: 3.5, color: '#f0027f', seed: 30 }); x2.position.set(-11, 32, -4); g.add(x2);
      let lastPie = -1, lastN = -1;
      return {
        group: g,
        update(lt, f) {
          burst.rotation.z = lt * 0.04;
          const n = Math.round(8 + 8 * ease((lt - 1.4) / 1.3));
          coins.forEach((c, i) => { const idx = Math.floor(i / 2); c.visible = idx < n; });
          if (n !== lastN) { lastN = n; const v = 0.5 + 0.5 * (n - 8) / 8; fa.userData.redraw((c, w, h) => label(c, w, h, 'NOW', v >= 0.999 ? '$1B' : '$' + Math.round(v * 1000) + 'M', '#f0027f')); }
          const k = Math.min(0.829, Math.round(ease((lt - 2.4) / 1.2) * 82.9 * 2) / 200);   // lands on the real figure
          if (k !== lastPie) {
            lastPie = k; pie.clear(); if (k > 0) pie.add(clayPie(k));
            pieLabel.userData.redraw((c, w, h) => label(c, w, h, 'GROSS MARGIN', (k * 100).toFixed(1) + '%', '#2fb58c'));
          }
          pie.rotation.z = lt * 0.2;
          const p = (lt - 3.6) / 0.45; x2.visible = p > 0;
          const sq = squash((lt - 3.95) / 0.4); x2.scale.set(eout(p) * (2 - sq), eout(p) * sq, eout(p));
        },
        camera: (lt) => cam(V(0, 22, 132 - lt * 2), V(0, 14, 0), { fov: 32, focus: 126, aperture: 0.0009 }),
      };
    },
  },
  { // 7 — the valuation balloon
    build() {
      const g = new THREE.Group(), world = new THREE.Group(); world.position.y = 0;
      const sky = new THREE.Mesh(new THREE.PlaneGeometry(260, 200), feltMat('#a9dcff')); sky.position.set(0, 60, -40); sky.receiveShadow = true; g.add(sky);
      for (const [y, z, c, s] of [[4, -20, '#8fd0a8', 1.2], [0, -6, '#5fb784', 1.4]]) {
        const hill = new THREE.Mesh(new THREE.SphereGeometry(60, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2).scale(s * 1.6, 0.35, 0.5), feltMat(c));
        hill.position.set(z > -10 ? 30 : -30, y, z); hill.receiveShadow = hill.castShadow = true; g.add(hill);
      }
      const ground = new THREE.Mesh(new THREE.PlaneGeometry(260, 100), feltMat('#4fa672')); ground.rotation.x = -Math.PI / 2; ground.position.z = 20; ground.receiveShadow = true; g.add(ground);
      const clouds = [[-30, 88, -30, 1.1], [34, 100, -32, 0.9], [22, 70, -25, 0.7]].map(([x, y, z, s], i) => { const c = cloud(i + 1, s * 1.3); c.position.set(x, y, z); g.add(c); return c; });
      const pumpBody = lump(new THREE.CylinderGeometry(4, 4.6, 12, 32), '#3f6fd0', { seed: 50, lump: 0.12 }); pumpBody.position.set(0, 6, 8); g.add(pumpBody);
      const handle = new THREE.Group(); g.add(handle);
      handle.add(Object.assign(new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 10, 12), new THREE.MeshStandardMaterial({ color: '#555', metalness: 0.6, roughness: 0.4 })), { castShadow: true }));
      const grip = lump(new THREE.CapsuleGeometry(1.1, 9, 6, 12).rotateZ(Math.PI / 2), '#23233a', { seed: 51 }); grip.position.y = 5; handle.add(grip);
      const bal = balloon('#ff5a4f'); g.add(bal);
      const text = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.55), new THREE.MeshBasicMaterial({ transparent: true, map: printMat(512, 220, (c, w, h) => {
        c.clearRect(0, 0, w, h); c.fillStyle = '#fff4ea'; c.font = `${h * 0.46}px Anton`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('VALUATION', w / 2, h * 0.3); c.font = `${h * 0.5}px Anton`; c.fillText('↑', w / 2, h * 0.78);
      }).map }));
      text.position.z = 0.93; bal.add(text);
      const string = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1, 6), new THREE.MeshStandardMaterial({ color: '#444', roughness: 1 })); g.add(string);
      const tg = priceTag('$7.5B', { color: '#ffd166' }); tg.position.set(0, 30, 10); g.add(tg);
      return {
        group: g,
        update(lt, f) {
          const r = 2 + 14 * eout((lt - 0.6) / 3.6);
          const pump = Math.abs(Math.sin(lt * 7)) * clamp((4.2 - lt) * 2);
          handle.position.set(0, 16 + pump * 4, 8);
          bal.scale.setScalar(r); bal.position.set(Math.sin(lt * 1.3) * 1.2, 16 + 6 + r * 1.05 + 8, 8);
          const top = 12, bot = bal.position.y - r * 1.05;
          string.position.set(bal.position.x / 2, (top + bot) / 2, 8); string.scale.y = Math.max(0.1, bot - top);
          clouds.forEach((c, i) => { c.position.x += 0; c.rotation.z = Math.sin(lt + i) * 0.02; });
          tg.rotation.z = Math.sin(lt * 2) * 0.1;
        },
        camera: (lt) => cam(V(0, 30, 150), V(0, 22, 0), { fov: 34, focus: 142, aperture: 0.0008 }),
      };
    },
  },
  { // 8 — the lock-in: chains from every laptop to the jar, and a padlock
    build() {
      const g = shopFloor();
      const sh = shelf(40); sh.position.set(0, 34, -5); g.add(sh);
      const jar = brainJar({ seed: 9 }); jar.scale.setScalar(1.25); jar.position.set(0, 34.8, -5); g.add(jar);
      const lock = padlock(); lock.position.set(0, 33, 3); g.add(lock);
      const people = CROWD.map((c, i) => { const p = customer({ ...c, seed: i + 1 }); p.position.set(-24 + i * 16, 0, 24 + (i % 2) * 4); p.rotation.y = (i - 1.5) * -0.12; g.add(p); return p; });
      const chains = people.map((p) => {
        const from = V(p.position.x, 9, p.position.z + 3.5), to = V(0, 33, 3);
        const mid = from.clone().lerp(to, 0.5); mid.y -= 5;
        const c = chain([from, mid, to], { links: 30 }); g.add(c); return c;
      });
      return {
        group: g,
        update(lt, f) {
          const k = ease((lt - 0.7) / 1.6);
          chains.forEach((c) => c.userData.grow(k));
          lock.position.y = 33 + (1 - eout((lt - 2.3) / 0.4)) * 60;
          lock.userData.set(clamp((lt - 2.7) * 8));
          const sq = squash((lt - 2.7) / 0.3); lock.scale.set(2 - sq, sq, 1);
          people.forEach((p, i) => { p.userData.pose({ look: 0, lookY: 0.6 * ease((lt - 2.8) / 0.4), brow: ease((lt - 2.8) / 0.4) * 1, mouth: lt > 2.8 ? 'o' : 'flat', blink: (f + i * 3) % 31 === 0 ? 1 : 0 }); handled(p, f + i, 0.04); });
        },
        camera: (lt) => {
          const shake = Math.max(0, 1 - Math.abs(lt - 2.7) * 8), r = rng(Math.floor(lt * 12) + 9);
          return cam(V((r() - 0.5) * shake, 42 + (r() - 0.5) * shake, 150), V(0, 34, 0), { fov: 32, focus: 128, aperture: 0.0009 });
        },
      };
    },
  },
  { // 9 — the station: Toko in clay on a felt sunburst
    build() {
      const g = new THREE.Group();
      const burst = sunburst('#f0027f', '#ff3a9d', 24, 220); burst.position.set(0, 40, -20); g.add(burst);
      const t = tokoBadge({ r: 13 }); t.position.set(0, 52, 0); g.add(t);
      const wa = clayText('RADIO FREE', { size: 4.3, depth: 1.8, color: '#fff8ea', seed: 40 }); wa.position.set(0, 30, 2); g.add(wa);
      const wb = clayText('HELSINKI', { size: 5, depth: 1.8, color: '#ffd166', seed: 50 }); wb.position.set(0, 22, 2); g.add(wb);
      const word = { userData: { letters: [...wa.userData.letters, ...wb.userData.letters] } };
      const desk = new THREE.Mesh(new THREE.BoxGeometry(34, 5.5, 0.4), printMat(1024, 166, (c, w, h) => {
        c.fillStyle = '#ffd166'; c.fillRect(0, 0, w, h); c.fillStyle = '#23233a'; c.font = `${h * 0.62}px "Archivo Black"`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('TECH DESK', w / 2, h * 0.55);
      })); desk.position.set(0, 16, 2); desk.castShadow = true; g.add(desk);
      const foot = new THREE.Mesh(new THREE.BoxGeometry(34, 4.6, 0.3), printMat(1200, 162, (c, w, h) => {
        c.fillStyle = '#23233a'; c.fillRect(0, 0, w, h); c.fillStyle = '#fbf3e4'; c.font = `${h * 0.3}px "Archivo Black"`; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText('REAL EVENTS · INVENTED NAMES', w / 2, h * 0.32); c.fillText('NOBODY REAL QUOTED', w / 2, h * 0.72);
      })); foot.position.set(0, 9, 2); g.add(foot);
      const L = word.userData.letters; L.forEach((l) => { l.userData.y0 = l.position.y; });
      return {
        group: g,
        update(lt, f) {
          burst.rotation.z = lt * 0.08;
          const p = eout(lt / 0.5), sq = squash((lt - 0.45) / 0.4);
          t.scale.set(p * (2 - sq), p * sq, p);
          t.rotation.y = Math.sin(lt * 1.6) * 0.18;
          t.userData.blink((f % 26) < 2 && lt > 1 ? 1 : 0);
          L.forEach((l, i) => { const k = (lt - 0.6 - i * 0.05) / 0.35; l.visible = k > 0; l.position.y = l.userData.y0 + (1 - eout(k)) * 25; });
          desk.visible = lt > 1.4; foot.visible = lt > 1.8;
        },
        camera: (lt) => cam(V(0, 36, 112 - lt * 2), V(0, 34, 0), { fov: 34, focus: 112, aperture: 0.0006 }),
        end: true,
      };
    },
  },
];

function label(c, w, h, top, big, bg) {
  c.fillStyle = '#fff8ea'; c.fillRect(0, 0, w, h);
  c.fillStyle = bg; c.fillRect(0, 0, w, h * 0.34);
  c.fillStyle = '#fff8ea'; c.font = `${h * 0.22}px "Archivo Black"`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(top, w / 2, h * 0.18);
  c.fillStyle = '#23233a'; c.font = `${h * 0.5}px Anton`; c.fillText(big, w / 2, h * 0.68);
}

export const shots = paper.map((s, i) => ({ dur: s.dur, cap: s.cap, capAt: s.capAt, sfx: s.sfx, end: s.end, build: sets[i].build }));
