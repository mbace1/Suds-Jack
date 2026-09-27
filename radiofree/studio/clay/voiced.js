// The voiced clay cut: stop motion with a speaking cast.
//
// On top of cut.js it adds two things:
//
//   SPEECH   each shot lists the lines spoken in it; their lengths come from
//            the voice pipeline (studio/voice.py → voice/<ep>/lines.json), so
//            the picture is timed to the performance and not the other way
//            round. `update(lt, f, cast)` gets `cast.say(who)` — that
//            speaker's mouth for this exposure, or null when they are quiet.
//
//   THE CARD the subtitle is a piece of CARD, lit by its own little lamp and
//            drawn over the finished frame (after the lens blur, so it is
//            always sharp), sliding up on twos when a line starts. The paper
//            caption strip is gone from this cut.

import * as THREE from 'three';
import { makeStage } from './engine.js';
import { boilAll, feltNormal } from './clay.js';
import { timeline, wipe, WIPE } from '../film.js';
import { beginFrame, W, H } from '../paper.js';

export const EXPOSURES = 12;
const CHIP = { HOST: '#f0027f', MAN: '#2f6fd0', GLANCE: '#1bb7c9' };

/** lay the speech out on the timeline: shot lengths follow the voice */
export function schedule(shots, lines) {
  const byId = Object.fromEntries(lines.map((l) => [l.id, l]));
  let t = 0;
  const speech = [];
  const out = shots.map((s) => {
    let at = s.lead ?? 0.45, end = 0;
    for (const sp of s.speech || []) {
      const l = byId[typeof sp === 'string' ? sp : sp.id];
      const start = typeof sp === 'object' && sp.at != null ? sp.at : at;
      speech.push({ ...l, t0: t + start, shot: speech.length });
      end = start + l.dur; at = end + (s.gap ?? 0.3);
    }
    const dur = Math.max(s.min ?? 2.5, end + (s.tail ?? 0.7));
    const o = { ...s, dur, lines: speech.filter((x) => x.t0 >= t && x.t0 < t + dur) };
    t += dur;
    return o;
  });
  return { shots: out, speech, total: t };
}

function cardOverlay(renderer) {
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(30, W / H, 1, 200);
  scene.add(new THREE.HemisphereLight('#fff4e6', '#8a6a4a', 1.4));
  const key = new THREE.DirectionalLight('#fff1dc', 2.2); key.position.set(-3, 5, 6); scene.add(key);
  const c = document.createElement('canvas'); c.width = 1600; c.height = 420;
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.92, normalMap: feltNormal(), normalScale: new THREE.Vector2(0.25, 0.25), emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: 0.28, transparent: true });
  const card = new THREE.Mesh(new THREE.BoxGeometry(13.4, 3.52, 0.12), [null, null, null, null, mat, null].map((m) => m || new THREE.MeshStandardMaterial({ color: '#e9dcc4', roughness: 1 })));
  // a soft shadow behind it, so it sits ON the picture rather than in it
  const sc = document.createElement('canvas'); sc.width = sc.height = 128; const sg = sc.getContext('2d');
  const gr = sg.createRadialGradient(64, 64, 10, 64, 64, 64); gr.addColorStop(0, 'rgba(0,0,0,.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); sg.fillStyle = gr; sg.fillRect(0, 0, 128, 128);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(15.5, 5.4), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), transparent: true, depthWrite: false }));
  shadow.position.set(0.35, -0.45, -0.3);
  const holder = new THREE.Group(); holder.add(shadow, card); scene.add(holder);
  let drawn = null;
  function draw(line, desk) {
    const g = c.getContext('2d'), w = c.width, h = c.height;
    g.clearRect(0, 0, w, h);
    g.fillStyle = '#fbf3e4'; g.beginPath(); g.roundRect(0, 0, w, h, 34); g.fill();
    // fibres and a torn-looking top edge, drawn not photographed
    for (let i = 0; i < 1400; i++) { g.fillStyle = `rgba(${Math.random() > 0.5 ? '120,90,50' : '255,255,255'},${Math.random() * 0.08})`; g.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * 6, 1); }
    const chip = line.who === 'HOST' ? 'RADIO FREE HELSINKI' : line.who;
    g.font = '64px "Archivo Black"'; const cw = g.measureText(chip).width + 60;
    g.fillStyle = CHIP[line.who] || '#333'; g.beginPath(); g.roundRect(46, 36, cw, 92, 22); g.fill();
    g.fillStyle = '#fff'; g.textBaseline = 'middle'; g.fillText(chip, 76, 84);
    if (line.who === 'HOST') { g.fillStyle = '#6a5a4a'; g.font = '44px "Space Grotesk"'; g.fillText(desk, 46 + cw + 30, 86); }
    g.fillStyle = '#1f1d33'; let fs = 92; g.font = `${fs}px "Archivo Black"`;
    const words = line.text.split(' '); let lines;
    for (;;) { lines = []; let cur = ''; for (const wd of words) { const tt = cur ? cur + ' ' + wd : wd; if (g.measureText(tt).width > w - 110 && cur) { lines.push(cur); cur = wd; } else cur = tt; } lines.push(cur); if (lines.length <= 2 || fs < 60) break; fs -= 6; g.font = `${fs}px "Archivo Black"`; }
    lines.forEach((l, i) => g.fillText(l, 50, 208 + i * fs * 1.08 + (lines.length === 1 ? 40 : 0)));
    tex.needsUpdate = true;
  }
  return {
    render(line, k, desk, top) {
      if (!line || k <= 0) return;
      if (drawn !== line.id) { draw(line, desk); drawn = line.id; }
      const hVis = 2 * 50 * Math.tan(15 * Math.PI / 180);
      const y = top ? hVis / 2 - 3.2 : -hVis / 2 + 3.0;
      holder.position.set(0, y + (1 - k) * (top ? 6 : -6), -50);
      holder.rotation.z = (1 - k) * 0.08 + (top ? 0.01 : -0.012);
      renderer.autoClear = false; renderer.clearDepth();
      renderer.render(scene, cam);
      renderer.autoClear = true;
    },
  };
}

export function makeVoicedFilm(ep) {
  const stage = makeStage({ width: W, height: H });
  const plan = schedule(ep.shots, ep.lines);
  const tl = timeline({ shots: plan.shots });
  const built = new Map();
  const card = cardOverlay(stage.renderer);
  const out = document.createElement('canvas'); out.width = W; out.height = H;
  const ctx = out.getContext('2d');
  const shotAt = (t) => tl.shots.find((s) => t < s.start + s.dur) || tl.shots[tl.shots.length - 1];
  const set = (i) => { if (!built.has(i)) { const b = tl.shots[i].build(stage); stage.scene.add(b.group); built.set(i, b); } return built.get(i); };
  const speaking = (t) => plan.speech.find((l) => t >= l.t0 && t < l.t0 + l.dur + 0.05) || null;

  return {
    tl, plan, canvas: out, stage,
    frame(t) {
      const f = Math.floor(t * EXPOSURES + 1e-6), tq = f / EXPOSURES;
      const shot = shotAt(tq), lt = tq - shot.start, b = set(shot.i);
      for (const [i, o] of built) o.group.visible = i === shot.i;
      const line = speaking(tq);
      const cast = {
        line,
        say(who) {
          if (!line || line.who !== who) return null;
          return line.mouth[Math.min(line.mouth.length - 1, Math.floor((tq - line.t0) * EXPOSURES))] || [0, 0];
        },
      };
      b.update(lt, f, cast);
      const c = b.camera(lt);
      stage.shoot(c.pos, c.look, c);
      boilAll(b.group, f);
      stage.render(f);
      // the card: over the finished, blurred frame, so it is always sharp
      const shown = line || plan.speech.find((l) => tq >= l.t0 + l.dur && tq < l.t0 + l.dur + 0.35 && l.t0 >= shot.start);
      if (shown && !shot.noCard) card.render(shown, Math.min(1, (tq - shown.t0) * 3 + 0.001), ep.meta.desk, shot.cardTop);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(stage.renderer.domElement, 0, 0);
      beginFrame();
      const next = tl.shots[shot.i + 1];
      if (shot.wipe !== false) {
        if (lt < WIPE / 2 && shot.i > 0 && tl.shots[shot.i].wipeIn !== false) wipe(ctx, 0.5 + lt / WIPE, shot.i);
        else if (next && next.wipeIn !== false && shot.dur - lt < WIPE / 2) wipe(ctx, 0.5 - (shot.dur - lt) / WIPE, next.i);
      }
      return f;
    },
  };
}
