// The Seed — a wisdom kernel about the work you are not allowed to watch.
// You plant a seed and then four days and nights pass with nothing to see:
// bare soil, a sun, a moon, bare soil again. The only offered action is one
// drink of water, which the seed takes a mouthful of and no more. When the
// fourth morning finally shows a thread of green no taller than a fingernail,
// the soil is cut away — and the root that grew in the dark is longer than
// everything above it, running off the bottom of the frame into the void.
//
// Distinct from `lichen` (which recoils from touch) and `wait` (where the view
// clears): here the growth was never hidden by weather or spoiled by hands. It
// was simply underground, which is where growth usually is.

import { PixelScreen, shade, bayer, rampDither } from '../pixel.js?v=39';
import { PAL } from '../palette.js?v=39';

const DAYS = 4, DAY_SEC = 3.4;            // four day/night cycles ≈ 13.6 s
const VX = 20, VW = 152;                  // the vignette floating in the void
const SKY_Y = 12, GROUND = 70, SOIL_H = 44;
const SEED_X = 96, SEED_Y = 76;
const ROOT_MAX = 52;                      // 76 + 52 = 128: the root leaves the frame

// tonal ramps (dark → light), stippled between steps by rampDither
const EARTH = ['#241b14', '#35281d', '#4b3a29', '#634c36', '#7d6247'];
const CUT   = ['#120e0a', '#1b1510', '#261e16'];      // the exposed cross-section
const ROOT_PALE = '#d8c8a2', ROOT_DIM = '#9a8a68';
const GLOW = PAL.LEAF_LUX, GLOW_CORE = '#eaffc0';

// deterministic rootlets: {depth along the taproot, direction, length}
const ROOTLETS = [
  [8, -1, 9], [13, 1, 12], [19, -1, 14], [25, 1, 11],
  [30, -1, 16], [36, 1, 13], [41, -1, 10], [46, 1, 8],
];

export const seed = {
  id: 'seed',
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
    let phase = 'intro';        // intro → planted → dark → reveal → wisdom → outro
    let waitT = 0, dayIdx = 0;  // seconds waited, mornings seen
    let reveal = 0;             // 0 → 1, the soil cutting away
    let watered = false, noteT = 0;
    let waterBtn = null;
    let raf = 0, dead = false;
    let last = performance.now();

    function button(label, fn, cls = 'btn') {
      const b = document.createElement('button');
      b.className = cls;
      b.textContent = label;
      b.onclick = () => { audio.step(); fn(); };
      btnRow.appendChild(b);
      return b;
    }

    // ── flow ─────────────────────────────────────────────────────
    textEl.textContent = t('sd.s1');
    button(t('sd.plant'), plant);

    function plant() {
      phase = 'planted';
      audio.plink();
      textEl.textContent = t('sd.planted');
      btnRow.innerHTML = '';
      button(t('sd.wait'), beginWait);
    }

    // nothing here is skippable and nothing here can stall: the four mornings
    // arrive on the clock whether or not the player does anything at all
    function beginWait() {
      phase = 'dark';
      waitT = 0;
      btnRow.innerHTML = '';
      morning(1);
    }

    function morning(n) {
      dayIdx = n;
      noteT = 0;
      audio.plink();
      textEl.textContent = t(`sd.day${n}`);
      // the one thing a person is allowed to do — offered after the first
      // morning, so the first thing they do is nothing
      if (n === 1) {
        waterBtn = button(t('sd.water'), () => {
          watered = true;
          audio.water();
          noteT = 2.4;
          textEl.textContent = t('sd.watered');
          waterBtn.remove();
          waterBtn = null;
        });
      }
    }

    function startReveal() {
      phase = 'reveal';
      reveal = 0;
      if (waterBtn) { waterBtn.remove(); waterBtn = null; }
      textEl.textContent = t('sd.cut');
    }

    function showWisdom() {
      phase = 'wisdom';
      audio.chime();
      textEl.textContent = t('sd.wisdom');
      btnRow.innerHTML = '';
      button(t('ui.continue'), showOutro);
    }

    function showOutro() {
      phase = 'outro';
      textEl.innerHTML = '';
      const a = document.createElement('p');
      a.textContent = t('sd.outro');
      const b = document.createElement('p');
      b.className = 'nature-note';
      b.textContent = t('sd.nature');
      textEl.append(a, b);
      btnRow.innerHTML = '';
      button(t('ui.continue'), () => onComplete());
    }

    // ── the world ────────────────────────────────────────────────
    // how far the seedling has come: the root runs the whole time, the shoot
    // only breaks the surface on the last day (which is the point)
    const progress = () => Math.min(1, waitT / (DAYS * DAY_SEC));
    const rootLen = () => (phase === 'intro' || phase === 'planted' ? 0 : progress() * ROOT_MAX);
    const shootH = () => Math.max(0, (progress() - 0.72) / 0.28) * (watered ? 9 : 7);

    // soil in cross-section, dithered; the cut band widens as the reveal opens.
    // Grit is a per-pixel hash plus a slow swell — a single sine here read as
    // diagonal corduroy, which is a fabric, not a soil.
    function soil() {
      const cutW = reveal * 62, cutL = SEED_X - cutW / 2, cutR = SEED_X + cutW / 2;
      for (let y = GROUND; y < GROUND + SOIL_H; y++) {
        const depth = (y - GROUND) / SOIL_H;          // 0 surface → 1 deep
        for (let x = VX; x < VX + VW; x++) {
          if (x > cutL && x < cutR) {
            scr.px(x, y, 1, 1, rampDither(CUT, 0.75 - depth * 0.6, x, y));
            continue;
          }
          const grit = (((x * 73856093) ^ (y * 19349663)) >>> 0) % 997 / 997;
          const swell = 0.09 * Math.sin(x * 0.11 + y * 0.19);   // broad clumping
          scr.px(x, y, 1, 1, rampDither(EARTH, 0.85 - depth * 0.7 + (grit - 0.5) * 0.3 + swell, x, y));
        }
      }
      // small stones, skipped where the cross-section has been opened
      for (let i = 0; i < 14; i++) {
        const x = VX + 9 + (i * 37) % (VW - 18);
        const y = GROUND + 6 + (i * 13) % (SOIL_H - 10);
        if (x > cutL - 4 && x < cutR) continue;
        scr.rect(x, y, i % 3 ? 3 : 4, 2, i % 2 ? '#8a7a60' : '#5d4d3b', true);
      }
      // the cut walls, defined: a lit edge where the spade went through
      if (cutW > 2) {
        scr.px(cutL, GROUND, 1, SOIL_H, '#9a7c5a');
        scr.px(cutR, GROUND, 1, SOIL_H, '#6b5540');
      }
      scr.px(VX, GROUND, VW, 1, '#8d7052');           // the surface line
      scr.px(VX, GROUND - 1, VW, 1, shade('#8d7052', 0.7));
    }

    function sky(dayPhase) {
      const night = dayPhase > 0.55;
      if (!night) {
        scr.bands(VX, SKY_Y, VW, GROUND - SKY_Y, [PAL.SKY_DAY_TOP, '#93bfdd', PAL.SKY_DAY_LOW]);
        const u = dayPhase / 0.55;                    // the sun crosses west
        scr.disc(VX + 16 + u * (VW - 32), 44 - Math.sin(u * Math.PI) * 24, 6, PAL.SUN, true);
      } else {
        scr.bands(VX, SKY_Y, VW, GROUND - SKY_Y, ['#0a0c18', '#0e1220', '#131828']);
        for (let i = 0; i < 14; i++) {
          const x = VX + 7 + (i * 41) % (VW - 14);
          const y = SKY_Y + 4 + (i * 17) % (GROUND - SKY_Y - 10);
          scr.px(x, y, 1, 1, i % 4 ? '#6f7590' : '#a7adc4');
        }
        const u = (dayPhase - 0.55) / 0.45;
        const mx = VX + 20 + u * (VW - 40), my = 40 - Math.sin(u * Math.PI) * 18;
        scr.disc(mx, my, 5, PAL.PAPER_DIM, true);
        scr.disc(mx + 3, my - 2, 4, '#0e1220');       // the crescent bite
      }
    }

    function seedPx() {
      scr.rect(SEED_X - 2, SEED_Y - 2, 4, 3, '#4a3a28', '#2a2018');
      scr.px(SEED_X - 1, SEED_Y - 2, 2, 1, '#63503a');
    }

    // The root is only ever drawn through the cut — while the soil is whole,
    // it is exactly as visible as a real one, which is to say not at all. The
    // band widens from the taproot outwards, so the rootlets arrive last, and
    // anything below the soil block hangs in the open void.
    function root(now) {
      const len = rootLen();
      if (reveal <= 0 || len < 1) return;
      const cutW = reveal * 62, floor = GROUND + SOIL_H;
      const shown = (x, y) => y >= floor || Math.abs(x - SEED_X) < cutW / 2;
      for (let i = 0; i < len; i++) {
        const y = SEED_Y + 1 + i;
        const x = SEED_X + Math.round(Math.sin(i * 0.18) * 2);
        if (!shown(x, y)) continue;
        scr.px(x, y, 1, 1, ROOT_PALE);
        if (reveal > 0.3 && i % 3 === 0) scr.px(x, y, 1, 1, GLOW);
      }
      ROOTLETS.forEach(([d, dir, l], k) => {
        if (d > len) return;
        const grown = Math.min(l, len - d);
        for (let i = 0; i < grown; i++) {
          const x = SEED_X + dir * i + Math.round(Math.sin(d * 0.18) * 2);
          const y = SEED_Y + 1 + d + Math.round(i * 0.55);
          if (!shown(x, y)) continue;
          scr.px(x, y, 1, 1, ROOT_DIM);
          if (reveal > 0.5 && (i + k) % 4 === 0) scr.px(x, y, 1, 1, GLOW);
        }
      });
      // the tip, still going, past the bottom of the picture
      if (reveal > 0.2) {
        const ty = SEED_Y + 1 + len;
        scr.px(SEED_X - 1, ty, 2, 2, GLOW);
        if (Math.sin(now / 260) > 0) scr.px(SEED_X, ty, 1, 1, GLOW_CORE);
      }
    }

    function shoot(now) {
      const h = shootH();
      if (h < 1) return;
      for (let i = 0; i < h; i++) {
        scr.px(SEED_X, GROUND - 1 - i, 1, 1, i > h - 3 ? PAL.LEAF : PAL.MOSS);
      }
      if (h > 4) {
        const ty = GROUND - Math.round(h);
        scr.px(SEED_X - 3, ty + 1, 3, 1, PAL.LEAF);
        scr.px(SEED_X + 1, ty + 2, 3, 1, PAL.LEAF);
        if (watered) scr.px(SEED_X - 2, ty + 3, 2, 1, PAL.MOSS);
        if (Math.sin(now / 340) > 0.4) scr.px(SEED_X, ty, 1, 1, GLOW);
      }
    }

    function draw(now) {
      // the soil is 6.7k dithered pixels — it only changes while the
      // cross-section is opening, so it lives in the cached layer
      scr.cached(`soil:${Math.round(reveal * 14)}`, () => {
        scr.clear(PAL.VOID);
        scr.softDisc(96, 68, 92, '#0e0b08', 22);      // earthy halo in the void
        soil();
      });
      sky((waitT / DAY_SEC) % 1);
      seedPx();
      root(now);
      shoot(now);
    }

    function loop(now) {
      if (dead) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      if (phase === 'dark') {
        waitT += dt;
        const n = Math.min(DAYS, Math.floor(waitT / DAY_SEC) + 1);
        if (n > dayIdx) morning(n);
        else if (noteT > 0 && (noteT -= dt) <= 0) textEl.textContent = t(`sd.day${dayIdx}`);
        if (waitT >= DAYS * DAY_SEC) startReveal();
      } else if (phase === 'reveal') {
        reveal = Math.min(1, reveal + dt / 1.6);
        if (reveal >= 1) showWisdom();
      }

      draw(now);
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
