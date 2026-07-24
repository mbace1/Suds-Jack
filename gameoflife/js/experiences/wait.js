// Stand and Wait — a wisdom kernel. A misted hillside in the void; somewhere
// in it stands an old pine. You cannot hurry the mist — you press once, then
// only stand and wait while it thins and the tree resolves, fireflies lifting
// past the frame into the void. "Patience is not waiting for something to end;
// it is standing while it deepens." Built to ideas/ref/horizon-pine-vignette.png:
// a dithered blue vignette halo on pure black, a gnarled silver pine, glowing
// green fireflies that break the frame, and a lone star out in the dark.

import { PixelScreen, bayer, rampDither } from '../pixel.js?v=19';
import { PAL } from '../palette.js?v=19';

const WAIT_SEC = 9;                 // how long the mist takes to thin
// the vignette the scene floats in (soft organic blob, not jagged teeth)
const VCX = 96, VCY = 60, VRX = 84, VRY = 55;

// tonal ramps (dark → light), stippled between steps by rampDither
const SKY  = ['#0a1826', '#123049', '#1c4863', '#2a6079', '#3f7c92'];
const BARK = ['#242a30', '#3c434c', '#565f6b', '#727d8a', '#9aa6b4'];
const LEAF = ['#141f1b', '#1e3029', '#294338'];
const FIRE = PAL.LEAF_LUX, FIRE_CORE = '#eaffc0';

export const wait = {
  id: 'wait',
  kind: 'wisdom',

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
    let phase = 'intro';       // intro → wait → revealed → outro
    let waitT = 0, rev = 0;    // rev 0 (misted) → 1 (clear)
    let hurryT = 0;            // ms of the "keeps its own time" note left
    let raf = 0, dead = false;
    let last = performance.now();

    function button(label, fn) {
      const b = document.createElement('button');
      b.className = 'btn';
      b.textContent = label;
      b.onclick = () => { audio.step(); fn(); };
      btnRow.appendChild(b);
    }

    textEl.textContent = t('wa.s1');
    button(t('wa.begin'), startWait);

    function startWait() {
      phase = 'wait';
      waitT = 0;
      textEl.textContent = t('wa.hint');
      btnRow.innerHTML = '';
    }

    // tapping does nothing but earn a gentle reminder — you can't rush it
    function onTap() {
      if (phase !== 'wait') return;
      hurryT = 1600;
      textEl.textContent = t('wa.hurry');
    }
    scr.canvas.addEventListener('pointerdown', onTap);

    function reveal() {
      phase = 'revealed';
      audio.chime();
      textEl.textContent = t('wa.wisdom');
      button(t('ui.continue'), showOutro);
    }

    function showOutro() {
      phase = 'outro';
      textEl.innerHTML = '';
      const a = document.createElement('p'); a.textContent = t('wa.outro');
      const b = document.createElement('p'); b.className = 'nature-note'; b.textContent = t('wa.nature');
      textEl.append(a, b);
      btnRow.innerHTML = '';
      button(t('ui.continue'), () => onComplete());
    }

    // ── rendering ────────────────────────────────────────────────
    const inVignette = (x, y) => {
      const dx = (x - VCX) / VRX, dy = (y - VCY) / VRY;
      return dx * dx + dy * dy <= 1;
    };

    // the dithered night-sky interior: dark navy at the crown, lighter toward
    // the mist-line at the base — the atmosphere the tree stands in
    function skyFill() {
      for (let y = VCY - VRY; y <= VCY + VRY; y++) {
        const s = 1 - ((y - VCY) / VRY) ** 2;
        if (s <= 0) continue;
        const half = VRX * Math.sqrt(s);
        const u = (y - (VCY - VRY)) / (2 * VRY);       // 0 top → 1 base
        for (let x = VCX - half; x <= VCX + half; x++) {
          scr.px(x, y, 1, 1, rampDither(SKY, 0.15 + u * 0.85, x, y));
        }
      }
    }

    // one tapering, dithered-shaded limb from (x0,y0) toward (x1,y1)
    function limb(x0, y0, x1, y1, w0, w1) {
      const n = Math.max(2, Math.round(Math.hypot(x1 - x0, y1 - y0)));
      for (let i = 0; i <= n; i++) {
        const tt = i / n;
        const cx = x0 + (x1 - x0) * tt, cy = y0 + (y1 - y0) * tt;
        const w = Math.max(1, Math.round(w0 + (w1 - w0) * tt));
        for (let lx = -w; lx <= w; lx++) {
          const u = 0.35 + (lx / (w + 0.5)) * 0.4 + 0.15 * Math.sin(cy * 0.3);
          scr.px(cx + lx, cy, 1, 1, rampDither(BARK, u, cx + lx, cy));
        }
      }
    }

    // a dithered foliage clump — dark blue-green, denser core
    function clump(cx, cy, r) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const d = Math.hypot(dx, dy);
          if (d > r) continue;
          if (d < r - 2 || bayer(cx + dx, cy + dy) < (r - d) / 2.5) {
            scr.px(cx + dx, cy + dy, 1, 1, rampDither(LEAF, 1 - d / r, cx + dx, cy + dy));
          }
        }
      }
    }

    // the old pine: an S-curved trunk, splayed roots, a few limbs and crowns
    function pine() {
      // roots splaying at the base into the mist
      for (const [rx, ry] of [[-13, 122], [-7, 124], [6, 123], [13, 121], [18, 118]]) {
        limb(97, 111, 97 + rx, ry, 2, 1);
      }
      // the trunk, base → crown, wandering (S)
      const NT = 74, base = [97, 112], top = [88, 44];
      const pts = [];
      for (let i = 0; i <= NT; i++) {
        const tt = i / NT;
        const cx = base[0] + Math.sin(tt * 3.4) * 11 - tt * 10;
        const cy = base[1] + (top[1] - base[1]) * tt;
        const w = Math.max(1, Math.round((1 - tt) * 6 + 1));
        pts.push([cx, cy, w]);
      }
      for (let i = 1; i < pts.length; i++) {
        limb(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], pts[i - 1][2], pts[i][2]);
      }
      // branches reaching out to their foliage, off the upper trunk
      const branchAt = [
        [0.52, -26, -14, 5], [0.66, 22, -10, 4],
        [0.80, -20, -8, 3], [0.90, 14, -6, 3],
      ];
      for (const [ft, ox, oy, len] of branchAt) {
        const p = pts[Math.round(ft * NT)];
        const ex = p[0] + ox, ey = p[1] + oy;
        limb(p[0], p[1], ex, ey, Math.max(1, p[2] - 1), 1);
        clump(ex, ey - 2, 7 + len);
      }
      clump(top[0], top[1] - 4, 11);           // the crown
      clump(top[0] - 14, top[1] + 4, 8);
      clump(top[0] + 15, top[1] + 2, 8);
    }

    // the mist: a pale, near-opaque fog that hides the tree at rev 0 and thins
    // to nothing by rev 1 — drawn over the tree so it truly conceals, then clears.
    // Per-pixel and light-toned so the reveal reads as fog burning off, not noise.
    function mist(now) {
      const cover = 1 - rev;                 // 1 hidden → 0 revealed
      if (cover > 0.015) {
        for (let y = VCY - VRY; y <= VCY + VRY; y++) {
          for (let x = VCX - VRX; x <= VCX + VRX; x++) {
            if (!inVignette(x, y)) continue;
            // slow rolling banks so the fog has body and drifts as it thins
            const band = 0.62 + 0.38 * Math.sin(y * 0.06 + now / 1700 + Math.sin(x * 0.03));
            if (bayer(x, y) < cover * band * 1.2) {
              const u = (y - (VCY - VRY)) / (2 * VRY);
              scr.px(x, y, 1, 1, u > 0.6 ? '#c2d8e2' : '#9fbccb');
            }
          }
        }
      }
      // low ground-mist that lingers at the base even after the sky has cleared
      const lowD = (1 - rev * 0.55) * 0.8;
      for (let x = VCX - VRX; x <= VCX + VRX; x += 2) {
        for (let y = 98; y <= VCY + VRY; y += 2) {
          if (!inVignette(x, y)) continue;
          const drift = 0.5 + 0.5 * Math.sin(x * 0.05 + now / 1000);
          if (bayer(x + 1, y) < lowD * drift * ((y - 98) / 22)) scr.px(x, y, 2, 2, '#aecbd8');
        }
      }
    }

    // fireflies: glowing green motes that emerge as the mist thins and drift
    // out past the vignette boundary into the void (the breakout element)
    function fireflies(now) {
      const n = Math.floor(rev * 9);
      for (let i = 0; i < n; i++) {
        // spread wide — several drift into the void past the vignette (breakout)
        const px = 26 + (i * 53) % 150 + Math.sin(now / 900 + i * 2.1) * 11;
        const py = 58 + (i * 37) % 60 + Math.cos(now / 1100 + i * 1.7) * 9;
        const pulse = 0.5 + 0.5 * Math.sin(now / 300 + i);
        if (pulse < 0.25) continue;                 // blink off
        scr.softDisc(px, py, 3, '#2e5a1e', 3);      // dim green halo
        scr.px(px, py, 1, 1, FIRE);
        if (pulse > 0.7) scr.px(px, py, 1, 1, FIRE_CORE);
      }
    }

    // a lone star out in the void, keeping its own patient watch
    function voidStar(now) {
      const x = 170, y = 104, tw = 0.6 + 0.4 * Math.sin(now / 600);
      const c = tw > 0.8 ? '#eaf4f8' : '#9fb4c0';
      scr.px(x, y - 3, 1, 6, c); scr.px(x - 3, y, 6, 1, c);
      scr.px(x - 1, y - 1, 1, 1, c); scr.px(x + 1, y + 1, 1, 1, c);
      scr.px(x - 1, y + 1, 1, 1, c); scr.px(x + 1, y - 1, 1, 1, c);
    }

    function draw(now, dt) {
      if (phase === 'wait') {
        waitT += dt;
        rev = Math.min(1, waitT / WAIT_SEC);
        if (hurryT > 0) { hurryT -= dt * 1000; if (hurryT <= 0) textEl.textContent = t('wa.hint'); }
        if (waitT >= WAIT_SEC) reveal();
      } else if (phase !== 'intro') {
        rev = 1;
      }

      scr.clear(PAL.VOID);
      // the soft atmospheric halo the vignette feathers out of
      scr.softDisc(VCX, VCY + 2, VRX + 6, '#06111c', 22);
      skyFill();
      pine();
      mist(now);
      fireflies(now);
      voidStar(now);
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
