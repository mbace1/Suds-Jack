// The Glass Plate — Palo Alto, 1878. Muybridge sets twelve tripwires across a
// track to settle a bet: are all four hooves ever off the ground at once? The
// player releases the horse, the wires fire the cameras in sequence, and one
// frozen frame catches what no eye ever had. Then: examine the stills, or spin
// them in a zoetrope and bring the horse back to life.
//
// Debuts the cinematic-letterbox format of the 2026-07 visual standard: a
// widescreen scene band framed by hard black bars in the void, with a gold
// breakout on the frame that proves the suspension.

import { PixelScreen, shade } from '../pixel.js?v=18';
import { PAL } from '../palette.js?v=18';

const SCENE_Y = 20, SCENE_H = 60, GROUND_Y = 74;   // the letterbox scene band
const STRIP_Y = 92;                                 // the developing filmstrip
const N = 6;                                        // captured frames
const WIRES = [30, 54, 78, 102, 126, 150];          // tripwire x-positions
const AIR_FRAME = 1;                                // the all-hooves-up pose

// six gallop poses — front-hoof & hind-hoof offsets from shoulder/hip, a lift
// of the whole body, and whether the horse is airborne (Muybridge's cycle)
const POSES = [
  { f: [7, 12],  h: [-7, 12], lift: 0, air: false },
  { f: [2, 5],   h: [3, 5],   lift: 5, air: true  },   // gathered — all four up
  { f: [9, 10],  h: [-3, 12], lift: 1, air: false },
  { f: [11, 7],  h: [-9, 9],  lift: 2, air: false },
  { f: [-3, 12], h: [-11, 11],lift: 0, air: false },
  { f: [4, 9],   h: [0, 7],   lift: 4, air: true  },
];

export const glass = {
  id: 'glass',
  kind: 'game',

  start(host, ctx) {
    const { t, audio, onComplete } = ctx;
    host.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'screen-wrap';
    host.appendChild(wrap);
    const textEl = document.createElement('div');
    textEl.className = 'exp-text';
    host.appendChild(textEl);
    const btnRow = document.createElement('div');
    btnRow.className = 'exp-buttons';
    host.appendChild(btnRow);

    const scr = new PixelScreen(wrap, 192, 128);
    let phase = 'intro';   // intro → run → reveal → examine|zoetrope → outro
    let horseX = -20;
    const shot = new Array(N).fill(null);   // captured pose index per frame
    let nextWire = 0;
    let zoeT = 0;
    let raf = 0, dead = false;
    let last = performance.now();

    function button(label, fn) {
      const b = document.createElement('button');
      b.className = 'btn';
      b.textContent = label;
      b.onclick = () => { audio.step(); fn(); };
      btnRow.appendChild(b);
    }

    textEl.textContent = t('gl.s1');
    button(t('gl.release'), () => {
      phase = 'run';
      horseX = -20; nextWire = 0;
      textEl.textContent = t('gl.running');
      btnRow.innerHTML = '';
    });

    function reveal() {
      phase = 'reveal';
      audio.chime();
      textEl.textContent = t('gl.reveal');
      btnRow.innerHTML = '';
      button(t('gl.examine'), () => {
        phase = 'examine';
        textEl.textContent = t('gl.examined');
        btnRow.innerHTML = '';
        button(t('ui.continue'), showOutro);
      });
      button(t('gl.spin'), () => {
        phase = 'zoetrope';
        zoeT = 0;
        audio.water();
        textEl.textContent = t('gl.spun');
        btnRow.innerHTML = '';
        button(t('ui.continue'), showOutro);
      });
    }

    function showOutro() {
      phase = 'outro';
      audio.chime();
      textEl.innerHTML = '';
      const a = document.createElement('p'); a.textContent = t('gl.outro');
      const b = document.createElement('p'); b.className = 'nature-note'; b.textContent = t('gl.nature');
      textEl.append(a, b);
      btnRow.innerHTML = '';
      button(t('ui.continue'), () => onComplete());
    }

    // ── drawing ──────────────────────────────────────────────────
    // a small galloping horse facing right, at (x, baseY), in the given pose
    function horse(x, baseY, pose, body, near, far) {
      const p = POSES[pose];
      const y = baseY - p.lift;
      const sh = [x - 6, y + 1], hip = [x + 7, y + 1];   // shoulder / hip roots
      // far legs first (darker), then body, then near legs (brighter)
      leg(hip[0] + 1, hip[1], p.h[0], p.h[1], far);
      leg(sh[0] + 1, sh[1], p.f[0], p.f[1], far);
      scr.rect(x - 11, y - 5, 23, 9, body, shade(body, 0.6));   // barrel
      scr.px(x + 9, y - 4, 4, 6, body);                          // rump
      // neck + head reaching forward
      scr.px(x - 13, y - 9, 4, 7, body);
      scr.px(x - 17, y - 10, 5, 4, body);                        // head
      scr.px(x - 18, y - 9, 2, 2, PAL.EDGE);                     // muzzle/eye ink
      scr.px(x - 12, y - 11, 3, 2, shade(body, 0.7));            // ear/mane
      // tail streaming back
      scr.px(x + 12, y - 4, 5, 2, shade(body, 0.75));
      scr.px(x + 15, y - 2, 3, 4, shade(body, 0.7));
      leg(hip[0], hip[1], p.h[0], p.h[1], near);
      leg(sh[0], sh[1], p.f[0], p.f[1], near);
    }
    function leg(x0, y0, dx, dy, c) {
      const n = Math.max(Math.abs(dx), Math.abs(dy), 1);
      for (let i = 0; i <= n; i++) scr.px(x0 + dx * i / n, y0 + dy * i / n, 2, 1, c);
    }

    function frameBox(i, fx, fy, w, h, big) {
      const lit = i === AIR_FRAME && shot[i] !== null;
      scr.rect(fx, fy, w, h, '#d8ccae', lit ? PAL.GOLD_LUX : shade('#d8ccae', 0.7));
      if (shot[i] === null) { scr.px(fx + 3, fy + h / 2, w - 6, 1, shade('#d8ccae', 0.8)); return; }
      // the developed still: a tiny horse, sepia, on a ground line
      scr.px(fx + 2, fy + h - 4, w - 4, 1, '#a8956e');
      horse(fx + w / 2, fy + h - 5, shot[i], '#6e5a3e', '#5a4a32', '#4a3c28');
      if (lit) scr.px(fx, fy - 2, w, 1, PAL.GOLD_LUX);   // the reveal marker
      if (big) scr.rect(fx, fy, w, h, undefined, PAL.CYAN_LUX);
    }

    function draw(now, dt) {
      scr.clear(PAL.VOID);
      // cinematic scene band (letterbox bars are the void above & below)
      scr.bands(0, SCENE_Y, scr.w, SCENE_H - 22, ['#b8a07a', '#c9b48a', '#d8c8a0']);  // dusty sky
      scr.px(0, GROUND_Y - 16, scr.w, 4, '#8a7a5a');                                   // far hills
      scr.rect(0, GROUND_Y - 12, scr.w, SCENE_Y + SCENE_H - (GROUND_Y - 12), '#a5885c', shade('#a5885c', 0.8)); // track
      scr.px(0, GROUND_Y, scr.w, 1, '#7a6242');                                        // the running line
      // the white measuring backdrop with numbered threads (Muybridge's fence)
      scr.px(20, GROUND_Y - 26, 152, 14, '#e8e0cc');
      for (let i = 0; i < N; i++) {
        const fired = i < nextWire;
        scr.px(WIRES[i], GROUND_Y - 26, 1, 26, fired ? shade('#e8e0cc', 0.7) : '#b8b0a0');  // thread
      }

      if (phase === 'intro') {
        horse(96, GROUND_Y, 0, '#3a2e22', '#2e241a', '#241c14');
      } else if (phase === 'run') {
        horseX += dt * 150;
        const pose = Math.floor((now / 90)) % N;
        horse(horseX, GROUND_Y, pose, '#3a2e22', '#2e241a', '#241c14');
        // trip the next wire as the horse reaches it → fire that camera
        if (nextWire < N && horseX >= WIRES[nextWire]) {
          shot[nextWire] = nextWire;   // curate: wire i keeps pose i (all six, incl. airborne)
          audio.plink();
          nextWire++;
        }
        if (horseX > 210) setTimeout(() => { if (!dead) reveal(); }, 400);
      } else if (phase === 'zoetrope') {
        zoeT += dt;
        // motion reborn from stills: cycle the poses into a galloping loop
        const pose = Math.floor(zoeT * 12) % N;
        horse(96, GROUND_Y, pose, '#3a2e22', '#2e241a', '#241c14');
        // a cyan spin-ring around the reborn horse (energy breaking the band)
        for (let i = 0; i < 10; i++) {
          const th = i / 10 * Math.PI * 2 + zoeT * 5;
          scr.px(96 + Math.cos(th) * 30, (GROUND_Y - 8) + Math.sin(th) * 14, 2, 1, i % 2 ? PAL.CYAN_LUX : '#8af2e8');
        }
      } else if (phase === 'examine') {
        // the airborne still, enlarged over the track, gold-proven
        frameBox(AIR_FRAME, 66, 30, 60, 40, true);
      }

      // the developing filmstrip along the bottom (not during the big examine)
      if (phase !== 'examine') {
        const fw = 28, gap = 2, total = N * fw + (N - 1) * gap, x0 = (scr.w - total) / 2;
        for (let i = 0; i < N; i++) frameBox(i, x0 + i * (fw + gap), STRIP_Y, fw, 22, false);
      }
    }

    function loop(now) {
      if (dead) return;
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      draw(now, dt);
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);

    return {
      destroy() {
        dead = true;
        cancelAnimationFrame(raf);
        scr.destroy();
        host.innerHTML = '';
      },
    };
  },
};
