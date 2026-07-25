// The Cairn — balance three irregular stones into a trail marker on a dusk
// fell. Tap where the next stone should rest; land it near the balance line and
// it holds, off and it topples and you try again — no failure, only patience.
// "Gravity is infinitely patient." Revert: balance two real rocks, then leave
// them. Dithered stones (pixel.js toolkit) on a muted graphic-novel fell.

import { PixelScreen, bayer, rampDither } from '../pixel.js?v=33';
import { PAL } from '../palette.js?v=33';

const GROUND = 112, CX = 96;
const TOL = 11;                    // how near the balance line a stone must land
const NEED = 3;                    // stones to stack on the base

const STONE = ['#33322f', '#4a473f', '#635e52', '#807a6c', '#a09889'];
const RIM = PAL.GOLD_LUX;

// each stone: a deterministic irregular rounded rock, lit from the upper-left
function drawStone(scr, s, litRim) {
  const { x, y, w, h, seed } = s;
  for (let dy = 0; dy <= h; dy++) {
    const t = dy / h;
    const wob = 1 - ((t - 0.5) * 2) ** 2;                 // fat middle, round ends
    const half = (w / 2) * (0.55 + 0.45 * wob) * (1 + 0.1 * Math.sin(seed + dy * 0.6));
    for (let dx = -half; dx <= half; dx++) {
      let u = 0.62 - (dx / (w / 2)) * 0.32 - t * 0.28;    // top-left lit, base darker
      u += 0.08 * Math.sin(dx * 0.5 + seed);
      scr.px(x + dx, y + dy, 1, 1, rampDither(STONE, u, x + dx, y + dy));
    }
    if (litRim) {                                          // catches the last light
      scr.px(x - Math.round(half), y + dy, 1, 1, RIM);
    }
  }
}

export const cairn = {
  id: 'cairn',
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
    let phase = 'intro';     // intro → build → done → outro
    const stones = [];       // placed, bottom→top
    let active = null;       // the stone currently falling
    let placed = 0;          // successfully balanced on the base
    let glowT = 0, wobble = 0;
    let raf = 0, dead = false;
    let last = performance.now();

    // stone sizes, base first then the three to stack (smaller going up)
    const SIZES = [[42, 14], [34, 12], [27, 11], [21, 10]];

    function button(label, fn) {
      const b = document.createElement('button');
      b.className = 'btn';
      b.textContent = label;
      b.onclick = () => { audio.step(); fn(); };
      btnRow.appendChild(b);
    }

    textEl.textContent = t('ca.s1');
    button(t('ca.begin'), () => {
      phase = 'build';
      const [w, h] = SIZES[0];
      stones.push({ x: CX, y: GROUND - h, w, h, seed: 1.3 });   // the base
      textEl.textContent = t('ca.hint');
      btnRow.innerHTML = '';
    });

    const topStone = () => stones[stones.length - 1];
    const balanceX = () => topStone().x;

    function onTap(e) {
      if (dead || phase !== 'build' || active) return;
      const p = scr.toPixel(e);
      const [w, h] = SIZES[placed + 1];
      active = { x: p.x, y: 6, w, h, seed: (placed + 2) * 2.7, vy: 0, state: 'fall' };
    }
    scr.canvas.addEventListener('pointerdown', onTap);

    function resolve() {
      const rest = topStone().y - active.h;
      if (Math.abs(active.x - balanceX()) <= TOL) {
        active.y = rest;
        active.x = Math.round((active.x + balanceX()) / 2);   // settles toward true
        stones.push({ x: active.x, y: rest, w: active.w, h: active.h, seed: active.seed });
        active = null;
        placed++;
        audio.plink();
        wobble = 0.6;
        if (placed >= NEED) done();
        else textEl.textContent = t('ca.hint');
      } else {
        active.state = 'topple';
        active.dir = active.x < balanceX() ? -1 : 1;
        audio.step();
        textEl.textContent = t('ca.topple');
      }
    }

    function done() {
      phase = 'done';
      glowT = 0;
      audio.chime();
      textEl.textContent = t('ca.wisdom');
      btnRow.innerHTML = '';
      button(t('ui.continue'), () => {
        phase = 'outro';
        textEl.innerHTML = '';
        const a = document.createElement('p'); a.textContent = t('ca.outro');
        const b = document.createElement('p'); b.className = 'nature-note'; b.textContent = t('ca.nature');
        textEl.append(a, b);
        btnRow.innerHTML = '';
        button(t('ui.continue'), () => onComplete());
      });
    }

    // ── rendering ────────────────────────────────────────────────
    function fell(now) {
      scr.bands(0, 0, scr.w, GROUND, ['#282a3a', '#363548', '#4a4258', '#6a5560']);
      // a low sinking sun bleeding into the dusk, far off
      scr.disc(150, GROUND - 8, 9, PAL.EMBER);
      scr.disc(150, GROUND - 9, 7, '#e8a86c', PAL.DANGER);
      // distant hill silhouette
      for (let x = 0; x < scr.w; x += 4) {
        const h = 12 + Math.round(8 * Math.sin(x * 0.05) + 4 * Math.sin(x * 0.13));
        scr.px(x, GROUND - h, 4, h, '#20222e');
      }
      scr.px(0, GROUND, scr.w, 128 - GROUND, '#1c1a16');   // the near ground
      scr.px(0, GROUND, scr.w, 2, '#2a2620');
    }

    function draw(now, dt) {
      if (active && active.state === 'fall') {
        active.vy += 340 * dt;
        active.y += active.vy * dt;
        if (active.y >= topStone().y - active.h) resolve();
      } else if (active && active.state === 'topple') {
        active.vy += 340 * dt;
        active.y += active.vy * dt * 0.6;
        active.x += active.dir * 60 * dt;
        if (active.y > 128) { active = null; }             // gone — try again, patiently
      }
      if (wobble > 0) wobble = Math.max(0, wobble - dt * 2);
      if (phase === 'done' || phase === 'outro') glowT += dt;

      fell(now);

      // the balance line — a faint plumb from the current top, your aim
      if (phase === 'build' && !active) {
        const bx = balanceX();
        for (let y = 10; y < topStone().y; y += 3) scr.px(bx, y, 1, 1, '#5a6070');
      }

      // the stack, with a tiny settle wobble on the newest stone
      stones.forEach((s, i) => {
        const dx = (i === stones.length - 1 && wobble > 0) ? Math.round(Math.sin(now / 40) * wobble * 2) : 0;
        const lit = (phase === 'done' || phase === 'outro') && i === stones.length - 1;
        drawStone(scr, { ...s, x: s.x + dx }, lit);
      });
      if (active) drawStone(scr, active, false);

      // when it stands: a quiet warm glow lifts off the crowning stone
      if (phase === 'done' || phase === 'outro') {
        const top = topStone();
        scr.softDisc(top.x, top.y, 8 + Math.min(20, glowT * 16), '#2e2408', 14);
        for (let i = 0; i < 6; i++) {
          const rise = ((now / 50 + i * 30) % 40);
          scr.px(top.x - 6 + i * 3, top.y - 6 - rise, 1, 1, i % 2 ? RIM : '#fff2c0');
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
