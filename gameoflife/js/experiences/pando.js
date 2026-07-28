// The Trembling Giant — Fishlake National Forest, Utah. A hillside of quaking
// aspen that looks like a forest and is not: some 47,000 white trunks, every one
// of them genetically identical, all of them stems of a single male tree sharing
// one root system under 43 hectares. It is among the heaviest living things ever
// weighed, and the roots are thousands of years old.
//
// The player does what a visitor does — picks out individual trees — and the
// reveal is underground: the ground goes transparent and one root system lights
// up in GOLD_LUX beneath every trunk they chose, running off both edges of the
// frame because it does not end where the picture does.
// Revert: find two trees that might be one.

import { PixelScreen, rampDither, shade } from '../pixel.js?v=41';
import { PAL } from '../palette.js?v=41';

const SKY = ['#5a7fa8', '#7ba0c2', '#9dc0d8', '#c2dae8'];
const BARK = ['#cfd6cf', '#e2e8df', '#f0f4ec'];    // aspen white, faintly green
const LEAF = ['#b8912c', '#d9b23c', '#f0d264'];    // late-September gold
const GROUND = '#4a4230', GROUND_DEEP = '#2e2a1e';
const ROOT = PAL.GOLD_LUX, ROOT_CORE = '#fff2c0';
const HORIZON = 84;

// the stand: x, how tall, how far up the hill (smaller + paler = further)
const TREES = [
  { x: 16, h: 44, d: 0.5 }, { x: 34, h: 56, d: 0.2 }, { x: 52, h: 38, d: 0.7 },
  { x: 70, h: 60, d: 0.1 }, { x: 88, h: 46, d: 0.4 }, { x: 106, h: 58, d: 0.15 },
  { x: 124, h: 40, d: 0.65 }, { x: 142, h: 54, d: 0.25 }, { x: 160, h: 44, d: 0.5 },
  { x: 176, h: 36, d: 0.75 },
];
const NEED = 4;          // how many you pick before the ground answers
const TAP_R = 12;

export const pando = {
  id: 'pando',
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
    let phase = 'intro';        // intro → pick → truth → outro
    const picked = new Set();
    let revealT = 0;            // grows the root system after the reveal
    let raf = 0, dead = false;
    let last = performance.now();

    function button(label, fn) {
      const b = document.createElement('button');
      b.className = 'btn';
      b.textContent = label;
      b.onclick = () => { audio.step(); fn(); };
      btnRow.appendChild(b);
    }

    textEl.textContent = t('pa.s1');
    button(t('pa.begin'), () => {
      phase = 'pick';
      textEl.textContent = t('pa.hint');
      btnRow.innerHTML = '';
    });

    function onTap(e) {
      if (dead || phase !== 'pick') return;
      const p = scr.toPixel(e);
      for (let i = 0; i < TREES.length; i++) {
        const tr = TREES[i];
        const baseY = HORIZON + tr.d * 26;
        if (Math.abs(p.x - tr.x) > TAP_R || p.y < baseY - tr.h - 8 || p.y > baseY + 4) continue;
        if (picked.has(i)) { audio.step(); textEl.textContent = t('pa.same'); return; }
        picked.add(i);
        audio.plink();
        const n = picked.size;
        textEl.textContent = n >= NEED
          ? t('pa.counted')
          : `${n}/${NEED} — ${t('pa.hint')}`;
        if (n >= NEED) setTimeout(() => { if (!dead) truth(); }, 900);
        return;
      }
    }
    scr.canvas.addEventListener('pointerdown', onTap);

    function truth() {
      phase = 'truth';
      revealT = 0;
      audio.water();
      textEl.textContent = t('pa.truth');
      btnRow.innerHTML = '';
      button(t('ui.continue'), () => {
        phase = 'outro';
        audio.chime();
        textEl.innerHTML = '';
        const a = document.createElement('p'); a.textContent = t('pa.outro');
        const b = document.createElement('p'); b.className = 'nature-note'; b.textContent = t('pa.nature');
        textEl.append(a, b);
        btnRow.innerHTML = '';
        button(t('ui.continue'), () => onComplete());
      });
    }

    // ── drawing ──────────────────────────────────────────────────
    function hill() {
      scr.bands(0, 0, scr.w, HORIZON - 10, SKY);
      // the far ridge, and the hill this stand stands on
      for (let x = 0; x < scr.w; x += 4) {
        const h = 10 + Math.round(6 * Math.sin(x * 0.04) + 3 * Math.sin(x * 0.11));
        scr.px(x, HORIZON - 10 - h, 4, h, '#4e6350');
      }
      scr.px(0, HORIZON - 10, scr.w, 128 - HORIZON + 10, GROUND);
      scr.px(0, HORIZON - 10, scr.w, 2, '#5d5540');
      // fallen gold on the slope
      for (let i = 0; i < 34; i++) {
        const x = (i * 23 + 5) % 190, y = HORIZON - 6 + (i * 7) % 30;
        scr.px(x, y, 2, 1, i % 3 ? '#8a7030' : '#a8863a');
      }
    }

    // one aspen: a white trunk with the dark scars aspens always carry, and a
    // crown that trembles — the tree is named for the way it never holds still
    function tree(tr, i, now) {
      const baseY = HORIZON + tr.d * 26;
      const near = 1 - tr.d;
      const w = 2 + Math.round(near * 2);
      const sway = Math.sin(now / 700 + i * 1.3) * (0.6 + near);
      const top = baseY - tr.h;
      for (let y = top; y <= baseY; y++) {
        const k = (y - top) / tr.h;
        const bend = sway * (1 - k) ** 2;                 // the top moves most
        for (let dx = 0; dx < w; dx++) {
          scr.px(tr.x + dx + bend, y, 1, 1,
            rampDither(BARK, 0.35 + near * 0.4 - dx / w * 0.35, tr.x + dx, y));
        }
        if ((y - top) % 11 === 4) scr.px(tr.x + bend, y, w, 2, '#6f7a70');   // the eye scars
      }
      // the crown: a FILLED cloud of gold, not a ring — walking the rim of a
      // circle leaves a halo floating over the trunk instead of foliage on it.
      // It shivers a beat behind the trunk, which is what quaking aspen does.
      // Aspen crowns are NARROW and upright, and in a stand this dense they
      // interlock into a canopy — round balls on sticks read as lollipops.
      const cw = 6 + Math.round(near * 4);        // half-width
      const ch = 13 + Math.round(near * 10);      // half-height, taller than wide
      const cyc = top + ch * 0.35;                // pulled down onto the trunk
      for (let dy = -ch; dy <= ch * 0.75; dy++) {
        for (let dx = -cw; dx <= cw; dx++) {
          const d = Math.hypot(dx / cw, dy / ch);
          if (d > 1) continue;
          if (d > 0.5 && ((dx * 7 + dy * 13 + i * 5) % 4) === 0) continue;   // ragged edge
          const lx = tr.x + 1 + dx + sway * 1.4 * (1 - (dy + ch) / (2 * ch));
          const ly = cyc + dy + Math.sin(now / 480 + dx * 0.4 + i) * 0.6;
          scr.px(lx, ly, 1, 1, rampDither(LEAF, 0.8 - d * 0.55, lx, ly));
        }
      }
      if (picked.has(i)) {                                 // a picked trunk is ringed
        scr.px(tr.x - 2, baseY + 2, w + 4, 1, ROOT_CORE);
      }
    }

    // the answer: below the soil, one system. It runs off both edges because it
    // does not stop where the picture does.
    function roots(now) {
      const k = Math.min(1, revealT * 0.6);
      if (k <= 0) return;
      const y0 = 112;
      // the ground goes see-through so the root can be under everything
      scr.px(0, y0 - 4, scr.w, 128 - y0 + 4, GROUND_DEEP);
      const span = Math.round(96 * k);
      // the main runner, wandering, drawn out from the centre in both directions
      for (let dx = -span; dx <= span; dx++) {
        const x = 96 + dx;
        const y = y0 + Math.sin(dx * 0.09) * 3 + Math.sin(dx * 0.31) * 1.4;
        scr.px(x, y, 1, 2, ROOT);
        if ((dx + Math.floor(now / 90)) % 7 === 0) scr.px(x, y, 1, 1, ROOT_CORE);
      }
      // and a riser up to the base of every trunk it has reached
      TREES.forEach((tr, i) => {
        if (Math.abs(tr.x - 96) > span) return;
        const baseY = HORIZON + tr.d * 26;
        const ry = y0 + Math.sin((tr.x - 96) * 0.09) * 3;
        for (let y = baseY; y < ry; y++) {
          const wob = Math.sin(y * 0.4 + i) * 1.2;
          scr.px(tr.x + 1 + wob, y, 1, 1, picked.has(i) ? ROOT_CORE : ROOT);
        }
      });
      // sparks travelling the runner — one organism, moving things around
      for (let i = 0; i < 7; i++) {
        const dx = ((now / 12 + i * 40) % (span * 2 + 1)) - span;
        const x = 96 + dx, y = y0 + Math.sin(dx * 0.09) * 3;
        scr.px(x, y - 1, 1, 1, ROOT_CORE);
      }
    }

    function draw(now, dt) {
      if (phase === 'truth' || phase === 'outro') revealT += dt;
      hill();
      TREES.forEach((tr, i) => tree(tr, i, now));
      roots(now);
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
