// The Golden Seam — kintsugi. The player gathers the five shards of a broken
// tea bowl back from the void, chooses to hide the break or honor it, and
// watches the seams gild in gold while luminescent cyan tea overflows and
// breaks the frame. Rendering built to ideas/ref/kintsugi-overflow.png:
// a dithered Raku glaze with a full tonal ramp, a dusty vignette halo, gold
// veins with a bright core, amber tea, and a glowing cyan pour.

import { PixelScreen, shade, bayer, rampDither } from '../pixel.js?v=18';
import { PAL } from '../palette.js?v=18';

// hit-testing geometry — unchanged so the flow/coords stay stable
const CX = 96;
const BOUNDS = [-32, -16, -3, 10, 21, 32];
const SCATTER = [[-38, -18], [-24, 26], [8, -34], [30, 22], [44, -8]];
const TAP_R = 16;

// bowl geometry: a rounded chawan seen slightly from above
const RIM_CY = 50, RX = 34, RY = 11, H = 44;
const TRX = 27, TRY = 7, TCY = RIM_CY + 2;   // the tea ellipse

// tonal ramps (dark → light), stippled between steps by rampDither
const GLAZE = ['#1c1610', '#33281d', '#4e3d2c', '#6f5942', '#94785a', '#b89a74', '#dcc6a0'];
const RIMR  = ['#5a3f26', '#8a6640', '#b8905c', '#e4cfa0'];
const TEA   = ['#7a3410', '#a8551a', '#cf7a26', '#ecab4c'];
const INNER = '#201711';
const GOLD = PAL.GOLD_LUX, GOLD_CORE = '#fff2c0', GOLD_DARK = '#5a3a10';
const CYAN = PAL.CYAN_LUX, CYAN_HI = '#b8f8f0';

const ell = (lx, rx) => Math.sqrt(Math.max(0, 1 - (lx / rx) ** 2));

export const seam = {
  id: 'seam',
  kind: 'story',

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
    let phase = 'mend';     // mend → choose → clay → gold → outro
    const placed = [false, false, false, false, false];
    let goldT = -1;
    let raf = 0, dead = false;
    let last = performance.now();

    function button(label, fn) {
      const b = document.createElement('button');
      b.className = 'btn';
      b.textContent = label;
      b.onclick = () => { audio.step(); fn(); };
      btnRow.appendChild(b);
    }

    textEl.textContent = t('se.s1');
    const allPlaced = () => placed.every(Boolean);

    function showChoice() {
      phase = 'choose';
      textEl.textContent = t('se.s2');
      btnRow.innerHTML = '';
      button(t('se.choice.a'), () => {
        phase = 'clay';
        textEl.textContent = t('se.clay');
        btnRow.innerHTML = '';
        button(t('se.gild'), startGold);
      });
      button(t('se.choice.b'), startGold);
    }

    function startGold() {
      phase = 'gold';
      goldT = 0;
      audio.water();
      textEl.textContent = t('se.gold');
      btnRow.innerHTML = '';
      setTimeout(() => {
        if (dead) return;
        phase = 'outro';
        audio.chime();
        textEl.innerHTML = '';
        const a = document.createElement('p'); a.textContent = t('se.outro');
        const b = document.createElement('p'); b.className = 'nature-note'; b.textContent = t('se.nature');
        textEl.append(a, b);
        button(t('ui.continue'), () => onComplete());
      }, 2400);
    }

    function onTap(e) {
      if (dead || phase !== 'mend') return;
      const p = scr.toPixel(e);
      for (let i = 0; i < 5; i++) {
        if (placed[i]) continue;
        const midLx = (BOUNDS[i] + BOUNDS[i + 1]) / 2;
        const sx = CX + midLx + SCATTER[i][0], sy = 72 + SCATTER[i][1];
        if (Math.hypot(p.x - sx, p.y - sy) <= TAP_R) {
          placed[i] = true;
          audio.plink();
          if (allPlaced()) setTimeout(() => { if (!dead) showChoice(); }, 500);
          return;
        }
      }
    }
    scr.canvas.addEventListener('pointerdown', onTap);

    // ── rendering ────────────────────────────────────────────────
    // the dithered Raku glaze at a column/row: bright cream on the left,
    // near-black on the right, glossy vertical streaks, base a touch darker
    function glaze(lx, y, top, bottom) {
      const uh = (lx + RX) / (2 * RX), v = (y - top) / (bottom - top + 0.01);
      let u = 1 - uh * 0.86;
      u += 0.13 * Math.sin(lx * 0.8 + 1);            // broad glaze runs
      if (lx > -16 && lx < -5) u += 0.17;            // the glossy sheen
      u -= v * 0.12;                                 // base darker
      u -= 0.09 * Math.max(0, Math.sin(lx * 2.3));   // fine streaks
      return rampDither(GLAZE, u, CX + lx, y);
    }

    // one column of the outer wall + its front-lip highlight, offset (dx,dy)
    function bodyCol(lx, dx, dy) {
      if (Math.abs(lx) > RX) return;
      const s = ell(lx, RX);
      const fl = RIM_CY + RY * s, bot = RIM_CY + H * s;
      for (let y = Math.round(fl); y <= Math.round(bot); y++) {
        scr.px(CX + lx + dx, y + dy, 1, 1, glaze(lx, y, fl, bot));
      }
      const lip = rampDither(RIMR, 1 - (lx + RX) / (2 * RX), CX + lx, fl);
      scr.px(CX + lx + dx, Math.round(fl) - 1 + dy, 1, 2, lip);   // warm lip
    }

    // the opening: dark inner wall, then the amber tea, then a specular
    function interior() {
      for (let lx = -RX + 1; lx <= RX - 1; lx++) {
        const s = ell(lx, RX), bl = RIM_CY - RY * s, fl = RIM_CY + RY * s;
        for (let y = Math.round(bl); y <= Math.round(fl); y++) scr.px(CX + lx, y, 1, 1, INNER);
        scr.px(CX + lx, Math.round(bl), 1, 1, shade(rampDither(RIMR, 1 - (lx + RX) / (2 * RX), CX + lx, bl), 0.7)); // back lip
      }
      for (let lx = -TRX + 1; lx <= TRX - 1; lx++) {
        const s = ell(lx, TRX), y0 = TCY - TRY * s, y1 = TCY + TRY * s;
        for (let y = Math.round(y0); y <= Math.round(y1); y++) {
          const vv = (y - y0) / (y1 - y0 + 0.01);
          let u = 0.3 + vv * 0.55 + 0.12 * Math.max(0, Math.sin(lx * 0.5));
          scr.px(CX + lx, y, 1, 1, rampDither(TEA, u, CX + lx, y));
        }
        if (Math.abs(lx) < 16) scr.px(CX + lx, Math.round(y1) - 1, 1, 1, '#f0c060'); // front specular
      }
    }

    // an organic branching crack down the front face; cb(x, y, t) with t 0..1
    // from rim (0) to base (1) so the gilding can climb it
    function goldWalk(cb) {
      const N = 46;
      for (let i = 0; i <= N; i++) {
        const t = i / N;
        const lx = -4 - 8 * t + 4 * Math.sin(t * 7.5);   // wanders down the front-left
        const s = ell(lx, RX);
        const y = (RIM_CY + RY * s) + t * ((RIM_CY + H * s) - (RIM_CY + RY * s));
        cb(CX + lx, y, t);
        if (i === Math.floor(N * 0.42)) {                // a branch forks toward center
          for (let j = 0; j <= 18; j++) {
            const tb = j / 18, lxb = lx + 12 * tb + 2 * Math.sin(tb * 6);
            const sb = ell(lxb, RX);
            const yb = y + tb * ((RIM_CY + H * sb) - y) * 0.8;
            cb(CX + lxb, yb, 0.42 + tb * 0.5);
          }
        }
      }
    }

    // the cyan pour: a glowing stream over the front rim that runs down the
    // body and spills off the bottom edge into the void (breaks the frame)
    function cyanOverflow(now, k) {
      const px = CX + 8;
      // glow halo behind the stream
      scr.softDisc(px + 2, 96, 26 + k * 6, shade(CYAN, 0.5), 16);
      // the stream: a wavering column from the rim, past the base, off-screen
      for (let y = TCY; y < 128; y++) {
        if (y > TCY + (128 - TCY) * k) break;
        const w = 3 + Math.round(Math.sin(y * 0.3 + now / 120) * 1.5) + (y > 100 ? 1 : 0);
        const x = px + Math.round(Math.sin(y * 0.12 + now / 200) * 2);
        scr.px(x - w, y, w * 2, 1, CYAN);
        scr.px(x - 1, y, 2, 1, CYAN_HI);                 // bright core
        if ((y + Math.floor(now / 80)) % 3 === 0) scr.px(x + w - 1, y, 1, 1, CYAN_HI);
      }
      // splash where it meets the tea
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * Math.PI - Math.PI / 2, r = 5 + (Math.floor(now / 90) + i) % 5;
        scr.px(px + Math.cos(a) * r, TCY + Math.sin(a) * r * 0.6, 1, 1, i % 2 ? CYAN : CYAN_HI);
      }
    }

    function draw(now, dt) {
      scr.clear(PAL.VOID);
      // the dusty vignette halo the bowl floats in
      scr.softDisc(CX - 4, 64, 58, '#3e3038', 18);
      scr.softDisc(CX - 6, 62, 40, '#544452', 14);

      // outer wall, per slice (unplaced shards drift with their scatter offset)
      for (let i = 0; i < 5; i++) {
        const off = placed[i] ? [0, 0] : SCATTER[i];
        for (let lx = BOUNDS[i]; lx < BOUNDS[i + 1]; lx++) bodyCol(lx, off[0], off[1]);
      }
      if (allPlaced()) interior();

      if (phase === 'clay') {
        goldWalk((x, y) => { if (Math.floor(y) % 3 === 0) scr.px(x, y, 1, 1, shade(glaze(x - CX, y, RIM_CY, RIM_CY + H), 0.7)); });
      }
      if (phase === 'gold' || phase === 'outro') {
        goldT += dt;
        const reach = Math.min(1, goldT * 0.7);         // gilding climbs rim→base
        goldWalk((x, y, tt) => {
          if (tt > reach) return;
          scr.px(x - 2, y, 1, 1, GOLD_DARK);            // contact shadow
          scr.px(x - 1, y, 3, 1, GOLD);                 // the vein, bold
          scr.px(x, y, 1, 1, GOLD_CORE);                // bright core
        });
        const k = Math.min(1, Math.max(0, goldT - 0.9) / 1.5);
        if (k > 0) cyanOverflow(now, k);
        // gold motes lifting off into the void
        const n = Math.min(16, Math.floor(goldT * 7));
        for (let i = 0; i < n; i++) {
          const th = i / 16 * Math.PI * 2 + goldT * 0.5, rr = 44 + ((i * 31) % 24) + goldT * 6;
          scr.px(CX + Math.cos(th) * rr, 66 + Math.sin(th) * rr * 0.6, 1, 1, i % 3 ? GOLD : GOLD_CORE);
        }
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
