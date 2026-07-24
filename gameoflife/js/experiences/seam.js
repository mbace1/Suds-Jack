// The Golden Seam — kintsugi. The player gathers the five shards of a
// broken tea bowl back from the void, chooses to hide the break or honor
// it, and watches the seams draw themselves in luminescent gold.
// Owner's design (2026-07 master doc); reference: ideas/ref/kintsugi-overflow.png.

import { PixelScreen } from '../pixel.js?v=14';
import { PAL } from '../palette.js?v=14';

const CX = 96, RIM_Y = 54, BASE_Y = 90, HALF_W = 32;
const GLAZE = '#3a3230', GLAZE_LIT = '#5a4e46', RIM = '#8a6f52', TEA = '#7a4f2e';
// slice boundaries in local x, and each shard's scattered offset in the void
const BOUNDS = [-32, -16, -3, 10, 21, 32];
const SCATTER = [[-38, -18], [-24, 26], [8, -34], [30, 22], [44, -8]];
const TAP_R = 16;

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
    let goldT = -1;         // seam-gilding animation clock, -1 = off
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

    function allPlaced() { return placed.every(Boolean); }

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
      }, 2200);
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

    // ── drawing ──────────────────────────────────────────────────
    // the bowl profile, column by column in local x
    function columnSpan(lx) {
      const a = Math.abs(lx);
      const top = RIM_Y + Math.round(a * a * 0.006);
      const bottom = a > 22 ? BASE_Y - Math.round((a - 22) * 1.6) : BASE_Y;
      return [top, bottom];
    }

    function drawShard(i, dx, dy) {
      for (let lx = BOUNDS[i]; lx < BOUNDS[i + 1]; lx++) {
        const [top, bottom] = columnSpanJag(lx, i);
        for (let y = top; y < bottom; y += 2) {
          let c = GLAZE;
          if (y < top + 4) c = RIM;                       // warm rim band
          else if (lx < -14 && y < top + 14) c = GLAZE_LIT;   // left sheen
          scr.px(CX + lx + dx, y + dy, 1, 2, c);
        }
        if (placed.every(Boolean) || dx === 0) {          // tea surface once whole
          if (lx > -24 && lx < 24) scr.px(CX + lx + dx, RIM_Y + 6 + dy, 1, 2, TEA);
        }
      }
    }

    // crack edges jag a little so the shards read as broken, not sliced
    function columnSpanJag(lx, i) {
      const [top, bottom] = columnSpan(lx);
      const nearL = lx - BOUNDS[i] < 2, nearR = BOUNDS[i + 1] - lx <= 2;
      if (nearL || nearR) return [top + ((lx * 7) % 3), bottom - ((lx * 5) % 3)];
      return [top, bottom];
    }

    function seamPath(b, fn) {
      // walk a crack boundary from rim to base, with a sideways wander
      const [top] = columnSpan(b);
      for (let y = top; y < BASE_Y; y++) {
        const wob = Math.round(Math.sin(y * 0.45 + b) * 1.6);
        fn(CX + b + wob, y);
      }
    }

    function draw(now, dt) {
      scr.clear(PAL.VOID);
      // the cloth the bowl rests on — a soft vignette island in the dark
      scr.disc(CX, 76, 52, '#241f1c');
      scr.disc(CX - 8, 74, 46, '#2a2420');
      scr.px(CX - 54, 92, 108, 6, '#1c1815');

      for (let i = 0; i < 5; i++) {
        if (placed[i]) drawShard(i, 0, 0);
        else drawShard(i, SCATTER[i][0], SCATTER[i][1]);  // adrift in the void
      }

      if (phase === 'clay') {
        // the hidden mend: hairlines barely there
        for (let k = 1; k < 5; k++) seamPath(BOUNDS[k], (x, y) => { if (y % 4 === 0) scr.px(x, y, 1, 1, '#453c38'); });
      }
      if (phase === 'gold' || phase === 'outro') {
        goldT += dt;
        const reach = RIM_Y + Math.max(0, (BASE_Y - RIM_Y) - goldT * 30);  // gold climbs from the base
        for (let k = 1; k < 5; k++) seamPath(BOUNDS[k], (x, y) => {
          if (y >= reach) {
            scr.px(x, y, 2, 1, PAL.GOLD_LUX);
            if ((x + y) % 5 === 0) scr.px(x + 1, y, 1, 1, '#fff2c0');
          }
        });
        // the glow breaks the frame: gold motes drifting out into the void
        const n = Math.min(18, Math.floor(goldT * 9));
        for (let i = 0; i < n; i++) {
          const th = i / 18 * Math.PI * 2 + goldT * 0.6;
          const rr = 46 + ((i * 31) % 26) + goldT * 8;
          scr.px(CX + Math.cos(th) * rr, 72 + Math.sin(th) * rr * 0.7, 2, 1, i % 3 ? PAL.GOLD_LUX : '#fff2c0');
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
